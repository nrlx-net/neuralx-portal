import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getUserByUpnOrEmail, isAdminUpn, requireAuth } from '@/lib/auth-helpers'

function makeTransferRequestId(maxLen: number) {
  const now = new Date()
  const yy = String(now.getFullYear()).slice(-2)
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  const hh = String(now.getHours()).padStart(2, '0')
  const mi = String(now.getMinutes()).padStart(2, '0')
  const ss = String(now.getSeconds()).padStart(2, '0')
  const rand = String(Math.floor(Math.random() * 9000 + 1000))
  const base = `TRF-${yy}${mm}${dd}${hh}${mi}${ss}-${rand}`
  return base.slice(0, Math.max(maxLen, 8))
}

export async function POST(request: Request) {
  const { error, upn, oid } = await requireAuth()
  if (error) return error

  try {
    const body = await request.json()
    const {
      monto,
      concepto,
      moneda = 'MXN',
      flow,
      tipo,
      nxg_origen,
      nxg_destino,
      id_cuenta_banco,
      beneficiario_id,
      referencia,
      datos_extra,
    } = body

    if (!monto || monto <= 0) {
      return NextResponse.json({ detail: 'Monto invalido' }, { status: 400 })
    }

    const db = await getDb()
    const user = await getUserByUpnOrEmail(db, upn!, oid)
    if (!user) {
      return NextResponse.json({ detail: 'Usuario no encontrado' }, { status: 404 })
    }
    const admin = isAdminUpn(upn)

    const nxgReq = db.request().input('userId', user.id_usuario)
    let nxgQuery = admin
      ? 'SELECT TOP 1 nxg_id FROM cuentas_internas WHERE 1=1'
      : 'SELECT TOP 1 nxg_id FROM cuentas_internas WHERE id_usuario = @userId'
    if (nxg_origen) {
      nxgQuery += ' AND nxg_id = @nxg_origen'
      nxgReq.input('nxg_origen', nxg_origen)
    }
    nxgQuery += ' ORDER BY nxg_id'
    const nxgResult = await nxgReq.query(nxgQuery)

    if (nxgResult.recordset.length === 0) {
      return NextResponse.json({ detail: 'Sin cuenta interna NXG registrada' }, { status: 400 })
    }

    const nxgOrigen = nxgResult.recordset[0].nxg_id

    if (flow === 'transfer') {
      const idLenResult = await db.request().query(`
        SELECT CHARACTER_MAXIMUM_LENGTH AS max_len
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = 'solicitudes'
          AND COLUMN_NAME = 'id_solicitud'
      `)
      const maxLen = Number(idLenResult.recordset?.[0]?.max_len || 64)
      const idSolicitud = makeTransferRequestId(maxLen)
      const tipoSolicitud = tipo || (nxg_destino ? 'transferencia_interna' : 'transferencia_externa')

      let destinoNxg: string | null = nxg_destino || null
      let cuentaBanco: string | null = id_cuenta_banco || null
      let extraPayload: any = datos_extra || null

      if (tipoSolicitud === 'transferencia_interna') {
        if (!destinoNxg) {
          return NextResponse.json({ detail: 'nxg_destino es requerido para transferencias internas' }, { status: 400 })
        }
        if (destinoNxg === nxgOrigen) {
          return NextResponse.json({ detail: 'La cuenta origen y destino no pueden ser la misma' }, { status: 400 })
        }
        const destinoInterno = await db.request()
          .input('nxg_destino', destinoNxg)
          .query(`
            SELECT TOP 1 nxg_id
            FROM cuentas_internas
            WHERE nxg_id = @nxg_destino
          `)
        if (!destinoInterno.recordset[0]) {
          return NextResponse.json({ detail: 'Cuenta destino interna no encontrada' }, { status: 404 })
        }
        cuentaBanco = null
      } else {
        const bancoReq = db.request().input('userId', user.id_usuario)
        let bancoQuery = admin
          ? 'SELECT TOP 1 id_cuenta FROM cuentas_bancarias WHERE 1=1'
          : 'SELECT TOP 1 id_cuenta FROM cuentas_bancarias WHERE id_usuario = @userId'
        if (id_cuenta_banco) {
          bancoQuery += ' AND id_cuenta = @id_cuenta_banco'
          bancoReq.input('id_cuenta_banco', id_cuenta_banco)
        }
        bancoQuery += ' ORDER BY id_cuenta'
        const bancoResult = await bancoReq.query(bancoQuery)

        if (bancoResult.recordset.length === 0) {
          return NextResponse.json({ detail: 'Sin cuenta bancaria registrada' }, { status: 400 })
        }
        cuentaBanco = bancoResult.recordset[0].id_cuenta
      }

      if (beneficiario_id) {
        const benResult = await db.request()
          .input('beneficiario_id', beneficiario_id)
          .input('user_id', user.id_usuario)
          .query(`
            SELECT id_beneficiario, nombre, apellidos, banco, numero_cuenta, clabe, iban, swift, pais, divisa
            FROM beneficiarios
            WHERE id_beneficiario = @beneficiario_id AND id_usuario = @user_id AND estatus = N'activo'
          `)

        if (benResult.recordset.length === 0) {
          return NextResponse.json({ detail: 'Beneficiario no encontrado' }, { status: 404 })
        }
        const ben = benResult.recordset[0]
        extraPayload = {
          ...(extraPayload || {}),
          beneficiario_id: ben.id_beneficiario,
          beneficiario_nombre: [ben.nombre, ben.apellidos].filter(Boolean).join(' '),
          banco: ben.banco,
          numero_cuenta: ben.numero_cuenta,
          clabe: ben.clabe,
          iban: ben.iban,
          swift: ben.swift,
          pais: ben.pais,
          divisa: ben.divisa,
        }
      }

      await db.request()
        .input('id_solicitud', idSolicitud)
        .input('id_usuario', user.id_usuario)
        .input('tipo', tipoSolicitud)
        .input('nxg_origen', nxgOrigen)
        .input('nxg_destino', destinoNxg)
        .input('id_cuenta_banco', cuentaBanco)
        .input('monto', monto)
        .input('moneda', moneda)
        .input('concepto', concepto || 'Nuevo pago')
        .input('datos_extra', extraPayload ? JSON.stringify({ ...extraPayload, referencia: referencia || null }) : null)
        .query(`
          INSERT INTO solicitudes (
            id_solicitud, id_usuario, tipo, nxg_origen, nxg_destino, id_cuenta_banco,
            monto, moneda, concepto, estatus, datos_extra
          ) VALUES (
            @id_solicitud, @id_usuario, @tipo, @nxg_origen, @nxg_destino, @id_cuenta_banco,
            @monto, @moneda, @concepto, N'pendiente', @datos_extra
          )
        `)

      await db.request()
        .input('id_usuario', user.id_usuario)
        .input('accion', 'SOLICITUD_NUEVO_PAGO')
        .input('registro_id', idSolicitud)
        .input('detalle', `Tipo: ${tipoSolicitud} · Monto: ${monto} ${moneda}`)
        .query(`
          INSERT INTO audit_log (id_usuario, accion, tabla_afectada, registro_id, detalle)
          VALUES (@id_usuario, @accion, N'solicitudes', @registro_id, @detalle)
        `)

      return NextResponse.json({
        exito: true,
        id_solicitud: idSolicitud,
        monto,
        moneda,
        estatus: 'pendiente',
        mensaje: 'Solicitud enviada',
      })
    }

    const bancoReq = db.request().input('userId', user.id_usuario)
    let bancoQuery = admin
      ? 'SELECT TOP 1 id_cuenta FROM cuentas_bancarias WHERE 1=1'
      : 'SELECT TOP 1 id_cuenta FROM cuentas_bancarias WHERE id_usuario = @userId'
    if (id_cuenta_banco) {
      bancoQuery += ' AND id_cuenta = @id_cuenta_banco'
      bancoReq.input('id_cuenta_banco', id_cuenta_banco)
    }
    bancoQuery += ' ORDER BY id_cuenta'
    const bancoResult = await bancoReq.query(bancoQuery)
    if (bancoResult.recordset.length === 0) {
      return NextResponse.json({ detail: 'Sin cuenta bancaria registrada' }, { status: 400 })
    }
    const idCuentaBanco = bancoResult.recordset[0].id_cuenta

    const execResult = await db.request()
      .input('id_usuario', user.id_usuario)
      .input('nxg_origen', nxgOrigen)
      .input('id_cuenta_banco', idCuentaBanco)
      .input('monto', monto)
      .input('concepto', concepto || 'Transferencia a cuenta bancaria externa')
      .query('EXEC dbo.sp_solicitar_retiro_banco @id_usuario, @nxg_origen, @id_cuenta_banco, @monto, @concepto')

    const result = execResult.recordset?.[0] || {}
    const idSolicitud = result.id_solicitud || null

    return NextResponse.json({
      exito: result.exito ?? true,
      id_solicitud: idSolicitud,
      monto,
      moneda,
      estatus: 'pendiente',
      mensaje: result.mensaje || 'Solicitud creada. Pendiente de aprobacion del administrador.',
    })
  } catch (err: any) {
    console.error('Error /api/solicitud-retiro:', err)
    return NextResponse.json({ detail: err.message }, { status: 500 })
  }
}
