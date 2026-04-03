import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth-options'
import type { ConnectionPool } from 'mssql'

const ADMIN_UPNS = ['malvarez@neuralxglobal.net', 'neuralx@neuralxglobal.net']
const ADMIN_SET = new Set(ADMIN_UPNS.map((x) => x.toLowerCase()))

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
  if (!ADMIN_SET.has(upn!.toLowerCase())) {
    return { error: NextResponse.json({ detail: 'Solo administradores' }, { status: 403 }), upn: null }
  }
  return { error: null, upn }
}

export async function getUserByUpnOrEmail(db: ConnectionPool, upnOrEmail: string) {
  const normalized = upnOrEmail.trim().toLowerCase()
  const result = await db.request()
    .input('login', normalized)
    .query(`
      SELECT TOP 1 id_usuario, nombre_completo, puesto, departamento, email, entra_id_upn, estatus, fecha_conexion, created_at
      FROM usuarios_socios
      WHERE LOWER(LTRIM(RTRIM(entra_id_upn))) = @login
         OR LOWER(LTRIM(RTRIM(email))) = @login
    `)

  return result.recordset[0] || null
}
