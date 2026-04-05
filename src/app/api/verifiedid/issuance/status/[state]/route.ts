import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { requireAuth } from '@/lib/auth-helpers'
import { normalizeStatus } from '@/lib/verifiedid'

export async function GET(
  _request: Request,
  context: { params: { state: string } }
) {
  const { error } = await requireAuth()
  if (error) return error

  try {
    const state = context.params?.state
    if (!state) {
      return NextResponse.json({ detail: 'State requerido' }, { status: 400 })
    }

    const db = await getDb()
    const result = await db
      .request()
      .input('state', state)
      .execute('dbo.sp_verifiedid_get_status')

    const row = result.recordset?.[0]
    if (!row) {
      return NextResponse.json({ detail: 'State no encontrado' }, { status: 404 })
    }

    return NextResponse.json({
      state: String(row.state),
      status: normalizeStatus(row.status),
      requestId: row.request_id ? String(row.request_id) : null,
      error_code: row.error_code ? String(row.error_code) : null,
      error_message: row.error_message ? String(row.error_message) : null,
      updated_at: row.updated_at ? new Date(row.updated_at).toISOString() : null,
    })
  } catch (err: any) {
    console.error('Error /api/verifiedid/issuance/status/[state]:', err)
    return NextResponse.json(
      { detail: err?.message || 'Error interno consultando estado de emisión' },
      { status: 500 }
    )
  }
}

