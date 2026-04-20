/**
 * Filtros de UI ↔ valores en BD (histórico + motor).
 * Comparaciones SQL deben usar LOWER(TRIM(...)) para tolerar mayúsculas/espacios.
 */
export const ESTATUS_GRUPO: Record<string, string[]> = {
  ejecutadas: ['ejecutada', 'completada', 'settled', 'completed'],
  proceso: ['pendiente', 'pending', 'en curso', 'en_curso', 'processing', 'in progress', 'in_progress'],
  rechazadas: ['rechazada', 'cancelada', 'rejected', 'failed'],
}

export function resolveEstatusGrupo(estatus: string | null | undefined): string[] | null {
  if (!estatus) return null
  const key = estatus.trim().toLowerCase()
  const grupo = ESTATUS_GRUPO[key]
  return grupo?.length ? grupo : null
}

/** Coincide con badge "En proceso" en movimientos. */
export function isProcesoEstatus(estatus: string | null | undefined): boolean {
  const s = (estatus || '').toLowerCase().replace(/_/g, ' ').trim()
  if (s === 'pendiente') return true
  if (s === 'pending') return true
  if (s === 'en curso') return true
  if (s === 'processing') return true
  if (s === 'in progress') return true
  if (s.includes('curso')) return true
  return false
}

/** Orden global "todos": en proceso primero (por fecha dentro de cada bloque), luego el resto por fecha. */
export function priorizarProcesoOrdenar<T extends { estatus: string; fecha_hora: string }>(rows: T[]): T[] {
  const sorted = [...rows].sort(
    (a, b) => new Date(b.fecha_hora).getTime() - new Date(a.fecha_hora).getTime()
  )
  const enProceso = sorted.filter((r) => isProcesoEstatus(r.estatus))
  const otros = sorted.filter((r) => !isProcesoEstatus(r.estatus))
  return [...enProceso, ...otros]
}

/**
 * Con vista "todos", las filas en proceso no deben quedar fuera del top N solo por volumen de ejecutadas.
 */
export function priorizarProcesoYRecortar<T extends { estatus: string; fecha_hora: string }>(
  rows: T[],
  cap: number
): T[] {
  return priorizarProcesoOrdenar(rows).slice(0, cap)
}
