import pg from 'pg'
import 'dotenv/config'

// Two modes:
//  • DATABASE_URL set  → cloud Postgres (Neon / Vercel Postgres / Supabase) with
//    SSL and a small pool (serverless-friendly). Use the *pooled* connection
//    string from your provider.
//  • otherwise         → local Postgres via PG* vars (dev).
// DATABASE_URL (manual) or POSTGRES_URL (auto-injected by the Vercel Postgres integration).
const url = process.env.DATABASE_URL || process.env.POSTGRES_URL

export const pool = new pg.Pool(
  url
    ? { connectionString: url, ssl: { rejectUnauthorized: false }, max: 3, idleTimeoutMillis: 10_000 }
    : {
        host: process.env.PGHOST || 'localhost',
        port: Number(process.env.PGPORT || 5432),
        user: process.env.PGUSER || 'postgres',
        password: process.env.PGPASSWORD || '',
        database: process.env.PGDATABASE || 'datjf_portal',
        max: 10,
      }
)

export const query = (text, params) => pool.query(text, params)

export async function one(text, params) {
  const { rows } = await pool.query(text, params)
  return rows[0] || null
}
export async function many(text, params) {
  const { rows } = await pool.query(text, params)
  return rows
}
