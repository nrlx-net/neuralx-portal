import type { ConnectionPool } from 'mssql'

export async function syncOperationalBalancesFromLedger(db: ConnectionPool) {
  await db.request().query(`
    UPDATE ci
    SET ci.saldo_disponible = la.available_balance,
        ci.saldo_retenido = la.hold_balance,
        ci.updated_at = SYSUTCDATETIME()
    FROM cuentas_internas ci
    JOIN ledger_accounts la ON la.source_account_id = ci.nxg_id
    WHERE ci.saldo_disponible != la.available_balance
       OR ci.saldo_retenido != la.hold_balance
  `)

  await db.request().query(`
    UPDATE cuenta_custodia
    SET saldo_total = ISNULL((SELECT SUM(saldo_disponible + saldo_retenido) FROM cuentas_internas), 0),
        saldo_asignado = ISNULL((SELECT SUM(saldo_disponible + saldo_retenido) FROM cuentas_internas), 0),
        updated_at = SYSUTCDATETIME()
    WHERE id_custodia = N'CUSTODIA-001'
  `)
}

