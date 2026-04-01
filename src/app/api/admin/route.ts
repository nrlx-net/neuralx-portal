import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { requireAdmin } from '@/lib/auth-helpers'

export async function GET(request: Request) {
  const { error } = await requireAdmin()
  if (error) return error

  const { searchParams } = new URL(request.url)
  const view = searchParams.get('view') || 'resumen'

  try {
    const db = await getDb()

    if (view === 'usuarios') {
      const result = await db.request().query('SELECT * FROM v_resumen_usuario')
      return NextResponse.json(result.recordset)
    }

    if (view === 'cuentas') {
      const result = await db.request().query('SELECT * FROM v_cuentas_detalle')
      return NextResponse.json(result.recordset)
    }

    if (view === 'solicitudes') {
      const result = await db.request().query(`
        SELECT t.*, u.nombre_completo, u.entra_id_upn
        FROM transacciones t
        JOIN cuentas_bancarias c ON t.id_cuenta_origen = c.id_cuenta
        JOIN usuarios_socios u ON c.id_usuario = u.id_usuario
        WHERE t.estatus = N'en curso' AND t.tipo_transaccion = N'saliente'
        ORDER BY t.fecha_hora DESC
      `)
      return NextResponse.json(result.recordset)
    }

    if (view === 'custodia') {
      const result = await db.request().query('SELECT * FROM v_custodia_distribucion')
      return NextResponse.json(result.recordset)
    }

    const [usuarios, custodia] = await Promise.all([
      db.request().query('SELECT * FROM v_resumen_usuario'),
      db.request().query(`
        SELECT FORMAT(saldo_total, 'N2') AS total,
               FORMAT(saldo_asignado, 'N2') AS asignado,
               FORMAT(saldo_disponible, 'N2') AS disponible
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
    const { action, id_transaccion } = body

    if (!action || !id_transaccion) {
      return NextResponse.json({ detail: 'Faltan action e id_transaccion' }, { status: 400 })
    }

    const db = await getDb()

    if (action === 'aprobar') {
      await db.request()
        .input('id', id_transaccion)
        .query("UPDATE transacciones SET estatus = N'completada' WHERE id_transaccion = @id")

      await db.request()
        .input('upn', upn)
        .input('id', id_transaccion)
        .query(`
          INSERT INTO audit_log (id_usuario, accion, tabla_afectada, registro_id, detalle)
          VALUES (@upn, N'APROBAR_RETIRO', N'transacciones', @id, N'Aprobado por admin')
        `)

      return NextResponse.json({ exito: true, id_transaccion, nuevo_estatus: 'completada' })
    }

    if (action === 'rechazar') {
      await db.request()
        .input('id', id_transaccion)
        .query("UPDATE transacciones SET estatus = N'cancelada' WHERE id_transaccion = @id")

      return NextResponse.json({ exito: true, id_transaccion, nuevo_estatus: 'cancelada' })
    }

    return NextResponse.json({ detail: 'Accion no valida. Usa: aprobar o rechazar' }, { status: 400 })
  } catch (err: any) {
    console.error('Error POST /api/admin:', err)
    return NextResponse.json({ detail: err.message }, { status: 500 })
  }
}
