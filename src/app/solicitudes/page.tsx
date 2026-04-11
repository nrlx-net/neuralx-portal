'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { Sidebar } from '../components/Sidebar'
import { api, CuentaBancaria, CuentaBancariaVinculada, Solicitud, TransferRequestPayload } from '@/lib/api'
import { ArrowRightLeft, Building2, CheckCircle2, Clock3, RefreshCw, Search, Wallet, XCircle } from 'lucide-react'
import { formatearMoneda } from '@/lib/balance'

type Tab = 'pendientes' | 'completadas' | 'rechazadas' | 'todas'
type TransferMode = 'interna' | 'externa'

const BANK_ICON_FALLBACKS: Record<string, string> = {
  bbva: 'https://pub-0096ef66aa784fc09207634c34c5baaa.r2.dev/BBVA-icon.jpeg',
  banamex: 'https://pub-0096ef66aa784fc09207634c34c5baaa.r2.dev/Banamex-icon.jpeg',
  banregio: 'https://pub-0096ef66aa784fc09207634c34c5baaa.r2.dev/Banregio-icon.png',
}

function getBankIconUrl(cuenta: CuentaBancariaVinculada) {
  if (cuenta.icono_banco_url) return cuenta.icono_banco_url
  const bank = (cuenta.banco || '').toLowerCase()
  if (bank.includes('bbva')) return BANK_ICON_FALLBACKS.bbva
  if (bank.includes('banamex') || bank.includes('citibanamex')) return BANK_ICON_FALLBACKS.banamex
  if (bank.includes('banregio')) return BANK_ICON_FALLBACKS.banregio
  return null
}

export default function SolicitudesPage() {
  const { status } = useSession()
  const [cuentasInternas, setCuentasInternas] = useState<CuentaBancaria[]>([])
  const [cuentasBancarias, setCuentasBancarias] = useState<CuentaBancariaVinculada[]>([])
  const [tab, setTab] = useState<Tab>('pendientes')
  const [transferMode, setTransferMode] = useState<TransferMode>('externa')
  const [cuentaOrigen, setCuentaOrigen] = useState('')
  const [cuentaDestino, setCuentaDestino] = useState('')
  const [moneda, setMoneda] = useState('MXN')
  const [monto, setMonto] = useState('')
  const [concepto, setConcepto] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingHistorial, setLoadingHistorial] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([])
  const [searchDestino, setSearchDestino] = useState('')

  useEffect(() => {
    if (status === 'authenticated') {
      void loadInitialData()
    }
  }, [status])

  useEffect(() => {
    if (status === 'authenticated') {
      void loadSolicitudes(tab)
    }
  }, [tab, status])

  async function loadInitialData() {
    try {
      setLoading(true)
      setError(null)
      const [internas, bancarias] = await Promise.all([
        api.getCuentas(),
        api.getCuentasBancariasVinculadas(),
      ])
      setCuentasInternas(internas.cuentas)
      setCuentasBancarias(bancarias.cuentas)
      if (internas.cuentas[0]) {
        setCuentaOrigen(internas.cuentas[0].id_cuenta)
        setMoneda(internas.cuentas[0].moneda || 'MXN')
      }
      if (bancarias.cuentas[0]) {
        setCuentaDestino(bancarias.cuentas[0].id_cuenta)
      }
      await loadSolicitudes(tab)
    } catch (err: any) {
      setError(err.message || 'No se pudo cargar la información inicial')
    } finally {
      setLoading(false)
    }
  }

  async function loadSolicitudes(currentTab: Tab) {
    try {
      setLoadingHistorial(true)
      const estatus =
        currentTab === 'pendientes'
          ? 'pendiente'
          : currentTab === 'completadas'
          ? 'ejecutada'
          : currentTab === 'rechazadas'
          ? 'rechazada'
          : undefined
      const res = await api.getSolicitudes(estatus)
      setSolicitudes(res.solicitudes)
    } catch (err: any) {
      setError(err.message || 'No se pudo cargar el historial')
    } finally {
      setLoadingHistorial(false)
    }
  }

  async function refreshAll() {
    try {
      setRefreshing(true)
      await loadInitialData()
    } finally {
      setRefreshing(false)
    }
  }

  const cuentasDestinoInternas = cuentasInternas.filter((cuenta) => cuenta.id_cuenta !== cuentaOrigen)

  const cuentasExternasFiltradas = cuentasBancarias.filter((cuenta) => {
    const q = searchDestino.trim().toLowerCase()
    if (!q) return true
    const bag = `${cuenta.banco} ${cuenta.numero_cuenta || ''} ${cuenta.titular || ''} ${cuenta.id_cuenta}`.toLowerCase()
    return bag.includes(q)
  })

  const cuentasInternasFiltradas = cuentasDestinoInternas.filter((cuenta) => {
    const q = searchDestino.trim().toLowerCase()
    if (!q) return true
    const bag = `${cuenta.id_cuenta} ${cuenta.titular || ''} ${cuenta.moneda}`.toLowerCase()
    return bag.includes(q)
  })

  const cuentaDestinoSeleccionada = transferMode === 'interna'
    ? cuentasInternas.find((c) => c.id_cuenta === cuentaDestino)
    : cuentasBancarias.find((c) => c.id_cuenta === cuentaDestino)

  const origenSeleccionado = cuentasInternas.find((c) => c.id_cuenta === cuentaOrigen)

  async function handleSubmit() {
    const montoNumber = Number(monto)
    if (!montoNumber || montoNumber <= 0) return
    if (!cuentaOrigen || !cuentaDestino) {
      setError('Selecciona cuenta origen y cuenta destino')
      return
    }
    if (transferMode === 'interna' && cuentaOrigen === cuentaDestino) {
      setError('La cuenta origen y destino no pueden ser la misma')
      return
    }

    try {
      setSubmitting(true)
      setError(null)
      setFeedback(null)
      const payload: TransferRequestPayload = {
        flow: 'transfer',
        tipo: transferMode === 'interna' ? 'transferencia_interna' : 'transferencia_externa',
        moneda,
        monto: montoNumber,
        concepto: concepto.trim() || undefined,
      }

      if (transferMode === 'interna') {
        payload.nxg_destino = cuentaDestino
        payload.datos_extra = { ux_flow: 'solicitudes', transfer_mode: 'interna' }
      } else {
        payload.id_cuenta_banco = cuentaDestino
        payload.datos_extra = { ux_flow: 'solicitudes', transfer_mode: 'externa' }
      }

      await api.crearTransferencia(payload)
      setFeedback('Solicitud enviada correctamente.')
      setMonto('')
      setConcepto('')
      await loadSolicitudes(tab)
    } catch (err: any) {
      setError(err.message || 'No se pudo crear la solicitud')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-nrlx-bg">
      <Sidebar />
      <main className="lg:ml-64 min-h-screen pt-16 lg:pt-0 pb-20 lg:pb-0">
        <div className="p-6 lg:p-8 max-w-5xl">
          <div className="mb-8 pt-2 lg:pt-0">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h1 className="text-2xl font-medium text-nrlx-text">Transferencias operativas</h1>
                <p className="text-xs text-nrlx-muted mt-1">
                  Operaciones internas y externas sujetas a aprobación administrativa
                </p>
              </div>
              <button
                onClick={refreshAll}
                className="h-9 px-3 rounded-lg border border-nrlx-border bg-nrlx-el text-xs text-nrlx-muted inline-flex items-center gap-2"
              >
                <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
                Actualizar
              </button>
            </div>
          </div>

          {feedback && (
            <div className="bg-nrlx-accent/10 border border-nrlx-accent/30 rounded-xl p-4 mb-6">
              <p className="text-xs text-nrlx-accent font-mono">{feedback}</p>
            </div>
          )}

          {error && (
            <div className="bg-nrlx-danger/10 border border-nrlx-danger/30 rounded-xl p-4 mb-6">
              <p className="text-xs text-nrlx-danger font-mono">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)] gap-6">
            <aside className="bg-nrlx-surface border border-nrlx-border rounded-xl p-4 h-fit">
              <h2 className="text-xs font-mono text-nrlx-muted tracking-wider mb-3">
                CENTRO DE TRANSFERENCIAS
              </h2>
              <div className="space-y-2 mb-4">
                <button
                  onClick={() => {
                    setTransferMode('interna')
                    setCuentaDestino(cuentasDestinoInternas[0]?.id_cuenta || '')
                    setSearchDestino('')
                  }}
                  className={`w-full rounded-lg border px-3 py-2 text-left text-xs inline-flex items-center gap-2 ${
                    transferMode === 'interna'
                      ? 'border-nrlx-accent/40 bg-nrlx-accent/10 text-nrlx-accent'
                      : 'border-nrlx-border bg-nrlx-el text-nrlx-text'
                  }`}
                >
                  <Wallet size={12} />
                  Transferencia interna
                </button>
                <button
                  onClick={() => {
                    setTransferMode('externa')
                    setCuentaDestino(cuentasBancarias[0]?.id_cuenta || '')
                    setSearchDestino('')
                  }}
                  className={`w-full rounded-lg border px-3 py-2 text-left text-xs inline-flex items-center gap-2 ${
                    transferMode === 'externa'
                      ? 'border-nrlx-accent/40 bg-nrlx-accent/10 text-nrlx-accent'
                      : 'border-nrlx-border bg-nrlx-el text-nrlx-text'
                  }`}
                >
                  <Building2 size={12} />
                  Transferencia externa
                </button>
                <button
                  onClick={() => setTab('pendientes')}
                  className="w-full rounded-lg border border-nrlx-border bg-nrlx-el px-3 py-2 text-left text-xs text-nrlx-text"
                >
                  Ver pendientes
                </button>
                <button
                  onClick={() => setTab('todas')}
                  className="w-full rounded-lg border border-nrlx-border bg-nrlx-el px-3 py-2 text-left text-xs text-nrlx-text"
                >
                  Ver historial completo
                </button>
                <button
                  onClick={() => {
                    setSearchDestino('')
                    setCuentaDestino(
                      transferMode === 'interna'
                        ? (cuentasDestinoInternas[0]?.id_cuenta || '')
                        : (cuentasBancarias[0]?.id_cuenta || '')
                    )
                  }}
                  className="w-full rounded-lg border border-nrlx-border bg-nrlx-el px-3 py-2 text-left text-xs text-nrlx-text inline-flex items-center gap-2"
                >
                  <ArrowRightLeft size={12} />
                  Limpiar selección de destino
                </button>
              </div>
              <div className="rounded-lg border border-nrlx-warning/30 bg-nrlx-warning/10 p-3">
                <p className="text-[11px] text-nrlx-warning">
                  Selecciona cuentas validadas para evitar rechazos por datos incompletos.
                </p>
              </div>
            </aside>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div className="bg-nrlx-surface border border-nrlx-border rounded-xl p-6">
              <h2 className="text-xs font-mono text-nrlx-muted tracking-wider mb-4">
                NUEVA SOLICITUD
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-mono text-nrlx-muted tracking-wider block mb-1.5">
                    CUENTA ORIGEN
                  </label>
                  <select
                    value={cuentaOrigen}
                    onChange={(e) => {
                      setCuentaOrigen(e.target.value)
                      const selected = cuentasInternas.find((c) => c.id_cuenta === e.target.value)
                      if (selected?.moneda) setMoneda(selected.moneda)
                    }}
                    className="w-full bg-nrlx-card border border-nrlx-border rounded-lg px-4 py-3 text-sm text-nrlx-text focus:border-nrlx-accent/40 focus:outline-none"
                  >
                    {cuentasInternas.map((cuenta) => (
                      <option key={cuenta.id_cuenta} value={cuenta.id_cuenta}>
                        {cuenta.id_cuenta} · {cuenta.moneda}
                        {cuenta.titular ? ` · ${cuenta.titular}` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {origenSeleccionado && (
                  <div className="rounded-lg border border-nrlx-border/60 bg-nrlx-card/40 p-3">
                    <p className="text-[10px] font-mono text-nrlx-muted mb-1">DISPONIBLE EN ORIGEN</p>
                    <p className="text-sm text-nrlx-text font-mono">
                      {formatearMoneda(origenSeleccionado.saldo_disponible, origenSeleccionado.moneda)}
                    </p>
                  </div>
                )}

                <div>
                  <label className="text-[10px] font-mono text-nrlx-muted tracking-wider block mb-1.5">
                    MONTO
                  </label>
                  <input
                    type="number"
                    value={monto}
                    onChange={(e) => setMonto(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-nrlx-card border border-nrlx-border rounded-lg px-4 py-3 text-nrlx-text font-mono text-3xl text-center placeholder:text-nrlx-muted/40 focus:border-nrlx-accent/40 focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-mono text-nrlx-muted tracking-wider block mb-1.5">
                    MONEDA
                  </label>
                  <select
                    value={moneda}
                    onChange={(e) => setMoneda(e.target.value)}
                    className="w-full bg-nrlx-card border border-nrlx-border rounded-lg px-4 py-3 text-sm text-nrlx-text focus:border-nrlx-accent/40 focus:outline-none"
                  >
                    {['MXN', 'USD', 'EUR', 'GBP', 'CHF'].map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-mono text-nrlx-muted tracking-wider block mb-1.5">
                    CONCEPTO
                  </label>
                  <input
                    type="text"
                    value={concepto}
                    onChange={(e) => setConcepto(e.target.value)}
                    placeholder={transferMode === 'interna' ? 'Descripción de la transferencia interna' : 'Descripción de la transferencia externa'}
                    className="w-full bg-nrlx-card border border-nrlx-border rounded-lg px-4 py-3 text-sm text-nrlx-text placeholder:text-nrlx-muted/40 focus:border-nrlx-accent/40 focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-mono text-nrlx-muted tracking-wider block mb-1.5">
                    {transferMode === 'interna' ? 'CUENTA DESTINO INTERNA' : 'CUENTA DESTINO EXTERNA'}
                  </label>
                  <div className="mb-2 h-9 rounded-lg border border-nrlx-border bg-nrlx-card px-3 flex items-center gap-2">
                    <Search size={13} className="text-nrlx-muted" />
                    <input
                      value={searchDestino}
                      onChange={(e) => setSearchDestino(e.target.value)}
                      placeholder="Buscar por titular, banco o cuenta"
                      className="bg-transparent w-full text-xs text-nrlx-text placeholder:text-nrlx-muted focus:outline-none"
                    />
                  </div>
                  <div className="max-h-44 overflow-y-auto space-y-2 pr-1">
                    {transferMode === 'interna' ? (
                      cuentasInternasFiltradas.map((cuenta) => {
                        const selected = cuenta.id_cuenta === cuentaDestino
                        return (
                          <button
                            key={cuenta.id_cuenta}
                            type="button"
                            onClick={() => setCuentaDestino(cuenta.id_cuenta)}
                            className={`w-full rounded-lg border px-3 py-2 text-left transition-colors ${
                              selected
                                ? 'border-nrlx-accent/40 bg-nrlx-accent/10'
                                : 'border-nrlx-border bg-nrlx-card hover:border-nrlx-accent/20'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full border border-nrlx-border bg-nrlx-el flex items-center justify-center">
                                <Wallet size={13} className="text-nrlx-muted" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs text-nrlx-text truncate">
                                  {cuenta.id_cuenta} {cuenta.titular ? `· ${cuenta.titular}` : ''}
                                </p>
                                <p className="text-[11px] text-nrlx-muted truncate">
                                  Disponible {formatearMoneda(cuenta.saldo_disponible, cuenta.moneda)}
                                </p>
                              </div>
                            </div>
                          </button>
                        )
                      })
                    ) : (
                      cuentasExternasFiltradas.map((cuenta) => {
                        const selected = cuenta.id_cuenta === cuentaDestino
                        const iconUrl = getBankIconUrl(cuenta)
                        return (
                          <button
                            key={cuenta.id_cuenta}
                            type="button"
                            onClick={() => setCuentaDestino(cuenta.id_cuenta)}
                            className={`w-full rounded-lg border px-3 py-2 text-left transition-colors ${
                              selected
                                ? 'border-nrlx-accent/40 bg-nrlx-accent/10'
                                : 'border-nrlx-border bg-nrlx-card hover:border-nrlx-accent/20'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              {iconUrl ? (
                                <img
                                  src={iconUrl}
                                  alt={cuenta.banco}
                                  className="w-8 h-8 rounded-full object-cover border border-nrlx-border"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-full border border-nrlx-border bg-nrlx-el flex items-center justify-center">
                                  <Building2 size={13} className="text-nrlx-muted" />
                                </div>
                              )}
                              <div className="min-w-0">
                                <p className="text-xs text-nrlx-text truncate">
                                  {cuenta.titular || 'Titular no especificado'}
                                </p>
                                <p className="text-[11px] text-nrlx-muted truncate">
                                  {cuenta.banco} · {cuenta.numero_cuenta || cuenta.id_cuenta}
                                </p>
                              </div>
                            </div>
                          </button>
                        )
                      })
                    )}
                  </div>
                  {cuentaDestinoSeleccionada && (
                    <p className="text-[11px] text-nrlx-accent mt-2">
                      Seleccionada: {transferMode === 'interna'
                        ? `${cuentaDestinoSeleccionada.id_cuenta} · ${(cuentaDestinoSeleccionada as CuentaBancaria).titular || 'Cuenta interna'}`
                        : `${(cuentaDestinoSeleccionada as CuentaBancariaVinculada).banco} · ${(cuentaDestinoSeleccionada as CuentaBancariaVinculada).numero_cuenta || cuentaDestinoSeleccionada.id_cuenta}`}
                    </p>
                  )}
                  {(transferMode === 'interna' ? cuentasInternasFiltradas.length === 0 : cuentasExternasFiltradas.length === 0) && (
                    <p className="text-[11px] text-nrlx-muted mt-2">
                      No hay coincidencias para tu búsqueda.
                    </p>
                  )}
                </div>

                <div className="bg-nrlx-card/50 border border-nrlx-border/50 rounded-lg p-3">
                  <p className="text-[10px] font-mono text-nrlx-warning">
                    {transferMode === 'interna'
                      ? 'Las transferencias internas también quedan registradas y pasan por flujo de aprobación.'
                      : 'Las transferencias externas requieren aprobación del administrador antes de procesarse.'}
                  </p>
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={!monto || submitting || status === 'loading' || !cuentaOrigen || !cuentaDestino}
                  className={`w-full py-3 rounded-lg text-sm font-medium transition-all ${
                    submitting
                      ? 'bg-nrlx-accent/20 text-nrlx-accent border border-nrlx-accent/30'
                      : !monto || !cuentaOrigen || !cuentaDestino
                      ? 'bg-nrlx-card text-nrlx-muted border border-nrlx-border cursor-not-allowed'
                      : 'bg-nrlx-accent/10 text-nrlx-accent border border-nrlx-accent/30 hover:bg-nrlx-accent/20'
                  }`}
                >
                  {submitting
                    ? 'Enviando...'
                    : transferMode === 'interna'
                    ? 'Solicitar transferencia interna'
                    : 'Solicitar transferencia externa'}
                </button>
              </div>
            </div>

            <div className="bg-nrlx-surface border border-nrlx-border rounded-xl p-6">
              <div className="flex items-center justify-between gap-2 mb-4">
                <h2 className="text-xs font-mono text-nrlx-muted tracking-wider">
                  HISTORIAL DE SOLICITUDES
                </h2>
                <button
                  onClick={() => loadSolicitudes(tab)}
                  className="w-8 h-8 rounded-lg border border-nrlx-border bg-nrlx-el text-nrlx-muted inline-flex items-center justify-center"
                >
                  <RefreshCw size={14} />
                </button>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-4">
                {([
                  ['pendientes', 'Pendientes'],
                  ['completadas', 'Completadas'],
                  ['rechazadas', 'Rechazadas'],
                  ['todas', 'Todas'],
                ] as Array<[Tab, string]>).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setTab(key)}
                    className={`h-9 rounded-lg border text-xs ${
                      tab === key
                        ? 'border-nrlx-accent/40 bg-nrlx-accent/10 text-nrlx-accent'
                        : 'border-nrlx-border bg-nrlx-el text-nrlx-muted'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {loading || loadingHistorial || status === 'loading' ? (
                <div className="text-center py-12">
                  <p className="text-sm text-nrlx-muted">Cargando solicitudes...</p>
                </div>
              ) : solicitudes.length === 0 ? (
                <div className="text-center py-12">
                  <svg
                    width="74"
                    height="74"
                    viewBox="0 0 74 74"
                    className="mx-auto mb-3 text-nrlx-muted"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <rect x="16" y="10" width="42" height="54" rx="8" stroke="currentColor" />
                    <line x1="24" y1="24" x2="50" y2="24" stroke="currentColor" />
                    <line x1="24" y1="33" x2="50" y2="33" stroke="currentColor" />
                    <line x1="24" y1="42" x2="42" y2="42" stroke="currentColor" />
                  </svg>
                  <p className="text-sm text-nrlx-muted">No hay solicitudes en este filtro.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {solicitudes.map((sol) => (
                    <div
                      key={sol.id_solicitud}
                      className="bg-nrlx-card border border-nrlx-border/50 rounded-lg p-4"
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex items-center gap-2">
                          <StatusIcon status={sol.estatus} />
                          <p className="text-[10px] font-mono text-nrlx-muted">{sol.id_solicitud}</p>
                        </div>
                        <StatusBadge status={sol.estatus} />
                      </div>
                      <p className="text-2xl font-mono text-nrlx-text">{formatearMoneda(sol.monto, sol.moneda)}</p>
                      <p className="text-[11px] text-nrlx-muted mt-1">
                        {sol.tipo} · Origen {sol.nxg_origen || '—'}
                        {sol.nxg_destino ? ` · Destino ${sol.nxg_destino}` : ''}
                        {sol.id_cuenta_banco ? ` · Banco ${sol.id_cuenta_banco}` : ''}
                      </p>
                      <p className="text-xs text-nrlx-muted mt-1">{sol.concepto || '—'}</p>
                      <p className="text-[10px] font-mono text-nrlx-muted mt-2">
                        Solicitud: {new Date(sol.fecha_solicitud).toLocaleDateString('es-MX')}
                      </p>
                      {sol.fecha_resolucion && (
                        <p className="text-[10px] font-mono text-nrlx-muted mt-1">
                          Resolución: {new Date(sol.fecha_resolucion).toLocaleDateString('es-MX')}
                        </p>
                      )}
                      {sol.comentario_admin && (
                        <p className="text-xs italic text-nrlx-muted mt-2">{sol.comentario_admin}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

function StatusIcon({ status }: { status: string }) {
  const normalized = status.toLowerCase()
  if (normalized.includes('rech')) return <XCircle size={15} className="text-nrlx-danger" />
  if (normalized.includes('ejec') || normalized.includes('complet')) return <CheckCircle2 size={15} className="text-nrlx-success" />
  return <Clock3 size={15} className="text-nrlx-warning" />
}

function StatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase()
  const classes = normalized.includes('rech')
    ? 'bg-nrlx-danger/10 text-nrlx-danger'
    : normalized.includes('ejec') || normalized.includes('complet')
    ? 'bg-nrlx-success/10 text-nrlx-success'
    : 'bg-nrlx-warning/10 text-nrlx-warning'

  return <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${classes}`}>{status}</span>
}
