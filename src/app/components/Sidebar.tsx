'use client'

import { useState } from 'react'
import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ArrowLeftRight, FileText, Gavel, Home, Landmark, User } from 'lucide-react'
import { TransferFlow } from './TransferFlow'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: Home },
  { href: '/cuentas', label: 'Cuentas', icon: Landmark },
  { href: '/transferir', label: 'Transferir', icon: ArrowLeftRight },
  { href: '/solicitudes', label: 'Solicitudes', icon: FileText },
  { href: '/regulatorio', label: 'Regulatorio', icon: Gavel },
  { href: '/perfil', label: 'Perfil', icon: User },
]

export function Sidebar() {
  const [transferDrawerOpen, setTransferDrawerOpen] = useState(false)
  const { data: session } = useSession()
  const pathname = usePathname()
  const initials = (session?.user?.name || 'NN')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || '')
    .join('')

  return (
    <>
      <aside className="hidden lg:flex fixed top-0 left-0 h-full w-64 bg-nrlx-surface border-r border-nrlx-border z-40 flex-col">
        <div className="px-6 py-6 border-b border-nrlx-border">
          <img
            src="https://pub-0096ef66aa784fc09207634c34c5baaa.r2.dev/Logos_neuralx_cloudfire/icono_neuralx_defense_blanco.png"
            alt="NeuralX"
            className="h-8 w-auto object-contain"
          />
          <p className="text-[10px] font-mono text-nrlx-muted tracking-[0.28em] mt-2">GLOBAL PORTAL</p>
        </div>

        <nav className="px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm border transition-colors ${
                  active
                    ? 'bg-[rgba(10,132,255,0.1)] text-nrlx-accent border-nrlx-accent/40'
                    : 'text-nrlx-muted hover:text-nrlx-text hover:bg-nrlx-el border-transparent'
                }`}
              >
                <Icon size={16} />
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="mt-auto px-4 pb-4 space-y-3">
          <div className="border border-nrlx-border bg-nrlx-el rounded-xl px-3 py-2">
            <p className="text-[10px] font-mono tracking-wider text-nrlx-muted mb-2">SISTEMA OPERATIVO</p>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-nrlx-success animate-pulse-dot" />
              <span className="text-[11px] text-nrlx-text">Online</span>
            </div>
          </div>

          <div className="border border-nrlx-border bg-nrlx-el rounded-xl p-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-nrlx-el2 border border-nrlx-border flex items-center justify-center text-xs font-mono text-nrlx-text">
                {initials || 'NN'}
              </div>
              <div className="min-w-0">
                <p className="text-xs text-nrlx-text truncate">{session?.user?.name || 'Usuario'}</p>
                <p className="text-[10px] font-mono text-nrlx-muted truncate mt-0.5">
                  {session?.user?.upn || session?.user?.email}
                </p>
              </div>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="mt-3 w-full text-xs text-nrlx-muted hover:text-nrlx-danger py-1.5 rounded-lg border border-nrlx-border hover:border-nrlx-danger/40 transition-colors"
            >
              Cerrar sesion
            </button>
          </div>
        </div>
      </aside>

      <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-16 rounded-t-2xl bg-nrlx-surface border-t border-nrlx-border z-50">
        <div className="h-full grid grid-cols-4 gap-2 px-3">
          <Link
            href="/dashboard"
            className={`mt-2 h-12 rounded-xl flex items-center justify-center gap-2 text-xs font-medium transition-colors ${
              pathname.startsWith('/dashboard')
                ? 'text-nrlx-accent bg-nrlx-accent/10'
                : 'text-nrlx-muted'
            }`}
          >
            <Home size={17} />
            Inicio
          </Link>
          <button
            onClick={() => setTransferDrawerOpen(true)}
            className="mt-2 h-12 rounded-xl flex items-center justify-center gap-2 text-xs font-medium text-nrlx-muted hover:text-nrlx-accent hover:bg-nrlx-accent/10 transition-colors"
          >
            <ArrowLeftRight size={17} />
            Transferir
          </button>
          <Link
            href="/solicitudes"
            className={`mt-2 h-12 rounded-xl flex items-center justify-center gap-2 text-xs font-medium transition-colors ${
              pathname.startsWith('/solicitudes')
                ? 'text-nrlx-accent bg-nrlx-accent/10'
                : 'text-nrlx-muted'
            }`}
          >
            <FileText size={17} />
            Solicitudes
          </Link>
          <Link
            href="/perfil"
            className={`mt-2 h-12 rounded-xl flex items-center justify-center gap-2 text-xs font-medium transition-colors ${
              pathname.startsWith('/perfil')
                ? 'text-nrlx-accent bg-nrlx-accent/10'
                : 'text-nrlx-muted'
            }`}
          >
            <User size={17} />
            Perfil
          </Link>
        </div>
      </nav>
      <TransferFlow open={transferDrawerOpen} onClose={() => setTransferDrawerOpen(false)} />

      {session?.user && (
        <div className="lg:hidden fixed top-3 right-3 z-40 bg-nrlx-el border border-nrlx-border rounded-full w-9 h-9 flex items-center justify-center text-[10px] font-mono text-nrlx-text">
          {initials || 'NN'}
        </div>
      )}
    </>
  )
}
