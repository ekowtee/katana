/**
 * Seeds login accounts. Idempotent — safe to re-run, and works against either the
 * local DB or a cloud DATABASE_URL (set DATABASE_URL to target the cloud).
 *
 *   1 admin (you), one candidate account per applicant email, panel placeholders.
 *
 * Run:  node scripts/seed-accounts.mjs
 */
import { pool } from '../server/db.mjs'

const ADMINS = [
  ['ekow@interactivedigital.com.gh', 'Ekow Thompson'],
  ['ekowthompson@gmail.com', 'Ekow Thompson'],
]
const PANEL = [
  ['ewuradjoa.aikins@example.com', 'Ewuradjoa Aikins'],
  ['phyllis.woode-nartey@example.com', 'Phyllis Woode-Nartey'],
  ['jason.nartey@example.com', 'Jason Nartey'],
]

for (const [email, name] of ADMINS) {
  await pool.query(
    `insert into accounts (email, role, display_name) values ($1,'admin',$2)
     on conflict (email) do update set role='admin', active=true`,
    [email, name]
  )
}

// one candidate account per applicant (maps their magic link → own page)
await pool.query(`
  insert into accounts (email, role, display_name, candidate_slug)
  select lower(email), 'candidate', name, slug from candidates
  where email is not null and email <> ''
  on conflict (email) do nothing`)

for (const [email, name] of PANEL) {
  await pool.query(
    `insert into accounts (email, role, display_name, panelist_name) values ($1,'panel',$2,$2)
     on conflict (email) do nothing`,
    [email, name]
  )
}

const { rows } = await pool.query(`select role, count(*)::int n from accounts group by role order by role`)
console.log('✓ accounts:', rows.map((r) => `${r.role} ${r.n}`).join(', '))
await pool.end()
