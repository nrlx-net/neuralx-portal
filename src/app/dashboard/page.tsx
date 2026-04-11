'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import { Bell, Check, RefreshCw } from 'lucide-react'
import { useDashboardData } from './_hooks/useDashboardData'
import { SessionContextHeader } from './_components/SessionContextHeader'
import { BalanceOverviewCard } from './_components/BalanceOverviewCard'
import { ActionCenter } from './_components/ActionCenter'
import { AccountsOverviewPanel } from './_components/AccountsOverviewPanel'
import { RecentActivityPanel } from './_components/RecentActivityPanel'
import { CredentialOperationsPanel } from './_components/CredentialOperationsPanel'
import { TransferFlow } from '../components/TransferFlow'
import { BankDataSheet } from '../components/BankDataSheet'
import { InviteAccessDrawer } from '../components/InviteAccessDrawer'
import { api, Notificacion } from '@/lib/api'

function roleLabelFromUpn(upn?: string | null) {
  const value = (upn || '').toLowerCase().trim()
  if (value === 'malvarez@neuralxglobal.net' || value === 'neuralx@neuralxglobal.net') {
    return 'Administrador global'
  }
  return 'Operador institucional'
}

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const [transferOpen, setTransferOpen] = useState(false)
  const [bankDataOpen, setBankDataOpen] = useState(false)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([])
  const [noLeidas, setNoLeidas] = useState(0)
  const [loadingNotificaciones, setLoadingNotificaciones] = useState(false)
  const ready = status === 'authenticated'

  const { cuentas, transacciones, solicitudes, balance, loading, error, loadData } = useDashboardData(ready)
  const roleLabel = useMemo(
    () => roleLabelFromUpn(session?.user?.upn || session?.user?.email || null),
    [session?.user?.email, session?.user?.upn]
  )

  useEffect(() => {
    if (!ready) return

    const loadNotificaciones = async () => {
      try {
        setLoadingNotificaciones(true)
        const data = await api.getNotificaciones()
        setNotificaciones(data.notificaciones || [])
        setNoLeidas(Number(data.no_leidas || 0))
      } catch (err) {
        console.error('Error cargando notificaciones:', err)
      } finally {
        setLoadingNotificaciones(false)
      }
    }

    void loadNotificaciones()
  }, [ready])

  const marcarNotificacion = async (id: number) => {
    try {
      await api.marcarNotificacionLeida(id)
      setNotificaciones((prev) => prev.map((item) => (
        item.id_notificacion === id ? { ...item, leida: true } : item
      )))
      setNoLeidas((prev) => Math.max(prev - 1, 0))
    } catch (err) {
      console.error('Error marcando notificacion:', err)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="max-w-6xl mx-auto space-y-4 animate-fade-up">
        <div className="h-24 rounded-2xl bg-nrlx-el animate-pulse" />
        <div className="h-36 rounded-2xl bg-nrlx-el animate-pulse" />
        <div className="h-24 rounded-2xl bg-nrlx-el animate-pulse" />
        <div className="h-64 rounded-2xl bg-nrlx-el animate-pulse" />
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto animate-fade-up">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl md:text-2xl font-medium text-nrlx-text">Panel de operaciones</h1>
        <button
          onClick={() => void loadData()}
          className="h-9 px-3 rounded-xl border border-nrlx-border bg-nrlx-el text-xs text-nrlx-muted inline-flex items-center gap-2"
        >
          <RefreshCw size={13} />
          Actualizar
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-nrlx-danger/30 bg-nrlx-danger/10 px-3 py-2 text-xs text-nrlx-danger">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 space-y-4">
          <SessionContextHeader
            name={session?.user?.name}
            upn={session?.user?.upn || session?.user?.email}
            roleLabel={roleLabel}
          />
          <BalanceOverviewCard
            totalMXN={balance.total_mxn}
            totalDisponibleMXN={balance.total_disponible_mxn}
            totalRetenidoMXN={balance.total_retenido_mxn}
          />
          <ActionCenter
            onTransfer={() => setTransferOpen(true)}
            onData={() => setBankDataOpen(true)}
            onInvite={() => setInviteOpen(true)}
            onRefresh={() => void loadData()}
          />
          <RecentActivityPanel transacciones={transacciones} />
        </div>

        <div className="space-y-4">
          <CredentialOperationsPanel onInvite={() => setInviteOpen(true)} />
          <section className="rounded-2xl border border-nrlx-border bg-nrlx-surface p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] font-mono text-nrlx-muted inline-flex items-center gap-1">
                <Bell size={12} />
                NOTIFICACIONES
              </p>
              <span className="rounded-full border border-nrlx-border bg-nrlx-el px-2 py-0.5 text-[10px] text-nrlx-text">
                {noLeidas} sin leer
              </span>
            </div>
            <div className="space-y-2">
              {loadingNotificaciones && (
                <p className="text-xs text-nrlx-muted">Cargando notificaciones...</p>
              )}
              {!loadingNotificaciones && notificaciones.length === 0 && (
                <p className="text-xs text-nrlx-muted">No hay notificaciones.</p>
              )}
              {!loadingNotificaciones && notificaciones.slice(0, 5).map((item) => (
                <article
                  key={item.id_notificacion}
                  className="rounded-xl border border-nrlx-border bg-nrlx-el p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm text-nrlx-text">{item.titulo}</p>
                      <p className="text-xs text-nrlx-muted mt-1 line-clamp-2">{item.mensaje}</p>
                    </div>
                    {!item.leida && (
                      <button
                        onClick={() => void marcarNotificacion(item.id_notificacion)}
                        className="h-7 w-7 rounded-lg border border-nrlx-border bg-nrlx-surface inline-flex items-center justify-center text-nrlx-muted hover:text-nrlx-text"
                        title="Marcar como leida"
                      >
                        <Check size={12} />
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </section>
          <section className="rounded-2xl border border-nrlx-border bg-nrlx-surface p-4">
            <p className="text-[11px] font-mono text-nrlx-muted mb-2">SOLICITUDES EN CURSO</p>
            <p className="text-2xl font-mono text-nrlx-text">{solicitudes.length}</p>
            <p className="text-xs text-nrlx-muted mb-3">Pendientes de revisión o ejecución</p>
            <Link
              href="/solicitudes"
              className="h-10 rounded-xl border border-nrlx-border bg-nrlx-el text-sm text-nrlx-muted hover:text-nrlx-text inline-flex items-center justify-center w-full"
            >
              Ir a solicitudes
            </Link>
          </section>
          <AccountsOverviewPanel cuentas={cuentas} />
        </div>
      </div>

      <TransferFlow open={transferOpen} onClose={() => setTransferOpen(false)} />
      <BankDataSheet open={bankDataOpen} onClose={() => setBankDataOpen(false)} />
      <InviteAccessDrawer open={inviteOpen} onClose={() => setInviteOpen(false)} />
    </div>
  )
}

