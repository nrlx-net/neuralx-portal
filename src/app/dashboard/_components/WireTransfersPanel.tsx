'use client'

import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { api, WireOperacionesResumen, WireTransferOperacion } from '@/lib/api'
import { formatearMoneda } from '@/lib/balance'
import { BankIcon } from '@/app/components/BankIcon'
import { StatusBadge } from '@/app/components/StatusBadge'
import { ChevronDown, Landmark, RefreshCw } from 'lucide-react'

function formatFechaCorta(isoOrDate: string) {
  const s = (isoOrDate || '').slice(0, 10)
  if (!s) return '—'
  const d = new Date(s + 'T12:00:00')
  if (Number.isNaN(d.getTime())) return s
  return d.toLocaleDateString('es-MX')
}

/** Vista móvil: fecha legible en una línea */
function formatFechaMobile(isoOrDate: string) {
  const s = (isoOrDate || '').slice(0, 10)
  if (!s) return '—'
  const d = new Date(s + 'T12:00:00')
  if (Number.isNaN(d.getTime())) return s
  return d.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' })
}

function formatFechaLarga(isoOrDate: string) {
  const s = (isoOrDate || '').slice(0, 10)
  if (!s) return '—'
  const d = new Date(s + 'T12:00:00')
  if (Number.isNaN(d.getTime())) return s
  return d.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="pt-2 first:pt-0 border-t border-nrlx-border/60 first:border-0">
      <p className="text-[10px] font-mono uppercase tracking-wide text-nrlx-muted mb-0.5">{label}</p>
      <div className="text-sm text-nrlx-text break-words">{children}</div>
    </div>
  )
}

interface WireTransfersPanelProps {
  esAdmin: boolean
}

export function WireTransfersPanel({ esAdmin }: WireTransfersPanelProps) {
  const [rows, setRows] = useState<WireTransferOperacion[]>([])
  const [resumen, setResumen] = useState<WireOperacionesResumen | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)

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

  const toggleRow = (id: string) => {
    setOpenId((prev) => (prev === id ? null : id))
  }

  return (
    <section className="rounded-2xl border border-nrlx-border bg-nrlx-surface p-3 sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <Landmark size={16} className="text-nrlx-accent shrink-0" />
          <p className="text-[10px] sm:text-[11px] font-mono text-nrlx-muted tracking-wide leading-snug">
            TRANSFERENCIAS (USD){' '}
            <span className="hidden sm:inline">{esAdmin ? '· GLOBAL' : '· TU CARTERA'}</span>
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="h-9 min-w-[44px] px-3 rounded-xl border border-nrlx-border bg-nrlx-el text-[10px] text-nrlx-muted inline-flex items-center justify-center gap-1.5 touch-manipulation shrink-0"
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          Actualizar
        </button>
      </div>

      {error && (
        <p className="text-xs text-nrlx-danger mb-3 rounded-xl border border-nrlx-danger/30 bg-nrlx-danger/10 px-3 py-2">
          {error}
        </p>
      )}

      {esAdmin && resumen && !error && (
        <div className="mb-4 grid grid-cols-2 lg:grid-cols-4 gap-2">
          <div className="rounded-xl border border-nrlx-border bg-nrlx-el px-3 py-2.5">
            <p className="text-[9px] font-mono text-nrlx-muted">Total transacciones</p>
            <p className="text-lg font-mono text-nrlx-text tabular-nums">{resumen.total_transacciones}</p>
          </div>
          <div className="rounded-xl border border-nrlx-border bg-nrlx-el px-3 py-2.5">
            <p className="text-[9px] font-mono text-nrlx-muted">Suma montos (USD)</p>
            <p className="text-xs sm:text-sm font-mono text-nrlx-text tabular-nums leading-tight">
              {formatearMoneda(resumen.suma_montos_usd, 'USD')}
            </p>
          </div>
          <div className="rounded-xl border border-nrlx-border bg-nrlx-el px-3 py-2.5">
            <p className="text-[9px] font-mono text-nrlx-muted">Suma fees (USD)</p>
            <p className="text-xs sm:text-sm font-mono text-nrlx-text tabular-nums leading-tight">
              {formatearMoneda(resumen.suma_fees_usd, 'USD')}
            </p>
          </div>
          <div className="rounded-xl border border-nrlx-accent/30 bg-nrlx-accent/10 px-3 py-2.5 col-span-2 lg:col-span-1">
            <p className="text-[9px] font-mono text-nrlx-muted">Gran total a liberar</p>
            <p className="text-xs sm:text-sm font-mono text-nrlx-accent tabular-nums leading-tight">
              {formatearMoneda(resumen.gran_total_liberar_usd, 'USD')}
            </p>
          </div>
          <div className="col-span-2 lg:col-span-4 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-nrlx-muted">
            <span>Pendientes: {resumen.cnt_pending}</span>
            <span>Completados: {resumen.cnt_completed}</span>
            <span>Rechazados: {resumen.cnt_rejected}</span>
          </div>
        </div>
      )}

      {loading && !rows.length && !error ? (
        <p className="text-xs text-nrlx-muted py-8 text-center">Cargando operaciones…</p>
      ) : rows.length === 0 && !error ? (
        <p className="text-xs text-nrlx-muted py-6 text-center px-2">
          No hay transferencias wire registradas{esAdmin ? '' : ' para tu perfil'}.
        </p>
      ) : (
        <>
          {/* Móvil y tablet: tarjetas acordeón, sin scroll horizontal */}
          <div className="lg:hidden space-y-2">
            <p className="text-[10px] text-nrlx-muted mb-1 px-0.5">
              Toca un movimiento para ver todos los datos
            </p>
            {rows.map((r) => {
              const pending = r.status === 'pending'
              const open = openId === r.id
              return (
                <div
                  key={r.id}
                  className={`rounded-xl border border-nrlx-border bg-nrlx-el/40 overflow-hidden ${
                    pending ? 'border-l-[3px] border-l-amber-500 shadow-[inset_3px_0_0_0_rgba(245,158,11,0.35)]' : ''
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => toggleRow(r.id)}
                    aria-expanded={open}
                    className="w-full min-h-[52px] p-3 flex flex-col gap-2 text-left touch-manipulation active:bg-nrlx-el/80 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-nrlx-muted capitalize shrink-0">
                        {formatFechaMobile(r.fecha_operacion)}
                      </span>
                      <StatusBadge status={r.status} className="shrink-0" />
                    </div>
                    {esAdmin && r.socio_nombre ? (
                      <p className="text-[11px] text-nrlx-muted line-clamp-1">Socio: {r.socio_nombre}</p>
                    ) : null}
                    <p className="text-sm font-medium text-nrlx-text leading-snug line-clamp-2">
                      {r.beneficiario}
                    </p>
                    <div className="flex items-center justify-between gap-3 pt-0.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <BankIcon
                          bankId={r.bank_icon}
                          bankName={r.bank_name}
                          iconUrl={r.icon_url}
                          className="h-8 w-8 shrink-0"
                        />
                        <span className="text-xs font-mono text-nrlx-muted truncate">{r.numero_cuenta || '—'}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-sm font-mono font-medium text-nrlx-accent tabular-nums">
                          {formatearMoneda(r.total_liberar_usd, 'USD')}
                        </span>
                        <ChevronDown
                          size={18}
                          className={`text-nrlx-muted transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
                          aria-hidden
                        />
                      </div>
                    </div>
                  </button>
                  {open ? (
                    <div
                      id={`wire-detail-${r.id}`}
                      className="px-3 pb-3 pt-1 border-t border-nrlx-border/70 bg-nrlx-surface/60"
                    >
                      <DetailRow label="Fecha">{formatFechaLarga(r.fecha_operacion)}</DetailRow>
                      {esAdmin ? (
                        <DetailRow label="Socio">{r.socio_nombre || '—'}</DetailRow>
                      ) : null}
                      <DetailRow label="Beneficiario">{r.beneficiario}</DetailRow>
                      <DetailRow label="Cuenta">
                        <div className="flex items-start gap-2">
                          <BankIcon
                            bankId={r.bank_icon}
                            bankName={r.bank_name}
                            iconUrl={r.icon_url}
                            className="h-9 w-9 shrink-0 mt-0.5"
                          />
                          <span className="font-mono text-sm break-all">{r.numero_cuenta || '—'}</span>
                        </div>
                      </DetailRow>
                      <DetailRow label="SWIFT / BIC">
                        <span className="font-mono">{r.swift_bic || '—'}</span>
                      </DetailRow>
                      <DetailRow label="Banco">{r.bank_name || r.bank_icon || '—'}</DetailRow>
                      <div className="grid grid-cols-1 gap-2 pt-2 mt-1 border-t border-nrlx-border/60">
                        <div className="flex justify-between gap-4 text-sm">
                          <span className="text-nrlx-muted">Monto (USD)</span>
                          <span className="font-mono tabular-nums">{formatearMoneda(r.monto_usd, 'USD')}</span>
                        </div>
                        <div className="flex justify-between gap-4 text-sm">
                          <span className="text-nrlx-muted">Fee (USD)</span>
                          <span className="font-mono tabular-nums">{formatearMoneda(r.fee_usd, 'USD')}</span>
                        </div>
                        <div className="flex justify-between gap-4 text-sm font-medium">
                          <span className="text-nrlx-accent">Total a liberar</span>
                          <span className="font-mono tabular-nums text-nrlx-accent">
                            {formatearMoneda(r.total_liberar_usd, 'USD')}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>

          {/* Escritorio: tabla completa */}
          <div className="hidden lg:block overflow-x-auto -mx-1">
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
                      <td className="py-2.5 pr-2 text-nrlx-text whitespace-nowrap">
                        {formatFechaCorta(r.fecha_operacion)}
                      </td>
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
        </>
      )}
    </section>
  )
}
