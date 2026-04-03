'use client'

import { ReactNode } from 'react'
import { X } from 'lucide-react'

interface DrawerBaseProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  className?: string
}

export function DrawerBase({ open, onClose, title, children, className }: DrawerBaseProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[90]">
      <button className="absolute inset-0 bg-black/70" onClick={onClose} aria-label="Cerrar" />
      <div className={`absolute bottom-0 left-0 right-0 max-h-[90vh] overflow-y-auto rounded-t-2xl border border-nrlx-border bg-nrlx-surface p-4 animate-fade-up ${className || ''}`}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-nrlx-text">{title}</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full border border-nrlx-border bg-nrlx-el flex items-center justify-center text-nrlx-muted"
          >
            <X size={14} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

