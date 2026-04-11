const GRAPH_SCOPE = 'https://graph.microsoft.com/.default'

function required(value: string | undefined, name: string) {
  if (!value || !value.trim()) throw new Error(`Falta variable de entorno: ${name}`)
  return value.trim()
}

function getGraphConfig() {
  const tenantId = required(
    process.env.GRAPH_MAIL_TENANT_ID || process.env.AZURE_AD_TENANT_ID,
    'GRAPH_MAIL_TENANT_ID/AZURE_AD_TENANT_ID'
  )
  const clientId = required(
    process.env.GRAPH_MAIL_CLIENT_ID || process.env.AZURE_AD_CLIENT_ID,
    'GRAPH_MAIL_CLIENT_ID/AZURE_AD_CLIENT_ID'
  )
  const clientSecret = required(
    process.env.GRAPH_MAIL_CLIENT_SECRET || process.env.AZURE_AD_CLIENT_SECRET,
    'GRAPH_MAIL_CLIENT_SECRET/AZURE_AD_CLIENT_SECRET'
  )
  const sender = required(process.env.GRAPH_MAIL_SENDER, 'GRAPH_MAIL_SENDER')
  return { tenantId, clientId, clientSecret, sender }
}

async function getGraphAccessToken() {
  const { tenantId, clientId, clientSecret } = getGraphConfig()
  const tokenUrl = `https://login.microsoftonline.com/${encodeURIComponent(tenantId)}/oauth2/v2.0/token`
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
    scope: GRAPH_SCOPE,
  })

  const res = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  const json = await res.json()
  if (!res.ok) {
    throw new Error(json?.error_description || json?.error || 'No se pudo obtener token de Microsoft Graph')
  }
  return String(json.access_token || '')
}

export async function sendMailViaGraph(input: {
  recipientEmail: string
  subject: string
  html: string
  text?: string | null
}) {
  const { sender } = getGraphConfig()
  const token = await getGraphAccessToken()
  const endpoint = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(sender)}/sendMail`

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: {
        subject: input.subject,
        body: {
          contentType: 'HTML',
          content: input.html,
        },
        toRecipients: [{ emailAddress: { address: input.recipientEmail } }],
        internetMessageHeaders: input.text
          ? [{ name: 'X-NeuralX-Text-Fallback', value: input.text.slice(0, 900) }]
          : undefined,
      },
      saveToSentItems: true,
    }),
  })

  if (!res.ok) {
    const raw = await res.text()
    throw new Error(`Graph sendMail fallo (${res.status}): ${raw}`)
  }

  return { ok: true, providerMessageId: null as string | null }
}

