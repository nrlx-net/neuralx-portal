'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { Sidebar } from '../components/Sidebar'
import { api, CuentaBancaria } from '@/lib/api'
import { formatearMoneda } from '@/lib/balance'

export default function CuentasPage() {
  const { data: session, status } = useSession()
  const [cuentas, setCuentas] = useState<CuentaBancaria[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'authenticated') {
      loadData()
    }
  }, [status])

  async function loadData() {
    try {
      setLoading(true)
      setError(null)
      const res = await api.getCuentas()
      setCuentas(res.cuentas)
    } catch (err: any) {
      setError(err.message || 'No se pudieron cargar las cuentas')
    } finally {
      setLoading(false)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-nrlx-bg">
        <Sidebar />
        <main className="lg:ml-64 min-h-screen pt-16 lg:pt-0 flex items-center justify-center">
          <div className="text-nrlx-muted font-mono text-sm animate-pulse">Cargando cuentas...</div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-nrlx-bg">
      <Sidebar />
      <main className="lg:ml-64 min-h-screen pt-16 lg:pt-0 pb-20 lg:pb-0">
        <div className="p-6 lg:p-8 max-w-5xl">
          <div className="mb-8 pt-2 lg:pt-0">
            <h1 className="text-2xl font-medium text-nrlx-text">Cuentas internas</h1>
            <p className="text-xs text-nrlx-muted mt-1">
              {cuentas.length} cuenta{cuentas.length !== 1 ? 's' : ''} registrada{cuentas.length !== 1 ? 's' : ''}
            </p>
          </div>

          {error && (
            <div className="bg-nrlx-danger/10 border border-nrlx-danger/30 rounded-xl p-4 mb-6">
              <p className="text-xs text-nrlx-danger font-mono">{error}</p>
              <button onClick={loadData} className="text-[10px] text-nrlx-danger underline mt-1">
                Reintentar
              </button>
            </div>
          )}

          <div className="space-y-4">
            {cuentas.map((cuenta) => (
              <div
                key={cuenta.id_cuenta}
                className="bg-nrlx-surface border border-nrlx-border rounded-xl p-6 hover:border-nrlx-accent/20 transition-colors"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    {cuenta.icono_banco_url && (
                      <img
                        src={cuenta.icono_banco_url}
                        alt={cuenta.banco}
                        className="w-10 h-10 rounded-lg"
                      />
                    )}
                    <div>
                      <p className="text-sm font-medium text-nrlx-text">
                        {cuenta.banco}
                      </p>
                      <p className="text-xs text-nrlx-muted">{session?.user?.name || session?.user?.upn}</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-nrlx-accent/10 text-nrlx-accent">
                    {cuenta.tipo_cuenta}
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-[10px] font-mono text-nrlx-muted tracking-wider mb-1">
                      SALDO TOTAL
                    </p>
                    <p className="text-lg font-mono text-nrlx-text">
                      {formatearMoneda(cuenta.saldo_total, cuenta.moneda)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-mono text-nrlx-muted tracking-wider mb-1">
                      DISPONIBLE
                    </p>
                    <p className="text-lg font-mono text-nrlx-accent">
                      {formatearMoneda(cuenta.saldo_disponible, cuenta.moneda)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-mono text-nrlx-muted tracking-wider mb-1">
                      CUENTA
                    </p>
                    <p className="text-xs font-mono text-nrlx-text">
                      {cuenta.numero_cuenta || '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-mono text-nrlx-muted tracking-wider mb-1">
                      SWIFT
                    </p>
                    <p className="text-xs font-mono text-nrlx-text">
                      {cuenta.swift_code || '—'}
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-nrlx-border/50">
                  <p className="text-[10px] font-mono text-nrlx-muted">
                    ID: {cuenta.id_cuenta} — {cuenta.moneda}
                  </p>
                </div>
              </div>
            ))}

            {cuentas.length === 0 && !error && (
              <div className="bg-nrlx-surface border border-nrlx-border rounded-xl p-10 text-center">
                <p className="text-sm text-nrlx-muted">No tienes cuentas registradas actualmente.</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
