export interface EngineLedgerEntry {
  type: 'DEBIT' | 'CREDIT'
  account: string
  amount: number
}

export interface EngineTxResponse {
  tx_id: string
  status: 'SETTLED' | 'FAILED' | 'PENDING_FX' | 'REJECTED'
  timestamp: string
  amount_original: { value: number; currency: string }
  amount_base: { value: number; currency: string }
  fx_rate_applied: number
  fx_rate_source: string | null
  fx_rate_timestamp: string | null
  charges: {
    commission: { value: number; currency: string }
    tax: { value: number; currency: string }
    spread: { value: number; currency: string }
  }
  total_debit: { value: number; currency: string }
  balances_after: {
    origin: { ledger_balance: number; available_balance: number }
    destination: { ledger_balance: number; available_balance: number }
  }
  ledger_entries: EngineLedgerEntry[]
  error: null | { code: string; step: number | null; detail: string | null }
}

function asNumber(value: any) {
  const n = Number(value ?? 0)
  return Number.isFinite(n) ? n : 0
}

function asIso(value: any) {
  if (!value) return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

export function mapEngineResponse(raw: any, entries: EngineLedgerEntry[]): EngineTxResponse {
  const status = (raw?.status || 'FAILED') as EngineTxResponse['status']
  const baseCurrency = String(raw?.amount_base_currency || 'MXN')

  return {
    tx_id: String(raw?.tx_id || ''),
    status,
    timestamp: asIso(raw?.timestamp) || new Date().toISOString(),
    amount_original: {
      value: asNumber(raw?.amount_original_value),
      currency: String(raw?.amount_original_currency || baseCurrency),
    },
    amount_base: {
      value: asNumber(raw?.amount_base_value),
      currency: baseCurrency,
    },
    fx_rate_applied: asNumber(raw?.fx_rate_applied),
    fx_rate_source: raw?.fx_rate_source ? String(raw.fx_rate_source) : null,
    fx_rate_timestamp: asIso(raw?.fx_rate_timestamp),
    charges: {
      commission: { value: asNumber(raw?.charge_commission), currency: baseCurrency },
      tax: { value: asNumber(raw?.charge_tax), currency: baseCurrency },
      spread: { value: asNumber(raw?.charge_spread), currency: baseCurrency },
    },
    total_debit: {
      value: asNumber(raw?.total_debit_value),
      currency: String(raw?.total_debit_currency || baseCurrency),
    },
    balances_after: {
      origin: {
        ledger_balance: asNumber(raw?.origin_ledger_balance_after),
        available_balance: asNumber(raw?.origin_available_balance_after),
      },
      destination: {
        ledger_balance: asNumber(raw?.destination_ledger_balance_after),
        available_balance: asNumber(raw?.destination_available_balance_after),
      },
    },
    ledger_entries: entries,
    error:
      raw?.error_code || raw?.error_detail
        ? {
            code: String(raw?.error_code || 'ENGINE_ERROR'),
            step: raw?.error_step == null ? null : asNumber(raw?.error_step),
            detail: raw?.error_detail ? String(raw.error_detail) : null,
          }
        : null,
  }
}

