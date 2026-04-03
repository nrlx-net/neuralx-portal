'use client'

import { useMemo, useState } from 'react'
import { api, Beneficiario } from '@/lib/api'

const COUNTRIES = ['México', 'Estados Unidos', 'España', 'Reino Unido', 'Suiza', 'Francia', 'Alemania']
const CURRENCIES = ['MXN', 'USD', 'EUR', 'GBP', 'CHF']

interface AddRecipientFormProps {
  defaultMode?: 'particular' | 'empresa'
  onAdded: (beneficiario: Beneficiario) => void
  onCancel: () => void
}

export function AddRecipientForm({ defaultMode = 'particular', onAdded, onCancel }: AddRecipientFormProps) {
  const [mode, setMode] = useState<'particular' | 'empresa'>(defaultMode)
  const [pais, setPais] = useState('México')
  const [divisa, setDivisa] = useState('MXN')
  const [nombre, setNombre] = useState('')
  const [apellidos, setApellidos] = useState('')
  const [email, setEmail] = useState('')
  const [clabe, setClabe] = useState('')
  const [iban, setIban] = useState('')
  const [swift, setSwift] = useState('')
  const [banco, setBanco] = useState('')
  const [numeroCuenta, setNumeroCuenta] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isMexico = useMemo(() => ['méxico', 'mexico'].includes(pais.toLowerCase()), [pais])

  async function submit() {
    setError(null)
    if (!nombre.trim()) {
      setError('Nombre requerido')
      return
    }
    if (isMexico && !/^\d{18}$/.test(clabe.trim())) {
      setError('La CLABE debe tener 18 dígitos')
      return
    }
    if (!isMexico && (!iban.trim() || !swift.trim())) {
      setError('IBAN y SWIFT son requeridos para transferencias internacionales')
      return
    }

    try {
      setSaving(true)
      const result = await api.crearBeneficiario({
        tipo: mode,
        nombre: nombre.trim(),
        apellidos: mode === 'empresa' ? null : (apellidos.trim() || null),
        email: email.trim() || null,
        pais,
        divisa,
        clabe: isMexico ? clabe.trim() : null,
        iban: !isMexico ? iban.trim() : null,
        swift: !isMexico ? swift.trim() : null,
        banco: banco.trim() || null,
        numero_cuenta: numeroCuenta.trim() || null,
      })
      onAdded(result.beneficiario)
    } catch (err: any) {
      setError(err.message || 'No se pudo añadir el destinatario')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="inline-flex rounded-xl border border-nrlx-border bg-nrlx-el p-1">
        <button
          onClick={() => setMode('particular')}
          className={`px-3 py-1.5 text-xs rounded-lg ${mode === 'particular' ? 'bg-nrlx-accent/10 text-nrlx-accent' : 'text-nrlx-muted'}`}
        >
          Particular
        </button>
        <button
          onClick={() => setMode('empresa')}
          className={`px-3 py-1.5 text-xs rounded-lg ${mode === 'empresa' ? 'bg-nrlx-accent/10 text-nrlx-accent' : 'text-nrlx-muted'}`}
        >
          Empresa
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <select value={pais} onChange={(e) => setPais(e.target.value)} className="bg-nrlx-el border border-nrlx-border rounded-lg px-3 py-2 text-sm text-nrlx-text">
          {COUNTRIES.map((country) => <option key={country}>{country}</option>)}
        </select>
        <select value={divisa} onChange={(e) => setDivisa(e.target.value)} className="bg-nrlx-el border border-nrlx-border rounded-lg px-3 py-2 text-sm text-nrlx-text">
          {CURRENCIES.map((currency) => <option key={currency}>{currency}</option>)}
        </select>
      </div>

      <input
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        placeholder={mode === 'empresa' ? 'Razón social' : 'Nombre'}
        className="w-full bg-nrlx-el border border-nrlx-border rounded-lg px-3 py-2 text-sm text-nrlx-text placeholder:text-nrlx-muted"
      />

      {mode === 'particular' && (
        <input
          value={apellidos}
          onChange={(e) => setApellidos(e.target.value)}
          placeholder="Apellidos"
          className="w-full bg-nrlx-el border border-nrlx-border rounded-lg px-3 py-2 text-sm text-nrlx-text placeholder:text-nrlx-muted"
        />
      )}

      <input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email (opcional)"
        className="w-full bg-nrlx-el border border-nrlx-border rounded-lg px-3 py-2 text-sm text-nrlx-text placeholder:text-nrlx-muted"
      />

      {isMexico ? (
        <input
          value={clabe}
          onChange={(e) => setClabe(e.target.value.replace(/\D/g, '').slice(0, 18))}
          placeholder="CLABE (18 dígitos)"
          className="w-full bg-nrlx-el border border-nrlx-border rounded-lg px-3 py-2 text-sm text-nrlx-text placeholder:text-nrlx-muted"
        />
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <input
            value={iban}
            onChange={(e) => setIban(e.target.value)}
            placeholder="IBAN"
            className="w-full bg-nrlx-el border border-nrlx-border rounded-lg px-3 py-2 text-sm text-nrlx-text placeholder:text-nrlx-muted"
          />
          <input
            value={swift}
            onChange={(e) => setSwift(e.target.value)}
            placeholder="SWIFT"
            className="w-full bg-nrlx-el border border-nrlx-border rounded-lg px-3 py-2 text-sm text-nrlx-text placeholder:text-nrlx-muted"
          />
        </div>
      )}

      <input
        value={banco}
        onChange={(e) => setBanco(e.target.value)}
        placeholder="Banco (opcional)"
        className="w-full bg-nrlx-el border border-nrlx-border rounded-lg px-3 py-2 text-sm text-nrlx-text placeholder:text-nrlx-muted"
      />

      <input
        value={numeroCuenta}
        onChange={(e) => setNumeroCuenta(e.target.value)}
        placeholder="Número de cuenta (opcional)"
        className="w-full bg-nrlx-el border border-nrlx-border rounded-lg px-3 py-2 text-sm text-nrlx-text placeholder:text-nrlx-muted"
      />

      {error && <p className="text-xs text-nrlx-danger">{error}</p>}

      <div className="flex gap-2">
        <button onClick={onCancel} className="flex-1 rounded-lg border border-nrlx-border bg-nrlx-el px-3 py-2 text-sm text-nrlx-muted">
          Cancelar
        </button>
        <button
          onClick={submit}
          disabled={saving}
          className="flex-1 rounded-lg border border-nrlx-accent/40 bg-nrlx-accent/10 px-3 py-2 text-sm text-nrlx-accent disabled:opacity-50"
        >
          {saving ? 'Guardando...' : 'Añadir destinatario'}
        </button>
      </div>
    </div>
  )
}
