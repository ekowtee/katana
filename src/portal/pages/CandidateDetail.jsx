import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Quote, GraduationCap, Phone, Mail, MapPin, CalendarDays } from 'lucide-react'
import { api } from '../lib/api'
import { StatusChip, Loader, fmtPct, critShort } from '../components/ui'
import { useAuth } from '../lib/AuthContext'

const REC_CLASS = { SR: 'chip-selected', R: 'chip-discuss', RL: 'chip-reserve', DNR: 'chip-not_selected', NA: 'chip-review', OTHER: 'chip-review' }

export default function CandidateDetail() {
  const { slug } = useParams()
  const { account } = useAuth()
  const [d, setD] = useState(null)
  const [err, setErr] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    setD(null)
    api.candidate(slug).then(setD).catch(() => setErr('Could not load candidate.'))
  }, [slug])

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
      <button className="btn-ghost btn-sm" onClick={() => navigate('/portal')} style={{ marginBottom: '1.25rem' }}>
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
                <span className="tag">{c.category}</span>
                {c.interview_day && <span className="tag"><CalendarDays size={10} style={{ verticalAlign: '-1px', marginRight: 4 }} />{c.interview_day}</span>}
              </div>
            </div>
          </div>
          <div style={{ display: 'grid', gap: 6, marginTop: '1.1rem', fontSize: 12.5, color: 'var(--color-cream-muted)' }}>
            {c.discipline && <Meta icon={<GraduationCap size={13} />}>{c.discipline}{c.institution ? ` · ${c.institution}` : ''}</Meta>}
            {c.email && <Meta icon={<Mail size={13} />}><a href={`mailto:${c.email}`} style={{ color: 'inherit' }}>{c.email}</a></Meta>}
            {c.phone && <Meta icon={<Phone size={13} />}>{c.phone}</Meta>}
            {c.address && <Meta icon={<MapPin size={13} />}>{c.address}</Meta>}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="portal-eyebrow">Total Score</div>
          <div style={{ fontFamily: 'Funnel Display, serif', fontSize: '2.8rem', lineHeight: 1, color: 'var(--color-gold)' }}>
            {c.total_50 != null ? Number(c.total_50).toFixed(1) : '—'}<span style={{ fontSize: '1rem', color: 'var(--color-cream-muted)' }}> / 50</span>
          </div>
          <div style={{ fontSize: 13, color: 'var(--color-cream-muted)', marginTop: 4 }}>{fmtPct(c.score_pct)} attainment</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: '1.25rem', marginTop: '1.25rem' }} className="dash-grid">
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

function Meta({ icon, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ color: 'var(--color-gold-muted)' }}>{icon}</span>{children}
    </div>
  )
}
