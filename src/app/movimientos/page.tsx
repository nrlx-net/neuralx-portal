'use client'

import { useEffect, useState } from 'react'
import { Sidebar } from '../components/Sidebar'
import { useSession } from 'next-auth/react'
import { api, Transaccion } from '@/lib/api'
import { formatearMoneda } from '@/lib/balance'
import { labelEstatusMovimiento, labelTipoTransaccion, movementSignForUser } from '@/lib/movement-display'
import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight } from 'lucide-react'

type FiltroEstatus = 'todos' | 'ejecutadas' | 'proceso' | 'rechazadas'

const FILTROS: Array<{ key: FiltroEstatus; label: string }> = [
  { key: 'todos', label: 'Todos' },
  { key: 'ejecutadas', label: 'Ejecutadas' },
  { key: 'proceso', label: 'En proceso' },
  { key: 'rechazadas', label: 'Rechazadas / canceladas' },
]

/** Tamaño de página en movimientos (paginación vía `api.getTransacciones`). */
const MOV_PAGE = 40

export default function MovimientosPage() {
  const { status, data: session } = useSession()
  const sessionUserKey =
    session?.user?.email || session?.user?.name || (session?.user as { id?: string } | undefined)?.id || ''
  const [filter, setFilter] = useState<FiltroEstatus>('todos')
  const [transacciones, setTransacciones] = useState<Transaccion[]>([])
  const [myNxgIds, setMyNxgIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [nextOffset, setNextOffset] = useState(0)
  const [windowTotal, setWindowTotal] = useState(0)

  useEffect(() => {
    if (status === 'authenticated' && sessionUserKey) {
      void loadData(filter)
    }
  }, [status, filter, sessionUserKey])

  async function loadData(currentFilter: FiltroEstatus) {
    try {
      setLoading(true)
      setError(null)
      const estatusParam = currentFilter === 'todos' ? undefined : currentFilter
      const [cuentasRes, res] = await Promise.all([
        api.getCuentas(),
        api.getTransacciones({
          estatus: estatusParam,
          offset: 0,
          limit: MOV_PAGE,
        }),
      ])
      setMyNxgIds(new Set(cuentasRes.cuentas.map((c) => c.id_cuenta)))
      setTransacciones(res.transacciones)
      setNextOffset((res.offset ?? 0) + res.transacciones.length)
      setHasMore(Boolean(res.has_more))
      setWindowTotal(typeof res.total === 'number' ? res.total : res.transacciones.length)
    } catch (err: any) {
      setError(err.message || 'No se pudieron cargar los movimientos')
    } finally {
      setLoading(false)
    }
  }

  async function loadMore() {
    try {
      setLoadingMore(true)
      setError(null)
      const estatusParam = filter === 'todos' ? undefined : filter
      const res = await api.getTransacciones({
        estatus: estatusParam,
        offset: nextOffset,
        limit: MOV_PAGE,
      })
      setTransacciones((prev) => [...prev, ...res.transacciones])
      setNextOffset((res.offset ?? nextOffset) + res.transacciones.length)
      setHasMore(Boolean(res.has_more))
      if (typeof res.total === 'number') setWindowTotal(res.total)
    } catch (err: any) {
      setError(err.message || 'No se pudieron cargar más movimientos')
    } finally {
      setLoadingMore(false)
    }
  }

  return (
    <div className="min-h-screen bg-nrlx-bg">
      <Sidebar />
      <main className="lg:ml-64 min-h-screen pt-16 lg:pt-0 pb-20 lg:pb-0">
        <div className="p-6 lg:p-8 max-w-5xl">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8 pt-2 lg:pt-0">
            <div>
              <h1 className="text-2xl font-medium text-nrlx-text">Movimientos</h1>
              <p className="text-xs text-nrlx-muted mt-1">
                Historial de movimientos en tus cuentas NXG (signo respecto a tu posición: salida o entrada).
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {FILTROS.map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFilter(key)}
                  className={`text-[10px] font-mono px-3 py-1.5 rounded-lg border transition-colors ${
                    filter === key
                      ? 'border-nrlx-accent/40 bg-nrlx-accent/10 text-nrlx-accent'
                      : 'border-nrlx-border text-nrlx-muted hover:text-nrlx-text'
                  }`}
                >
                  {label.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {status === 'loading' || loading ? (
            <div className="bg-nrlx-surface border border-nrlx-border rounded-xl p-10 text-center">
              <p className="text-sm text-nrlx-muted font-mono">Cargando movimientos...</p>
            </div>
          ) : error ? (
            <div className="bg-nrlx-danger/10 border border-nrlx-danger/30 rounded-xl p-4 mb-6">
              <p className="text-xs text-nrlx-danger font-mono">{error}</p>
              <button
                type="button"
                onClick={() => loadData(filter)}
                className="text-[10px] text-nrlx-danger underline mt-1"
              >
                Reintentar
              </button>
            </div>
          ) : (
            <div className="bg-nrlx-surface border border-nrlx-border rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px]">
                  <thead>
                    <tr className="border-b border-nrlx-border">
                      <th className="text-left text-[10px] font-mono text-nrlx-muted px-5 py-3 tracking-wider">
                        ID
                      </th>
                      <th className="text-left text-[10px] font-mono text-nrlx-muted px-5 py-3 tracking-wider">
                        FECHA
                      </th>
                      <th className="text-left text-[10px] font-mono text-nrlx-muted px-5 py-3 tracking-wider">
                        TIPO
                      </th>
                      <th className="text-left text-[10px] font-mono text-nrlx-muted px-5 py-3 tracking-wider">
                        CUENTAS
                      </th>
                      <th className="text-left text-[10px] font-mono text-nrlx-muted px-5 py-3 tracking-wider">
                        CONCEPTO
                      </th>
                      <th className="text-right text-[10px] font-mono text-nrlx-muted px-5 py-3 tracking-wider">
                        MONTO
                      </th>
                      <th className="text-right text-[10px] font-mono text-nrlx-muted px-5 py-3 tracking-wider">
                        ESTATUS
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {transacciones.map((txn) => {
                      const sign = movementSignForUser(txn, myNxgIds)
                      const isOut = sign === 'debit'
                      const isNeutral = sign === 'neutral'
                      return (
                        <tr
                          key={txn.id_transaccion}
                          className="border-b border-nrlx-border/50 hover:bg-nrlx-card/50 transition-colors"
                        >
                          <td className="px-5 py-4 text-[10px] font-mono text-nrlx-muted">
                            {txn.id_transaccion}
                          </td>
                          <td className="px-5 py-4 text-xs font-mono text-nrlx-muted">
                            {new Date(txn.fecha_hora).toLocaleString('es-MX')}
                          </td>
                          <td className="px-5 py-4 text-[10px] text-nrlx-muted max-w-[140px]">
                            {labelTipoTransaccion(txn.tipo_transaccion)}
                          </td>
                          <td className="px-5 py-4">
                            <p className="text-xs text-nrlx-text">{txn.id_cuenta_origen}</p>
                            <p className="text-[10px] font-mono text-nrlx-muted">
                              → {txn.id_cuenta_destino || '—'}
                            </p>
                          </td>
                          <td className="px-5 py-4 text-sm text-nrlx-text max-w-[200px] truncate">
                            {txn.concepto || '—'}
                          </td>
                          <td className="px-5 py-4 text-sm font-mono text-right whitespace-nowrap">
                            <span className="inline-flex items-center gap-1 justify-end">
                              {isNeutral ? (
                                <ArrowLeftRight size={12} className="text-nrlx-muted shrink-0" />
                              ) : isOut ? (
                                <ArrowUpRight size={12} className="text-nrlx-danger shrink-0" />
                              ) : (
                                <ArrowDownLeft size={12} className="text-nrlx-success shrink-0" />
                              )}
                              <span
                                className={
                                  isNeutral
                                    ? 'text-nrlx-muted'
                                    : isOut
                                    ? 'text-nrlx-danger'
                                    : 'text-nrlx-accent'
                                }
                              >
                                {isNeutral ? '' : isOut ? '-' : '+'}
                                {formatearMoneda(txn.monto, txn.moneda)}
                              </span>
                            </span>
                          </td>
                          <td className="px-5 py-4 text-right">
                            <span
                              className={`text-[10px] font-mono px-2 py-0.5 rounded-full inline-block ${
                                ['ejecutada', 'completada'].includes((txn.estatus || '').toLowerCase())
                                  ? 'bg-nrlx-accent/10 text-nrlx-accent'
                                  : ['pendiente', 'en curso'].includes((txn.estatus || '').toLowerCase()) ||
                                    (txn.estatus || '').toLowerCase().includes('curso')
                                  ? 'bg-nrlx-warning/10 text-nrlx-warning'
                                  : 'bg-nrlx-danger/10 text-nrlx-danger'
                              }`}
                            >
                              {labelEstatusMovimiento(txn.estatus)}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {transacciones.length === 0 && (
                <div className="px-5 py-12 text-center text-sm text-nrlx-muted">
                  No hay movimientos con este filtro.
                </div>
              )}

              {transacciones.length > 0 && (
                <div className="px-5 py-4 border-t border-nrlx-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <p className="text-[10px] font-mono text-nrlx-muted">
                    {hasMore
                      ? `${transacciones.length} movimiento${transacciones.length !== 1 ? 's' : ''} cargados; hay más disponibles.`
                      : `${transacciones.length} movimiento${transacciones.length !== 1 ? 's' : ''} en esta vista${
                          windowTotal > 0 && windowTotal !== transacciones.length
                            ? ` (${windowTotal} en la ventana ordenada)`
                            : ''
                        }.`}
                  </p>
                  {hasMore && (
                    <button
                      type="button"
                      onClick={() => void loadMore()}
                      disabled={loadingMore}
                      className="text-[10px] font-mono px-4 py-2 rounded-lg border border-nrlx-border bg-nrlx-el text-nrlx-text hover:border-nrlx-accent/40 disabled:opacity-50"
                    >
                      {loadingMore ? 'Cargando…' : 'Cargar más'}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
