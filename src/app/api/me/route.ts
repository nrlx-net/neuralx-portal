import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getUserByUpnOrEmail, requireAuth } from '@/lib/auth-helpers'

export async function GET() {
  const { error, upn } = await requireAuth()
  if (error) return error

  try {
    const db = await getDb()
    const user = await getUserByUpnOrEmail(db, upn!)
    if (!user) {
      return NextResponse.json({ detail: 'Usuario no encontrado en neuralxbank' }, { status: 404 })
    }

    return NextResponse.json(user)
  } catch (err: any) {
    console.error('Error /api/me:', err)
    return NextResponse.json({ detail: err.message }, { status: 500 })
  }
}
