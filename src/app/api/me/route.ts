import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { requireAuth } from '@/lib/auth-helpers'

export async function GET() {
  const { error, upn } = await requireAuth()
  if (error) return error

  try {
    const db = await getDb()
    const result = await db.request()
      .input('upn', upn)
      .query(`
        SELECT id_usuario, nombre_completo, puesto, departamento,
               email, entra_id_upn, estatus, fecha_conexion, created_at
        FROM usuarios_socios
        WHERE entra_id_upn = @upn
      `)

    if (result.recordset.length === 0) {
      return NextResponse.json({ detail: 'Usuario no encontrado en neuralxbank' }, { status: 404 })
    }

    return NextResponse.json(result.recordset[0])
  } catch (err: any) {
    console.error('Error /api/me:', err)
    return NextResponse.json({ detail: err.message }, { status: 500 })
  }
}
