import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { requireAuth } from '@/lib/auth-helpers'

export async function GET(request: Request) {
  const { error, upn } = await requireAuth()
  if (error) return error

  const { searchParams } = new URL(request.url)
  const estatus = searchParams.get('estatus')

  try {
    const db = await getDb()
    const userResult = await db
      .request()
      .input('upn', upn)
      .query('SELECT id_usuario FROM usuarios_socios WHERE entra_id_upn = @upn')

    if (userResult.recordset.length === 0) {
      return NextResponse.json({ detail: 'Usuario no encontrado' }, { status: 404 })
    }

    const userId = userResult.recordset[0].id_usuario
    const req = db.request().input('userId', userId)
    let query = `
      SELECT id_proceso, tipo_proceso, estatus, fecha_inicio, fecha_actualizacion
      FROM procesos_regulatorios
      WHERE id_usuario = @userId
    `
    if (estatus) {
      query += ' AND estatus = @estatus'
      req.input('estatus', estatus)
    }
    query += ' ORDER BY fecha_actualizacion DESC'
    const result = await req.query(query)

    return NextResponse.json({ procesos: result.recordset, total: result.recordset.length })
  } catch (err: any) {
    console.error('Error /api/regulatorios:', err)
    return NextResponse.json({ detail: err.message }, { status: 500 })
  }
}
