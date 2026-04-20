'use client'

import { ReactNode, useEffect, useMemo, useRef, useState } from 'react'
import { api, CredencialOperacionesEstado } from '@/lib/api'
import { CheckCircle2, QrCode, RefreshCw, ShieldAlert, ShieldCheck } from 'lucide-react'

type IssuanceStep = 'idle' | 'qr' | 'retrieved' | 'success' | 'error'

function mapStatusToStep(status: CredencialOperacionesEstado['status'] | undefined): IssuanceStep {
  if (!status) return 'idle'
  if (status === 'created') return 'qr'
  if (status === 'request_retrieved') return 'retrieved'
  if (status === 'issuance_successful') return 'success'
  if (status === 'issuance_error') return 'error'
  return 'idle'
}

export default function CredencialesOperacionesPage() {
  const [creating, setCreating] = useState(false)
  const [polling, setPolling] = useState(false)
  const [state, setState] = useState<string | null>(null)
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [deepLink, setDeepLink] = useState<string | null>(null)
  const [status, setStatus] = useState<CredencialOperacionesEstado['status'] | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const step = useMemo(() => mapStatusToStep(status || undefined), [status])

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  async function createIssuance() {
    try {
      setCreating(true)
      setErrorMessage(null)
      const res = await api.emitirCredencialOperaciones()
      setState(res.state)
      setQrCode(res.qrCode || null)
      setDeepLink(res.url || null)
      setStatus(res.status || 'created')
      startPolling(res.state)
    } catch (err: any) {
      setErrorMessage(err.message || 'No se pudo iniciar la emisión')
    } finally {
      setCreating(false)
    }
  }

  function startPolling(targetState: string) {
    if (intervalRef.current) clearInterval(intervalRef.current)
    setPolling(true)

    intervalRef.current = setInterval(async () => {
      try {
        const s = await api.estadoCredencialOperaciones(targetState)
        setStatus(s.status)
        if (s.status === 'issuance_error') {
          setErrorMessage(s.error_message || s.error_code || 'Error de emisión')
        }
        if (s.status === 'issuance_successful' || s.status === 'issuance_error') {
          if (intervalRef.current) clearInterval(intervalRef.current)
          intervalRef.current = null
          setPolling(false)
        }
      } catch (err: any) {
        setErrorMessage(err.message || 'No se pudo consultar estado')
      }
    }, 4000)
  }

  async function refreshStatus() {
    if (!state) return
    try {
      const s = await api.estadoCredencialOperaciones(state)
      setStatus(s.status)
      if (s.status === 'issuance_error') {
        setErrorMessage(s.error_message || s.error_code || 'Error de emisión')
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'No se pudo actualizar estado')
    }
  }

  return (
    <div className="max-w-3xl mx-auto animate-fade-up">
      <div className="mb-6">
        <h1 className="text-2xl font-medium text-nrlx-text">Credenciales</h1>
        <p className="text-xs text-nrlx-muted mt-1">
          Emisión de credencial corporativa (Verified ID)
        </p>
      </div>

      <section className="bg-nrlx-surface border border-nrlx-border rounded-2xl p-5 mb-5">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <button
            onClick={createIssuance}
            disabled={creating}
            className={`h-10 px-4 rounded-xl border text-sm ${
              creating
                ? 'border-nrlx-accent/30 bg-nrlx-accent/10 text-nrlx-accent'
                : 'border-nrlx-accent/40 bg-nrlx-accent/10 text-nrlx-accent hover:bg-nrlx-accent/20'
            }`}
          >
            {creating ? 'Generando...' : 'Emitir credencial'}
          </button>
          <button
            onClick={refreshStatus}
            disabled={!state}
            className="h-10 px-4 rounded-xl border border-nrlx-border bg-nrlx-el text-sm text-nrlx-text inline-flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw size={14} />
            Actualizar estado
          </button>
          {polling && (
            <span className="text-[11px] text-nrlx-muted inline-flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-nrlx-accent animate-pulse" />
              Consultando estado...
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-nrlx-border bg-nrlx-el p-4 min-h-[260px]">
            {qrCode ? (
              <div className="h-full flex flex-col items-center justify-center gap-3">
                <img src={qrCode} alt="QR emisión de credencial" className="w-52 h-52 rounded-lg bg-white p-2" />
                {deepLink && (
                  <a
                    href={deepLink}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-nrlx-accent underline"
                  >
                    Abrir en Authenticator
                  </a>
                )}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center">
                <QrCode size={30} className="text-nrlx-muted mb-2" />
                <p className="text-sm text-nrlx-muted">Aún no hay QR generado</p>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-nrlx-border bg-nrlx-el p-4">
            <p className="text-[11px] font-mono text-nrlx-muted mb-3">ESTADO DEL FLUJO</p>
            <StatusRow
              active={step === 'idle'}
              icon={<QrCode size={16} />}
              title="Reposo"
              subtitle="No hay solicitud activa"
            />
            <StatusRow
              active={step === 'qr'}
              icon={<QrCode size={16} />}
              title="QR generado"
              subtitle="Escanea o abre el enlace profundo"
            />
            <StatusRow
              active={step === 'retrieved'}
              icon={<ShieldCheck size={16} />}
              title="Solicitud abierta"
              subtitle="Authenticator recuperó la solicitud"
            />
            <StatusRow
              active={step === 'success'}
              icon={<CheckCircle2 size={16} />}
              title="Emisión exitosa"
              subtitle="Credencial emitida y registrada"
            />
            <StatusRow
              active={step === 'error'}
              icon={<ShieldAlert size={16} />}
              title="Error de emisión"
              subtitle={errorMessage || 'Revisa callback y reglas de contrato'}
            />
          </div>
        </div>
      </section>

      <section className="bg-nrlx-surface border border-nrlx-border rounded-2xl p-5">
        <p className="text-[11px] font-mono text-nrlx-muted mb-2">TRAZABILIDAD</p>
        <div className="text-xs text-nrlx-muted space-y-1">
          <p>State: <span className="text-nrlx-text">{state || '—'}</span></p>
          <p>Estatus: <span className="text-nrlx-text">{status || '—'}</span></p>
          {errorMessage && <p className="text-nrlx-danger">Error: {errorMessage}</p>}
        </div>
      </section>
    </div>
  )
}

function StatusRow({
  active,
  icon,
  title,
  subtitle,
}: {
  active: boolean
  icon: ReactNode
  title: string
  subtitle: string
}) {
  return (
    <div className={`rounded-lg border p-3 mb-2 ${active ? 'border-nrlx-accent/40 bg-nrlx-accent/10' : 'border-nrlx-border bg-nrlx-el'}`}>
      <div className="flex items-center gap-2 mb-1">
        <span className={active ? 'text-nrlx-accent' : 'text-nrlx-muted'}>{icon}</span>
        <p className={active ? 'text-sm text-nrlx-accent' : 'text-sm text-nrlx-text'}>{title}</p>
      </div>
      <p className="text-[11px] text-nrlx-muted">{subtitle}</p>
    </div>
  )
}

