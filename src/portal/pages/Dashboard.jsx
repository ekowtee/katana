import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell as BarCell,
} from 'recharts'
import { Users, BarChart3, CheckCircle2, Gauge } from 'lucide-react'
import { api } from '../lib/api'
import { StatusChip, Loader, fmtPct, critShort, STATUS_LABEL } from '../components/ui'

const STATUS_ORDER = ['selected', 'discuss', 'reserve', 'not_selected', 'not_assessed', 'review']
const STATUS_COLOR = {
  selected: '#6FD08C', discuss: '#7EC8E3', reserve: '#E0C060',
  not_selected: '#E88B8B', not_assessed: '#8B97A0', review: '#8B97A0',
}
const GROUP_LABEL = {
  selected: 'Selected · First Cohort', discuss: 'For Discussion', reserve: 'Reserve & Training',
  not_selected: 'Not Selected', not_assessed: 'Not Assessed', review: 'Under Review',
}
const CRIT_COLORS = ['#C9A84C', '#D9C06A', '#9FBE86', '#6FA8B5', '#C08F6F']

export default function Dashboard() {
  const [data, setData] = useState(null)
  const [err, setErr] = useState('')
  const navigate = useNavigate()

  useEffect(() => { api.dashboard().then(setData).catch(() => setErr('Could not load dashboard.')) }, [])
  if (err) return <p style={{ color: 'var(--color-error)' }}>{err}</p>
  if (!data) return <Loader label="Loading dashboard" />

  const { candidates, aggregate } = data
  // node-postgres returns numeric columns as strings — coerce up front.
  const num = (v) => (v == null ? null : Number(v))
  const scored = candidates.filter((c) => c.scored && c.score_pct != null).map((c) => ({ ...c, score_pct: num(c.score_pct) }))
  const selectedCount = candidates.filter((c) => c.status === 'selected').length
  const cohortAvg = scored.length ? scored.reduce((s, c) => s + c.score_pct, 0) / scored.length : 0

  // group by status, preserving the backend's status→score ordering
  const groups = STATUS_ORDER.map((st) => ({ status: st, rows: candidates.filter((c) => c.status === st) })).filter((g) => g.rows.length)

  // outcome donut
  const donut = groups.map((g) => ({ name: STATUS_LABEL[g.status], value: g.rows.length, color: STATUS_COLOR[g.status] }))

  // score distribution (scored only)
  const BANDS = [[0, 0.6, '<60%'], [0.6, 0.7, '60–70'], [0.7, 0.8, '70–80'], [0.8, 0.9, '80–90'], [0.9, 1.01, '90%+']]
  const dist = BANDS.map(([lo, hi, label]) => ({
    band: label,
    count: scored.filter((c) => c.score_pct >= lo && c.score_pct < hi).length,
  }))

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <p className="portal-eyebrow">First Cohort · Interview Window 10–12 June 2026</p>
      <h1 className="portal-h1">Selection <span className="accent">Dashboard</span></h1>
      <p className="portal-lede">
        A high-level read of the whole exercise — outcomes, where the cohort was strong, how scores are
        distributed, and the full ranking grouped by decision. Click any candidate for their full file.
      </p>

      {/* Stat band */}
      <div className="grid-stats" style={{ marginTop: '1.75rem' }}>
        <Stat icon={<Users size={15} />} num={candidates.length} label="Candidates" />
        <Stat icon={<BarChart3 size={15} />} num={scored.length} label="Interviewed & Scored" />
        <Stat icon={<CheckCircle2 size={15} />} num={selectedCount} label="Selected" gold />
        <Stat icon={<Gauge size={15} />} num={fmtPct(cohortAvg)} label="Cohort Avg Score" gold />
      </div>

      {/* Analytics row */}
      <div className="analytics-grid" style={{ marginTop: '1.25rem' }}>
        {/* Outcome donut */}
        <div className="card card-pad">
          <span className="card-title">Outcome Breakdown</span>
          <p className="muted-note">Distribution of panel decisions across all {candidates.length} candidates.</p>
          <div style={{ width: '100%', height: 190, position: 'relative', marginTop: 6 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={donut} dataKey="value" nameKey="name" innerRadius="62%" outerRadius="100%" paddingAngle={2} stroke="none">
                  {donut.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <Tooltip contentStyle={tipStyle} formatter={(v, n) => [`${v}`, n]} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
              <div style={{ fontFamily: 'Funnel Display, serif', fontSize: '1.7rem', color: 'var(--color-cream)', lineHeight: 1 }}>{selectedCount}</div>
              <div style={{ fontSize: 8.5, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--color-cream-muted)', marginTop: 3 }}>Selected</div>
            </div>
          </div>
          <div style={{ display: 'grid', gap: 6, marginTop: 10 }}>
            {donut.map((d) => (
              <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11 }}>
                <span style={{ width: 9, height: 9, borderRadius: 2, background: d.color }} />
                <span style={{ flex: 1, color: 'var(--color-cream-muted)' }}>{d.name}</span>
                <span style={{ color: 'var(--color-cream)' }}>{d.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Criteria performance with spread */}
        <div className="card card-pad">
          <span className="card-title">Criteria Performance</span>
          <p className="muted-note">Cohort average per criterion (% of available points), with the min–max spread.</p>
          <div style={{ display: 'grid', gap: 16, marginTop: 14 }}>
            {aggregate.map((a, i) => (
              <div key={a.key}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 6 }}>
                  <span style={{ color: 'var(--color-cream)' }}>{critShort(a.label)}</span>
                  <span style={{ color: 'var(--color-cream-muted)' }}>
                    <span style={{ opacity: 0.55 }}>{a.minPct != null ? Math.round(a.minPct) : '–'}–{a.maxPct != null ? Math.round(a.maxPct) : '–'}%</span>
                    {'  '}<strong style={{ color: CRIT_COLORS[i % CRIT_COLORS.length] }}>{a.avgPct != null ? Math.round(a.avgPct) + '%' : '—'}</strong>
                  </span>
                </div>
                <div className="range-track">
                  <span className="range-span" style={{ left: `${a.minPct || 0}%`, width: `${Math.max(0, (a.maxPct || 0) - (a.minPct || 0))}%`, background: CRIT_COLORS[i % CRIT_COLORS.length] }} />
                  <span className="range-avg" style={{ left: `${a.avgPct || 0}%`, background: CRIT_COLORS[i % CRIT_COLORS.length] }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Score distribution */}
        <div className="card card-pad">
          <span className="card-title">Score Distribution</span>
          <p className="muted-note">How the {scored.length} scored candidates cluster by total attainment.</p>
          <div style={{ width: '100%', height: 200, marginTop: 10 }}>
            <ResponsiveContainer>
              <BarChart data={dist} margin={{ top: 6, right: 6, left: -22, bottom: 0 }}>
                <XAxis dataKey="band" tick={{ fill: '#C8C2B4', fontSize: 10, fontFamily: 'Lexend' }} axisLine={{ stroke: '#264A35' }} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fill: '#5d6b60', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: 'rgba(201,168,76,0.06)' }} contentStyle={tipStyle} formatter={(v) => [`${v} candidate${v === 1 ? '' : 's'}`, 'Count']} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={46}>
                  {dist.map((d, i) => <BarCell key={i} fill={i >= 2 ? '#C9A84C' : '#5C7A66'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Ranked, status-grouped table */}
      <div className="card" style={{ marginTop: '1.25rem' }}>
        <div className="card-pad card-hairline" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="card-title">Candidate Ranking</span>
          <span className="tag">Grouped by decision, then score</span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="rank-table">
            <thead>
              <tr>
                <th style={{ width: 56 }}>Rank</th>
                <th>Candidate</th>
                <th style={{ width: 150 }}>Score</th>
                <th style={{ width: 150 }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((g, gi) => (
                <GroupBlock key={g.status} group={g} showCutoffBefore={gi > 0 && groups[0].status === 'selected' && gi === 1}
                  onClick={(slug) => navigate(`/portal/candidate/${slug}`)} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  )
}

function GroupBlock({ group, showCutoffBefore, onClick }) {
  return (
    <>
      {showCutoffBefore && (
        <tr className="cutoff-row"><td colSpan={4}>
          <div className="cutoff-line">
            <span className="lbl">Selection Cutoff</span>
            <span className="line" />
          </div>
        </td></tr>
      )}
      <tr className="group-head">
        <td colSpan={4}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: STATUS_COLOR[group.status], display: 'inline-block', marginRight: 8 }} />
          {GROUP_LABEL[group.status]} <span style={{ opacity: 0.5 }}>· {group.rows.length}</span>
        </td>
      </tr>
      {group.rows.map((c) => (
        <tr key={c.slug} className="rank-row" onClick={() => onClick(c.slug)}>
          <td><span className={`rank-badge ${c.status === 'selected' ? 'top' : ''}`}>{c.rank ?? '–'}</span></td>
          <td>
            <div style={{ fontWeight: 500, color: 'var(--color-cream)' }}>{c.name}</div>
            <div style={{ fontSize: 11, color: 'var(--color-cream-muted)' }}>{c.category}</div>
          </td>
          <td>
            {c.score_pct != null ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div className="scorebar" style={{ flex: 1, maxWidth: 80 }}><span style={{ width: `${c.score_pct * 100}%` }} /></div>
                <span style={{ fontSize: 12, color: 'var(--color-gold)', minWidth: 50 }}>{Number(c.total_50).toFixed(1)} · {fmtPct(c.score_pct)}</span>
              </div>
            ) : <span style={{ color: 'var(--color-cream-muted)', fontSize: 12 }}>—</span>}
          </td>
          <td><StatusChip status={c.status} /></td>
        </tr>
      ))}
    </>
  )
}

function Stat({ icon, num, label, gold }) {
  return (
    <div className="stat">
      <div style={{ color: gold ? 'var(--color-gold)' : 'var(--color-cream-muted)', marginBottom: 6 }}>{icon}</div>
      <div className={`stat-num ${gold ? 'gold' : ''}`}>{num}</div>
      <div className="stat-label">{label}</div>
    </div>
  )
}

const tipStyle = { background: '#0C1E14', border: '1px solid #264A35', borderRadius: 8, fontSize: 12 }
