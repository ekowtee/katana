import express from 'express'
import { many, one, query } from './db.mjs'
import { requireAuth } from './auth.mjs'
import { recomputeCandidate, rankCohort, mayView } from './assessment.mjs'
import { aiConfig } from './settings.mjs'
import { readCv } from './ai.mjs'

// CV upload per cohort, and the admin's chosen AI provider (Admin → Settings)
// reading each CV into a candidate record plus the panel's CV summary,
// written against the cohort's role.

const MAX_UPLOAD = 4 * 1024 * 1024 // Vercel caps a function request body at 4.5 MB

const slugify = (s) =>
  String(s).toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50) || 'candidate'

// Create the candidate, or update the one this CV belongs to (same email, or
// the candidate an earlier run of this file created). Returns the slug.
async function saveCandidate(file, cohort, cv) {
  const email = cv.email.trim().toLowerCase() || null
  let existing = email ? await one(`select slug, cohort_slug from candidates where lower(email) = $1`, [email]) : null
  if (!existing && file.candidate_slug) existing = await one(`select slug, cohort_slug from candidates where slug = $1`, [file.candidate_slug])
  const fields = [cv.name.trim(), email, cv.phone.trim() || null, cv.location.trim() || null, cv.category,
    cv.qualification.trim() || null, cv.institution.trim() || null, cv.summary.trim(), cohort.slug]

  let slug
  if (existing) {
    slug = existing.slug
    await query(
      `update candidates set name = $2, email = coalesce($3, email), phone = coalesce($4, phone), address = coalesce($5, address),
              category = $6, discipline = coalesce($7, discipline), institution = coalesce($8, institution),
              cv_summary = $9, cohort_slug = $10
        where slug = $1`, [slug, ...fields])
  } else {
    const base = slugify(cv.name)
    slug = base
    for (let n = 2; await one(`select 1 from candidates where slug = $1`, [slug]); n++) slug = `${base}-${n}`
    await query(
      `insert into candidates (slug, name, email, phone, address, category, discipline, institution, cv_summary, cohort_slug, status)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'review')`, [slug, ...fields])
  }
  // Their sign-in (only used once they're sent a link), as for seeded candidates.
  if (email) {
    await query(
      `insert into accounts (email, role, display_name, candidate_slug) values ($1, 'candidate', $2, $3)
       on conflict (email) do nothing`, [email, cv.name.trim(), slug])
  }
  if (existing && existing.cohort_slug !== cohort.slug) {
    await recomputeCandidate(slug)
    if (existing.cohort_slug) await rankCohort(existing.cohort_slug)
  }
  return slug
}

export function cvRoutes() {
  const r = express.Router()
  const admin = requireAuth('admin')
  const staff = requireAuth('panel', 'admin')

  r.get('/api/admin/cohorts/:slug/cvs', admin, async (req, res) => {
    const files = await many(`
      select f.id, f.filename, f.size_bytes, f.status, f.error, f.created_at, f.processed_at,
             f.candidate_slug, c.name as candidate_name
        from cv_files f left join candidates c on c.slug = f.candidate_slug
       where f.cohort_slug = $1 order by f.created_at, f.id`, [req.params.slug])
    const ai = await aiConfig()
    res.json({ files, ai: ai ? { provider: ai.provider, model: ai.model } : null })
  })

  // Body is the raw PDF; the filename travels in X-Filename (URI-encoded).
  r.post('/api/admin/cohorts/:slug/cvs', admin,
    express.raw({ type: 'application/pdf', limit: MAX_UPLOAD }),
    async (req, res) => {
      if (!(await one(`select 1 from cohorts where slug = $1`, [req.params.slug]))) return res.status(404).json({ error: 'not_found' })
      const buf = req.body
      if (!Buffer.isBuffer(buf) || buf.length < 5 || buf.subarray(0, 5).toString('latin1') !== '%PDF-')
        return res.status(400).json({ error: 'not_pdf' })
      let name = 'cv.pdf'
      try { name = decodeURIComponent(String(req.get('x-filename') || name)).slice(0, 200) } catch { /* keep default */ }
      const f = await one(
        `insert into cv_files (cohort_slug, filename, content_type, size_bytes, data, uploaded_by)
         values ($1, $2, 'application/pdf', $3, $4, $5) returning id`,
        [req.params.slug, name, buf.length, buf, req.account.id])
      res.json({ ok: true, id: f.id })
    })

  // Read one CV with Claude → candidate + summary. One CV per request so each
  // stays well inside the function time limit; the admin page runs them in turn.
  r.post('/api/admin/cvs/:id/process', admin, async (req, res) => {
    const ai = await aiConfig()
    if (!ai) return res.status(503).json({ error: 'ai_not_configured', message: 'Add an AI provider and API key in Admin → Settings first.' })
    // Claim it (a run that died mid-way frees itself after 10 minutes).
    const file = await one(
      `update cv_files set status = 'processing', error = null, processed_at = now()
        where id = $1 and (status <> 'processing' or processed_at < now() - interval '10 minutes')
        returning id, cohort_slug, data, candidate_slug`, [req.params.id])
    if (!file) {
      const exists = await one(`select status from cv_files where id = $1`, [req.params.id])
      return res.status(exists ? 409 : 404).json({ error: exists ? 'already_processing' : 'not_found' })
    }
    const cohort = await one(`select slug, name, role from cohorts where slug = $1`, [file.cohort_slug])
    try {
      const cv = await readCv(ai, file.data, cohort)
      const slug = await saveCandidate(file, cohort, cv)
      await query(`update cv_files set status = 'done', candidate_slug = $2, processed_at = now() where id = $1`, [file.id, slug])
      res.json({ ok: true, candidateSlug: slug, name: cv.name.trim() })
    } catch (e) {
      console.error(`[cv] file ${file.id} failed: ${e.message}`)
      const msg = e.safe ? e.message : 'Something went wrong reading this CV. Re-run it.'
      await query(`update cv_files set status = 'error', error = $2, processed_at = now() where id = $1`, [file.id, msg.slice(0, 300)])
      res.status(502).json({ error: 'process_failed', message: msg })
    }
  })

  // Removes the file only; a candidate it created stays.
  r.delete('/api/admin/cvs/:id', admin, async (req, res) => {
    await query(`delete from cv_files where id = $1`, [req.params.id])
    res.json({ ok: true })
  })

  // The CV itself, for panel and admin (opens in the browser's PDF viewer).
  r.get('/api/cvs/:id/file', staff, async (req, res) => {
    const f = await one(`select filename, content_type, data, cohort_slug from cv_files where id = $1`, [req.params.id])
    if (!f) return res.status(404).json({ error: 'not_found' })
    if (!(await mayView(req.account, f.cohort_slug))) return res.status(403).json({ error: 'not_on_panel' })
    res.set('Content-Type', f.content_type)
    res.set('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(f.filename)}`)
    res.set('Cache-Control', 'private, no-store')
    res.send(f.data)
  })

  return r
}
