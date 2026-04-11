'use client'

import { useEffect, useMemo, useState } from 'react'
import { AddRecipientForm } from './AddRecipientForm'
import { SlideOver } from './SlideOver'
import {
  ArrowLeftRight,
  Building2,
  Check,
  CheckCircle2,
  Globe,
  LucideIcon,
  Plus,
  Search,
} from 'lucide-react'
import {
  api,
  Beneficiario,
  CuentaBancaria,
  CuentaBancariaVinculada,
} from '@/lib/api'
import { formatearMoneda } from '@/lib/balance'

type MethodType = 'interna' | 'banco' | 'internacional'
type SelectionKind = 'beneficiario' | 'cuenta'

interface SelectedTarget {
  kind: SelectionKind
  method: MethodType
  id: string
  title: string
  subtitle: string
  nxgDestino?: string
  idCuentaBanco?: string
  beneficiarioId?: string
}

interface TransferFlowProps {
  open: boolean
  onClose: () => void
}

const BANK_ICON_FALLBACKS: Record<string, string> = {
  bbva: 'https://pub-0096ef66aa784fc09207634c34c5baaa.r2.dev/BBVA-icon.jpeg',
  banamex: 'https://pub-0096ef66aa784fc09207634c34c5baaa.r2.dev/Banamex-icon.jpeg',
  banregio: 'https://pub-0096ef66aa784fc09207634c34c5baaa.r2.dev/Banregio-icon.png',
}

function getBankIconUrl(cuenta: CuentaBancariaVinculada) {
  if (cuenta.icono_banco_url) return cuenta.icono_banco_url
  const bank = (cuenta.banco || '').toLowerCase()
  if (bank.includes('bbva')) return BANK_ICON_FALLBACKS.bbva
  if (bank.includes('banamex') || bank.includes('citibanamex')) return BANK_ICON_FALLBACKS.banamex
  if (bank.includes('banregio')) return BANK_ICON_FALLBACKS.banregio
  return null
}

export function TransferFlow({ open, onClose }: TransferFlowProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [beneficiarios, setBeneficiarios] = useState<Beneficiario[]>([])
  const [cuentasBancarias, setCuentasBancarias] = useState<CuentaBancariaVinculada[]>([])
  const [cuentasInternas, setCuentasInternas] = useState<CuentaBancaria[]>([])
  const [selected, setSelected] = useState<SelectedTarget | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newMode, setNewMode] = useState<'particular' | 'empresa'>('particular')
  const [monto, setMonto] = useState('')
  const [moneda, setMoneda] = useState('MXN')
  const [concepto, setConcepto] = useState('')
  const [originAccountId, setOriginAccountId] = useState<string>('')
  const [sending, setSending] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (open) {
      void loadData()
    }
  }, [open])

  async function loadData() {
    try {
      setLoading(true)
      setError(null)
      const [benRes, cuentasRes, internasRes] = await Promise.all([
        api.getBeneficiarios(),
        api.getCuentasBancariasVinculadas(),
        api.getCuentas(),
      ])
      setBeneficiarios(benRes.beneficiarios)
      setCuentasBancarias(cuentasRes.cuentas)
      setCuentasInternas(internasRes.cuentas)
      if (internasRes.cuentas[0]?.id_cuenta) {
        setOriginAccountId((prev) => prev || internasRes.cuentas[0].id_cuenta)
      }
    } catch (err: any) {
      setError(err.message || 'No se pudo cargar la información de transferencia')
    } finally {
      setLoading(false)
    }
  }

  function resetAndClose() {
    setStep(1)
    setSelected(null)
    setMonto('')
    setMoneda('MXN')
    setConcepto('')
    setOriginAccountId('')
    setSuccess(false)
    setShowAddForm(false)
    setQuery('')
    onClose()
  }

  const filteredBeneficiarios = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return beneficiarios
    return beneficiarios.filter((b) => {
      const name = `${b.nombre} ${b.apellidos || ''}`.toLowerCase()
      return name.includes(q) || (b.clabe || '').toLowerCase().includes(q)
    })
  }, [beneficiarios, query])

  const cuentasInternasDestino = useMemo(
    () =>
      cuentasInternas
        .filter((c) => c.id_cuenta !== originAccountId)
        .filter((c) => {
          const q = query.trim().toLowerCase()
          if (!q) return true
          const bag = `${c.id_cuenta} ${c.titular || ''} ${c.moneda}`.toLowerCase()
          return bag.includes(q)
        }),
    [cuentasInternas, originAccountId, query]
  )

  const cuentasBancariasValidas = useMemo(() => {
    return cuentasBancarias
      .filter((c) => {
        const raw = (c.numero_cuenta || '').trim()
        return Boolean(raw) && /[1-9A-Za-z]/.test(raw)
      })
      .sort((a, b) =>
        `${a.titular || ''}${a.banco}`.localeCompare(`${b.titular || ''}${b.banco}`, 'es')
      )
  }, [cuentasBancarias])

  function selectTarget(target: SelectedTarget) {
    setSelected(target)
    setStep(2)
  }

  async function confirmTransfer() {
    if (!selected) return
    const amount = Number(monto)
    if (!amount || amount <= 0) {
      setError('Ingresa un monto válido')
      return
    }
    if (!originAccountId) {
      setError('Selecciona una cuenta origen')
      return
    }
    try {
      setSending(true)
      setError(null)
      await api.crearTransferencia({
        flow: 'transfer',
        tipo:
          selected.method === 'interna'
            ? 'transferencia_interna'
            : selected.method === 'banco'
            ? 'transferencia_externa'
            : 'transferencia_externa',
        nxg_destino: selected.nxgDestino,
        id_cuenta_banco: selected.idCuentaBanco,
        beneficiario_id: selected.beneficiarioId,
        moneda,
        monto: amount,
        concepto: concepto || undefined,
        datos_extra: {
          origin_account_id: originAccountId,
          flow_step: 'confirmed',
        },
      })
      setSuccess(true)
      setStep(3)
    } catch (err: any) {
      setError(err.message || 'No se pudo enviar la solicitud')
    } finally {
      setSending(false)
    }
  }

  if (!open) return null

  const selectedOrigin = cuentasInternas.find((c) => c.id_cuenta === originAccountId) || null
  const stepLabel = step === 1 ? 'Destinatario' : step === 2 ? 'Datos de transferencia' : 'Confirmación'

  return (
    <SlideOver
      open={open}
      onClose={resetAndClose}
      title="Transferencia operativa"
      description="Flujo de ejecución institucional con revisión previa"
      footer={
        <div className="flex items-center gap-2 text-[11px] text-nrlx-muted">
          <span className="inline-flex items-center gap-1 rounded-full border border-nrlx-border bg-nrlx-el px-2 py-1">
            Paso {step} de 3
          </span>
          <span>{stepLabel}</span>
        </div>
      }
    >
      <div className="mb-4 grid grid-cols-3 gap-2">
        {[1, 2, 3].map((n) => (
          <div key={n} className={`h-1.5 rounded-full ${step >= n ? 'bg-nrlx-accent' : 'bg-nrlx-el2'}`} />
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          <div className="h-10 rounded-xl bg-nrlx-el animate-pulse" />
          <div className="h-24 rounded-xl bg-nrlx-el animate-pulse" />
          <div className="h-24 rounded-xl bg-nrlx-el animate-pulse" />
        </div>
      ) : step === 1 ? (
        <>
          {showAddForm ? (
            <AddRecipientForm
              defaultMode={newMode}
              onAdded={(beneficiario) => {
                setBeneficiarios((prev) => [beneficiario, ...prev])
                setShowAddForm(false)
              }}
              onCancel={() => setShowAddForm(false)}
            />
          ) : (
            <>
              <div className="h-10 rounded-xl border border-nrlx-border bg-nrlx-el px-3 flex items-center gap-2 mb-3">
                <Search size={15} className="text-nrlx-muted" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar beneficiario o CLABE"
                  className="bg-transparent w-full text-sm text-nrlx-text placeholder:text-nrlx-muted focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-4 gap-2 mb-4">
                <MethodCard icon={ArrowLeftRight} label="NXG Interno" onClick={() => setQuery('NXG-')} />
                <MethodCard icon={Building2} label="Banco" onClick={() => { setNewMode('particular'); setShowAddForm(true) }} />
                <MethodCard icon={Globe} label="Internacional" onClick={() => { setNewMode('empresa'); setShowAddForm(true) }} />
                <MethodCard icon={Plus} label="Nuevo" onClick={() => { setNewMode('particular'); setShowAddForm(true) }} />
              </div>

              <p className="text-[11px] font-mono text-nrlx-muted mb-2">Cuentas internas de socios</p>
              <div className="space-y-2 mb-4">
                {cuentasInternasDestino.slice(0, 8).map((c) => (
                  <button
                    key={c.id_cuenta}
                    onClick={() =>
                      selectTarget({
                        kind: 'cuenta',
                        method: 'interna',
                        id: c.id_cuenta,
                        title: `${c.id_cuenta}${c.titular ? ` · ${c.titular}` : ''}`,
                        subtitle: `Disponible ${formatearMoneda(c.saldo_disponible, c.moneda)}`,
                        nxgDestino: c.id_cuenta,
                      })
                    }
                    className="w-full rounded-xl border border-nrlx-border bg-nrlx-el px-3 py-2 text-left hover:border-nrlx-accent/40 transition-colors"
                  >
                    <p className="text-sm text-nrlx-text">{c.id_cuenta}</p>
                    <p className="text-[11px] text-nrlx-muted">
                      {c.titular || 'Cuenta interna'} · {formatearMoneda(c.saldo_disponible, c.moneda)}
                    </p>
                  </button>
                ))}
                {cuentasInternasDestino.length === 0 && (
                  <p className="text-[11px] text-nrlx-muted">
                    No se encontraron cuentas internas con ese criterio.
                  </p>
                )}
              </div>

              <p className="text-[11px] font-mono text-nrlx-muted mb-2">Beneficiarios recientes</p>
              <div className="space-y-2 mb-4">
                {filteredBeneficiarios.slice(0, 6).map((b) => {
                  const method: MethodType = b.pais.toLowerCase().includes('mex') ? 'banco' : 'internacional'
                  const subtitle = b.clabe || b.numero_cuenta || b.iban || 'Sin referencia'
                  return (
                    <button
                      key={b.id_beneficiario}
                      onClick={() =>
                        selectTarget({
                          kind: 'beneficiario',
                          method,
                          id: b.id_beneficiario,
                          title: `${b.nombre}${b.apellidos ? ` ${b.apellidos}` : ''}`,
                          subtitle,
                          beneficiarioId: b.id_beneficiario,
                        })
                      }
                      className="w-full rounded-xl border border-nrlx-border bg-nrlx-el px-3 py-2 text-left hover:border-nrlx-accent/40 transition-colors"
                    >
                      <p className="text-sm text-nrlx-text">{b.nombre}{b.apellidos ? ` ${b.apellidos}` : ''}</p>
                      <p className="text-[11px] text-nrlx-muted">{subtitle}</p>
                    </button>
                  )
                })}
              </div>

              <p className="text-[11px] font-mono text-nrlx-muted mb-2">Cuentas bancarias vinculadas</p>
              <div className="space-y-2">
                {cuentasBancariasValidas.map((c) => (
                  <button
                    key={c.id_cuenta}
                    onClick={() =>
                      selectTarget({
                        kind: 'cuenta',
                        method: 'banco',
                        id: c.id_cuenta,
                        title: c.titular ? `${c.titular}` : c.banco || 'Cuenta bancaria',
                        subtitle: `${c.banco} · ${c.numero_cuenta || c.id_cuenta}`,
                        idCuentaBanco: c.id_cuenta,
                      })
                    }
                    className="w-full rounded-xl border border-nrlx-border bg-nrlx-el px-3 py-2 text-left hover:border-nrlx-accent/40 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      {getBankIconUrl(c) ? (
                        <img
                          src={getBankIconUrl(c)!}
                          alt={c.banco}
                          className="w-8 h-8 rounded-full object-cover border border-nrlx-border"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full border border-nrlx-border bg-nrlx-el2 flex items-center justify-center">
                          <Building2 size={13} className="text-nrlx-muted" />
                        </div>
                      )}
                      <div>
                        <p className="text-sm text-nrlx-text">{c.banco}</p>
                        <p className="text-[11px] text-nrlx-muted">
                          {c.numero_cuenta || c.id_cuenta}
                          {c.titular ? ` · ${c.titular}` : ''}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </>
      ) : step === 2 ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-nrlx-border bg-nrlx-el px-3 py-2">
            <p className="text-[10px] uppercase tracking-wide text-nrlx-muted mb-1">Destinatario</p>
            <p className="text-xs text-nrlx-text">{selected?.title}</p>
            <p className="text-[11px] text-nrlx-muted">{selected?.subtitle}</p>
          </div>
          <div>
            <p className="text-[11px] font-mono text-nrlx-muted mb-2">Cuenta origen</p>
            <div className="space-y-2">
              {cuentasInternas.map((cuenta) => {
                const active = originAccountId === cuenta.id_cuenta
                return (
                  <button
                    key={cuenta.id_cuenta}
                    onClick={() => setOriginAccountId(cuenta.id_cuenta)}
                    className={`w-full rounded-xl border px-3 py-2 text-left ${
                      active
                        ? 'border-nrlx-accent/40 bg-nrlx-accent/10'
                        : 'border-nrlx-border bg-nrlx-el'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-nrlx-text">{cuenta.id_cuenta}</p>
                        <p className="text-[11px] text-nrlx-muted">
                          Disponible {formatearMoneda(cuenta.saldo_disponible, cuenta.moneda)}
                        </p>
                      </div>
                      {active && <Check size={14} className="text-nrlx-accent" />}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
          <input
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            type="number"
            placeholder="0.00"
            className="w-full h-16 rounded-xl border border-nrlx-border bg-nrlx-el text-center text-3xl font-light font-mono text-nrlx-text focus:outline-none focus:border-nrlx-accent/40"
          />
          <div className="grid grid-cols-5 gap-2">
            {['MXN', 'USD', 'EUR', 'GBP', 'CHF'].map((m) => (
              <button
                key={m}
                onClick={() => setMoneda(m)}
                className={`h-9 rounded-lg border text-xs ${
                  moneda === m
                    ? 'border-nrlx-accent/40 bg-nrlx-accent/10 text-nrlx-accent'
                    : 'border-nrlx-border bg-nrlx-el text-nrlx-muted'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
          <input
            value={concepto}
            onChange={(e) => setConcepto(e.target.value)}
            placeholder="Concepto / referencia"
            className="w-full rounded-xl border border-nrlx-border bg-nrlx-el px-3 py-2 text-sm text-nrlx-text placeholder:text-nrlx-muted"
          />
          <div className="rounded-xl border border-nrlx-border/60 bg-nrlx-el px-3 py-2">
            <p className="text-[10px] font-mono text-nrlx-muted mb-1">RESUMEN OPERATIVO</p>
            <p className="text-xs text-nrlx-text">
              Disponible en origen: {selectedOrigin ? formatearMoneda(selectedOrigin.saldo_disponible, selectedOrigin.moneda) : '—'}
            </p>
            <p className="text-xs text-nrlx-muted mt-1">
              {selected?.method === 'interna'
                ? 'Transferencia interna entre cuentas NXG.'
                : 'Transferencia externa sujeta a aprobación y ejecución.'}
            </p>
            <p className="text-xs text-nrlx-muted mt-1">
              Si la moneda final requiere conversión, el tipo de cambio se aplica al ejecutar en motor transaccional.
            </p>
          </div>
          <button
            onClick={() => setStep(3)}
            disabled={!monto || !originAccountId}
            className={`w-full h-10 rounded-xl border text-sm ${
              !monto || !originAccountId
                ? 'border-nrlx-border bg-nrlx-el2 text-nrlx-muted'
                : 'border-nrlx-accent/40 bg-nrlx-accent/10 text-nrlx-accent'
            }`}
          >
            Revisar y confirmar
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {success ? (
            <div className="text-center py-6">
              <CheckCircle2 size={34} className="mx-auto text-nrlx-success mb-2" />
              <p className="text-sm text-nrlx-text">Solicitud enviada</p>
            </div>
          ) : (
            <>
              <div className="rounded-xl border border-nrlx-border bg-nrlx-el p-3 space-y-1 text-sm">
                <p className="text-nrlx-muted">De</p>
                <p className="text-nrlx-text">{selectedOrigin?.id_cuenta || 'Cuenta NXG'}</p>
                <p className="text-nrlx-muted mt-2">Para</p>
                <p className="text-nrlx-text">{selected?.title}</p>
                <p className="text-nrlx-muted mt-2">Monto</p>
                <p className="text-nrlx-text font-mono">{formatearMoneda(Number(monto || 0), moneda)}</p>
                <p className="text-nrlx-muted mt-2">Concepto</p>
                <p className="text-nrlx-text">{concepto || 'Sin referencia'}</p>
              </div>
              <div className="rounded-xl border border-nrlx-warning/30 bg-nrlx-warning/10 px-3 py-2 text-xs text-nrlx-warning">
                Requiere aprobación del administrador
              </div>
              <button
                onClick={confirmTransfer}
                disabled={sending}
                className="w-full h-10 rounded-xl border border-nrlx-accent/40 bg-nrlx-accent/10 text-sm text-nrlx-accent disabled:opacity-50"
              >
                {sending ? 'Enviando...' : 'Confirmar'}
              </button>
              <button
                onClick={() => setStep(2)}
                className="w-full h-10 rounded-xl border border-nrlx-border bg-nrlx-el text-sm text-nrlx-muted"
              >
                Editar datos
              </button>
            </>
          )}
        </div>
      )}

      {error && <p className="text-xs text-nrlx-danger mt-3">{error}</p>}
    </SlideOver>
  )
}

function MethodCard({
  icon: Icon,
  label,
  onClick,
}: {
  icon: LucideIcon
  label: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="rounded-xl border border-nrlx-border bg-nrlx-el px-2 py-3 text-center hover:border-nrlx-accent/40 transition-colors"
    >
      <Icon size={16} className="text-nrlx-text mx-auto mb-1" />
      <p className="text-[10px] text-nrlx-muted">{label}</p>
    </button>
  )
}

