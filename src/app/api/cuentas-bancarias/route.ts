import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getUserByUpnOrEmail, isAdminUpn, requireAuth } from '@/lib/auth-helpers'

export async function GET() {
  const { error, upn } = await requireAuth()
  if (error) return error

  try {
    const db = await getDb()
    const user = await getUserByUpnOrEmail(db, upn!)
    if (!user) {
      return NextResponse.json({ detail: 'Usuario no encontrado' }, { status: 404 })
    }

    const admin = isAdminUpn(upn)
    const result = admin
      ? await db
          .request()
          .query(`
            SELECT
              cb.id_cuenta,
              cb.id_usuario,
              us.nombre_completo AS titular,
              cb.banco,
              CASE WHEN LEN(cb.numero_cuenta) = 18 THEN cb.numero_cuenta ELSE NULL END AS clabe,
              cb.numero_cuenta,
              cb.swift_code,
              N'México' AS pais,
              cb.moneda,
              cb.tipo_cuenta
            FROM cuentas_bancarias cb
            LEFT JOIN usuarios_socios us ON us.id_usuario = cb.id_usuario
            ORDER BY cb.id_cuenta
          `)
      : await db
          .request()
          .input('userId', user.id_usuario)
          .query(`
            SELECT
              cb.id_cuenta,
              cb.id_usuario,
              us.nombre_completo AS titular,
              cb.banco,
              CASE WHEN LEN(cb.numero_cuenta) = 18 THEN cb.numero_cuenta ELSE NULL END AS clabe,
              cb.numero_cuenta,
              cb.swift_code,
              N'México' AS pais,
              cb.moneda,
              cb.tipo_cuenta
            FROM cuentas_bancarias cb
            LEFT JOIN usuarios_socios us ON us.id_usuario = cb.id_usuario
            WHERE cb.id_usuario = @userId
            ORDER BY cb.id_cuenta
          `)

    return NextResponse.json({ cuentas: result.recordset, total: result.recordset.length })
  } catch (err: any) {
    console.error('Error /api/cuentas-bancarias:', err)
    return NextResponse.json({ detail: err.message }, { status: 500 })
  }
}
