'use client'

import { useState } from 'react'
import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  ArrowLeftRight,
  FileText,
  Gavel,
  Home,
  Landmark,
  Menu,
  ShieldCheck,
  User,
  X,
} from 'lucide-react'
import { TransferFlow } from './TransferFlow'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: Home },
  { href: '/cuentas', label: 'Cuentas', icon: Landmark },
  { href: '/transferir', label: 'Transferir', icon: ArrowLeftRight },
  { href: '/transferir', label: 'Transferencias', icon: FileText },
  { href: '/regulatorio', label: 'Regulatorio', icon: Gavel },
  { href: '/dashboard/credenciales-operaciones', label: 'Credenciales VC', icon: ShieldCheck },
  { href: '/perfil', label: 'Perfil', icon: User },
]

export function Sidebar() {
  const [transferDrawerOpen, setTransferDrawerOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { data: session } = useSession()
  const pathname = usePathname()

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
              <img
                src="https://pub-0096ef66aa784fc09207634c34c5baaa.r2.dev/perfil_nrlx-net-logo2.png"
                alt={session?.user?.name || 'Perfil'}
                className="w-10 h-10 rounded-full border border-nrlx-border object-cover"
              />
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
              Cerrar sesión
            </button>
          </div>
        </div>
      </aside>

      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 h-14 border-b border-nrlx-border bg-nrlx-surface/95 backdrop-blur-md px-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img
            src="https://pub-0096ef66aa784fc09207634c34c5baaa.r2.dev/Logos_neuralx_cloudfire/icono_neuralx_defense_blanco.png"
            alt="NeuralX"
            className="h-6 w-auto object-contain"
          />
          <p className="text-[10px] font-mono text-nrlx-muted tracking-[0.2em]">OPERACIONES</p>
        </div>
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="w-9 h-9 rounded-full border border-nrlx-border bg-nrlx-el flex items-center justify-center text-nrlx-text"
        >
          <Menu size={16} />
        </button>
      </header>

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
            href="/transferir"
            className={`mt-2 h-12 rounded-xl flex items-center justify-center gap-2 text-xs font-medium transition-colors ${
              pathname.startsWith('/transferir') || pathname.startsWith('/solicitudes')
                ? 'text-nrlx-accent bg-nrlx-accent/10'
                : 'text-nrlx-muted'
            }`}
          >
            <FileText size={17} />
            Transferencias
          </Link>
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="mt-2 h-12 rounded-xl flex items-center justify-center gap-2 text-xs font-medium text-nrlx-muted"
          >
            <Menu size={17} />
            Menú
          </button>
        </div>
      </nav>

      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-[90]">
          <button className="absolute inset-0 bg-black/70" onClick={() => setMobileMenuOpen(false)} />
          <aside className="absolute right-0 top-0 h-full w-[86%] max-w-[320px] border-l border-nrlx-border bg-nrlx-surface p-4">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-nrlx-text">Navegación</p>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="w-8 h-8 rounded-full border border-nrlx-border bg-nrlx-el flex items-center justify-center text-nrlx-muted"
              >
                <X size={14} />
              </button>
            </div>
            <nav className="space-y-2 mb-4">
              {navItems.map((item) => {
                const Icon = item.icon
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm ${
                      active
                        ? 'border-nrlx-accent/40 bg-nrlx-accent/10 text-nrlx-accent'
                        : 'border-nrlx-border bg-nrlx-el text-nrlx-muted'
                    }`}
                  >
                    <Icon size={14} />
                    {item.label}
                  </Link>
                )
              })}
            </nav>
            <div className="rounded-xl border border-nrlx-border bg-nrlx-el p-3">
              <p className="text-xs text-nrlx-text truncate">{session?.user?.name || 'Usuario'}</p>
              <p className="text-[10px] text-nrlx-muted truncate mt-1">{session?.user?.upn || session?.user?.email}</p>
              <button
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="mt-3 w-full h-9 rounded-lg border border-nrlx-border bg-nrlx-el2 text-xs text-nrlx-muted"
              >
                Cerrar sesión
              </button>
            </div>
          </aside>
        </div>
      )}

      <TransferFlow open={transferDrawerOpen} onClose={() => setTransferDrawerOpen(false)} />
    </>
  )
}

