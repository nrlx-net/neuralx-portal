'use client'

import { DrawerBase } from './DrawerBase'

interface AddAccountDrawerProps {
  open: boolean
  onClose: () => void
}

export function AddAccountDrawer({ open, onClose }: AddAccountDrawerProps) {
  return (
    <DrawerBase open={open} onClose={onClose} title="Añadir cuenta bancaria">
      <div className="rounded-xl border border-nrlx-border bg-nrlx-el p-3">
        <p className="text-sm text-nrlx-text mb-1">Próximamente</p>
        <p className="text-xs text-nrlx-muted">
          El alta de nuevas cuentas bancarias se habilitará en el siguiente release.
        </p>
      </div>
      <button
        onClick={onClose}
        className="w-full mt-3 h-10 rounded-xl border border-nrlx-border bg-nrlx-el text-sm text-nrlx-text"
      >
        Cerrar
      </button>
    </DrawerBase>
  )
}

