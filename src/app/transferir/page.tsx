'use client'

import { Sidebar } from '../components/Sidebar'
import Link from 'next/link'
import { ArrowLeftRight, Building2, Landmark, ListChecks } from 'lucide-react'

export default function TransferirPage() {
  return (
    <div className="min-h-screen bg-nrlx-bg">
      <Sidebar />
      <main className="lg:ml-64 min-h-screen pt-16 lg:pt-0 pb-20 lg:pb-0">
        <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-4 animate-fade-up">
          <div className="bg-nrlx-surface border border-nrlx-border rounded-2xl p-6">
            <div className="w-10 h-10 rounded-full border border-nrlx-border bg-nrlx-el flex items-center justify-center mb-3 text-nrlx-accent">
              <ArrowLeftRight size={18} />
            </div>
            <h1 className="text-xl text-nrlx-text mb-2">Transferencias operativas</h1>
            <p className="text-sm text-nrlx-muted">
              Opera transferencias internas entre cuentas NXG con ejecución inmediata y transferencias externas a bancos con aprobación administrativa.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Link
              href="/solicitudes?modo=interna"
              className="rounded-xl border border-nrlx-border bg-nrlx-surface p-4 hover:border-nrlx-accent/40 transition-colors"
            >
              <Landmark size={16} className="text-nrlx-accent mb-2" />
              <p className="text-sm text-nrlx-text">Transferencia interna</p>
              <p className="text-xs text-nrlx-muted mt-1">Entre cuentas de socios dentro del sistema NXG.</p>
            </Link>
            <Link
              href="/solicitudes?modo=externa"
              className="rounded-xl border border-nrlx-border bg-nrlx-surface p-4 hover:border-nrlx-accent/40 transition-colors"
            >
              <Building2 size={16} className="text-nrlx-accent mb-2" />
              <p className="text-sm text-nrlx-text">Transferencia externa</p>
              <p className="text-xs text-nrlx-muted mt-1">A cuentas bancarias vinculadas con validación operativa.</p>
            </Link>
            <Link
              href="/solicitudes"
              className="rounded-xl border border-nrlx-border bg-nrlx-surface p-4 hover:border-nrlx-accent/40 transition-colors"
            >
              <ListChecks size={16} className="text-nrlx-accent mb-2" />
              <p className="text-sm text-nrlx-text">Pendientes e historial</p>
              <p className="text-xs text-nrlx-muted mt-1">Seguimiento de estatus, folio y detalle de cada movimiento.</p>
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
