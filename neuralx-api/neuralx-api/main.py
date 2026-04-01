"""
NeuralX Portal — FastAPI Backend
Conecta Next.js ↔ Azure SQL (neuralxbank)
Valida tokens JWT de Microsoft Entra ID

Deploy: Azure Functions o cualquier host Python
"""

import os
import pyodbc
import httpx
from datetime import datetime
from typing import Optional
from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from jose import jwt, JWTError

# ============================================
# CONFIG
# ============================================
TENANT_ID = os.getenv("AZURE_AD_TENANT_ID", "155d2fca-bfb9-46c0-9ace-05a0d8e17eee")
CLIENT_ID = os.getenv("AZURE_AD_CLIENT_ID", "cdac7e2f-e5c5-400a-833e-09c2e5836606")
JWKS_URL = f"https://login.microsoftonline.com/{TENANT_ID}/discovery/v2.0/keys"
ISSUER = f"https://login.microsoftonline.com/{TENANT_ID}/v2.0"

# Azure SQL connection string
SQL_CONN = os.getenv(
    "SQL_CONNECTION_STRING",
    "Driver={ODBC Driver 18 for SQL Server};"
    "Server=tcp:neuralxnet.database.windows.net,1433;"
    "Database=neuralxbank;"
    "Authentication=ActiveDirectoryDefault;"
    "Encrypt=yes;"
    "TrustServerCertificate=no;"
)

# Para desarrollo local con usuario/password SQL:
# SQL_CONN = (
#     "Driver={ODBC Driver 18 for SQL Server};"
#     "Server=tcp:neuralxnet.database.windows.net,1433;"
#     "Database=neuralxbank;"
#     "Uid=TU_USUARIO_SQL;"
#     "Pwd=TU_PASSWORD_SQL;"
#     "Encrypt=yes;"
#     "TrustServerCertificate=no;"
# )

app = FastAPI(
    title="NeuralX Portal API",
    version="1.0.0",
    docs_url="/api/docs",
)

# CORS — permitir frontend
cors_origins = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:3000,http://localhost:3001,http://localhost:3002,http://localhost:3003,http://localhost:3100,https://portal.neuralxglobal.net",
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in cors_origins if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================
# DATABASE
# ============================================
def get_db():
    """Abre conexión a Azure SQL neuralxbank."""
    conn = pyodbc.connect(SQL_CONN)
    try:
        yield conn
    finally:
        conn.close()


def query_one(conn, sql: str, params: tuple = ()):
    cursor = conn.cursor()
    cursor.execute(sql, params)
    columns = [col[0] for col in cursor.description]
    row = cursor.fetchone()
    if row:
        return dict(zip(columns, row))
    return None


def query_all(conn, sql: str, params: tuple = ()):
    cursor = conn.cursor()
    cursor.execute(sql, params)
    columns = [col[0] for col in cursor.description]
    return [dict(zip(columns, row)) for row in cursor.fetchall()]


# ============================================
# AUTH — Validar token JWT de Entra ID
# ============================================
_jwks_cache = None


async def get_jwks():
    global _jwks_cache
    if _jwks_cache is None:
        async with httpx.AsyncClient() as client:
            resp = await client.get(JWKS_URL)
            _jwks_cache = resp.json()
    return _jwks_cache


async def get_current_user(authorization: str = Header(...)):
    """Extrae y valida el token JWT de Entra ID.
    Retorna el UPN del usuario autenticado."""

    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Token missing")

    token = authorization.replace("Bearer ", "")

    try:
        # Obtener las llaves públicas de Entra ID
        jwks = await get_jwks()

        # Decodificar el header para encontrar la llave correcta
        unverified_header = jwt.get_unverified_header(token)
        kid = unverified_header.get("kid")

        rsa_key = None
        for key in jwks.get("keys", []):
            if key["kid"] == kid:
                rsa_key = key
                break

        if not rsa_key:
            raise HTTPException(status_code=401, detail="Key not found")

        # Validar el token
        payload = jwt.decode(
            token,
            rsa_key,
            algorithms=["RS256"],
            audience=CLIENT_ID,
            issuer=ISSUER,
        )

        # Extraer UPN (preferred_username o upn)
        upn = payload.get("preferred_username") or payload.get("upn")
        if not upn:
            raise HTTPException(status_code=401, detail="UPN not in token")

        return upn

    except JWTError as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")


# ============================================
# MODELOS
# ============================================
class SolicitudRetiro(BaseModel):
    monto: float
    moneda: str = "MXN"
    concepto: Optional[str] = None


# ============================================
# ENDPOINTS
# ============================================

@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "neuralx-portal-api", "timestamp": datetime.utcnow().isoformat()}


@app.get("/api/me")
async def get_me(upn: str = Depends(get_current_user), conn=Depends(get_db)):
    """Retorna datos del usuario autenticado."""
    user = query_one(
        conn,
        """
        SELECT id_usuario, nombre_completo, puesto, departamento,
               email, entra_id_upn, estatus, fecha_conexion
        FROM usuarios_socios
        WHERE entra_id_upn = ?
        """,
        (upn,),
    )

    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado en neuralxbank")

    return user


@app.get("/api/cuentas")
async def get_cuentas(upn: str = Depends(get_current_user), conn=Depends(get_db)):
    """Retorna las cuentas bancarias del usuario autenticado."""

    # Primero obtener el id_usuario desde el UPN
    user = query_one(
        conn,
        "SELECT id_usuario FROM usuarios_socios WHERE entra_id_upn = ?",
        (upn,),
    )
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    cuentas = query_all(
        conn,
        """
        SELECT id_cuenta, banco, numero_cuenta, swift_code, moneda,
               saldo_total, saldo_disponible, tipo_cuenta, icono_banco_url
        FROM cuentas_bancarias
        WHERE id_usuario = ?
        ORDER BY id_cuenta
        """,
        (user["id_usuario"],),
    )

    # Calcular saldo consolidado
    total = sum(c["saldo_total"] for c in cuentas)

    return {
        "cuentas": cuentas,
        "total_cuentas": len(cuentas),
        "saldo_consolidado": total,
    }


@app.get("/api/transacciones")
async def get_transacciones(
    estatus: Optional[str] = None,
    limit: int = 50,
    upn: str = Depends(get_current_user),
    conn=Depends(get_db),
):
    """Retorna las transacciones del usuario autenticado."""

    user = query_one(
        conn,
        "SELECT id_usuario FROM usuarios_socios WHERE entra_id_upn = ?",
        (upn,),
    )
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    # Obtener IDs de cuentas del usuario
    cuentas = query_all(
        conn,
        "SELECT id_cuenta FROM cuentas_bancarias WHERE id_usuario = ?",
        (user["id_usuario"],),
    )
    if not cuentas:
        return {"transacciones": [], "total": 0}

    cuenta_ids = [c["id_cuenta"] for c in cuentas]
    placeholders = ",".join(["?" for _ in cuenta_ids])

    sql = f"""
        SELECT TOP (?) id_transaccion, id_cuenta_origen, id_cuenta_destino,
               fecha_hora, monto, moneda, tipo_transaccion, concepto,
               estatus, referencia
        FROM transacciones
        WHERE id_cuenta_origen IN ({placeholders})
    """
    params = [limit] + cuenta_ids

    if estatus:
        sql += " AND estatus = ?"
        params.append(estatus)

    sql += " ORDER BY fecha_hora DESC"

    txns = query_all(conn, sql, tuple(params))

    return {"transacciones": txns, "total": len(txns)}


@app.post("/api/solicitud-retiro")
async def crear_solicitud_retiro(
    solicitud: SolicitudRetiro,
    upn: str = Depends(get_current_user),
    conn=Depends(get_db),
):
    """Crea una solicitud de retiro (pendiente de aprobación por admin)."""

    user = query_one(
        conn,
        "SELECT id_usuario, nombre_completo FROM usuarios_socios WHERE entra_id_upn = ?",
        (upn,),
    )
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    # Generar ID de solicitud
    id_txn = f"SOL-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"

    # Obtener primera cuenta del usuario como origen
    cuenta = query_one(
        conn,
        "SELECT id_cuenta FROM cuentas_bancarias WHERE id_usuario = ? ORDER BY id_cuenta",
        (user["id_usuario"],),
    )
    if not cuenta:
        raise HTTPException(status_code=400, detail="Sin cuenta bancaria registrada")

    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT INTO transacciones
            (id_transaccion, id_cuenta_origen, fecha_hora, monto, moneda,
             tipo_transaccion, concepto, estatus)
        VALUES (?, ?, SYSUTCDATETIME(), ?, ?, N'saliente', ?, N'en curso')
        """,
        (id_txn, cuenta["id_cuenta"], solicitud.monto, solicitud.moneda, solicitud.concepto),
    )
    conn.commit()

    # Audit log
    cursor.execute(
        """
        INSERT INTO audit_log (id_usuario, accion, tabla_afectada, registro_id, detalle)
        VALUES (?, N'SOLICITUD_RETIRO', N'transacciones', ?, ?)
        """,
        (user["id_usuario"], id_txn, f"Monto: {solicitud.monto} {solicitud.moneda}"),
    )
    conn.commit()

    return {
        "exito": True,
        "id_solicitud": id_txn,
        "monto": solicitud.monto,
        "moneda": solicitud.moneda,
        "estatus": "en curso",
        "mensaje": "Solicitud creada. Pendiente de aprobación del administrador.",
    }


# ============================================
# ADMIN ENDPOINTS (solo para Miguel)
# ============================================
ADMIN_UPNS = ["malvarez@neuralxglobal.net", "neuralx@neuralxglobal.net"]


async def require_admin(upn: str = Depends(get_current_user)):
    if upn not in ADMIN_UPNS:
        raise HTTPException(status_code=403, detail="Acceso denegado — solo administradores")
    return upn


@app.get("/api/admin/usuarios")
async def admin_get_usuarios(upn: str = Depends(require_admin), conn=Depends(get_db)):
    """[ADMIN] Lista todos los usuarios y sus saldos."""
    return query_all(conn, "SELECT * FROM v_resumen_usuario")


@app.get("/api/admin/cuentas")
async def admin_get_cuentas(upn: str = Depends(require_admin), conn=Depends(get_db)):
    """[ADMIN] Lista todas las cuentas con detalle."""
    return query_all(conn, "SELECT * FROM v_cuentas_detalle")


@app.get("/api/admin/solicitudes-pendientes")
async def admin_get_solicitudes(upn: str = Depends(require_admin), conn=Depends(get_db)):
    """[ADMIN] Lista solicitudes de retiro pendientes."""
    return query_all(
        conn,
        """
        SELECT t.*, u.nombre_completo, u.entra_id_upn
        FROM transacciones t
        JOIN cuentas_bancarias c ON t.id_cuenta_origen = c.id_cuenta
        JOIN usuarios_socios u ON c.id_usuario = u.id_usuario
        WHERE t.estatus = N'en curso' AND t.tipo_transaccion = N'saliente'
        ORDER BY t.fecha_hora DESC
        """,
    )


@app.post("/api/admin/aprobar/{id_transaccion}")
async def admin_aprobar(id_transaccion: str, upn: str = Depends(require_admin), conn=Depends(get_db)):
    """[ADMIN] Aprueba una solicitud de retiro."""
    cursor = conn.cursor()
    cursor.execute(
        "UPDATE transacciones SET estatus = N'completada' WHERE id_transaccion = ?",
        (id_transaccion,),
    )
    conn.commit()

    cursor.execute(
        """
        INSERT INTO audit_log (id_usuario, accion, tabla_afectada, registro_id, detalle)
        VALUES (?, N'APROBAR_RETIRO', N'transacciones', ?, N'Aprobado por admin')
        """,
        (upn, id_transaccion),
    )
    conn.commit()

    return {"exito": True, "id_transaccion": id_transaccion, "nuevo_estatus": "completada"}


@app.post("/api/admin/rechazar/{id_transaccion}")
async def admin_rechazar(id_transaccion: str, upn: str = Depends(require_admin), conn=Depends(get_db)):
    """[ADMIN] Rechaza una solicitud de retiro."""
    cursor = conn.cursor()
    cursor.execute(
        "UPDATE transacciones SET estatus = N'cancelada' WHERE id_transaccion = ?",
        (id_transaccion,),
    )
    conn.commit()
    return {"exito": True, "id_transaccion": id_transaccion, "nuevo_estatus": "cancelada"}


# ============================================
# RUN
# ============================================
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
