import type { ConnectionPool } from 'mssql'
import { buildNeuralxNotificationEmail } from '@/lib/email-template'

type EventType =
  | 'login_success'
  | 'transfer_internal_executed'
  | 'transfer_external_created'
  | 'transfer_external_approved'
  | 'transfer_external_rejected'

interface RecipientUser {
  id_usuario: string
  nombre_completo: string | null
  email: string | null
  entra_id_upn: string | null
}

function resolveRecipientEmail(user: RecipientUser) {
  return (user.email || user.entra_id_upn || '').trim().toLowerCase()
}

function portalUrl(path = '/dashboard') {
  const base =
    process.env.PORTAL_BASE_URL ||
    process.env.NEXTAUTH_URL ||
    'https://portal.neuralxglobal.net'
  return `${base.replace(/\/+$/, '')}${path}`
}

async function enqueueEmail(db: ConnectionPool, input: {
  eventType: EventType
  actorUserId?: string | null
  targetUser: RecipientUser
  title: string
  subtitle: string
  details: Array<{ label: string; value: string }>
  entityType: string
  entityId: string
  reference?: string | null
  payload?: Record<string, any>
}) {
  const to = resolveRecipientEmail(input.targetUser)
  if (!to) return

  const email = buildNeuralxNotificationEmail({
    kind: input.eventType,
    recipientName: input.targetUser.nombre_completo || undefined,
    recipientEmail: to,
    title: input.title,
    subtitle: input.subtitle,
    details: input.details,
    ctaUrl: portalUrl('/solicitudes'),
    ctaLabel: 'Ver en portal',
    reference: input.reference || input.entityId,
    timestampIso: new Date().toISOString(),
  })

  await db.request()
    .input('event_type', input.eventType)
    .input('id_usuario_actor', input.actorUserId || null)
    .input('id_usuario_destino', input.targetUser.id_usuario)
    .input('recipient_email', to)
    .input('entity_type', input.entityType)
    .input('entity_id', input.entityId)
    .input('payload_json', JSON.stringify(input.payload || {}))
    .input('subject', email.subject)
    .input('body_html', email.html)
    .input('body_text', email.text)
    .input('provider', 'microsoft-graph')
    .query(`
      EXEC dbo.sp_notification_enqueue_email
        @event_type,
        @id_usuario_actor,
        @id_usuario_destino,
        @recipient_email,
        @entity_type,
        @entity_id,
        @payload_json,
        @subject,
        @body_html,
        @body_text,
        @provider
    `)
}

async function getUserById(db: ConnectionPool, idUsuario: string) {
  const result = await db.request()
    .input('id_usuario', idUsuario)
    .query(`
      SELECT TOP 1 id_usuario, nombre_completo, email, entra_id_upn
      FROM usuarios_socios
      WHERE id_usuario = @id_usuario
    `)
  return (result.recordset[0] || null) as RecipientUser | null
}

export async function safeQueueLoginSuccessNotification(db: ConnectionPool, input: {
  userId: string
  actorUserId?: string | null
  userName?: string | null
  email?: string | null
  upn?: string | null
}) {
  try {
    const dedupe = await db.request()
      .input('id_usuario', input.userId)
      .query(`
        SELECT TOP 1 id_event
        FROM dbo.notification_events
        WHERE event_type = N'login_success'
          AND id_usuario_destino = @id_usuario
          AND created_at >= DATEADD(MINUTE, -10, SYSUTCDATETIME())
        ORDER BY created_at DESC
      `)
    if (dedupe.recordset[0]) return

    const user: RecipientUser = {
      id_usuario: input.userId,
      nombre_completo: input.userName || null,
      email: input.email || null,
      entra_id_upn: input.upn || null,
    }
    await enqueueEmail(db, {
      eventType: 'login_success',
      actorUserId: input.actorUserId || input.userId,
      targetUser: user,
      title: 'Inicio de sesion detectado',
      subtitle: 'Se detecto un acceso exitoso a tu perfil corporativo.',
      details: [
        { label: 'Usuario', value: input.userName || input.upn || input.email || input.userId },
        { label: 'Canal', value: 'Portal NeuralX Global' },
      ],
      entityType: 'sesion',
      entityId: `LOGIN-${input.userId}-${Date.now()}`,
    })
  } catch (err) {
    console.error('safeQueueLoginSuccessNotification:', err)
  }
}

export async function safeQueueTransferInternalExecuted(db: ConnectionPool, input: {
  actorUserId: string
  solicitudId: string
  txId: string
  monto: number
  moneda: string
  nxgOrigen: string
  nxgDestino: string
  concepto?: string | null
}) {
  try {
    const [actor, destino] = await Promise.all([
      getUserById(db, input.actorUserId),
      db.request()
        .input('nxg_destino', input.nxgDestino)
        .query(`
          SELECT TOP 1 us.id_usuario, us.nombre_completo, us.email, us.entra_id_upn
          FROM cuentas_internas ci
          INNER JOIN usuarios_socios us ON us.id_usuario = ci.id_usuario
          WHERE ci.nxg_id = @nxg_destino
        `)
        .then((r) => (r.recordset[0] || null) as RecipientUser | null),
    ])

    const recipients = [actor, destino].filter((u): u is RecipientUser => Boolean(u))
    const seen = new Set<string>()
    for (const targetUser of recipients) {
      const mail = resolveRecipientEmail(targetUser)
      if (!mail || seen.has(mail)) continue
      seen.add(mail)
      await enqueueEmail(db, {
        eventType: 'transfer_internal_executed',
        actorUserId: input.actorUserId,
        targetUser,
        title: 'Transferencia interna ejecutada',
        subtitle: 'La operacion se ejecuto y quedo contabilizada en el ledger institucional.',
        details: [
          { label: 'Monto', value: `${input.monto} ${input.moneda}` },
          { label: 'Origen', value: input.nxgOrigen },
          { label: 'Destino', value: input.nxgDestino },
          { label: 'TX', value: input.txId },
          { label: 'Concepto', value: input.concepto || 'Transferencia interna' },
        ],
        entityType: 'solicitud',
        entityId: input.solicitudId,
        reference: input.solicitudId,
        payload: { tx_id: input.txId, type: 'transferencia_interna' },
      })
    }
  } catch (err) {
    console.error('safeQueueTransferInternalExecuted:', err)
  }
}

export async function safeQueueTransferExternalCreated(db: ConnectionPool, input: {
  actorUserId: string
  solicitudId: string
  monto: number
  moneda: string
  nxgOrigen: string
  bancoDestino?: string | null
  concepto?: string | null
}) {
  try {
    const actor = await getUserById(db, input.actorUserId)
    if (!actor) return
    await enqueueEmail(db, {
      eventType: 'transfer_external_created',
      actorUserId: input.actorUserId,
      targetUser: actor,
      title: 'Transferencia externa registrada',
      subtitle: 'Tu transferencia externa fue registrada y espera aprobacion administrativa.',
      details: [
        { label: 'Monto', value: `${input.monto} ${input.moneda}` },
        { label: 'Origen', value: input.nxgOrigen },
        { label: 'Banco destino', value: input.bancoDestino || 'Cuenta bancaria vinculada' },
        { label: 'Concepto', value: input.concepto || 'Transferencia externa' },
      ],
      entityType: 'solicitud',
      entityId: input.solicitudId,
      reference: input.solicitudId,
      payload: { type: 'transferencia_externa', status: 'pendiente' },
    })
  } catch (err) {
    console.error('safeQueueTransferExternalCreated:', err)
  }
}

export async function safeQueueTransferExternalDecision(db: ConnectionPool, input: {
  actorUserId: string
  targetUserId: string
  solicitudId: string
  decision: 'approved' | 'rejected'
  monto: number
  moneda: string
  concepto?: string | null
}) {
  try {
    const user = await getUserById(db, input.targetUserId)
    if (!user) return
    await enqueueEmail(db, {
      eventType:
        input.decision === 'approved'
          ? 'transfer_external_approved'
          : 'transfer_external_rejected',
      actorUserId: input.actorUserId,
      targetUser: user,
      title:
        input.decision === 'approved'
          ? 'Transferencia externa aprobada'
          : 'Transferencia externa rechazada',
      subtitle:
        input.decision === 'approved'
          ? 'La transferencia fue aprobada por administracion y se proceso.'
          : 'La transferencia fue rechazada por administracion.',
      details: [
        { label: 'Monto', value: `${input.monto} ${input.moneda}` },
        { label: 'Concepto', value: input.concepto || 'Transferencia externa' },
        { label: 'Resultado', value: input.decision === 'approved' ? 'Aprobada' : 'Rechazada' },
      ],
      entityType: 'solicitud',
      entityId: input.solicitudId,
      reference: input.solicitudId,
      payload: { type: 'transferencia_externa', decision: input.decision },
    })
  } catch (err) {
    console.error('safeQueueTransferExternalDecision:', err)
  }
}

