import { getDb } from '@/lib/db'
import { sendMailViaGraph } from '@/lib/email-provider-graph'

function trimError(message: string) {
  return message.slice(0, 1900)
}

export async function dispatchEmailOutboxBatch(batchSize = 10) {
  const db = await getDb()
  const limit = Math.min(Math.max(Number(batchSize || 10), 1), 50)
  let sent = 0
  let failed = 0
  let processed = 0

  for (let i = 0; i < limit; i += 1) {
    const nextResult = await db.request().query('EXEC dbo.sp_email_outbox_take_next')
    const item = nextResult.recordset?.[0]
    if (!item?.id_outbox) break
    processed += 1

    try {
      await sendMailViaGraph({
        recipientEmail: String(item.recipient_email || ''),
        subject: String(item.subject || 'NeuralX Portal'),
        html: String(item.body_html || ''),
        text: item.body_text ? String(item.body_text) : null,
      })

      await db.request()
        .input('id_outbox', Number(item.id_outbox))
        .input('provider_message_id', null)
        .query('EXEC dbo.sp_email_outbox_mark_sent @id_outbox, @provider_message_id')
      sent += 1
    } catch (err: any) {
      await db.request()
        .input('id_outbox', Number(item.id_outbox))
        .input('error_message', trimError(String(err?.message || 'Error enviando correo')))
        .query('EXEC dbo.sp_email_outbox_mark_failed @id_outbox, @error_message')
      failed += 1
    }
  }

  return {
    processed,
    sent,
    failed,
    remaining_estimate: Math.max(0, processed - sent - failed),
  }
}

