import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth-options'
import type { ConnectionPool } from 'mssql'

const ADMIN_UPNS = ['malvarez@neuralxglobal.net', 'neuralx@neuralxglobal.net']
const ADMIN_SET = new Set(ADMIN_UPNS.map((x) => x.toLowerCase()))

export function isAdminUpn(value: string | null | undefined) {
  if (!value) return false
  return ADMIN_SET.has(value.toLowerCase().trim())
}

export async function getAuthenticatedUpn(): Promise<string | null> {
  const session = await getServerSession(authOptions)
  if (!session?.user?.upn && !session?.user?.email) return null
  return (session.user.upn || session.user.email) as string
}

export async function requireAuth() {
  const session = await getServerSession(authOptions)
  const upn = (session?.user?.upn || session?.user?.email || null) as string | null
  const oid = (session?.user?.oid || null) as string | null
  if (!upn) {
    return { error: NextResponse.json({ detail: 'No autenticado' }, { status: 401 }), upn: null, oid: null }
  }
  return { error: null, upn, oid }
}

export async function requireAdmin() {
  const { error, upn, oid } = await requireAuth()
  if (error) return { error, upn: null, oid: null }
  if (!isAdminUpn(upn)) {
    return { error: NextResponse.json({ detail: 'Solo administradores' }, { status: 403 }), upn: null, oid: null }
  }
  return { error: null, upn, oid }
}

export async function getUserByUpnOrEmail(db: ConnectionPool, upnOrEmail: string, oid?: string | null) {
  const normalized = upnOrEmail.trim().toLowerCase()
  const normalizedOid = (oid || '').trim().toLowerCase()
  const request = db.request()
    .input('login', normalized)
    .input('oid', normalizedOid)

  const result = await request.query(`
      SELECT TOP 1 id_usuario, nombre_completo, puesto, departamento, email, entra_id_upn, estatus, fecha_conexion, created_at
      FROM usuarios_socios
      WHERE LOWER(LTRIM(RTRIM(entra_id_upn))) = @login
         OR LOWER(LTRIM(RTRIM(email))) = @login
         OR (@oid <> '' AND LOWER(LTRIM(RTRIM(entra_object_id))) = @oid)
    `)

  return result.recordset[0] || null
}
