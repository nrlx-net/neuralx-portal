'use client'

interface DrawerTransferProps {
  open: boolean
  onClose: () => void
}

export function DrawerTransfer({ open, onClose }: DrawerTransferProps) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[70]">
      <button className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="absolute bottom-0 left-0 right-0 rounded-t-2xl border border-nrlx-border bg-nrlx-surface p-4 animate-fade-up">
        <div className="w-10 h-1 bg-nrlx-el2 rounded-full mx-auto mb-4" />
        <h3 className="text-sm font-medium text-nrlx-text mb-2">Transferencia</h3>
        <p className="text-sm text-nrlx-muted mb-4">
          Drawer de compatibilidad habilitado como fallback.
        </p>
        <button
          onClick={onClose}
          className="w-full py-2 rounded-xl border border-nrlx-border bg-nrlx-el text-sm text-nrlx-text"
        >
          Cerrar
        </button>
      </div>
    </div>
  )
}
