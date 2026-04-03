'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { signOut } from 'next-auth/react'
import { api, ProcesoRegulatorio, UsuarioSocio } from '@/lib/api'
import { Sidebar } from '../components/Sidebar'
import {
  BadgeCheck,
  ChevronRight,
  CreditCard,
  FileText,
  LogOut,
  QrCode,
  Shield,
  UserPlus,
  Wallet,
  Gavel,
  ReceiptText,
  LucideIcon,
} from 'lucide-react'

function formatDate(value?: string | null) {
  if (!value) return 'N/A'
  return new Date(value).toLocaleDateString('es-MX')
}

function initialsFrom(name?: string | null, email?: string | null) {
  const source = name || email || 'NN'
  return source
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((v) => v[0]?.toUpperCase() || '')
    .join('')
}

export default function PerfilPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<UsuarioSocio | null>(null)
  const [procesos, setProcesos] = useState<ProcesoRegulatorio[]>([])

  useEffect(() => {
    void load()
  }, [])

  async function load() {
    try {
      setLoading(true)
      setError(null)
      const [me, regs] = await Promise.all([api.getMe(), api.getRegulatorios('en_proceso')])
      setUser(me)
      setProcesos(regs.procesos || [])
    } catch (err: any) {
      setError(err.message || 'No se pudo cargar el perfil')
    } finally {
      setLoading(false)
    }
  }

  const revTag = useMemo(() => {
    const upn = user?.entra_id_upn || user?.email || ''
    return `@${upn.split('@')[0] || 'socio'}`
  }, [user?.entra_id_upn, user?.email])

  if (loading) {
    return (
      <div className="min-h-screen bg-nrlx-bg">
        <Sidebar />
        <main className="lg:ml-64 min-h-screen pb-20 lg:pb-0">
          <div className="p-4 sm:p-6 lg:p-8 max-w-2xl mx-auto space-y-4 animate-fade-up">
            <div className="h-44 rounded-2xl bg-nrlx-el border border-nrlx-border animate-pulse" />
            <div className="h-28 rounded-2xl bg-nrlx-el border border-nrlx-border animate-pulse" />
          </div>
        </main>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-nrlx-bg">
        <Sidebar />
        <main className="lg:ml-64 min-h-screen pb-20 lg:pb-0">
          <div className="p-4 sm:p-6 lg:p-8 max-w-2xl mx-auto">
            <div className="rounded-2xl border border-nrlx-danger/30 bg-nrlx-danger/10 p-4">
              <p className="text-sm text-nrlx-danger mb-2">{error}</p>
              <button onClick={load} className="rounded-lg border border-nrlx-danger/30 px-3 py-1.5 text-sm text-nrlx-danger">
                Reintentar
              </button>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-nrlx-bg">
      <Sidebar />
      <main className="lg:ml-64 min-h-screen pb-20 lg:pb-0">
        <div className="p-4 sm:p-6 lg:p-8 max-w-2xl mx-auto animate-fade-up space-y-4">
          <section className="rounded-2xl border border-nrlx-border bg-nrlx-surface p-5 text-center">
            <div className="w-20 h-20 mx-auto rounded-full bg-nrlx-accent/20 border border-nrlx-accent/30 flex items-center justify-center text-xl font-mono text-nrlx-text">
              {initialsFrom(user?.nombre_completo, user?.email)}
            </div>
            <div className="mt-2 inline-flex items-center rounded-full border border-nrlx-border bg-nrlx-el px-3 py-1 text-[11px] text-nrlx-muted">
              {user?.puesto || 'Socio'}
            </div>
            <h1 className="text-lg font-semibold text-nrlx-text mt-2">{user?.nombre_completo || 'Socio NeuralX'}</h1>
            <div className="mt-1 inline-flex items-center gap-2 text-sm text-nrlx-muted">
              <span>{revTag}</span>
              <QrCode size={14} />
            </div>
          </section>

          <section className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-nrlx-border bg-nrlx-surface p-3">
              <CreditCard size={16} className="text-nrlx-accent mb-2" />
              <p className="text-xs text-nrlx-text">Socio Activo</p>
              <p className="text-[11px] text-nrlx-muted">Desde {formatDate(user?.created_at || user?.fecha_conexion || null)}</p>
            </div>
            <div className="rounded-xl border border-nrlx-border bg-nrlx-surface p-3">
              <UserPlus size={16} className="text-nrlx-accent mb-2" />
              <p className="text-xs text-nrlx-text">Procesos Regulatorios</p>
              <p className="text-[11px] text-nrlx-muted">{procesos.length} activos</p>
            </div>
          </section>

          <MenuGroup
            items={[
              { icon: Wallet, label: 'Mis cuentas', href: '/cuentas' },
              { icon: FileText, label: 'Documentos', hint: 'Próximamente' },
              { icon: ReceiptText, label: 'Movimientos', href: '/movimientos' },
              { icon: BadgeCheck, label: 'Solicitudes', href: '/solicitudes' },
              { icon: Gavel, label: 'Regulatorio', href: '/regulatorio' },
            ]}
          />

          <MenuGroup
            items={[
              { icon: Shield, label: 'Seguridad', hint: 'Próximamente' },
              {
                icon: LogOut,
                label: 'Cerrar sesión',
                action: () => signOut({ callbackUrl: '/login' }),
                danger: true,
              },
            ]}
          />
        </div>
      </main>
    </div>
  )
}

function MenuGroup({
  items,
}: {
  items: Array<{
    icon: LucideIcon
    label: string
    href?: string
    hint?: string
    action?: () => void
    danger?: boolean
  }>
}) {
  return (
    <div className="rounded-xl border border-nrlx-border bg-nrlx-surface overflow-hidden">
      {items.map((item, idx) => {
        const Icon = item.icon
        const content = (
          <div
            className={`flex items-center justify-between px-3 py-3 transition-colors hover:bg-nrlx-el ${
              item.danger ? 'text-nrlx-danger' : 'text-nrlx-text'
            }`}
          >
            <div className="flex items-center gap-3">
              <Icon size={16} className={item.danger ? 'text-nrlx-danger' : 'text-nrlx-muted'} />
              <span className="text-sm">{item.label}</span>
              {item.hint && <span className="text-[10px] text-nrlx-muted">{item.hint}</span>}
            </div>
            <ChevronRight size={15} className="text-nrlx-muted" />
          </div>
        )

        return (
          <div key={item.label}>
            {item.href ? (
              <Link href={item.href}>{content}</Link>
            ) : (
              <button onClick={item.action} className="w-full text-left">
                {content}
              </button>
            )}
            {idx < items.length - 1 && <div className="h-px bg-nrlx-border" />}
          </div>
        )
      })}
    </div>
  )
}
