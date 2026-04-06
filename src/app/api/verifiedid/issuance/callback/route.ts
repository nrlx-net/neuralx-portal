import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { normalizeStatus } from '@/lib/verifiedid'

function isAuthorizedCallback(request: Request) {
  const expected = process.env.VERIFIEDID_CALLBACK_API_KEY
  if (!expected) return true

  const apiKey = request.headers.get('api-key') || request.headers.get('x-api-key')
  if (apiKey && apiKey === expected) return true

  const auth = request.headers.get('authorization')
  if (auth && auth.toLowerCase().startsWith('bearer ')) {
    return auth.slice(7).trim() === expected
  }
  return false
}

export async function POST(request: Request) {
  const strictAuth = process.env.VERIFIEDID_CALLBACK_STRICT_AUTH === '1'
  if (!isAuthorizedCallback(request)) {
    console.warn('Verified ID callback rejected by auth guard')
    if (strictAuth) {
      return NextResponse.json({ detail: 'No autorizado' }, { status: 401 })
    }
    // In non-strict mode acknowledge callback to avoid upstream responseCode failures.
    return NextResponse.json({ ok: true, accepted: false, reason: 'auth_mismatch' })
  }

  try {
    const body = await request.json().catch(() => ({}))
    const rawStatus = body?.requestStatus || body?.status || body?.code
    const status = normalizeStatus(rawStatus)
    const state = body?.state ? String(body.state) : null
    const requestId = body?.requestId ? String(body.requestId) : null

    const errorCode =
      status === 'issuance_error'
        ? String(body?.error?.code || body?.errorCode || body?.code || '')
        : null
    const errorMessage =
      status === 'issuance_error'
        ? String(body?.error?.message || body?.message || body?.error_description || '')
        : null

    if (!state && !requestId) {
      console.warn('Verified ID callback without state/requestId', body)
      return NextResponse.json({ ok: true, accepted: false, reason: 'missing_state_requestid' })
    }

    try {
      const db = await getDb()
      await db
        .request()
        .input('state', state)
        .input('request_id', requestId)
        .input('event_name', status)
        .input('error_code', errorCode)
        .input('error_message', errorMessage)
        .input('callback_payload', JSON.stringify(body))
        .execute('dbo.sp_verifiedid_apply_callback')
      return NextResponse.json({ ok: true })
    } catch (dbErr: any) {
      console.error('Error persisting Verified ID callback:', dbErr)
      // Always acknowledge callback to prevent issuance_service_error on provider side.
      return NextResponse.json({ ok: true, accepted: false, reason: 'db_error' })
    }
  } catch (err: any) {
    console.error('Error /api/verifiedid/issuance/callback:', err)
    // Acknowledge callback even when payload parsing fails.
    return NextResponse.json({ ok: true, accepted: false, reason: 'parse_error' })
  }
}

export async function GET() {
  // Health/readability endpoint for providers that probe callback URL.
  return NextResponse.json({ ok: true, endpoint: 'verifiedid-callback' })
}

