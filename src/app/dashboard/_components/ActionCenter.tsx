'use client'

import { ComponentType } from 'react'
import Link from 'next/link'
import { ArrowLeftRight, Building2, RefreshCw, ShieldCheck, UserPlus } from 'lucide-react'

interface ActionCenterProps {
  onTransfer: () => void
  onData: () => void
  onInvite: () => void
  onRefresh: () => void
}

export function ActionCenter({
  onTransfer,
  onData,
  onInvite,
  onRefresh,
}: ActionCenterProps) {
  return (
    <section className="rounded-2xl border border-nrlx-border bg-nrlx-surface p-4">
      <p className="text-[11px] font-mono text-nrlx-muted mb-3">ACCIONES OPERATIVAS</p>
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-2">
        <ActionButton label="Transferir" icon={ArrowLeftRight} onClick={onTransfer} />
        <ActionButton label="Datos bancarios" icon={Building2} onClick={onData} />
        <ActionButton label="Invitar usuario" icon={UserPlus} onClick={onInvite} />
        <ActionButton label="Actualizar" icon={RefreshCw} onClick={onRefresh} />
        <Link
          href="/dashboard/credenciales-operaciones"
          className="h-11 rounded-xl border border-nrlx-border bg-nrlx-el text-sm text-nrlx-muted hover:text-nrlx-text inline-flex items-center justify-center gap-2"
        >
          <ShieldCheck size={14} />
          Credenciales
        </Link>
      </div>
    </section>
  )
}

function ActionButton({
  label,
  icon: Icon,
  onClick,
}: {
  label: string
  icon: ComponentType<{ size?: string | number }>
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="h-11 rounded-xl border border-nrlx-border bg-nrlx-el text-sm text-nrlx-muted hover:text-nrlx-text inline-flex items-center justify-center gap-2"
    >
      <Icon size={14} />
      {label}
    </button>
  )
}

