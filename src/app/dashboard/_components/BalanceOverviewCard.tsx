'use client'

import { WalletCards } from 'lucide-react'
import { formatearMoneda } from '@/lib/balance'

interface BalanceOverviewCardProps {
  totalMXN: number
  totalDisponibleMXN: number
  totalRetenidoMXN: number
}

export function BalanceOverviewCard({
  totalMXN,
  totalDisponibleMXN,
  totalRetenidoMXN,
}: BalanceOverviewCardProps) {
  return (
    <section className="rounded-2xl border border-nrlx-border bg-nrlx-surface p-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-[11px] font-mono text-nrlx-muted tracking-wide">SALDO CONSOLIDADO</p>
          <p className="text-3xl md:text-4xl font-light font-mono text-nrlx-text mt-1">
            {formatearMoneda(totalMXN, 'MXN')}
          </p>
        </div>
        <div className="w-10 h-10 rounded-full border border-nrlx-border bg-nrlx-el flex items-center justify-center text-nrlx-accent">
          <WalletCards size={18} />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <StatPill label="Disponible" value={formatearMoneda(totalDisponibleMXN, 'MXN')} />
        <StatPill label="Retenido" value={formatearMoneda(totalRetenidoMXN, 'MXN')} />
      </div>
    </section>
  )
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-nrlx-border bg-nrlx-el px-3 py-2">
      <p className="text-[10px] text-nrlx-muted uppercase tracking-wide">{label}</p>
      <p className="text-sm font-mono text-nrlx-text mt-1">{value}</p>
    </div>
  )
}

