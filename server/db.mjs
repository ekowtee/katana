import pg from 'pg'
import 'dotenv/config'

// Local Postgres on :5432, user `postgres`, no password, db `datjf_portal`.
export const pool = new pg.Pool({
  host: process.env.PGHOST || 'localhost',
  port: Number(process.env.PGPORT || 5432),
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || '',
  database: process.env.PGDATABASE || 'datjf_portal',
  max: 10,
})

export const query = (text, params) => pool.query(text, params)

export async function one(text, params) {
  const { rows } = await pool.query(text, params)
  return rows[0] || null
}
export async function many(text, params) {
  const { rows } = await pool.query(text, params)
  return rows
}
