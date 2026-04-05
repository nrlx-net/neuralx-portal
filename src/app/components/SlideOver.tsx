'use client'

import { ReactNode } from 'react'
import { X } from 'lucide-react'

interface SlideOverProps {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: ReactNode
  footer?: ReactNode
}

export function SlideOver({
  open,
  onClose,
  title,
  description,
  children,
  footer,
}: SlideOverProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[95]">
      <button
        className="absolute inset-0 bg-black/70"
        onClick={onClose}
        aria-label="Cerrar panel"
      />
      <section className="absolute inset-0 lg:inset-y-0 lg:left-auto lg:right-0 lg:w-[560px] border-l border-nrlx-border bg-nrlx-surface flex flex-col animate-fade-up">
        <header className="px-5 py-4 border-b border-nrlx-border flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-medium text-nrlx-text">{title}</h2>
            {description && <p className="text-xs text-nrlx-muted mt-1">{description}</p>}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full border border-nrlx-border bg-nrlx-el flex items-center justify-center text-nrlx-muted hover:text-nrlx-text"
          >
            <X size={14} />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
        {footer && <footer className="px-5 py-4 border-t border-nrlx-border bg-nrlx-surface">{footer}</footer>}
      </section>
    </div>
  )
}

