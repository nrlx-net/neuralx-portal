import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth-options'

const ADMIN_UPNS = ['malvarez@neuralxglobal.net', 'neuralx@neuralxglobal.net']

export async function getAuthenticatedUpn(): Promise<string | null> {
  const session = await getServerSession(authOptions)
  if (!session?.user?.upn && !session?.user?.email) return null
  return (session.user.upn || session.user.email) as string
}

export async function requireAuth() {
  const upn = await getAuthenticatedUpn()
  if (!upn) {
    return { error: NextResponse.json({ detail: 'No autenticado' }, { status: 401 }), upn: null }
  }
  return { error: null, upn }
}

export async function requireAdmin() {
  const { error, upn } = await requireAuth()
  if (error) return { error, upn: null }
  if (!ADMIN_UPNS.includes(upn!)) {
    return { error: NextResponse.json({ detail: 'Solo administradores' }, { status: 403 }), upn: null }
  }
  return { error: null, upn }
}
