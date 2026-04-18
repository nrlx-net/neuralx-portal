'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import { api, CuentaBancaria, Solicitud, Transaccion } from '@/lib/api'
import { calcularBalanceConsolidado } from '@/lib/balance'

export function useDashboardData(ready: boolean) {
  const { data: session } = useSession()
  const sessionUserKey =
    session?.user?.email || session?.user?.name || (session?.user as { id?: string } | undefined)?.id || ''

  const [cuentas, setCuentas] = useState<CuentaBancaria[]>([])
  const [transacciones, setTransacciones] = useState<Transaccion[]>([])
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([])
  const [esAdmin, setEsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const [cuentasRes, txnRes, solRes, meRes] = await Promise.all([
        api.getCuentas(),
        api.getTransacciones(),
        api.getSolicitudes('pendiente'),
        api.getMe(),
      ])
      setCuentas(cuentasRes.cuentas)
      setTransacciones(txnRes.transacciones)
      setSolicitudes(solRes.solicitudes)
      setEsAdmin(Boolean(meRes.es_admin))
    } catch (err: any) {
      setError(err.message || 'No se pudieron cargar datos del dashboard')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!ready || !sessionUserKey) return
    void loadData()
  }, [ready, sessionUserKey, loadData])

  const balance = useMemo(
    () =>
      calcularBalanceConsolidado(
        cuentas.map((c) => ({
          saldo_disponible: c.saldo_disponible,
          saldo_retenido: c.saldo_retenido ?? Math.max(c.saldo_total - c.saldo_disponible, 0),
          moneda: c.moneda,
        }))
      ),
    [cuentas]
  )

  return {
    cuentas,
    transacciones,
    solicitudes,
    esAdmin,
    loading,
    error,
    balance,
    loadData,
  }
}

