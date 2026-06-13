import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Copy, Send, Trash2, Plus, Check, Link2, Mail, AlertTriangle, Target, Users2, MessageSquare,
} from 'lucide-react'
import { api } from '../lib/api'
import { Loader, StatusChip, STATUS_LABEL } from '../components/ui'

const TABS = [
  { key: 'access', label: 'Access & Invites', icon: Users2 },
  { key: 'feedback', label: 'Candidate Feedback', icon: MessageSquare },
  { key: 'settings', label: 'Settings', icon: Target },
]

export default function Admin() {
  const [params, setParams] = useSearchParams()
  const [tab, setTab] = useState(params.get('candidate') ? 'feedback' : 'access')
  const [overview, setOverview] = useState(null)
  const [dash, setDash] = useState(null)
  const [toast, setToast] = useState('')

  const load = () => api.admin.overview().then(setOverview)
  const reloadDash = () => api.dashboard().then(setDash)
  useEffect(() => { load(); reloadDash() }, [])

  const flash = (m) => { setToast(m); setTimeout(() => setToast(''), 2600) }

  if (!overview || !dash) return <Loader label="Loading admin" />

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <p className="portal-eyebrow">Administration</p>
      <h1 className="portal-h1">Portal <span className="accent">Control</span></h1>

      {!overview.smtpConfigured && (
        <div className="card card-pad" style={{ marginTop: '1.25rem', display: 'flex', gap: 12, alignItems: 'center', borderColor: 'rgba(224,192,96,0.4)' }}>
          <AlertTriangle size={18} style={{ color: 'var(--color-gold)' }} />
          <div style={{ fontSize: 12.5, color: 'var(--color-cream-muted)' }}>
            <strong style={{ color: 'var(--color-cream)' }}>SMTP not configured.</strong> Magic links won’t auto-send yet — use “Copy link” below and share manually. Add SMTP creds to <code>.env</code> to enable email delivery.
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
      {tab === 'feedback' && <FeedbackTab dash={dash} reloadDash={reloadDash} initialSlug={params.get('candidate')} onSelect={(s) => setParams(s ? { candidate: s } : {})} flash={flash} />}
      {tab === 'settings' && <SettingsTab overview={overview} flash={flash} />}

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
function FeedbackTab({ dash, reloadDash, initialSlug, onSelect, flash }) {
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
      <div className="card" style={{ alignSelf: 'start', maxHeight: '70vh', overflowY: 'auto' }}>
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

/* ── Settings ──────────────────────────────────────────────────────────────── */
function SettingsTab({ overview }) {
  return (
    <div className="card card-pad" style={{ maxWidth: 620 }}>
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
      <div style={{ marginTop: 18, paddingTop: 16, borderTop: '1px solid var(--color-border-green)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: overview.smtpConfigured ? 'var(--color-success)' : 'var(--color-gold)' }} />
        <span style={{ fontSize: 12.5, color: 'var(--color-cream-muted)' }}>
          Email delivery: <strong style={{ color: 'var(--color-cream)' }}>{overview.smtpConfigured ? 'SMTP configured — links send automatically' : 'Not configured — use Copy link'}</strong>
        </span>
      </div>
    </div>
  )
}
