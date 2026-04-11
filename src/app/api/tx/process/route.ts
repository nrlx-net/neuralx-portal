import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { requireAdmin } from '@/lib/auth-helpers'
import { EngineLedgerEntry, mapEngineResponse } from '@/lib/tx-engine'
import { syncOperationalBalancesFromLedger } from '@/lib/ledger-sync'

export async function POST(request: Request) {
  const { error } = await requireAdmin()
  if (error) return error

  try {
    const body = await request.json()
    const {
      origin_ledger_account,
      destination_ledger_account = null,
      amount_original,
      currency_original,
      transaction_timestamp = null,
      reference = null,
      fee_bps = 0,
      tax_bps = 0,
      spread_bps = 0,
      trade_date = null,
      settlement_date = null,
      original_tx_id = null,
    } = body

    if (!origin_ledger_account || !currency_original || !amount_original || Number(amount_original) <= 0) {
      return NextResponse.json(
        {
          detail:
            'Parámetros requeridos: origin_ledger_account, amount_original (>0), currency_original',
        },
        { status: 400 }
      )
    }

    const db = await getDb()
    const result = await db
      .request()
      .input('origin_ledger_account', origin_ledger_account)
      .input('destination_ledger_account', destination_ledger_account)
      .input('amount_original', Number(amount_original))
      .input('currency_original', currency_original)
      .input('transaction_timestamp', transaction_timestamp)
      .input('reference', reference)
      .input('fee_bps', Number(fee_bps || 0))
      .input('tax_bps', Number(tax_bps || 0))
      .input('spread_bps', Number(spread_bps || 0))
      .input('trade_date', trade_date)
      .input('settlement_date', settlement_date)
      .input('original_tx_id', original_tx_id)
      .query(`
        EXEC dbo.sp_process_transaction_v1
          @origin_ledger_account,
          @destination_ledger_account,
          @amount_original,
          @currency_original,
          @transaction_timestamp,
          @reference,
          @fee_bps,
          @tax_bps,
          @spread_bps,
          @trade_date,
          @settlement_date,
          @original_tx_id
      `)

    const raw = result.recordset?.[0]
    if (!raw?.tx_id) {
      return NextResponse.json({ detail: 'No se recibió respuesta válida del motor transaccional' }, { status: 500 })
    }

    const ledgerResult = await db
      .request()
      .input('tx_id', raw.tx_id)
      .query(`
        SELECT entry_type, ledger_account_id, amount_base
        FROM dbo.ledger_entries
        WHERE tx_id = @tx_id
        ORDER BY id_entry
      `)

    const entries: EngineLedgerEntry[] = ledgerResult.recordset.map((r: any) => ({
      type: r.entry_type,
      account: r.ledger_account_id,
      amount: Number(r.amount_base || 0),
    }))

    await syncOperationalBalancesFromLedger(db)

    const payload = mapEngineResponse(raw, entries)
    return NextResponse.json(payload)
  } catch (err: any) {
    console.error('Error /api/tx/process:', err)
    return NextResponse.json({ detail: err.message || 'Error procesando transacción' }, { status: 500 })
  }
}

