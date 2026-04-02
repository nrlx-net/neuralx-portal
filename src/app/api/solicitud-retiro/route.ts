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

    const nxgResult = await db.request()
      .input('userId', user.id_usuario)
      .query('SELECT TOP 1 nxg_id FROM cuentas_internas WHERE id_usuario = @userId ORDER BY nxg_id')

    if (nxgResult.recordset.length === 0) {
      return NextResponse.json({ detail: 'Sin cuenta interna NXG registrada' }, { status: 400 })
    }

    const bancoResult = await db.request()
      .input('userId', user.id_usuario)
      .query('SELECT TOP 1 id_cuenta FROM cuentas_bancarias WHERE id_usuario = @userId ORDER BY id_cuenta')

    if (bancoResult.recordset.length === 0) {
      return NextResponse.json({ detail: 'Sin cuenta bancaria registrada' }, { status: 400 })
    }

    const nxgOrigen = nxgResult.recordset[0].nxg_id
    const idCuentaBanco = bancoResult.recordset[0].id_cuenta

    const execResult = await db.request()
      .input('id_usuario', user.id_usuario)
      .input('nxg_origen', nxgOrigen)
      .input('id_cuenta_banco', idCuentaBanco)
      .input('monto', monto)
      .input('concepto', concepto || 'Retiro a cuenta bancaria')
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
