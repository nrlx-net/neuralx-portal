import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { requireAuth } from '@/lib/auth-helpers'

function isMexicoCountry(value?: string) {
  const normalized = (value || '').trim().toLowerCase()
  return normalized === 'mexico' || normalized === 'méxico'
}

export async function GET(request: Request) {
  const { error, upn } = await requireAuth()
  if (error) return error

  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')?.trim()

  try {
    const db = await getDb()
    const userResult = await db
      .request()
      .input('upn', upn)
      .query('SELECT id_usuario FROM usuarios_socios WHERE entra_id_upn = @upn')

    if (userResult.recordset.length === 0) {
      return NextResponse.json({ detail: 'Usuario no encontrado' }, { status: 404 })
    }

    const userId = userResult.recordset[0].id_usuario
    const req = db.request().input('userId', userId)
    let query = `
      SELECT id_beneficiario, id_usuario, tipo, nombre, apellidos, email, pais, divisa,
             clabe, iban, swift, banco, numero_cuenta, estatus, created_at
      FROM beneficiarios
      WHERE id_usuario = @userId AND estatus = N'activo'
    `
    if (q) {
      query += `
        AND (
          nombre LIKE @q OR
          apellidos LIKE @q OR
          clabe LIKE @q OR
          numero_cuenta LIKE @q
        )
      `
      req.input('q', `%${q}%`)
    }
    query += ' ORDER BY created_at DESC'
    const result = await req.query(query)

    return NextResponse.json({
      beneficiarios: result.recordset,
      total: result.recordset.length,
    })
  } catch (err: any) {
    console.error('Error /api/beneficiarios GET:', err)
    return NextResponse.json({ detail: err.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const { error, upn } = await requireAuth()
  if (error) return error

  try {
    const body = await request.json()
    const {
      tipo = 'particular',
      nombre,
      apellidos = null,
      email = null,
      pais = 'México',
      divisa = 'MXN',
      clabe = null,
      iban = null,
      swift = null,
      banco = null,
      numero_cuenta = null,
    } = body

    if (!nombre || String(nombre).trim().length < 2) {
      return NextResponse.json({ detail: 'Nombre inválido' }, { status: 400 })
    }

    if (isMexicoCountry(pais)) {
      if (!clabe || !/^\d{18}$/.test(String(clabe))) {
        return NextResponse.json({ detail: 'La CLABE debe tener exactamente 18 dígitos' }, { status: 400 })
      }
    }

    const db = await getDb()
    const userResult = await db
      .request()
      .input('upn', upn)
      .query('SELECT id_usuario FROM usuarios_socios WHERE entra_id_upn = @upn')

    if (userResult.recordset.length === 0) {
      return NextResponse.json({ detail: 'Usuario no encontrado' }, { status: 404 })
    }

    const userId = userResult.recordset[0].id_usuario
    const now = new Date()
    const idBeneficiario = `BEN-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}-${Math.floor(Math.random() * 900 + 100)}`

    await db
      .request()
      .input('id_beneficiario', idBeneficiario)
      .input('id_usuario', userId)
      .input('tipo', tipo)
      .input('nombre', nombre)
      .input('apellidos', apellidos)
      .input('email', email)
      .input('pais', pais)
      .input('divisa', divisa)
      .input('clabe', clabe)
      .input('iban', iban)
      .input('swift', swift)
      .input('banco', banco)
      .input('numero_cuenta', numero_cuenta)
      .query(`
        INSERT INTO beneficiarios (
          id_beneficiario, id_usuario, tipo, nombre, apellidos, email, pais, divisa,
          clabe, iban, swift, banco, numero_cuenta
        ) VALUES (
          @id_beneficiario, @id_usuario, @tipo, @nombre, @apellidos, @email, @pais, @divisa,
          @clabe, @iban, @swift, @banco, @numero_cuenta
        )
      `)

    const saved = await db
      .request()
      .input('id_beneficiario', idBeneficiario)
      .query(`
        SELECT id_beneficiario, id_usuario, tipo, nombre, apellidos, email, pais, divisa,
               clabe, iban, swift, banco, numero_cuenta, estatus, created_at
        FROM beneficiarios
        WHERE id_beneficiario = @id_beneficiario
      `)

    return NextResponse.json({ exito: true, beneficiario: saved.recordset[0] }, { status: 201 })
  } catch (err: any) {
    console.error('Error /api/beneficiarios POST:', err)
    return NextResponse.json({ detail: err.message }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const { error, upn } = await requireAuth()
  if (error) return error

  try {
    const body = await request.json().catch(() => ({}))
    const { searchParams } = new URL(request.url)
    const id_beneficiario = body?.id_beneficiario || searchParams.get('id_beneficiario')

    if (!id_beneficiario) {
      return NextResponse.json({ detail: 'id_beneficiario es requerido' }, { status: 400 })
    }

    const db = await getDb()
    const userResult = await db
      .request()
      .input('upn', upn)
      .query('SELECT id_usuario FROM usuarios_socios WHERE entra_id_upn = @upn')

    if (userResult.recordset.length === 0) {
      return NextResponse.json({ detail: 'Usuario no encontrado' }, { status: 404 })
    }
    const userId = userResult.recordset[0].id_usuario

    await db
      .request()
      .input('id_beneficiario', id_beneficiario)
      .input('id_usuario', userId)
      .query(`
        UPDATE beneficiarios
        SET estatus = N'inactivo'
        WHERE id_beneficiario = @id_beneficiario AND id_usuario = @id_usuario
      `)

    return NextResponse.json({ exito: true, id_beneficiario })
  } catch (err: any) {
    console.error('Error /api/beneficiarios DELETE:', err)
    return NextResponse.json({ detail: err.message }, { status: 500 })
  }
}
