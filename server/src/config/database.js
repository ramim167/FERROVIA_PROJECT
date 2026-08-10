import oracledb from 'oracledb'

oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT
oracledb.autoCommit = false

let pool

export async function initializeDatabase() {
  if (pool) return pool

  const required = ['ORACLE_USER', 'ORACLE_PASSWORD', 'ORACLE_CONNECTION_STRING']
  const missing = required.filter((key) => !process.env[key])
  if (missing.length) {
    throw new Error(`Missing Oracle environment variables: ${missing.join(', ')}`)
  }

  pool = await oracledb.createPool({
    user: process.env.ORACLE_USER,
    password: process.env.ORACLE_PASSWORD,
    connectString: process.env.ORACLE_CONNECTION_STRING,
    poolMin: Number(process.env.ORACLE_POOL_MIN || 1),
    poolMax: Number(process.env.ORACLE_POOL_MAX || 10),
    poolIncrement: Number(process.env.ORACLE_POOL_INCREMENT || 1),
  })

  return pool
}

export async function getConnection() {
  if (!pool) await initializeDatabase()
  return pool.getConnection()
}

export async function closeDatabase() {
  if (!pool) return
  await pool.close(10)
  pool = undefined
}

export async function withConnection(work) {
  const connection = await getConnection()
  try {
    return await work(connection)
  } finally {
    await connection.close()
  }
}

export async function withTransaction(work) {
  const connection = await getConnection()
  try {
    const result = await work(connection)
    await connection.commit()
    return result
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    await connection.close()
  }
}
