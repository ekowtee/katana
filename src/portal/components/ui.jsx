import logo from '../../assets/main_logo.png'

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

export function Brand({ small }) {
  return (
    <div className="portal-brand">
      <img src={logo} alt="D.A. Twum Jnr. Fellowship" />
      {!small && (
        <div>
          <div className="pb-title">D.A. Twum Jnr. Fellowship</div>
          <div className="pb-sub">Selection Portal</div>
        </div>
      )}
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
  }[label] || label)
