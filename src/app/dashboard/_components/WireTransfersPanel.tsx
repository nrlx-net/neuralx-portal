'use client'

import { useCallback, useEffect, useState } from 'react'
import { api, WireOperacionesResumen, WireTransferOperacion } from '@/lib/api'
import { formatearMoneda } from '@/lib/balance'
import { BankIcon } from '@/app/components/BankIcon'
import { StatusBadge } from '@/app/components/StatusBadge'
import { Landmark, RefreshCw } from 'lucide-react'

function formatFecha(isoOrDate: string) {
  const s = (isoOrDate || '').slice(0, 10)
  if (!s) return '—'
  const d = new Date(s + 'T12:00:00')
  if (Number.isNaN(d.getTime())) return s
  return d.toLocaleDateString('es-MX')
}

interface WireTransfersPanelProps {
  esAdmin: boolean
}

export function WireTransfersPanel({ esAdmin }: WireTransfersPanelProps) {
  const [rows, setRows] = useState<WireTransferOperacion[]>([])
  const [resumen, setResumen] = useState<WireOperacionesResumen | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await api.getOperacionesWire()
      setRows(data.transferencias || [])
      setResumen(esAdmin ? data.resumen : null)
    } catch (e: any) {
      setError(e.message || 'No se pudieron cargar las transferencias')
      setRows([])
      setResumen(null)
    } finally {
      setLoading(false)
    }
  }, [esAdmin])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <section className="rounded-2xl border border-nrlx-border bg-nrlx-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <Landmark size={16} className="text-nrlx-accent" />
          <p className="text-[11px] font-mono text-nrlx-muted tracking-wide">
            TRANSFERENCIAS BANCARIAS (USD) {esAdmin ? '· VISTA GLOBAL' : '· TU CARTERA'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="h-8 px-2 rounded-lg border border-nrlx-border bg-nrlx-el text-[10px] text-nrlx-muted inline-flex items-center gap-1.5"
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          Actualizar
        </button>
      </div>

      {error && (
        <p className="text-xs text-nrlx-danger mb-3 rounded-lg border border-nrlx-danger/30 bg-nrlx-danger/10 px-2 py-1.5">
          {error}
        </p>
      )}

      {esAdmin && resumen && !error && (
        <div className="mb-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="rounded-xl border border-nrlx-border bg-nrlx-el px-3 py-2">
            <p className="text-[9px] font-mono text-nrlx-muted">Total transacciones</p>
            <p className="text-lg font-mono text-nrlx-text">{resumen.total_transacciones}</p>
          </div>
          <div className="rounded-xl border border-nrlx-border bg-nrlx-el px-3 py-2">
            <p className="text-[9px] font-mono text-nrlx-muted">Suma montos (USD)</p>
            <p className="text-sm font-mono text-nrlx-text">{formatearMoneda(resumen.suma_montos_usd, 'USD')}</p>
          </div>
          <div className="rounded-xl border border-nrlx-border bg-nrlx-el px-3 py-2">
            <p className="text-[9px] font-mono text-nrlx-muted">Suma fees (USD)</p>
            <p className="text-sm font-mono text-nrlx-text">{formatearMoneda(resumen.suma_fees_usd, 'USD')}</p>
          </div>
          <div className="rounded-xl border border-nrlx-accent/30 bg-nrlx-accent/10 px-3 py-2">
            <p className="text-[9px] font-mono text-nrlx-muted">Gran total a liberar</p>
            <p className="text-sm font-mono text-nrlx-accent">
              {formatearMoneda(resumen.gran_total_liberar_usd, 'USD')}
            </p>
          </div>
          <div className="col-span-2 sm:col-span-4 flex flex-wrap gap-2 text-[10px] text-nrlx-muted">
            <span>Pendientes: {resumen.cnt_pending}</span>
            <span>Completados: {resumen.cnt_completed}</span>
            <span>Rechazados: {resumen.cnt_rejected}</span>
          </div>
        </div>
      )}

      {loading && !rows.length && !error ? (
        <p className="text-xs text-nrlx-muted py-6 text-center">Cargando operaciones…</p>
      ) : rows.length === 0 && !error ? (
        <p className="text-xs text-nrlx-muted py-4 text-center">
          No hay transferencias wire registradas{esAdmin ? '' : ' para tu perfil'}.
        </p>
      ) : (
        <div className="overflow-x-auto -mx-1">
          <table className="min-w-[920px] w-full text-left text-[11px] border-collapse">
            <thead>
              <tr className="border-b border-nrlx-border text-nrlx-muted font-mono uppercase tracking-wide">
                <th className="py-2 pr-2">Fecha</th>
                {esAdmin && <th className="py-2 pr-2">Socio</th>}
                <th className="py-2 pr-2">Beneficiario</th>
                <th className="py-2 pr-2">Cuenta</th>
                <th className="py-2 pr-2">SWIFT</th>
                <th className="py-2 pr-2 text-right">Monto (USD)</th>
                <th className="py-2 pr-2 text-right">Fee (USD)</th>
                <th className="py-2 pr-2 text-right">Total a liberar</th>
                <th className="py-2 pr-2">Estado</th>
                <th className="py-2 pr-2">Banco</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const pending = r.status === 'pending'
                return (
                  <tr
                    key={r.id}
                    className={`border-b border-nrlx-border/80 ${pending ? 'border-l-4 border-l-amber-500 bg-amber-500/[0.04]' : ''}`}
                  >
                    <td className="py-2.5 pr-2 text-nrlx-text whitespace-nowrap">{formatFecha(r.fecha_operacion)}</td>
                    {esAdmin && (
                      <td className="py-2.5 pr-2 text-nrlx-muted max-w-[140px] truncate" title={r.socio_nombre}>
                        {r.socio_nombre}
                      </td>
                    )}
                    <td className="py-2.5 pr-2 text-nrlx-text max-w-[200px]" title={r.beneficiario}>
                      {r.beneficiario}
                    </td>
                    <td className="py-2.5 pr-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <BankIcon
                          bankId={r.bank_icon}
                          bankName={r.bank_name}
                          iconUrl={r.icon_url}
                          className="h-7 w-7"
                        />
                        <span className="font-mono text-nrlx-text truncate">{r.numero_cuenta}</span>
                      </div>
                    </td>
                    <td className="py-2.5 pr-2 font-mono text-nrlx-muted whitespace-nowrap">{r.swift_bic}</td>
                    <td className="py-2.5 pr-2 text-right font-mono text-nrlx-text">
                      {formatearMoneda(r.monto_usd, 'USD')}
                    </td>
                    <td className="py-2.5 pr-2 text-right font-mono text-nrlx-text">
                      {formatearMoneda(r.fee_usd, 'USD')}
                    </td>
                    <td className="py-2.5 pr-2 text-right font-mono text-nrlx-accent">
                      {formatearMoneda(r.total_liberar_usd, 'USD')}
                    </td>
                    <td className="py-2.5 pr-2">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="py-2.5 pr-2 text-nrlx-muted max-w-[120px] truncate" title={r.bank_name || ''}>
                      {r.bank_name || r.bank_icon || '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
