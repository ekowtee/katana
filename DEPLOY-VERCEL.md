# Deploying the portal to Vercel

The app is one Vercel project: the Vite SPA (static) + the Express API as a single
serverless function (`api/index.mjs`). Routing is handled by `vercel.json`.

> **Why a cloud database?** Vercel functions run in the cloud and cannot reach your
> local Postgres (`localhost:5432`). You must move the database to a hosted Postgres.

---

## 1. Provision a cloud Postgres

Pick one (all work — the code only needs a connection string):

| Provider | How | Env var |
|---|---|---|
| **Vercel Postgres** (recommended) | Vercel dashboard → Storage → Create → Postgres → connect to the project | auto-sets `POSTGRES_URL` |
| **Neon** | neon.tech → new project → copy the **pooled** connection string | set `DATABASE_URL` |
| **Supabase** | Project → Settings → Database → **Connection pooling** string (port 6543) | set `DATABASE_URL` |

Always use the **pooled** connection string (serverless opens many short-lived
connections). `db.mjs` reads `DATABASE_URL` first, then `POSTGRES_URL`.

## 2. Load schema + data into the cloud DB

From your machine, point the cloud scripts at the connection string and push
everything (schema, candidates/scores/comments, accounts, feedback drafts):

```bash
# Bash:
export DATABASE_URL='postgres://user:pass@host/db?sslmode=require'
npm run ingest            # regenerate seed.sql (if needed)
npm run cloud:push        # schema → seed → accounts → feedback drafts
```
```powershell
# PowerShell:
$env:DATABASE_URL = 'postgres://user:pass@host/db?sslmode=require'
npm run ingest
npm run cloud:push
```

`cloud:push` runs: `cloud:schema` → `cloud:seed` → `db:accounts` → `db:feedback`.
(Needs `psql` on PATH; you already have it via scoop.)

## 3. Set environment variables in Vercel

Project → Settings → Environment Variables (Production):

```
DATABASE_URL   = <pooled connection string>      # skip if using Vercel Postgres (POSTGRES_URL is auto)
APP_URL        = https://katana.ninanigroup.com  # your public domain, no trailing slash
JWT_SECRET     = <run: node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))">
SMTP_HOST      = smtp.gmail.com
SMTP_PORT      = 587
SMTP_SECURE    = false
SMTP_USER      = tools@interactivedigital.com.gh
SMTP_PASSWORD  = <app password>
SMTP_FROM      = D.A. Twum Jnr. Fellowship <hr@interactivedigital.com.gh>
```

`NODE_ENV=production` is set by Vercel automatically (this makes the session cookie
`Secure`/HTTPS-only). `APP_URL` **must** match your final public domain exactly, or
magic links and post-login redirects will point at the wrong host.

## 4. Deploy

- Import the GitHub repo (`ekowtee/katana`) into Vercel, or `vercel --prod`.
- Framework preset: **Vite**. Build: `vite build`. Output: `dist`. (Already in `vercel.json`.)
- Add the domain `katana.ninanigroup.com` under Project → Domains, then set
  `APP_URL` to it and redeploy.

## How it works on Vercel

- `vercel.json` rewrites `/api/*` → the `api/index.mjs` function (the Express app);
  everything else falls back to `/index.html` for the React SPA router.
- SPA and API share the same origin (`katana.ninanigroup.com`), so the auth cookie
  works with no CORS or cross-site cookie config.
- Auth is stateless JWT in an httpOnly cookie — no server session store needed,
  which is exactly what serverless wants.

## Notes / gotchas

- **Email from serverless:** nodemailer/SMTP works from functions. For higher volume
  or better deliverability later, consider a transactional API (Resend/SendGrid).
- **Cold starts:** first request after idle is slightly slower while the function and
  DB connection warm up. Normal for serverless.
- **Local dev is unchanged:** without `DATABASE_URL`/`POSTGRES_URL`, the app still uses
  your local Postgres and `npm run dev:all`.
