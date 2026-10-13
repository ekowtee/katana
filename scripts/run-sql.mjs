// Apply a SQL file to the database.
//   node scripts/run-sql.mjs <file>          → local Postgres (PG* vars), or DATABASE_URL if set
//   node scripts/run-sql.mjs <file> --prod   → PROD_DATABASE_URL (Neon production, database `katana`)
// psql meta-commands (lines starting with "\", e.g. \encoding) are skipped.
import 'dotenv/config'
import fs from 'node:fs'
import pg from 'pg'

const [file, flag] = process.argv.slice(2)
if (!file) throw new Error('usage: node scripts/run-sql.mjs <file> [--prod]')
const url = flag === '--prod' ? process.env.PROD_DATABASE_URL : process.env.DATABASE_URL
if (flag === '--prod' && !url) throw new Error('PROD_DATABASE_URL is not set')

const config = url
  ? { connectionString: url, ssl: { rejectUnauthorized: false } }
  : {
      host: process.env.PGHOST || 'localhost', port: Number(process.env.PGPORT || 5432),
      user: process.env.PGUSER || 'postgres', password: process.env.PGPASSWORD || '',
      database: process.env.PGDATABASE || 'katana',
    }
const sql = fs.readFileSync(file, 'utf8').split(/\r?\n/).filter((l) => !l.startsWith('\\')).join('\n')
const client = new pg.Client(config)
await client.connect()
await client.query(sql)
await client.end()
const where = url ? (() => { const u = new URL(url); return `${u.hostname}${u.pathname}` })() : `${config.host}:${config.port}/${config.database}`
console.log(`✓ ${file} → ${where}`)
