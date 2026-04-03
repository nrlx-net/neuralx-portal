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

export interface TransferRequestPayload {
  flow: 'transfer'
  tipo: 'transferencia_interna' | 'transferencia_externa' | 'retiro_banco'
  nxg_destino?: string
  id_cuenta_banco?: string
  beneficiario_id?: string
  moneda: string
  monto: number
  concepto?: string
  referencia?: string
  datos_extra?: Record<string, any>
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

  getCuentasBancariasVinculadas: () =>
    apiFetch<{ cuentas: CuentaBancariaVinculada[]; total: number }>('/api/cuentas-bancarias'),

  crearTransferencia: (payload: TransferRequestPayload) =>
    apiFetch('/api/solicitud-retiro', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getRegulatorios: (estatus?: string) =>
    apiFetch<{ procesos: ProcesoRegulatorio[]; total: number }>(
      `/api/regulatorios${estatus ? `?estatus=${encodeURIComponent(estatus)}` : ''}`
    ),

  // Admin
  adminResumen: () =>
    apiFetch('/api/admin?view=resumen'),

  adminGetUsuarios: (_token?: string) =>
    apiFetch('/api/admin?view=usuarios'),

  adminGetCuentas: (_token?: string) =>
    apiFetch('/api/admin?view=cuentas'),

  adminGetSolicitudes: (_token?: string) =>
    apiFetch('/api/admin?view=solicitudes'),

  adminGetCustodia: () =>
    apiFetch('/api/admin?view=custodia'),

  adminAprobar: (arg1: string, arg2?: string) => {
    const id = arg2 ?? arg1
    return apiFetch('/api/admin', {
      method: 'POST',
      body: JSON.stringify({ action: 'aprobar', id_solicitud: id }),
    })
  },

  adminRechazar: (arg1: string, arg2?: string) => {
    const id = arg2 ?? arg1
    return apiFetch('/api/admin', {
      method: 'POST',
      body: JSON.stringify({ action: 'rechazar', id_solicitud: id }),
    })
  },
}
