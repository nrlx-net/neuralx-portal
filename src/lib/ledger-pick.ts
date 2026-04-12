import type { ConnectionPool } from 'mssql'

export type LedgerPick = {
  ledger_account_id: string
  available_balance: number
  hold_balance: number
  currency: string | null
  status: string | null
}

/**
 * Elige una fila de ledger_accounts por NXG cuando hay duplicados (misma source_account_id):
 * prioriza ACTIVE/ACTIVO, luego mayor available_balance, luego id estable.
 * Debe coincidir con la lógica de syncOperationalBalancesFromLedger para que UI y SP usen el mismo libro.
 */
export async function pickLedgerForNxg(db: ConnectionPool, nxgId: string): Promise<LedgerPick | null> {
  const r = await db
    .request()
    .input('nxg', nxgId)
    .query(`
      SELECT TOP 1
        ledger_account_id,
        available_balance,
        hold_balance,
        currency,
        status
      FROM ledger_accounts
      WHERE source_table = N'cuentas_internas'
        AND source_account_id = @nxg
      ORDER BY
        CASE
          WHEN UPPER(LTRIM(RTRIM(ISNULL(status, N'')))) IN (N'ACTIVE', N'ACTIVO') THEN 0
          ELSE 1
        END,
        available_balance DESC,
        ledger_account_id
    `)

  const row = r.recordset?.[0]
  if (!row?.ledger_account_id) return null

  return {
    ledger_account_id: String(row.ledger_account_id),
    available_balance: Number(row.available_balance || 0),
    hold_balance: Number(row.hold_balance || 0),
    currency: row.currency != null ? String(row.currency) : null,
    status: row.status != null ? String(row.status) : null,
  }
}
