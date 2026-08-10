import oracledb from 'oracledb'

export async function findUserByEmail(connection, email) {
  const result = await connection.execute(
    `SELECT USER_ID, FULL_NAME, EMAIL, PHONE, PASSWORD_HASH, ROLE, ACCOUNT_STATUS, CREATED_AT
       FROM USERS
      WHERE LOWER(EMAIL) = LOWER(:email)`,
    { email }
  )
  return result.rows[0] || null
}

export async function findUserById(connection, userId) {
  const result = await connection.execute(
    `SELECT USER_ID, FULL_NAME, EMAIL, PHONE, ROLE, ACCOUNT_STATUS, CREATED_AT
       FROM USERS
      WHERE USER_ID = :userId`,
    { userId }
  )
  return result.rows[0] || null
}

export async function createPassenger(connection, { fullName, email, phone, passwordHash }) {
  const result = await connection.execute(
    `INSERT INTO USERS (FULL_NAME, EMAIL, PHONE, PASSWORD_HASH, ROLE)
     VALUES (:fullName, :email, :phone, :passwordHash, 'PASSENGER')
     RETURNING USER_ID INTO :userId`,
    {
      fullName,
      email,
      phone: phone || null,
      passwordHash,
      userId: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
    }
  )
  return result.outBinds.userId[0]
}
