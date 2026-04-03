import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getUserByUpnOrEmail, requireAuth } from '@/lib/auth-helpers'

export async function GET() {
  const { error, upn } = await requireAuth()
  if (error) return error

  try {
    const db = await getDb()
    const user = await getUserByUpnOrEmail(db, upn!)
    if (!user) {
      return NextResponse.json({ detail: 'Usuario no encontrado' }, { status: 404 })
    }

    const userId = user.id_usuario
    const result = await db
      .request()
      .input('userId', userId)
      .query(`
        SELECT
          id_cuenta,
          banco,
          CASE WHEN LEN(numero_cuenta) = 18 THEN numero_cuenta ELSE NULL END AS clabe,
          numero_cuenta,
          swift_code,
          N'México' AS pais,
          moneda,
          tipo_cuenta
        FROM cuentas_bancarias
        WHERE id_usuario = @userId
        ORDER BY id_cuenta
      `)

    return NextResponse.json({ cuentas: result.recordset, total: result.recordset.length })
  } catch (err: any) {
    console.error('Error /api/cuentas-bancarias:', err)
    return NextResponse.json({ detail: err.message }, { status: 500 })
  }
}
