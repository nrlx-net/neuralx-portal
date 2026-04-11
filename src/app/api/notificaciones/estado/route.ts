import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { requireAdmin } from '@/lib/auth-helpers'

/**
 * Diagnóstico de cola de notificaciones (solo admin).
 * Útil cuando en SQL las tablas existen pero hay 0 filas: ver conteos y últimos registros.
 */
export async function GET() {
  const { error } = await requireAdmin()
  if (error) return error

  try {
    const db = await getDb()

    const [spRow, evCount, obCount, recentEvents, recentOutbox] = await Promise.all([
      db.request().query<{ id: number | null }>(`
        SELECT OBJECT_ID(N'dbo.sp_notification_enqueue_email', N'P') AS id
      `),
      db.request().query<{ n: number }>(`SELECT COUNT_BIG(*) AS n FROM dbo.notification_events`),
      db.request().query<{ n: number }>(`SELECT COUNT_BIG(*) AS n FROM dbo.email_outbox`),
      db.request().query(`
        SELECT TOP 15 id_event, event_type, recipient_email, created_at
        FROM dbo.notification_events
        ORDER BY created_at DESC
      `),
      db.request().query(`
        SELECT TOP 15 id_outbox, status, attempts, last_error, created_at, updated_at
        FROM dbo.email_outbox
        ORDER BY created_at DESC
      `),
    ])

    return NextResponse.json({
      ok: true,
      sp_notification_enqueue_email_exists: Boolean(spRow.recordset[0]?.id),
      notification_events_count: Number(evCount.recordset[0]?.n ?? 0),
      email_outbox_count: Number(obCount.recordset[0]?.n ?? 0),
      recent_notification_events: recentEvents.recordset,
      recent_email_outbox: recentOutbox.recordset,
      hint:
        Number(evCount.recordset[0]?.n ?? 0) === 0
          ? 'Si sigue en 0 tras iniciar sesión: revisa logs de Vercel en /api/me (error del SP o destinatario vacío) y que el deploy tenga el código de notificaciones.'
          : null,
    })
  } catch (err: any) {
    console.error('Error /api/notificaciones/estado:', err)
    return NextResponse.json(
      {
        ok: false,
        detail: err.message || 'Error leyendo cola',
        hint: 'Si falla aquí, el usuario SQL de la app puede no tener permiso SELECT en notification_events / email_outbox.',
      },
      { status: 500 },
    )
  }
}
