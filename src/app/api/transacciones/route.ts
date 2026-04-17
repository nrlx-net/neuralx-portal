import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getUserByUpnOrEmail, isAdminUpn, requireAuth } from '@/lib/auth-helpers'
import { autoProvisionUser } from '@/lib/auto-provision'

/** Filtros de UI → varios valores en BD (histórico + motor actual). */
const ESTATUS_GRUPO: Record<string, string[]> = {
  ejecutadas: ['ejecutada', 'completada'],
  proceso: ['pendiente', 'en curso'],
  rechazadas: ['rechazada', 'cancelada'],
}

function parseEngineTxIdFromDatosExtra(raw: unknown): string | null {
  if (raw == null || typeof raw !== 'string') return null
  try {
    const o = JSON.parse(raw) as { tx_id?: unknown }
    return o?.tx_id != null && String(o.tx_id).trim() !== '' ? String(o.tx_id) : null
  } catch {
    return null
  }
}

function solicitudRowToTransaccion(row: Record<string, any>) {
  return {
    id_transaccion: String(row.id_solicitud),
    id_cuenta_origen: row.nxg_origen != null ? String(row.nxg_origen) : '—',
    id_cuenta_destino:
      row.nxg_destino != null
        ? String(row.nxg_destino)
        : row.id_cuenta_banco != null
        ? String(row.id_cuenta_banco)
        : null,
    fecha_hora: row.fecha_solicitud,
    monto: Number(row.monto || 0),
    moneda: String(row.moneda || 'MXN'),
    tipo_transaccion: String(row.tipo || 'solicitud'),
    concepto: row.concepto != null ? String(row.concepto) : null,
    estatus: String(row.estatus || ''),
    referencia: row.comentario_admin != null ? String(row.comentario_admin) : null,
  }
}

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
    const cuentasResult = admin
      ? await db.request().query('SELECT nxg_id FROM cuentas_internas')
      : await db.request()
          .input('userId', user.id_usuario)
          .query('SELECT nxg_id FROM cuentas_internas WHERE id_usuario = @userId')

    const cuentaIdSet = new Set<string>(
      cuentasResult.recordset.map((c: any) => String(c.nxg_id || '').trim()).filter(Boolean)
    )

    if (admin) {
      const custodia = await db.request().query(`
        SELECT TOP 1 id_custodia
        FROM dbo.cuenta_custodia
        WHERE id_custodia = N'CUSTODIA-001'
      `)
      if (custodia.recordset[0]) {
        cuentaIdSet.add('NXG-000')
      }
    }

    const cuentaIds = Array.from(cuentaIdSet)
    if (cuentaIds.length === 0) {
      return NextResponse.json({ transacciones: [], total: 0 })
    }

    const inOrigen = cuentaIds.map((_: any, i: number) => `@origen${i}`).join(',')
    const inDestino = cuentaIds.map((_: any, i: number) => `@destino${i}`).join(',')

    let query = `
      SELECT TOP 60 id_transaccion, id_cuenta_origen, id_cuenta_destino,
             fecha_hora, monto, moneda, tipo_transaccion, concepto,
             estatus, referencia
      FROM transacciones
      WHERE (id_cuenta_origen IN (${inOrigen}) OR id_cuenta_destino IN (${inDestino}))
    `

    const req = db.request()
    cuentaIds.forEach((id: string, i: number) => {
      req.input(`origen${i}`, id)
      req.input(`destino${i}`, id)
    })

    if (estatus) {
      const grupo = ESTATUS_GRUPO[estatus]
      if (grupo?.length) {
        const ph = grupo.map((_, i) => `@est${i}`).join(', ')
        query += ` AND estatus IN (${ph})`
        grupo.forEach((v, i) => req.input(`est${i}`, v))
      } else {
        query += ' AND estatus = @estatus'
        req.input('estatus', estatus)
      }
    }

    query += ' ORDER BY fecha_hora DESC'

    const txnResult = await req.query(query)
    const txnRows: Record<string, any>[] = txnResult.recordset || []
    const engineTxnIds = new Set(txnRows.map((r) => String(r.id_transaccion || '')))

    let solQuery = `
      SELECT TOP 60 id_solicitud, tipo, nxg_origen, nxg_destino, id_cuenta_banco, monto,
             moneda, concepto, estatus, comentario_admin, fecha_solicitud, datos_extra
      FROM solicitudes
      WHERE 1=1
    `
    const solReq = db.request()
    if (!admin) {
      solQuery += ' AND id_usuario = @userIdSol'
      solReq.input('userIdSol', user.id_usuario)
    }
    if (estatus) {
      const grupo = ESTATUS_GRUPO[estatus]
      if (grupo?.length) {
        const ph = grupo.map((_, i) => `@sEst${i}`).join(', ')
        solQuery += ` AND estatus IN (${ph})`
        grupo.forEach((v, i) => solReq.input(`sEst${i}`, v))
      } else {
        solQuery += ' AND estatus = @sEstatus'
        solReq.input('sEstatus', estatus)
      }
    }
    solQuery += ' ORDER BY fecha_solicitud DESC'

    const solResult = await solReq.query(solQuery)
    const solRows: Record<string, any>[] = solResult.recordset || []

    const fromSolicitudes = solRows
      .filter((row) => {
        const linked = parseEngineTxIdFromDatosExtra(row.datos_extra)
        if (linked && engineTxnIds.has(linked)) {
          return false
        }
        return true
      })
      .map((row) => solicitudRowToTransaccion(row))

    const merged = [...txnRows, ...fromSolicitudes].sort((a, b) => {
      const ta = new Date(a.fecha_hora).getTime()
      const tb = new Date(b.fecha_hora).getTime()
      return tb - ta
    })

    const transacciones = merged.slice(0, 50)

    return NextResponse.json({
      transacciones,
      total: transacciones.length,
    })
  } catch (err: any) {
    console.error('Error /api/transacciones:', err)
    return NextResponse.json({ detail: err.message }, { status: 500 })
  }
}
