'use client'

import { useEffect, useMemo, useState } from 'react'
import { api, CuentaBancaria, CuentaBancariaVinculada } from '@/lib/api'
import { Building2, Copy, Plus } from 'lucide-react'
import { DrawerBase } from './DrawerBase'
import { AddAccountDrawer } from './AddAccountDrawer'
import { formatearMoneda } from '@/lib/balance'

interface BankDataSheetProps {
  open: boolean
  onClose: () => void
}

export function BankDataSheet({ open, onClose }: BankDataSheetProps) {
  const [cuentasInternas, setCuentasInternas] = useState<CuentaBancaria[]>([])
  const [cuentasBancarias, setCuentasBancarias] = useState<CuentaBancariaVinculada[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [addOpen, setAddOpen] = useState(false)

  useEffect(() => {
    if (open) void loadData()
  }, [open])

  async function loadData() {
    try {
      setLoading(true)
      setError(null)
      const [internasRes, bancariasRes] = await Promise.all([
        api.getCuentas(),
        api.getCuentasBancariasVinculadas(),
      ])
      setCuentasInternas(internasRes.cuentas)
      setCuentasBancarias(bancariasRes.cuentas)
    } catch (err: any) {
      setError(err.message || 'No se pudieron cargar tus datos bancarios')
    } finally {
      setLoading(false)
    }
  }

  async function copyValue(value: string, key: string) {
    try {
      await navigator.clipboard.writeText(value)
      setCopiedKey(key)
      window.setTimeout(() => setCopiedKey((curr) => (curr === key ? null : curr)), 2000)
    } catch {
      setCopiedKey(null)
    }
  }

  const hasData = useMemo(
    () => cuentasInternas.length > 0 || cuentasBancarias.length > 0,
    [cuentasInternas.length, cuentasBancarias.length]
  )

  return (
    <>
      <DrawerBase open={open} onClose={onClose} title="Mis datos bancarios">
        <p className="text-xs text-nrlx-muted mb-3">
          Comparte estos datos para recibir transferencias
        </p>

        {loading ? (
          <div className="space-y-2">
            <div className="h-20 rounded-xl bg-nrlx-el animate-pulse" />
            <div className="h-20 rounded-xl bg-nrlx-el animate-pulse" />
          </div>
        ) : error ? (
          <div className="rounded-xl border border-nrlx-danger/30 bg-nrlx-danger/10 p-3">
            <p className="text-xs text-nrlx-danger mb-2">{error}</p>
            <button onClick={loadData} className="text-xs text-nrlx-danger underline">
              Reintentar
            </button>
          </div>
        ) : !hasData ? (
          <p className="text-sm text-nrlx-muted py-6 text-center">
            Aún no tienes datos bancarios para mostrar.
          </p>
        ) : (
          <>
            <p className="text-[11px] font-mono text-nrlx-muted mb-2">Cuentas internas</p>
            <div className="space-y-2 mb-4">
              {cuentasInternas.map((cuenta) => (
                <div key={cuenta.id_cuenta} className="rounded-xl border border-nrlx-border bg-nrlx-el p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm text-nrlx-text">{cuenta.id_cuenta}</p>
                      <p className="text-[11px] text-nrlx-muted">{cuenta.moneda}</p>
                    </div>
                    <button
                      onClick={() => copyValue(cuenta.id_cuenta, `id-${cuenta.id_cuenta}`)}
                      className={`h-8 px-3 rounded-lg border text-xs inline-flex items-center gap-1 ${
                        copiedKey === `id-${cuenta.id_cuenta}`
                          ? 'border-nrlx-success/40 bg-nrlx-success/10 text-nrlx-success'
                          : 'border-nrlx-border bg-nrlx-el2 text-nrlx-muted'
                      }`}
                    >
                      <Copy size={12} />
                      {copiedKey === `id-${cuenta.id_cuenta}` ? '✓ Copiado' : 'Copiar ID'}
                    </button>
                  </div>
                  <p className="text-xs text-nrlx-muted mt-2">Saldo disponible</p>
                  <p className="text-lg font-mono text-nrlx-text">
                    {formatearMoneda(cuenta.saldo_disponible, cuenta.moneda)}
                  </p>
                </div>
              ))}
            </div>

            <p className="text-[11px] font-mono text-nrlx-muted mb-2">Cuentas bancarias vinculadas</p>
            <div className="space-y-2">
              {cuentasBancarias.map((cuenta) => (
                <div key={cuenta.id_cuenta} className="rounded-xl border border-nrlx-border bg-nrlx-el p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Building2 size={14} className="text-nrlx-muted" />
                    <p className="text-sm text-nrlx-text">{cuenta.banco || 'Banco'}</p>
                  </div>
                  {cuenta.clabe && (
                    <CopyRow
                      label="CLABE"
                      value={cuenta.clabe}
                      copied={copiedKey === `clabe-${cuenta.id_cuenta}`}
                      onCopy={() => copyValue(cuenta.clabe!, `clabe-${cuenta.id_cuenta}`)}
                    />
                  )}
                  {cuenta.numero_cuenta && (
                    <CopyRow
                      label="Número de cuenta"
                      value={cuenta.numero_cuenta}
                      copied={copiedKey === `cta-${cuenta.id_cuenta}`}
                      onCopy={() => copyValue(cuenta.numero_cuenta!, `cta-${cuenta.id_cuenta}`)}
                    />
                  )}
                  {cuenta.swift_code && (
                    <p className="text-xs text-nrlx-muted mt-1">SWIFT: <span className="text-nrlx-text">{cuenta.swift_code}</span></p>
                  )}
                  <p className="text-xs text-nrlx-muted mt-1">País: <span className="text-nrlx-text">{cuenta.pais || 'México'}</span></p>
                </div>
              ))}
            </div>
          </>
        )}

        <button
          onClick={() => setAddOpen(true)}
          className="w-full mt-4 h-10 rounded-xl border border-nrlx-accent/40 bg-nrlx-accent/10 text-sm text-nrlx-accent inline-flex items-center justify-center gap-2"
        >
          <Plus size={14} />
          Añadir cuenta bancaria
        </button>
      </DrawerBase>
      <AddAccountDrawer open={addOpen} onClose={() => setAddOpen(false)} />
    </>
  )
}

function CopyRow({
  label,
  value,
  copied,
  onCopy,
}: {
  label: string
  value: string
  copied: boolean
  onCopy: () => void
}) {
  return (
    <div className="flex items-center justify-between gap-2 mt-1">
      <p className="text-xs text-nrlx-muted">
        {label}: <span className="text-nrlx-text">{value}</span>
      </p>
      <button
        onClick={onCopy}
        className={`h-7 px-2 rounded-lg border text-[11px] ${
          copied
            ? 'border-nrlx-success/40 bg-nrlx-success/10 text-nrlx-success'
            : 'border-nrlx-border bg-nrlx-el2 text-nrlx-muted'
        }`}
      >
        {copied ? '✓ Copiado' : 'Copiar'}
      </button>
    </div>
  )
}

