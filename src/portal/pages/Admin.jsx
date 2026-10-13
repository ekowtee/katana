import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Copy, Send, Trash2, Plus, Check, Link2, Mail, AlertTriangle, Target, Users2, MessageSquare,
  ListChecks, ArrowUp, ArrowDown, Pencil, X, FileUp, Sparkles, RotateCw, KeyRound, Eye, EyeOff,
  CalendarDays, Lock, LockOpen, Download,
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
  const reloadDash = () => api.admin.candidates().then(setDash) // all cohorts, for the Admin pages
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
  const [cohortFilter, setCohortFilter] = useState(() =>
    dash.candidates.find((c) => c.slug === initialSlug)?.cohort_slug ?? cohorts[0]?.slug ?? '')
  const shown = dash.candidates.filter((c) => cohortFilter === '*' || (c.cohort_slug || '') === cohortFilter)
  const [slug, setSlug] = useState(initialSlug || shown[0]?.slug || '')
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
      <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ minWidth: 240 }}>
          <label>Cohort</label>
          <select value={cohortFilter} onChange={(e) => {
            const v = e.target.value
            setCohortFilter(v)
            const first = dash.candidates.find((c) => v === '*' || (c.cohort_slug || '') === v)
            setSlug(first?.slug || ''); onSelect(first?.slug || '')
          }}>
            {cohorts.map((co) => <option key={co.slug} value={co.slug}>{co.name}{co.role ? ` — ${co.role}` : ''}</option>)}
            {dash.candidates.some((c) => !c.cohort_slug) && <option value="">No cohort</option>}
            <option value="*">All cohorts</option>
          </select>
        </div>
        <span style={{ fontSize: 11, color: 'var(--color-cream-muted)', paddingBottom: 10 }}>{shown.length} candidate{shown.length === 1 ? '' : 's'}</span>
      </div>

      {/* Mobile-only Candidate Selector */}
      <div className="md:hidden block">
        <label>Select Candidate</label>
        <select
          value={slug}
          onChange={(e) => { setSlug(e.target.value); onSelect(e.target.value) }}
          style={{ width: '100%', marginBottom: '1rem' }}
        >
          {shown.map((c) => (
            <option key={c.slug} value={c.slug} style={{ backgroundColor: 'var(--color-panel-green)' }}>
              {c.rank ? `${c.rank}. ` : ''}{c.name} ({c.status})
            </option>
          ))}
        </select>
      </div>

      {/* Desktop-only Candidate Sidebar */}
      <div className="card hidden md:block" style={{ alignSelf: 'start', maxHeight: '70vh', overflowY: 'auto' }}>
        <div className="card-pad card-hairline"><span className="card-title">Candidates</span></div>
        {shown.map((c) => (
          <button key={c.slug} onClick={() => { setSlug(c.slug); onSelect(c.slug) }}
            style={{ width: '100%', textAlign: 'left', padding: '0.7rem 1rem', background: c.slug === slug ? 'var(--color-gold-faint)' : 'transparent', border: 'none', borderBottom: '1px solid rgba(38,74,53,0.5)', cursor: 'pointer' }}>
            <div style={{ fontSize: 12.5, color: c.slug === slug ? 'var(--color-gold)' : 'var(--color-cream)' }}>{c.rank ? `${c.rank}. ` : ''}{c.name}</div>
            <div style={{ fontSize: 10, color: 'var(--color-cream-muted)', marginTop: 2 }}>{c.status}</div>
          </button>
        ))}
      </div>

      <div className="card card-pad">
        {!candidate ? (
          <p style={{ fontSize: 12.5, color: 'var(--color-cream-muted)' }}>No candidates in this cohort yet. Upload CVs under Cohorts.</p>
        ) : loading ? <div className="spin" /> : (
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
          <PanelCard key={`panel-${cohort.slug}`} cohort={cohort} onSaved={reload} flash={flash} />
          <CvsCard key={`cv-${cohort.slug}`} cohort={cohort} onCandidates={() => { reload(); reloadDash() }} flash={flash} />
          <InterviewsCard key={`iv-${cohort.slug}`} cohort={cohort} onChanged={() => { reload(); reloadDash() }} flash={flash} />
          <QuestionList key={`q-${cohort.slug}`} cohort={cohort} criteria={criteria} scale={scale} reloadCohorts={reload} flash={flash} />
          <CloseCard key={`close-${cohort.slug}`} cohort={cohort} onChanged={() => { reload(); reloadDash() }} flash={flash} />
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

// Which staff interview this cohort: only they see it on the dashboard and
// score its candidates.
function PanelCard({ cohort, onSaved, flash }) {
  const [staff, setStaff] = useState(null)
  const [picked, setPicked] = useState(new Set())
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    api.admin.panel(cohort.slug)
      .then((r) => { setStaff(r.staff); setPicked(new Set(r.staff.filter((x) => x.on_panel).map((x) => x.id))) })
      .catch(() => {})
  }, [cohort.slug])
  if (!staff) return <div className="card card-pad"><div className="spin" /></div>

  const before = new Set(staff.filter((x) => x.on_panel).map((x) => x.id))
  const changed = picked.size !== before.size || [...picked].some((id) => !before.has(id))
  const toggle = (id) => setPicked((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n })
  const save = async () => {
    setBusy(true)
    try {
      await api.admin.savePanel(cohort.slug, [...picked])
      setStaff((list) => list.map((x) => ({ ...x, on_panel: picked.has(x.id) })))
      onSaved(); flash('Interview panel saved')
    } catch { flash('Could not save the panel') } finally { setBusy(false) }
  }

  return (
    <div className="card card-pad">
      <span className="card-title"><Users2 size={13} style={{ verticalAlign: '-2px', marginRight: 6 }} />Interview panel · {picked.size}</span>
      <p style={{ fontSize: 12, color: 'var(--color-cream-muted)', margin: '8px 0 14px', lineHeight: 1.6 }}>
        Only the people ticked here see this cohort on their dashboard, open its candidates and score them. Add new panel members under Access &amp; Invites first.
      </p>
      {staff.length === 0 && <p style={{ fontSize: 12, color: 'var(--color-cream-muted)', fontStyle: 'italic' }}>No admin or panel accounts yet.</p>}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {staff.map((x) => (
          <label key={x.id} style={{
            display: 'flex', alignItems: 'center', gap: 10, margin: 0, cursor: 'pointer', textTransform: 'none', letterSpacing: 0,
            padding: '0.55rem 0.75rem', border: '1px solid var(--color-border-green)', borderRadius: 'var(--radius-sm)',
            background: picked.has(x.id) ? 'var(--color-gold-faint)' : 'transparent',
          }}>
            <input type="checkbox" checked={picked.has(x.id)} onChange={() => toggle(x.id)} style={{ width: 15, height: 15, flexShrink: 0 }} />
            <span style={{ minWidth: 0 }}>
              <span style={{ display: 'block', fontSize: 12.5, color: 'var(--color-cream)' }}>{x.display_name || x.email}</span>
              <span style={{ display: 'block', fontSize: 10.5, color: 'var(--color-cream-muted)' }} className="break-all">{x.role === 'admin' ? 'Admin' : 'Panel'} · {x.email}</span>
            </span>
          </label>
        ))}
      </div>
      <button className="btn-gold btn-sm" style={{ marginTop: 14 }} disabled={busy || !changed} onClick={save}>{busy ? 'Saving…' : 'Save panel'}</button>
    </div>
  )
}

// <input type="datetime-local"> wants local wall-clock time without a zone.
const toLocalInput = (iso) => {
  if (!iso) return ''
  const d = new Date(iso); const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}
const fmtAgo = (iso) => new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(iso))

// Interview slots per candidate, and the calendar invitations that go out to
// the panel (and, if asked, the candidates).
function InterviewsCard({ cohort, onChanged, flash }) {
  const [d, setD] = useState(null)
  const [loc, setLoc] = useState('')
  const [edits, setEdits] = useState({}) // slug -> { at, minutes, location }
  const [busy, setBusy] = useState('')
  const [includeCandidate, setIncludeCandidate] = useState(false)
  const load = () => api.admin.interviews(cohort.slug).then((r) => { setD(r); setLoc(r.cohort.interview_location || ''); setEdits({}) }).catch(() => flash('Could not load interviews'))
  useEffect(() => { api.admin.interviews(cohort.slug).then((r) => { setD(r); setLoc(r.cohort.interview_location || '') }).catch(() => {}) }, [cohort.slug])
  if (!d) return <div className="card card-pad"><div className="spin" /></div>

  const scheduled = d.candidates.filter((c) => c.interview_at)
  const edit = (slug, patch) => setEdits((e) => ({ ...e, [slug]: { ...(e[slug] || {}), ...patch } }))
  const valueOf = (c) => ({
    at: edits[c.slug]?.at ?? toLocalInput(c.interview_at),
    minutes: edits[c.slug]?.minutes ?? String(c.interview_minutes || 45),
    location: edits[c.slug]?.location ?? (c.interview_location || ''),
  })
  const saveSlot = async (c) => {
    const v = valueOf(c)
    setBusy(c.slug)
    try {
      await api.admin.setInterview(c.slug, { interviewAt: v.at ? new Date(v.at).toISOString() : null, minutes: Number(v.minutes), location: v.location })
      await load(); onChanged(); flash(v.at ? `Slot saved for ${c.name}` : `Slot cleared for ${c.name}`)
    } catch (e) { flash(e.message || 'Could not save the slot') } finally { setBusy('') }
  }
  const saveLocation = async () => {
    setBusy('loc')
    try { await api.admin.setInterviewLocation(cohort.slug, loc); await load(); flash('Default venue saved') } catch { flash('Could not save') } finally { setBusy('') }
  }
  const send = async (slugs) => {
    setBusy('send')
    try {
      const r = await api.admin.sendInvites(cohort.slug, { candidateSlugs: slugs, includeCandidate })
      await load()
      flash(`${r.sent} invitation${r.sent === 1 ? '' : 's'} sent for ${r.candidates} interview${r.candidates === 1 ? '' : 's'}${r.failed ? ` · ${r.failed} failed` : ''}`)
    } catch (e) { flash(e.message || 'Could not send invitations') } finally { setBusy('') }
  }
  const cancel = async (c) => {
    if (!confirm(`Cancel ${c.name}’s interview?${c.invites_sent_at ? ' A cancellation goes to everyone who was invited.' : ''}`)) return
    setBusy(c.slug)
    try { const r = await api.admin.cancelInterview(c.slug); await load(); onChanged(); flash(r.cancelled ? `Cancelled · ${r.cancelled} notified` : 'Slot cleared') }
    catch (e) { flash(e.message || 'Could not cancel') } finally { setBusy('') }
  }

  return (
    <div className="card">
      <div className="card-pad card-hairline" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span className="card-title"><CalendarDays size={13} style={{ verticalAlign: '-2px', marginRight: 6 }} />Interviews · {scheduled.length} of {d.candidates.length} scheduled</span>
        <span className="tag">{d.panel.length} on the panel{d.smtp ? '' : ' · email not set up'}</span>
      </div>
      <div className="card-pad" style={{ display: 'grid', gap: 14 }}>
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 items-end">
          <div><label>Default venue or meeting link</label><input type="text" value={loc} onChange={(e) => setLoc(e.target.value)} placeholder="e.g. Ninani House, Accra · or a video-call link" /></div>
          <button className="btn-ghost btn-sm" disabled={busy === 'loc' || loc === (d.cohort.interview_location || '')} onClick={saveLocation}>Save venue</button>
        </div>

        {d.candidates.length === 0 && <p style={{ fontSize: 12, color: 'var(--color-cream-muted)', fontStyle: 'italic' }}>Upload CVs first; candidates appear here once they’re in the cohort.</p>}
        {d.candidates.map((c) => {
          const v = valueOf(c)
          const changed = !!edits[c.slug]
          const inv = c.last_invite
          return (
            <div key={c.slug} style={{ borderLeft: '2px solid var(--color-border-green)', paddingLeft: 12, display: 'grid', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ fontSize: 13, color: 'var(--color-cream)' }}>{c.name}{!c.email && <span className="tag" style={{ marginLeft: 8, color: 'var(--color-error)' }}>no email</span>}</span>
                <span style={{ fontSize: 11, color: inv?.error ? 'var(--color-error)' : 'var(--color-cream-muted)' }}>
                  {c.invites_sent_at ? `Invitations sent ${fmtAgo(c.invites_sent_at)}` : c.interview_at ? 'Not sent yet' : ''}
                  {inv?.error && ` · last send failed: ${inv.error}`}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-[1.3fr_0.6fr_1.4fr_auto_auto] gap-2 items-end">
                <div><label>Date &amp; time</label><input type="datetime-local" value={v.at} onChange={(e) => edit(c.slug, { at: e.target.value })} /></div>
                <div><label>Minutes</label><input type="number" min="10" max="240" step="5" value={v.minutes} onChange={(e) => edit(c.slug, { minutes: e.target.value })} /></div>
                <div className="col-span-2 sm:col-span-1"><label>Venue (if different)</label><input type="text" value={v.location} onChange={(e) => edit(c.slug, { location: e.target.value })} placeholder={d.cohort.interview_location || '—'} /></div>
                <button className="btn-gold btn-sm" disabled={!!busy || !changed} onClick={() => saveSlot(c)}>{busy === c.slug ? '…' : 'Save'}</button>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button className="btn-ghost btn-sm" disabled={!!busy || !c.interview_at || changed || !d.smtp} onClick={() => send([c.slug])} title="Email the calendar invitation for this interview"><Send size={12} /></button>
                  <button className="btn-ghost btn-sm" disabled={!!busy || !c.interview_at} onClick={() => cancel(c)} title="Cancel this interview" style={{ borderColor: 'rgba(232,92,92,0.3)' }}><X size={12} style={{ color: 'var(--color-error)' }} /></button>
                </div>
              </div>
            </div>
          )
        })}

        {d.candidates.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', paddingTop: 6, borderTop: '1px solid var(--color-border-green)' }}>
            <button className="btn-gold btn-sm" disabled={!!busy || !scheduled.length || !d.smtp} onClick={() => send([])}>
              <Send size={13} /> {busy === 'send' ? 'Sending…' : `Send invitations for all ${scheduled.length} scheduled`}
            </button>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, margin: 0, cursor: 'pointer', textTransform: 'none', letterSpacing: 0, fontSize: 11.5, color: 'var(--color-cream)' }}>
              <input type="checkbox" checked={includeCandidate} onChange={(e) => setIncludeCandidate(e.target.checked)} style={{ width: 14, height: 14 }} /> Also invite the candidates
            </label>
            <span style={{ fontSize: 11, color: 'var(--color-cream-muted)' }}>
              {d.smtp ? 'Each panel member gets an email with a calendar invitation (.ics) that adds the interview to Outlook or Google Calendar. Sending again updates the existing entry.' : 'Set up email under Settings to send invitations.'}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

// Close the gate: every candidate needs a decision, then scores lock and each
// candidate is emailed their outcome with a sign-in link.
function CloseCard({ cohort, onChanged, flash }) {
  const [d, setD] = useState(null)
  const [notify, setNotify] = useState(true)
  const [busy, setBusy] = useState(false)
  const [log, setLog] = useState(null)
  const load = () => Promise.all([api.admin.interviews(cohort.slug), api.admin.notifications(cohort.slug)])
    .then(([iv, n]) => { setD(iv); setLog(n.notifications.filter((x) => x.kind === 'results')) }).catch(() => {})
  useEffect(() => { load() }, [cohort.slug]) // eslint-disable-line react-hooks/exhaustive-deps
  if (!d) return <div className="card card-pad"><div className="spin" /></div>

  const closed = !!d.cohort.closed_at
  const undecided = d.undecided
  const withEmail = d.candidates.filter((c) => c.email).length
  const failed = d.candidates.filter((c) => c.email && !c.result_sent_at)

  const close = async () => {
    const msg = notify
      ? `Close ${cohort.name}?\n\nScores become final, and ${withEmail} candidate${withEmail === 1 ? '' : 's'} will be emailed their outcome with a link to their feedback. This can’t be un-sent.`
      : `Close ${cohort.name} without emailing anyone?\n\nScores become final and candidates who sign in will see their outcome.`
    if (!confirm(msg)) return
    setBusy(true)
    try {
      const r = await api.admin.closeCohort(cohort.slug, { notify })
      await load(); onChanged()
      flash(notify ? `Closed · ${r.notified} emailed${r.failed ? ` · ${r.failed} failed` : ''}${r.skipped ? ` · ${r.skipped} without email` : ''}` : 'Cohort closed')
    } catch (e) { flash(e.message || 'Could not close the cohort') } finally { setBusy(false) }
  }
  const reopen = async () => {
    if (!confirm(`Reopen ${cohort.name}? Candidates will stop seeing their outcome until it’s closed again, and scoring unlocks.`)) return
    setBusy(true)
    try { await api.admin.reopenCohort(cohort.slug); await load(); onChanged(); flash('Cohort reopened') } catch { flash('Could not reopen') } finally { setBusy(false) }
  }
  const resend = async () => {
    setBusy(true)
    try { const r = await api.admin.sendResults(cohort.slug, { candidateSlugs: failed.map((c) => c.slug) }); await load(); flash(`${r.notified} emailed${r.failed ? ` · ${r.failed} failed` : ''}`) }
    catch (e) { flash(e.message || 'Could not send') } finally { setBusy(false) }
  }

  return (
    <div className="card card-pad" style={{ borderColor: closed ? 'rgba(92,184,120,0.35)' : undefined }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span className="card-title">{closed ? <Lock size={13} style={{ verticalAlign: '-2px', marginRight: 6 }} /> : <LockOpen size={13} style={{ verticalAlign: '-2px', marginRight: 6 }} />}{closed ? 'Cohort closed' : 'Close the cohort'}</span>
        {closed
          ? <span className="chip chip-selected"><span className="dot" />Closed {fmtAgo(d.cohort.closed_at)}</span>
          : <span className="chip chip-review"><span className="dot" />{undecided.length ? `${undecided.length} undecided` : 'Ready to close'}</span>}
      </div>
      {closed ? (
        <>
          <p style={{ fontSize: 12.5, color: 'var(--color-cream-muted)', margin: '10px 0 0', lineHeight: 1.6 }}>
            Scores are final. Candidates who sign in see their outcome, published feedback and CV summary.
            {' '}{d.candidates.filter((c) => c.result_sent_at).length} of {withEmail} candidates have been emailed their outcome.
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14 }}>
            {failed.length > 0 && d.smtp && <button className="btn-gold btn-sm" disabled={busy} onClick={resend}><Send size={12} /> Email the {failed.length} not yet sent</button>}
            <button className="btn-ghost btn-sm" disabled={busy} onClick={reopen}><LockOpen size={12} /> Reopen</button>
          </div>
        </>
      ) : (
        <>
          <p style={{ fontSize: 12.5, color: 'var(--color-cream-muted)', margin: '10px 0 0', lineHeight: 1.6 }}>
            Closing locks every score and releases results: candidates can then see their outcome, published feedback and how the panel read their CV.
            Before closing, set a <strong style={{ color: 'var(--color-cream)' }}>Decision Status</strong> for every candidate under Candidate Feedback and publish the feedback you want them to see.
          </p>
          {undecided.length > 0 && <p style={{ fontSize: 12, color: 'var(--color-gold)', marginTop: 8 }}>Still undecided: {undecided.join(', ')}.</p>}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginTop: 14 }}>
            <button className="btn-gold btn-sm" disabled={busy || !d.candidates.length || undecided.length > 0 || (notify && !d.smtp)} onClick={close}><Lock size={12} /> {busy ? 'Closing…' : notify ? 'Close & email outcomes' : 'Close'}</button>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, margin: 0, cursor: 'pointer', textTransform: 'none', letterSpacing: 0, fontSize: 11.5, color: 'var(--color-cream)' }}>
              <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} style={{ width: 14, height: 14 }} /> Email every candidate their outcome
            </label>
            {notify && !d.smtp && <span style={{ fontSize: 11, color: 'var(--color-gold)' }}>Set up email under Settings first.</span>}
          </div>
        </>
      )}
      {log && log.length > 0 && (
        <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--color-border-green)' }}>
          <span className="portal-eyebrow">Outcome emails</span>
          <div style={{ display: 'grid', gap: 4, marginTop: 8 }}>
            {log.slice(0, 12).map((n) => (
              <div key={n.id} style={{ fontSize: 11.5, color: n.delivered ? 'var(--color-cream-muted)' : 'var(--color-error)' }}>
                {fmtAgo(n.created_at)} · {n.candidate_name || n.recipient} · {n.delivered ? 'sent' : `failed${n.error ? `: ${n.error}` : ''}`}
              </div>
            ))}
          </div>
        </div>
      )}
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
        <p style={{ fontSize: 12, color: 'var(--color-cream-muted)', lineHeight: 1.6, flex: '1 1 320px', margin: 0 }}>
          Panel members score every item below from 1 to {scale} on each candidate’s file. A dimension’s score is the average of its items, so the number of questions doesn’t change its weight. Panel members can also add questions from a candidate’s file.
        </p>
        <RubricImport cohort={cohort} criteria={criteria} onImported={changed} flash={flash} />
      </div>
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

// Pull a role's rubric from RiteVizor: each dimension becomes a question, with
// the band's anchor as scoring guidance.
function RubricImport({ cohort, criteria, onImported, flash }) {
  const [open, setOpen] = useState(false)
  const [rubrics, setRubrics] = useState(null)
  const [err, setErr] = useState('')
  const [slug, setSlug] = useState('')
  const [detail, setDetail] = useState(null)
  const [band, setBand] = useState('')
  const [target, setTarget] = useState('technical')
  const [busy, setBusy] = useState(false)

  const start = async () => {
    setOpen(true); setErr('')
    if (rubrics) return
    try { const r = await api.admin.rubrics(); setRubrics(r.rubrics) } catch (e) { setErr(e.message || 'Could not reach RiteVizor.') }
  }
  const choose = async (s) => {
    setSlug(s); setDetail(null); setBand('')
    if (!s) return
    try {
      const r = await api.admin.rubric(s)
      setDetail(r)
      setBand(r.bands.length ? String(r.bands[0].level) : '')
      setTarget(r.isBehavioural ? 'behavioural' : criteria.some((c) => c.key === 'technical') ? 'technical' : criteria[0]?.key)
    } catch (e) { setErr(e.message || 'Could not read that rubric.') }
  }
  const run = async () => {
    setBusy(true); setErr('')
    try {
      const r = await api.admin.importRubric(cohort.slug, { rubricSlug: slug, bandLevel: Number(band), criterionKey: target })
      flash(`${r.added} question${r.added === 1 ? '' : 's'} imported from ${r.rubric}${r.skipped ? ` · ${r.skipped} already there` : ''}`)
      setOpen(false); onImported()
    } catch (e) { setErr(e.message || 'Import failed.') } finally { setBusy(false) }
  }

  if (!open) return <button className="btn-ghost btn-sm" onClick={start}><Download size={13} /> Import from RiteVizor</button>
  const notConfigured = /Settings first/.test(err)
  return (
    <div className="card card-pad" style={{ flex: '1 1 100%', borderColor: 'rgba(201,168,76,0.35)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <span className="card-title"><Download size={13} style={{ verticalAlign: '-2px', marginRight: 6 }} />Import questions from a RiteVizor rubric</span>
        <button className="btn-ghost btn-sm" onClick={() => setOpen(false)}><X size={12} /></button>
      </div>
      {err && <p style={{ fontSize: 12, color: 'var(--color-error)', marginTop: 10 }}>{err}{notConfigured && <> See <strong>Settings → RiteVizor</strong>.</>}</p>}
      {rubrics && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3" style={{ marginTop: 12 }}>
          <div>
            <label>Rubric</label>
            <select value={slug} onChange={(e) => choose(e.target.value)}>
              <option value="">Choose a rubric…</option>
              {rubrics.map((r) => <option key={r.slug} value={r.slug}>{r.name}{r.isBehavioural ? ' (behavioural)' : r.subDiscipline ? ` · ${r.subDiscipline.name}` : ''} · {r.dimensionCount} dimensions</option>)}
            </select>
          </div>
          <div>
            <label>Band the role sits at</label>
            <select value={band} onChange={(e) => setBand(e.target.value)} disabled={!detail}>
              {!detail && <option value="">—</option>}
              {detail?.bands.map((b) => <option key={b.level} value={b.level}>{b.name}</option>)}
            </select>
          </div>
          <div>
            <label>Add under</label>
            <select value={target} onChange={(e) => setTarget(e.target.value)}>
              {criteria.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
            </select>
          </div>
        </div>
      )}
      {detail && (
        <div style={{ marginTop: 12 }}>
          <p style={{ fontSize: 11.5, color: 'var(--color-cream-muted)', lineHeight: 1.6 }}>
            {detail.name} · {detail.versionLabel}. Each dimension becomes one question; its definition and the chosen band’s anchor are shown to the panel as “what a strong answer shows”. Dimensions already imported here are skipped.
          </p>
          <ul style={{ margin: '8px 0 0', paddingLeft: 18, fontSize: 12, color: 'var(--color-cream)', lineHeight: 1.7 }}>
            {detail.dimensions.map((d) => <li key={d.name}>{d.name}</li>)}
          </ul>
          <button className="btn-gold btn-sm" style={{ marginTop: 12 }} disabled={busy || !band} onClick={run}><Download size={12} /> {busy ? 'Importing…' : `Import ${detail.dimensions.length} questions`}</button>
        </div>
      )}
      {!rubrics && !err && <p style={{ fontSize: 12, color: 'var(--color-cream-muted)', marginTop: 10 }}>Loading rubrics…</p>}
    </div>
  )
}

function QuestionRow({ q, index, last, onMove, onChanged, flash }) {
  const [editing, setEditing] = useState(false)
  const [body, setBody] = useState(q.body)
  const [guidance, setGuidance] = useState(q.guidance || '')
  const [showGuidance, setShowGuidance] = useState(false)
  const save = async () => {
    if (!body.trim()) return
    try { await api.admin.updateQuestion(q.id, { body: body.trim(), guidance }); setEditing(false); onChanged(); flash('Question updated') }
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
        <div>
          <label>What a strong answer shows (optional, shown to the panel)</label>
          <textarea className="portal-input" value={guidance} onChange={(e) => setGuidance(e.target.value)} style={{ minHeight: 60 }} placeholder="Guidance for scoring this question…" />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-gold btn-sm" onClick={save} disabled={!body.trim()}><Check size={13} /> Save</button>
          <button className="btn-ghost btn-sm" onClick={() => { setBody(q.body); setGuidance(q.guidance || ''); setEditing(false) }}><X size={13} /> Cancel</button>
        </div>
      </div>
    )
  }
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'flex-start', borderLeft: '2px solid var(--color-border-green)', paddingLeft: 12 }}>
      <div style={{ flex: '1 1 240px', minWidth: 0 }}>
        <p style={{ fontSize: 13, color: 'var(--color-cream)', lineHeight: 1.6, margin: 0 }}>
          <span style={{ color: 'var(--color-gold-muted)', marginRight: 6 }}>{index + 1}.</span>{q.body}
          {q.source === 'ritevizor' && <span className="tag" style={{ marginLeft: 8 }}>RiteVizor</span>}
          {q.scores > 0 && <span className="tag" style={{ marginLeft: 8 }}>{q.scores} score{q.scores === 1 ? '' : 's'}</span>}
        </p>
        {(q.guidance || q.created_by_name) && (
          <div style={{ fontSize: 11, color: 'var(--color-cream-muted)', marginTop: 3, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {q.guidance && <button type="button" onClick={() => setShowGuidance((s) => !s)} style={{ background: 'none', border: 'none', padding: 0, fontSize: 11, color: 'var(--color-gold)', cursor: 'pointer' }}>{showGuidance ? '▾' : '▸'} What a strong answer shows</button>}
            {q.created_by_name && <span>Added by {q.created_by_name}</span>}
          </div>
        )}
        {showGuidance && q.guidance && <p className="prose" style={{ fontSize: 12, marginTop: 6, paddingLeft: 10, borderLeft: '2px solid var(--color-gold-faint)' }}>{q.guidance}</p>}
      </div>
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
      <RitevizorCard rv={data.ritevizor} onSaved={saved} flash={flash} />
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

function RitevizorCard({ rv, onSaved, flash }) {
  const [url, setUrl] = useState(rv.url || '')
  const [key, setKey] = useState('')
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState('')
  const hasKey = !!(key.trim() || rv.keyMask)
  const test = async () => {
    setBusy('test')
    try { const r = await api.admin.testRitevizor({ url, apiKey: key }); flash(`Connected · ${r.count} rubric${r.count === 1 ? '' : 's'} available`) }
    catch (e) { flash(e.message || 'Test failed') } finally { setBusy('') }
  }
  const save = async () => {
    setBusy('save')
    try { await api.admin.saveRitevizor({ url, apiKey: key }); setKey(''); await onSaved(); flash('RiteVizor settings saved') }
    catch (e) { flash(e.message || 'Could not save') } finally { setBusy('') }
  }
  const removeKey = async () => {
    if (!confirm('Remove the saved RiteVizor key?')) return
    await api.admin.saveRitevizor({ removeKey: true }); await onSaved(); flash('Key removed')
  }
  return (
    <div className="card card-pad">
      <span className="card-title"><Download size={13} style={{ verticalAlign: '-2px', marginRight: 6 }} />RiteVizor rubrics</span>
      <p style={{ fontSize: 12, color: rv.source === 'none' ? 'var(--color-gold)' : 'var(--color-cream-muted)', margin: '8px 0 14px', lineHeight: 1.6 }}>
        {rv.source === 'none' ? 'Not connected: add the API key to import a role’s rubric as interview questions.'
          : <>Connected to <strong style={{ color: 'var(--color-cream)' }}>{rv.url}</strong>{rv.source === 'env' ? ' (from the server’s environment)' : ''}.</>}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_1.2fr] gap-3">
        <div><label>RiteVizor API address</label><input type="text" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://api.ritevizor.com" /></div>
        <div>
          <label>API key (KATANA_API_KEY on RiteVizor)</label>
          <div style={{ display: 'flex', gap: 6 }}>
            <input type={show ? 'text' : 'password'} value={key} onChange={(e) => setKey(e.target.value)} autoComplete="new-password" placeholder={rv.keyMask ? `${rv.keyMask} saved${rv.keyFromEnv ? ' (env)' : ''} — leave blank to keep` : ''} />
            <button type="button" className="btn-ghost btn-sm" onClick={() => setShow((s) => !s)} title={show ? 'Hide' : 'Show'}>{show ? <EyeOff size={12} /> : <Eye size={12} />}</button>
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14 }}>
        <button className="btn-ghost btn-sm" disabled={!!busy || !hasKey} onClick={test}>{busy === 'test' ? 'Testing…' : 'Test connection'}</button>
        <button className="btn-gold btn-sm" disabled={!!busy || !hasKey} onClick={save}>{busy === 'save' ? 'Saving…' : 'Save'}</button>
        {rv.keyMask && !rv.keyFromEnv && <button className="btn-ghost btn-sm" disabled={!!busy} onClick={removeKey}>Remove key</button>}
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
