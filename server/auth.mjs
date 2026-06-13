import crypto from 'node:crypto'
import jwt from 'jsonwebtoken'
import { one } from './db.mjs'
import 'dotenv/config'

const JWT_SECRET = process.env.JWT_SECRET || 'dev-insecure-secret-change-me'
const COOKIE = 'datjf_session'
const SESSION_DAYS = 7
const TOKEN_TTL_MIN = 30

const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex')

// ── Magic-link tokens ───────────────────────────────────────────────────────
export async function issueLoginToken(accountId) {
  const raw = crypto.randomBytes(32).toString('base64url')
  const token_hash = sha256(raw)
  const expires = new Date(Date.now() + TOKEN_TTL_MIN * 60 * 1000)
  await one(
    `insert into login_tokens (account_id, token_hash, expires_at) values ($1,$2,$3) returning id`,
    [accountId, token_hash, expires]
  )
  // raw token carries the account id (for lookup) + secret
  return `${accountId}.${raw}`
}

export async function consumeLoginToken(token) {
  if (!token || !token.includes('.')) return null
  const [accountId, raw] = token.split('.')
  const row = await one(
    `select lt.id, lt.account_id, lt.expires_at, lt.used_at
       from login_tokens lt
      where lt.account_id = $1 and lt.token_hash = $2
      order by lt.created_at desc limit 1`,
    [accountId, sha256(raw)]
  )
  if (!row) return null
  if (row.used_at) return null
  if (new Date(row.expires_at) < new Date()) return null
  await one(`update login_tokens set used_at = now() where id = $1 returning id`, [row.id])
  await one(`update accounts set last_login_at = now() where id = $1 returning id`, [accountId])
  return accountId
}

// ── Session cookie (signed JWT) ─────────────────────────────────────────────
export function setSession(res, account) {
  const token = jwt.sign(
    { sub: account.id, role: account.role, slug: account.candidate_slug || null },
    JWT_SECRET,
    { expiresIn: `${SESSION_DAYS}d` }
  )
  res.cookie(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: SESSION_DAYS * 24 * 60 * 60 * 1000,
    path: '/',
  })
}

export function clearSession(res) {
  res.clearCookie(COOKIE, { path: '/' })
}

export async function currentAccount(req) {
  const raw = req.cookies?.[COOKIE]
  if (!raw) return null
  let payload
  try {
    payload = jwt.verify(raw, JWT_SECRET)
  } catch {
    return null
  }
  const acc = await one(
    `select id, email, role, display_name, candidate_slug, panelist_name, active from accounts where id = $1`,
    [payload.sub]
  )
  if (!acc || !acc.active) return null
  return acc
}

// ── Express middleware ──────────────────────────────────────────────────────
export function requireAuth(...roles) {
  return async (req, res, next) => {
    const acc = await currentAccount(req)
    if (!acc) return res.status(401).json({ error: 'unauthorised' })
    if (roles.length && !roles.includes(acc.role)) return res.status(403).json({ error: 'forbidden' })
    req.account = acc
    next()
  }
}
