import sql from 'mssql'

const config: sql.config = {
  server: process.env.AZURE_SQL_SERVER || 'neuralxnet.database.windows.net',
  database: process.env.AZURE_SQL_DATABASE || 'neuralxbank',
  user: process.env.AZURE_SQL_USER || '',
  password: process.env.AZURE_SQL_PASSWORD || '',
  options: {
    encrypt: true,
    trustServerCertificate: false,
  },
  pool: {
    max: 5,
    min: 0,
    idleTimeoutMillis: 30000,
  },
}

let pool: sql.ConnectionPool | null = null

export async function getDb(): Promise<sql.ConnectionPool> {
  if (pool && pool.connected) {
    return pool
  }

  try {
    pool = await sql.connect(config)
    return pool
  } catch (err) {
    console.error('Azure SQL connection error:', err)
    throw new Error('No se pudo conectar a neuralxbank')
  }
}

export { sql }
