// Run a script against production: node scripts/with-prod.mjs scripts/seed-accounts.mjs
// (sets DATABASE_URL to PROD_DATABASE_URL before the script loads server/db.mjs).
import 'dotenv/config'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

if (!process.env.PROD_DATABASE_URL) throw new Error('PROD_DATABASE_URL is not set')
process.env.DATABASE_URL = process.env.PROD_DATABASE_URL
await import(pathToFileURL(path.resolve(process.argv[2])).href)
