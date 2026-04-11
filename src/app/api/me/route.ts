import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { getDb } from '@/lib/db'
import { authOptions } from '@/lib/auth-options'
import { getUserByUpnOrEmail, requireAuth } from '@/lib/auth-helpers'
import { autoProvisionUser } from '@/lib/auto-provision'
import { safeQueueLoginSuccessNotification } from '@/lib/notification-outbox'

export async function GET() {
  const { error, upn, oid } = await requireAuth()
  if (error) return error

  try {
    const db = await getDb()
    const session = await getServerSession(authOptions)
    const sessionName = session?.user?.name?.trim() || null

    let user = await getUserByUpnOrEmail(db, upn!, oid)
    if (!user) {
      user = await autoProvisionUser(db, upn!, sessionName)
    } else if (sessionName && user.nombre_completo !== sessionName) {
      await db.request()
        .input('id_usuario', user.id_usuario)
        .input('nombre_completo', sessionName)
        .query(`
          UPDATE usuarios_socios
          SET nombre_completo = @nombre_completo,
              updated_at = SYSUTCDATETIME()
          WHERE id_usuario = @id_usuario
        `)
      user = { ...user, nombre_completo: sessionName }
    }

    await safeQueueLoginSuccessNotification(db, {
      userId: user.id_usuario,
      actorUserId: user.id_usuario,
      userName: user.nombre_completo || sessionName || null,
      email: user.email || session?.user?.email || null,
      upn: user.entra_id_upn || session?.user?.upn || upn || null,
    })

    return NextResponse.json(user)
  } catch (err: any) {
    console.error('Error /api/me:', err)
    return NextResponse.json({ detail: err.message }, { status: 500 })
  }
}
