import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getUserByUpnOrEmail, isAdminUpn, requireAuth } from '@/lib/auth-helpers'
import { calcularBalanceConsolidado } from '@/lib/balance'

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
    const cuentasResult = admin
      ? await db.request().query(`
          SELECT ci.nxg_id, ci.moneda, ci.saldo_disponible, ci.saldo_retenido, us.nombre_completo
          FROM cuentas_internas ci
          LEFT JOIN usuarios_socios us ON us.id_usuario = ci.id_usuario
          ORDER BY ci.nxg_id
        `)
      : await db.request()
          .input('userId', user.id_usuario)
          .query(`
            SELECT ci.nxg_id, ci.moneda, ci.saldo_disponible, ci.saldo_retenido, us.nombre_completo
            FROM cuentas_internas ci
            LEFT JOIN usuarios_socios us ON us.id_usuario = ci.id_usuario
            WHERE ci.id_usuario = @userId
            ORDER BY ci.nxg_id
          `)

    const cuentas = cuentasResult.recordset.map((c: any) => ({
      id_cuenta: c.nxg_id,
      banco: 'NeuralX Internal',
      numero_cuenta: c.nxg_id,
      swift_code: null,
      moneda: c.moneda || 'MXN',
      saldo_total: Number(c.saldo_disponible || 0) + Number(c.saldo_retenido || 0),
      saldo_disponible: Number(c.saldo_disponible || 0),
      saldo_retenido: Number(c.saldo_retenido || 0),
      tipo_cuenta: 'Interna',
      icono_banco_url: null,
      titular: c.nombre_completo || null,
    }))

    const balance = calcularBalanceConsolidado(
      cuentasResult.recordset.map((c: any) => ({
        saldo_disponible: Number(c.saldo_disponible || 0),
        saldo_retenido: Number(c.saldo_retenido || 0),
        moneda: c.moneda || 'MXN',
      }))
    )

    let saldoConsolidado = balance.total_mxn
    if (admin) {
      const custodia = await db.request().query(`
        SELECT TOP 1 saldo_total, saldo_disponible, saldo_asignado
        FROM cuenta_custodia
        WHERE id_custodia = N'CUSTODIA-001'
      `)
      const row = custodia.recordset[0]
      if (row?.saldo_total !== undefined && row?.saldo_total !== null) {
        saldoConsolidado = Number(row.saldo_total || 0)
        const hasCustodiaCard = cuentas.some((c: any) => c.id_cuenta === 'NXG-000')
        if (!hasCustodiaCard) {
          cuentas.unshift({
            id_cuenta: 'NXG-000',
            banco: 'NeuralX Custodia',
            numero_cuenta: 'CUSTODIA-001',
            swift_code: null,
            moneda: 'MXN',
            saldo_total: Number(row.saldo_total || 0),
            saldo_disponible: Number(row.saldo_disponible || 0),
            saldo_retenido: Number(row.saldo_asignado || 0),
            tipo_cuenta: 'Custodia',
            icono_banco_url: null,
            titular: 'Custodia Principal',
          })
        }
      }
    }

    return NextResponse.json({
      cuentas,
      total_cuentas: cuentas.length,
      saldo_consolidado: saldoConsolidado,
    })
  } catch (err: any) {
    console.error('Error /api/cuentas:', err)
    return NextResponse.json({ detail: err.message }, { status: 500 })
  }
}
