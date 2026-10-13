
export const STATUS_LABEL = {
  selected: 'Selected',
  reserve: 'Reserve / Train',
  discuss: 'Discuss',
  not_selected: 'Not Selected',
  not_assessed: 'Not Assessed',
  review: 'Under Review',
}

export function StatusChip({ status }) {
  const label = STATUS_LABEL[status] || status || '—'
  return (
    <span className={`chip chip-${status || 'review'}`}>
      <span className="dot" />
      {label}
    </span>
  )
}

export function Loader({ label = 'Loading' }) {
  return (
    <div className="center-screen">
      <div className="spin" />
      <p className="portal-eyebrow">{label}</p>
    </div>
  )
}

// Katana's reversed (white) artwork, for the portal's dark surfaces.
export function Brand({ small }) {
  return (
    <div className="portal-brand">
      <img src="/brand/katana-mark-reversed.png" alt="Katana" className={small ? 'pb-mark' : 'pb-mark sm:hidden'} />
      {!small && <img src="/brand/katana-logo-horizontal-reversed.png" alt="Katana" className="pb-logo hidden sm:block" />}
    </div>
  )
}

export function ScoreBar({ value, max }) {
  const pct = max ? Math.max(0, Math.min(100, (value / max) * 100)) : 0
  return (
    <div className="scorebar" title={`${value ?? '—'} / ${max}`}>
      <span style={{ width: `${pct}%` }} />
    </div>
  )
}

export const fmtPct = (p) => (p == null ? '—' : `${Math.round(p * 100)}%`)
export const critShort = (label = '') =>
  ({
    'Personality & Cultural Fit': 'Cultural Fit',
    'Critical Thinking & Creativity': 'Critical Thinking',
    'Communication & Confidence': 'Communication',
    'Commitment & Professionalism': 'Commitment',
    'Appearance & Presentation': 'Appearance',
    'Technical Competencies': 'Technical',
    'Appearance & Presence': 'Appearance',
  }[label] || label)
