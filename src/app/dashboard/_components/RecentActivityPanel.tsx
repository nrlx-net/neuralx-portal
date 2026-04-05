'use client'

import Link from 'next/link'
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react'
import { Transaccion } from '@/lib/api'
import { formatearMoneda } from '@/lib/balance'

interface RecentActivityPanelProps {
  transacciones: Transaccion[]
}

export function RecentActivityPanel({ transacciones }: RecentActivityPanelProps) {
  return (
    <section className="rounded-2xl border border-nrlx-border bg-nrlx-surface p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] font-mono text-nrlx-muted">ACTIVIDAD RECIENTE</p>
        <Link href="/movimientos" className="text-xs text-nrlx-accent hover:underline">
          Ver movimientos
        </Link>
      </div>
      {transacciones.length === 0 ? (
        <p className="text-sm text-nrlx-muted py-4 text-center">Aún no hay movimientos registrados.</p>
      ) : (
        <div className="space-y-2">
          {transacciones.slice(0, 5).map((txn) => {
            const isOut = txn.tipo_transaccion === 'saliente'
            return (
              <article key={txn.id_transaccion} className="rounded-xl border border-nrlx-border bg-nrlx-el px-3 py-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={`w-7 h-7 rounded-full border border-nrlx-border flex items-center justify-center ${isOut ? 'text-nrlx-danger' : 'text-nrlx-success'}`}>
                      {isOut ? <ArrowUpRight size={13} /> : <ArrowDownLeft size={13} />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-nrlx-text truncate">{txn.concepto || 'Movimiento operativo'}</p>
                      <p className="text-[10px] text-nrlx-muted">
                        {new Date(txn.fecha_hora).toLocaleString('es-MX')}
                      </p>
                    </div>
                  </div>
                  <p className={`text-xs font-mono shrink-0 ${isOut ? 'text-nrlx-danger' : 'text-nrlx-success'}`}>
                    {isOut ? '-' : '+'}
                    {formatearMoneda(txn.monto, txn.moneda)}
                  </p>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}

