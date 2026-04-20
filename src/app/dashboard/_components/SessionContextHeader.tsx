'use client'

interface SessionContextHeaderProps {
  name?: string | null
  upn?: string | null
  roleLabel?: string
}

export function SessionContextHeader({ name, upn }: SessionContextHeaderProps) {
  return (
    <section className="rounded-2xl border border-nrlx-border bg-nrlx-surface p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <img
            src="https://pub-0096ef66aa784fc09207634c34c5baaa.r2.dev/perfil_nrlx-net-logo2.png"
            alt={name || 'Perfil'}
            className="w-11 h-11 rounded-full border border-nrlx-border object-cover shrink-0"
          />
          <div className="min-w-0">
            <p className="text-sm text-nrlx-text truncate">{name || 'Operador'}</p>
            <p className="text-[11px] text-nrlx-muted truncate">{upn || 'sin-upn'}</p>
          </div>
        </div>
      </div>
    </section>
  )
}

