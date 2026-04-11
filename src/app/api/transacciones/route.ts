import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getUserByUpnOrEmail, isAdminUpn, requireAuth } from '@/lib/auth-helpers'
import { autoProvisionUser } from '@/lib/auto-provision'

export async function GET(request: Request) {
  const { error, upn, oid } = await requireAuth()
  if (error) return error

  const { searchParams } = new URL(request.url)
  const estatus = searchParams.get('estatus')

  try {
    const db = await getDb()
    let user = await getUserByUpnOrEmail(db, upn!, oid)
    if (!user) {
      user = await autoProvisionUser(db, upn!)
    }
    const admin = isAdminUpn(upn)
    const cuentasResult = admin
      ? await db.request().query('SELECT nxg_id FROM cuentas_internas')
      : await db.request()
          .input('userId', user.id_usuario)
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
