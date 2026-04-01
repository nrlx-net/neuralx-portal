const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export async function apiFetch<T = any>(
  endpoint: string,
  token: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
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

// ============================================
// API FUNCTIONS
// ============================================
export const api = {
  getMe: (token: string) =>
    apiFetch<UsuarioSocio>('/api/me', token),

  getCuentas: (token: string) =>
    apiFetch<CuentasResponse>('/api/cuentas', token),

  getTransacciones: (token: string, estatus?: string) =>
    apiFetch<TransaccionesResponse>(
      `/api/transacciones${estatus ? `?estatus=${estatus}` : ''}`,
      token
    ),

  crearSolicitudRetiro: (token: string, monto: number, concepto?: string) =>
    apiFetch('/api/solicitud-retiro', token, {
      method: 'POST',
      body: JSON.stringify({ monto, concepto }),
    }),

  // Admin
  adminGetUsuarios: (token: string) =>
    apiFetch('/api/admin/usuarios', token),

  adminGetCuentas: (token: string) =>
    apiFetch('/api/admin/cuentas', token),

  adminGetSolicitudes: (token: string) =>
    apiFetch('/api/admin/solicitudes-pendientes', token),

  adminAprobar: (token: string, id: string) =>
    apiFetch(`/api/admin/aprobar/${id}`, token, { method: 'POST' }),

  adminRechazar: (token: string, id: string) =>
    apiFetch(`/api/admin/rechazar/${id}`, token, { method: 'POST' }),
}
