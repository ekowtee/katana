import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Quote, GraduationCap, Phone, Mail, MapPin, CalendarDays, FileText, ClipboardCheck } from 'lucide-react'
import { api } from '../lib/api'
import { StatusChip, Loader, fmtPct, critShort } from '../components/ui'
import { useAuth } from '../lib/AuthContext'

const REC_CLASS = { SR: 'chip-selected', R: 'chip-discuss', RL: 'chip-reserve', DNR: 'chip-not_selected', NA: 'chip-review', OTHER: 'chip-review' }
const fmtWhen = (iso) => new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(iso))

export default function CandidateDetail() {
  const { slug } = useParams()
  const { account } = useAuth()
  const [d, setD] = useState(null)
  const [err, setErr] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    setD(null)
    api.candidate(slug).then(setD).catch((e) => setErr(e.code === 'not_on_panel'
      ? 'This candidate is in a cohort whose interview panel you’re not on.'
      : 'Could not load candidate.'))
  }, [slug])
  // After the panel member saves scores: refresh totals without the loader.
  const reload = () => api.candidate(slug).then(setD).catch(() => {})

  if (err) return <p style={{ color: 'var(--color-error)' }}>{err}</p>
  if (!d) return <Loader label="Loading candidate" />

  const c = d.candidate
  const submissions = [
    ['Why this Fellowship', c.why_fellowship],
    ['Career Ambitions', c.career_ambitions],
    ['Personal Statement', c.personal_statement],
    ['Capstone Project', c.capstone],
  ].filter(([, v]) => v)

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <button className="btn-ghost btn-sm" onClick={() => navigate(c.cohort_slug ? `/portal?cohort=${encodeURIComponent(c.cohort_slug)}` : '/portal')} style={{ marginBottom: '1.25rem' }}>
        <ArrowLeft size={14} /> Dashboard
      </button>

      {/* Header */}
      <div className="card card-pad" style={{ display: 'flex', flexWrap: 'wrap', gap: '1.25rem', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div style={{ minWidth: 260 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {c.rank != null && <span className="rank-badge top" style={{ width: 38, height: 38, fontSize: '1.1rem' }}>{c.rank}</span>}
            <div>
              <h1 className="portal-h1" style={{ fontSize: '2rem', marginTop: 0 }}>{c.name}</h1>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                <StatusChip status={c.status} />
                {d.cohort && <span className="tag" style={{ color: 'var(--color-gold-muted)' }}>{d.cohort.name}{d.cohort.role ? ` · ${d.cohort.role}` : ''}</span>}
                {c.category && <span className="tag">{c.category}</span>}
                {c.interview_at
                  ? <span className="tag"><CalendarDays size={10} style={{ verticalAlign: '-1px', marginRight: 4 }} />{fmtWhen(c.interview_at)}{c.interview_location ? ` · ${c.interview_location}` : d.cohort?.interview_location ? ` · ${d.cohort.interview_location}` : ''}</span>
                  : c.interview_day && <span className="tag"><CalendarDays size={10} style={{ verticalAlign: '-1px', marginRight: 4 }} />{c.interview_day}</span>}
              </div>
            </div>
          </div>
          <div style={{ display: 'grid', gap: 6, marginTop: '1.1rem', fontSize: 12.5, color: 'var(--color-cream-muted)' }}>
            {c.discipline && <Meta icon={<GraduationCap size={13} />}>{c.discipline}{c.institution ? ` · ${c.institution}` : ''}</Meta>}
            {c.email && <Meta icon={<Mail size={13} />}><a href={`mailto:${c.email}`} style={{ color: 'inherit' }} className="break-all">{c.email}</a></Meta>}
            {c.phone && <Meta icon={<Phone size={13} />}>{c.phone}</Meta>}
            {c.address && <Meta icon={<MapPin size={13} />}>{c.address}</Meta>}
            {d.cvFile && <Meta icon={<FileText size={13} />}><a href={`/api/cvs/${d.cvFile.id}/file`} target="_blank" rel="noreferrer" style={{ color: 'var(--color-gold)' }}>View CV</a></Meta>}
          </div>
        </div>
        <div className="text-left sm:text-right mt-4 sm:mt-0">
          <div className="portal-eyebrow">Total Score</div>
          <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '2.8rem', lineHeight: 1, color: 'var(--color-gold)', fontWeight: 600 }}>
            {c.total_50 != null ? Number(c.total_50).toFixed(1) : '—'}<span style={{ fontSize: '1rem', color: 'var(--color-cream-muted)' }}> / {d.maxPoints ?? 50}</span>
          </div>
          <div style={{ fontSize: 13, color: 'var(--color-cream-muted)', marginTop: 4 }}>{fmtPct(c.score_pct)} attainment</div>
        </div>
      </div>

      {/* CV summary (PANEL ONLY) */}
      {c.cv_summary && (
        <div className="card card-pad" style={{ marginTop: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <span className="card-title"><FileText size={13} style={{ verticalAlign: '-2px', marginRight: 6 }} />CV Summary</span>
            <span className="tag" style={{ color: 'var(--color-gold-muted)' }}>Internal · not shown to candidate</span>
          </div>
          <p className="prose" style={{ marginTop: 14 }}>{c.cv_summary}</p>
        </div>
      )}

      <AssessmentCard slug={c.slug} isAdmin={account?.role === 'admin'} onSaved={reload} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem', marginTop: '1.25rem' }} className="dash-grid">
        {/* Score breakdown */}
        <div className="card card-pad">
          <span className="card-title">Score Breakdown</span>
          <div style={{ display: 'grid', gap: 14, marginTop: 16 }}>
            {d.scores.length === 0 && <p style={{ fontSize: 12, color: 'var(--color-cream-muted)' }}>Not scored — interview incomplete.</p>}
            {d.scores.map((s) => (
              <div key={s.criterion_key}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, fontSize: 12 }}>
                  <span style={{ color: 'var(--color-cream)' }}>{critShort(s.label)} <span style={{ color: 'var(--color-cream-muted)' }}>/ {s.weight}</span></span>
                  <span style={{ color: 'var(--color-gold)' }}>{s.avg_norm != null ? Number(s.avg_norm).toFixed(2) : '—'}</span>
                </div>
                <div className="scorebar"><span style={{ width: `${s.avg_norm != null ? (s.avg_norm / s.weight) * 100 : 0}%` }} /></div>
              </div>
            ))}
          </div>
          {(c.recommendations_summary || c.panel_reading) && (
            <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--color-border-green)' }}>
              {c.recommendations_summary && (
                <p style={{ fontSize: 12, color: 'var(--color-cream-muted)', marginBottom: 8 }}>
                  <span className="portal-eyebrow">Recommendations</span><br />{c.recommendations_summary}
                </p>
              )}
              {c.panel_reading && (
                <p style={{ fontSize: 13, color: 'var(--color-cream)', fontStyle: 'italic', lineHeight: 1.6 }}>“{c.panel_reading}”</p>
              )}
            </div>
          )}
        </div>

        {/* Panel comments (PANEL ONLY) */}
        <div className="card card-pad">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="card-title">Panel Notes</span>
            <span className="tag" style={{ color: 'var(--color-gold-muted)' }}>Internal · not shown to candidate</span>
          </div>
          <div style={{ display: 'grid', gap: 12, marginTop: 16 }}>
            {d.comments.length === 0 && <p style={{ fontSize: 12, color: 'var(--color-cream-muted)' }}>No panel comments recorded.</p>}
            {d.comments.map((cm, i) => (
              <div key={i} style={{ borderLeft: '2px solid var(--color-border-green)', paddingLeft: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                  <span style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--color-cream)' }}>{cm.panelist_name}</span>
                  {cm.recommendation && <span className={`chip ${REC_CLASS[cm.rec_code] || 'chip-review'}`}><span className="dot" />{cm.recommendation}</span>}
                </div>
                {cm.comment && <p style={{ fontSize: 12.5, color: 'var(--color-cream-muted)', lineHeight: 1.6 }}>{cm.comment}</p>}
              </div>
            ))}
          </div>
          {account?.role === 'admin' && (
            <Link to={`/portal/admin?candidate=${c.slug}`} className="btn-ghost btn-sm" style={{ marginTop: 16 }}>
              Curate candidate feedback →
            </Link>
          )}
        </div>

        {/* Feedback to the candidate: drafted by the panel, published by an admin */}
        <FeedbackCard slug={c.slug} />
      </div>

      {/* Submission */}
      {submissions.length > 0 && (
        <div className="card card-pad" style={{ marginTop: '1.25rem' }}>
          <span className="card-title"><Quote size={13} style={{ verticalAlign: '-2px', marginRight: 6 }} />Submission &amp; Motivation</span>
          <div style={{ display: 'grid', gap: 24, marginTop: 18 }}>
            {submissions.map(([title, body]) => (
              <div key={title}>
                <div className="portal-eyebrow" style={{ marginBottom: 8 }}>{title}</div>
                <p className="prose">{body}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  )
}

// The signed-in panel member's own scores for this candidate: every question in
// the candidate's cohort, 1–5, plus their recommendation and notes.
function AssessmentCard({ slug, isAdmin, onSaved }) {
  const [a, setA] = useState(null)
  const [scores, setScores] = useState({}) // questionId -> 1..5
  const [recCode, setRecCode] = useState('')
  const [comment, setComment] = useState('')
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    setA(null)
    api.assessment(slug).then((r) => {
      setA(r)
      setScores(Object.fromEntries(r.dimensions.flatMap((d) => d.questions).filter((q) => q.myScore != null).map((q) => [q.id, q.myScore])))
      setRecCode(r.mine.recCode || '')
      setComment(r.mine.comment || '')
      setDirty(false)
    }).catch(() => setMsg('Could not load the assessment.'))
  }, [slug])

  const reloadAssessment = () => api.assessment(slug).then((r) => setA(r)).catch(() => {})

  if (!a) return msg ? <p style={{ color: 'var(--color-error)', marginTop: '1.25rem' }}>{msg}</p> : null

  const all = a.dimensions.flatMap((d) => d.questions)
  const done = all.filter((q) => scores[q.id] != null).length
  const closed = !!a.cohort?.closed
  const readOnly = !a.canScore
  const pick = (id, n) => { if (readOnly) return; setScores((s) => ({ ...s, [id]: s[id] === n ? null : n })); setDirty(true); setMsg('') }
  const removeQuestion = async (q) => {
    if (!confirm('Delete this question? Only questions you added, that nobody has scored, can be deleted.')) return
    try { await api.deleteQuestion(q.id); await reloadAssessment() } catch (e) { setMsg(e.message || 'Could not delete the question.') }
  }

  const save = async () => {
    setSaving(true); setMsg('')
    try {
      await api.saveAssessment(slug, {
        scores: all.map((q) => ({ questionId: q.id, score: scores[q.id] ?? null })),
        recCode: recCode || null, comment,
      })
      setDirty(false); setMsg('Saved'); onSaved()
    } catch { setMsg('Could not save — please try again.') } finally { setSaving(false) }
  }

  return (
    <div className="card card-pad" style={{ marginTop: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <span className="card-title"><ClipboardCheck size={13} style={{ verticalAlign: '-2px', marginRight: 6 }} />Your Assessment</span>
        <span className="tag">{a.cohort ? `${a.cohort.name} · ` : ''}{done} of {all.length} scored</span>
      </div>

      {a.cohort && closed && (
        <p style={{ fontSize: 12.5, color: 'var(--color-gold)', marginTop: 14 }}>
          {a.cohort.name} is closed: results have been released and scores are final.
        </p>
      )}
      {a.cohort && !closed && readOnly ? (
        <p style={{ fontSize: 12.5, color: 'var(--color-cream-muted)', marginTop: 14 }}>
          You’re not on the interview panel for {a.cohort.name}, so you can’t score this candidate.
          {isAdmin && <> Add yourself under <Link to="/portal/admin?tab=cohorts" style={{ color: 'var(--color-gold)' }}>Admin → Cohorts → Interview panel</Link>.</>}
        </p>
      ) : !a.cohort ? (
        <p style={{ fontSize: 12.5, color: 'var(--color-cream-muted)', marginTop: 14 }}>
          This candidate isn’t in a cohort yet, so there are no questions to score.
          {isAdmin && <> Assign one in <Link to={`/portal/admin?candidate=${slug}`} style={{ color: 'var(--color-gold)' }}>Admin → Candidate Feedback</Link>.</>}
        </p>
      ) : (
        <>
          {!readOnly && (
            <p style={{ fontSize: 12, color: 'var(--color-cream-muted)', marginTop: 8 }}>
              Score each question from 1 (weak) to {a.scale} (excellent). Click a selected score again to clear it. Only you see your scores; the panel sees the average.
            </p>
          )}
          <div style={{ display: 'grid', gap: 22, marginTop: 18 }}>
            {a.dimensions.map((dim) => (
              <div key={dim.key}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderBottom: '1px solid var(--color-border-green)', paddingBottom: 6, marginBottom: 10 }}>
                  <span className="portal-eyebrow" style={{ margin: 0 }}>{dim.label}</span>
                  <span style={{ fontSize: 11, color: 'var(--color-cream-muted)' }}>{dim.weight} pts</span>
                </div>
                {dim.questions.length === 0 && (
                  <p style={{ fontSize: 12, color: 'var(--color-cream-muted)', fontStyle: 'italic' }}>
                    No questions set for this dimension yet.
                    {isAdmin && <> Add them in <Link to="/portal/admin?tab=cohorts" style={{ color: 'var(--color-gold)' }}>Admin → Cohorts</Link>, or below.</>}
                  </p>
                )}
                <div style={{ display: 'grid', gap: 10 }}>
                  {dim.questions.map((q, i) => (
                    <div key={q.id} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                      <div style={{ flex: '1 1 260px', minWidth: 0 }}>
                        <p style={{ fontSize: 13, color: 'var(--color-cream)', lineHeight: 1.6, margin: 0 }}>
                          <span style={{ color: 'var(--color-gold-muted)', marginRight: 6 }}>{i + 1}.</span>{q.body}
                          {q.source === 'ritevizor' && <span className="tag" style={{ marginLeft: 8 }}>RiteVizor</span>}
                        </p>
                        {q.guidance && <Guidance text={q.guidance} />}
                        {q.mine && a.canAddQuestions && (
                          <button type="button" onClick={() => removeQuestion(q)} style={{ background: 'none', border: 'none', padding: 0, marginTop: 4, fontSize: 10.5, color: 'var(--color-cream-muted)', cursor: 'pointer', textDecoration: 'underline' }}>
                            You added this · delete
                          </button>
                        )}
                      </div>
                      <div className="score-pills" role="group" aria-label={`Score for question ${i + 1}`}>
                        {Array.from({ length: a.scale }, (_, k) => k + 1).map((n) => (
                          <button key={n} type="button" className={`score-pill ${scores[q.id] === n ? 'on' : ''}`} disabled={readOnly}
                            aria-pressed={scores[q.id] === n} onClick={() => pick(q.id, n)} style={readOnly ? { cursor: 'default', opacity: scores[q.id] === n ? 1 : 0.45 } : undefined}>{n}</button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                {a.canAddQuestions && dim.key !== 'appearance' && (
                  <AddQuestionInline cohort={a.cohort.slug} criterionKey={dim.key} label={dim.label} onAdded={reloadAssessment} />
                )}
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 220px) minmax(0, 1fr)', gap: 14, marginTop: 22 }} className="dash-grid">
            <div>
              <label>Your recommendation</label>
              <select value={recCode} onChange={(e) => { setRecCode(e.target.value); setDirty(true); setMsg('') }} style={{ width: '100%' }}>
                <option value="">—</option>
                {a.recommendations.map((r) => <option key={r.code} value={r.code}>{r.label}</option>)}
              </select>
            </div>
            <div>
              <label>Your notes (panel only)</label>
              <textarea className="portal-input" value={comment} onChange={(e) => { setComment(e.target.value); setDirty(true); setMsg('') }}
                placeholder="Strengths, concerns, anything the panel should discuss…" />
            </div>
          </div>

          {!readOnly && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 14 }}>
              <button className="btn-gold" onClick={save} disabled={saving || !dirty}>{saving ? 'Saving…' : 'Save assessment'}</button>
              {msg && <span style={{ fontSize: 12, color: msg === 'Saved' ? 'var(--color-success)' : 'var(--color-error)' }}>{msg}</span>}
              {!msg && dirty && <span style={{ fontSize: 12, color: 'var(--color-cream-muted)' }}>Unsaved changes</span>}
            </div>
          )}
          {readOnly && msg && <p style={{ fontSize: 12, color: 'var(--color-error)', marginTop: 10 }}>{msg}</p>}
        </>
      )}
    </div>
  )
}

// "What good looks like" under a question (a RiteVizor anchor, or notes the author added).
function Guidance({ text }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ marginTop: 4 }}>
      <button type="button" onClick={() => setOpen((o) => !o)} style={{ background: 'none', border: 'none', padding: 0, fontSize: 11, color: 'var(--color-gold)', cursor: 'pointer' }}>
        {open ? '▾' : '▸'} What a strong answer shows
      </button>
      {open && <p className="prose" style={{ fontSize: 12, marginTop: 6, paddingLeft: 10, borderLeft: '2px solid var(--color-gold-faint)' }}>{text}</p>}
    </div>
  )
}

// Panel members can add a question from the interview itself.
function AddQuestionInline({ cohort, criterionKey, label, onAdded }) {
  const [open, setOpen] = useState(false)
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  if (!open) {
    return <button type="button" className="btn-ghost btn-sm" style={{ marginTop: 10 }} onClick={() => setOpen(true)}>+ Add a {label.toLowerCase()} question</button>
  }
  const add = async () => {
    if (!body.trim()) return
    setBusy(true); setErr('')
    try { await api.addQuestion(cohort, { criterionKey, body: body.trim() }); setBody(''); setOpen(false); await onAdded() }
    catch (e) { setErr(e.message || 'Could not add the question.') } finally { setBusy(false) }
  }
  return (
    <div style={{ marginTop: 10, display: 'grid', gap: 8 }}>
      <textarea className="portal-input" value={body} onChange={(e) => setBody(e.target.value)} placeholder={`A ${label.toLowerCase()} question for every candidate in this cohort…`} style={{ minHeight: 56 }} autoFocus />
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <button type="button" className="btn-gold btn-sm" disabled={busy || !body.trim()} onClick={add}>{busy ? 'Adding…' : 'Add question'}</button>
        <button type="button" className="btn-ghost btn-sm" onClick={() => { setOpen(false); setBody(''); setErr('') }}>Cancel</button>
        <span style={{ fontSize: 11, color: err ? 'var(--color-error)' : 'var(--color-cream-muted)' }}>{err || 'It’s added for the whole cohort; you can delete it until someone scores it.'}</span>
      </div>
    </div>
  )
}

// Feedback the candidate will see: panel members draft it, an admin approves
// and publishes each section. Published text can only be changed by an admin.
function FeedbackCard({ slug }) {
  const [d, setD] = useState(null)
  const [items, setItems] = useState({})
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const load = () => api.feedback(slug).then((r) => {
    setD(r)
    const map = {}
    r.feedback.forEach((f) => { map[f.criterion_key || ''] = { body: f.body, approved: f.approved, by: f.updated_by_name, at: f.updated_at } })
    setItems(map); setDirty(false)
  }).catch(() => setMsg('Could not load the feedback.'))
  useEffect(() => { load() }, [slug]) // eslint-disable-line react-hooks/exhaustive-deps
  if (!d) return <div className="card card-pad">{msg ? <p style={{ color: 'var(--color-error)', fontSize: 12 }}>{msg}</p> : <div className="spin" />}</div>

  const sections = [{ key: '', label: 'Overall note to candidate' }, ...d.criteria.map((c) => ({ key: c.key, label: c.label }))]
  const set = (key, patch) => { setItems((m) => ({ ...m, [key]: { body: '', approved: false, ...m[key], ...patch } })); setDirty(true); setMsg('') }
  const save = async () => {
    setSaving(true); setMsg('')
    try {
      await api.saveFeedback(slug, sections.map((s) => ({ criterionKey: s.key || null, body: items[s.key]?.body || '', approved: !!items[s.key]?.approved })))
      await load(); setMsg('Saved')
    } catch (e) { setMsg(e.message || 'Could not save.') } finally { setSaving(false) }
  }

  return (
    <div className="card card-pad">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span className="card-title">Feedback to Candidate</span>
        <span className="tag" style={{ color: 'var(--color-gold)' }}>{d.canApprove ? 'You publish' : 'Draft · an admin publishes'}</span>
      </div>
      <p style={{ fontSize: 11, color: 'var(--color-cream-muted)', marginTop: 6, lineHeight: 1.6 }}>
        Written for the candidate; they see only <strong>published</strong> sections, once their cohort is closed. Your panel notes above are never shared.
      </p>
      <div style={{ display: 'grid', gap: 14, marginTop: 14 }}>
        {sections.map((s) => {
          const v = items[s.key] || { body: '', approved: false }
          const locked = v.approved && !d.canApprove
          return (
            <div key={s.key}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-gold)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{critShort(s.label)}</span>
                {d.canApprove ? (
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, margin: 0, cursor: 'pointer', color: v.approved ? 'var(--color-success)' : 'var(--color-cream-muted)', textTransform: 'none', letterSpacing: 0 }}>
                    <input type="checkbox" checked={!!v.approved} onChange={(e) => set(s.key, { approved: e.target.checked })} style={{ width: 14, height: 14 }} />
                    <span style={{ fontSize: 10 }}>Approve &amp; publish</span>
                  </label>
                ) : (
                  <span className={`chip ${v.approved ? 'chip-selected' : 'chip-review'}`}><span className="dot" />{v.approved ? 'Published' : 'Draft'}</span>
                )}
              </div>
              {d.canEdit && !locked ? (
                <textarea className="portal-input" value={v.body} onChange={(e) => set(s.key, { body: e.target.value })} placeholder={`What the candidate should hear about “${critShort(s.label)}”…`} style={{ minHeight: 64 }} />
              ) : (
                v.body ? <p className="prose" style={{ fontSize: 12.5 }}>{v.body}</p> : <p style={{ fontSize: 12, color: 'var(--color-cream-muted)', fontStyle: 'italic' }}>Nothing written yet.</p>
              )}
              {v.by && <p style={{ fontSize: 10.5, color: 'var(--color-cream-muted)', marginTop: 3 }}>Last edited by {v.by}</p>}
            </div>
          )
        })}
      </div>
      {d.canEdit && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 14 }}>
          <button className="btn-gold btn-sm" onClick={save} disabled={saving || !dirty}>{saving ? 'Saving…' : 'Save feedback'}</button>
          {msg && <span style={{ fontSize: 12, color: msg === 'Saved' ? 'var(--color-success)' : 'var(--color-error)' }}>{msg}</span>}
          {!msg && dirty && <span style={{ fontSize: 12, color: 'var(--color-cream-muted)' }}>Unsaved changes</span>}
        </div>
      )}
    </div>
  )
}

function Meta({ icon, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ color: 'var(--color-gold-muted)' }}>{icon}</span>{children}
    </div>
  )
}
