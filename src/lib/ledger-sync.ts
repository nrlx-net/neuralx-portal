import type { ConnectionPool } from 'mssql'

export async function syncOperationalBalancesFromLedger(db: ConnectionPool) {
  await db.request().query(`
    UPDATE ci
    SET ci.saldo_disponible = picked.available_balance,
        ci.saldo_retenido = picked.hold_balance,
        ci.updated_at = SYSUTCDATETIME()
    FROM cuentas_internas ci
    CROSS APPLY (
      SELECT TOP 1 la.available_balance, la.hold_balance
      FROM ledger_accounts la
      WHERE la.source_table = N'cuentas_internas'
        AND la.source_account_id = ci.nxg_id
      ORDER BY
        CASE
          WHEN UPPER(LTRIM(RTRIM(ISNULL(la.status, N'')))) IN (N'ACTIVE', N'ACTIVO') THEN 0
          ELSE 1
        END,
        la.available_balance DESC,
        la.ledger_account_id
    ) picked
    WHERE ci.saldo_disponible != picked.available_balance
       OR ci.saldo_retenido != picked.hold_balance
  `)

  await db.request().query(`
    UPDATE cuenta_custodia
    SET saldo_total = ISNULL((SELECT SUM(saldo_disponible + saldo_retenido) FROM cuentas_internas), 0),
        saldo_asignado = ISNULL((SELECT SUM(saldo_disponible + saldo_retenido) FROM cuentas_internas), 0),
        updated_at = SYSUTCDATETIME()
    WHERE id_custodia = N'CUSTODIA-001'
  `)
}

