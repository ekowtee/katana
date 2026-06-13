import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Sparkles, Quote as MessageSquareQuote } from 'lucide-react'
import { api } from '../lib/api'
import { Loader, critShort } from '../components/ui'
import { Brand } from '../components/ui'

const OUTCOME = {
  selected: { title: 'Congratulations — you’ve been selected', tone: '#6FD08C', blurb: 'The panel was impressed by your interview. Welcome to the First Cohort of the D.A. Twum Jnr. Fellowship.' },
  reserve: { title: 'You’ve been placed on our reserve & training track', tone: '#E0C060', blurb: 'The panel saw real promise in you. We’d love to keep developing your talent through our academy and future cohorts.' },
  discuss: { title: 'Thank you — your application is under final review', tone: '#7EC8E3', blurb: 'Your interview stood out. We’re finalising a few details and will be in touch shortly.' },
  not_selected: { title: 'Thank you for interviewing with us', tone: '#E88B8B', blurb: 'While you weren’t selected for this cohort, the panel valued your time and encourages you to stay connected.' },
  not_assessed: { title: 'Thank you for your interest', tone: '#A7B0A8', blurb: 'We were unable to complete your assessment in this round.' },
  review: { title: 'Your application is being reviewed', tone: '#A7B0A8', blurb: 'Thank you for your submission. We’ll share an update soon.' },
}

export default function MyResults() {
  const [d, setD] = useState(null)
  const [err, setErr] = useState('')

  useEffect(() => { api.myResults().then(setD).catch(() => setErr('Could not load your results.')) }, [])

  if (err) return <p style={{ color: 'var(--color-error)' }}>{err}</p>
  if (!d) return <Loader label="Loading your feedback" />

  const c = d.candidate
  const outcome = OUTCOME[c.status] || OUTCOME.review
  const overall = d.feedback.find((f) => !f.criterion_key)
  const perCriterion = d.feedback.filter((f) => f.criterion_key)
  const scoreByCrit = Object.fromEntries(d.scores.map((s) => [s.criterion_key, s]))

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      {/* Hero outcome */}
      <div className="card card-pad" style={{ overflow: 'hidden', position: 'relative' }}>
        <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(600px 240px at 100% 0%, ${outcome.tone}14, transparent 70%)`, pointerEvents: 'none' }} />
        <p className="portal-eyebrow" style={{ color: outcome.tone }}>D.A. Twum Jnr. Fellowship · First Cohort</p>
        <h1 className="portal-h1" style={{ maxWidth: '22ch' }}>{outcome.title}</h1>
        <p className="portal-lede">{outcome.blurb}</p>
        <p style={{ marginTop: 14, fontSize: 13, color: 'var(--color-cream-muted)' }}>
          Dear <strong style={{ color: 'var(--color-cream)' }}>{c.name}</strong>, below is the personalised feedback from your interview panel.
        </p>
      </div>

      {/* Overall feedback */}
      {overall?.body && (
        <div className="card card-pad" style={{ marginTop: '1.25rem' }}>
          <span className="card-title"><MessageSquareQuote size={13} style={{ verticalAlign: '-2px', marginRight: 6 }} />Panel’s Note to You</span>
          <p className="prose" style={{ marginTop: 14 }}>{overall.body}</p>
        </div>
      )}

      {/* Per-criterion feedback + score */}
      {perCriterion.length > 0 && (
        <div className="card card-pad" style={{ marginTop: '1.25rem' }}>
          <span className="card-title"><Sparkles size={13} style={{ verticalAlign: '-2px', marginRight: 6 }} />Feedback by Area</span>
          <div style={{ display: 'grid', gap: 18, marginTop: 18 }}>
            {perCriterion.map((f) => {
              const s = scoreByCrit[f.criterion_key]
              return (
                <div key={f.criterion_key}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span className="portal-eyebrow">{critShort(s?.label || f.criterion_key)}</span>
                    {s?.avg_norm != null && (
                      <span style={{ fontSize: 11, color: 'var(--color-gold)' }}>{Number(s.avg_norm).toFixed(1)} / {s.weight}</span>
                    )}
                  </div>
                  {s?.avg_norm != null && <div className="scorebar" style={{ marginBottom: 8 }}><span style={{ width: `${(s.avg_norm / s.weight) * 100}%` }} /></div>}
                  <p className="prose" style={{ fontSize: '0.88rem' }}>{f.body}</p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {!overall?.body && perCriterion.length === 0 && (
        <div className="card card-pad" style={{ marginTop: '1.25rem' }}>
          <p style={{ color: 'var(--color-cream-muted)', fontSize: 13 }}>
            Your detailed feedback is being finalised by the panel and will appear here shortly.
          </p>
        </div>
      )}

      {/* Their own submission, for reference */}
      {(c.why_fellowship || c.personal_statement) && (
        <div className="card card-pad" style={{ marginTop: '1.25rem' }}>
          <span className="card-title">Your Submission</span>
          <div style={{ display: 'grid', gap: 20, marginTop: 16 }}>
            {c.why_fellowship && <Block title="Why this Fellowship" body={c.why_fellowship} />}
            {c.career_ambitions && <Block title="Career Ambitions" body={c.career_ambitions} />}
            {c.personal_statement && <Block title="Personal Statement" body={c.personal_statement} />}
            {c.capstone && <Block title="Capstone Project" body={c.capstone} />}
          </div>
        </div>
      )}

      <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'center', opacity: 0.5 }}><Brand /></div>
    </motion.div>
  )
}

function Block({ title, body }) {
  return (
    <div>
      <div className="portal-eyebrow" style={{ marginBottom: 8 }}>{title}</div>
      <p className="prose" style={{ fontSize: '0.88rem' }}>{body}</p>
    </div>
  )
}
