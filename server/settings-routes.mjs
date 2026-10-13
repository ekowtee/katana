import express from 'express'
import { requireAuth } from './auth.mjs'
import { PROVIDERS, aiConfig, decrypt, encrypt, mask, readArea, smtpConfig, writeArea } from './settings.mjs'
import { sendTestEmail } from './mailer.mjs'
import { listModels } from './ai.mjs'
import { query } from './db.mjs'
import { DEFAULT_URL as RITEVIZOR_DEFAULT_URL, listRubrics, ritevizorConfig } from './ritevizor.mjs'

// Admin → Settings: SMTP and AI provider settings. Secrets go in, never out:
// responses only say whether one is saved, plus its last four characters.
export function settingsRoutes() {
  const r = express.Router()
  const admin = requireAuth('admin')

  r.get('/api/admin/integrations', admin, async (req, res) => {
    const smtp = await smtpConfig()
    const saved = await readArea('ai')
    const active = await aiConfig()
    const rv = await ritevizorConfig()
    const rvSaved = await readArea('ritevizor')
    res.json({
      ritevizor: {
        source: rv?.source || 'none',
        url: rv?.url || rvSaved.url || RITEVIZOR_DEFAULT_URL,
        keyMask: mask(rv?.apiKey), keyFromEnv: rv?.source === 'env',
      },
      smtp: smtp
        ? { source: smtp.source, host: smtp.host, port: smtp.port, secure: smtp.secure, user: smtp.user,
            from: smtp.from, replyTo: smtp.replyTo, passwordSet: !!smtp.pass }
        : { source: 'none', host: '', port: 587, secure: false, user: '', from: '', replyTo: '', passwordSet: false },
      ai: {
        source: active?.source || 'none',
        provider: active?.provider || saved.provider || 'anthropic',
        model: active?.model || '',
        providers: Object.entries(PROVIDERS).map(([key, p]) => {
          const k = decrypt(saved.keys_enc?.[key])
          const envKey = key === 'anthropic' && !k ? process.env.ANTHROPIC_API_KEY : null
          return {
            key, label: p.label, readsPdf: p.pdf, keyHint: p.keyHint, defaultModel: p.defaultModel,
            model: saved.models?.[key] || p.defaultModel,
            keyMask: mask(k || envKey), keyFromEnv: !!envKey,
          }
        }),
      },
    })
  })

  r.put('/api/admin/integrations/smtp', admin, async (req, res) => {
    const b = req.body || {}
    if (b.clear) {
      await query(`delete from integration_settings where area = 'smtp'`)
      return res.json({ ok: true })
    }
    const host = String(b.host || '').trim()
    const port = Number(b.port)
    if (!host || !Number.isInteger(port) || port < 1 || port > 65535) return res.status(400).json({ error: 'bad_input' })
    const prev = await readArea('smtp')
    const password = typeof b.password === 'string' && b.password !== '' ? b.password : null
    await writeArea('smtp', {
      host, port, secure: !!b.secure,
      user: String(b.user || '').trim(),
      from: String(b.from || '').trim(),
      replyTo: String(b.replyTo || '').trim(),
      password_enc: password ? encrypt(password) : prev.password_enc || null,
    }, req.account.id)
    res.json({ ok: true })
  })

  // Sends to the signed-in admin's own address.
  r.post('/api/admin/integrations/smtp/test', admin, async (req, res) => {
    const r2 = await sendTestEmail(req.account.email)
    res.json({ delivered: r2.delivered, to: req.account.email, reason: r2.reason || null, error: r2.error || null })
  })

  // Choose the active provider, set its model, and/or save its key.
  r.put('/api/admin/integrations/ai', admin, async (req, res) => {
    const b = req.body || {}
    if (!PROVIDERS[b.provider]) return res.status(400).json({ error: 'bad_provider' })
    const prev = await readArea('ai')
    const keys = { ...(prev.keys_enc || {}) }
    const models = { ...(prev.models || {}) }
    if (typeof b.apiKey === 'string' && b.apiKey.trim()) keys[b.provider] = encrypt(b.apiKey.trim())
    if (b.removeKey) delete keys[b.provider]
    if (typeof b.model === 'string') models[b.provider] = b.model.trim()
    await writeArea('ai', { provider: b.provider, models, keys_enc: keys }, req.account.id)
    res.json({ ok: true })
  })

  // RiteVizor rubric library: base URL + API key (matches KATANA_API_KEY there).
  r.put('/api/admin/integrations/ritevizor', admin, async (req, res) => {
    const b = req.body || {}
    const prev = await readArea('ritevizor')
    if (b.removeKey) { await writeArea('ritevizor', { url: prev.url || null, key_enc: null }, req.account.id); return res.json({ ok: true }) }
    let url = String(b.url || '').trim().replace(/\/+$/, '')
    if (url) { try { const u = new URL(url); if (!/^https?:$/.test(u.protocol)) throw new Error() ; url = u.origin + u.pathname.replace(/\/+$/, '') } catch { return res.status(400).json({ error: 'bad_url', message: 'Enter the RiteVizor API address, e.g. https://api.ritevizor.com' }) } }
    const apiKey = typeof b.apiKey === 'string' && b.apiKey.trim() ? b.apiKey.trim() : null
    await writeArea('ritevizor', { url: url || null, key_enc: apiKey ? encrypt(apiKey) : prev.key_enc || null }, req.account.id)
    res.json({ ok: true })
  })

  r.post('/api/admin/integrations/ritevizor/test', admin, async (req, res) => {
    const b = req.body || {}
    const saved = await readArea('ritevizor')
    const key = (typeof b.apiKey === 'string' && b.apiKey.trim()) || decrypt(saved.key_enc) || process.env.RITEVIZOR_API_KEY
    if (!key) return res.status(400).json({ error: 'no_key', message: 'Enter the API key first.' })
    const url = (String(b.url || '').trim() || saved.url || process.env.RITEVIZOR_API_URL || RITEVIZOR_DEFAULT_URL).replace(/\/+$/, '')
    try {
      const rubrics = await listRubrics({ url, apiKey: key })
      res.json({ ok: true, count: rubrics.length, names: rubrics.slice(0, 8).map((x) => x.name) })
    } catch (e) {
      res.status(400).json({ error: 'test_failed', message: e.safe ? e.message : 'The test failed.' })
    }
  })

  // Check a key (the one typed, or the saved one) by listing the provider's models.
  r.post('/api/admin/integrations/ai/test', admin, async (req, res) => {
    const b = req.body || {}
    if (!PROVIDERS[b.provider]) return res.status(400).json({ error: 'bad_provider' })
    const saved = await readArea('ai')
    const key = (typeof b.apiKey === 'string' && b.apiKey.trim()) || decrypt(saved.keys_enc?.[b.provider]) ||
      (b.provider === 'anthropic' ? process.env.ANTHROPIC_API_KEY : null)
    if (!key) return res.status(400).json({ error: 'no_key', message: 'Enter an API key first.' })
    try {
      const models = await listModels(b.provider, key)
      res.json({ ok: true, models })
    } catch (e) {
      res.status(400).json({ error: 'test_failed', message: e.safe ? e.message : 'The test failed.' })
    }
  })

  return r
}
