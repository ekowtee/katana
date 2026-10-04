// Tests for the TerraNova sign-in handoff (POST /sso/terranova).
// Run with `npm test`. No network and no database: tokens are signed with a
// locally generated ES256 key, the key set is injected, and accounts/jti live in
// an in-memory store.
import { test, before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import fs from 'node:fs'
import express from 'express'
import jwt from 'jsonwebtoken'
import { SignJWT, UnsecuredJWT, generateKeyPair, exportJWK, exportSPKI, createLocalJWKSet } from 'jose'

// .env in this folder may hold a cloud DATABASE_URL. dotenv never overrides a
// variable that is already set, so pin these before the server modules load.
process.env.DATABASE_URL = 'postgres://test@127.0.0.1:1/none'
process.env.POSTGRES_URL = process.env.DATABASE_URL
process.env.JWT_SECRET = 'test-secret'
process.env.TERRANOVA_APP_SLUG = 'katana'

const { terranovaSso } = await import('./sso.mjs')
const { default: middleware, config: middlewareConfig } = await import('../middleware.js')
const { pool } = await import('./db.mjs')
assert.equal(pool.options.connectionString, 'postgres://test@127.0.0.1:1/none')

const TERRANOVA = 'https://terranova.test'
const STAFF = 'ama.panel@ninanigroup.com'
const FAILED = '/portal/login?error=terranova'
const NO_ACCESS = '/portal/login?error=no_access'

const { publicKey, privateKey } = await generateKeyPair('ES256')
const other = await generateKeyPair('ES256')
const publicJwk = { ...(await exportJWK(publicKey)), kid: 'k1', use: 'sig', alg: 'ES256' }
const keys = createLocalJWKSet({ keys: [publicJwk] })

// In-memory stand-in for the three queries in sso.mjs.
const accounts = [
  { id: 'acc-panel', email: 'Ama.Panel@ninanigroup.com', role: 'panel', candidate_slug: null, active: true },
  { id: 'acc-admin', email: 'kofi.admin@ninanigroup.com', role: 'admin', candidate_slug: null, active: true },
  { id: 'acc-cand', email: 'esi.candidate@ninanigroup.com', role: 'candidate', candidate_slug: 'esi-candidate', active: true },
  { id: 'acc-off', email: 'left.staff@ninanigroup.com', role: 'panel', candidate_slug: null, active: false },
]
const usedJti = new Set()
const signIns = []
const store = {
  accountByEmail: async (email) => accounts.find((a) => a.email.toLowerCase() === email) || null,
  claimJti: async (jti) => (usedJti.has(jti) ? false : (usedJti.add(jti), true)),
  recordSignIn: async (id) => { signIns.push(id) },
}

// Serve a handoff router on a free local port; returns its base URL.
const servers = []
async function serve(options) {
  const app = express()
  app.use(terranovaSso({ keys, store, ...options }))
  const s = app.listen(0, '127.0.0.1')
  servers.push(s)
  await new Promise((resolve) => s.once('listening', resolve))
  return `http://127.0.0.1:${s.address().port}`
}

let base
// Every request here comes from 127.0.0.1, so the failure limit is lifted for the main
// router; it has its own tests below, each on a router of its own.
before(async () => { base = await serve({ maxFailures: Infinity }) })
after(() => servers.forEach((s) => s.close()))
beforeEach(() => { process.env.TERRANOVA_URL = TERRANOVA; signIns.length = 0 })

// A handoff token as TerraNova mints it; each option can be bent for a test.
function mint({
  email = STAFF, iss = TERRANOVA, aud = 'katana', jti = crypto.randomUUID(), ttl = 60, key = privateKey,
  iat = Math.floor(Date.now() / 1000),
} = {}) {
  const now = Math.floor(Date.now() / 1000)
  const t = new SignJWT({ email, name: 'Test Person', company: 'ninani-group' })
    .setProtectedHeader({ alg: 'ES256', kid: 'k1', typ: 'JWT' })
    .setIssuer(iss).setAudience(aud).setSubject(email)
    .setIssuedAt(iat).setExpirationTime(now + ttl)
  if (jti) t.setJti(jti)
  return t.sign(key)
}

// `session` is a datjf_session value the browser already holds, if any; `ip` is sent as
// x-forwarded-for (only honoured by a router told to trust it); `to` is another router.
async function post({ token, next, origin = TERRANOVA, method = 'POST', session, ip, to = base } = {}) {
  const form = new URLSearchParams()
  if (token !== undefined) form.set('token', token)
  if (next !== undefined) form.set('next', next)
  const res = await fetch(`${to}/sso/terranova`, {
    method,
    redirect: 'manual',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      ...(origin ? { origin } : {}),
      ...(session ? { cookie: `datjf_session=${session}` } : {}),
      ...(ip ? { 'x-forwarded-for': ip } : {}),
    },
    body: method === 'POST' ? form.toString() : undefined,
  })
  const set = res.headers.getSetCookie().filter((c) => c.startsWith('datjf_session='))
  return {
    status: res.status,
    location: res.headers.get('location'),
    // A cookie that starts a session, and whether the response ends one.
    cookie: set.find((c) => /^datjf_session=[^;]/.test(c)) || null,
    cleared: set.some((c) => /^datjf_session=;/.test(c) && /Path=\//.test(c) && /Expires=Thu, 01 Jan 1970/.test(c)),
    headers: res.headers,
  }
}

// Refused with no session started. An existing session is ended only on the
// no-access refusals (genuine token), never on a bad token or a wrong Origin.
function assertRefused(r, location = FAILED) {
  assert.equal(r.status, 303)
  assert.equal(r.location, location)
  assert.equal(r.cookie, null, 'no session cookie')
  assert.equal(r.cleared, location === NO_ACCESS, 'existing session ended only for no-access')
  assert.deepEqual(signIns, [], 'no sign-in recorded')
}

test('a valid token starts the normal session and redirects to next', async () => {
  const r = await post({ token: await mint(), next: '/portal' })
  assert.equal(r.status, 303)
  assert.equal(r.location, '/portal')
  assert.ok(r.cookie, 'session cookie set')
  assert.match(r.cookie, /HttpOnly/i)
  assert.match(r.cookie, /SameSite=Lax/i)
  assert.match(r.cookie, /Path=\//)
  assert.match(r.cookie, /Max-Age=604800/)
  // Same claims and lifetime as a magic-link session (server/auth.mjs setSession).
  const payload = jwt.verify(r.cookie.split(';')[0].split('=')[1], 'test-secret')
  assert.equal(payload.sub, 'acc-panel')
  assert.equal(payload.role, 'panel')
  assert.equal(payload.slug, null)
  assert.equal(payload.exp - payload.iat, 7 * 24 * 60 * 60)
  assert.deepEqual(signIns, ['acc-panel'])
})

test('next can be a deeper path with a query', async () => {
  const r = await post({ token: await mint(), next: '/portal/candidate/esi-candidate?tab=notes' })
  assert.equal(r.location, '/portal/candidate/esi-candidate?tab=notes')
  assert.ok(r.cookie)
})

test('the account keeps its own role', async () => {
  const admin = await post({ token: await mint({ email: 'kofi.admin@ninanigroup.com' }) })
  assert.equal(jwt.decode(admin.cookie.split(';')[0].split('=')[1]).role, 'admin')
  assert.equal(admin.location, '/portal')
  const cand = await post({ token: await mint({ email: 'esi.candidate@ninanigroup.com' }) })
  const payload = jwt.decode(cand.cookie.split(';')[0].split('=')[1])
  assert.equal(payload.role, 'candidate')
  assert.equal(payload.slug, 'esi-candidate')
  assert.equal(cand.location, '/portal/me')
})

test('a request with no Origin header is accepted on the token alone', async () => {
  const r = await post({ token: await mint(), origin: null })
  assert.equal(r.location, '/portal')
  assert.ok(r.cookie)
})

test('rejected: wrong aud', async () => {
  assertRefused(await post({ token: await mint({ aud: 'nubiro' }) }))
})

test('rejected: wrong iss', async () => {
  assertRefused(await post({ token: await mint({ iss: 'https://terranova.evil.example' }) }))
})

test('rejected: expired', async () => {
  assertRefused(await post({ token: await mint({ ttl: -30 }) }))
})

test('rejected: issued more than 65 s ago, even with exp still ahead', async () => {
  const now = Math.floor(Date.now() / 1000)
  assertRefused(await post({ token: await mint({ iat: now - 120, ttl: 300 }) }))
})

test('rejected: signed by a different key', async () => {
  assertRefused(await post({ token: await mint({ key: other.privateKey }) }))
})

test('rejected: alg HS256', async () => {
  const claims = { email: STAFF, iss: TERRANOVA, aud: 'katana', sub: STAFF, jti: crypto.randomUUID() }
  // Signed with a shared secret, and with the public key's bytes used as the secret.
  const secrets = ['test-secret', JSON.stringify(publicJwk), await exportSPKI(publicKey)]
  for (const secret of secrets) {
    const token = jwt.sign(claims, secret, { algorithm: 'HS256', expiresIn: 60, keyid: 'k1' })
    assertRefused(await post({ token }))
  }
})

test('rejected: alg none', async () => {
  const token = new UnsecuredJWT({ email: STAFF })
    .setIssuer(TERRANOVA).setAudience('katana').setSubject(STAFF)
    .setJti(crypto.randomUUID()).setIssuedAt().setExpirationTime('60s').encode()
  assertRefused(await post({ token }))
})

test('rejected: missing jti', async () => {
  assertRefused(await post({ token: await mint({ jti: null }) }))
})

test('rejected: missing or garbage token', async () => {
  assertRefused(await post({}))
  assertRefused(await post({ token: 'not-a-token' }))
})

test('rejected: a second use of the same token', async () => {
  const token = await mint()
  const first = await post({ token })
  assert.ok(first.cookie)
  signIns.length = 0
  assertRefused(await post({ token }))
})

test('rejected: an Origin header that is not TerraNova', async () => {
  const token = await mint()
  assertRefused(await post({ token, origin: 'https://evil.example' }))
  assertRefused(await post({ token, origin: 'null' }))
  // The refusal came before the token was looked at, so it was not used up.
  assert.ok((await post({ token })).cookie)
})

test('an unknown email is refused with the no-access message and nothing is created', async () => {
  const before = JSON.stringify(accounts)
  assertRefused(await post({ token: await mint({ email: 'new.person@ninanigroup.com' }) }), NO_ACCESS)
  assert.equal(JSON.stringify(accounts), before)
})

test('an inactive account is refused', async () => {
  assertRefused(await post({ token: await mint({ email: 'left.staff@ninanigroup.com' }) }), NO_ACCESS)
})

// Someone else's session left behind in the same browser.
const leftBehind = () => jwt.sign({ sub: 'acc-admin', role: 'admin', slug: null }, 'test-secret', { expiresIn: '7d' })

test('a genuine token for someone with no access ends the session already in the browser', async () => {
  const session = leftBehind()
  for (const email of ['new.person@ninanigroup.com', 'left.staff@ninanigroup.com']) {
    const r = await post({ token: await mint({ email }), session })
    assertRefused(r, NO_ACCESS)
    assert.equal(r.cleared, true, email)
  }
  // Also when the lookup fails after the token was accepted.
  const lookup = store.accountByEmail
  store.accountByEmail = async () => { throw new Error('db down') }
  try {
    const r = await post({ token: await mint(), session })
    assert.equal(r.location, FAILED)
    assert.equal(r.cookie, null)
    assert.equal(r.cleared, true)
  } finally {
    store.accountByEmail = lookup
  }
})

test('a bad token, a replay or a wrong Origin leaves an existing session alone', async () => {
  const session = leftBehind()
  const used = await mint()
  assert.ok((await post({ token: used })).cookie)
  signIns.length = 0
  const attempts = [
    { token: 'not-a-token' },
    { token: await mint({ key: other.privateKey }) },
    { token: await mint({ ttl: -30 }) },
    { token: await mint({ aud: 'nubiro' }) },
    { token: used },
    { token: await mint(), origin: 'https://evil.example' },
    { token: await mint({ email: 'new.person@ninanigroup.com' }), origin: 'https://evil.example' },
  ]
  for (const attempt of attempts) {
    const r = await post({ ...attempt, session })
    assertRefused(r)
    assert.equal(r.headers.getSetCookie().length, 0, 'no Set-Cookie at all')
  }
})

test('an off-site next falls back to the signed-in home', async () => {
  for (const next of ['//evil.example', 'https://evil.example', '/\\evil.example', '/\t/evil.example', 'portal']) {
    const r = await post({ token: await mint(), next })
    assert.equal(r.status, 303)
    assert.equal(r.location, '/portal', `next=${JSON.stringify(next)}`)
    assert.ok(r.cookie)
  }
})

test('only POST is accepted', async () => {
  const r = await post({ method: 'GET' })
  assert.equal(r.status, 404)
  assert.equal(r.cookie, null)
})

test('with TERRANOVA_URL unset the endpoint is a 404, the same as any unknown route', async () => {
  delete process.env.TERRANOVA_URL
  const r = await post({ token: await mint(), next: '/portal' })
  assert.equal(r.status, 404)
  assert.equal(r.cookie, null)
  assert.deepEqual(signIns, [])
  // Headers are exactly what Express sends for a route that does not exist.
  const unknown = await fetch(`${base}/no-such-route`, { method: 'POST' })
  assert.equal(unknown.status, 404)
  for (const h of ['content-security-policy', 'x-frame-options']) {
    assert.equal(r.headers.get(h), unknown.headers.get(h), h)
  }
  assert.equal(r.headers.get('x-frame-options'), null)
})

// ── Failed-attempt limit: 10 per address per 15 minutes ──────────────────────

test('ten failed attempts from one address block the next, even with a good token', async () => {
  const to = await serve({ trustForwardedFor: true })
  const ip = '203.0.113.7'
  const failures = [
    { token: 'not-a-token' },
    { token: await mint({ key: other.privateKey }) },
    { token: await mint({ aud: 'nubiro' }) },
    { token: await mint(), origin: 'https://evil.example' },
  ]
  for (let i = 0; i < 10; i++) assertRefused(await post({ ...failures[i % failures.length], ip, to }))
  const good = await mint()
  assertRefused(await post({ token: good, ip, to }))
  // Another address is unaffected, and the blocked attempt never got as far as using the token.
  const elsewhere = await post({ token: good, ip: '198.51.100.9, 10.0.0.1', to })
  assert.ok(elsewhere.cookie)
})

test('successes and no-access refusals do not count, and the block lifts after 15 minutes', async () => {
  let clock = 1_000_000
  const to = await serve({ trustForwardedFor: true, now: () => clock })
  const ip = '203.0.113.8'
  for (let i = 0; i < 9; i++) assertRefused(await post({ token: 'not-a-token', ip, to }))
  for (let i = 0; i < 5; i++) assert.ok((await post({ token: await mint(), ip, to })).cookie)
  for (let i = 0; i < 3; i++) {
    const r = await post({ token: await mint({ email: 'new.person@ninanigroup.com' }), ip, to })
    assert.equal(r.location, NO_ACCESS)
  }
  signIns.length = 0
  assertRefused(await post({ token: 'not-a-token', ip, to })) // the tenth failure
  assertRefused(await post({ token: await mint(), ip, to }))
  clock += 15 * 60 * 1000
  assert.ok((await post({ token: await mint(), ip, to })).cookie)
})

test('off Vercel a client-sent x-forwarded-for is ignored, so it cannot dodge the limit', async () => {
  const to = await serve({ trustForwardedFor: false })
  for (let i = 0; i < 10; i++) assertRefused(await post({ token: 'not-a-token', ip: `192.0.2.${i}`, to }))
  assertRefused(await post({ token: await mint(), ip: '192.0.2.200', to }))
})

test('vercel.json routes /sso/terranova to the API, ahead of the SPA catch-all, and sets no framing header', () => {
  const config = JSON.parse(fs.readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'))
  const sources = config.rewrites.map((r) => r.source)
  assert.ok(sources.includes('/sso/terranova'))
  assert.ok(sources.indexOf('/sso/terranova') < sources.indexOf('/(.*)'), 'ahead of the SPA catch-all')
  assert.equal(config.rewrites.find((r) => r.source === '/sso/terranova').destination, '/api')
  // Framing is middleware.js's job, so it can follow TERRANOVA_URL.
  const sent = (config.headers || []).flatMap((h) => h.headers)
  assert.equal(sent.some((h) => /content-security-policy|x-frame-options/i.test(h.key)), false)
})

test('the pages may be framed by TerraNova only when TERRANOVA_URL is set, and are untouched when it is not', () => {
  const before = process.env.TERRANOVA_URL
  try {
    delete process.env.TERRANOVA_URL
    const plain = middleware()
    assert.equal(plain.headers.get('x-middleware-next'), '1')
    assert.deepEqual([...plain.headers.keys()], ['x-middleware-next'], 'no framing header: today\'s response')

    process.env.TERRANOVA_URL = `${TERRANOVA}/`
    const framed = middleware()
    assert.equal(framed.headers.get('x-middleware-next'), '1')
    assert.equal(framed.headers.get('content-security-policy'), `frame-ancestors 'self' ${TERRANOVA}`)
    assert.equal(framed.headers.get('x-frame-options'), null)

    process.env.TERRANOVA_URL = 'not an address'
    assert.deepEqual([...middleware().headers.keys()], ['x-middleware-next'])
  } finally {
    if (before === undefined) delete process.env.TERRANOVA_URL
    else process.env.TERRANOVA_URL = before
  }
})

test('the middleware runs on the SPA\'s page routes and not on the API, the handoff or files', () => {
  // Vercel matchers are anchored regular expressions over the request path.
  const matchers = middlewareConfig.matcher.map((m) => new RegExp(`^${m}$`))
  const runs = (path) => matchers.some((re) => re.test(path))
  for (const page of ['/', '/index.html', '/launch', '/portal', '/portal/', '/portal/login',
    '/portal/candidate/esi-candidate', '/portal/admin', '/portal/me', '/no-such-page']) {
    assert.ok(runs(page), page)
  }
  for (const other of ['/api', '/api/auth/me', '/sso/terranova', '/assets/index-abc123.js',
    '/favicon.ico', '/site.webmanifest', '/brand/logo.svg', '/og-image.png']) {
    assert.ok(!runs(other), other)
  }
})
