'use client'

import { useEffect, useMemo, useState } from 'react'
import { AddRecipientForm } from './AddRecipientForm'
import {
  ArrowLeftRight,
  Building2,
  CheckCircle2,
  Globe,
  LucideIcon,
  Plus,
  Search,
  X,
} from 'lucide-react'
import {
  api,
  Beneficiario,
  CuentaBancaria,
  CuentaBancariaVinculada,
} from '@/lib/api'

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

function formatMoney(amount: number, currency: string = 'MXN') {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount)
}

export function TransferFlow({ open, onClose }: TransferFlowProps) {
  const [step, setStep] = useState(1)
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

  const cuentasBancariasValidas = useMemo(() => {
    return cuentasBancarias
      .filter((c) => {
        const raw = (c.numero_cuenta || '').trim()
        return Boolean(raw) && /[1-9A-Za-z]/.test(raw)
      })
      .sort((a, b) => `${a.titular || ''}${a.banco}`.localeCompare(`${b.titular || ''}${b.banco}`, 'es'))
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

  return (
    <div className="fixed inset-0 z-[80]">
      <button className="absolute inset-0 bg-black/70" onClick={resetAndClose} />
      <div className="absolute bottom-0 left-0 right-0 rounded-t-2xl border border-nrlx-border bg-nrlx-surface p-4 max-h-[90vh] overflow-y-auto animate-fade-up">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-nrlx-text">
            {step === 1 ? 'Nuevo pago' : step === 2 ? 'Ingresa monto' : 'Confirmación'}
          </h3>
          <button onClick={resetAndClose} className="w-8 h-8 rounded-full border border-nrlx-border bg-nrlx-el flex items-center justify-center text-nrlx-muted">
            <X size={14} />
          </button>
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
                      <p className="text-sm text-nrlx-text">{c.banco}</p>
                      <p className="text-[11px] text-nrlx-muted">
                        {c.numero_cuenta || c.id_cuenta}
                        {c.titular ? ` · ${c.titular}` : ''}
                      </p>
                    </button>
                  ))}
                </div>
              </>
            )}
          </>
        ) : step === 2 ? (
          <div className="space-y-3">
            <div className="rounded-xl border border-nrlx-border bg-nrlx-el px-3 py-2">
              <p className="text-xs text-nrlx-text">{selected?.title}</p>
              <p className="text-[11px] text-nrlx-muted">{selected?.subtitle}</p>
            </div>
            <input
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              type="number"
              placeholder="0.00"
              className="w-full h-14 rounded-xl border border-nrlx-border bg-nrlx-el text-center text-3xl font-light font-mono text-nrlx-text focus:outline-none focus:border-nrlx-accent/40"
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
            <button
              onClick={() => setStep(3)}
              disabled={!monto}
              className={`w-full h-10 rounded-xl border text-sm ${
                !monto
                  ? 'border-nrlx-border bg-nrlx-el2 text-nrlx-muted'
                  : 'border-nrlx-accent/40 bg-nrlx-accent/10 text-nrlx-accent'
              }`}
            >
              Continuar
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
                  <p className="text-nrlx-text">{cuentasInternas[0]?.id_cuenta || 'Cuenta NXG'}</p>
                  <p className="text-nrlx-muted mt-2">Para</p>
                  <p className="text-nrlx-text">{selected?.title}</p>
                  <p className="text-nrlx-muted mt-2">Monto</p>
                  <p className="text-nrlx-text font-mono">{formatMoney(Number(monto || 0), moneda)}</p>
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
              </>
            )}
          </div>
        )}

        {error && <p className="text-xs text-nrlx-danger mt-3">{error}</p>}
      </div>
    </div>
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
