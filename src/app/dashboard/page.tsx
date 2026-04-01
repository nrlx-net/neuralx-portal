'use client'

import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { api, CuentaBancaria, Transaccion } from '@/lib/api'

function formatMoney(amount: number, currency: string = 'MXN') {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount)
}

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const [cuentas, setCuentas] = useState<CuentaBancaria[]>([])
  const [transacciones, setTransacciones] = useState<Transaccion[]>([])
  const [saldoTotal, setSaldoTotal] = useState(0)
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

      const [cuentasRes, txnRes] = await Promise.all([
        api.getCuentas(),
        api.getTransacciones(),
      ])

      setCuentas(cuentasRes.cuentas)
      setSaldoTotal(cuentasRes.saldo_consolidado)
      setTransacciones(txnRes.transacciones)
    } catch (err: any) {
      console.error('Error loading data:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="text-nrlx-accent font-mono text-sm animate-pulse mb-2">
            Conectando a neuralxbank...
          </div>
          <div className="text-[10px] font-mono text-nrlx-muted">
            neuralxnet.database.windows.net
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl">
      {/* Header */}
      <div className="mb-8 pt-2 lg:pt-0">
        <p className="text-xs font-mono text-nrlx-muted mb-1">
          {new Date().toLocaleDateString('es-MX', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </p>
        <h1 className="text-2xl font-medium text-nrlx-text">
          Bienvenido, {session?.user?.name?.split(' ')[0]}
        </h1>
        <p className="text-[10px] font-mono text-nrlx-muted mt-0.5">
          {session?.user?.upn || session?.user?.email}
        </p>
      </div>

      {/* Error banner */}
      {error && (
        <div className="bg-nrlx-danger/10 border border-nrlx-danger/30 rounded-xl p-4 mb-6">
          <p className="text-xs text-nrlx-danger font-mono">{error}</p>
          <button
            onClick={loadData}
            className="text-[10px] text-nrlx-danger underline mt-1"
          >
            Reintentar
          </button>
        </div>
      )}

      {/* Saldo consolidado */}
      <div className="bg-nrlx-surface border border-nrlx-border rounded-xl p-6 mb-6">
        <p className="text-xs font-mono text-nrlx-muted mb-2 tracking-wider">
          SALDO CONSOLIDADO
        </p>
        <p className="text-3xl font-light text-nrlx-accent font-mono">
          {formatMoney(saldoTotal)}
        </p>
        <p className="text-xs text-nrlx-muted mt-1">
          {cuentas.length} cuenta{cuentas.length !== 1 ? 's' : ''} activa{cuentas.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Cuentas */}
      <div className="mb-6">
        <h2 className="text-xs font-mono text-nrlx-muted mb-3 tracking-wider">
          MIS CUENTAS
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {cuentas.map((cuenta) => (
            <div
              key={cuenta.id_cuenta}
              className="bg-nrlx-surface border border-nrlx-border rounded-xl p-5 hover:border-nrlx-accent/30 transition-colors"
            >
              <div className="flex items-center gap-3 mb-4">
                {cuenta.icono_banco_url && (
                  <img
                    src={cuenta.icono_banco_url}
                    alt={cuenta.banco}
                    className="w-8 h-8 rounded"
                  />
                )}
                <div>
                  <p className="text-sm font-medium text-nrlx-text">
                    {cuenta.banco}
                  </p>
                  <p className="text-[10px] font-mono text-nrlx-muted">
                    {cuenta.id_cuenta} — {cuenta.tipo_cuenta}
                  </p>
                </div>
              </div>
              <p className="text-xl font-mono text-nrlx-text">
                {formatMoney(cuenta.saldo_total, cuenta.moneda)}
              </p>
              {cuenta.numero_cuenta && (
                <p className="text-[10px] font-mono text-nrlx-muted mt-2">
                  {cuenta.numero_cuenta.startsWith('CH') ? 'IBAN' : 'CLABE'}: {cuenta.numero_cuenta}
                </p>
              )}
              {cuenta.swift_code && (
                <p className="text-[10px] font-mono text-nrlx-muted">
                  SWIFT: {cuenta.swift_code}
                </p>
              )}
            </div>
          ))}

          {cuentas.length === 0 && !error && (
            <div className="col-span-2 text-center py-8">
              <p className="text-sm text-nrlx-muted">Sin cuentas registradas</p>
            </div>
          )}
        </div>
      </div>

      {/* Transacciones recientes */}
      <div>
        <h2 className="text-xs font-mono text-nrlx-muted mb-3 tracking-wider">
          MOVIMIENTOS RECIENTES
        </h2>
        <div className="bg-nrlx-surface border border-nrlx-border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-nrlx-border">
                <th className="text-left text-[10px] font-mono text-nrlx-muted px-5 py-3 tracking-wider">
                  FECHA
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
              {transacciones.slice(0, 10).map((txn) => (
                <tr
                  key={txn.id_transaccion}
                  className="border-b border-nrlx-border/50 hover:bg-nrlx-card/50 transition-colors"
                >
                  <td className="px-5 py-3 text-xs font-mono text-nrlx-muted">
                    {new Date(txn.fecha_hora).toLocaleDateString('es-MX')}
                  </td>
                  <td className="px-5 py-3 text-sm text-nrlx-text">
                    {txn.concepto || '—'}
                  </td>
                  <td className="px-5 py-3 text-sm font-mono text-right">
                    <span
                      className={
                        txn.tipo_transaccion === 'saliente'
                          ? 'text-nrlx-danger'
                          : 'text-nrlx-accent'
                      }
                    >
                      {txn.tipo_transaccion === 'saliente' ? '-' : '+'}
                      {formatMoney(txn.monto, txn.moneda)}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
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
              Sin movimientos registrados
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
