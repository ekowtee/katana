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
    const err = new Error(data?.message || data?.error || `HTTP ${res.status}`)
    err.status = res.status
    err.code = data?.error
    throw err
  }
  return data
}

// A file sent as the raw request body (PDF CVs); the name goes in X-Filename.
async function upload(path, file) {
  const res = await fetch(`/api${path}`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': file.type || 'application/pdf', 'X-Filename': encodeURIComponent(file.name) },
    body: file,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(data?.error || `HTTP ${res.status}`)
    err.status = res.status
    err.code = data?.error || (res.status === 413 ? 'too_large' : undefined)
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
  assessment: (slug) => req(`/candidates/${slug}/assessment`),
  saveAssessment: (slug, payload) => req(`/candidates/${slug}/assessment`, { method: 'PUT', body: payload }),
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
    cohorts: () => req('/admin/cohorts'),
    createCohort: (payload) => req('/admin/cohorts', { method: 'POST', body: payload }),
    updateCohort: (slug, payload) => req(`/admin/cohorts/${slug}`, { method: 'PATCH', body: payload }),
    questions: (cohort) => req(`/admin/cohorts/${cohort}/questions`),
    addQuestion: (cohort, payload) => req(`/admin/cohorts/${cohort}/questions`, { method: 'POST', body: payload }),
    updateQuestion: (id, payload) => req(`/admin/questions/${id}`, { method: 'PATCH', body: payload }),
    deleteQuestion: (id) => req(`/admin/questions/${id}`, { method: 'DELETE' }),
    orderQuestions: (cohort, ids) => req(`/admin/cohorts/${cohort}/questions/order`, { method: 'POST', body: { ids } }),
    cvs: (cohort) => req(`/admin/cohorts/${cohort}/cvs`),
    uploadCv: (cohort, file) => upload(`/admin/cohorts/${cohort}/cvs`, file),
    processCv: (id) => req(`/admin/cvs/${id}/process`, { method: 'POST' }),
    deleteCv: (id) => req(`/admin/cvs/${id}`, { method: 'DELETE' }),
    integrations: () => req('/admin/integrations'),
    saveSmtp: (payload) => req('/admin/integrations/smtp', { method: 'PUT', body: payload }),
    testSmtp: () => req('/admin/integrations/smtp/test', { method: 'POST' }),
    saveAi: (payload) => req('/admin/integrations/ai', { method: 'PUT', body: payload }),
    testAi: (payload) => req('/admin/integrations/ai/test', { method: 'POST', body: payload }),
  },
}
