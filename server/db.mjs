import pg from 'pg'
import 'dotenv/config'

// Two modes:
//  • DATABASE_URL set  → Neon (production: database `katana`, pooled endpoint)
//    with SSL and a small pool (serverless-friendly).
//  • otherwise         → local Postgres via PG* vars (dev; database `katana`).
// DATABASE_URL (manual) or POSTGRES_URL (auto-injected by the Vercel Postgres integration).
const url = process.env.DATABASE_URL || process.env.POSTGRES_URL

// Give up waiting for a connection after this long, so an exhausted pool or a
// stalled database fails the request instead of hanging it forever.
const connectionTimeoutMillis = 5_000

export const pool = new pg.Pool(
  url
    ? { connectionString: url, ssl: { rejectUnauthorized: false }, max: 3, idleTimeoutMillis: 10_000, connectionTimeoutMillis }
    : {
        host: process.env.PGHOST || 'localhost',
        port: Number(process.env.PGPORT || 5432),
        user: process.env.PGUSER || 'postgres',
        password: process.env.PGPASSWORD || '',
        database: process.env.PGDATABASE || 'katana',
        max: 10,
        connectionTimeoutMillis,
      }
)

// An idle client can error (database restart, dropped socket); log it rather
// than let the unhandled 'error' event take the process down.
pool.on('error', (e) => console.error(`[db] idle client error: ${e.message}`))

export const query = (text, params) => pool.query(text, params)

export async function one(text, params) {
  const { rows } = await pool.query(text, params)
  return rows[0] || null
}
export async function many(text, params) {
  const { rows } = await pool.query(text, params)
  return rows
}
