import type { Transaccion } from '@/lib/api'

export type MovementSign = 'debit' | 'credit' | 'neutral'

/** Salida / entrada respecto a las cuentas NXG del usuario autenticado. */
export function movementSignForUser(txn: Transaccion, myNxgIds: Set<string> | string[]): MovementSign {
  const set = myNxgIds instanceof Set ? myNxgIds : new Set(myNxgIds)
  const origen = txn.id_cuenta_origen
  const destino = txn.id_cuenta_destino
  const soyOrigen = set.has(origen)
  const soyDestino = destino ? set.has(destino) : false
  if (soyOrigen && !soyDestino) return 'debit'
  if (soyDestino && !soyOrigen) return 'credit'
  if (soyOrigen && soyDestino) return 'neutral'
  if (txn.tipo_transaccion === 'saliente') return 'debit'
  return 'credit'
}

export function labelTipoTransaccion(tipo: string | null | undefined) {
  const t = (tipo || '').toLowerCase()
  if (t === 'transferencia_interna') return 'Transferencia interna NXG'
  if (t === 'transferencia_externa' || t === 'saliente') return 'Salida / externa'
  if (t === 'entrante') return 'Entrante'
  return tipo || 'Movimiento'
}

export function labelEstatusMovimiento(estatus: string | null | undefined) {
  const s = (estatus || '').toLowerCase().trim()
  if (s === 'ejecutada' || s === 'completada') return 'Ejecutada'
  if (s === 'pendiente' || s === 'pending') return 'Pendiente'
  if (s === 'en curso' || s === 'en_curso') return 'En curso'
  if (s === 'rechazada' || s === 'cancelada') return s === 'cancelada' ? 'Cancelada' : 'Rechazada'
  return estatus || '—'
}
