// Display helpers for cohorts (period is the interview month, 'YYYY-MM').
export const monthLabel = (period) =>
  period ? new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' }).format(new Date(`${period}-01T12:00:00`)) : 'No month set'

export const cohortLabel = (c) => `${c.name}${c.role ? ` — ${c.role}` : ''}`
