'use client'

import { useState } from 'react'
import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: '◈' },
  { href: '/cuentas', label: 'Cuentas', icon: '◇' },
  { href: '/movimientos', label: 'Movimientos', icon: '↔' },
  { href: '/solicitudes', label: 'Solicitudes', icon: '◎' },
]

export function Sidebar() {
  const [open, setOpen] = useState(false)
  const { data: session } = useSession()
  const pathname = usePathname()

  return (
    <>
      {/* Hamburger button */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed top-4 left-4 z-50 w-10 h-10 flex items-center justify-center rounded-lg bg-nrlx-card border border-nrlx-border hover:border-nrlx-accent transition-colors lg:hidden"
      >
        <span className="text-nrlx-accent text-lg">{open ? '✕' : '☰'}</span>
      </button>

      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/60 z-30 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-nrlx-surface border-r border-nrlx-border z-40 transform transition-transform duration-200 ${
          open ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0`}
      >
        {/* Logo */}
        <div className="px-6 py-6 border-b border-nrlx-border">
          <h1 className="font-display text-lg tracking-widest text-nrlx-accent">
            NEURALX
          </h1>
          <p className="text-[10px] font-mono text-nrlx-muted tracking-[0.3em] mt-0.5">
            GLOBAL PORTAL
          </p>
        </div>

        {/* Nav */}
        <nav className="px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const active = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  active
                    ? 'bg-nrlx-accent/10 text-nrlx-accent border border-nrlx-accent/20'
                    : 'text-nrlx-muted hover:text-nrlx-text hover:bg-nrlx-card border border-transparent'
                }`}
              >
                <span className="font-mono text-xs w-5 text-center">{item.icon}</span>
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* User info */}
        {session?.user && (
          <div className="absolute bottom-0 left-0 right-0 px-4 py-4 border-t border-nrlx-border">
            <p className="text-xs text-nrlx-text truncate">{session.user.name}</p>
            <p className="text-[10px] font-mono text-nrlx-muted truncate mt-0.5">
              {session.user.upn || session.user.email}
            </p>
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="mt-3 w-full text-xs text-nrlx-muted hover:text-nrlx-danger py-1.5 rounded border border-nrlx-border hover:border-nrlx-danger/40 transition-colors"
            >
              Cerrar sesion
            </button>
          </div>
        )}
      </aside>
    </>
  )
}
