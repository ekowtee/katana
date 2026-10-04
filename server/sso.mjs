import express from 'express'
import { createRemoteJWKSet, jwtVerify } from 'jose'
import { one, query } from './db.mjs'
import { setSession, clearSession, landingFor } from './auth.mjs'
import 'dotenv/config'

// ── TerraNova sign-in handoff ───────────────────────────────────────────────
// TerraNova (the group's staff front door) posts a 60-second ES256 token to
// POST /sso/terranova; we verify it, match the email to an existing account and
// start the same session a magic link does. Nothing is created here: an email
// with no active account is refused. Off (404) unless TERRANOVA_URL is set.
const APP_SLUG = process.env.TERRANOVA_APP_SLUG || 'katana'
const LOGIN = '/portal/login'

// Read per request so the route can be switched on/off by env alone.
const configuredUrl = () => (process.env.TERRANOVA_URL || '').replace(/\/$/, '')

// Key set is cached; jose refetches it when a token's kid isn't found (rotation).
let remote = null
function remoteKeys(issuer) {
  if (remote?.issuer !== issuer) {
    remote = { issuer, keys: createRemoteJWKSet(new URL(`${issuer}/.well-known/jwks.json`)) }
  }
  return remote.keys
}

export async function verifyTerraNovaToken(token, { terranovaUrl, appSlug, keys }) {
  const issuer = terranovaUrl.replace(/\/$/, '')
  const { payload } = await jwtVerify(token, keys ?? remoteKeys(issuer), {
    algorithms: ['ES256'],
    issuer,
    audience: appSlug,
    clockTolerance: 5,
    // Tokens live 60 s; also refuse one issued longer ago than that, whatever its exp says.
    maxTokenAge: '65s',
    requiredClaims: ['exp', 'jti', 'email'],
  })
  if (typeof payload.email !== 'string' || typeof payload.jti !== 'string') {
    throw new Error('Handoff token is missing email or jti.')
  }
  return {
    email: payload.email.toLowerCase(),
    jti: payload.jti,
    expiresAt: new Date(payload.exp * 1000),
  }
}

// Only a path on this origin: starts with a single "/", and still resolves here.
function safeNext(next) {
  if (typeof next !== 'string' || !/^\/(?![/\\])/.test(next)) return null
  try {
    const u = new URL(next, 'http://self.invalid')
    return u.origin === 'http://self.invalid' ? u.pathname + u.search + u.hash : null
  } catch {
    return null
  }
}

// Who is knocking. On Vercel the edge overwrites x-forwarded-for with the real client
// address (a value sent by the client is not passed through), so its first entry is the
// client. Anywhere else nothing vouches for that header, so use the socket address
// (Express 'trust proxy' is off in server/index.mjs, so req.ip is exactly that).
export function clientIp(req, trustForwardedFor = !!process.env.VERCEL) {
  const forwarded = trustForwardedFor && String(req.get('x-forwarded-for') || '').split(',')[0].trim()
  return forwarded || req.ip || 'unknown'
}

// Failed handoffs per client address, in memory: a fixed window of `windowMs` from the
// first failure. Successes don't count. Per serverless instance, which is enough to
// slow down someone throwing tokens at the route.
function failureLimiter({ max, windowMs, now }) {
  const seen = new Map()
  const live = (ip) => {
    const entry = seen.get(ip)
    if (entry && entry.resetAt <= now()) seen.delete(ip)
    return seen.get(ip)
  }
  return {
    blocked: (ip) => (live(ip)?.count ?? 0) >= max,
    fail(ip) {
      const entry = live(ip)
      if (entry) entry.count++
      else seen.set(ip, { count: 1, resetAt: now() + windowMs })
      // Keep the map bounded: sweep out expired windows once it grows.
      if (seen.size > 5000) for (const key of [...seen.keys()]) live(key)
    },
  }
}

// Database access (swapped for an in-memory store in the tests).
const db = {
  accountByEmail: (email) =>
    one(`select * from accounts where lower(email) = $1 order by active desc limit 1`, [email]),

  // Single use: the insert is the uniqueness check — no row back means a replay.
  async claimJti(jti, expiresAt) {
    const row = await one(
      `insert into terranova_jti (jti, expires_at) values ($1,$2)
       on conflict (jti) do nothing returning jti`,
      [jti, expiresAt]
    )
    // Opportunistic clean-up, a minute behind expiry so a token still inside its
    // clock tolerance can never be replayed against a deleted row.
    await query(`delete from terranova_jti where expires_at < now() - interval '1 minute'`)
      .catch((e) => console.warn(`[sso] jti clean-up failed: ${e.message}`))
    return !!row
  },

  recordSignIn: (accountId) =>
    one(`update accounts set last_login_at = now() where id = $1 returning id`, [accountId]),
}

export function terranovaSso({
  keys, store = db,
  maxFailures = 10, failureWindowMs = 15 * 60 * 1000, now = Date.now, trustForwardedFor,
} = {}) {
  const router = express.Router()
  const limiter = failureLimiter({ max: maxFailures, windowMs: failureWindowMs, now })

  // Not configured → fall through to the normal 404, as if the route didn't exist.
  const enabled = (req, res, next) => (configuredUrl() ? next() : next('route'))

  router.post('/sso/terranova', enabled, express.urlencoded({ extended: false }), async (req, res) => {
    const ip = clientIp(req, trustForwardedFor)
    // True once the token has verified and passed the replay check.
    let genuine = false
    // The reason goes to the server log only; the URL carries a short fixed code. A refusal
    // before the token proved genuine counts against this address; no-access ones don't.
    const refuse = (code, reason, { count = !genuine } = {}) => {
      if (count) limiter.fail(ip)
      console.warn(`[sso] TerraNova sign-in refused: ${reason} (${ip})`)
      res.redirect(303, `${LOGIN}?error=${code}`)
    }
    // Too many failures from here: refuse without looking at the token at all.
    if (limiter.blocked(ip)) return refuse('terranova', 'too many failed attempts', { count: false })
    try {
      const origin = req.get('origin')
      if (origin && origin !== configuredUrl()) return refuse('terranova', `origin ${JSON.stringify(origin)}`)

      let identity
      try {
        identity = await verifyTerraNovaToken(String(req.body?.token || ''), {
          terranovaUrl: configuredUrl(), appSlug: APP_SLUG, keys,
        })
      } catch (e) {
        return refuse('terranova', `bad token (${e.code || e.message})`)
      }
      if (!(await store.claimJti(identity.jti, identity.expiresAt))) return refuse('terranova', 'token already used')
      genuine = true

      const acc = await store.accountByEmail(identity.email)
      if (!acc || !acc.active) {
        // A real TerraNova arrival who isn't let in must not land in a session
        // someone else left in this browser. Never done for a bad token or a
        // wrong Origin — a forged request must not be able to sign people out.
        clearSession(res)
        return refuse('no_access', `${acc ? 'inactive account' : 'no account'} for ${identity.email}`)
      }

      await store.recordSignIn(acc.id)
      setSession(res, acc)
      console.log(`[sso] TerraNova sign-in: ${acc.email} (${acc.role})`)
      res.redirect(303, safeNext(req.body?.next) || landingFor(acc))
    } catch (e) {
      if (genuine) clearSession(res)
      // Our own fault (e.g. the database), not the caller's: not counted.
      refuse('terranova', `error (${e.message})`, { count: false })
    }
  })

  return router
}
