import { randomUUID } from 'crypto'

type IssuanceStatus =
  | 'created'
  | 'request_retrieved'
  | 'issuance_successful'
  | 'issuance_error'

function required(name: string, fallback?: string) {
  const value = process.env[name] || fallback
  if (!value) throw new Error(`Falta variable de entorno: ${name}`)
  return value
}

export function getVerifiedIdConfig() {
  const tenantId = required('VERIFIEDID_TENANT_ID', process.env.AZURE_TENANT_ID)
  const clientId = required('VERIFIEDID_CLIENT_ID', process.env.AZURE_CLIENT_ID)
  const clientSecret = required('VERIFIEDID_CLIENT_SECRET', process.env.AZURE_CLIENT_SECRET)
  const scope = process.env.VERIFIEDID_SCOPE || 'https://verifiedid.did.msidentity.com/.default'
  const createUrl =
    process.env.VERIFIEDID_CREATE_ISSUANCE_URL ||
    'https://verifiedid.did.msidentity.com/v1.0/verifiableCredentials/createIssuanceRequest'
  const callbackUrl = required('VERIFIEDID_CALLBACK_URL')
  const callbackApiKey = required('VERIFIEDID_CALLBACK_API_KEY')
  const authority = required(
    'VERIFIEDID_AUTHORITY',
    'did:web:verifiedid.entra.microsoft.com:155d2fca-bfb9-46c0-9ace-05a0d8e17eee:ff36a60c-a69d-51c5-e7dc-63d7031c0531'
  )
  const credentialType = required(
    'VERIFIEDID_CREDENTIAL_TYPE',
    'NeuralXGlobalOperationsDirectorateCredential'
  )
  const manifestUrl = required(
    'VERIFIEDID_MANIFEST_URL',
    'https://verifiedid.did.msidentity.com/v1.0/tenants/155d2fca-bfb9-46c0-9ace-05a0d8e17eee/verifiableCredentials/contracts/089d6553-77ba-0bf1-72c3-129cda2792f1/manifest'
  )
  const clientName = process.env.VERIFIEDID_CLIENT_NAME || 'NeuralX Portal'
  return {
    tenantId,
    clientId,
    clientSecret,
    scope,
    createUrl,
    callbackUrl,
    callbackApiKey,
    authority,
    credentialType,
    manifestUrl,
    clientName,
  }
}

export async function getVerifiedIdAccessToken() {
  const cfg = getVerifiedIdConfig()
  const tokenUrl = `https://login.microsoftonline.com/${cfg.tenantId}/oauth2/v2.0/token`

  const body = new URLSearchParams()
  body.set('client_id', cfg.clientId)
  body.set('client_secret', cfg.clientSecret)
  body.set('scope', cfg.scope)
  body.set('grant_type', 'client_credentials')

  const res = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
    cache: 'no-store',
  })
  const payload = await res.json().catch(() => ({}))
  if (!res.ok || !payload?.access_token) {
    throw new Error(payload?.error_description || payload?.error || 'No se pudo obtener token de Verified ID')
  }
  return String(payload.access_token)
}

function toQrDataUrl(text: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300"><rect width="100%" height="100%" fill="white"/><text x="50%" y="48%" dominant-baseline="middle" text-anchor="middle" font-size="14" fill="#111">Escanea desde Authenticator</text><text x="50%" y="56%" dominant-baseline="middle" text-anchor="middle" font-size="10" fill="#666">Si no aparece QR, abre enlace directo</text></svg>`
  const fallbackSvg = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`
  if (!text) return fallbackSvg
  const encoded = encodeURIComponent(text)
  return `https://quickchart.io/qr?size=300&text=${encoded}`
}

export function buildIssuanceState() {
  return `vid-${randomUUID()}`
}

export function buildIssuancePayload(state: string) {
  const cfg = getVerifiedIdConfig()
  return {
    callback: {
      url: cfg.callbackUrl,
      state,
      headers: { 'api-key': cfg.callbackApiKey },
    },
    authority: cfg.authority,
    registration: {
      clientName: cfg.clientName,
    },
    type: cfg.credentialType,
    manifest: cfg.manifestUrl,
  }
}

export function normalizeIssuanceResponse(raw: any) {
  const deepLink = String(raw?.url || raw?.link || '')
  return {
    requestId: raw?.requestId ? String(raw.requestId) : null,
    url: deepLink || null,
    qrCode: raw?.qrCode ? String(raw.qrCode) : toQrDataUrl(deepLink),
    expiry: raw?.expiry ? String(raw.expiry) : null,
  }
}

export function normalizeStatus(value: any): IssuanceStatus {
  const v = String(value || '').trim().toLowerCase()
  if (v === 'created') return 'created'
  if (v === 'request_retrieved') return 'request_retrieved'
  if (v === 'issuance_successful') return 'issuance_successful'
  if (v === 'issuance_error') return 'issuance_error'
  return 'created'
}

