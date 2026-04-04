import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { requireAdmin } from '@/lib/auth-helpers'
import { EngineLedgerEntry, mapEngineResponse } from '@/lib/tx-engine'

export async function POST(request: Request) {
  const { error } = await requireAdmin()
  if (error) return error

  try {
    const body = await request.json()
    const { original_tx_id, reference = null } = body

    if (!original_tx_id) {
      return NextResponse.json({ detail: 'Parámetro requerido: original_tx_id' }, { status: 400 })
    }

    const db = await getDb()
    const result = await db
      .request()
      .input('original_tx_id', original_tx_id)
      .input('reference', reference)
      .query(`
        EXEC dbo.sp_reverse_transaction_v1
          @original_tx_id,
          @reference
      `)

    const raw = result.recordset?.[0]
    if (!raw?.tx_id) {
      return NextResponse.json({ detail: 'No se recibió respuesta válida del motor de reversión' }, { status: 500 })
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

    const payload = mapEngineResponse(raw, entries)
    return NextResponse.json(payload)
  } catch (err: any) {
    console.error('Error /api/tx/reverse:', err)
    return NextResponse.json({ detail: err.message || 'Error revirtiendo transacción' }, { status: 500 })
  }
}

