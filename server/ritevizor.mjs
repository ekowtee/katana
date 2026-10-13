import express from 'express'
import { decrypt, readArea } from './settings.mjs'
import { many, one, query } from './db.mjs'
import { requireAuth } from './auth.mjs'

// RiteVizor's rubric library (the group's appraisal platform). Katana reads a
// role's rubric — its dimensions and the band anchors describing what good
// looks like — and turns them into interview questions with scoring guidance.
//
//   GET {url}/api/v1/integrations/rubrics         → { rubrics: [...] }
//   GET {url}/api/v1/integrations/rubrics/:slug   → { dimensions: [{ name, definition, anchors: [{ bandLevel, bandName, text }] }], ... }
//
// Auth is an `x-api-key` header; the key is set in Admin → Settings (or the
// RITEVIZOR_API_KEY env var) and must match KATANA_API_KEY on RiteVizor.

export const DEFAULT_URL = 'https://api.ritevizor.com'
const TIMEOUT_MS = 20_000

export async function ritevizorConfig() {
  const s = await readArea('ritevizor')
  const key = decrypt(s.key_enc)
  if (key) return { source: 'settings', url: (s.url || DEFAULT_URL).replace(/\/+$/, ''), apiKey: key }
  if (process.env.RITEVIZOR_API_KEY) {
    return { source: 'env', url: (process.env.RITEVIZOR_API_URL || DEFAULT_URL).replace(/\/+$/, ''), apiKey: process.env.RITEVIZOR_API_KEY }
  }
  return null
}

const fail = (msg) => { const e = new Error(msg); e.safe = true; return e }

async function call(cfg, path) {
  let res
  try {
    res = await fetch(`${cfg.url}/api/v1/integrations${path}`, {
      headers: { 'x-api-key': cfg.apiKey, accept: 'application/json' },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
  } catch (e) {
    throw fail(e.name === 'TimeoutError' ? 'RiteVizor took too long to answer.' : `Couldn't reach RiteVizor at ${cfg.url}.`)
  }
  const body = await res.json().catch(() => ({}))
  if (res.status === 401) throw fail('RiteVizor rejected the API key. Check it in Admin → Settings.')
  if (res.status === 503) throw fail('RiteVizor hasn’t switched the Katana integration on (KATANA_API_KEY is not set there).')
  if (res.status === 404) throw fail('RiteVizor has no published rubric with that name.')
  if (!res.ok) throw fail(`RiteVizor answered ${res.status}.${body?.message ? ` ${body.message}` : ''}`)
  return body
}

export const listRubrics = (cfg) => call(cfg, '/rubrics').then((b) => b.rubrics || [])
export const getRubric = (cfg, slug) => call(cfg, `/rubrics/${encodeURIComponent(slug)}`)

// Each rubric dimension becomes one question. The guidance is the dimension's
// definition plus the anchor for the chosen band (what the role is expected
// to show), which panel members see under the question while scoring.
export function questionsFromRubric(rubric, bandLevel) {
  return (rubric.dimensions || []).map((d) => {
    const anchor = (d.anchors || []).find((a) => a.bandLevel === bandLevel)
    const parts = [d.definition?.trim()]
    if (anchor) parts.push(`At ${anchor.bandName || `band ${bandLevel}`}: ${anchor.text.trim()}`)
    if (d.nonConfusions?.trim()) parts.push(`Not to be confused with: ${d.nonConfusions.trim()}`)
    return { body: d.name.trim(), guidance: parts.filter(Boolean).join('\n\n') }
  })
}

// The band levels a rubric actually has anchors for, in order.
export const bandsIn = (rubric) => {
  const seen = new Map()
  for (const d of rubric.dimensions || []) for (const a of d.anchors || []) if (!seen.has(a.bandLevel)) seen.set(a.bandLevel, a.bandName || `Band ${a.bandLevel}`)
  return [...seen.entries()].sort((a, b) => a[0] - b[0]).map(([level, name]) => ({ level, name }))
}

export function ritevizorRoutes() {
  const r = express.Router()
  const admin = requireAuth('admin')
  const guard = async (res) => {
    const cfg = await ritevizorConfig()
    if (!cfg) res.status(503).json({ error: 'ritevizor_not_configured', message: 'Add the RiteVizor API key under Admin → Settings first.' })
    return cfg
  }
  const safe = (res, e) => res.status(502).json({ error: 'ritevizor_failed', message: e.safe ? e.message : 'RiteVizor could not be read.' })

  r.get('/api/admin/ritevizor/rubrics', admin, async (req, res) => {
    const cfg = await guard(res); if (!cfg) return
    try { res.json({ rubrics: await listRubrics(cfg) }) } catch (e) { safe(res, e) }
  })

  // The rubric's dimensions, the bands it covers, and a preview of the questions.
  r.get('/api/admin/ritevizor/rubrics/:slug', admin, async (req, res) => {
    const cfg = await guard(res); if (!cfg) return
    try {
      const rubric = await getRubric(cfg, req.params.slug)
      const bands = bandsIn(rubric)
      res.json({
        slug: rubric.slug, name: rubric.name, versionLabel: rubric.versionLabel, isBehavioural: !!rubric.isBehavioural,
        function: rubric.function, subDiscipline: rubric.subDiscipline, bands,
        dimensions: (rubric.dimensions || []).map((d) => ({ name: d.name, definition: d.definition })),
      })
    } catch (e) { safe(res, e) }
  })

  // Import a rubric's dimensions as questions under one of the cohort's dimensions.
  r.post('/api/admin/cohorts/:slug/questions/import', admin, async (req, res) => {
    const cfg = await guard(res); if (!cfg) return
    const { rubricSlug, bandLevel, criterionKey } = req.body || {}
    if (!rubricSlug || !Number.isInteger(bandLevel)) return res.status(400).json({ error: 'bad_input' })
    if (!(await one(`select 1 from criteria where key = $1`, [criterionKey]))) return res.status(400).json({ error: 'bad_criterion' })
    const cohort = await one(`select slug, closed_at from cohorts where slug = $1`, [req.params.slug])
    if (!cohort) return res.status(404).json({ error: 'not_found' })
    let rubric
    try { rubric = await getRubric(cfg, rubricSlug) } catch (e) { return safe(res, e) }
    const items = questionsFromRubric(rubric, bandLevel)
    if (!items.length) return res.status(400).json({ error: 'empty_rubric', message: 'That rubric has no dimensions to import.' })
    // Skip dimensions already imported into this cohort (same text), so re-running adds nothing twice.
    const existing = new Set((await many(`select body from questions where cohort_slug = $1 and criterion_key = $2`, [cohort.slug, criterionKey])).map((q) => q.body))
    let added = 0
    for (const it of items) {
      if (existing.has(it.body)) continue
      await query(
        `insert into questions (cohort_slug, criterion_key, body, guidance, source, created_by, sort_order)
         values ($1, $2, $3, $4, 'ritevizor', $5, (select coalesce(max(sort_order), -1) + 1 from questions where cohort_slug = $1 and criterion_key = $2))`,
        [cohort.slug, criterionKey, it.body, it.guidance, req.account.id])
      added++
    }
    res.json({ ok: true, added, skipped: items.length - added, rubric: rubric.name })
  })

  return r
}
