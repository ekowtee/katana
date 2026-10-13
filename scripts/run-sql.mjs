// Apply a SQL file to the database.
//   node scripts/run-sql.mjs <file>          → DATABASE_URL (local: the Neon katana_dev database)
//   node scripts/run-sql.mjs <file> --prod   → PROD_DATABASE_URL (Neon production)
// psql meta-commands (lines starting with "\", e.g. \encoding) are skipped.
import 'dotenv/config'
import fs from 'node:fs'
import pg from 'pg'

const [file, flag] = process.argv.slice(2)
if (!file) throw new Error('usage: node scripts/run-sql.mjs <file> [--prod]')
const url = flag === '--prod' ? process.env.PROD_DATABASE_URL : process.env.DATABASE_URL
if (!url) throw new Error(flag === '--prod' ? 'PROD_DATABASE_URL is not set' : 'DATABASE_URL is not set')

const sql = fs.readFileSync(file, 'utf8').split(/\r?\n/).filter((l) => !l.startsWith('\\')).join('\n')
const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } })
await client.connect()
await client.query(sql)
await client.end()
const u = new URL(url)
console.log(`✓ ${file} → ${u.hostname}${u.pathname}`)
