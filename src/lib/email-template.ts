type NotificationKind =
  | 'login_success'
  | 'transfer_internal_executed'
  | 'transfer_external_created'
  | 'transfer_external_approved'
  | 'transfer_external_rejected'
  | 'generic'

interface NotificationDetail {
  label: string
  value: string
}

export interface BuildEmailTemplateInput {
  kind: NotificationKind
  recipientName?: string | null
  recipientEmail: string
  title: string
  subtitle?: string | null
  details?: NotificationDetail[]
  ctaUrl?: string | null
  ctaLabel?: string | null
  reference?: string | null
  timestampIso?: string | null
}

const HEADER_LOGO_URL =
  process.env.EMAIL_HEADER_LOGO_URL ||
  'https://pub-0096ef66aa784fc09207634c34c5baaa.r2.dev/Logos_neuralx_cloudfire/Logo_neuralx_letra_blanco.png'

const FOOTER_CENTER_ICON_URL =
  process.env.EMAIL_FOOTER_ICON_URL ||
  'https://pub-0096ef66aa784fc09207634c34c5baaa.r2.dev/Logos_neuralx_cloudfire/icono_neuralx_defense_blanco.png'

function humanKind(kind: NotificationKind) {
  switch (kind) {
    case 'login_success':
      return 'Inicio de sesion detectado'
    case 'transfer_internal_executed':
      return 'Transferencia interna ejecutada'
    case 'transfer_external_created':
      return 'Transferencia externa registrada'
    case 'transfer_external_approved':
      return 'Transferencia externa aprobada'
    case 'transfer_external_rejected':
      return 'Transferencia externa rechazada'
    default:
      return 'Notificacion operativa'
  }
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function renderDetails(details: NotificationDetail[]) {
  if (!details.length) return ''
  return details
    .map(
      (item) => `
        <tr>
          <td style="padding:6px 0;color:#9CA3AF;font-size:12px;vertical-align:top;">${escapeHtml(item.label)}</td>
          <td style="padding:6px 0;color:#F3F4F6;font-size:13px;font-weight:600;text-align:right;vertical-align:top;">${escapeHtml(item.value)}</td>
        </tr>
      `
    )
    .join('')
}

export function buildNeuralxNotificationEmail(input: BuildEmailTemplateInput) {
  const {
    recipientName,
    recipientEmail,
    kind,
    title,
    subtitle,
    details = [],
    ctaUrl,
    ctaLabel,
    reference,
    timestampIso,
  } = input

  const safeName = recipientName?.trim() || recipientEmail
  const safeTitle = escapeHtml(title)
  const safeSubtitle = escapeHtml(subtitle || humanKind(kind))
  const safeRef = reference ? escapeHtml(reference) : null
  const safeTimestamp = timestampIso ? new Date(timestampIso).toLocaleString('es-MX', { hour12: false }) : null

  const html = `
  <!doctype html>
  <html lang="es">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>${safeTitle}</title>
    </head>
    <body style="margin:0;padding:0;background:#030712;font-family:Arial,Helvetica,sans-serif;color:#E5E7EB;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#030712;padding:24px 12px;">
        <tr>
          <td align="center">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:680px;">
              <tr>
                <td align="center" style="padding:8px 0 14px;">
                  <img src="${HEADER_LOGO_URL}" alt="NeuralX Global" style="max-width:320px;width:100%;height:auto;display:block;" />
                </td>
              </tr>

              <tr>
                <td style="border:1px solid #1F2937;border-radius:14px;background:#0B0F17;padding:22px;">
                  <p style="margin:0 0 10px;color:#9CA3AF;font-size:12px;letter-spacing:.12em;text-transform:uppercase;">
                    Portal de socios
                  </p>
                  <h1 style="margin:0 0 8px;color:#F9FAFB;font-size:22px;line-height:1.3;">${safeTitle}</h1>
                  <p style="margin:0 0 20px;color:#D1D5DB;font-size:14px;">${safeSubtitle}</p>

                  <div style="border:1px solid #1F2937;border-radius:10px;background:#060A12;padding:14px;margin-bottom:16px;">
                    <p style="margin:0;color:#9CA3AF;font-size:12px;">Estimado(a)</p>
                    <p style="margin:4px 0 0;color:#F3F4F6;font-size:14px;font-weight:600;">${escapeHtml(safeName)}</p>
                  </div>

                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px;">
                    ${renderDetails(details)}
                  </table>

                  ${
                    safeRef || safeTimestamp
                      ? `
                    <div style="margin-top:8px;">
                      ${safeRef ? `<p style="margin:4px 0;color:#9CA3AF;font-size:12px;">Folio: <span style="color:#F3F4F6;">${safeRef}</span></p>` : ''}
                      ${safeTimestamp ? `<p style="margin:4px 0;color:#9CA3AF;font-size:12px;">Fecha: <span style="color:#F3F4F6;">${escapeHtml(safeTimestamp)}</span></p>` : ''}
                    </div>
                  `
                      : ''
                  }

                  ${
                    ctaUrl
                      ? `
                    <div style="margin-top:18px;">
                      <a href="${escapeHtml(ctaUrl)}" style="display:inline-block;padding:10px 16px;border-radius:8px;border:1px solid #2563EB;background:#1D4ED8;color:#FFFFFF;text-decoration:none;font-size:13px;font-weight:600;">
                        ${escapeHtml(ctaLabel || 'Ver en portal')}
                      </a>
                    </div>
                  `
                      : ''
                  }
                </td>
              </tr>

              <tr>
                <td style="padding-top:18px;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="border:1px solid #1F2937;border-radius:12px;background:#0B0F17;padding:12px;" align="center">
                        <img src="${FOOTER_CENTER_ICON_URL}" alt="NeuralX" style="width:36px;height:36px;display:block;margin:0 auto 8px;" />
                        <p style="margin:0;color:#D1D5DB;font-size:12px;font-weight:600;">NeuralX Global Corp</p>
                        <p style="margin:4px 0 0;color:#9CA3AF;font-size:11px;">neuralx@neuralxglobal.net · Delaware, USA</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
  </html>
  `

  const textLines = [
    `NeuralX Global - ${title}`,
    subtitle || humanKind(kind),
    '',
    `Destinatario: ${safeName} <${recipientEmail}>`,
    ...details.map((d) => `${d.label}: ${d.value}`),
    reference ? `Folio: ${reference}` : '',
    timestampIso ? `Fecha: ${new Date(timestampIso).toISOString()}` : '',
    ctaUrl ? `Portal: ${ctaUrl}` : '',
  ].filter(Boolean)

  return {
    subject: `NeuralX Portal | ${title}`,
    html,
    text: textLines.join('\n'),
  }
}

