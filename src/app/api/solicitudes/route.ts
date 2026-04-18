import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getUserByUpnOrEmail, isAdminUpn, requireAuth } from '@/lib/auth-helpers'
import { autoProvisionUser } from '@/lib/auto-provision'
import { resolveEstatusGrupo } from '@/lib/movimiento-estatus'

export async function GET(request: Request) {
  const { error, upn, oid } = await requireAuth()
  if (error) return error

  const { searchParams } = new URL(request.url)
  const estatus = searchParams.get('estatus')

  try {
    const db = await getDb()
    let user = await getUserByUpnOrEmail(db, upn!, oid)
    if (!user) {
      user = await autoProvisionUser(db, upn!)
    }

    const admin = isAdminUpn(upn)
    let query = `
      SELECT id_solicitud, tipo, nxg_origen, nxg_destino, id_cuenta_banco, monto,
             moneda, concepto, estatus, comentario_admin, aprobado_por,
             fecha_solicitud, fecha_resolucion
      FROM solicitudes
      WHERE 1=1
    `

    const req = db.request()
    if (!admin) {
      query += ' AND id_usuario = @userId'
      req.input('userId', user.id_usuario)
    }
    if (estatus) {
      const raw = estatus.trim()
      const lower = raw.toLowerCase()
      const mappedKey = lower === 'pendiente' ? 'proceso' : lower
      const grupo = resolveEstatusGrupo(mappedKey)
      if (grupo?.length) {
        const ph = grupo.map((_, i) => `@sEst${i}`).join(', ')
        query += ` AND LOWER(LTRIM(RTRIM(estatus))) IN (${ph})`
        grupo.forEach((v, i) => req.input(`sEst${i}`, String(v).toLowerCase().trim()))
      } else {
        query += ' AND LOWER(LTRIM(RTRIM(estatus))) = LOWER(LTRIM(RTRIM(@estatus)))'
        req.input('estatus', raw)
      }
    }
    query += ' ORDER BY fecha_solicitud DESC'

    const result = await req.query(query)
    return NextResponse.json({
      solicitudes: result.recordset,
      total: result.recordset.length,
    })
  } catch (err: any) {
    console.error('Error /api/solicitudes:', err)
    return NextResponse.json({ detail: err.message }, { status: 500 })
  }
}
