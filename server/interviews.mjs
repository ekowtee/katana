import express from 'express'
import 'dotenv/config'
import { many, one, query } from './db.mjs'
import { requireAuth, issueLoginToken } from './auth.mjs'
import { sendInterviewInvite, sendResultsEmail } from './mailer.mjs'
import { buildIcs, interviewUid, formatSlot } from './calendar.mjs'
import { smtpConfig } from './settings.mjs'

// Interview scheduling (calendar invitations to the panel and candidate) and
// "closing the gate" on a cohort: lock scoring and email every candidate their
// outcome with a sign-in link. Every email is logged in `notifications`.

const APP_URL = process.env.APP_URL || 'http://localhost:5173'
const linkFor = (token) => `${APP_URL}/api/auth/verify?token=${encodeURIComponent(token)}`
const host = () => { try { return new URL(APP_URL).hostname } catch { return 'katana.local' } }
const UNDECIDED = ['review', 'discuss']

async function log(n) {
  await query(
    `insert into notifications (kind, cohort_slug, candidate_slug, account_id, recipient, subject, delivered, error, sent_by)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [n.kind, n.cohortSlug, n.candidateSlug || null, n.accountId || null, n.recipient, n.subject || null, !!n.delivered, n.error || null, n.sentBy || null])
}

const panelOf = (cohortSlug) => many(
  `select a.id, a.email, coalesce(a.display_name, a.email) as name
     from cohort_panel p join accounts a on a.id = p.account_id
    where p.cohort_slug = $1 and a.active order by name`, [cohortSlug])

// Send (or re-send) one candidate's interview to the panel, and to the
// candidate when asked. Returns per-recipient results.
async function sendInvites({ cohort, cand, includeCandidate, sentBy, method = 'REQUEST' }) {
  const smtp = await smtpConfig()
  const panel = await panelOf(cohort.slug)
  const start = new Date(cand.interview_at)
  const minutes = cand.interview_minutes || 45
  const location = cand.interview_location || cohort.interview_location || ''
  const when = formatSlot(start, minutes)
  const seq = (await one(`update candidates set interview_sequence = interview_sequence + 1 where slug = $1 returning interview_sequence`, [cand.slug])).interview_sequence
  const organizer = { name: 'Ninani Group HR', email: (smtp?.from?.match(/<([^>]+)>/)?.[1] || smtp?.from || smtp?.user || 'hr@ninanigroup.com').trim() }
  const attendees = [...panel.map((p) => ({ name: p.name, email: p.email }))]
  if (includeCandidate && cand.email) attendees.push({ name: cand.name, email: cand.email })
  const summary = `Interview: ${cand.name} — ${cohort.role || cohort.name}`
  const ics = buildIcs({
    uid: interviewUid(cand.slug, host()), sequence: seq, method, start, minutes, summary, location,
    description: `${cohort.role ? `Role: ${cohort.role}\n` : ''}Cohort: ${cohort.name}\nCandidate: ${cand.name}\n\nPanel: ${panel.map((p) => p.name).join(', ')}\n\nPortal: ${APP_URL}/portal/candidate/${cand.slug}`,
    url: `${APP_URL}/portal/candidate/${cand.slug}`, organizer, attendees,
  })
  const results = []
  const common = { candidateName: cand.name, role: cohort.role, cohortName: cohort.name, when, location, ics, method }
  for (const p of panel) {
    const r = await sendInterviewInvite({ ...common, to: p.email, name: p.name, audience: 'panel', portalUrl: `${APP_URL}/portal/candidate/${cand.slug}` })
    await log({ kind: method === 'CANCEL' ? 'interview_cancel' : 'interview_invite', cohortSlug: cohort.slug, candidateSlug: cand.slug, accountId: p.id, recipient: p.email, subject: r.subject, delivered: r.delivered, error: r.error || r.reason, sentBy })
    results.push({ to: p.email, delivered: r.delivered, error: r.error || r.reason || null })
  }
  if (includeCandidate && cand.email) {
    const r = await sendInterviewInvite({ ...common, to: cand.email, name: cand.name, audience: 'candidate' })
    await log({ kind: method === 'CANCEL' ? 'interview_cancel' : 'interview_invite', cohortSlug: cohort.slug, candidateSlug: cand.slug, recipient: cand.email, subject: r.subject, delivered: r.delivered, error: r.error || r.reason, sentBy })
    results.push({ to: cand.email, delivered: r.delivered, error: r.error || r.reason || null })
  }
  if (method === 'REQUEST' && results.some((x) => x.delivered)) {
    await query(`update candidates set invites_sent_at = now() where slug = $1`, [cand.slug])
  }
  return results
}

// Email each candidate their outcome with a sign-in link.
export async function notifyResults({ cohort, candidates, sentBy }) {
  const out = { notified: 0, failed: 0, skipped: 0, details: [] }
  for (const cand of candidates) {
    if (!cand.email) { out.skipped++; out.details.push({ slug: cand.slug, name: cand.name, skipped: 'no email' }); continue }
    let acc = await one(`select id from accounts where lower(email) = $1`, [cand.email.toLowerCase()])
    if (!acc) {
      acc = await one(`insert into accounts (email, role, display_name, candidate_slug) values ($1, 'candidate', $2, $3) returning id`, [cand.email.toLowerCase(), cand.name, cand.slug])
    }
    const link = linkFor(await issueLoginToken(acc.id))
    const r = await sendResultsEmail({ to: cand.email, name: cand.name, status: cand.status, role: cohort.role, link })
    await log({ kind: 'results', cohortSlug: cohort.slug, candidateSlug: cand.slug, recipient: cand.email, subject: r.subject, delivered: r.delivered, error: r.error || r.reason, sentBy })
    if (r.delivered) { out.notified++; await query(`update candidates set result_sent_at = now() where slug = $1`, [cand.slug]) }
    else { out.failed++ }
    out.details.push({ slug: cand.slug, name: cand.name, delivered: r.delivered, error: r.error || r.reason || null })
  }
  return out
}

export function interviewRoutes() {
  const r = express.Router()
  const admin = requireAuth('admin')
  const cohortOr404 = async (slug, res) => {
    const co = await one(`select slug, name, role, interview_location, closed_at from cohorts where slug = $1`, [slug])
    if (!co) res.status(404).json({ error: 'not_found' })
    return co
  }

  // Scheduling overview for one cohort.
  r.get('/api/admin/cohorts/:slug/interviews', admin, async (req, res) => {
    const cohort = await cohortOr404(req.params.slug, res); if (!cohort) return
    const candidates = await many(`
      select c.slug, c.name, c.email, c.status, c.interview_at, c.interview_minutes, c.interview_location,
             c.invites_sent_at, c.result_sent_at,
             (select json_build_object('at', n.created_at, 'delivered', n.delivered, 'error', n.error, 'to', n.recipient)
                from notifications n where n.candidate_slug = c.slug and n.kind in ('interview_invite', 'interview_cancel')
               order by n.created_at desc limit 1) as last_invite,
             (select count(*)::int from notifications n where n.candidate_slug = c.slug and n.kind = 'interview_invite' and not n.delivered
                 and n.created_at > coalesce(c.invites_sent_at, '1970-01-01')) as recent_failures
        from candidates c where c.cohort_slug = $1
       order by c.interview_at nulls last, c.name`, [cohort.slug])
    const panel = await panelOf(cohort.slug)
    const undecided = candidates.filter((c) => UNDECIDED.includes(c.status)).map((c) => c.name)
    res.json({ cohort, candidates, panel, smtp: !!(await smtpConfig()), undecided })
  })

  // Set (or clear) a candidate's slot.
  r.patch('/api/admin/candidates/:slug/interview', admin, async (req, res) => {
    const cand = await one(`select slug, cohort_slug from candidates where slug = $1`, [req.params.slug])
    if (!cand) return res.status(404).json({ error: 'not_found' })
    const { interviewAt, minutes, location } = req.body || {}
    let at = null
    if (interviewAt) {
      at = new Date(interviewAt)
      if (Number.isNaN(at.getTime())) return res.status(400).json({ error: 'bad_time', message: 'Enter a valid date and time.' })
    }
    const mins = minutes == null ? null : Number(minutes)
    if (mins != null && !(Number.isInteger(mins) && mins >= 10 && mins <= 240)) return res.status(400).json({ error: 'bad_minutes', message: 'Length must be between 10 and 240 minutes.' })
    await query(
      `update candidates set interview_at = $2, interview_minutes = coalesce($3, interview_minutes), interview_location = $4 where slug = $1`,
      [cand.slug, at, mins, typeof location === 'string' ? location.trim() || null : null])
    res.json({ ok: true })
  })

  // Default venue / link for the cohort.
  r.patch('/api/admin/cohorts/:slug/interview-location', admin, async (req, res) => {
    const cohort = await cohortOr404(req.params.slug, res); if (!cohort) return
    await query(`update cohorts set interview_location = $2 where slug = $1`, [cohort.slug, String(req.body?.location || '').trim() || null])
    res.json({ ok: true })
  })

  // Email calendar invitations for scheduled candidates (all, or the slugs given).
  r.post('/api/admin/cohorts/:slug/interviews/send', admin, async (req, res) => {
    const cohort = await cohortOr404(req.params.slug, res); if (!cohort) return
    if (!(await smtpConfig())) return res.status(503).json({ error: 'smtp_not_configured', message: 'Set up email under Admin → Settings first.' })
    const panel = await panelOf(cohort.slug)
    if (!panel.length) return res.status(400).json({ error: 'no_panel', message: 'Add the interview panel first.' })
    const wanted = Array.isArray(req.body?.candidateSlugs) && req.body.candidateSlugs.length ? req.body.candidateSlugs.map(String) : null
    const cands = await many(
      `select slug, name, email, interview_at, interview_minutes, interview_location from candidates
        where cohort_slug = $1 and interview_at is not null and ($2::text[] is null or slug = any($2)) order by interview_at`,
      [cohort.slug, wanted])
    const includeCandidate = !!req.body?.includeCandidate
    const summary = { candidates: 0, sent: 0, failed: 0, details: [] }
    for (const cand of cands) {
      const results = await sendInvites({ cohort, cand, includeCandidate, sentBy: req.account.id })
      summary.candidates++
      summary.sent += results.filter((x) => x.delivered).length
      summary.failed += results.filter((x) => !x.delivered).length
      summary.details.push({ slug: cand.slug, name: cand.name, results })
    }
    res.json({ ok: true, ...summary })
  })

  // Cancel a slot: calendars get METHOD:CANCEL, then the slot is cleared.
  r.post('/api/admin/candidates/:slug/interview/cancel', admin, async (req, res) => {
    const cand = await one(`select slug, name, email, cohort_slug, interview_at, interview_minutes, interview_location, invites_sent_at from candidates where slug = $1`, [req.params.slug])
    if (!cand) return res.status(404).json({ error: 'not_found' })
    let results = []
    if (cand.interview_at && cand.invites_sent_at && (await smtpConfig())) {
      const cohort = await one(`select slug, name, role, interview_location from cohorts where slug = $1`, [cand.cohort_slug])
      const candidateWasInvited = !!(await one(`select 1 from notifications where candidate_slug = $1 and kind = 'interview_invite' and recipient = $2`, [cand.slug, cand.email || '']))
      results = await sendInvites({ cohort, cand, includeCandidate: candidateWasInvited, sentBy: req.account.id, method: 'CANCEL' })
    }
    await query(`update candidates set interview_at = null, invites_sent_at = null where slug = $1`, [cand.slug])
    res.json({ ok: true, cancelled: results.filter((x) => x.delivered).length, failed: results.filter((x) => !x.delivered).length })
  })

  // Close the gate: every candidate needs a decision; scoring locks; results go out.
  r.post('/api/admin/cohorts/:slug/close', admin, async (req, res) => {
    const cohort = await cohortOr404(req.params.slug, res); if (!cohort) return
    if (cohort.closed_at) return res.status(409).json({ error: 'already_closed' })
    const cands = await many(`select slug, name, email, status from candidates where cohort_slug = $1 order by name`, [cohort.slug])
    if (!cands.length) return res.status(400).json({ error: 'no_candidates', message: 'There are no candidates in this cohort.' })
    const undecided = cands.filter((c) => UNDECIDED.includes(c.status))
    if (undecided.length) {
      return res.status(400).json({ error: 'undecided', message: `Set a decision for every candidate first: ${undecided.map((c) => c.name).join(', ')}.`, candidates: undecided.map((c) => c.slug) })
    }
    const notify = req.body?.notify !== false
    if (notify && !(await smtpConfig())) return res.status(503).json({ error: 'smtp_not_configured', message: 'Set up email under Admin → Settings first, or close without notifying.' })
    await query(`update cohorts set closed_at = now(), closed_by = $2 where slug = $1`, [cohort.slug, req.account.id])
    const result = notify ? await notifyResults({ cohort, candidates: cands, sentBy: req.account.id }) : { notified: 0, failed: 0, skipped: cands.length, details: [] }
    res.json({ ok: true, closedAt: new Date().toISOString(), ...result })
  })

  // Re-send outcome emails (e.g. after a failure), for all or the slugs given.
  r.post('/api/admin/cohorts/:slug/results/send', admin, async (req, res) => {
    const cohort = await cohortOr404(req.params.slug, res); if (!cohort) return
    if (!cohort.closed_at) return res.status(409).json({ error: 'not_closed', message: 'Close the cohort first.' })
    if (!(await smtpConfig())) return res.status(503).json({ error: 'smtp_not_configured', message: 'Set up email under Admin → Settings first.' })
    const wanted = Array.isArray(req.body?.candidateSlugs) && req.body.candidateSlugs.length ? req.body.candidateSlugs.map(String) : null
    const cands = await many(`select slug, name, email, status from candidates where cohort_slug = $1 and ($2::text[] is null or slug = any($2)) order by name`, [cohort.slug, wanted])
    res.json({ ok: true, ...(await notifyResults({ cohort, candidates: cands, sentBy: req.account.id })) })
  })

  r.post('/api/admin/cohorts/:slug/reopen', admin, async (req, res) => {
    const cohort = await cohortOr404(req.params.slug, res); if (!cohort) return
    await query(`update cohorts set closed_at = null, closed_by = null where slug = $1`, [cohort.slug])
    res.json({ ok: true })
  })

  // What's been sent for this cohort, newest first.
  r.get('/api/admin/cohorts/:slug/notifications', admin, async (req, res) => {
    const rows = await many(`
      select n.id, n.kind, n.candidate_slug, c.name as candidate_name, n.recipient, n.subject, n.delivered, n.error, n.created_at
        from notifications n left join candidates c on c.slug = n.candidate_slug
       where n.cohort_slug = $1 order by n.created_at desc limit 200`, [req.params.slug])
    res.json({ notifications: rows })
  })

  return r
}
