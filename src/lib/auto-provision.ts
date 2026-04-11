import type { ConnectionPool } from 'mssql'
import { getUserByUpnOrEmail } from '@/lib/auth-helpers'

const ADMIN_ID = process.env.AUTO_PROVISION_ADMIN_ID || 'nrlx001250418dsa'
const USER_SUFFIX = process.env.AUTO_PROVISION_USER_SUFFIX || '250418dsa'

function fallbackDisplayNameFromUpn(upn: string) {
  const base = upn.split('@')[0] || upn
  return base
    .replace(/[._-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export async function autoProvisionUser(db: ConnectionPool, upn: string, displayName?: string | null) {
  const normalizedUpn = upn.trim().toLowerCase()

  const existing = await getUserByUpnOrEmail(db, normalizedUpn)
  if (existing) {
    return existing
  }

  const transaction = db.transaction()
  await transaction.begin()

  try {
    const userSeqResult = await transaction.request().query(`
      SELECT ISNULL(MAX(TRY_CONVERT(INT, SUBSTRING(id_usuario, 5, 3))), 0) + 1 AS next_seq
      FROM usuarios_socios WITH (UPDLOCK, HOLDLOCK)
      WHERE id_usuario LIKE 'nrlx%'
    `)
    const nextSeq = Number(userSeqResult.recordset[0]?.next_seq || 1)
    const idUsuario = `nrlx${String(nextSeq).padStart(3, '0')}${USER_SUFFIX}`

    const nxgSeqResult = await transaction.request().query(`
      SELECT ISNULL(MAX(TRY_CONVERT(INT, SUBSTRING(nxg_id, 5, 3))), -1) + 1 AS next_nxg
      FROM cuentas_internas WITH (UPDLOCK, HOLDLOCK)
    `)
    const nextNxg = Number(nxgSeqResult.recordset[0]?.next_nxg || 0)
    const nxgId = `NXG-${String(nextNxg).padStart(3, '0')}`
    const ledgerId = `NXG-${nxgId}`

    const effectiveName = (displayName || fallbackDisplayNameFromUpn(normalizedUpn)).trim()

    await transaction.request()
      .input('id_usuario', idUsuario)
      .input('nombre_completo', effectiveName)
      .input('email', normalizedUpn)
      .input('entra_id_upn', normalizedUpn)
      .query(`
        INSERT INTO usuarios_socios (
          id_usuario, nombre_completo, email, entra_id_upn,
          password_hash, estatus, pais, created_at, updated_at, last_login
        ) VALUES (
          @id_usuario, @nombre_completo, @email, @entra_id_upn,
          0x00, N'Activo', N'México', SYSUTCDATETIME(), SYSUTCDATETIME(), SYSUTCDATETIME()
        )
      `)

    await transaction.request()
      .input('nxg_id', nxgId)
      .input('id_usuario', idUsuario)
      .query(`
        INSERT INTO cuentas_internas (
          nxg_id, id_usuario, saldo_disponible, saldo_retenido,
          moneda, estatus, created_at, updated_at
        ) VALUES (
          @nxg_id, @id_usuario, 0.00, 0.00,
          N'MXN', N'Activo', SYSUTCDATETIME(), SYSUTCDATETIME()
        )
      `)

    await transaction.request()
      .input('ledger_id', ledgerId)
      .input('id_usuario', idUsuario)
      .input('nxg_id', nxgId)
      .query(`
        INSERT INTO ledger_accounts (
          ledger_account_id, account_type, id_usuario,
          source_table, source_account_id, currency, status,
          ledger_balance, available_balance, hold_balance, credit_limit,
          created_at, updated_at
        ) VALUES (
          @ledger_id, N'INTERNAL', @id_usuario,
          N'cuentas_internas', @nxg_id, N'MXN', N'ACTIVE',
          0, 0, 0, 0,
          SYSUTCDATETIME(), SYSUTCDATETIME()
        )
      `)

    await transaction.request()
      .input('id_usuario', idUsuario)
      .input('detalle', `Auto-provisioning: ${normalizedUpn} -> ${nxgId}`)
      .query(`
        INSERT INTO audit_log (id_usuario, accion, tabla_afectada, registro_id, detalle, created_at)
        VALUES (@id_usuario, N'AUTO_PROVISION', N'usuarios_socios', @id_usuario, @detalle, SYSUTCDATETIME())
      `)

    await transaction.request()
      .input('admin_id', ADMIN_ID)
      .input('titulo', 'Nuevo socio registrado')
      .input('mensaje', `${effectiveName} (${normalizedUpn}) inicio sesion por primera vez. Cuenta ${nxgId} creada con saldo $0.00 MXN.`)
      .query(`
        IF OBJECT_ID(N'dbo.notificaciones', N'U') IS NOT NULL
        BEGIN
          INSERT INTO notificaciones (id_usuario, titulo, mensaje, tipo, leida, link, created_at)
          VALUES (@admin_id, @titulo, @mensaje, N'info', 0, N'/cuentas', SYSUTCDATETIME())
        END
      `)

    await transaction.commit()
    return getUserByUpnOrEmail(db, normalizedUpn)
  } catch (error) {
    await transaction.rollback()
    const existingAfterRace = await getUserByUpnOrEmail(db, normalizedUpn)
    if (existingAfterRace) {
      return existingAfterRace
    }
    console.error('Auto-provision failed:', error)
    throw new Error('No se pudo crear tu cuenta automaticamente. Contacta al administrador.')
  }
}

