type CuentaInterna = {
  saldo_disponible: number
  saldo_retenido?: number
  moneda?: string
}

export const RATES_TO_MXN: Record<string, number> = {
  MXN: 1,
  USD: 17.5,
  EUR: 19.2,
  GBP: 22.1,
  CHF: 20.3,
}

function toRate(moneda?: string) {
  return RATES_TO_MXN[(moneda || 'MXN').toUpperCase()] || 1
}

export function calcularBalanceConsolidado(cuentas: CuentaInterna[]) {
  let total_mxn = 0
  let total_disponible_mxn = 0
  let total_retenido_mxn = 0
  const por_moneda: Record<string, number> = {}

  for (const cuenta of cuentas) {
    const moneda = (cuenta.moneda || 'MXN').toUpperCase()
    const disponible = Number(cuenta.saldo_disponible || 0)
    const retenido = Number(cuenta.saldo_retenido || 0)
    const total = disponible + retenido
    const rate = toRate(moneda)

    total_mxn += total * rate
    total_disponible_mxn += disponible * rate
    total_retenido_mxn += retenido * rate
    por_moneda[moneda] = (por_moneda[moneda] || 0) + total
  }

  return {
    total_mxn,
    total_disponible_mxn,
    total_retenido_mxn,
    por_moneda,
    cuentas_activas: cuentas.length,
  }
}

export function formatearMontoCorto(monto: number) {
  const abs = Math.abs(monto)
  if (abs >= 1_000_000_000) return `$${(monto / 1_000_000_000).toFixed(2)}B`
  if (abs >= 1_000_000) return `$${(monto / 1_000_000).toFixed(2)}M`
  if (abs >= 1_000) return `$${(monto / 1_000).toFixed(2)}K`
  return `$${Math.round(monto)}`
}

export function formatearMoneda(monto: number, moneda: string = 'MXN', locale: string = 'es-MX') {
  const abs = Math.abs(monto)
  const currency = moneda.toUpperCase()

  if (abs >= 1_000_000_000) {
    const value = (monto / 1_000_000_000).toFixed(2)
    return `${currency === 'MXN' ? '$' : `${currency} `}${value}B`
  }
  if (abs >= 1_000_000) {
    const value = (monto / 1_000_000).toFixed(2)
    return `${currency === 'MXN' ? '$' : `${currency} `}${value}M`
  }

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(monto)
}

