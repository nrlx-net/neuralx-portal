'use client'

import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import { api, CuentaBancaria, Solicitud, Transaccion } from '@/lib/api'
import { TransferFlow } from '../components/TransferFlow'
import { DrawerTransfer } from '../components/DrawerTransfer'
import { BankDataSheet } from '../components/BankDataSheet'
import { calcularBalanceConsolidado, formatearMoneda } from '@/lib/balance'
import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  Building2,
  CreditCard,
  MoreHorizontal,
  Plus,
  Search,
  WalletCards,
} from 'lucide-react'

const USE_NEW_TRANSFER_FLOW = true

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const [cuentas, setCuentas] = useState<CuentaBancaria[]>([])
  const [transacciones, setTransacciones] = useState<Transaccion[]>([])
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([])
  const [saldoTotal, setSaldoTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showSaldos] = useState(true)
  const [activeSlide, setActiveSlide] = useState(0)
  const [depositDrawerOpen, setDepositDrawerOpen] = useState(false)
  const [transferDrawerOpen, setTransferDrawerOpen] = useState(false)
  const [dataSheetOpen, setDataSheetOpen] = useState(false)
  const [moreSheetOpen, setMoreSheetOpen] = useState(false)
  const slidesRef = useRef<HTMLDivElement | null>(null)
  const initials = useMemo(() => {
    const text = session?.user?.name || session?.user?.email || 'NN'
    return text
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() || '')
      .join('')
  }, [session?.user?.name, session?.user?.email])

  useEffect(() => {
    if (status === 'authenticated') {
      loadData()
    }
  }, [status])

  async function loadData() {
    try {
      setLoading(true)
      setError(null)

      const [cuentasRes, txnRes, solRes] = await Promise.all([
        api.getCuentas(),
        api.getTransacciones(),
        api.getSolicitudes('pendiente'),
      ])

      setCuentas(cuentasRes.cuentas)
      const balance = calcularBalanceConsolidado(
        cuentasRes.cuentas.map((c) => ({
          saldo_disponible: c.saldo_disponible,
          saldo_retenido: c.saldo_retenido ?? Math.max(c.saldo_total - c.saldo_disponible, 0),
          moneda: c.moneda,
        }))
      )
      setSaldoTotal(balance.total_mxn)
      setTransacciones(txnRes.transacciones)
      setSolicitudes(solRes.solicitudes)
    } catch (err: any) {
      console.error('Error loading data:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function handleSlideScroll() {
    if (!slidesRef.current || cuentas.length === 0) return
    const width = slidesRef.current.clientWidth
    if (!width) return
    const next = Math.round(slidesRef.current.scrollLeft / width)
    setActiveSlide(next)
  }

  const programadas = solicitudes.filter((s) => s.estatus === 'pendiente')
  const actividad = transacciones.slice(0, 5)

  if (status === 'loading' || loading) {
    return (
      <div className="max-w-2xl mx-auto animate-fade-up">
        <div className="sticky top-0 z-20 bg-nrlx-bg/80 backdrop-blur-md border border-nrlx-border rounded-2xl p-3 mb-4">
          <div className="h-10 bg-nrlx-el rounded-xl animate-pulse" />
        </div>
        <div className="bg-nrlx-surface border border-nrlx-border rounded-2xl p-5 mb-5">
          <div className="h-3 bg-nrlx-el rounded w-32 mb-3 animate-pulse" />
          <div className="h-10 bg-nrlx-el rounded w-48 mb-4 animate-pulse" />
          <div className="h-24 bg-nrlx-el rounded-xl animate-pulse" />
        </div>
        <div className="grid grid-cols-4 gap-3 mb-5">
          {[...Array(4)].map((_, idx) => (
            <div key={idx} className="space-y-2">
              <div className="h-14 rounded-full bg-nrlx-el border border-nrlx-border animate-pulse" />
              <div className="h-3 bg-nrlx-el rounded mx-auto w-12 animate-pulse" />
            </div>
          ))}
        </div>
        <div className="bg-nrlx-surface border border-nrlx-border rounded-2xl p-4 mb-4">
          <div className="h-4 bg-nrlx-el rounded w-40 mb-4 animate-pulse" />
          <div className="space-y-3">
            {[...Array(3)].map((_, idx) => (
              <div key={idx} className="h-16 bg-nrlx-el rounded-xl animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto animate-fade-up">
        <div className="bg-nrlx-danger/10 border border-nrlx-danger/30 rounded-2xl p-5">
          <p className="text-sm text-nrlx-danger font-mono mb-3">{error}</p>
          <button
            onClick={loadData}
            className="px-4 py-2 text-sm rounded-xl border border-nrlx-danger/40 text-nrlx-danger hover:bg-nrlx-danger/10 transition-colors"
          >
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto pb-20 lg:pb-0 animate-fade-up">
      <div className="sticky top-0 z-20 bg-nrlx-bg/75 backdrop-blur-md rounded-2xl border border-nrlx-border px-3 py-2 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-nrlx-el border border-nrlx-border flex items-center justify-center text-xs font-mono text-nrlx-text shrink-0">
            {initials || 'NN'}
          </div>
          <div className="flex-1 h-10 rounded-full border border-nrlx-border bg-nrlx-el flex items-center gap-2 px-3">
            <Search size={16} className="text-nrlx-muted" />
            <span className="text-sm text-nrlx-muted">Buscar...</span>
          </div>
          <button className="w-10 h-10 rounded-full border border-nrlx-border bg-nrlx-el flex items-center justify-center text-nrlx-text">
            <CreditCard size={16} />
          </button>
        </div>
      </div>

      <section className="bg-nrlx-surface border border-nrlx-border rounded-2xl p-5 mb-5">
        <p className="text-[11px] font-mono text-nrlx-muted mb-2">Personal · Todas las divisas</p>
        <div className="flex items-center gap-3 mb-3">
          <p className="text-4xl font-light font-mono text-nrlx-text transition-all">
            {formatearMoneda(saldoTotal)}
          </p>
        </div>
        <p className="px-3 h-8 rounded-full border border-nrlx-border bg-nrlx-el text-[11px] font-medium text-nrlx-text mb-4 inline-flex items-center">
          Saldos
        </p>

        {showSaldos && (
          <>
            {cuentas.length > 0 ? (
              <>
                <div
                  ref={slidesRef}
                  onScroll={handleSlideScroll}
                  className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2"
                >
                  {cuentas.map((cuenta, idx) => (
                    <article
                      key={`${cuenta.id_cuenta}-${idx}`}
                      className="min-w-full snap-start rounded-2xl border border-nrlx-border bg-nrlx-el p-4"
                    >
                      <p className="text-[11px] text-nrlx-muted mb-2">{cuenta.id_cuenta}</p>
                      <p className="text-sm text-nrlx-text mb-3">{cuenta.moneda}</p>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-[10px] text-nrlx-muted mb-1">Disponible</p>
                          <p className="font-mono text-nrlx-text">{formatearMoneda(cuenta.saldo_disponible, cuenta.moneda)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-nrlx-muted mb-1">Retenido</p>
                          <p className="font-mono text-nrlx-warning">{formatearMoneda((cuenta.saldo_retenido ?? (cuenta.saldo_total - cuenta.saldo_disponible)), cuenta.moneda)}</p>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
                {cuentas.length > 1 && (
                  <div className="flex items-center justify-center gap-1.5 mt-3">
                    {cuentas.map((_, idx) => (
                      <span
                        key={`dot-${idx}`}
                        className={`h-1.5 rounded-full transition-all ${
                          idx === activeSlide ? 'w-4 bg-nrlx-accent' : 'w-1.5 bg-nrlx-el2'
                        }`}
                      />
                    ))}
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-nrlx-muted">No tienes cuentas internas registradas.</p>
            )}
          </>
        )}
      </section>

      <section className="grid grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Anadir', icon: Plus, action: () => setDepositDrawerOpen(true) },
          { label: 'Transferir', icon: ArrowLeftRight, action: () => setTransferDrawerOpen(true) },
          { label: 'Datos', icon: Building2, action: () => setDataSheetOpen(true) },
          { label: 'Mas', icon: MoreHorizontal, action: () => setMoreSheetOpen(true) },
        ].map((item) => {
          const Icon = item.icon
          return (
            <button key={item.label} onClick={item.action} className="group">
              <div className="w-14 h-14 mx-auto rounded-full bg-nrlx-el border border-nrlx-border flex items-center justify-center text-nrlx-text group-hover:border-nrlx-accent/40 transition-colors">
                <Icon size={18} />
              </div>
              <p className="text-[11px] text-nrlx-muted mt-2 text-center">{item.label}</p>
            </button>
          )
        })}
      </section>

      {programadas.length > 0 && (
        <section className="bg-nrlx-surface border border-nrlx-border rounded-2xl p-4 mb-5">
          <h2 className="text-sm font-medium text-nrlx-text mb-3">Pagos programados</h2>
          <div className="space-y-3">
            {programadas.slice(0, 4).map((sol) => (
              <div key={sol.id_solicitud} className="flex items-center justify-between gap-3 rounded-xl border border-nrlx-border bg-nrlx-el px-3 py-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-nrlx-el2 border border-nrlx-border flex items-center justify-center text-[10px] font-mono text-nrlx-text shrink-0">
                    {initials || 'NX'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-nrlx-text truncate">{sol.concepto || 'Solicitud pendiente'}</p>
                    <p className="text-[10px] text-nrlx-muted">{new Date(sol.fecha_solicitud).toLocaleDateString('es-MX')}</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-mono text-nrlx-text">{formatearMoneda(sol.monto, sol.moneda)}</p>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-nrlx-warning/10 text-nrlx-warning">
                    pendiente
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="bg-nrlx-surface border border-nrlx-border rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium text-nrlx-text">Actividad reciente</h2>
          <Link href="/movimientos" className="text-xs text-nrlx-accent hover:underline inline-flex items-center gap-1">
            Ver todo
            <ChevronIcon />
          </Link>
        </div>
        {actividad.length > 0 ? (
          <div className="space-y-2">
            {actividad.map((txn) => {
              const isOut = txn.tipo_transaccion === 'saliente'
              return (
                <div key={txn.id_transaccion} className="flex items-center justify-between gap-3 px-2 py-2 rounded-xl hover:bg-nrlx-el transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-8 h-8 rounded-full border border-nrlx-border flex items-center justify-center ${isOut ? 'text-nrlx-danger bg-nrlx-danger/10' : 'text-nrlx-success bg-nrlx-success/10'}`}>
                      {isOut ? <ArrowUpRight size={14} /> : <ArrowDownLeft size={14} />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-nrlx-text truncate">{txn.concepto || 'Movimiento interno'}</p>
                      <p className="text-[10px] text-nrlx-muted">{new Date(txn.fecha_hora).toLocaleDateString('es-MX')}</p>
                    </div>
                  </div>
                  <p className={`text-xs font-mono ${isOut ? 'text-nrlx-danger' : 'text-nrlx-success'}`}>
                    {isOut ? '-' : '+'}
                    {formatearMoneda(txn.monto, txn.moneda)}
                  </p>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <WalletCards size={22} className="mx-auto text-nrlx-muted mb-2" />
            <p className="text-sm text-nrlx-muted">Aun no tienes actividad reciente.</p>
          </div>
        )}
      </section>

      <ActionSheet
        open={depositDrawerOpen}
        onClose={() => setDepositDrawerOpen(false)}
        title="Anadir fondos"
        body="Solicita entrada de fondos desde custodia o cuenta vinculada."
      />
      <ActionSheet
        open={transferDrawerOpen && !USE_NEW_TRANSFER_FLOW}
        onClose={() => setTransferDrawerOpen(false)}
        title="Transferir"
        body="Las transferencias internas mayores a $100,000 MXN quedan pendientes de aprobacion."
      />
      <BankDataSheet open={dataSheetOpen} onClose={() => setDataSheetOpen(false)} />
      {moreSheetOpen && (
        <div className="fixed inset-0 z-50">
          <button className="absolute inset-0 bg-black/70" onClick={() => setMoreSheetOpen(false)} />
          <div className="absolute bottom-0 left-0 right-0 rounded-t-2xl border border-nrlx-border bg-nrlx-surface p-4 animate-fade-up">
            <div className="w-10 h-1 bg-nrlx-el2 rounded-full mx-auto mb-4" />
            <h3 className="text-sm font-medium text-nrlx-text mb-3">Mas acciones</h3>
            <div className="space-y-2">
              <Link href="/solicitudes" onClick={() => setMoreSheetOpen(false)} className="block rounded-xl border border-nrlx-border bg-nrlx-el px-3 py-2 text-sm text-nrlx-text">
                Transferencia externa
              </Link>
              <Link href="/regulatorio" onClick={() => setMoreSheetOpen(false)} className="block rounded-xl border border-nrlx-border bg-nrlx-el px-3 py-2 text-sm text-nrlx-text">
                Procesos regulatorios
              </Link>
              <Link href="/dashboard/credenciales-operaciones" onClick={() => setMoreSheetOpen(false)} className="block rounded-xl border border-nrlx-border bg-nrlx-el px-3 py-2 text-sm text-nrlx-text">
                Emitir credencial verificada
              </Link>
              <Link href="/cuentas" onClick={() => setMoreSheetOpen(false)} className="block rounded-xl border border-nrlx-border bg-nrlx-el px-3 py-2 text-sm text-nrlx-text">
                Agregar cuenta
              </Link>
            </div>
          </div>
        </div>
      )}
      {USE_NEW_TRANSFER_FLOW ? (
        <TransferFlow open={transferDrawerOpen} onClose={() => setTransferDrawerOpen(false)} />
      ) : (
        <DrawerTransfer open={transferDrawerOpen} onClose={() => setTransferDrawerOpen(false)} />
      )}
    </div>
  )
}

function ChevronIcon() {
  return <span className="text-base leading-none">›</span>
}

function ActionSheet({
  open,
  onClose,
  title,
  body,
}: {
  open: boolean
  onClose: () => void
  title: string
  body: string
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50">
      <button className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="absolute bottom-0 left-0 right-0 rounded-t-2xl border border-nrlx-border bg-nrlx-surface p-4 animate-fade-up">
        <div className="w-10 h-1 bg-nrlx-el2 rounded-full mx-auto mb-4" />
        <h3 className="text-sm font-medium text-nrlx-text mb-2">{title}</h3>
        <p className="text-sm text-nrlx-muted mb-4">{body}</p>
        <button
          onClick={onClose}
          className="w-full py-2 rounded-xl border border-nrlx-border bg-nrlx-el text-sm text-nrlx-text"
        >
          Cerrar
        </button>
      </div>
    </div>
  )
}
