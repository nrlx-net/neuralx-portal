import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getUserByUpnOrEmail, isAdminUpn, requireAuth } from '@/lib/auth-helpers'
import { syncOperationalBalancesFromLedger } from '@/lib/ledger-sync'
import { safeQueueTransferExternalCreated, safeQueueTransferInternalExecuted } from '@/lib/notification-outbox'

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

        const ledgerOriginResult = await db.request()
          .input('nxg_origen', nxgOrigen)
          .query(`
            SELECT TOP 1 ledger_account_id
            FROM ledger_accounts
            WHERE source_table = N'cuentas_internas'
              AND source_account_id = @nxg_origen
          `)
        const ledgerDestinoResult = await db.request()
          .input('nxg_destino', destinoNxg)
          .query(`
            SELECT TOP 1 ledger_account_id
            FROM ledger_accounts
            WHERE source_table = N'cuentas_internas'
              AND source_account_id = @nxg_destino
          `)

        const originLedger = ledgerOriginResult.recordset[0]?.ledger_account_id
        const destinationLedger = ledgerDestinoResult.recordset[0]?.ledger_account_id
        if (!originLedger || !destinationLedger) {
          return NextResponse.json({ detail: 'No se encontraron cuentas contables para ejecutar transferencia interna' }, { status: 500 })
        }

        const engineResult = await db.request()
          .input('origin_ledger_account', originLedger)
          .input('destination_ledger_account', destinationLedger)
          .input('amount_original', Number(monto))
          .input('currency_original', moneda)
          .input('transaction_timestamp', null)
          .input('reference', referencia || `INT-${idSolicitud}`)
          .input('fee_bps', 0)
          .input('tax_bps', 0)
          .input('spread_bps', 0)
          .input('trade_date', null)
          .input('settlement_date', null)
          .input('original_tx_id', null)
          .query(`
            EXEC dbo.sp_process_transaction_v1
              @origin_ledger_account,
              @destination_ledger_account,
              @amount_original,
              @currency_original,
              @transaction_timestamp,
              @reference,
              @fee_bps,
              @tax_bps,
              @spread_bps,
              @trade_date,
              @settlement_date,
              @original_tx_id
          `)

        const txRaw = engineResult.recordset?.[0]
        const txId = txRaw?.tx_id ? String(txRaw.tx_id) : null
        const txStatus = String(txRaw?.status || '').toUpperCase()
        if (!txId || txStatus === 'FAILED' || txStatus === 'REJECTED') {
          return NextResponse.json({ detail: txRaw?.error_detail || 'No se pudo ejecutar la transferencia interna' }, { status: 500 })
        }

        await syncOperationalBalancesFromLedger(db)

        const enrichedExtraPayload = {
          ...(extraPayload || {}),
          referencia: referencia || null,
          auto_ejecutada: true,
          tx_id: txId,
          tx_status: txStatus,
        }

        await db.request()
          .input('id_solicitud', idSolicitud)
          .input('id_usuario', user.id_usuario)
          .input('tipo', tipoSolicitud)
          .input('nxg_origen', nxgOrigen)
          .input('nxg_destino', destinoNxg)
          .input('id_cuenta_banco', null)
          .input('monto', monto)
          .input('moneda', moneda)
          .input('concepto', concepto || 'Transferencia interna')
          .input('datos_extra', JSON.stringify(enrichedExtraPayload))
          .query(`
            INSERT INTO solicitudes (
              id_solicitud, id_usuario, tipo, nxg_origen, nxg_destino, id_cuenta_banco,
              monto, moneda, concepto, estatus, fecha_resolucion, datos_extra
            ) VALUES (
              @id_solicitud, @id_usuario, @tipo, @nxg_origen, @nxg_destino, @id_cuenta_banco,
              @monto, @moneda, @concepto, N'ejecutada', SYSUTCDATETIME(), @datos_extra
            )
          `)

        await db.request()
          .input('id_transaccion', txId)
          .input('id_cuenta_origen', nxgOrigen)
          .input('id_cuenta_destino', destinoNxg)
          .input('monto', monto)
          .input('moneda', moneda)
          .input('tipo_transaccion', 'transferencia_interna')
          .input('concepto', concepto || 'Transferencia interna')
          .input('estatus', 'ejecutada')
          .input('referencia', referencia || idSolicitud)
          .query(`
            BEGIN TRY
              IF NOT EXISTS (SELECT 1 FROM transacciones WHERE id_transaccion = @id_transaccion)
              BEGIN
                INSERT INTO transacciones (
                  id_transaccion, id_cuenta_origen, id_cuenta_destino, fecha_hora, monto, moneda,
                  tipo_transaccion, concepto, estatus, referencia, created_at
                ) VALUES (
                  @id_transaccion, @id_cuenta_origen, @id_cuenta_destino, SYSUTCDATETIME(), @monto, @moneda,
                  @tipo_transaccion, @concepto, @estatus, @referencia, SYSUTCDATETIME()
                )
              END
            END TRY
            BEGIN CATCH
              -- No bloquear la operación ya ejecutada si falla solo el espejo en transacciones.
            END CATCH
          `)

        await db.request()
          .input('id_usuario', user.id_usuario)
          .input('accion', 'TRANSFERENCIA_INTERNA_EJECUTADA')
          .input('registro_id', idSolicitud)
          .input('detalle', `Transferencia interna ejecutada · TX ${txId} · ${monto} ${moneda}`)
          .query(`
            BEGIN TRY
              INSERT INTO audit_log (id_usuario, accion, tabla_afectada, registro_id, detalle)
              VALUES (@id_usuario, @accion, N'solicitudes', @registro_id, @detalle)
            END TRY
            BEGIN CATCH
            END CATCH
          `)

        await safeQueueTransferInternalExecuted(db, {
          actorUserId: user.id_usuario,
          solicitudId: idSolicitud,
          txId,
          monto: Number(monto),
          moneda: String(moneda),
          nxgOrigen: String(nxgOrigen),
          nxgDestino: String(destinoNxg),
          concepto: concepto || 'Transferencia interna',
        })

        return NextResponse.json({
          exito: true,
          id_solicitud: idSolicitud,
          monto,
          moneda,
          estatus: 'ejecutada',
          mensaje: 'Transferencia interna ejecutada correctamente.',
        })
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

      await safeQueueTransferExternalCreated(db, {
        actorUserId: user.id_usuario,
        solicitudId: idSolicitud,
        monto: Number(monto),
        moneda: String(moneda),
        nxgOrigen: String(nxgOrigen),
        bancoDestino: cuentaBanco || null,
        concepto: concepto || 'Transferencia externa',
      })

      return NextResponse.json({
        exito: true,
        id_solicitud: idSolicitud,
        monto,
        moneda,
        estatus: 'pendiente',
        mensaje: 'Transferencia externa enviada para aprobación.',
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

    if (idSolicitud) {
      await safeQueueTransferExternalCreated(db, {
        actorUserId: user.id_usuario,
        solicitudId: String(idSolicitud),
        monto: Number(monto),
        moneda: String(moneda),
        nxgOrigen: String(nxgOrigen),
        bancoDestino: String(idCuentaBanco),
        concepto: concepto || 'Transferencia externa',
      })
    }

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
