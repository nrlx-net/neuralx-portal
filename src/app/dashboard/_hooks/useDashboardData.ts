'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { api, CuentaBancaria, Solicitud, Transaccion } from '@/lib/api'
import { calcularBalanceConsolidado } from '@/lib/balance'

export function useDashboardData(ready: boolean) {
  const [cuentas, setCuentas] = useState<CuentaBancaria[]>([])
  const [transacciones, setTransacciones] = useState<Transaccion[]>([])
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const [cuentasRes, txnRes, solRes] = await Promise.all([
        api.getCuentas(),
        api.getTransacciones(),
        api.getSolicitudes('pendiente'),
      ])
      setCuentas(cuentasRes.cuentas)
      setTransacciones(txnRes.transacciones)
      setSolicitudes(solRes.solicitudes)
    } catch (err: any) {
      setError(err.message || 'No se pudieron cargar datos del dashboard')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (ready) void loadData()
  }, [ready, loadData])

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
    loading,
    error,
    balance,
    loadData,
  }
}

