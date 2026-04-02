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
}

export interface CuentaBancaria {
  id_cuenta: string
  banco: string
  numero_cuenta: string | null
  swift_code: string | null
  moneda: string
  saldo_total: number
  saldo_disponible: number
  tipo_cuenta: string
  icono_banco_url: string | null
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

  crearSolicitudRetiro: (arg1: string | number, arg2?: number | string, arg3?: string) => {
    const monto = typeof arg1 === 'number' ? arg1 : Number(arg2 ?? 0)
    const concepto = typeof arg1 === 'number' ? arg2 as string | undefined : arg3
    return apiFetch('/api/solicitud-retiro', {
      method: 'POST',
      body: JSON.stringify({ monto, concepto }),
    })
  },

  getSolicitudes: (arg1?: string, arg2?: string) => {
    const estatus = arg2 ?? arg1
    return apiFetch<SolicitudesResponse>(
      `/api/solicitudes${estatus ? `?estatus=${estatus}` : ''}`
    )
  },

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
