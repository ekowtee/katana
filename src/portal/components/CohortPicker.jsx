import { useEffect, useMemo, useState } from 'react'
import { cohortLabel, monthLabel } from '../lib/cohorts'

// Month first, then cohort: cohorts are grouped by the month they interview
// in (cohort.period, 'YYYY-MM'), newest first. Picking a month narrows the
// cohort list and selects its first cohort; "All months" lists every cohort.

export default function CohortPicker({ cohorts, value, onChange, extra = [], describe = cohortLabel, idPrefix = 'cohort' }) {
  const months = useMemo(() => [...new Set(cohorts.map((c) => c.period || ''))], [cohorts])
  const selected = cohorts.find((c) => c.slug === value)
  const [month, setMonth] = useState(selected ? selected.period || '' : '*')
  // Follow the selection when it changes from outside (URL, a new cohort, …).
  useEffect(() => { if (selected) setMonth(selected.period || '') }, [selected?.slug]) // eslint-disable-line react-hooks/exhaustive-deps

  const shown = month === '*' ? cohorts : cohorts.filter((c) => (c.period || '') === month)
  const pickMonth = (m) => {
    setMonth(m)
    const list = m === '*' ? cohorts : cohorts.filter((c) => (c.period || '') === m)
    if (list.length && !list.some((c) => c.slug === value)) onChange(list[0].slug)
  }

  return (
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
      <div style={{ flex: '0 1 200px', minWidth: 160 }}>
        <label htmlFor={`${idPrefix}-month`}>Month</label>
        <select id={`${idPrefix}-month`} value={month} onChange={(e) => pickMonth(e.target.value)}>
          <option value="*">All months</option>
          {months.map((m) => <option key={m || 'none'} value={m}>{monthLabel(m)} · {cohorts.filter((c) => (c.period || '') === m).length}</option>)}
        </select>
      </div>
      <div style={{ flex: '1 1 340px', minWidth: 0 }}>
        <label htmlFor={`${idPrefix}-select`}>Cohort</label>
        <select id={`${idPrefix}-select`} value={value} onChange={(e) => onChange(e.target.value)}>
          {!shown.some((c) => c.slug === value) && !extra.some((x) => x.value === value) && <option value={value}>{selected ? describe(selected) : '—'}</option>}
          {shown.map((c) => <option key={c.slug} value={c.slug}>{month === '*' ? `${monthLabel(c.period)} · ` : ''}{describe(c)}</option>)}
          {extra.map((x) => <option key={`x-${x.value}`} value={x.value}>{x.label}</option>)}
        </select>
      </div>
    </div>
  )
}
