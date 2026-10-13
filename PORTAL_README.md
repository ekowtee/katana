# Katana — Interview Portal (developer notes)

The Ninani Group's interview portal: cohorts of applicants go from CV to decision.
Administrators set a cohort up, CVs are summarised by an AI provider for the panel,
interviews are scheduled with calendar invitations, panel members score every candidate
against the cohort's questions, and closing the cohort emails each candidate their outcome
and releases the panel's feedback to them.

For how to *use* it, see [USER-GUIDE.md](USER-GUIDE.md). For hosting, see
[DEPLOY-VERCEL.md](DEPLOY-VERCEL.md).

---

## Architecture

```
Browser SPA (React + Vite)            ─ src/portal/
   │  /api/*  ──▶  Express API          ─ server/  (one Vercel function: api/index.mjs)
   │                  │
   │                  ├─▶ PostgreSQL (Neon `katana`; local Postgres `katana` in dev)
   │                  ├─▶ SMTP            sign-in links, calendar invitations, outcome emails
   │                  ├─▶ AI provider     CV → candidate + summary (Anthropic / OpenAI / Gemini / xAI / Moonshot)
   │                  └─▶ RiteVizor API   rubric dimensions + band anchors → interview questions
   └─ /launch: the original event landing page (RSVPs via POST /api/registrations)
```

| Module | What it owns |
|---|---|
| `server/index.mjs` | App wiring, auth routes, dashboard, candidate file, candidate's own page (`/api/me`), feedback, admin accounts |
| `server/auth.mjs` | Magic-link tokens, signed-JWT session cookie, `requireAuth(roles…)` |
| `server/sso.mjs` | TerraNova sign-in handoff (`POST /sso/terranova`) |
| `server/assessment.mjs` | Cohorts, interview panels, questions (admin + panel), per-question scoring, score/rank recomputation |
| `server/interviews.mjs` | Interview slots, calendar invitations (.ics), closing / reopening a cohort, outcome emails, notification log |
| `server/calendar.mjs` | iCalendar builder (REQUEST / CANCEL, SEQUENCE for updates) |
| `server/cv-ingest.mjs`, `server/ai.mjs` | CV upload, AI reading of CVs into candidates + summaries |
| `server/ritevizor.mjs` | RiteVizor client (`/api/v1/integrations/rubrics`), rubric → questions import |
| `server/settings.mjs`, `server/settings-routes.mjs` | Admin-entered SMTP / AI / RiteVizor settings, encrypted at rest (AES-256-GCM keyed from `JWT_SECRET`); env vars as fallback |
| `server/mailer.mjs` | Email templates and sending (nodemailer); every email says it's from "Ninani Group HR" |
| `server/registrations.mjs` | Launch-page RSVPs |
| `server/sql/schema.sql` | The whole schema; re-runnable (`create … if not exists`, `add column if not exists`) |

### Routes (browser)

| Route | Who | What |
|---|---|---|
| `/portal/login` | everyone | Email → sign-in link |
| `/portal` | panel + admin | Dashboard, one cohort at a time, scoped to cohorts you're on the panel for |
| `/portal/candidate/:slug` | panel + admin | CV summary, your assessment (scores, recommendation, notes), score breakdown, panel notes, feedback draft |
| `/portal/me` | candidate | Interview slot; after the cohort is closed: outcome, published feedback, scores, CV summary without "Points to probe" |
| `/portal/admin` | admin | Access & Invites · Cohorts (role, weights, panel, CVs, interviews, questions, close) · Candidate Feedback · Settings |
| `/launch` | public | Event landing page |

### Access control

Enforced in the API (`requireAuth`, `mayView`, `onPanel` in `server/assessment.mjs`):

- **Candidate**: only `/api/me`; sees status, feedback, scores and CV summary only once their cohort is closed. Panel notes and individual scores are never sent.
- **Panel member**: cohorts they're on the panel for (`cohort_panel`). May score, recommend, add questions (editable until scored) and draft feedback there. Nothing elsewhere.
- **Admin**: everything, but can only *score* a cohort they're on the panel for, and the dashboard shows only their panel cohorts.

### Data model (the interview part)

```
cohorts ─┬─ cohort_criteria   weight per dimension (criteria: behavioural, technical, experience, appearance)
         ├─ cohort_panel      staff who interview it
         ├─ questions         per dimension; guidance; source manual|ritevizor; created_by
         ├─ candidates ─┬─ question_scores   one row per question × candidate × panel member (1–5)
         │              ├─ scores            derived: points per dimension (mean of panelist means / 5 × weight)
         │              ├─ panel_comments    each panel member's recommendation + notes
         │              ├─ candidate_feedback  drafted by panel, approved by admin (approved = visible to candidate)
         │              └─ cv_files
         └─ closed_at        set by "close": scoring locked, results released
notifications                every email sent (invitations, cancellations, outcomes) with delivery result
```

A candidate's `total_50` / `score_pct` / `rank` and `recommendations_summary` are recomputed by
`recomputeCandidate()` after every save.

---

## Running it locally

```bash
npm install
npm run db:schema      # apply the schema to your local Postgres (database `katana`; PG* vars in .env)
npm run dev:all        # Vite (5173) + API (8787)
```

Open http://localhost:5173/portal/login. Without SMTP, sign-in links are printed to the API
console; or as an admin use **Access & Invites → Copy link**.

Settings for SMTP, the AI provider and RiteVizor are entered in **Admin → Settings** and stored
in the database; the `SMTP_*`, `ANTHROPIC_API_KEY`, `RITEVIZOR_API_URL` / `RITEVIZOR_API_KEY`
env vars are fallbacks.

```bash
npm test               # unit tests (TerraNova SSO)
npm run build          # production build
npm run lint
```

### Seed data

`npm run ingest` turns `scripts/contacts.mjs` (candidate details + CV summaries, and the cohort
they belong to) into `supabase/seed.sql`; `npm run db:seed` loads it. Both are re-runnable and
never overwrite scores, notes, feedback or summaries entered through the app. The seed and the
CVs in `Fellowship Applicants/` contain personal data and are git-ignored.

### Testing against a throwaway database

The end-to-end checks used during development start a disposable Postgres on `:55432`, point
`PGPORT`/`PGDATABASE` at it, mock `nodemailer.createTransport` (to capture emails) and `fetch`
for the RiteVizor host, then drive the real API. See the commit history of `backups/e2e-*.mjs`
for the pattern. **Never run tests against `DATABASE_URL`/`PROD_DATABASE_URL`.**

---

## Integrations

- **RiteVizor** (`server/ritevizor.mjs`): `GET {url}/api/v1/integrations/rubrics[/:slug]` with
  `x-api-key`. On RiteVizor the endpoint is gated by `KATANA_API_KEY`
  (`apps/api/src/routes/v1/integrations.ts`). Each rubric dimension imports as one question;
  the chosen band's anchor becomes the question's guidance.
- **Calendar invitations**: plain `.ics` attached as `icalEvent` (method REQUEST / CANCEL) with
  a stable UID per candidate and an incrementing SEQUENCE, so re-sending updates the entry.
- **TerraNova**: see `server/sso.mjs` and DEPLOY-VERCEL.md § TerraNova.
