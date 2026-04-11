import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-helpers'
import { dispatchEmailOutboxBatch } from '@/lib/email-outbox-worker'

function hasCronAccess(request: Request) {
  const secret = process.env.CRON_SECRET || ''
  if (!secret) return false
  const headerSecret = request.headers.get('x-cron-secret') || ''
  const auth = request.headers.get('authorization') || ''
  const bearer = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7) : ''
  return headerSecret === secret || bearer === secret
}

export async function GET(request: Request) {
  const byCron = hasCronAccess(request)
  if (!byCron) {
    const { error } = await requireAdmin()
    if (error) return error
  }
  return NextResponse.json({
    ok: true,
    endpoint: 'notificaciones-dispatch',
    sender: process.env.GRAPH_MAIL_SENDER || null,
    provider: 'microsoft-graph',
  })
}

export async function POST(request: Request) {
  const byCron = hasCronAccess(request)
  if (!byCron) {
    const { error } = await requireAdmin()
    if (error) return error
  }

  try {
    const body = await request.json().catch(() => ({}))
    const batchSize = Number(body?.batch_size || 10)
    const result = await dispatchEmailOutboxBatch(batchSize)
    return NextResponse.json({ ok: true, ...result })
  } catch (err: any) {
    console.error('Error /api/notificaciones/dispatch:', err)
    return NextResponse.json({ ok: false, detail: err.message || 'Error procesando outbox' }, { status: 500 })
  }
}

