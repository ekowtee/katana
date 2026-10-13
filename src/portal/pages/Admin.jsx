import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Copy, Send, Trash2, Plus, Check, Link2, Mail, AlertTriangle, Target, Users2, MessageSquare,
  ListChecks, ArrowUp, ArrowDown, Pencil, X, FileUp, Sparkles, RotateCw, KeyRound, Eye, EyeOff,
} from 'lucide-react'
import { api } from '../lib/api'
import { Loader, StatusChip, STATUS_LABEL } from '../components/ui'

const TABS = [
  { key: 'access', label: 'Access & Invites', icon: Users2 },
  { key: 'cohorts', label: 'Cohorts', icon: ListChecks },
  { key: 'feedback', label: 'Candidate Feedback', icon: MessageSquare },
  { key: 'settings', label: 'Settings', icon: Target },
]

export default function Admin() {
  const [params, setParams] = useSearchParams()
  const wanted = params.get('tab') === 'questions' ? 'cohorts' : params.get('tab') // old links
  const [tab, setTab] = useState(params.get('candidate') ? 'feedback' : TABS.some((t) => t.key === wanted) ? wanted : 'access')
  const [overview, setOverview] = useState(null)
  const [dash, setDash] = useState(null)
  const [cohorts, setCohorts] = useState(null)
  const [toast, setToast] = useState('')

  const load = () => api.admin.overview().then(setOverview)
  const reloadDash = () => api.dashboard().then(setDash)
  const reloadCohorts = () => api.admin.cohorts().then(setCohorts)
  useEffect(() => { load(); reloadDash(); reloadCohorts() }, [])

  const flash = (m) => { setToast(m); setTimeout(() => setToast(''), 2600) }

  if (!overview || !dash || !cohorts) return <Loader label="Loading admin" />

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <p className="portal-eyebrow">Administration</p>
      <h1 className="portal-h1">Portal <span className="accent">Control</span></h1>

      {!overview.smtpConfigured && (
        <div className="card card-pad" style={{ marginTop: '1.25rem', display: 'flex', gap: 12, alignItems: 'center', borderColor: 'rgba(224,192,96,0.4)' }}>
          <AlertTriangle size={18} style={{ color: 'var(--color-gold)' }} />
          <div style={{ fontSize: 12.5, color: 'var(--color-cream-muted)' }}>
            <strong style={{ color: 'var(--color-cream)' }}>Email isn’t set up.</strong> Sign-in links won’t send yet — use “Copy link” below and share them yourself, or add your SMTP details under <button type="button" onClick={() => setTab('settings')} style={{ background: 'none', border: 'none', padding: 0, color: 'var(--color-gold)', cursor: 'pointer', font: 'inherit', textDecoration: 'underline' }}>Settings</button>.
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 6, margin: '1.5rem 0 1.25rem', flexWrap: 'wrap' }}>
        {TABS.map((t) => (
          <button key={t.key} className={`portal-navlink ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>
            <t.icon size={13} style={{ marginRight: 6, verticalAlign: '-2px' }} />{t.label}
          </button>
        ))}
      </div>

      {tab === 'access' && <AccessTab overview={overview} reload={load} flash={flash} />}
      {tab === 'cohorts' && <CohortsTab data={cohorts} reload={reloadCohorts} reloadDash={reloadDash} flash={flash} />}
      {tab === 'feedback' && <FeedbackTab dash={dash} cohorts={cohorts.cohorts} reloadDash={() => { reloadDash(); reloadCohorts() }} initialSlug={params.get('candidate')} onSelect={(s) => setParams(s ? { candidate: s } : {})} flash={flash} />}
      {tab === 'settings' && <SettingsTab flash={flash} reloadOverview={load} />}

      {toast && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: 'var(--color-gold)', color: 'var(--color-deep-green)', padding: '0.7rem 1.4rem', borderRadius: 6, fontSize: 12, fontWeight: 700, letterSpacing: '0.04em', zIndex: 100 }}>
          {toast}
        </motion.div>
      )}
    </motion.div>
  )
}

/* ── Access & invites ──────────────────────────────────────────────────────── */
function AccessTab({ overview, reload, flash }) {
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ email: '', role: 'panel', displayName: '' })
  const byRole = (r) => overview.accounts.filter((a) => a.role === r)

  const create = async () => {
    if (!form.email) return
    try { await api.admin.createAccount(form); setForm({ email: '', role: 'panel', displayName: '' }); setAdding(false); reload(); flash('Account created') }
    catch (e) { flash(e.code === 'email_exists' ? 'Email already exists' : 'Could not create') }
  }

  return (
    <div style={{ display: 'grid', gap: '1.25rem' }}>
      {['admin', 'panel', 'candidate'].map((role) => (
        <div className="card" key={role}>
          <div className="card-pad card-hairline" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="card-title">{role === 'panel' ? 'Panel Members' : role === 'admin' ? 'Administrators' : 'Candidates'} · {byRole(role).length}</span>
            {role !== 'candidate' && (
              <button className="btn-ghost btn-sm" onClick={() => { setAdding(role); setForm((f) => ({ ...f, role })) }}>
                <Plus size={13} /> Add
              </button>
            )}
          </div>
          {adding === role && (
            <div className="card-pad card-hairline grid grid-cols-1 sm:grid-cols-[1.4fr_1fr_auto_auto] gap-3 items-end">
              <div><label>Email</label><input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="name@email.com" /></div>
              <div><label>Display name</label><input value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} placeholder="Full name" /></div>
              <div className="flex gap-2 sm:contents">
                <button className="btn-gold btn-sm flex-1 sm:flex-none" onClick={create}><Check size={14} /></button>
                <button className="btn-ghost btn-sm flex-1 sm:flex-none" onClick={() => setAdding(false)}>Cancel</button>
              </div>
            </div>
          )}
          <div style={{ overflowX: 'auto' }}>
            <table className="rank-table">
              <tbody>
                {byRole(role).map((a) => <AccountRow key={a.id} a={a} reload={reload} flash={flash} />)}
                {byRole(role).length === 0 && <tr><td style={{ padding: '0.9rem', fontSize: 12, color: 'var(--color-cream-muted)' }}>None yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  )
}

function AccountRow({ a, reload, flash }) {
  const [busy, setBusy] = useState(false)
  const invite = async (send) => {
    setBusy(true)
    try {
      const r = await api.admin.invite(a.id, send)
      if (send) flash(r.delivered ? `Link emailed to ${r.email}` : 'SMTP off — copy link instead')
      else { await navigator.clipboard.writeText(r.link); flash('Magic link copied to clipboard') }
    } catch { flash('Could not generate link') } finally { setBusy(false) }
  }
  const toggleActive = async () => { await api.admin.updateAccount(a.id, { active: !a.active }); reload() }
  const remove = async () => { if (confirm(`Remove ${a.email}?`)) { await api.admin.deleteAccount(a.id); reload(); flash('Removed') } }

  return (
    <tr className="rank-row" style={{ cursor: 'default' }}>
      <td>
        <div style={{ fontWeight: 500, color: 'var(--color-cream)', display: 'flex', gap: 8, alignItems: 'center' }}>
          {a.display_name || '—'}
          {!a.active && <span className="tag" style={{ color: 'var(--color-error)' }}>disabled</span>}
        </div>
        <div style={{ fontSize: 11, color: 'var(--color-cream-muted)' }}>{a.email}</div>
      </td>
      <td style={{ fontSize: 11, color: 'var(--color-cream-muted)', whiteSpace: 'nowrap' }}>
        {a.last_login_at ? `Last in ${new Date(a.last_login_at).toLocaleDateString()}` : 'Never signed in'}
      </td>
      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
        <button className="btn-ghost btn-sm" disabled={busy} onClick={() => invite(false)} title="Copy magic link"><Link2 size={13} /></button>{' '}
        <button className="btn-ghost btn-sm" disabled={busy} onClick={() => invite(true)} title="Email magic link"><Send size={13} /></button>{' '}
        <button className="btn-ghost btn-sm" onClick={toggleActive} title={a.active ? 'Disable' : 'Enable'}>{a.active ? '⏸' : '▶'}</button>{' '}
        <button className="btn-ghost btn-sm" onClick={remove} title="Remove" style={{ borderColor: 'rgba(232,92,92,0.3)' }}><Trash2 size={13} style={{ color: 'var(--color-error)' }} /></button>
      </td>
    </tr>
  )
}

/* ── Feedback curation ─────────────────────────────────────────────────────── */
function FeedbackTab({ dash, cohorts, reloadDash, initialSlug, onSelect, flash }) {
  const [slug, setSlug] = useState(initialSlug || dash.candidates[0]?.slug || '')
  const [items, setItems] = useState({}) // key -> {body, approved}; key '' = overall
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const criteria = dash.criteria
  const candidate = dash.candidates.find((c) => c.slug === slug)

  useEffect(() => {
    if (!slug) return
    setLoading(true)
    api.admin.getFeedback(slug).then(({ feedback }) => {
      const map = {}
      feedback.forEach((f) => { map[f.criterion_key || ''] = { body: f.body, approved: f.approved } })
      setItems(map)
    }).finally(() => setLoading(false))
  }, [slug])

  const setField = (key, patch) => setItems((m) => ({ ...m, [key]: { body: '', approved: false, ...m[key], ...patch } }))

  const save = async () => {
    setSaving(true)
    const payload = Object.entries(items)
      .filter(([, v]) => v && (v.body?.trim() || v.approved))
      .map(([key, v]) => ({ criterionKey: key || null, body: v.body || '', approved: !!v.approved }))
    try { await api.admin.saveFeedback(slug, payload); flash('Feedback saved') } finally { setSaving(false) }
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,260px) minmax(0,1fr)', gap: '1.25rem' }} className="dash-grid">
      {/* Mobile-only Candidate Selector */}
      <div className="md:hidden block">
        <label>Select Candidate</label>
        <select
          value={slug}
          onChange={(e) => { setSlug(e.target.value); onSelect(e.target.value) }}
          style={{ width: '100%', marginBottom: '1rem' }}
        >
          {dash.candidates.map((c) => (
            <option key={c.slug} value={c.slug} style={{ backgroundColor: 'var(--color-panel-green)' }}>
              {c.rank ? `${c.rank}. ` : ''}{c.name} ({c.status})
            </option>
          ))}
        </select>
      </div>

      {/* Desktop-only Candidate Sidebar */}
      <div className="card hidden md:block" style={{ alignSelf: 'start', maxHeight: '70vh', overflowY: 'auto' }}>
        <div className="card-pad card-hairline"><span className="card-title">Candidates</span></div>
        {dash.candidates.map((c) => (
          <button key={c.slug} onClick={() => { setSlug(c.slug); onSelect(c.slug) }}
            style={{ width: '100%', textAlign: 'left', padding: '0.7rem 1rem', background: c.slug === slug ? 'var(--color-gold-faint)' : 'transparent', border: 'none', borderBottom: '1px solid rgba(38,74,53,0.5)', cursor: 'pointer' }}>
            <div style={{ fontSize: 12.5, color: c.slug === slug ? 'var(--color-gold)' : 'var(--color-cream)' }}>{c.rank ? `${c.rank}. ` : ''}{c.name}</div>
            <div style={{ fontSize: 10, color: 'var(--color-cream-muted)', marginTop: 2 }}>{c.status}</div>
          </button>
        ))}
      </div>

      <div className="card card-pad">
        {loading ? <div className="spin" /> : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
              <div>
                <span className="card-title">Curate feedback · {candidate?.name}</span>
                <p style={{ fontSize: 11, color: 'var(--color-cream-muted)', marginTop: 4 }}>Only <strong>approved</strong> sections appear on the candidate’s page. Raw panel notes are never shared.</p>
              </div>
              {candidate && (
                <div style={{ textAlign: 'right' }}>
                  <label style={{ marginBottom: 4 }}>Decision Status</label>
                  <select
                    value={candidate.status}
                    onChange={async (e) => {
                      await api.admin.updateCandidate(candidate.slug, { status: e.target.value })
                      await reloadDash(); flash('Status updated')
                    }}
                    style={{ width: 180 }}
                  >
                    {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                  <p style={{ fontSize: 9.5, color: 'var(--color-cream-muted)', marginTop: 4, letterSpacing: '0.03em' }}>Drives the dashboard cutoff &amp; grouping</p>
                  <label style={{ marginBottom: 4, marginTop: 12 }}>Cohort</label>
                  <select
                    value={candidate.cohort_slug || ''}
                    onChange={async (e) => {
                      if (!e.target.value) return
                      await api.admin.updateCandidate(candidate.slug, { cohortSlug: e.target.value })
                      await reloadDash(); flash('Cohort updated')
                    }}
                    style={{ width: 180 }}
                  >
                    {!candidate.cohort_slug && <option value="">— none —</option>}
                    {cohorts.map((co) => <option key={co.slug} value={co.slug}>{co.name}</option>)}
                  </select>
                  <p style={{ fontSize: 9.5, color: 'var(--color-cream-muted)', marginTop: 4, letterSpacing: '0.03em' }}>Sets which questions &amp; weights they’re scored on</p>
                </div>
              )}
            </div>

            <div style={{ marginTop: 18 }}>
              <FeedbackField label="Overall note to candidate" value={items['']} onChange={(p) => setField('', p)} />
              {criteria.map((cr) => (
                <FeedbackField key={cr.key} label={cr.label} value={items[cr.key]} onChange={(p) => setField(cr.key, p)} />
              ))}
            </div>

            <button className="btn-gold" onClick={save} disabled={saving} style={{ marginTop: 8 }}>
              {saving ? 'Saving…' : 'Save feedback'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

function FeedbackField({ label, value, onChange }) {
  const v = value || { body: '', approved: false }
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <label style={{ marginBottom: 0 }}>{label}</label>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, margin: 0, cursor: 'pointer', color: v.approved ? 'var(--color-success)' : 'var(--color-cream-muted)', textTransform: 'none', letterSpacing: 0 }}>
          <input type="checkbox" checked={v.approved} onChange={(e) => onChange({ approved: e.target.checked })} style={{ width: 15, height: 15 }} />
          <span style={{ fontSize: 10 }}>Approve & publish</span>
        </label>
      </div>
      <textarea className="portal-input" value={v.body} onChange={(e) => onChange({ body: e.target.value })} placeholder={`Write the candidate-facing feedback for “${label}”…`} />
    </div>
  )
}

/* ── Cohorts: role, weights, CVs, interview questions ──────────────────────────────────────── */
function CohortsTab({ data, reload, reloadDash, flash }) {
  const { criteria, cohorts, scale } = data
  const [slug, setSlug] = useState(cohorts[0]?.slug || '')
  const [creating, setCreating] = useState(cohorts.length === 0)
  const cohort = cohorts.find((c) => c.slug === slug)

  const created = async (newSlug) => { await reload(); setSlug(newSlug); setCreating(false) }

  return (
    <div style={{ display: 'grid', gap: '1.25rem' }}>
      <div className="card card-pad" style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div style={{ minWidth: 220 }}>
          <label>Cohort</label>
          <select value={slug} onChange={(e) => { setSlug(e.target.value); setCreating(false) }} style={{ width: '100%' }} disabled={!cohorts.length}>
            {!cohorts.length && <option value="">No cohorts yet</option>}
            {cohorts.map((c) => <option key={c.slug} value={c.slug}>{c.name}{c.role ? ` — ${c.role}` : ''} · {c.candidates} candidate{c.candidates === 1 ? '' : 's'}</option>)}
          </select>
        </div>
        {!creating && <button className="btn-ghost btn-sm" onClick={() => setCreating(true)}><Plus size={13} /> New cohort</button>}
      </div>

      {creating && <NewCohort cohorts={cohorts} onCreated={created} onCancel={cohorts.length ? () => setCreating(false) : null} flash={flash} />}

      {cohort && !creating && (
        <>
          <CohortSettings key={cohort.slug} cohort={cohort} criteria={criteria} reload={reload} flash={flash} />
          <CvsCard key={`cv-${cohort.slug}`} cohort={cohort} onCandidates={() => { reload(); reloadDash() }} flash={flash} />
          <QuestionList key={`q-${cohort.slug}`} cohort={cohort} criteria={criteria} scale={scale} reloadCohorts={reload} flash={flash} />
        </>
      )}
    </div>
  )
}

function NewCohort({ cohorts, onCreated, onCancel, flash }) {
  const [name, setName] = useState('')
  const [role, setRole] = useState('')
  const [copyFrom, setCopyFrom] = useState('')
  const [busy, setBusy] = useState(false)
  const create = async () => {
    if (!name.trim()) return
    setBusy(true)
    try { const r = await api.admin.createCohort({ name: name.trim(), role: role.trim(), copyFrom: copyFrom || null }); flash('Cohort created'); await onCreated(r.slug) }
    catch { flash('Could not create cohort') } finally { setBusy(false) }
  }
  return (
    <div className="card card-pad">
      <span className="card-title">New cohort</span>
      <div className="grid grid-cols-1 sm:grid-cols-[1.2fr_1.2fr_1fr_auto_auto] gap-3 items-end" style={{ marginTop: 14 }}>
        <div><label>Name</label><input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. January 2027" /></div>
        <div><label>Role being interviewed for</label><input type="text" value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. IT Support Officer" /></div>
        <div>
          <label>Start from</label>
          <select value={copyFrom} onChange={(e) => setCopyFrom(e.target.value)} style={{ width: '100%' }}>
            <option value="">Blank (default weights)</option>
            {cohorts.map((c) => <option key={c.slug} value={c.slug}>Copy of {c.name}</option>)}
          </select>
        </div>
        <button className="btn-gold btn-sm" disabled={busy || !name.trim()} onClick={create}><Check size={14} /> Create</button>
        {onCancel && <button className="btn-ghost btn-sm" onClick={onCancel}>Cancel</button>}
      </div>
    </div>
  )
}

function CohortSettings({ cohort, criteria, reload, flash }) {
  const [name, setName] = useState(cohort.name)
  const [role, setRole] = useState(cohort.role || '')
  const [weights, setWeights] = useState(() => Object.fromEntries(criteria.map((c) => [c.key, String(cohort.weights[c.key] ?? c.weight)])))
  const [busy, setBusy] = useState(false)
  const total = criteria.reduce((s, c) => s + (Number(weights[c.key]) || 0), 0)
  const changed = name.trim() !== cohort.name || role.trim() !== (cohort.role || '') || criteria.some((c) => Number(weights[c.key]) !== Number(cohort.weights[c.key] ?? c.weight))
  const valid = name.trim() && criteria.every((c) => weights[c.key] !== '' && Number(weights[c.key]) >= 0 && Number(weights[c.key]) <= 100) && total > 0

  const save = async () => {
    setBusy(true)
    try {
      await api.admin.updateCohort(cohort.slug, { name: name.trim(), role: role.trim(), weights: Object.fromEntries(criteria.map((c) => [c.key, Number(weights[c.key])])) })
      await reload(); flash('Cohort saved')
    } catch { flash('Could not save cohort') } finally { setBusy(false) }
  }

  return (
    <div className="card card-pad">
      <span className="card-title"><Target size={13} style={{ verticalAlign: '-2px', marginRight: 6 }} />Cohort, role &amp; weights</span>
      <p style={{ fontSize: 12, color: 'var(--color-cream-muted)', margin: '8px 0 14px', lineHeight: 1.6 }}>
        The role shapes the AI’s CV summaries. Weights are the points each dimension is worth in a candidate’s total; changing them rescores everyone in this cohort.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" style={{ marginBottom: 12 }}>
        <div><label>Cohort name</label><input type="text" value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div><label>Role being interviewed for</label><input type="text" value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. IT Support Officer" /></div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-[repeat(4,1fr)_auto] gap-3 items-end">
        {criteria.map((c) => (
          <div key={c.key}>
            <label title={c.label}>{c.label}</label>
            <input type="number" min="0" max="100" step="1" value={weights[c.key]} onChange={(e) => setWeights((w) => ({ ...w, [c.key]: e.target.value }))} />
          </div>
        ))}
        <div style={{ fontSize: 12, color: 'var(--color-cream-muted)', paddingBottom: 10, whiteSpace: 'nowrap' }}>
          Total <strong style={{ color: 'var(--color-gold)' }}>{total}</strong>
        </div>
      </div>
      <button className="btn-gold btn-sm" style={{ marginTop: 14 }} disabled={busy || !changed || !valid} onClick={save}>{busy ? 'Saving…' : 'Save cohort'}</button>
    </div>
  )
}

const MAX_CV_BYTES = 4 * 1024 * 1024
const CV_STATUS = {
  uploaded: { label: 'Waiting', color: 'var(--color-cream-muted)' },
  processing: { label: 'Reading…', color: 'var(--color-gold)' },
  done: { label: 'Done', color: 'var(--color-success)' },
  error: { label: 'Failed', color: 'var(--color-error)' },
}

// Upload PDF CVs into the cohort, then have the AI read each one into a
// candidate and their CV summary. One CV per request, run in turn.
function CvsCard({ cohort, onCandidates, flash }) {
  const [data, setData] = useState(null)
  const [busy, setBusy] = useState('') // '' | 'upload' | 'run'
  const [progress, setProgress] = useState('')
  const [over, setOver] = useState(false)
  const load = () => api.admin.cvs(cohort.slug).then(setData).catch(() => flash('Could not load CVs'))
  useEffect(() => { api.admin.cvs(cohort.slug).then(setData).catch(() => {}) }, [cohort.slug])
  if (!data) return <div className="card card-pad"><div className="spin" /></div>

  const pending = data.files.filter((f) => f.status === 'uploaded' || f.status === 'error')

  const addFiles = async (list) => {
    const files = [...list]
    const pdfs = files.filter((f) => f.type === 'application/pdf' || /\.pdf$/i.test(f.name))
    const skipped = files.length - pdfs.length
    setBusy('upload')
    let ok = 0, tooBig = 0, failed = 0
    for (const [i, f] of pdfs.entries()) {
      setProgress(`Uploading ${i + 1} of ${pdfs.length}…`)
      if (f.size > MAX_CV_BYTES) { tooBig++; continue }
      try { await api.admin.uploadCv(cohort.slug, f); ok++ } catch { failed++ }
    }
    setBusy(''); setProgress('')
    await load()
    const notes = [ok && `${ok} uploaded`, skipped && `${skipped} not PDF`, tooBig && `${tooBig} over 4 MB`, failed && `${failed} failed`].filter(Boolean)
    flash(notes.join(' · ') || 'Nothing uploaded')
  }

  const run = async (files) => {
    setBusy('run')
    let done = 0, failed = 0
    for (const [i, f] of files.entries()) {
      setProgress(`Reading ${i + 1} of ${files.length}: ${f.filename}`)
      setData((d) => ({ ...d, files: d.files.map((x) => (x.id === f.id ? { ...x, status: 'processing', error: null } : x)) }))
      try { await api.admin.processCv(f.id); done++ } catch { failed++ }
      await load()
    }
    setBusy(''); setProgress('')
    onCandidates()
    flash(failed ? `${done} summarised · ${failed} failed` : `${done} CV${done === 1 ? '' : 's'} summarised`)
  }

  const remove = async (f) => {
    if (!confirm(`Remove ${f.filename}?${f.candidate_name ? `\n\n${f.candidate_name} stays as a candidate.` : ''}`)) return
    await api.admin.deleteCv(f.id); load()
  }

  return (
    <div className="card">
      <div className="card-pad card-hairline" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span className="card-title"><FileUp size={13} style={{ verticalAlign: '-2px', marginRight: 6 }} />CVs · {data.files.length}</span>
        <span className="tag">{data.ai ? `AI: ${data.ai.provider} · ${data.ai.model}` : 'No AI provider set'}</span>
      </div>
      <div className="card-pad" style={{ display: 'grid', gap: 14 }}>
        <label
          onDragOver={(e) => { e.preventDefault(); setOver(true) }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => { e.preventDefault(); setOver(false); if (!busy) addFiles(e.dataTransfer.files) }}
          style={{
            display: 'grid', placeItems: 'center', gap: 6, padding: '1.6rem 1rem', cursor: busy ? 'default' : 'pointer', textAlign: 'center',
            border: `1px dashed ${over ? 'var(--color-gold)' : 'var(--color-border-green)'}`, borderRadius: 'var(--radius-sm)',
            background: over ? 'var(--color-gold-faint)' : 'transparent', textTransform: 'none', letterSpacing: 0, margin: 0,
          }}>
          <FileUp size={20} style={{ color: 'var(--color-gold)' }} />
          <span style={{ fontSize: 13, color: 'var(--color-cream)' }}>Drop PDF CVs here, or click to choose</span>
          <span style={{ fontSize: 11, color: 'var(--color-cream-muted)' }}>PDF only, up to 4 MB each. Several at once is fine.</span>
          <input type="file" accept="application/pdf,.pdf" multiple disabled={!!busy} style={{ display: 'none' }}
            onChange={(e) => { addFiles(e.target.files); e.target.value = '' }} />
        </label>

        {!data.ai && (
          <p style={{ fontSize: 12, color: 'var(--color-gold)' }}>
            To generate summaries, add an AI provider and API key under <strong>Admin → Settings</strong>.
          </p>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <button className="btn-gold btn-sm" disabled={!!busy || !data.ai || !pending.length} onClick={() => run(pending)}>
            <Sparkles size={13} /> Generate summaries{pending.length ? ` (${pending.length})` : ''}
          </button>
          {progress && <span style={{ fontSize: 12, color: 'var(--color-cream-muted)' }}><span className="spin" style={{ width: 12, height: 12, display: 'inline-block', verticalAlign: '-2px', marginRight: 8, borderWidth: 2 }} />{progress}</span>}
          {!progress && <span style={{ fontSize: 11, color: 'var(--color-cream-muted)' }}>Each CV becomes a candidate in this cohort (or updates the candidate with the same email), with a panel-only summary written for the role. Takes up to a minute per CV.</span>}
        </div>

        {data.files.length > 0 && (
          <div style={{ display: 'grid', gap: 8 }}>
            {data.files.map((f) => {
              const st = CV_STATUS[f.status] || CV_STATUS.uploaded
              return (
                <div key={f.id} style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', borderLeft: '2px solid var(--color-border-green)', paddingLeft: 12 }}>
                  <div style={{ flex: '1 1 260px', minWidth: 0 }}>
                    <a href={`/api/cvs/${f.id}/file`} target="_blank" rel="noreferrer" style={{ fontSize: 13, color: 'var(--color-cream)' }} className="break-all">{f.filename}</a>
                    <span style={{ fontSize: 11, color: 'var(--color-cream-muted)', marginLeft: 8 }}>{Math.max(1, Math.round(f.size_bytes / 1024))} KB</span>
                    <div style={{ fontSize: 11.5, marginTop: 2, color: st.color }}>
                      {st.label}
                      {f.status === 'done' && f.candidate_slug && <> → <Link to={`/portal/candidate/${f.candidate_slug}`} style={{ color: 'var(--color-gold)' }}>{f.candidate_name || 'candidate'}</Link></>}
                      {f.status === 'error' && f.error && <span style={{ color: 'var(--color-cream-muted)' }}> — {f.error}</span>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                    {f.status !== 'processing' && (
                      <button className="btn-ghost btn-sm" disabled={!!busy || !data.ai} onClick={() => run([f])} title={f.status === 'done' ? 'Re-read this CV (rewrites the summary)' : 'Read this CV'}>
                        <RotateCw size={12} />
                      </button>
                    )}
                    <button className="btn-ghost btn-sm" disabled={!!busy} onClick={() => remove(f)} title="Remove file" style={{ borderColor: 'rgba(232,92,92,0.3)' }}><Trash2 size={12} style={{ color: 'var(--color-error)' }} /></button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function QuestionList({ cohort, criteria, scale, reloadCohorts, flash }) {
  const [questions, setQuestions] = useState(null)
  const load = () => api.admin.questions(cohort.slug).then((r) => setQuestions(r.questions))
  useEffect(() => { api.admin.questions(cohort.slug).then((r) => setQuestions(r.questions)) }, [cohort.slug])
  if (!questions) return <div className="card card-pad"><div className="spin" /></div>

  const changed = async () => { await load(); reloadCohorts() }
  const move = async (key, index, dir) => {
    const ids = questions.filter((q) => q.criterion_key === key).map((q) => q.id)
    const j = index + dir
    if (j < 0 || j >= ids.length) return
    ;[ids[index], ids[j]] = [ids[j], ids[index]]
    await api.admin.orderQuestions(cohort.slug, ids); await load()
  }

  return (
    <div style={{ display: 'grid', gap: '1.25rem' }}>
      <p style={{ fontSize: 12, color: 'var(--color-cream-muted)', lineHeight: 1.6 }}>
        Panel members score every item below from 1 to {scale} on each candidate’s file. A dimension’s score is the average of its items, so the number of questions doesn’t change its weight.
      </p>
      {criteria.map((cr) => {
        const list = questions.filter((q) => q.criterion_key === cr.key)
        const isAppearance = cr.key === 'appearance'
        return (
          <div className="card" key={cr.key}>
            <div className="card-pad card-hairline" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span className="card-title">{cr.label} · {list.length}</span>
              <span className="tag">{cohort.weights[cr.key] ?? cr.weight} pts{isAppearance ? ' · scored by the panel' : ''}</span>
            </div>
            {isAppearance && (
              <p className="card-pad" style={{ fontSize: 12, color: 'var(--color-cream-muted)', paddingBottom: 0 }}>
                Not a question for the candidate: the panel scores what they observe. One item is usually enough.
              </p>
            )}
            <div className="card-pad" style={{ display: 'grid', gap: 10 }}>
              {list.length === 0 && <p style={{ fontSize: 12, color: 'var(--color-cream-muted)', fontStyle: 'italic' }}>No {isAppearance ? 'items' : 'questions'} yet. Panel members can’t score this dimension until you add one.</p>}
              {list.map((q, i) => (
                <QuestionRow key={q.id} q={q} index={i} last={i === list.length - 1}
                  onMove={(dir) => move(cr.key, i, dir)} onChanged={changed} flash={flash} />
              ))}
              <AddQuestion cohort={cohort} criterionKey={cr.key} placeholder={isAppearance ? 'e.g. Professional presence and confidence' : `Add a ${cr.label.toLowerCase()} question, or paste several, one per line…`} onAdded={changed} flash={flash} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

function QuestionRow({ q, index, last, onMove, onChanged, flash }) {
  const [editing, setEditing] = useState(false)
  const [body, setBody] = useState(q.body)
  const save = async () => {
    if (!body.trim()) return
    try { await api.admin.updateQuestion(q.id, { body: body.trim() }); setEditing(false); onChanged(); flash('Question updated') }
    catch { flash('Could not update') }
  }
  const remove = async () => {
    const warn = q.scores ? `\n\n${q.scores} panel score${q.scores === 1 ? '' : 's'} on it will be deleted and the candidates rescored.` : ''
    if (!confirm(`Delete this question?${warn}`)) return
    try { await api.admin.deleteQuestion(q.id); onChanged(); flash('Question deleted') } catch { flash('Could not delete') }
  }

  if (editing) {
    return (
      <div style={{ display: 'grid', gap: 8 }}>
        <textarea className="portal-input" value={body} onChange={(e) => setBody(e.target.value)} style={{ minHeight: 60 }} autoFocus />
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-gold btn-sm" onClick={save} disabled={!body.trim()}><Check size={13} /> Save</button>
          <button className="btn-ghost btn-sm" onClick={() => { setBody(q.body); setEditing(false) }}><X size={13} /> Cancel</button>
        </div>
      </div>
    )
  }
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'flex-start', borderLeft: '2px solid var(--color-border-green)', paddingLeft: 12 }}>
      <p style={{ flex: '1 1 240px', fontSize: 13, color: 'var(--color-cream)', lineHeight: 1.6, margin: 0 }}>
        <span style={{ color: 'var(--color-gold-muted)', marginRight: 6 }}>{index + 1}.</span>{q.body}
        {q.scores > 0 && <span className="tag" style={{ marginLeft: 8 }}>{q.scores} score{q.scores === 1 ? '' : 's'}</span>}
      </p>
      <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
        <button className="btn-ghost btn-sm" disabled={index === 0} onClick={() => onMove(-1)} title="Move up"><ArrowUp size={12} /></button>
        <button className="btn-ghost btn-sm" disabled={last} onClick={() => onMove(1)} title="Move down"><ArrowDown size={12} /></button>
        <button className="btn-ghost btn-sm" onClick={() => setEditing(true)} title="Edit"><Pencil size={12} /></button>
        <button className="btn-ghost btn-sm" onClick={remove} title="Delete" style={{ borderColor: 'rgba(232,92,92,0.3)' }}><Trash2 size={12} style={{ color: 'var(--color-error)' }} /></button>
      </div>
    </div>
  )
}

function AddQuestion({ cohort, criterionKey, placeholder, onAdded, flash }) {
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)
  // One question per line, so a pasted list adds them all; leading "1." / "-" / "•" is dropped.
  const lines = body.split(/\r?\n/).map((l) => l.replace(/^\s*(?:\d+[.)]|[-•*–])\s*/, '').trim()).filter(Boolean)
  const add = async () => {
    if (!lines.length) return
    setBusy(true)
    let added = 0
    try {
      for (const line of lines) { await api.admin.addQuestion(cohort.slug, { criterionKey, body: line }); added++ }
      setBody('')
      if (added > 1) flash(`${added} questions added`)
    } catch { flash(added ? `Added ${added} of ${lines.length} — please retry the rest` : 'Could not add question') }
    finally { setBusy(false); if (added) onAdded() }
  }
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', marginTop: 4 }}>
      <textarea className="portal-input" value={body} onChange={(e) => setBody(e.target.value)} placeholder={placeholder} style={{ minHeight: 46, flex: 1 }}
        onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) add() }} />
      <button className="btn-ghost btn-sm" disabled={busy || !lines.length} onClick={add}><Plus size={13} /> {lines.length > 1 ? `Add ${lines.length}` : 'Add'}</button>
    </div>
  )
}

/* ── Settings ──────────────────────────────────────────────────────────────── */
function SettingsTab({ flash, reloadOverview }) {
  const [data, setData] = useState(null)
  const load = () => api.admin.integrations().then(setData).catch(() => flash('Could not load settings'))
  useEffect(() => { api.admin.integrations().then(setData).catch(() => {}) }, [])
  if (!data) return <div className="card card-pad"><div className="spin" /></div>
  const saved = async () => { await load(); reloadOverview() }
  return (
    <div style={{ display: 'grid', gap: '1.25rem', maxWidth: 820 }}>
      <SmtpCard smtp={data.smtp} onSaved={saved} flash={flash} />
      <AiCard ai={data.ai} onSaved={saved} flash={flash} />
      <CutoffNote />
    </div>
  )
}

const SourceNote = ({ source, what }) => (
  <p style={{ fontSize: 12, color: source === 'none' ? 'var(--color-gold)' : 'var(--color-cream-muted)', margin: '8px 0 14px', lineHeight: 1.6 }}>
    {source === 'settings' && <>Using the {what} saved here.</>}
    {source === 'env' && <>Using the server’s environment variables. Saving here overrides them.</>}
    {source === 'none' && <>Not set up yet.</>}
  </p>
)

function SmtpCard({ smtp, onSaved, flash }) {
  const [f, setF] = useState({ host: smtp.host, port: String(smtp.port || 587), secure: smtp.secure, user: smtp.user, password: '', from: smtp.from, replyTo: smtp.replyTo })
  const [busy, setBusy] = useState('')
  const set = (patch) => setF((x) => ({ ...x, ...patch }))
  const valid = f.host.trim() && Number.isInteger(Number(f.port)) && Number(f.port) > 0

  const save = async () => {
    setBusy('save')
    try { await api.admin.saveSmtp({ ...f, port: Number(f.port) }); set({ password: '' }); await onSaved(); flash('Email settings saved') }
    catch { flash('Could not save email settings') } finally { setBusy('') }
  }
  const test = async () => {
    setBusy('test')
    try {
      const r = await api.admin.testSmtp()
      flash(r.delivered ? `Test email sent to ${r.to}` : r.reason === 'smtp_not_configured' ? 'Save the settings first' : `Send failed: ${r.error || 'rejected'}`)
    } catch { flash('Test failed') } finally { setBusy('') }
  }
  const revert = async () => {
    if (!confirm('Remove the email settings saved here? The server’s environment variables (if any) will be used instead.')) return
    await api.admin.saveSmtp({ clear: true }); await onSaved(); flash('Email settings removed')
  }

  return (
    <div className="card card-pad">
      <span className="card-title"><Mail size={13} style={{ verticalAlign: '-2px', marginRight: 6 }} />Email (SMTP)</span>
      <SourceNote source={smtp.source} what="email settings" />
      <div className="grid grid-cols-1 sm:grid-cols-[2fr_1fr_1.2fr] gap-3">
        <div><label>SMTP host</label><input type="text" value={f.host} onChange={(e) => set({ host: e.target.value })} placeholder="smtp.gmail.com" /></div>
        <div><label>Port</label><input type="number" value={f.port} onChange={(e) => set({ port: e.target.value })} /></div>
        <div>
          <label>Security</label>
          <select value={f.secure ? 'ssl' : 'starttls'} onChange={(e) => set({ secure: e.target.value === 'ssl', port: e.target.value === 'ssl' ? '465' : '587' })}>
            <option value="starttls">STARTTLS (port 587)</option>
            <option value="ssl">SSL/TLS (port 465)</option>
          </select>
        </div>
        <div><label>Username</label><input type="text" value={f.user} onChange={(e) => set({ user: e.target.value })} autoComplete="off" /></div>
        <div className="sm:col-span-2">
          <label>Password / app password</label>
          <input type="password" value={f.password} onChange={(e) => set({ password: e.target.value })} autoComplete="new-password"
            placeholder={smtp.passwordSet ? 'Saved — leave blank to keep' : ''} />
        </div>
        <div><label>From address</label><input type="email" value={f.from} onChange={(e) => set({ from: e.target.value })} placeholder="hr@ninanigroup.com" /></div>
        <div className="sm:col-span-2"><label>Reply-to (optional)</label><input type="email" value={f.replyTo} onChange={(e) => set({ replyTo: e.target.value })} /></div>
      </div>
      <p style={{ fontSize: 11, color: 'var(--color-cream-muted)', marginTop: 10 }}>Emails always show the sender name “Ninani Group HR”. For Gmail, use an app password.</p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14 }}>
        <button className="btn-gold btn-sm" disabled={!!busy || !valid} onClick={save}>{busy === 'save' ? 'Saving…' : 'Save'}</button>
        <button className="btn-ghost btn-sm" disabled={!!busy || smtp.source === 'none'} onClick={test}><Send size={12} /> {busy === 'test' ? 'Sending…' : 'Send test email to me'}</button>
        {smtp.source === 'settings' && <button className="btn-ghost btn-sm" disabled={!!busy} onClick={revert}>Remove saved settings</button>}
      </div>
    </div>
  )
}

function AiCard({ ai, onSaved, flash }) {
  const [provider, setProvider] = useState(ai.provider)
  const p = ai.providers.find((x) => x.key === provider)
  const [key, setKey] = useState('')
  const [show, setShow] = useState(false)
  const [models, setModels] = useState({}) // provider -> model ids from the last test
  const [model, setModel] = useState(p?.model || '')
  const [busy, setBusy] = useState('')

  const pick = (k) => { setProvider(k); setKey(''); setModel(ai.providers.find((x) => x.key === k)?.model || '') }
  const test = async () => {
    setBusy('test')
    try {
      const r = await api.admin.testAi({ provider, apiKey: key })
      setModels((m) => ({ ...m, [provider]: r.models }))
      if (!model && r.models.length) setModel(r.models[0])
      flash(`Key works · ${r.models.length} models available`)
    } catch (e) { flash(e.message || 'Test failed') } finally { setBusy('') }
  }
  const save = async () => {
    setBusy('save')
    try { await api.admin.saveAi({ provider, model, apiKey: key }); setKey(''); await onSaved(); flash(`${p.label} saved and in use`) }
    catch { flash('Could not save') } finally { setBusy('') }
  }
  const removeKey = async () => {
    if (!confirm(`Remove the saved ${p.label} key?`)) return
    await api.admin.saveAi({ provider, removeKey: true }); await onSaved(); flash('Key removed')
  }
  const list = models[provider] || []
  const hasKey = !!(key.trim() || p?.keyMask)

  return (
    <div className="card card-pad">
      <span className="card-title"><KeyRound size={13} style={{ verticalAlign: '-2px', marginRight: 6 }} />AI for CV summaries</span>
      <p style={{ fontSize: 12, color: ai.source === 'none' ? 'var(--color-gold)' : 'var(--color-cream-muted)', margin: '8px 0 14px', lineHeight: 1.6 }}>
        {ai.source === 'none' ? 'Not set up yet: add a key below to generate CV summaries.'
          : <>In use: <strong style={{ color: 'var(--color-cream)' }}>{ai.providers.find((x) => x.key === ai.provider)?.label} · {ai.model}</strong>{ai.source === 'env' ? ' (from the server’s environment)' : ''}.</>}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_1.4fr] gap-3">
        <div>
          <label>Provider</label>
          <select value={provider} onChange={(e) => pick(e.target.value)}>
            {ai.providers.map((x) => <option key={x.key} value={x.key}>{x.label}{x.keyMask ? ' · key saved' : ''}</option>)}
          </select>
        </div>
        <div>
          <label>API key</label>
          <div style={{ display: 'flex', gap: 6 }}>
            <input type={show ? 'text' : 'password'} value={key} onChange={(e) => setKey(e.target.value)} autoComplete="new-password"
              placeholder={p?.keyMask ? `${p.keyMask} saved${p.keyFromEnv ? ' (env)' : ''} — leave blank to keep` : p?.keyHint} />
            <button type="button" className="btn-ghost btn-sm" onClick={() => setShow((s) => !s)} title={show ? 'Hide' : 'Show'}>{show ? <EyeOff size={12} /> : <Eye size={12} />}</button>
          </div>
        </div>
        <div className="sm:col-span-2">
          <label>Model</label>
          {list.length ? (
            <select value={model} onChange={(e) => setModel(e.target.value)}>
              {!list.includes(model) && model && <option value={model}>{model}</option>}
              {list.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          ) : (
            <input type="text" value={model} onChange={(e) => setModel(e.target.value)} placeholder={p?.defaultModel || 'Click “Test key” to load the available models'} />
          )}
        </div>
      </div>
      <p style={{ fontSize: 11, color: 'var(--color-cream-muted)', marginTop: 10, lineHeight: 1.6 }}>
        {p?.readsPdf ? `${p.label} reads the PDF itself, layout included.` : `${p?.label} is sent the text extracted from each PDF; scanned (image-only) CVs can’t be read this way.`}
        {' '}CVs are sent to the selected provider to be summarised. Keys are stored encrypted and never shown again.
      </p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14 }}>
        <button className="btn-ghost btn-sm" disabled={!!busy || !hasKey} onClick={test}>{busy === 'test' ? 'Testing…' : 'Test key'}</button>
        <button className="btn-gold btn-sm" disabled={!!busy || !hasKey || !model.trim()} onClick={save}>{busy === 'save' ? 'Saving…' : 'Save & use this provider'}</button>
        {p?.keyMask && !p.keyFromEnv && <button className="btn-ghost btn-sm" disabled={!!busy} onClick={removeKey}>Remove key</button>}
      </div>
    </div>
  )
}

function CutoffNote() {
  return (
    <div className="card card-pad">
      <span className="card-title"><Target size={13} style={{ verticalAlign: '-2px', marginRight: 6 }} />Selection &amp; Cutoff</span>
      <p style={{ fontSize: 13, color: 'var(--color-cream-muted)', margin: '12px 0 16px', lineHeight: 1.7 }}>
        Selection is driven by each candidate’s <strong style={{ color: 'var(--color-cream)' }}>Decision Status</strong>, not a fixed
        rank. On the dashboard, candidates are grouped by status (Selected → Discussion → Reserve → Not Selected → Not Assessed)
        and ordered by score within each group, so the cutoff line always sits cleanly below the Selected cohort.
      </p>
      <p style={{ fontSize: 13, color: 'var(--color-cream-muted)', lineHeight: 1.7 }}>
        To move a candidate above or below the cutoff, open <strong style={{ color: 'var(--color-cream)' }}>Candidate Feedback</strong>,
        pick the candidate, and change their <strong style={{ color: 'var(--color-cream)' }}>Decision Status</strong>.
      </p>
    </div>
  )
}
