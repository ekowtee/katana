import crypto from 'node:crypto'
import express from 'express'
import { many, one, query } from './db.mjs'
import { requireAuth } from './auth.mjs'

// Interview assessment: per-cohort weights and questions (admin), and
// per-question scoring by panel members on each candidate's file.
//
// Each question is scored 1–SCALE. A candidate's points on a dimension are
//   mean over panelists of (that panelist's mean question score) / SCALE × cohort weight
// so every panelist counts equally however many questions they scored.
export const SCALE = 5

export const RECOMMENDATIONS = [
  { code: 'SR', label: 'Strongly Recommend' },
  { code: 'R', label: 'Recommend' },
  { code: 'RL', label: 'Reserve List' },
  { code: 'DNR', label: 'Do Not Recommend' },
]

const DEFAULT_APPEARANCE_ITEM = 'Overall appearance and presence: dress, poise and body language'

// Rebuild a candidate's dimension scores, total, attainment and recommendation
// tally from the panel's question scores, then re-rank their cohort.
export async function recomputeCandidate(slug) {
  const cand = await one(`select slug, cohort_slug from candidates where slug = $1`, [slug])
  if (!cand) return
  await query(`delete from scores where candidate_slug = $1`, [slug])
  await query(
    `insert into scores (candidate_slug, criterion_key, avg_norm)
     select $1, d.criterion_key, round(d.mean / ${SCALE} * cc.weight, 3)
       from (select criterion_key, avg(panelist_mean) as mean
               from (select q.criterion_key, qs.account_id, avg(qs.score) as panelist_mean
                       from question_scores qs join questions q on q.id = qs.question_id
                      where qs.candidate_slug = $1 and q.cohort_slug = $2
                      group by q.criterion_key, qs.account_id) p
              group by criterion_key) d
       join cohort_criteria cc on cc.cohort_slug = $2 and cc.criterion_key = d.criterion_key`,
    [slug, cand.cohort_slug]
  )
  await query(
    `update candidates c set
        total_50 = t.total,
        score_pct = t.total / nullif(w.max_points, 0),
        scored = t.total is not null,
        recommendations_summary = r.summary
       from (select sum(avg_norm) as total from scores where candidate_slug = $1) t,
            (select sum(weight) as max_points from cohort_criteria where cohort_slug = $2) w,
            (select string_agg(n || '× ' || rec_code, ', ' order by n desc, rec_code) as summary
               from (select rec_code, count(*) as n from panel_comments
                      where candidate_slug = $1 and rec_code is not null group by rec_code) x) r
      where c.slug = $1`,
    [slug, cand.cohort_slug]
  )
  await rankCohort(cand.cohort_slug)
}

export async function rankCohort(cohortSlug) {
  await query(
    `update candidates c set rank = r.rk
       from (select slug,
                    case when scored and score_pct is not null
                         then row_number() over (partition by (scored and score_pct is not null)
                                                 order by score_pct desc, name) end as rk
               from candidates where cohort_slug is not distinct from $1) r
      where c.slug = r.slug`,
    [cohortSlug]
  )
}

async function recomputeCohort(cohortSlug) {
  const rows = await many(`select slug from candidates where cohort_slug = $1`, [cohortSlug])
  for (const r of rows) await recomputeCandidate(r.slug)
}

const slugify = (s) =>
  String(s).toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'cohort'

// ── Interview panels: who may see and score each cohort ─────────────────────
// The cohorts this staff member is on the panel for, newest first.
export const myCohorts = (accountId) => many(
  `select co.slug, co.name, co.role, co.created_at, co.closed_at, co.interview_location
     from cohort_panel p join cohorts co on co.slug = p.cohort_slug
    where p.account_id = $1 order by co.created_at desc, co.name`, [accountId])

// Once a cohort is closed its scores are final.
export const isClosed = async (cohortSlug) =>
  !!(await one(`select 1 from cohorts where slug = $1 and closed_at is not null`, [cohortSlug]))

const QUESTION_COLS = `q.id, q.criterion_key, q.body, q.guidance, q.source, q.sort_order, q.created_by,
       (select coalesce(a.display_name, a.email) from accounts a where a.id = q.created_by) as created_by_name,
       (select count(*)::int from question_scores s where s.question_id = q.id) as scores`

async function insertQuestion({ cohortSlug, criterionKey, body, guidance, source, by }) {
  return one(
    `insert into questions (cohort_slug, criterion_key, body, guidance, source, created_by, sort_order)
     values ($1, $2, $3, $4, $5, $6, (select coalesce(max(sort_order), -1) + 1 from questions where cohort_slug = $1 and criterion_key = $2))
     returning id`, [cohortSlug, criterionKey, body, guidance || null, source || 'manual', by || null])
}

// Admins may change any question; a panel member only one they added that
// nobody has scored yet.
async function editableBy(account, questionId) {
  const q = await one(`select id, cohort_slug, created_by, (select count(*)::int from question_scores s where s.question_id = questions.id) as scores from questions where id = $1`, [questionId])
  if (!q) return { q: null, ok: false }
  if (account.role === 'admin') return { q, ok: true }
  return { q, ok: String(q.created_by) === String(account.id) && q.scores === 0 && (await onPanel(account.id, q.cohort_slug)) }
}

export async function onPanel(accountId, cohortSlug) {
  if (!cohortSlug) return false
  return !!(await one(`select 1 from cohort_panel where cohort_slug = $1 and account_id = $2`, [cohortSlug, accountId]))
}

// Panel members only reach candidates in cohorts they're on; admins reach any
// (they set cohorts up), but score only where they're on the panel.
export const mayView = async (account, cohortSlug) => account.role === 'admin' || onPanel(account.id, cohortSlug)

export function assessmentRoutes() {
  const r = express.Router()
  const admin = requireAuth('admin')
  const staff = requireAuth('panel', 'admin')

  // ── Cohorts (admin) ──────────────────────────────────────────────────────
  r.get('/api/admin/cohorts', admin, async (req, res) => {
    const criteria = await many(`select key, label, weight, sort_order from criteria order by sort_order`)
    const cohorts = await many(`
      select co.slug, co.name, co.role, co.created_at, co.closed_at, co.interview_location,
             (select count(*)::int from candidates c where c.cohort_slug = co.slug) as candidates,
             (select count(*)::int from candidates c where c.cohort_slug = co.slug and c.interview_at is not null) as scheduled,
             (select count(*)::int from candidates c where c.cohort_slug = co.slug and c.status in ('review', 'discuss')) as undecided,
             (select count(*)::int from questions q where q.cohort_slug = co.slug) as questions,
             (select count(*)::int from cohort_panel p where p.cohort_slug = co.slug) as panel,
             coalesce((select json_object_agg(cc.criterion_key, cc.weight)
                         from cohort_criteria cc where cc.cohort_slug = co.slug), '{}') as weights
        from cohorts co order by co.created_at desc`)
    res.json({ criteria, cohorts, scale: SCALE })
  })

  // Create a cohort; optionally copy weights and questions from another one.
  r.post('/api/admin/cohorts', admin, async (req, res) => {
    const name = String(req.body?.name || '').trim()
    if (!name) return res.status(400).json({ error: 'name_required' })
    const role = String(req.body?.role || '').trim() || null
    const copyFrom = req.body?.copyFrom || null
    let slug = slugify(name)
    if (await one(`select 1 from cohorts where slug = $1`, [slug])) slug = `${slug}-${crypto.randomBytes(2).toString('hex')}`
    await query(`insert into cohorts (slug, name, role) values ($1, $2, $3)`, [slug, name, role])
    // Whoever creates it starts on its panel; the admin adjusts the rest.
    await query(`insert into cohort_panel (cohort_slug, account_id) values ($1, $2)`, [slug, req.account.id])
    if (copyFrom && (await one(`select 1 from cohorts where slug = $1`, [copyFrom]))) {
      await query(
        `insert into cohort_criteria (cohort_slug, criterion_key, weight)
         select $1, criterion_key, weight from cohort_criteria where cohort_slug = $2`, [slug, copyFrom])
      await query(
        `insert into questions (cohort_slug, criterion_key, body, guidance, source, sort_order)
         select $1, criterion_key, body, guidance, source, sort_order from questions where cohort_slug = $2 order by id`, [slug, copyFrom])
    } else {
      await query(
        `insert into cohort_criteria (cohort_slug, criterion_key, weight)
         select $1, key, weight from criteria`, [slug])
      await query(
        `insert into questions (cohort_slug, criterion_key, body)
         select $1, key, $2 from criteria where key = 'appearance'`, [slug, DEFAULT_APPEARANCE_ITEM])
    }
    res.json({ ok: true, slug })
  })

  // Rename, set the role, and/or re-weight. Re-weighting rescores everyone in the cohort.
  r.patch('/api/admin/cohorts/:slug', admin, async (req, res) => {
    const { slug } = req.params
    if (!(await one(`select 1 from cohorts where slug = $1`, [slug]))) return res.status(404).json({ error: 'not_found' })
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : ''
    if (name) await query(`update cohorts set name = $2 where slug = $1`, [slug, name])
    if (typeof req.body?.role === 'string') await query(`update cohorts set role = $2 where slug = $1`, [slug, req.body.role.trim() || null])
    const weights = req.body?.weights
    if (weights && typeof weights === 'object') {
      const keys = (await many(`select key from criteria`)).map((c) => c.key)
      for (const [key, w] of Object.entries(weights)) {
        const n = Number(w)
        if (!keys.includes(key) || !Number.isFinite(n) || n < 0 || n > 100) return res.status(400).json({ error: 'bad_weight' })
      }
      for (const [key, w] of Object.entries(weights)) {
        await query(
          `insert into cohort_criteria (cohort_slug, criterion_key, weight) values ($1, $2, $3)
           on conflict (cohort_slug, criterion_key) do update set weight = excluded.weight`,
          [slug, key, Number(w)])
      }
      await recomputeCohort(slug)
    }
    res.json({ ok: true })
  })

  // ── Interview panel (admin) ──────────────────────────────────────────────
  // Every active staff account, and which of them are on this cohort's panel.
  r.get('/api/admin/cohorts/:slug/panel', admin, async (req, res) => {
    const staffList = await many(`
      select a.id, a.email, a.role, a.display_name,
             exists (select 1 from cohort_panel p where p.cohort_slug = $1 and p.account_id = a.id) as on_panel
        from accounts a where a.role in ('admin', 'panel') and a.active
       order by a.role, coalesce(a.display_name, a.email)`, [req.params.slug])
    res.json({ staff: staffList })
  })

  // Replace the panel with exactly these staff accounts.
  r.put('/api/admin/cohorts/:slug/panel', admin, async (req, res) => {
    const { slug } = req.params
    if (!(await one(`select 1 from cohorts where slug = $1`, [slug]))) return res.status(404).json({ error: 'not_found' })
    const ids = Array.isArray(req.body?.accountIds) ? req.body.accountIds.map(String) : null
    if (!ids) return res.status(400).json({ error: 'bad_input' })
    const valid = new Set((await many(`select id from accounts where role in ('admin', 'panel')`)).map((a) => String(a.id)))
    if (ids.some((id) => !valid.has(id))) return res.status(400).json({ error: 'bad_account' })
    await query(`delete from cohort_panel where cohort_slug = $1 and not (account_id::text = any($2))`, [slug, ids])
    for (const id of ids) {
      await query(`insert into cohort_panel (cohort_slug, account_id) values ($1, $2) on conflict do nothing`, [slug, id])
    }
    res.json({ ok: true })
  })

  // ── Questions ────────────────────────────────────────────────────────────
  // Admins manage every cohort's questions; panel members can read their
  // cohorts' questions and add their own (editable until someone scores them).
  const listQuestions = (cohortSlug) => many(`select ${QUESTION_COLS} from questions q where q.cohort_slug = $1 order by q.sort_order, q.id`, [cohortSlug])

  r.get('/api/admin/cohorts/:slug/questions', admin, async (req, res) => {
    res.json({ questions: await listQuestions(req.params.slug) })
  })

  r.get('/api/cohorts/:slug/questions', staff, async (req, res) => {
    if (!(await mayView(req.account, req.params.slug))) return res.status(403).json({ error: 'not_on_panel' })
    const co = await one(`select slug, name, role, closed_at from cohorts where slug = $1`, [req.params.slug])
    if (!co) return res.status(404).json({ error: 'not_found' })
    res.json({ cohort: co, questions: await listQuestions(co.slug), canAdd: !co.closed_at && (await onPanel(req.account.id, co.slug)) })
  })

  const addQuestion = async (req, res, requirePanel) => {
    const body = String(req.body?.body || '').trim()
    const guidance = String(req.body?.guidance || '').trim() || null
    const key = req.body?.criterionKey
    if (!body || !(await one(`select 1 from criteria where key = $1`, [key]))) return res.status(400).json({ error: 'bad_input' })
    const co = await one(`select slug, closed_at from cohorts where slug = $1`, [req.params.slug])
    if (!co) return res.status(404).json({ error: 'not_found' })
    if (requirePanel && !(await onPanel(req.account.id, co.slug))) return res.status(403).json({ error: 'not_on_panel' })
    if (co.closed_at) return res.status(409).json({ error: 'cohort_closed', message: 'This cohort is closed.' })
    const q = await insertQuestion({ cohortSlug: co.slug, criterionKey: key, body, guidance, source: 'manual', by: req.account.id })
    res.json({ ok: true, id: q.id })
  }
  r.post('/api/admin/cohorts/:slug/questions', admin, (req, res) => addQuestion(req, res, false))
  r.post('/api/cohorts/:slug/questions', staff, (req, res) => addQuestion(req, res, true))

  const patchQuestion = async (req, res) => {
    const body = String(req.body?.body || '').trim()
    if (!body) return res.status(400).json({ error: 'bad_input' })
    const { q, ok } = await editableBy(req.account, req.params.id)
    if (!q) return res.status(404).json({ error: 'not_found' })
    if (!ok) return res.status(403).json({ error: 'not_editable', message: 'Only questions you added, that nobody has scored yet, can be changed.' })
    const guidance = typeof req.body?.guidance === 'string' ? req.body.guidance.trim() || null : undefined
    await query(`update questions set body = $2, guidance = coalesce($3, guidance) where id = $1`, [q.id, body, guidance === undefined ? null : guidance])
    if (guidance === null) await query(`update questions set guidance = null where id = $1`, [q.id])
    res.json({ ok: true })
  }
  r.patch('/api/admin/questions/:id', admin, patchQuestion)
  r.patch('/api/questions/:id', staff, patchQuestion)

  // Reorder one dimension's questions: ids in their new order.
  r.post('/api/admin/cohorts/:slug/questions/order', admin, async (req, res) => {
    const ids = Array.isArray(req.body?.ids) ? req.body.ids : []
    for (let i = 0; i < ids.length; i++) {
      await query(`update questions set sort_order = $3 where id = $1 and cohort_slug = $2`, [ids[i], req.params.slug, i])
    }
    res.json({ ok: true })
  })

  // Deleting a question deletes its scores, so rescore whoever it had scored.
  const deleteQuestion = async (req, res) => {
    const { q, ok } = await editableBy(req.account, req.params.id)
    if (!q) return res.status(404).json({ error: 'not_found' })
    if (!ok) return res.status(403).json({ error: 'not_editable', message: 'Only questions you added, that nobody has scored yet, can be deleted.' })
    const affected = await many(`select distinct candidate_slug from question_scores where question_id = $1`, [q.id])
    await query(`delete from questions where id = $1`, [q.id])
    for (const a of affected) await recomputeCandidate(a.candidate_slug)
    res.json({ ok: true })
  }
  r.delete('/api/admin/questions/:id', admin, deleteQuestion)
  r.delete('/api/questions/:id', staff, deleteQuestion)

  // ── Panel assessment of one candidate (panel + admin) ────────────────────
  r.get('/api/candidates/:slug/assessment', staff, async (req, res) => {
    const c = await one(
      `select c.slug, c.cohort_slug, co.name as cohort_name, co.closed_at
         from candidates c left join cohorts co on co.slug = c.cohort_slug where c.slug = $1`, [req.params.slug])
    if (!c) return res.status(404).json({ error: 'not_found' })
    if (!(await mayView(req.account, c.cohort_slug))) return res.status(403).json({ error: 'not_on_panel' })
    const onThisPanel = await onPanel(req.account.id, c.cohort_slug)
    const canScore = onThisPanel && !c.closed_at
    const dimensions = await many(`
      select cr.key, cr.label, coalesce(cc.weight, cr.weight) as weight
        from criteria cr left join cohort_criteria cc on cc.cohort_slug = $1 and cc.criterion_key = cr.key
       order by cr.sort_order`, [c.cohort_slug])
    const questions = await many(`
      select q.id, q.criterion_key, q.body, q.guidance, q.source, q.created_by, s.score as my_score
        from questions q
        left join question_scores s on s.question_id = q.id and s.candidate_slug = $2 and s.account_id = $3
       where q.cohort_slug = $1 order by q.sort_order, q.id`, [c.cohort_slug, c.slug, req.account.id])
    const mine = await one(
      `select recommendation, rec_code, comment from panel_comments where candidate_slug = $1 and account_id = $2`,
      [c.slug, req.account.id])
    res.json({
      cohort: c.cohort_slug ? { slug: c.cohort_slug, name: c.cohort_name, closed: !!c.closed_at } : null,
      canScore,
      canAddQuestions: onThisPanel && !c.closed_at,
      scale: SCALE,
      recommendations: RECOMMENDATIONS,
      dimensions: dimensions.map((d) => ({
        key: d.key, label: d.label, weight: Number(d.weight),
        questions: questions.filter((q) => q.criterion_key === d.key).map((q) => ({
          id: q.id, body: q.body, guidance: q.guidance, source: q.source, myScore: q.my_score,
          mine: String(q.created_by) === String(req.account.id),
        })),
      })),
      mine: { recCode: mine?.rec_code || null, comment: mine?.comment || '' },
    })
  })

  // Save the signed-in panel member's scores and note for this candidate.
  // scores: [{ questionId, score }] — score null clears it.
  r.put('/api/candidates/:slug/assessment', staff, async (req, res) => {
    const c = await one(`select slug, cohort_slug from candidates where slug = $1`, [req.params.slug])
    if (!c) return res.status(404).json({ error: 'not_found' })
    if (!c.cohort_slug) return res.status(400).json({ error: 'no_cohort' })
    if (!(await onPanel(req.account.id, c.cohort_slug))) return res.status(403).json({ error: 'not_on_panel' })
    if (await isClosed(c.cohort_slug)) return res.status(409).json({ error: 'cohort_closed', message: 'This cohort is closed; scores are final.' })
    const valid = new Set((await many(`select id from questions where cohort_slug = $1`, [c.cohort_slug])).map((q) => String(q.id)))
    const items = Array.isArray(req.body?.scores) ? req.body.scores : []
    for (const it of items) {
      if (!valid.has(String(it.questionId))) return res.status(400).json({ error: 'bad_question' })
      if (it.score != null && !(Number.isInteger(it.score) && it.score >= 1 && it.score <= SCALE)) return res.status(400).json({ error: 'bad_score' })
    }
    const acc = req.account
    for (const it of items) {
      if (it.score == null) {
        await query(`delete from question_scores where question_id = $1 and candidate_slug = $2 and account_id = $3`, [it.questionId, c.slug, acc.id])
      } else {
        await query(
          `insert into question_scores (question_id, candidate_slug, account_id, score) values ($1, $2, $3, $4)
           on conflict (question_id, candidate_slug, account_id) do update set score = excluded.score, updated_at = now()`,
          [it.questionId, c.slug, acc.id, it.score])
      }
    }
    const rec = RECOMMENDATIONS.find((x) => x.code === req.body?.recCode) || null
    const comment = String(req.body?.comment || '').trim()
    if (rec || comment) {
      await query(
        `insert into panel_comments (candidate_slug, account_id, panelist_name, recommendation, rec_code, comment)
         values ($1, $2, $3, $4, $5, $6)
         on conflict (candidate_slug, account_id) do update set panelist_name = excluded.panelist_name,
           recommendation = excluded.recommendation, rec_code = excluded.rec_code, comment = excluded.comment`,
        [c.slug, acc.id, acc.display_name || acc.email, rec?.label || null, rec?.code || null, comment || null])
    } else {
      await query(`delete from panel_comments where candidate_slug = $1 and account_id = $2`, [c.slug, acc.id])
    }
    await recomputeCandidate(c.slug)
    res.json({ ok: true })
  })

  return r
}
