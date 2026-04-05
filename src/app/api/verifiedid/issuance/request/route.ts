import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { requireAuth } from '@/lib/auth-helpers'
import {
  buildIssuancePayload,
  buildIssuanceState,
  getVerifiedIdAccessToken,
  getVerifiedIdConfig,
  normalizeIssuanceResponse,
} from '@/lib/verifiedid'

export async function POST() {
  const { error, upn } = await requireAuth()
  if (error) return error

  try {
    const cfg = getVerifiedIdConfig()
    const state = buildIssuanceState()
    const payload = buildIssuancePayload(state)
    const accessToken = await getVerifiedIdAccessToken()

    const msRes = await fetch(cfg.createUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
      cache: 'no-store',
    })
    const msData = await msRes.json().catch(() => ({}))
    if (!msRes.ok) {
      return NextResponse.json(
        {
          detail:
            msData?.error?.message ||
            msData?.message ||
            msData?.error_description ||
            'Error en createIssuanceRequest',
        },
        { status: msRes.status }
      )
    }

    const normalized = normalizeIssuanceResponse(msData)
    const db = await getDb()
    await db
      .request()
      .input('state', state)
      .input('request_id', normalized.requestId)
      .input('upn', upn || null)
      .input('credential_type', cfg.credentialType)
      .input('manifest_url', cfg.manifestUrl)
      .input('authority_did', cfg.authority)
      .input('qr_code', normalized.qrCode)
      .input('deep_link', normalized.url)
      .input('expiry_at', normalized.expiry)
      .input('raw_request_payload', JSON.stringify(payload))
      .input('raw_response_payload', JSON.stringify(msData))
      .execute('dbo.sp_verifiedid_create_request')

    return NextResponse.json({
      state,
      status: 'created',
      requestId: normalized.requestId,
      qrCode: normalized.qrCode,
      url: normalized.url,
      expiry: normalized.expiry,
    })
  } catch (err: any) {
    console.error('Error /api/verifiedid/issuance/request:', err)
    return NextResponse.json(
      { detail: err?.message || 'Error interno al crear emisión Verified ID' },
      { status: 500 }
    )
  }
}

