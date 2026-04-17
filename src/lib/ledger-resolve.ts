import type { ConnectionPool } from 'mssql'

/**
 * Resuelve ledger_account_id para una cuenta NXG mostrada en el portal.
 * La tarjeta sintética NXG-000 (custodia) puede mapear al ledger de cuenta_custodia, no a cuentas_internas.
 */
export async function resolveLedgerAccountIdForNxg(
  db: ConnectionPool,
  nxgId: string
): Promise<string | null> {
  const id = (nxgId || '').trim()
  if (!id) return null

  const direct = await db.request().input('nxg', id).query(`
    SELECT TOP 1 ledger_account_id
    FROM dbo.ledger_accounts
    WHERE source_table = N'cuentas_internas' AND source_account_id = @nxg
  `)
  const a = direct.recordset[0]?.ledger_account_id
  if (a) return String(a)

  if (id === 'NXG-000') {
    const custodia = await db.request().query(`
      SELECT TOP 1 ledger_account_id
      FROM dbo.ledger_accounts
      WHERE source_table = N'cuenta_custodia' AND source_account_id = N'CUSTODIA-001'
    `)
    const b = custodia.recordset[0]?.ledger_account_id
    if (b) return String(b)

    const loose = await db.request().query(`
      SELECT TOP 1 ledger_account_id, source_table
      FROM dbo.ledger_accounts
      WHERE source_account_id = N'NXG-000'
      ORDER BY CASE source_table WHEN N'cuenta_custodia' THEN 0 ELSE 1 END, ledger_account_id
    `)
    const c = loose.recordset[0]?.ledger_account_id
    if (c) return String(c)
  }

  return null
}
