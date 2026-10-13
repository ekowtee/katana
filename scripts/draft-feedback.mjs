/**
 * Drafts candidate-facing feedback from the panel forms and stores it as
 * UNAPPROVED entries in candidate_feedback (admin reviews/edits/approves before
 * anything is published to a candidate). Idempotent — safe to re-run.
 *
 * Run:  node scripts/draft-feedback.mjs
 */
import { pool } from '../server/db.mjs'

const F = {
  // e.g. 'jane-doe': { overall: '...', criteria: { communication: '...' } }
}

// ── upsert as UNAPPROVED drafts ──────────────────────────────────────────────
const client = pool
let n = 0
for (const [slug, fb] of Object.entries(F)) {
  const items = [{ key: null, body: fb.overall }, ...Object.entries(fb.criteria || {}).map(([k, body]) => ({ key: k, body }))]
  for (const it of items) {
    if (!it.body) continue
    await client.query(
      `insert into candidate_feedback (candidate_slug, criterion_key, body, approved)
       values ($1,$2,$3,false)
       on conflict (candidate_slug, coalesce(criterion_key, ''))
       do update set body = excluded.body, approved = false, updated_at = now()`,
      [slug, it.key, it.body]
    )
    n++
  }
}
console.log(`✓ drafted ${n} feedback entries across ${Object.keys(F).length} candidates (all UNAPPROVED — pending review).`)
await pool.end()
