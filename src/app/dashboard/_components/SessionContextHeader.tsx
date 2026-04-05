'use client'

import { ShieldCheck, User } from 'lucide-react'

interface SessionContextHeaderProps {
  name?: string | null
  upn?: string | null
  roleLabel: string
}

export function SessionContextHeader({ name, upn, roleLabel }: SessionContextHeaderProps) {
  const initials = (name || 'NN')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((x) => x[0]?.toUpperCase() || '')
    .join('')

  return (
    <section className="rounded-2xl border border-nrlx-border bg-nrlx-surface p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 rounded-full border border-nrlx-border bg-nrlx-el flex items-center justify-center text-xs font-mono text-nrlx-text shrink-0">
            {initials || 'NN'}
          </div>
          <div className="min-w-0">
            <p className="text-sm text-nrlx-text truncate">{name || 'Operador'}</p>
            <p className="text-[11px] text-nrlx-muted truncate">{upn || 'sin-upn'}</p>
          </div>
        </div>
        <div className="inline-flex items-center gap-1 rounded-full border border-nrlx-border bg-nrlx-el px-2.5 py-1 text-[10px] text-nrlx-muted shrink-0">
          <ShieldCheck size={12} className="text-nrlx-accent" />
          {roleLabel}
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2 text-[11px] text-nrlx-muted">
        <User size={12} />
        Contexto de sesión activo en entidad operativa NeuralX Global
      </div>
    </section>
  )
}

