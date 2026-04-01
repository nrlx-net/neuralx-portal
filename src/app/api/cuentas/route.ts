import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { requireAuth } from '@/lib/auth-helpers'

export async function GET() {
  const { error, upn } = await requireAuth()
  if (error) return error

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
      .query(`
        SELECT id_cuenta, banco, numero_cuenta, swift_code, moneda,
               saldo_total, saldo_disponible, tipo_cuenta, icono_banco_url
        FROM cuentas_bancarias
        WHERE id_usuario = @userId
        ORDER BY id_cuenta
      `)

    const cuentas = cuentasResult.recordset
    const total = cuentas.reduce((sum: number, c: any) => sum + parseFloat(c.saldo_total), 0)

    return NextResponse.json({
      cuentas,
      total_cuentas: cuentas.length,
      saldo_consolidado: total,
    })
  } catch (err: any) {
    console.error('Error /api/cuentas:', err)
    return NextResponse.json({ detail: err.message }, { status: 500 })
  }
}
