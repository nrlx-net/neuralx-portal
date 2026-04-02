import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { requireAuth } from '@/lib/auth-helpers'

export async function GET(request: Request) {
  const { error, upn } = await requireAuth()
  if (error) return error

  const { searchParams } = new URL(request.url)
  const estatus = searchParams.get('estatus')

  try {
    const db = await getDb()

    const userResult = await db.request()
      .input('upn', upn)
      .query('SELECT id_usuario FROM usuarios_socios WHERE entra_id_upn = @upn')

    if (userResult.recordset.length === 0) {
      return NextResponse.json({ detail: 'Usuario no encontrado' }, { status: 404 })
    }

    const userId = userResult.recordset[0].id_usuario

    const cuentasResult = await db.request()
      .input('userId', userId)
      .query('SELECT nxg_id FROM cuentas_internas WHERE id_usuario = @userId')

    if (cuentasResult.recordset.length === 0) {
      return NextResponse.json({ transacciones: [], total: 0 })
    }

    const cuentaIds = cuentasResult.recordset.map((c: any) => c.nxg_id)
    const inOrigen = cuentaIds.map((_: any, i: number) => `@origen${i}`).join(',')
    const inDestino = cuentaIds.map((_: any, i: number) => `@destino${i}`).join(',')

    let query = `
      SELECT TOP 50 id_transaccion, id_cuenta_origen, id_cuenta_destino,
             fecha_hora, monto, moneda, tipo_transaccion, concepto,
             estatus, referencia
      FROM transacciones
      WHERE (id_cuenta_origen IN (${inOrigen}) OR id_cuenta_destino IN (${inDestino}))
    `

    const req = db.request()
    cuentaIds.forEach((id: string, i: number) => {
      req.input(`origen${i}`, id)
      req.input(`destino${i}`, id)
    })

    if (estatus) {
      query += ' AND estatus = @estatus'
      req.input('estatus', estatus)
    }

    query += ' ORDER BY fecha_hora DESC'

    const txnResult = await req.query(query)

    return NextResponse.json({
      transacciones: txnResult.recordset,
      total: txnResult.recordset.length,
    })
  } catch (err: any) {
    console.error('Error /api/transacciones:', err)
    return NextResponse.json({ detail: err.message }, { status: 500 })
  }
}
