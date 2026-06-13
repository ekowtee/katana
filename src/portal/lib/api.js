// Thin fetch wrapper for the portal API (same-origin via Vite proxy → :8787).
async function req(path, { method = 'GET', body } = {}) {
  const res = await fetch(`/api${path}`, {
    method,
    credentials: 'include',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(data?.error || `HTTP ${res.status}`)
    err.status = res.status
    err.code = data?.error
    throw err
  }
  return data
}

export const api = {
  me: () => req('/auth/me'),
  requestLink: (email) => req('/auth/request', { method: 'POST', body: { email } }),
  logout: () => req('/auth/logout', { method: 'POST' }),

  dashboard: () => req('/dashboard'),
  candidate: (slug) => req(`/candidates/${slug}`),
  myResults: () => req('/me'),

  admin: {
    overview: () => req('/admin/overview'),
    setCutoff: (cutoffRank) => req('/admin/settings', { method: 'PATCH', body: { cutoffRank } }),
    createAccount: (payload) => req('/admin/accounts', { method: 'POST', body: payload }),
    updateAccount: (id, payload) => req(`/admin/accounts/${id}`, { method: 'PATCH', body: payload }),
    deleteAccount: (id) => req(`/admin/accounts/${id}`, { method: 'DELETE' }),
    invite: (id, send = false) => req(`/admin/invite/${id}`, { method: 'POST', body: { send } }),
    getFeedback: (slug) => req(`/admin/feedback/${slug}`),
    saveFeedback: (slug, items) => req(`/admin/feedback/${slug}`, { method: 'PUT', body: { items } }),
    updateCandidate: (slug, payload) => req(`/admin/candidates/${slug}`, { method: 'PATCH', body: payload }),
  },
}
