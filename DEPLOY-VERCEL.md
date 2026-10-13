# Deploying the portal to Vercel

The app is one Vercel project: the Vite SPA (static) + the Express API as a single
serverless function (`api/index.mjs`). Routing is handled by `vercel.json`.

> **Database: Neon.** Production is the `neondb` database in the Neon project; local
> development uses a separate `katana_dev` database in the same project (a copy of
> production taken when the portal moved off Prisma Postgres, 13 Oct 2026).

---

## 1. Connection strings

| Where | Variable | Points at |
|---|---|---|
| Vercel (Production, Preview) | `DATABASE_URL` (and `POSTGRES_URL`) | Neon `neondb`, **pooled** endpoint (`…-pooler…neon.tech`) |
| Local `.env` | `DATABASE_URL` | Neon `katana_dev`, pooled |
| Local `.env` | `PROD_DATABASE_URL` | Neon `neondb`, pooled — used by the `cloud:*` scripts |

The app always uses the **pooled** endpoint (serverless opens many short-lived
connections). `db.mjs` reads `DATABASE_URL` first, then `POSTGRES_URL`.

For `pg_dump` / `pg_restore`, use the **direct** endpoint (the same host without
`-pooler`). The pooler shares server sessions between clients, so session settings
those tools make (`search_path = ''`) would leak into the app's connections.

## 2. Schema and data

```bash
npm run db:schema      # apply server/sql/schema.sql to local (katana_dev); re-runnable
npm run cloud:schema   # … to production
npm run ingest         # regenerate supabase/seed.sql from scripts/contacts.mjs
npm run cloud:push     # production: schema → seed → accounts → feedback drafts
```

These run through Node (`scripts/run-sql.mjs`, `scripts/with-prod.mjs`), so they work
the same in PowerShell and Bash and don't need `psql`. Note that `cloud:push` also
(re)creates the default accounts listed in `scripts/seed-accounts.mjs`.

## 3. Set environment variables in Vercel

Project → Settings → Environment Variables (Production):

```
DATABASE_URL   = <Neon pooled connection string, neondb>   # POSTGRES_URL is set to the same
APP_URL        = https://katana.ninanigroup.com  # your public domain, no trailing slash
JWT_SECRET     = <run: node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))">
SMTP_HOST      = smtp.gmail.com
SMTP_PORT      = 587
SMTP_SECURE    = false
SMTP_USER      = tools@interactivedigital.com.gh
SMTP_PASSWORD  = <app password>
SMTP_FROM      = hr@interactivedigital.com.gh   # sender name is always "Ninani Group HR"
```

`NODE_ENV=production` is set by Vercel automatically (this makes the session cookie
`Secure`/HTTPS-only). `APP_URL` **must** match your final public domain exactly, or
magic links and post-login redirects will point at the wrong host.

## 4. Deploy

- Import the GitHub repo (`ekowtee/katana`) into Vercel, or `vercel --prod`.
- Framework preset: **Vite**. Build: `vite build`. Output: `dist`. (Already in `vercel.json`.)
- Add the domain `katana.ninanigroup.com` under Project → Domains, then set
  `APP_URL` to it and redeploy.

## 5. TerraNova sign-in (optional)

Staff can arrive already signed in from TerraNova, the group's staff front door
(`POST /sso/terranova`, see `server/sso.mjs`). It only signs in emails that already
have an active account here; magic links keep working as before. The route answers
404 until `TERRANOVA_URL` is set, so it is safe to deploy first and switch on later.

1. Add the `terranova_jti` table to the cloud DB: `npm run cloud:schema`
   (re-runnable — it only creates what is missing).
2. In Vercel set `TERRANOVA_URL = https://terranova.ninanigroup.com` (no trailing
   slash) and redeploy.

`TERRANOVA_URL` also controls framing. While it is set, `middleware.js` (Vercel
Routing Middleware, run in front of the SPA's pages) sends
`Content-Security-Policy: frame-ancestors 'self' <TERRANOVA_URL's origin>`, so the
portal can be shown in a frame by TerraNova and by nobody else. While it is unset no
framing header is sent, exactly as before. No address is hard-coded anywhere; change
`TERRANOVA_URL` and redeploy if TerraNova moves.

Failed handoffs are limited to 10 per client address per 15 minutes (successes don't
count). The count is in memory, per function instance.

## How it works on Vercel

- `vercel.json` rewrites `/api/*` and `/sso/terranova` → the `api/index.mjs` function
  (the Express app); everything else falls back to `/index.html` for the React SPA router.
- SPA and API share the same origin (`katana.ninanigroup.com`), so the auth cookie
  works with no CORS or cross-site cookie config.
- Auth is stateless JWT in an httpOnly cookie — no server session store needed,
  which is exactly what serverless wants.

## Notes / gotchas

- **Email from serverless:** nodemailer/SMTP works from functions. For higher volume
  or better deliverability later, consider a transactional API (Resend/SendGrid).
- **Cold starts:** first request after idle is slightly slower while the function and
  DB connection warm up. Normal for serverless.
- **Local dev** (`npm run dev:all`) uses the Neon `katana_dev` database from `.env`,
  so it never touches production data.
