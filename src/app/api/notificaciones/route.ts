import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getUserByUpnOrEmail, requireAuth } from '@/lib/auth-helpers'
import { autoProvisionUser } from '@/lib/auto-provision'

export async function GET() {
  const { error, upn, oid } = await requireAuth()
  if (error) return error

  try {
    const db = await getDb()
    let user = await getUserByUpnOrEmail(db, upn!, oid)
    if (!user) user = await autoProvisionUser(db, upn!)

    const result = await db.request()
      .input('userId', user.id_usuario)
      .query(`
        SELECT id_notificacion, titulo, mensaje, tipo, leida, link, created_at
        FROM notificaciones
        WHERE id_usuario = @userId
        ORDER BY created_at DESC
      `)

    const noLeidas = result.recordset.filter((n: any) => !n.leida).length

    return NextResponse.json({
      notificaciones: result.recordset,
      no_leidas: noLeidas,
    })
  } catch (err: any) {
    console.error('Error GET /api/notificaciones:', err)
    return NextResponse.json({ detail: err.message }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  const { error, upn, oid } = await requireAuth()
  if (error) return error

  try {
    const { id_notificacion } = await request.json()
    if (!id_notificacion) {
      return NextResponse.json({ detail: 'id_notificacion requerido' }, { status: 400 })
    }

    const db = await getDb()
    let user = await getUserByUpnOrEmail(db, upn!, oid)
    if (!user) user = await autoProvisionUser(db, upn!)

    await db.request()
      .input('id', Number(id_notificacion))
      .input('userId', user.id_usuario)
      .query(`
        UPDATE notificaciones SET leida = 1
        WHERE id_notificacion = @id AND id_usuario = @userId
      `)

    return NextResponse.json({ exito: true })
  } catch (err: any) {
    console.error('Error PATCH /api/notificaciones:', err)
    return NextResponse.json({ detail: err.message }, { status: 500 })
  }
}

