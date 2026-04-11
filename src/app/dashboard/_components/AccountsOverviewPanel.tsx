'use client'

import Link from 'next/link'
import { CuentaBancaria } from '@/lib/api'
import { formatearMoneda } from '@/lib/balance'

interface AccountsOverviewPanelProps {
  cuentas: CuentaBancaria[]
}

export function AccountsOverviewPanel({ cuentas }: AccountsOverviewPanelProps) {
  return (
    <section className="rounded-2xl border border-nrlx-border bg-nrlx-surface p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] font-mono text-nrlx-muted">CUENTAS RELEVANTES</p>
        <Link href="/cuentas" className="text-xs text-nrlx-accent hover:underline">
          Ver todas
        </Link>
      </div>
      <div className="space-y-2">
        {cuentas.map((c) => (
          <article key={c.id_cuenta} className="rounded-xl border border-nrlx-border bg-nrlx-el p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm text-nrlx-text">{c.id_cuenta}</p>
                <p className="text-[11px] text-nrlx-muted truncate">{c.titular || c.banco}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-mono text-nrlx-text">{formatearMoneda(c.saldo_disponible, c.moneda)}</p>
                <p className="text-[10px] text-nrlx-warning">
                  Retenido {formatearMoneda(c.saldo_retenido ?? 0, c.moneda)}
                </p>
              </div>
            </div>
          </article>
        ))}
        {cuentas.length === 0 && (
          <p className="text-sm text-nrlx-muted py-4 text-center">Sin cuentas internas registradas.</p>
        )}
      </div>
    </section>
  )
}

