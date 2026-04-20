'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { api } from '@/lib/api'
import { formatearMoneda } from '@/lib/balance'
import { Check, RefreshCw, ShieldAlert, X } from 'lucide-react'

function pickId(row: Record<string, unknown>): string | null {
  const raw =
    row.id_solicitud ??
    row.ID_SOLICITUD ??
    row.Id_Solicitud ??
    row.id_Solicitud
  return raw != null && String(raw).trim() !== '' ? String(raw) : null
}

function pickStr(row: Record<string, unknown>, keys: string[]): string {
  for (const k of keys) {
    const v = row[k] ?? row[k.toLowerCase()] ?? row[k.toUpperCase()]
    if (v != null && String(v).trim() !== '') return String(v)
  }
  return '—'
}

function pickNum(row: Record<string, unknown>, keys: string[]): number {
  const s = pickStr(row, keys)
  if (s === '—') return 0
  const n = Number(s)
  return Number.isFinite(n) ? n : 0
}

export default function AdminAprobacionesPage() {
  const { status } = useSession()
  const [allowed, setAllowed] = useState<boolean | null>(null)
  const [rows, setRows] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [comentarios, setComentarios] = useState<Record<string, string>>({})

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const me = await api.getMe()
      if (!me.es_admin) {
        setAllowed(false)
        setRows([])
        return
      }
      setAllowed(true)
      const list = await api.adminGetSolicitudes()
      setRows(Array.isArray(list) ? list : [])
    } catch (e: any) {
      setError(e.message || 'No se pudo cargar el panel')
      setAllowed(false)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (status === 'authenticated') void load()
  }, [status, load])

  async function aprobar(id: string) {
    try {
      setBusyId(id)
      setError(null)
      await api.adminAprobar(id)
      await load()
    } catch (e: any) {
      setError(e.message || 'Error al aprobar')
    } finally {
      setBusyId(null)
    }
  }

  async function rechazar(id: string) {
    try {
      setBusyId(id)
      setError(null)
      await api.adminRechazar(id, comentarios[id] || undefined)
      setComentarios((c) => {
        const next = { ...c }
        delete next[id]
        return next
      })
      await load()
    } catch (e: any) {
      setError(e.message || 'Error al rechazar')
    } finally {
      setBusyId(null)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="rounded-2xl border border-nrlx-border bg-nrlx-surface p-8 text-center text-sm text-nrlx-muted">
        Cargando panel de aprobaciones…
      </div>
    )
  }

  if (allowed === false) {
    return (
      <div className="rounded-2xl border border-nrlx-border bg-nrlx-surface p-8 space-y-4">
        <div className="flex items-center gap-2 text-nrlx-warning">
          <ShieldAlert size={20} />
          <h1 className="text-lg text-nrlx-text">Acceso restringido</h1>
        </div>
        <p className="text-sm text-nrlx-muted">
          Solo administradores pueden aprobar transferencias externas o internacionales pendientes.
        </p>
        <Link href="/dashboard" className="text-sm text-nrlx-accent hover:underline">
          Volver a Inicio
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-medium text-nrlx-text">Aprobaciones pendientes</h1>
          <p className="text-xs text-nrlx-muted mt-1 max-w-xl">
            Transferencias pendientes de aprobación.
            Las transferencias entre cuentas se liquidan de inmediato y no aparecen aquí.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="h-9 px-3 rounded-xl border border-nrlx-border bg-nrlx-el text-xs text-nrlx-muted inline-flex items-center gap-2"
        >
          <RefreshCw size={13} />
          Actualizar
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-nrlx-danger/30 bg-nrlx-danger/10 px-3 py-2 text-xs text-nrlx-danger">
          {error}
        </div>
      )}

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-nrlx-border bg-nrlx-surface p-10 text-center text-sm text-nrlx-muted">
          No hay transferencias pendientes de aprobación.
        </div>
      ) : (
        <div className="space-y-4">
          {rows.map((row, idx) => {
            const id = pickId(row)
            const key = id || `row-${idx}`
            return (
              <article
                key={key}
                className="rounded-2xl border border-nrlx-border bg-nrlx-surface p-5 space-y-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-mono text-nrlx-muted">
                      {id || 'Sin folio'}
                    </p>
                    <p className="text-lg font-mono text-nrlx-text mt-1">
                      {formatearMoneda(
                        pickNum(row, ['monto', 'Monto', 'MONTO']),
                        (() => {
                          const m = pickStr(row, ['moneda', 'Moneda', 'MONEDA'])
                          return m === '—' ? 'MXN' : m
                        })()
                      )}
                    </p>
                  </div>
                  {id && (
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={busyId === id}
                        onClick={() => void aprobar(id)}
                        className="h-9 px-3 rounded-lg border border-nrlx-success/40 bg-nrlx-success/10 text-xs text-nrlx-success inline-flex items-center gap-1 disabled:opacity-50"
                      >
                        <Check size={14} />
                        {busyId === id ? '…' : 'Aprobar y ejecutar'}
                      </button>
                    </div>
                  )}
                </div>
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div>
                    <dt className="text-nrlx-muted font-mono text-[10px]">Socio</dt>
                    <dd className="text-nrlx-text">
                      {pickStr(row, ['nombre_completo', 'Nombre_Completo', 'entra_id_upn', 'Entra_Id_Upn'])}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-nrlx-muted font-mono text-[10px]">Tipo / origen</dt>
                    <dd className="text-nrlx-text">
                      {pickStr(row, ['tipo', 'Tipo', 'tipo_solicitud', 'Tipo_Solicitud'])} ·{' '}
                      {pickStr(row, ['nxg_origen', 'Nxg_Origen', 'NXG_Origen'])}
                    </dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-nrlx-muted font-mono text-[10px]">Concepto</dt>
                    <dd className="text-nrlx-text">{pickStr(row, ['concepto', 'Concepto'])}</dd>
                  </div>
                </dl>
                {id && (
                  <div className="pt-2 border-t border-nrlx-border/60 space-y-2">
                    <label className="text-[10px] font-mono text-nrlx-muted block">Comentario (rechazo)</label>
                    <input
                      value={comentarios[id] || ''}
                      onChange={(e) => setComentarios((c) => ({ ...c, [id]: e.target.value }))}
                      placeholder="Opcional — visible para auditoría"
                      className="w-full rounded-lg border border-nrlx-border bg-nrlx-el px-3 py-2 text-xs text-nrlx-text"
                    />
                    <button
                      type="button"
                      disabled={busyId === id}
                      onClick={() => void rechazar(id)}
                      className="h-9 px-3 rounded-lg border border-nrlx-danger/40 bg-nrlx-danger/10 text-xs text-nrlx-danger inline-flex items-center gap-1 disabled:opacity-50"
                    >
                      <X size={14} />
                      Rechazar
                    </button>
                  </div>
                )}
              </article>
            )
          })}
        </div>
      )}

      <p className="text-[11px] text-nrlx-muted">
        <Link href="/dashboard" className="text-nrlx-accent hover:underline">
          Volver al dashboard
        </Link>
      </p>
    </div>
  )
}
