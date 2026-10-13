import express from 'express'
import { one } from './db.mjs'

// Launch-page RSVP form (/launch): public, one registration per email.
// Replaces the browser writing straight into Supabase.

const WINDOW_MS = 15 * 60 * 1000
const MAX_PER_WINDOW = 10
const hits = new Map() // client address -> recent timestamps (per function instance)

function limited(ip) {
  const now = Date.now()
  const recent = (hits.get(ip) || []).filter((t) => now - t < WINDOW_MS)
  recent.push(now)
  hits.set(ip, recent)
  if (hits.size > 5000) hits.clear()
  return recent.length > MAX_PER_WINDOW
}

const text = (v, max) => {
  const s = typeof v === 'string' ? v.trim() : ''
  return s ? s.slice(0, max) : null
}

export function registrationRoutes() {
  const r = express.Router()

  r.post('/api/registrations', async (req, res) => {
    const ip = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim()
    if (limited(ip)) return res.status(429).json({ error: 'rate_limited', message: 'Too many attempts. Please try again later.' })

    const b = req.body || {}
    const fullName = text(b.fullName, 200)
    const email = text(b.email, 254)?.toLowerCase() || null
    if (!fullName || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'bad_input', message: 'Please enter your full name and a valid email address.' })
    }
    if (b.consent !== true) return res.status(400).json({ error: 'no_consent', message: 'Please agree to the terms and privacy policy.' })

    const row = await one(
      `insert into registrations (full_name, email, phone, city, organisation, source, consent)
       values ($1, $2, $3, 'N/A', $4, $5, true)
       on conflict (lower(email)) do nothing returning id`,
      [fullName, email, text(b.phone, 40), text(b.organisation, 200), text(b.source, 200)])
    if (!row) return res.status(409).json({ error: 'already_registered', message: 'This email is already registered for the event.' })
    res.json({ ok: true })
  })

  return r
}
