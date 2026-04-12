/**
 * NeuralX Portal — API Client
 * Calls local Next.js API routes (which connect to Azure SQL)
 * Auth is handled server-side via NextAuth session.
 */

async function apiFetch<T = any>(endpoint: string, options?: RequestInit): Promise<T> {
  const res = await fetch(endpoint, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || `API error: ${res.status}`)
  }

  return res.json()
}

// ============================================
// TIPOS
// ============================================
export interface UsuarioSocio {
  id_usuario: string
  nombre_completo: string
  puesto: string
  departamento: string
  email: string
  entra_id_upn: string
  estatus: string
  fecha_conexion: string
  created_at?: string
  /** Presente en respuesta de GET /api/me */
  es_admin?: boolean
  /** URL de foto de perfil (portal unificado para todos los socios) */
  foto_perfil?: string
}

export interface CuentaBancaria {
  id_cuenta: string
  banco: string
  numero_cuenta: string | null
  swift_code: string | null
  moneda: string
  saldo_total: number
  saldo_disponible: number
  saldo_retenido?: number
  tipo_cuenta: string
  icono_banco_url: string | null
  titular?: string | null
}

export interface CuentasResponse {
  cuentas: CuentaBancaria[]
  total_cuentas: number
  saldo_consolidado: number
}

export interface Transaccion {
  id_transaccion: string
  id_cuenta_origen: string
  id_cuenta_destino: string | null
  fecha_hora: string
  monto: number
  moneda: string
  tipo_transaccion: string
  concepto: string | null
  estatus: string
  referencia: string | null
}

export interface TransaccionesResponse {
  transacciones: Transaccion[]
  total: number
}

export interface WireTransferOperacion {
  id: string
  fecha_operacion: string
  beneficiario: string
  numero_cuenta: string
  swift_bic: string
  monto_usd: number
  fee_usd: number
  total_liberar_usd: number
  partner_user_id: string
  status: string
  bank_icon?: string | null
  socio_nombre: string
  bank_id?: string | null
  bank_name?: string | null
  icon_url?: string | null
}

export interface WireOperacionesResumen {
  total_transacciones: number
  suma_montos_usd: number
  suma_fees_usd: number
  gran_total_liberar_usd: number
  cnt_pending: number
  cnt_completed: number
  cnt_rejected: number
}

export interface WireOperacionesResponse {
  transferencias: WireTransferOperacion[]
  resumen: WireOperacionesResumen | null
}

export interface Solicitud {
  id_solicitud: string
  tipo: string
  nxg_origen: string | null
  nxg_destino: string | null
  id_cuenta_banco: string | null
  monto: number
  moneda: string
  concepto: string | null
  estatus: string
  comentario_admin: string | null
  aprobado_por: string | null
  fecha_solicitud: string
  fecha_resolucion: string | null
}

export interface SolicitudesResponse {
  solicitudes: Solicitud[]
  total: number
}

export interface Beneficiario {
  id_beneficiario: string
  id_usuario: string
  tipo: string
  nombre: string
  apellidos: string | null
  email: string | null
  pais: string
  divisa: string
  clabe: string | null
  iban: string | null
  swift: string | null
  banco: string | null
  numero_cuenta: string | null
  estatus: string
  created_at: string
}

export interface CuentaBancariaVinculada {
  id_cuenta: string
  id_usuario?: string
  titular?: string | null
  banco: string
  icono_banco_url?: string | null
  clabe?: string | null
  numero_cuenta: string | null
  swift_code: string | null
  pais?: string | null
  moneda: string
  tipo_cuenta: string
}

export interface ProcesoRegulatorio {
  id_proceso: string
  tipo_proceso: string
  estatus: string
  fecha_inicio: string | null
  fecha_actualizacion: string | null
  [key: string]: any
}

export interface Notificacion {
  id_notificacion: number
  titulo: string
  mensaje: string
  tipo: string
  leida: boolean
  link?: string | null
  created_at: string
}

export interface EngineTxPayload {
  origin_ledger_account: string
  destination_ledger_account?: string | null
  amount_original: number
  currency_original: string
  transaction_timestamp?: string | null
  reference?: string | null
  fee_bps?: number
  tax_bps?: number
  spread_bps?: number
  trade_date?: string | null
  settlement_date?: string | null
  original_tx_id?: string | null
}

export interface EngineTxResult {
  tx_id: string
  status: 'SETTLED' | 'FAILED' | 'PENDING_FX' | 'REJECTED'
  timestamp: string
  amount_original: { value: number; currency: string }
  amount_base: { value: number; currency: string }
  fx_rate_applied: number
  fx_rate_source: string | null
  fx_rate_timestamp: string | null
  charges: {
    commission: { value: number; currency: string }
    tax: { value: number; currency: string }
    spread: { value: number; currency: string }
  }
  total_debit: { value: number; currency: string }
  balances_after: {
    origin: { ledger_balance: number; available_balance: number }
    destination: { ledger_balance: number; available_balance: number }
  }
  ledger_entries: Array<{ type: 'DEBIT' | 'CREDIT'; account: string; amount: number }>
  error: null | { code: string; step: number | null; detail: string | null }
}

export interface CredencialOperacionesEmision {
  state: string
  status: 'created' | 'request_retrieved' | 'issuance_successful' | 'issuance_error'
  qrCode?: string | null
  url?: string | null
  expiry?: string | null
  requestId?: string | null
}

export interface CredencialOperacionesEstado {
  state: string
  status: 'created' | 'request_retrieved' | 'issuance_successful' | 'issuance_error'
  requestId?: string | null
  error_code?: string | null
  error_message?: string | null
  updated_at?: string | null
}

export interface TransferRequestPayload {
  flow: 'transfer'
  tipo: 'transferencia_interna' | 'transferencia_externa' | 'retiro_banco'
  nxg_origen?: string
  nxg_destino?: string
  id_cuenta_banco?: string
  beneficiario_id?: string
  moneda: string
  monto: number
  concepto?: string
  referencia?: string
  datos_extra?: Record<string, any>
}

export interface TransferRequestResponse {
  exito: boolean
  id_solicitud: string | null
  monto: number
  moneda: string
  estatus: string
  mensaje: string
}

export interface SolicitudRetiroPayload {
  monto: number
  concepto?: string
  moneda?: string
  nxg_origen?: string
  id_cuenta_banco?: string
}

// API FUNCTIONS — Local routes
export const api = {
  getMe: () =>
    apiFetch<UsuarioSocio>('/api/me'),

  getCuentas: (_token?: string) =>
    apiFetch<CuentasResponse>('/api/cuentas'),

  getTransacciones: (arg1?: string, arg2?: string) => {
    const estatus = arg2 ?? arg1
    return apiFetch<TransaccionesResponse>(
      `/api/transacciones${estatus ? `?estatus=${estatus}` : ''}`
    )
  },

  crearSolicitudRetiro: (
    arg1: string | number | SolicitudRetiroPayload,
    arg2?: number | string,
    arg3?: string
  ) => {
    if (typeof arg1 === 'object' && arg1 !== null) {
      return apiFetch('/api/solicitud-retiro', {
        method: 'POST',
        body: JSON.stringify(arg1),
      })
    }
    const monto = typeof arg1 === 'number' ? arg1 : Number(arg2 ?? 0)
    const concepto = typeof arg1 === 'number' ? (arg2 as string | undefined) : arg3
    return apiFetch('/api/solicitud-retiro', {
      method: 'POST',
      body: JSON.stringify({ monto, concepto, moneda: 'MXN' }),
    })
  },

  crearTransferenciaExterna: (payload: SolicitudRetiroPayload) =>
    apiFetch('/api/solicitud-retiro', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getSolicitudes: (arg1?: string, arg2?: string) => {
    const estatus = arg2 ?? arg1
    return apiFetch<SolicitudesResponse>(
      `/api/solicitudes${estatus ? `?estatus=${estatus}` : ''}`
    )
  },

  getBeneficiarios: (search?: string) =>
    apiFetch<{ beneficiarios: Beneficiario[]; total: number }>(
      `/api/beneficiarios${search ? `?q=${encodeURIComponent(search)}` : ''}`
    ),

  crearBeneficiario: (payload: Partial<Beneficiario>) =>
    apiFetch<{ exito: boolean; beneficiario: Beneficiario }>('/api/beneficiarios', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  eliminarBeneficiario: (id_beneficiario: string) =>
    apiFetch<{ exito: boolean; id_beneficiario: string }>(`/api/beneficiarios?id_beneficiario=${encodeURIComponent(id_beneficiario)}`, {
      method: 'DELETE',
    }),

  getCuentasBancariasVinculadas: (includeInvalid = false) =>
    apiFetch<{ cuentas: CuentaBancariaVinculada[]; total: number; filtered_invalid?: boolean }>(
      `/api/cuentas-bancarias${includeInvalid ? '?include_invalid=1' : ''}`
    ),

  crearTransferencia: (payload: TransferRequestPayload) =>
    apiFetch<TransferRequestResponse>('/api/solicitud-retiro', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  txProcess: (payload: EngineTxPayload) =>
    apiFetch<EngineTxResult>('/api/tx/process', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  txReverse: (original_tx_id: string, reference?: string) =>
    apiFetch<EngineTxResult>('/api/tx/reverse', {
      method: 'POST',
      body: JSON.stringify({ original_tx_id, reference }),
    }),

  emitirCredencialOperaciones: () =>
    apiFetch<CredencialOperacionesEmision>('/api/verifiedid/issuance/request', {
      method: 'POST',
      body: JSON.stringify({}),
    }),

  estadoCredencialOperaciones: (state: string) =>
    apiFetch<CredencialOperacionesEstado>(
      `/api/verifiedid/issuance/status/${encodeURIComponent(state)}`
    ),

  getRegulatorios: (estatus?: string) =>
    apiFetch<{ procesos: ProcesoRegulatorio[]; total: number }>(
      `/api/regulatorios${estatus ? `?estatus=${encodeURIComponent(estatus)}` : ''}`
    ),

  getNotificaciones: () =>
    apiFetch<{ notificaciones: Notificacion[]; no_leidas: number }>('/api/notificaciones'),

  marcarNotificacionLeida: (id_notificacion: number) =>
    apiFetch<{ exito: boolean }>('/api/notificaciones', {
      method: 'PATCH',
      body: JSON.stringify({ id_notificacion }),
    }),

  getOperacionesWire: () => apiFetch<WireOperacionesResponse>('/api/operaciones-wire'),

  // Admin
  adminResumen: () =>
    apiFetch('/api/admin?view=resumen'),

  adminGetUsuarios: (_token?: string) =>
    apiFetch('/api/admin?view=usuarios'),

  adminGetCuentas: (_token?: string) =>
    apiFetch('/api/admin?view=cuentas'),

  /** Lista en crudo desde v_solicitudes_pendientes (solo admin). */
  adminGetSolicitudes: (_token?: string) =>
    apiFetch<Record<string, unknown>[]>('/api/admin?view=solicitudes'),

  adminGetCustodia: () =>
    apiFetch('/api/admin?view=custodia'),

  adminAprobar: (id_solicitud: string, comentario?: string) =>
    apiFetch('/api/admin', {
      method: 'POST',
      body: JSON.stringify({
        action: 'aprobar',
        id_solicitud,
        ...(comentario?.trim() ? { comentario: comentario.trim() } : {}),
      }),
    }),

  adminRechazar: (id_solicitud: string, comentario?: string) =>
    apiFetch('/api/admin', {
      method: 'POST',
      body: JSON.stringify({
        action: 'rechazar',
        id_solicitud,
        comentario: comentario?.trim() || null,
      }),
    }),
}
