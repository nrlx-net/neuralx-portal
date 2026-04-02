'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { Sidebar } from '../components/Sidebar'
import { api, Solicitud } from '@/lib/api'

function formatMoney(amount: number, currency: string = 'MXN') {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount)
}

export default function SolicitudesPage() {
  const { data: session, status } = useSession()
  const [monto, setMonto] = useState('')
  const [concepto, setConcepto] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [solicitudesPendientes, setSolicitudesPendientes] = useState<Solicitud[]>([])

  useEffect(() => {
    if (status === 'authenticated') {
      loadSolicitudes()
    }
  }, [status])

  async function loadSolicitudes() {
    try {
      setLoading(true)
      setError(null)
      const res = await api.getSolicitudes('pendiente')
      setSolicitudesPendientes(res.solicitudes)
    } catch (err: any) {
      setError(err.message || 'No se pudieron cargar las solicitudes')
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit() {
    const montoNumber = Number(monto)
    if (!montoNumber || montoNumber <= 0) return

    try {
      setSubmitting(true)
      setError(null)
      setFeedback(null)
      await api.crearSolicitudRetiro(montoNumber, concepto.trim() || undefined)
      setFeedback('Solicitud enviada correctamente.')
      setMonto('')
      setConcepto('')
      await loadSolicitudes()
    } catch (err: any) {
      setError(err.message || 'No se pudo crear la solicitud')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-nrlx-bg">
      <Sidebar />
      <main className="lg:ml-64 min-h-screen">
        <div className="p-6 lg:p-8 max-w-5xl">
          <div className="mb-8 pt-2 lg:pt-0">
            <h1 className="text-2xl font-medium text-nrlx-text">Solicitudes</h1>
            <p className="text-xs text-nrlx-muted mt-1">
              Solicitar retiro o transferencia a cuenta bancaria
            </p>
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

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-nrlx-surface border border-nrlx-border rounded-xl p-6">
              <h2 className="text-xs font-mono text-nrlx-muted tracking-wider mb-6">
                NUEVA SOLICITUD DE RETIRO
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-mono text-nrlx-muted tracking-wider block mb-1.5">
                    MONTO
                  </label>
                  <input
                    type="number"
                    value={monto}
                    onChange={(e) => setMonto(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-nrlx-card border border-nrlx-border rounded-lg px-4 py-3 text-nrlx-text font-mono text-lg placeholder:text-nrlx-muted/40 focus:border-nrlx-accent/40 focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-mono text-nrlx-muted tracking-wider block mb-1.5">
                    CONCEPTO
                  </label>
                  <input
                    type="text"
                    value={concepto}
                    onChange={(e) => setConcepto(e.target.value)}
                    placeholder="Descripcion del retiro"
                    className="w-full bg-nrlx-card border border-nrlx-border rounded-lg px-4 py-3 text-sm text-nrlx-text placeholder:text-nrlx-muted/40 focus:border-nrlx-accent/40 focus:outline-none transition-colors"
                  />
                </div>

                <div className="bg-nrlx-card/50 border border-nrlx-border/50 rounded-lg p-3">
                  <p className="text-[10px] font-mono text-nrlx-warning">
                    Las solicitudes requieren aprobacion del administrador antes de procesarse.
                  </p>
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={!monto || submitting || status === 'loading'}
                  className={`w-full py-3 rounded-lg text-sm font-medium transition-all ${
                    submitting
                      ? 'bg-nrlx-accent/20 text-nrlx-accent border border-nrlx-accent/30'
                      : !monto
                      ? 'bg-nrlx-card text-nrlx-muted border border-nrlx-border cursor-not-allowed'
                      : 'bg-nrlx-accent/10 text-nrlx-accent border border-nrlx-accent/30 hover:bg-nrlx-accent/20'
                  }`}
                >
                  {submitting ? 'Enviando...' : 'Enviar solicitud'}
                </button>
              </div>
            </div>

            <div className="bg-nrlx-surface border border-nrlx-border rounded-xl p-6">
              <h2 className="text-xs font-mono text-nrlx-muted tracking-wider mb-6">
                SOLICITUDES PENDIENTES
              </h2>

              {loading || status === 'loading' ? (
                <div className="text-center py-12">
                  <p className="text-sm text-nrlx-muted">Cargando solicitudes...</p>
                </div>
              ) : solicitudesPendientes.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-sm text-nrlx-muted">Sin solicitudes pendientes</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {solicitudesPendientes.map((sol) => (
                    <div
                      key={sol.id_solicitud}
                      className="bg-nrlx-card border border-nrlx-border/50 rounded-lg p-4"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <p className="text-[10px] font-mono text-nrlx-muted">
                          {sol.id_solicitud}
                        </p>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-nrlx-warning/10 text-nrlx-warning">
                          {sol.estatus}
                        </span>
                      </div>
                      <p className="text-lg font-mono text-nrlx-text">
                        {formatMoney(sol.monto, sol.moneda)}
                      </p>
                      <p className="text-xs text-nrlx-muted mt-1">{sol.concepto || '—'}</p>
                      <p className="text-[10px] font-mono text-nrlx-muted mt-2">
                        {new Date(sol.fecha_solicitud).toLocaleDateString('es-MX')}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
