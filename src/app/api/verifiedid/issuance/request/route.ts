import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getUserByUpnOrEmail, requireAuth } from '@/lib/auth-helpers'
import {
  buildIssuancePayload,
  buildIssuanceState,
  getVerifiedIdAccessToken,
  getVerifiedIdConfig,
  normalizeIssuanceResponse,
} from '@/lib/verifiedid'

function normalizeSqlDateTime(value: unknown): Date | null {
  if (!value) return null
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value
  }

  const raw = String(value).trim()
  if (!raw) return null

  // Supports ISO strings and RFC822-like timestamps from upstream APIs.
  const parsed = new Date(raw)
  if (!Number.isNaN(parsed.getTime())) return parsed

  const numeric = Number(raw)
  if (Number.isFinite(numeric)) {
    const epoch = new Date(numeric)
    return Number.isNaN(epoch.getTime()) ? null : epoch
  }

  return null
}

function splitNameParts(fullName: string | null | undefined) {
  const clean = (fullName || '').trim().replace(/\s+/g, ' ')
  if (!clean) return { given_name: '', family_name: '' }
  const parts = clean.split(' ')
  if (parts.length === 1) return { given_name: parts[0], family_name: parts[0] }
  return {
    given_name: parts.slice(0, -1).join(' '),
    family_name: parts[parts.length - 1],
  }
}

export async function POST() {
  const { error, upn } = await requireAuth()
  if (error) return error

  try {
    const cfg = getVerifiedIdConfig()
    const db = await getDb()
    const user = await getUserByUpnOrEmail(db, upn!)
    if (!user) {
      return NextResponse.json({ detail: 'Usuario autenticado no encontrado en base de datos' }, { status: 404 })
    }

    const nameParts = splitNameParts(user.nombre_completo || user.email || upn)
    const claims = {
      given_name: nameParts.given_name,
      family_name: nameParts.family_name,
      email: String(user.email || upn || ''),
      department: String(user.departamento || 'Operations'),
      jobTitle: String(user.puesto || 'Operator'),
      extension_authorizationLevel: process.env.VERIFIEDID_AUTHORIZATION_LEVEL || 'standard',
    }

    const missingClaims = ['given_name', 'family_name', 'email', 'department', 'jobTitle'].filter(
      (k) => !String((claims as any)[k] || '').trim()
    )
    if (missingClaims.length > 0) {
      return NextResponse.json(
        {
          detail: `Faltan claims requeridos para emisión: ${missingClaims.join(', ')}`,
          user_preview: {
            nombre_completo: user.nombre_completo,
            email: user.email,
            departamento: user.departamento,
            puesto: user.puesto,
          },
        },
        { status: 400 }
      )
    }

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
    const payload = {
      ...buildIssuancePayload(state),
      claims,
    }
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
    const expiryAt = normalizeSqlDateTime(normalized.expiry)
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
      .input('expiry_at', expiryAt)
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

