/**
 * Ingestion: DATJF_Interview_Scoring.xlsx + PDF contact details
 *   →  src/data/candidates.json   (frontend source-of-truth / offline fallback)
 *   →  supabase/seed.sql          (DB seed: candidates, scores, comments)
 *
 * Run:  node scripts/ingest.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import xlsx from 'xlsx'
import { CONTACTS, CRITERIA, PANELISTS } from './contacts.mjs'
import { MANUAL_SCORES, SCALE_WEIGHTS } from './manual-scores.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const WORKBOOK = path.join(ROOT, 'Fellowship Applicants', 'DATJF_Interview_Scoring.xlsx')

const CRIT_BY_LABEL = Object.fromEntries(CRITERIA.map((c) => [c.label, c.key]))

// ── helpers ────────────────────────────────────────────────────────────────
const isBlank = (v) =>
  v === null || v === undefined ||
  (typeof v === 'string' && (v.trim() === '' || /^[—–\-+]$/.test(v.trim()) || v.trim().toLowerCase() === 'inc.'))

const num = (v) => {
  if (isBlank(v)) return null
  if (typeof v === 'number') return Math.round(v * 1000) / 1000
  const n = parseFloat(String(v).replace(/[^0-9.\-]/g, ''))
  return Number.isFinite(n) ? Math.round(n * 1000) / 1000 : null
}

const clean = (v) => (isBlank(v) ? null : String(v).replace(/\s+/g, ' ').trim())

// Map a recommendation string → normalised enum
function recCode(rec) {
  if (!rec) return null
  const r = rec.toLowerCase()
  if (r.includes('do not')) return 'DNR'
  if (r.includes('not available') || r.includes('n/a')) return 'NA'
  if (r.includes('strongly')) return 'SR'
  if (r.includes('train') || r.includes('academy') || r.includes('reserve')) return 'RL'
  if (r.includes('recommend')) return 'R'
  return 'OTHER'
}

// Derive a candidate's overall status from the dashboard panel reading.
function deriveStatus(rank, reading) {
  const t = (reading || '').toLowerCase()
  if (t.includes('do not select')) return 'not_selected'
  if (t.includes('not assessable') || t.includes('not scored') || t.includes('did not attend')) return 'not_assessed'
  if (t.includes('training') || t.includes('academy') || t.includes('reserve') || t.includes('future cohort')) return 'reserve'
  if (t.includes('discuss') || t.includes('conditional')) return 'discuss'
  if (t.includes('select')) return 'selected'
  return rank && rank <= 10 ? 'selected' : 'review'
}

// ── load workbook ──────────────────────────────────────────────────────────
const wb = xlsx.readFile(WORKBOOK)
const sheetRows = (name) =>
  xlsx.utils.sheet_to_json(wb.Sheets[name], { header: 1, raw: true, defval: null })

// ── parse Dashboard ────────────────────────────────────────────────────────
const dashRows = sheetRows('Dashboard')
const headerIdx = dashRows.findIndex((r) => r && r[0] === 'Rank')
const dashboard = {}
for (let i = headerIdx + 1; i < dashRows.length; i++) {
  const r = dashRows[i]
  if (!r || isBlank(r[1])) {
    if (r && r[0] === 'NOTES') break
    continue
  }
  const candName = clean(r[1])
  if (!candName) continue
  dashboard[candName] = {
    rank: num(r[0]),
    interviewDay: clean(r[2]),
    category: clean(r[3]),
    total50: num(r[9]),
    scorePct: num(r[10]),
    recommendationsSummary: clean(r[11]),
    panelReading: clean(r[12]),
  }
}

// Match a contact to its dashboard row by fuzzy name (first + last token).
function dashFor(name) {
  if (dashboard[name]) return dashboard[name]
  const key = (s) => s.toLowerCase().split(/\s+/)
  const [cf, ...crest] = key(name)
  const cl = crest[crest.length - 1]
  const hit = Object.keys(dashboard).find((dn) => {
    const dk = key(dn)
    return dk[0] === cf || dk[dk.length - 1] === cl
  })
  return hit ? dashboard[hit] : null
}

// ── parse a candidate worksheet ────────────────────────────────────────────
function parseCandidateSheet(sheetName) {
  const rows = sheetRows(sheetName)
  const out = { panelists: [], scores: [], comments: [], submissions: {} }

  // locate the score header row (col0 === 'Criterion')
  const hIdx = rows.findIndex((r) => r && r[0] === 'Criterion')
  const header = rows[hIdx] || []
  // panelist columns: any col >=2 whose header contains '(scale'
  const panelCols = []
  for (let c = 2; c < header.length; c++) {
    if (typeof header[c] === 'string' && header[c].includes('(scale')) {
      panelCols.push({ col: c, name: header[c].replace(/\s*\(scale.*$/i, '').trim() })
    }
  }
  const avgCol = header.findIndex((h) => typeof h === 'string' && /avg\s*norm/i.test(h))
  out.panelists = panelCols.map((p) => p.name)

  // criteria rows
  for (let i = hIdx + 1; i < rows.length; i++) {
    const r = rows[i]
    if (!r) continue
    const label = clean(r[0])
    if (label && CRIT_BY_LABEL[label]) {
      const entry = {
        criterion: CRIT_BY_LABEL[label],
        label,
        weight: num(r[1]),
        avg: avgCol >= 0 ? num(r[avgCol]) : null,
        byPanelist: panelCols.map((p) => ({
          panelist: p.name,
          raw: num(r[p.col]),
          wtUsed: num(r[p.col + 1]),
          norm: num(r[p.col + 2]),
        })),
      }
      out.scores.push(entry)
    }
    if (label === 'TOTAL') {
      out.total = {
        avg: avgCol >= 0 ? num(r[avgCol]) : null,
        byPanelist: panelCols.map((p) => ({ panelist: p.name, norm: num(r[p.col + 2]) })),
      }
    }
  }

  // comments block
  const cIdx = rows.findIndex((r) => r && typeof r[0] === 'string' && /PANEL RECOMMENDATIONS/i.test(r[0]))
  if (cIdx >= 0) {
    for (let i = cIdx + 1; i < rows.length; i++) {
      const r = rows[i]
      if (!r || isBlank(r[0])) {
        if (r && typeof r[0] === 'string' && /^SUBMISSION|^CAPSTONE/i.test(r[0])) break
        continue
      }
      if (typeof r[0] === 'string' && /^SUBMISSION|^CAPSTONE/i.test(r[0])) break
      out.comments.push({
        panelist: clean(r[0]),
        recommendation: clean(r[3]),
        recCode: recCode(clean(r[3])),
        comment: clean(r[6]),
      })
    }
  }

  // submission sections: "SUBMISSION — XXX" / "CAPSTONE PROJECT" header then text on next non-empty row
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]
    const head = r && typeof r[0] === 'string' ? r[0] : ''
    let key = null
    if (/WHY FELLOWSHIP/i.test(head)) key = 'whyFellowship'
    else if (/CAREER AMBITIONS/i.test(head)) key = 'careerAmbitions'
    else if (/PERSONAL STATEMENT/i.test(head)) key = 'personalStatement'
    else if (/CAPSTONE/i.test(head)) key = 'capstone'
    if (key) {
      for (let j = i + 1; j < rows.length; j++) {
        const txt = rows[j] && rows[j][0]
        if (!isBlank(txt)) { out.submissions[key] = String(txt).trim(); break }
        if (rows[j] && rows[j][0] !== null) break
      }
    }
  }
  return out
}

// ── build scores from a manual (paper-form) entry ───────────────────────────
const round3 = (n) => Math.round(n * 1000) / 1000
function buildManual(entry) {
  const scores = CRITERIA.map((cr) => {
    const norms = entry.panel.map((p) => {
      const wtUsed = SCALE_WEIGHTS[p.scale]?.[cr.key] ?? cr.weight
      const raw = p.scores[cr.key]
      return raw == null ? null : raw * (cr.weight / wtUsed)
    })
    const valid = norms.filter((n) => n != null)
    return {
      criterion: cr.key, label: cr.label, weight: cr.weight,
      avg: valid.length ? round3(valid.reduce((a, b) => a + b, 0) / valid.length) : null,
      byPanelist: entry.panel.map((p, i) => ({ panelist: p.panelist, norm: round3(norms[i]) })),
    }
  })
  const totalAvg = round3(scores.reduce((s, x) => s + (x.avg || 0), 0))
  const comments = entry.panel.map((p) => ({
    panelist: p.panelist, recommendation: p.recommendation,
    recCode: recCode(p.recommendation), comment: p.comment || null,
  }))
  const counts = comments.reduce((m, c) => ((m[c.recCode] = (m[c.recCode] || 0) + 1), m), {})
  const recommendationsSummary = Object.entries(counts).map(([k, v]) => `${v}× ${k}`).join(', ')
  return { scores, comments, totalAvg, scorePct: round3(totalAvg / 50), recommendationsSummary }
}

// ── assemble dataset ───────────────────────────────────────────────────────
const candidates = CONTACTS.map((c) => {
  const dash = dashFor(c.name) || {}
  const parsed = c.sheet ? parseCandidateSheet(c.sheet) : null
  const manual = !parsed && MANUAL_SCORES[c.slug] ? buildManual(MANUAL_SCORES[c.slug]) : null

  const total50 = dash.total50 ?? parsed?.total?.avg ?? manual?.totalAvg ?? null
  const scorePct = dash.scorePct ?? manual?.scorePct ?? null
  const recommendationsSummary = dash.recommendationsSummary ?? manual?.recommendationsSummary ?? null
  const allSR = manual && manual.comments.every((cm) => cm.recCode === 'SR')
  const panelReading = dash.panelReading ?? (allSR ? 'Unanimous Strongly Recommend. SELECT.' : null)
  const scored = !!(parsed?.total?.avg || manual?.totalAvg)

  return {
    ...c,
    officialRank: dash.rank ?? null,        // xlsx rank — used only as a tiebreak
    rank: null,                              // assigned in the ranking pass below
    interviewDay: dash.interviewDay ?? MANUAL_SCORES[c.slug]?.interviewDay ?? null,
    category: c.category || dash.category || null,
    total50, scorePct, recommendationsSummary, panelReading,
    status: deriveStatus(dash.rank, panelReading),
    scores: parsed?.scores ?? manual?.scores ?? [],
    panelComments: parsed?.comments ?? manual?.comments ?? [],
    submissions: parsed?.submissions ?? MANUAL_SCORES[c.slug]?.submissions ?? {},
    scored,
  }
})

// ── ranking pass: order all scored candidates by score %, breaking ties on the
//    official xlsx rank so the panel's established order is preserved. ─────────
candidates
  .filter((c) => c.scored && c.scorePct != null)
  .sort((a, b) =>
    b.scorePct - a.scorePct ||
    (a.officialRank ?? 999) - (b.officialRank ?? 999) ||
    a.name.localeCompare(b.name)
  )
  .forEach((c, i) => { c.rank = i + 1 })

candidates.sort((a, b) => {
  if (a.rank == null && b.rank == null) return a.name.localeCompare(b.name)
  if (a.rank == null) return 1
  if (b.rank == null) return -1
  return a.rank - b.rank
})

const dataset = {
  meta: {
    title: 'D. A. Twum Jnr. Fellowship — First Cohort Interview Scoring',
    interviewWindow: '10–12 June 2026',
    generatedFrom: 'DATJF_Interview_Scoring.xlsx + Shortlisted 20 fellowship applicants.pdf',
    criteria: CRITERIA,
    panelists: PANELISTS,
    defaultCutoffRank: 10,
    note: 'Scores normalised to official weights (15/10/10/10/5 = 50) across panelists using different scales.',
  },
  candidates,
}

// ── write JSON ─────────────────────────────────────────────────────────────
const dataDir = path.join(ROOT, 'src', 'data')
fs.mkdirSync(dataDir, { recursive: true })
fs.writeFileSync(path.join(dataDir, 'candidates.json'), JSON.stringify(dataset, null, 2))

// ── build seed.sql ─────────────────────────────────────────────────────────
const q = (v) => (v === null || v === undefined ? 'NULL' : `'${String(v).replace(/'/g, "''")}'`)
const qn = (v) => (v === null || v === undefined ? 'NULL' : Number(v))
const qb = (v) => (v === null || v === undefined ? 'NULL' : v ? 'true' : 'false')

let sql = `\\encoding UTF8
-- Auto-generated by scripts/ingest.mjs — DO NOT EDIT BY HAND.
-- (\\encoding UTF8 above forces psql to read this file as UTF-8 regardless of the
--  Windows console code page — without it, characters like × and — get mangled.)
-- Seed data for the D.A. Twum Jnr. Fellowship panel portal.
-- Idempotent: scores & panel_comments are rebuilt from scratch each run.
-- (candidate_feedback and accounts are never touched here.)
begin;

delete from panel_comments;
delete from scores;

-- Panelists ------------------------------------------------------------------
${PANELISTS.map((p) => `insert into panelists (name) values (${q(p)}) on conflict (name) do nothing;`).join('\n')}

-- Criteria -------------------------------------------------------------------
${CRITERIA.map((c, i) =>
  `insert into criteria (key, label, weight, sort_order) values (${q(c.key)}, ${q(c.label)}, ${qn(c.weight)}, ${i}) on conflict (key) do update set label = excluded.label, weight = excluded.weight, sort_order = excluded.sort_order;`
).join('\n')}

-- App settings ---------------------------------------------------------------
insert into app_settings (id, cutoff_rank) values (1, 10) on conflict (id) do nothing;

`

for (const c of candidates) {
  sql += `\n-- ${c.name} ${'-'.repeat(Math.max(0, 60 - c.name.length))}\n`
  sql += `insert into candidates (slug, name, gender, dob, email, phone, address, category, discipline, unit, institution, country, can_commit, rank, interview_day, total_50, score_pct, recommendations_summary, panel_reading, status, scored, why_fellowship, career_ambitions, personal_statement, capstone)
values (${q(c.slug)}, ${q(c.name)}, ${q(c.gender)}, ${q(c.dob)}, ${q(c.email)}, ${q(c.phone)}, ${q(c.address)}, ${q(c.category)}, ${q(c.discipline)}, ${q(c.unit)}, ${q(c.institution)}, ${q(c.country)}, ${qb(c.canCommit)}, ${qn(c.rank)}, ${q(c.interviewDay)}, ${qn(c.total50)}, ${qn(c.scorePct)}, ${q(c.recommendationsSummary)}, ${q(c.panelReading)}, ${q(c.status)}, ${qb(c.scored)}, ${q(c.submissions.whyFellowship)}, ${q(c.submissions.careerAmbitions)}, ${q(c.submissions.personalStatement)}, ${q(c.submissions.capstone)})
on conflict (slug) do update set
  rank = excluded.rank, total_50 = excluded.total_50, score_pct = excluded.score_pct,
  recommendations_summary = excluded.recommendations_summary, panel_reading = excluded.panel_reading,
  status = excluded.status, scored = excluded.scored, interview_day = excluded.interview_day,
  why_fellowship = excluded.why_fellowship, career_ambitions = excluded.career_ambitions,
  personal_statement = excluded.personal_statement, capstone = excluded.capstone;\n`

  for (const s of c.scores) {
    sql += `insert into scores (candidate_slug, criterion_key, avg_norm) values (${q(c.slug)}, ${q(s.criterion)}, ${qn(s.avg)}) on conflict (candidate_slug, criterion_key) do update set avg_norm = excluded.avg_norm;\n`
  }
  for (const cm of c.panelComments) {
    sql += `insert into panel_comments (candidate_slug, panelist_name, recommendation, rec_code, comment) values (${q(c.slug)}, ${q(cm.panelist)}, ${q(cm.recommendation)}, ${q(cm.recCode)}, ${q(cm.comment)});\n`
  }
}
sql += `\ncommit;\n`

const sqlDir = path.join(ROOT, 'supabase')
fs.mkdirSync(sqlDir, { recursive: true })
fs.writeFileSync(path.join(sqlDir, 'seed.sql'), sql)

// ── report ─────────────────────────────────────────────────────────────────
const scored = candidates.filter((c) => c.scored).length
console.log(`✓ ${candidates.length} candidates  (${scored} scored, ${candidates.length - scored} unscored)`)
console.log(`✓ src/data/candidates.json`)
console.log(`✓ supabase/seed.sql`)
console.log('\nRank  Status        Score  Candidate')
for (const c of candidates) {
  console.log(
    `${String(c.rank ?? '–').padStart(4)}  ${(c.status || '').padEnd(13)} ${String(c.scorePct != null ? Math.round(c.scorePct * 100) + '%' : '–').padStart(5)}  ${c.name} ${c.scored ? '' : '(no score)'}`
  )
}
