import express from 'express'
import cookieParser from 'cookie-parser'
import 'dotenv/config'
import { many, one } from './db.mjs'
import {
  issueLoginToken, consumeLoginToken, setSession, clearSession,
  currentAccount, requireAuth,
} from './auth.mjs'
import { sendMagicLink, smtpConfigured } from './mailer.mjs'

const app = express()
app.use(express.json())
app.use(cookieParser())

const APP_URL = process.env.APP_URL || 'http://localhost:5173'
// Link hits the API verify route (proxied under the SPA origin in dev), which
// sets the session cookie and redirects into the portal.
const linkFor = (token) => `${APP_URL}/api/auth/verify?token=${encodeURIComponent(token)}`
const landingFor = (acc) => (acc.role === 'candidate' ? '/portal/me' : '/portal')

// ════════════════════════════════════════════════════════════════════════
//  AUTH
// ════════════════════════════════════════════════════════════════════════
app.post('/api/auth/request', async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase()
  if (!email) return res.status(400).json({ error: 'email_required' })
  const acc = await one(`select * from accounts where lower(email) = $1 and active`, [email])
  // Always respond OK (don't leak which emails exist)
  if (!acc) return res.json({ ok: true, delivered: false })
  const token = await issueLoginToken(acc.id)
  const result = await sendMagicLink({ to: acc.email, name: acc.display_name, link: linkFor(token), role: acc.role })
  res.json({ ok: true, delivered: result.delivered })
})

// GET so it works straight from an email link; sets cookie + redirects.
app.get('/api/auth/verify', async (req, res) => {
  const token = String(req.query?.token || '')
  const accountId = await consumeLoginToken(token)
  if (!accountId) return res.redirect(`${APP_URL}/portal/login?error=invalid`)
  const acc = await one(`select * from accounts where id = $1`, [accountId])
  if (!acc || !acc.active) return res.redirect(`${APP_URL}/portal/login?error=invalid`)
  setSession(res, acc)
  res.redirect(`${APP_URL}${landingFor(acc)}`)
})

app.post('/api/auth/logout', (req, res) => { clearSession(res); res.json({ ok: true }) })

app.get('/api/auth/me', async (req, res) => {
  const acc = await currentAccount(req)
  if (!acc) return res.json({ account: null })
  res.json({
    account: {
      id: acc.id, email: acc.email, role: acc.role,
      displayName: acc.display_name, candidateSlug: acc.candidate_slug,
      panelistName: acc.panelist_name,
    },
  })
})

// ════════════════════════════════════════════════════════════════════════
//  DASHBOARD  (panel + admin)
// ════════════════════════════════════════════════════════════════════════
app.get('/api/dashboard', requireAuth('panel', 'admin'), async (req, res) => {
  const settings = await one(`select cutoff_rank from app_settings where id = 1`)
  const criteria = await many(`select key, label, weight, sort_order from criteria order by sort_order`)
  // Order by decision STATUS first (selected at the top), then by score — so the
  // selection cutoff falls cleanly below the selected group.
  const candidates = await many(`
    select slug, name, category, rank, interview_day, total_50, score_pct, status, scored,
           recommendations_summary, panel_reading
      from candidates
     order by case status
                when 'selected' then 0 when 'discuss' then 1 when 'reserve' then 2
                when 'not_selected' then 3 when 'not_assessed' then 4 else 5 end,
              (score_pct is null), score_pct desc, name`)
  // Per-criterion cohort stats across scored candidates (avg / min / max % of weight).
  const agg = await many(`
    select c.key, c.label, c.weight,
           avg(s.avg_norm) as avg_points,
           avg(s.avg_norm / nullif(c.weight,0)) * 100 as avg_pct,
           min(s.avg_norm / nullif(c.weight,0)) * 100 as min_pct,
           max(s.avg_norm / nullif(c.weight,0)) * 100 as max_pct
      from criteria c
      left join scores s on s.criterion_key = c.key
     group by c.key, c.label, c.weight order by c.sort_order`)
  res.json({
    cutoffRank: settings?.cutoff_rank ?? 10,
    criteria,
    candidates,
    aggregate: agg.map((a) => ({
      key: a.key, label: a.label, weight: Number(a.weight),
      avgPoints: a.avg_points != null ? Number(a.avg_points) : null,
      avgPct: a.avg_pct != null ? Number(a.avg_pct) : null,
      minPct: a.min_pct != null ? Number(a.min_pct) : null,
      maxPct: a.max_pct != null ? Number(a.max_pct) : null,
    })),
  })
})

// ════════════════════════════════════════════════════════════════════════
//  CANDIDATE DETAIL  (panel + admin — full, incl. verbatim comments)
// ════════════════════════════════════════════════════════════════════════
app.get('/api/candidates/:slug', requireAuth('panel', 'admin'), async (req, res) => {
  const c = await one(`select * from candidates where slug = $1`, [req.params.slug])
  if (!c) return res.status(404).json({ error: 'not_found' })
  const scores = await many(`
    select s.criterion_key, cr.label, cr.weight, s.avg_norm
      from scores s join criteria cr on cr.key = s.criterion_key
     where s.candidate_slug = $1 order by cr.sort_order`, [c.slug])
  const comments = await many(`
    select panelist_name, recommendation, rec_code, comment
      from panel_comments where candidate_slug = $1 order by id`, [c.slug])
  const feedback = await many(`
    select criterion_key, body, approved from candidate_feedback where candidate_slug = $1`, [c.slug])
  res.json({ candidate: c, scores, comments, feedback })
})

// ════════════════════════════════════════════════════════════════════════
//  CANDIDATE SELF VIEW  (candidate — curated, approved feedback only)
// ════════════════════════════════════════════════════════════════════════
app.get('/api/me', requireAuth('candidate'), async (req, res) => {
  const slug = req.account.candidate_slug
  if (!slug) return res.status(404).json({ error: 'no_candidate' })
  const c = await one(`
    select slug, name, category, discipline, institution, status, score_pct, rank,
           why_fellowship, career_ambitions, personal_statement, capstone, scored
      from candidates where slug = $1`, [slug])
  const scores = await many(`
    select s.criterion_key, cr.label, cr.weight, s.avg_norm
      from scores s join criteria cr on cr.key = s.criterion_key
     where s.candidate_slug = $1 order by cr.sort_order`, [slug])
  const feedback = await many(`
    select criterion_key, body from candidate_feedback
     where candidate_slug = $1 and approved and body <> '' order by criterion_key nulls first`, [slug])
  res.json({ candidate: c, scores, feedback })
})

// ════════════════════════════════════════════════════════════════════════
//  ADMIN
// ════════════════════════════════════════════════════════════════════════
const admin = requireAuth('admin')

app.get('/api/admin/overview', admin, async (req, res) => {
  const accounts = await many(`
    select a.id, a.email, a.role, a.display_name, a.candidate_slug, a.panelist_name,
           a.active, a.last_login_at
      from accounts a order by a.role, a.display_name`)
  const settings = await one(`select cutoff_rank from app_settings where id = 1`)
  res.json({ accounts, smtpConfigured, cutoffRank: settings?.cutoff_rank ?? 10 })
})

app.patch('/api/admin/settings', admin, async (req, res) => {
  const rank = Number(req.body?.cutoffRank)
  if (!Number.isInteger(rank) || rank < 0 || rank > 20) return res.status(400).json({ error: 'bad_rank' })
  await one(`update app_settings set cutoff_rank = $1, updated_at = now() where id = 1 returning id`, [rank])
  res.json({ ok: true, cutoffRank: rank })
})

// Accounts CRUD
app.post('/api/admin/accounts', admin, async (req, res) => {
  const { email, role, displayName, candidateSlug, panelistName } = req.body || {}
  if (!email || !['admin', 'panel', 'candidate'].includes(role))
    return res.status(400).json({ error: 'bad_input' })
  try {
    const acc = await one(
      `insert into accounts (email, role, display_name, candidate_slug, panelist_name)
       values ($1,$2,$3,$4,$5) returning id`,
      [String(email).toLowerCase(), role, displayName || null, candidateSlug || null, panelistName || null]
    )
    res.json({ ok: true, id: acc.id })
  } catch (e) {
    res.status(400).json({ error: e.code === '23505' ? 'email_exists' : 'insert_failed' })
  }
})

app.patch('/api/admin/accounts/:id', admin, async (req, res) => {
  const { email, role, displayName, active } = req.body || {}
  await one(
    `update accounts set
       email = coalesce($2, email),
       role = coalesce($3, role),
       display_name = coalesce($4, display_name),
       active = coalesce($5, active)
     where id = $1 returning id`,
    [req.params.id, email ? String(email).toLowerCase() : null, role || null, displayName ?? null,
     typeof active === 'boolean' ? active : null]
  )
  res.json({ ok: true })
})

app.delete('/api/admin/accounts/:id', admin, async (req, res) => {
  await one(`delete from accounts where id = $1 returning id`, [req.params.id])
  res.json({ ok: true })
})

// Generate / send a magic link for a given account (admin copy-or-send flow)
app.post('/api/admin/invite/:id', admin, async (req, res) => {
  const acc = await one(`select * from accounts where id = $1 and active`, [req.params.id])
  if (!acc) return res.status(404).json({ error: 'not_found' })
  const token = await issueLoginToken(acc.id)
  const link = linkFor(token)
  let delivered = false
  if (req.body?.send) {
    const r = await sendMagicLink({ to: acc.email, name: acc.display_name, link, role: acc.role })
    delivered = r.delivered
  }
  res.json({ ok: true, link, delivered, email: acc.email })
})

// Curated feedback editor (per candidate). criterion_key null = overall summary.
app.get('/api/admin/feedback/:slug', admin, async (req, res) => {
  const rows = await many(
    `select criterion_key, body, approved from candidate_feedback where candidate_slug = $1`,
    [req.params.slug]
  )
  res.json({ feedback: rows })
})

app.put('/api/admin/feedback/:slug', admin, async (req, res) => {
  const items = Array.isArray(req.body?.items) ? req.body.items : []
  for (const it of items) {
    const key = it.criterionKey || null
    await one(
      `insert into candidate_feedback (candidate_slug, criterion_key, body, approved)
       values ($1,$2,$3,$4)
       on conflict (candidate_slug, coalesce(criterion_key, ''))
       do update set body = excluded.body, approved = excluded.approved, updated_at = now()
       returning id`,
      [req.params.slug, key, it.body || '', !!it.approved]
    )
  }
  res.json({ ok: true })
})

// Edit candidate status / key fields
app.patch('/api/admin/candidates/:slug', admin, async (req, res) => {
  const { status, rank } = req.body || {}
  await one(
    `update candidates set status = coalesce($2,status), rank = coalesce($3,rank) where slug = $1 returning id`,
    [req.params.slug, status || null, Number.isInteger(rank) ? rank : null]
  )
  res.json({ ok: true })
})

// Local dev: run a persistent server. On Vercel (serverless) we export `app`
// instead and never call listen.
if (!process.env.VERCEL) {
  const PORT = Number(process.env.PORT || 8787)
  app.listen(PORT, () => console.log(`▶ DATJF portal API on http://localhost:${PORT}  (SMTP: ${smtpConfigured ? 'on' : 'off'})`))
}

export default app
