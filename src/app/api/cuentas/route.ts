import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { requireAuth } from '@/lib/auth-helpers'
import { calcularBalanceConsolidado } from '@/lib/balance'

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
        SELECT nxg_id, moneda, saldo_disponible, saldo_retenido
        FROM cuentas_internas
        WHERE id_usuario = @userId
        ORDER BY nxg_id
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
    }))

    const balance = calcularBalanceConsolidado(
      cuentasResult.recordset.map((c: any) => ({
        saldo_disponible: Number(c.saldo_disponible || 0),
        saldo_retenido: Number(c.saldo_retenido || 0),
        moneda: c.moneda || 'MXN',
      }))
    )

    return NextResponse.json({
      cuentas,
      total_cuentas: cuentas.length,
      saldo_consolidado: balance.total_mxn,
    })
  } catch (err: any) {
    console.error('Error /api/cuentas:', err)
    return NextResponse.json({ detail: err.message }, { status: 500 })
  }
}
