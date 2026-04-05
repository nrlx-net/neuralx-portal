'use client'

import { useEffect, useState } from 'react'
import { Sidebar } from '../components/Sidebar'
import { useSession } from 'next-auth/react'
import { api, Transaccion } from '@/lib/api'
import { formatearMoneda } from '@/lib/balance'

export default function MovimientosPage() {
  const { data: session, status } = useSession()
  const [filter, setFilter] = useState('todos')
  const [transacciones, setTransacciones] = useState<Transaccion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'authenticated') {
      loadData(filter)
    }
  }, [status, filter])

  async function loadData(currentFilter: string) {
    try {
      setLoading(true)
      setError(null)
      const res = await api.getTransacciones(
        currentFilter === 'todos' ? undefined : currentFilter
      )
      setTransacciones(res.transacciones)
    } catch (err: any) {
      setError(err.message || 'No se pudieron cargar los movimientos')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-nrlx-bg">
      <Sidebar />
      <main className="lg:ml-64 min-h-screen pt-16 lg:pt-0 pb-20 lg:pb-0">
        <div className="p-6 lg:p-8 max-w-5xl">
          <div className="flex items-end justify-between mb-8 pt-2 lg:pt-0">
            <div>
              <h1 className="text-2xl font-medium text-nrlx-text">Movimientos</h1>
              <p className="text-xs text-nrlx-muted mt-1">
                Historial de transacciones
              </p>
            </div>

            <div className="flex gap-2">
              {['todos', 'en curso', 'completada', 'cancelada'].map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`text-[10px] font-mono px-3 py-1.5 rounded-lg border transition-colors ${
                    filter === f
                      ? 'border-nrlx-accent/40 bg-nrlx-accent/10 text-nrlx-accent'
                      : 'border-nrlx-border text-nrlx-muted hover:text-nrlx-text'
                  }`}
                >
                  {f.toUpperCase()}
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
                onClick={() => loadData(filter)}
                className="text-[10px] text-nrlx-danger underline mt-1"
              >
                Reintentar
              </button>
            </div>
          ) : (
          <div className="bg-nrlx-surface border border-nrlx-border rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-nrlx-border">
                  <th className="text-left text-[10px] font-mono text-nrlx-muted px-5 py-3 tracking-wider">
                    ID
                  </th>
                  <th className="text-left text-[10px] font-mono text-nrlx-muted px-5 py-3 tracking-wider">
                    FECHA
                  </th>
                  <th className="text-left text-[10px] font-mono text-nrlx-muted px-5 py-3 tracking-wider">
                    CUENTA
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
                {transacciones.map((txn) => (
                  <tr
                    key={txn.id_transaccion}
                    className="border-b border-nrlx-border/50 hover:bg-nrlx-card/50 transition-colors"
                  >
                    <td className="px-5 py-4 text-[10px] font-mono text-nrlx-muted">
                      {txn.id_transaccion}
                    </td>
                    <td className="px-5 py-4 text-xs font-mono text-nrlx-muted">
                      {new Date(txn.fecha_hora).toLocaleDateString('es-MX')}
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-xs text-nrlx-text">{txn.id_cuenta_origen}</p>
                      <p className="text-[10px] font-mono text-nrlx-muted">
                        {txn.id_cuenta_destino || 'Sin destino'}
                      </p>
                    </td>
                    <td className="px-5 py-4 text-sm text-nrlx-text">
                      {txn.concepto || '—'}
                    </td>
                    <td className="px-5 py-4 text-sm font-mono text-right">
                      <span
                        className={
                          txn.tipo_transaccion === 'saliente'
                            ? 'text-nrlx-danger'
                            : 'text-nrlx-accent'
                        }
                      >
                        {txn.tipo_transaccion === 'saliente' ? '-' : '+'}
                        {formatearMoneda(txn.monto, txn.moneda)}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                          txn.estatus === 'completada'
                            ? 'bg-nrlx-accent/10 text-nrlx-accent'
                            : txn.estatus === 'en curso'
                            ? 'bg-nrlx-warning/10 text-nrlx-warning'
                            : 'bg-nrlx-danger/10 text-nrlx-danger'
                        }`}
                      >
                        {txn.estatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {transacciones.length === 0 && (
              <div className="px-5 py-12 text-center text-sm text-nrlx-muted">
                No hay movimientos con este filtro
              </div>
            )}
          </div>
          )}
        </div>
      </main>
    </div>
  )
}
