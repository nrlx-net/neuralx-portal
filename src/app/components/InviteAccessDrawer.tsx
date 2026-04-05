'use client'

import { useMemo, useState } from 'react'
import { Mail, Send, UserPlus } from 'lucide-react'
import { SlideOver } from './SlideOver'

interface InviteAccessDrawerProps {
  open: boolean
  onClose: () => void
}

type InviteStatus = 'idle' | 'sending' | 'success' | 'error'

export function InviteAccessDrawer({ open, onClose }: InviteAccessDrawerProps) {
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState('operador')
  const [status, setStatus] = useState<InviteStatus>('idle')
  const [message, setMessage] = useState<string | null>(null)

  const isValid = useMemo(() => /\S+@\S+\.\S+/.test(email) && fullName.trim().length >= 3, [email, fullName])

  async function submitInvite() {
    if (!isValid) return
    try {
      setStatus('sending')
      setMessage(null)
      // Frontend funcional con handler temporal mientras se habilita backend dedicado.
      await new Promise((resolve) => setTimeout(resolve, 900))
      setStatus('success')
      setMessage('Invitación enviada. El operador recibirá instrucciones para activar acceso y credencial.')
    } catch {
      setStatus('error')
      setMessage('No se pudo enviar la invitación. Intenta de nuevo.')
    }
  }

  function closeAndReset() {
    setEmail('')
    setFullName('')
    setRole('operador')
    setStatus('idle')
    setMessage(null)
    onClose()
  }

  return (
    <SlideOver
      open={open}
      onClose={closeAndReset}
      title="Invitar operador"
      description="Alta de usuario operativo y preparación de acceso institucional"
      footer={
        <button
          onClick={submitInvite}
          disabled={!isValid || status === 'sending'}
          className={`w-full h-10 rounded-xl border text-sm inline-flex items-center justify-center gap-2 ${
            !isValid || status === 'sending'
              ? 'border-nrlx-border bg-nrlx-el2 text-nrlx-muted'
              : 'border-nrlx-accent/40 bg-nrlx-accent/10 text-nrlx-accent'
          }`}
        >
          <Send size={14} />
          {status === 'sending' ? 'Enviando invitación...' : 'Enviar invitación'}
        </button>
      }
    >
      <div className="rounded-xl border border-nrlx-border bg-nrlx-el px-3 py-2 mb-4">
        <p className="text-[11px] text-nrlx-muted">
          Este flujo deja listo el onboarding operativo. Cuando el backend de invitaciones esté habilitado,
          este formulario puede enlazarse sin cambios de UI.
        </p>
      </div>

      <div className="space-y-3">
        <label className="block">
          <span className="text-[11px] font-mono text-nrlx-muted">Nombre completo</span>
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Nombre y apellidos"
            className="mt-1 w-full h-10 rounded-xl border border-nrlx-border bg-nrlx-el px-3 text-sm text-nrlx-text placeholder:text-nrlx-muted"
          />
        </label>
        <label className="block">
          <span className="text-[11px] font-mono text-nrlx-muted">Correo corporativo</span>
          <div className="mt-1 h-10 rounded-xl border border-nrlx-border bg-nrlx-el px-3 flex items-center gap-2">
            <Mail size={14} className="text-nrlx-muted" />
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="operador@neuralxglobal.net"
              className="w-full bg-transparent text-sm text-nrlx-text placeholder:text-nrlx-muted focus:outline-none"
            />
          </div>
        </label>
        <label className="block">
          <span className="text-[11px] font-mono text-nrlx-muted">Rol operativo</span>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="mt-1 w-full h-10 rounded-xl border border-nrlx-border bg-nrlx-el px-3 text-sm text-nrlx-text"
          >
            <option value="operador">Operador</option>
            <option value="aprobador">Aprobador</option>
            <option value="auditor">Auditor</option>
          </select>
        </label>
      </div>

      {message && (
        <div
          className={`mt-4 rounded-xl border px-3 py-2 text-xs ${
            status === 'success'
              ? 'border-nrlx-success/40 bg-nrlx-success/10 text-nrlx-success'
              : 'border-nrlx-danger/40 bg-nrlx-danger/10 text-nrlx-danger'
          }`}
        >
          {message}
        </div>
      )}

      <div className="mt-4 rounded-xl border border-nrlx-border bg-nrlx-el px-3 py-3">
        <p className="text-xs text-nrlx-text inline-flex items-center gap-2">
          <UserPlus size={14} className="text-nrlx-accent" />
          Alcance sugerido: solo lectura para auditor y doble validación para aprobador.
        </p>
      </div>
    </SlideOver>
  )
}

