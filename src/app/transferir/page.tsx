'use client'

import { Sidebar } from '../components/Sidebar'
import { ArrowLeftRight } from 'lucide-react'

export default function TransferirPage() {
  return (
    <div className="min-h-screen bg-nrlx-bg">
      <Sidebar />
      <main className="lg:ml-64 min-h-screen pt-16 lg:pt-0 pb-20 lg:pb-0">
        <div className="p-4 sm:p-6 lg:p-8 max-w-2xl mx-auto">
          <div className="bg-nrlx-surface border border-nrlx-border rounded-2xl p-6 animate-fade-up">
            <div className="w-10 h-10 rounded-full border border-nrlx-border bg-nrlx-el flex items-center justify-center mb-3 text-nrlx-accent">
              <ArrowLeftRight size={18} />
            </div>
            <h1 className="text-xl text-nrlx-text mb-2">Transferir</h1>
            <p className="text-sm text-nrlx-muted">
              La experiencia dedicada de transferencias esta disponible desde el acceso rapido en Dashboard y en la navegacion inferior movil.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
