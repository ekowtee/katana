import crypto from 'node:crypto'
import { one, query } from './db.mjs'
import 'dotenv/config'

// Integration settings the admin enters in Admin → Settings: SMTP for the
// sign-in emails, and the AI provider + API key used to read CVs. Stored in
// integration_settings; passwords and keys are encrypted (AES-256-GCM, key
// derived from JWT_SECRET) and never sent back to the browser. Anything not
// set here falls back to the environment variables used before.

const KEY = crypto.createHash('sha256').update(`katana-settings-v1:${process.env.JWT_SECRET || 'dev-insecure-secret-change-me'}`).digest()

export function encrypt(plain) {
  const iv = crypto.randomBytes(12)
  const c = crypto.createCipheriv('aes-256-gcm', KEY, iv)
  const data = Buffer.concat([c.update(String(plain), 'utf8'), c.final()])
  return ['v1', iv.toString('base64'), c.getAuthTag().toString('base64'), data.toString('base64')].join(':')
}

// null if missing or unreadable (e.g. JWT_SECRET changed since it was saved).
export function decrypt(blob) {
  if (!blob) return null
  try {
    const [v, iv, tag, data] = String(blob).split(':')
    if (v !== 'v1') return null
    const d = crypto.createDecipheriv('aes-256-gcm', KEY, Buffer.from(iv, 'base64'))
    d.setAuthTag(Buffer.from(tag, 'base64'))
    return Buffer.concat([d.update(Buffer.from(data, 'base64')), d.final()]).toString('utf8')
  } catch {
    return null
  }
}

export const mask = (secret) => (secret ? `••••${secret.slice(-4)}` : null)

export async function readArea(area) {
  const row = await one(`select config from integration_settings where area = $1`, [area])
  return row?.config || {}
}

export async function writeArea(area, config, accountId) {
  await query(
    `insert into integration_settings (area, config, updated_at, updated_by) values ($1, $2, now(), $3)
     on conflict (area) do update set config = excluded.config, updated_at = now(), updated_by = excluded.updated_by`,
    [area, config, accountId || null])
}

// ── SMTP ─────────────────────────────────────────────────────────────────────
// Saved settings win as a whole (once a host is saved); otherwise the env vars.
export async function smtpConfig() {
  const s = await readArea('smtp')
  if (s.host) {
    return {
      source: 'settings', host: s.host, port: Number(s.port) || 587, secure: !!s.secure,
      user: s.user || '', pass: decrypt(s.password_enc) || '', from: s.from || '', replyTo: s.replyTo || '',
    }
  }
  const e = process.env
  const pass = e.SMTP_PASS || e.SMTP_PASSWORD || ''
  if (e.SMTP_HOST && e.SMTP_USER && pass) {
    return {
      source: 'env', host: e.SMTP_HOST, port: Number(e.SMTP_PORT || 587), secure: String(e.SMTP_SECURE || 'false') === 'true',
      user: e.SMTP_USER, pass, from: e.SMTP_FROM || '', replyTo: e.SMTP_REPLY_TO || '',
    }
  }
  return null
}

// ── AI provider ─────────────────────────────────────────────────────────────
// `pdf`: whether the provider is sent the PDF itself; otherwise its text.
export const PROVIDERS = {
  anthropic: { label: 'Anthropic (Claude)', defaultModel: 'claude-opus-5-5', pdf: true, keyHint: 'sk-ant-…' },
  openai: { label: 'OpenAI', defaultModel: '', pdf: false, keyHint: 'sk-…' },
  xai: { label: 'xAI (Grok)', defaultModel: '', pdf: false, keyHint: 'xai-…' },
  moonshot: { label: 'Moonshot (Kimi)', defaultModel: '', pdf: false, keyHint: 'sk-…' },
  gemini: { label: 'Google (Gemini)', defaultModel: '', pdf: true, keyHint: 'AIza…' },
}

// The active provider, its model and key — or null if none is usable.
export async function aiConfig() {
  const s = await readArea('ai')
  if (s.provider && PROVIDERS[s.provider]) {
    const apiKey = decrypt(s.keys_enc?.[s.provider])
    const model = s.models?.[s.provider] || PROVIDERS[s.provider].defaultModel
    if (apiKey && model) return { source: 'settings', provider: s.provider, model, apiKey }
  }
  if (process.env.ANTHROPIC_API_KEY) {
    return { source: 'env', provider: 'anthropic', model: PROVIDERS.anthropic.defaultModel, apiKey: process.env.ANTHROPIC_API_KEY }
  }
  return null
}
