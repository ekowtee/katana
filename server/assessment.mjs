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

export function assessmentRoutes() {
  const r = express.Router()
  const admin = requireAuth('admin')
  const staff = requireAuth('panel', 'admin')

  // ── Cohorts (admin) ──────────────────────────────────────────────────────
  r.get('/api/admin/cohorts', admin, async (req, res) => {
    const criteria = await many(`select key, label, weight, sort_order from criteria order by sort_order`)
    const cohorts = await many(`
      select co.slug, co.name, co.role, co.created_at,
             (select count(*)::int from candidates c where c.cohort_slug = co.slug) as candidates,
             (select count(*)::int from questions q where q.cohort_slug = co.slug) as questions,
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
    if (copyFrom && (await one(`select 1 from cohorts where slug = $1`, [copyFrom]))) {
      await query(
        `insert into cohort_criteria (cohort_slug, criterion_key, weight)
         select $1, criterion_key, weight from cohort_criteria where cohort_slug = $2`, [slug, copyFrom])
      await query(
        `insert into questions (cohort_slug, criterion_key, body, sort_order)
         select $1, criterion_key, body, sort_order from questions where cohort_slug = $2 order by id`, [slug, copyFrom])
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

  // ── Questions (admin) ────────────────────────────────────────────────────
  r.get('/api/admin/cohorts/:slug/questions', admin, async (req, res) => {
    const questions = await many(`
      select q.id, q.criterion_key, q.body, q.sort_order,
             (select count(*)::int from question_scores s where s.question_id = q.id) as scores
        from questions q where q.cohort_slug = $1 order by q.sort_order, q.id`, [req.params.slug])
    res.json({ questions })
  })

  r.post('/api/admin/cohorts/:slug/questions', admin, async (req, res) => {
    const body = String(req.body?.body || '').trim()
    const key = req.body?.criterionKey
    if (!body || !(await one(`select 1 from criteria where key = $1`, [key]))) return res.status(400).json({ error: 'bad_input' })
    if (!(await one(`select 1 from cohorts where slug = $1`, [req.params.slug]))) return res.status(404).json({ error: 'not_found' })
    const q = await one(
      `insert into questions (cohort_slug, criterion_key, body, sort_order)
       values ($1, $2, $3, (select coalesce(max(sort_order), -1) + 1 from questions where cohort_slug = $1 and criterion_key = $2))
       returning id`, [req.params.slug, key, body])
    res.json({ ok: true, id: q.id })
  })

  r.patch('/api/admin/questions/:id', admin, async (req, res) => {
    const body = String(req.body?.body || '').trim()
    if (!body) return res.status(400).json({ error: 'bad_input' })
    await query(`update questions set body = $2 where id = $1`, [req.params.id, body])
    res.json({ ok: true })
  })

  // Reorder one dimension's questions: ids in their new order.
  r.post('/api/admin/cohorts/:slug/questions/order', admin, async (req, res) => {
    const ids = Array.isArray(req.body?.ids) ? req.body.ids : []
    for (let i = 0; i < ids.length; i++) {
      await query(`update questions set sort_order = $3 where id = $1 and cohort_slug = $2`, [ids[i], req.params.slug, i])
    }
    res.json({ ok: true })
  })

  // Deleting a question deletes its scores, so rescore whoever it had scored.
  r.delete('/api/admin/questions/:id', admin, async (req, res) => {
    const affected = await many(`select distinct candidate_slug from question_scores where question_id = $1`, [req.params.id])
    await query(`delete from questions where id = $1`, [req.params.id])
    for (const a of affected) await recomputeCandidate(a.candidate_slug)
    res.json({ ok: true })
  })

  // ── Panel assessment of one candidate (panel + admin) ────────────────────
  r.get('/api/candidates/:slug/assessment', staff, async (req, res) => {
    const c = await one(
      `select c.slug, c.cohort_slug, co.name as cohort_name
         from candidates c left join cohorts co on co.slug = c.cohort_slug where c.slug = $1`, [req.params.slug])
    if (!c) return res.status(404).json({ error: 'not_found' })
    const dimensions = await many(`
      select cr.key, cr.label, coalesce(cc.weight, cr.weight) as weight
        from criteria cr left join cohort_criteria cc on cc.cohort_slug = $1 and cc.criterion_key = cr.key
       order by cr.sort_order`, [c.cohort_slug])
    const questions = await many(`
      select q.id, q.criterion_key, q.body, s.score as my_score
        from questions q
        left join question_scores s on s.question_id = q.id and s.candidate_slug = $2 and s.account_id = $3
       where q.cohort_slug = $1 order by q.sort_order, q.id`, [c.cohort_slug, c.slug, req.account.id])
    const mine = await one(
      `select recommendation, rec_code, comment from panel_comments where candidate_slug = $1 and account_id = $2`,
      [c.slug, req.account.id])
    res.json({
      cohort: c.cohort_slug ? { slug: c.cohort_slug, name: c.cohort_name } : null,
      scale: SCALE,
      recommendations: RECOMMENDATIONS,
      dimensions: dimensions.map((d) => ({
        key: d.key, label: d.label, weight: Number(d.weight),
        questions: questions.filter((q) => q.criterion_key === d.key).map((q) => ({ id: q.id, body: q.body, myScore: q.my_score })),
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
