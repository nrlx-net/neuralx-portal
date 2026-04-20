'use client'

import Link from 'next/link'
import { ShieldCheck, UserPlus } from 'lucide-react'

interface CredentialOperationsPanelProps {
  onInvite: () => void
}

export function CredentialOperationsPanel({ onInvite }: CredentialOperationsPanelProps) {
  return (
    <section className="rounded-2xl border border-nrlx-border bg-nrlx-surface p-4">
      <p className="text-[11px] font-mono text-nrlx-muted mb-2">CREDENCIALES</p>
      <p className="text-xs text-nrlx-muted mb-3">
        Emite credenciales y gestiona usuarios.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <Link
          href="/dashboard/credenciales-operaciones"
          className="h-10 rounded-xl border border-nrlx-accent/40 bg-nrlx-accent/10 text-sm text-nrlx-accent inline-flex items-center justify-center gap-2"
        >
          <ShieldCheck size={14} />
          Emitir credencial
        </Link>
        <button
          onClick={onInvite}
          className="h-10 rounded-xl border border-nrlx-border bg-nrlx-el text-sm text-nrlx-muted hover:text-nrlx-text inline-flex items-center justify-center gap-2"
        >
          <UserPlus size={14} />
          Invitar usuario
        </button>
      </div>
    </section>
  )
}

