import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getUserByUpnOrEmail, isAdminUpn, requireAuth } from '@/lib/auth-helpers'
import { autoProvisionUser } from '@/lib/auto-provision'

function pick<T = unknown>(row: Record<string, unknown>, keys: string[]): T | null {
  for (const k of keys) {
    const v = row[k] ?? row[k.toLowerCase()] ?? row[k.toUpperCase()]
    if (v !== undefined && v !== null && v !== '') return v as T
  }
  return null
}

function mapWireRow(row: Record<string, unknown>) {
  return {
    id: String(pick(row, ['id', 'ID']) ?? ''),
    fecha_operacion: String(pick(row, ['fecha_operacion']) ?? ''),
    beneficiario: String(pick(row, ['beneficiario']) ?? ''),
    numero_cuenta: String(pick(row, ['numero_cuenta']) ?? ''),
    swift_bic: String(pick(row, ['swift_bic']) ?? ''),
    monto_usd: Number(pick(row, ['monto_usd']) ?? 0),
    fee_usd: Number(pick(row, ['fee_usd']) ?? 0),
    total_liberar_usd: Number(pick(row, ['total_liberar_usd']) ?? 0),
    partner_user_id: String(pick(row, ['partner_user_id']) ?? ''),
    status: String(pick(row, ['status']) ?? 'pending').toLowerCase(),
    bank_icon: pick<string>(row, ['bank_icon']),
    socio_nombre: String(pick(row, ['socio_nombre']) ?? ''),
    bank_id: pick<string>(row, ['bank_id']),
    bank_name: pick<string>(row, ['bank_name']),
    icon_url: pick<string>(row, ['icon_url']),
  }
}

export async function GET() {
  const { error, upn, oid } = await requireAuth()
  if (error) return error

  try {
    const db = await getDb()
    let user = await getUserByUpnOrEmail(db, upn!, oid)
    if (!user) user = await autoProvisionUser(db, upn!)
    const admin = isAdminUpn(upn)

    const listReq = db.request()
    let listSql = `
      SELECT id, fecha_operacion, beneficiario, numero_cuenta, swift_bic,
             monto_usd, fee_usd, total_liberar_usd, partner_user_id, status, bank_icon,
             socio_nombre, bank_id, bank_name, icon_url
      FROM dbo.v_admin_transactions
    `
    if (!admin) {
      listSql += ' WHERE partner_user_id = @partnerId'
      listReq.input('partnerId', user.id_usuario)
    }
    listSql += ' ORDER BY fecha_operacion ASC, id'

    const listRes = await listReq.query(listSql)
    const transferencias = (listRes.recordset as Record<string, unknown>[]).map(mapWireRow)

    let resumen: Record<string, number> | null = null
    if (admin) {
      const sumRes = await db.request().query(`SELECT TOP 1 * FROM dbo.v_admin_summary`)
      const s = sumRes.recordset?.[0] as Record<string, unknown> | undefined
      if (s) {
        resumen = {
          total_transacciones: Number(pick(s, ['total_transacciones']) ?? 0),
          suma_montos_usd: Number(pick(s, ['suma_montos_usd']) ?? 0),
          suma_fees_usd: Number(pick(s, ['suma_fees_usd']) ?? 0),
          gran_total_liberar_usd: Number(pick(s, ['gran_total_liberar_usd']) ?? 0),
          cnt_pending: Number(pick(s, ['cnt_pending']) ?? 0),
          cnt_completed: Number(pick(s, ['cnt_completed']) ?? 0),
          cnt_rejected: Number(pick(s, ['cnt_rejected']) ?? 0),
        }
      }
    }

    return NextResponse.json({ transferencias, resumen })
  } catch (err: any) {
    console.error('Error /api/operaciones-wire:', err)
    return NextResponse.json(
      { detail: err.message || 'Error al cargar transferencias wire.' },
      { status: 500 }
    )
  }
}
