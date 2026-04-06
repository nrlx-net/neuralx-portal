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
    const cfgIssues: string[] = []
    if (!cfg.authority.includes(cfg.tenantId)) {
      cfgIssues.push('VERIFIEDID_AUTHORITY no coincide con VERIFIEDID_TENANT_ID')
    }
    if (!cfg.manifestUrl.includes(`/tenants/${cfg.tenantId}/`)) {
      cfgIssues.push('VERIFIEDID_MANIFEST_URL no coincide con VERIFIEDID_TENANT_ID')
    }
    if (!cfg.credentialType || cfg.credentialType.trim().length < 3) {
      cfgIssues.push('VERIFIEDID_CREDENTIAL_TYPE inválido')
    }
    if (cfgIssues.length > 0) {
      return NextResponse.json(
        {
          detail: `Configuración Verified ID inválida: ${cfgIssues.join(' | ')}`,
          config_preview: {
            tenantId: cfg.tenantId,
            authority: cfg.authority,
            credentialType: cfg.credentialType,
            manifestUrl: cfg.manifestUrl,
            callbackUrl: cfg.callbackUrl,
          },
        },
        { status: 400 }
      )
    }

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
      const raw = typeof msData === 'string' ? msData : JSON.stringify(msData)
      return NextResponse.json(
        {
          detail: `Error en createIssuanceRequest: ${raw}`,
          upstream_status: msRes.status,
          upstream_error: msData,
          request_payload: payload,
          config_preview: {
            tenantId: cfg.tenantId,
            authority: cfg.authority,
            credentialType: cfg.credentialType,
            manifestUrl: cfg.manifestUrl,
            callbackUrl: cfg.callbackUrl,
          },
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

