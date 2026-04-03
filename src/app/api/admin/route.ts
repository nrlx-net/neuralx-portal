import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getUserByUpnOrEmail, requireAdmin } from '@/lib/auth-helpers'

export async function GET(request: Request) {
  const { error } = await requireAdmin()
  if (error) return error

  const { searchParams } = new URL(request.url)
  const view = searchParams.get('view') || 'resumen'

  try {
    const db = await getDb()

    if (view === 'usuarios') {
      const result = await db.request().query('SELECT * FROM v_dashboard_admin')
      return NextResponse.json(result.recordset)
    }

    if (view === 'cuentas') {
      const result = await db.request().query(`
        SELECT nxg_id, id_usuario, saldo_disponible, saldo_retenido, moneda, estatus, created_at, updated_at
        FROM cuentas_internas
        ORDER BY nxg_id
      `)
      return NextResponse.json(result.recordset)
    }

    if (view === 'solicitudes') {
      const result = await db.request().query('SELECT * FROM v_solicitudes_pendientes')
      return NextResponse.json(result.recordset)
    }

    if (view === 'custodia') {
      const result = await db.request().query(`
        SELECT id_custodia, saldo_total, saldo_asignado, saldo_disponible, moneda, updated_at
        FROM cuenta_custodia
      `)
      return NextResponse.json(result.recordset)
    }

    const [usuarios, custodia] = await Promise.all([
      db.request().query('SELECT * FROM v_dashboard_admin'),
      db.request().query(`
        SELECT saldo_total AS total,
               saldo_asignado AS asignado,
               saldo_disponible AS disponible
        FROM cuenta_custodia WHERE id_custodia = N'CUSTODIA-001'
      `),
    ])

    return NextResponse.json({
      usuarios: usuarios.recordset,
      custodia: custodia.recordset[0] || null,
    })
  } catch (err: any) {
    console.error('Error /api/admin:', err)
    return NextResponse.json({ detail: err.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const { error, upn } = await requireAdmin()
  if (error) return error

  try {
    const body = await request.json()
    const { action, id_solicitud, id_transaccion, comentario } = body
    const solicitudId = id_solicitud || id_transaccion

    if (!action || !solicitudId) {
      return NextResponse.json({ detail: 'Faltan action e id_solicitud' }, { status: 400 })
    }

    const db = await getDb()
    const admin = await getUserByUpnOrEmail(db, upn!)
    if (!admin) {
      return NextResponse.json({ detail: 'Admin no encontrado en usuarios_socios' }, { status: 404 })
    }

    const idAdmin = admin.id_usuario

    if (action === 'aprobar') {
      const execResult = await db.request()
        .input('id_admin', idAdmin)
        .input('id_solicitud', solicitudId)
        .input('comentario', comentario || null)
        .query('EXEC dbo.sp_aprobar_solicitud @id_admin, @id_solicitud, @comentario')
      const data = execResult.recordset?.[0] || {}
      return NextResponse.json({
        exito: data.exito ?? true,
        id_solicitud: data.id_solicitud || solicitudId,
        id_transaccion: data.id_transaccion || null,
        nuevo_estatus: data.nuevo_estatus || 'ejecutada',
      })
    }

    if (action === 'rechazar') {
      const execResult = await db.request()
        .input('id_admin', idAdmin)
        .input('id_solicitud', solicitudId)
        .input('comentario', comentario || null)
        .query('EXEC dbo.sp_rechazar_solicitud @id_admin, @id_solicitud, @comentario')
      const data = execResult.recordset?.[0] || {}
      return NextResponse.json({
        exito: data.exito ?? true,
        id_solicitud: data.id_solicitud || solicitudId,
        nuevo_estatus: data.nuevo_estatus || 'rechazada',
      })
    }

    return NextResponse.json({ detail: 'Accion no valida. Usa: aprobar o rechazar' }, { status: 400 })
  } catch (err: any) {
    console.error('Error POST /api/admin:', err)
    return NextResponse.json({ detail: err.message }, { status: 500 })
  }
}
