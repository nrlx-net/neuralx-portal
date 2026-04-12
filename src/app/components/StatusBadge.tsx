'use client'

type StatusBadgeProps = {
  status: string
  className?: string
}

const STYLES: Record<string, string> = {
  pending: 'bg-amber-500/15 text-amber-200 border-amber-500/35',
  completed: 'bg-emerald-500/15 text-emerald-200 border-emerald-500/35',
  rejected: 'bg-red-500/15 text-red-200 border-red-500/35',
}

const LABELS: Record<string, string> = {
  pending: 'Pendiente',
  completed: 'Completado',
  rejected: 'Rechazado',
}

export function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const key = (status || 'pending').toLowerCase().trim()
  const style = STYLES[key] || STYLES.pending
  const text = LABELS[key] || LABELS.pending

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-medium ${style} ${className}`}
    >
      {text}
    </span>
  )
}
