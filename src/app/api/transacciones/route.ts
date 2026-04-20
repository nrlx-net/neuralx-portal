import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getUserByUpnOrEmail, isAdminUpn, requireAuth } from '@/lib/auth-helpers'
import { autoProvisionUser } from '@/lib/auto-provision'
import { priorizarProcesoOrdenar, resolveEstatusGrupo } from '@/lib/movimiento-estatus'

const TOP_DEFAULT = 150
const TOP_MAX = 520
const DEFAULT_LIMIT_SIN_FILTRO = 200
const DEFAULT_LIMIT_CON_FILTRO = 100
const ABS_LIMIT_CAP = 200

function pickString(row: Record<string, any>, keys: string[]): string | null {
  for (const key of keys) {
    const value = row[key]
    if (value != null && String(value).trim() !== '') {
      return String(value)
    }
  }
  return null
}

function transactionsRowToTransaccion(row: Record<string, any>) {
  const referenciaSeed = pickString(row, ['referencia_seed', 'reference_seed'])
  const beneficiario = pickString(row, ['beneficiario', 'beneficiary_name', 'beneficiary'])
  const feeUsd = Number(row.fee_usd ?? row.fee ?? 0)
  const montoUsd = Number(row.monto_usd ?? row.amount_usd ?? row.amount ?? row.amount_original ?? 0)
  const totalLiberarUsd = Number(row.total_liberar_usd ?? row.total_release_usd ?? 0)
  const id =
    referenciaSeed ||
    pickString(row, ['id_transaccion', 'transaction_id', 'tx_id', 'id']) ||
    `tx-legacy-${Math.random().toString(36).slice(2, 10)}`
  const origin =
    pickString(row, ['id_cuenta_origen', 'origin_account_id', 'from_account_id', 'origen', 'partner_user_id']) ||
    '—'
  const destination =
    pickString(row, ['id_cuenta_destino', 'destination_account_id', 'to_account_id', 'destino', 'bank_icon']) ||
    null
  const fecha =
    pickString(row, ['fecha_hora', 'created_at', 'createdAt', 'transaction_date', 'timestamp']) ||
    new Date().toISOString()
  const tipo = pickString(row, ['tipo_transaccion', 'transaction_type', 'type']) || 'transferencia_externa'
  const status = pickString(row, ['estatus', 'status']) || ''
  const referencia = referenciaSeed || pickString(row, ['referencia', 'reference'])
  const concepto =
    pickString(row, ['concepto', 'description', 'memo']) ||
    beneficiario ||
    (referenciaSeed ? `Transferencia ${referenciaSeed}` : 'Transferencia')
  const moneda = pickString(row, ['moneda', 'currency']) || (montoUsd > 0 || totalLiberarUsd > 0 ? 'USD' : 'MXN')
  const montoRaw = totalLiberarUsd > 0 ? totalLiberarUsd : montoUsd + (feeUsd > 0 ? feeUsd : 0)

  return {
    id_transaccion: id,
    id_cuenta_origen: origin,
    id_cuenta_destino: destination,
    fecha_hora: fecha,
    monto: Number(montoRaw || 0),
    moneda,
    tipo_transaccion: tipo,
    concepto,
    estatus: status,
    referencia,
  }
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
  const offsetRaw = searchParams.get('offset')
  const limitRaw = searchParams.get('limit')
  const offset = Math.max(0, Math.floor(Number(offsetRaw ?? 0)) || 0)
  const defaultLimit = estatus ? DEFAULT_LIMIT_CON_FILTRO : DEFAULT_LIMIT_SIN_FILTRO
  let limit =
    limitRaw == null || limitRaw === ''
      ? defaultLimit
      : Math.floor(Number(limitRaw)) || defaultLimit
  limit = Math.min(ABS_LIMIT_CAP, Math.max(1, limit))
  const sqlTop = Math.min(TOP_MAX, Math.max(TOP_DEFAULT, offset + limit + 80))

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
      return NextResponse.json({
        transacciones: [],
        total: 0,
        offset,
        limit,
        has_more: false,
      })
    }

    const inOrigen = cuentaIds.map((_: any, i: number) => `@origen${i}`).join(',')
    const inDestino = cuentaIds.map((_: any, i: number) => `@destino${i}`).join(',')

    let query = `
      SELECT TOP ${sqlTop} id_transaccion, id_cuenta_origen, id_cuenta_destino,
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
      const grupo = resolveEstatusGrupo(estatus)
      if (grupo?.length) {
        const ph = grupo.map((_, i) => `@est${i}`).join(', ')
        query += ` AND LOWER(LTRIM(RTRIM(estatus))) IN (${ph})`
        grupo.forEach((v, i) => req.input(`est${i}`, String(v).toLowerCase().trim()))
      } else {
        query += ' AND LOWER(LTRIM(RTRIM(estatus))) = LOWER(LTRIM(RTRIM(@estatus)))'
        req.input('estatus', estatus)
      }
    }

    query += ' ORDER BY fecha_hora DESC'

    const txnResult = await req.query(query)
    const txnRows: Record<string, any>[] = txnResult.recordset || []
    let externalRows: Record<string, any>[] = []
    try {
      const txReq = db.request()
      let txQuery = `SELECT TOP ${sqlTop} * FROM transactions WHERE 1=1`
      if (!admin) {
        txQuery += ' AND CAST(partner_user_id AS NVARCHAR(255)) = @partnerUserId'
        txReq.input('partnerUserId', String(user.id_usuario))
      }
      if (estatus) {
        const grupo = resolveEstatusGrupo(estatus)
        if (grupo?.length) {
          const ph = grupo.map((_, i) => `@txStatus${i}`).join(', ')
          txQuery += ` AND LOWER(LTRIM(RTRIM(CAST(status AS NVARCHAR(60))))) IN (${ph})`
          grupo.forEach((v, i) => txReq.input(`txStatus${i}`, String(v).toLowerCase().trim()))
        } else {
          txQuery += ' AND LOWER(LTRIM(RTRIM(CAST(status AS NVARCHAR(60))))) = LOWER(LTRIM(RTRIM(@txStatus)))'
          txReq.input('txStatus', estatus)
        }
      }
      const txResult = await txReq.query(txQuery)
      externalRows = (txResult.recordset || []).map(transactionsRowToTransaccion)
    } catch {
      externalRows = []
    }

    const txnCombined = [...txnRows, ...externalRows]
    const engineTxnIds = new Set(txnCombined.map((r) => String(r.id_transaccion || '')))

    let solQuery = `
      SELECT TOP ${sqlTop} id_solicitud, tipo, nxg_origen, nxg_destino, id_cuenta_banco, monto,
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
      const grupo = resolveEstatusGrupo(estatus)
      if (grupo?.length) {
        const ph = grupo.map((_, i) => `@sEst${i}`).join(', ')
        solQuery += ` AND LOWER(LTRIM(RTRIM(estatus))) IN (${ph})`
        grupo.forEach((v, i) => solReq.input(`sEst${i}`, String(v).toLowerCase().trim()))
      } else {
        solQuery += ' AND LOWER(LTRIM(RTRIM(estatus))) = LOWER(LTRIM(RTRIM(@sEstatus)))'
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

    const dedupMap = new Map<string, Record<string, any>>()
    for (const row of txnCombined) {
      const id = String(row.id_transaccion || '')
      if (!id) continue
      if (!dedupMap.has(id)) dedupMap.set(id, row)
    }
    const merged = [...Array.from(dedupMap.values()), ...fromSolicitudes].sort((a, b) => {
      const ta = new Date(a.fecha_hora).getTime()
      const tb = new Date(b.fecha_hora).getTime()
      return tb - ta
    })

    const ordered = estatus
      ? (merged as Array<{ estatus: string; fecha_hora: string }>)
      : priorizarProcesoOrdenar(merged as Array<{ estatus: string; fecha_hora: string }>)

    const transacciones = ordered.slice(offset, offset + limit)
    if (transacciones.length === 0) {
      return NextResponse.json({
        transacciones: [],
        total: ordered.length,
        offset,
        limit,
        has_more: false,
      })
    }

    const hitTxnCap = txnRows.length >= sqlTop || externalRows.length >= sqlTop
    const hitSolCap = solRows.length >= sqlTop
    const gotFullPage = transacciones.length === limit
    const has_more =
      offset + transacciones.length < ordered.length || (gotFullPage && (hitTxnCap || hitSolCap))

    return NextResponse.json({
      transacciones,
      total: ordered.length,
      offset,
      limit,
      has_more,
    })
  } catch (err: any) {
    console.error('Error /api/transacciones:', err)
    return NextResponse.json({ detail: err.message }, { status: 500 })
  }
}
