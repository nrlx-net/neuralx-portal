import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { requireAuth } from '@/lib/auth-helpers'

export async function POST(request: Request) {
  const { error, upn } = await requireAuth()
  if (error) return error

  try {
    const body = await request.json()
    const { monto, concepto, moneda = 'MXN' } = body

    if (!monto || monto <= 0) {
      return NextResponse.json({ detail: 'Monto invalido' }, { status: 400 })
    }

    const db = await getDb()

    const userResult = await db.request()
      .input('upn', upn)
      .query('SELECT id_usuario, nombre_completo FROM usuarios_socios WHERE entra_id_upn = @upn')

    if (userResult.recordset.length === 0) {
      return NextResponse.json({ detail: 'Usuario no encontrado' }, { status: 404 })
    }

    const user = userResult.recordset[0]

    const cuentaResult = await db.request()
      .input('userId', user.id_usuario)
      .query('SELECT TOP 1 id_cuenta FROM cuentas_bancarias WHERE id_usuario = @userId ORDER BY id_cuenta')

    if (cuentaResult.recordset.length === 0) {
      return NextResponse.json({ detail: 'Sin cuenta bancaria registrada' }, { status: 400 })
    }

    const idCuenta = cuentaResult.recordset[0].id_cuenta
    const now = new Date()
    const idTxn = `SOL-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`

    await db.request()
      .input('idTxn', idTxn)
      .input('idCuenta', idCuenta)
      .input('monto', monto)
      .input('moneda', moneda)
      .input('concepto', concepto || 'Solicitud de retiro')
      .query(`
        INSERT INTO transacciones
          (id_transaccion, id_cuenta_origen, fecha_hora, monto, moneda,
           tipo_transaccion, concepto, estatus)
        VALUES (@idTxn, @idCuenta, SYSUTCDATETIME(), @monto, @moneda,
                N'saliente', @concepto, N'en curso')
      `)

    await db.request()
      .input('userId', user.id_usuario)
      .input('idTxn', idTxn)
      .input('detalle', `Monto: ${monto} ${moneda}`)
      .query(`
        INSERT INTO audit_log (id_usuario, accion, tabla_afectada, registro_id, detalle)
        VALUES (@userId, N'SOLICITUD_RETIRO', N'transacciones', @idTxn, @detalle)
      `)

    return NextResponse.json({
      exito: true,
      id_solicitud: idTxn,
      monto,
      moneda,
      estatus: 'en curso',
      mensaje: 'Solicitud creada. Pendiente de aprobacion del administrador.',
    })
  } catch (err: any) {
    console.error('Error /api/solicitud-retiro:', err)
    return NextResponse.json({ detail: err.message }, { status: 500 })
  }
}
