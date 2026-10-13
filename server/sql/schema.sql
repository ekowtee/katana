-- ════════════════════════════════════════════════════════════════════════
--  THE NINANI GROUP FELLOWSHIP — Panel Portal schema  (PostgreSQL 18)
--  Access control is enforced at the API layer (see server/auth.mjs).
-- ════════════════════════════════════════════════════════════════════════

create extension if not exists pgcrypto;

-- ── Reference: panelists & criteria ─────────────────────────────────────────
create table if not exists panelists (
  id          serial primary key,
  name        text unique not null,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

create table if not exists criteria (
  key         text primary key,
  label       text not null,
  weight      numeric not null,
  sort_order  int not null default 0
);

-- ── Candidates ──────────────────────────────────────────────────────────────
create table if not exists candidates (
  id            uuid primary key default gen_random_uuid(),
  slug          text unique not null,
  name          text not null,
  gender        text,
  dob           date,
  email         text,
  phone         text,
  address       text,
  category      text,
  discipline    text,
  unit          text,
  institution   text,
  country       text,
  can_commit    boolean,
  rank          int,
  interview_day text,
  total_50      numeric,
  score_pct     numeric,
  recommendations_summary text,
  panel_reading text,
  status        text not null default 'review',
  scored        boolean not null default false,
  why_fellowship      text,
  career_ambitions    text,
  personal_statement  text,
  capstone            text,
  cv_summary          text,   -- panel's read of the CV (PANEL-ONLY, never shown to candidates)
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Added after the first cohort; brings existing databases up to date.
alter table candidates add column if not exists cv_summary text;

-- Aggregate (panel-average, normalised) score per criterion.
create table if not exists scores (
  candidate_slug text not null references candidates(slug) on delete cascade,
  criterion_key  text not null references criteria(key) on delete cascade,
  avg_norm       numeric,
  primary key (candidate_slug, criterion_key)
);

-- Verbatim per-panelist recommendation + comment (PANEL-ONLY, never shown to candidates).
create table if not exists panel_comments (
  id             bigserial primary key,
  candidate_slug text not null references candidates(slug) on delete cascade,
  panelist_name  text,
  recommendation text,
  rec_code       text,
  comment        text
);

-- Curated, admin-approved feedback shown to the candidate on their own page.
create table if not exists candidate_feedback (
  id             bigserial primary key,
  candidate_slug text not null references candidates(slug) on delete cascade,
  criterion_key  text references criteria(key) on delete set null,  -- null = overall summary
  body           text not null default '',
  approved       boolean not null default false,
  updated_at     timestamptz not null default now()
);
-- NULL criterion_key = the overall note; COALESCE keeps it unique (NULLs aren't distinct here).
create unique index if not exists candidate_feedback_uniq on candidate_feedback (candidate_slug, coalesce(criterion_key, ''));

-- ── App settings (singleton) ────────────────────────────────────────────────
create table if not exists app_settings (
  id          int primary key default 1,
  cutoff_rank int not null default 10,
  updated_at  timestamptz not null default now(),
  constraint app_settings_singleton check (id = 1)
);

-- ── Auth: accounts, login tokens ────────────────────────────────────────────
-- role: 'admin' | 'panel' | 'candidate'
create table if not exists accounts (
  id             uuid primary key default gen_random_uuid(),
  email          text unique not null,
  role           text not null check (role in ('admin','panel','candidate')),
  display_name   text,
  candidate_slug text references candidates(slug) on delete cascade, -- for role = candidate
  panelist_name  text,                                               -- for role = panel
  active         boolean not null default true,
  last_login_at  timestamptz,
  created_at     timestamptz not null default now()
);
create index if not exists accounts_email_idx on accounts (lower(email));

create table if not exists login_tokens (
  id          uuid primary key default gen_random_uuid(),
  account_id  uuid not null references accounts(id) on delete cascade,
  token_hash  text not null,          -- sha256 of the raw token
  purpose     text not null default 'login',
  expires_at  timestamptz not null,
  used_at     timestamptz,
  created_at  timestamptz not null default now()
);
create index if not exists login_tokens_account_idx on login_tokens (account_id);

-- TerraNova sign-in handoff: each token's jti is recorded until it expires so a
-- token can only be used once (the primary key is the replay check).
create table if not exists terranova_jti (
  jti         text primary key,
  expires_at  timestamptz not null
);

-- ── Interview assessment: cohorts, questions, per-question panel scores ─────
-- Each cohort sets its own weight per dimension (criteria) and its own questions.
create table if not exists cohorts (
  slug        text primary key,
  name        text not null,
  created_at  timestamptz not null default now()
);

-- The role this cohort is being interviewed for (shapes the CV summaries).
alter table cohorts add column if not exists role text;
-- Default venue / meeting link for the cohort's interviews (candidates can override).
alter table cohorts add column if not exists interview_location text;
-- "Closing the gate": once closed, scoring is locked and candidates can see
-- their outcome, feedback and CV summary. Reopening clears these.
alter table cohorts add column if not exists closed_at timestamptz;
alter table cohorts add column if not exists closed_by uuid references accounts(id) on delete set null;
-- The month the cohort interviews in (first of the month): dashboards and
-- pickers filter by month, then cohort. Backfilled from the earliest
-- interview slot, else the creation date (run after candidates.interview_at exists).
alter table cohorts add column if not exists period date;

-- Interview slot per candidate, sent to the panel (and optionally the
-- candidate) as a calendar invitation. interview_sequence is the iCalendar
-- SEQUENCE: it goes up on every (re)send so calendars treat it as an update.
alter table candidates add column if not exists interview_at timestamptz;
alter table candidates add column if not exists interview_minutes int not null default 45;
alter table candidates add column if not exists interview_location text;
alter table candidates add column if not exists interview_sequence int not null default 0;
alter table candidates add column if not exists invites_sent_at timestamptz;
alter table candidates add column if not exists result_sent_at timestamptz;

create table if not exists cohort_criteria (
  cohort_slug   text not null references cohorts(slug) on delete cascade,
  criterion_key text not null references criteria(key) on delete cascade,
  weight        numeric not null check (weight >= 0),
  primary key (cohort_slug, criterion_key)
);

alter table candidates add column if not exists cohort_slug text references cohorts(slug) on delete set null;

-- The staff (panel members and admins) who interview a cohort. Only they see
-- it on the dashboard, open its candidates' files (admins also can, from the
-- Admin pages) and score them.
create table if not exists cohort_panel (
  cohort_slug  text not null references cohorts(slug) on delete cascade,
  account_id   uuid not null references accounts(id) on delete cascade,
  added_at     timestamptz not null default now(),
  primary key (cohort_slug, account_id)
);

create table if not exists questions (
  id            bigserial primary key,
  cohort_slug   text not null references cohorts(slug) on delete cascade,
  criterion_key text not null references criteria(key) on delete cascade,
  body          text not null,
  sort_order    int not null default 0,
  created_at    timestamptz not null default now()
);
create index if not exists questions_cohort_idx on questions (cohort_slug, criterion_key, sort_order);
-- guidance: what a strong answer looks like (shown to the panel under the
-- question, e.g. a RiteVizor rubric anchor). source: 'manual' | 'ritevizor'.
alter table questions add column if not exists guidance text;
alter table questions add column if not exists source text not null default 'manual';
alter table questions add column if not exists created_by uuid references accounts(id) on delete set null;

-- One score (1–5) per question, per candidate, per panel member.
create table if not exists question_scores (
  question_id    bigint not null references questions(id) on delete cascade,
  candidate_slug text not null references candidates(slug) on delete cascade,
  account_id     uuid not null references accounts(id) on delete cascade,
  score          int not null check (score between 1 and 5),
  updated_at     timestamptz not null default now(),
  primary key (question_id, candidate_slug, account_id)
);

-- Panel notes entered in the app carry the panel member's account (one row each
-- per candidate); rows imported from a scoring workbook have none.
alter table panel_comments add column if not exists account_id uuid references accounts(id) on delete cascade;
create unique index if not exists panel_comments_account_uniq on panel_comments (candidate_slug, account_id);

-- ── CVs uploaded per cohort; Claude reads each one into a candidate + summary ─
-- status: 'uploaded' → 'processing' → 'done' | 'error'
create table if not exists cv_files (
  id             bigserial primary key,
  cohort_slug    text not null references cohorts(slug) on delete cascade,
  filename       text not null,
  content_type   text not null,
  size_bytes     int not null,
  data           bytea not null,
  status         text not null default 'uploaded',
  error          text,
  candidate_slug text references candidates(slug) on delete set null,
  uploaded_by    uuid references accounts(id) on delete set null,
  created_at     timestamptz not null default now(),
  processed_at   timestamptz
);
create index if not exists cv_files_cohort_idx on cv_files (cohort_slug, created_at);

-- ── Launch-page RSVPs (/launch), saved by POST /api/registrations ───────────
-- (Previously a Supabase table with the same columns; one RSVP per email.)
create table if not exists registrations (
  id            bigserial primary key,
  full_name     text not null,
  email         text not null,
  phone         text,
  city          text,
  organisation  text,
  source        text,
  consent       boolean not null default false,
  created_at    timestamptz not null default now()
);
create unique index if not exists registrations_email_uniq on registrations (lower(email));

-- ── Integration settings entered in Admin → Settings ('smtp', 'ai', 'ritevizor')
-- Passwords / API keys inside `config` are encrypted (see server/settings.mjs).
create table if not exists integration_settings (
  area        text primary key,
  config      jsonb not null default '{}',
  updated_at  timestamptz not null default now(),
  updated_by  uuid references accounts(id) on delete set null
);

-- Panel members draft candidate feedback too; who last edited each section.
alter table candidate_feedback add column if not exists updated_by uuid references accounts(id) on delete set null;

-- ── Emails sent by the portal: interview invitations and results ───────────
create table if not exists notifications (
  id             bigserial primary key,
  kind           text not null,                 -- 'interview_invite' | 'interview_cancel' | 'results'
  cohort_slug    text references cohorts(slug) on delete cascade,
  candidate_slug text references candidates(slug) on delete cascade,
  account_id     uuid references accounts(id) on delete set null,  -- staff recipient, for invites
  recipient      text not null,
  subject        text,
  delivered      boolean not null default false,
  error          text,
  sent_by        uuid references accounts(id) on delete set null,
  created_at     timestamptz not null default now()
);
create index if not exists notifications_cohort_idx on notifications (cohort_slug, created_at);

-- ── updated_at trigger ──────────────────────────────────────────────────────
create or replace function touch_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end; $$ language plpgsql;

drop trigger if exists candidates_touch on candidates;
create trigger candidates_touch before update on candidates
  for each row execute function touch_updated_at();

drop trigger if exists feedback_touch on candidate_feedback;
create trigger feedback_touch before update on candidate_feedback
  for each row execute function touch_updated_at();


-- ── Backfills (last, so every column they read exists) ──────────────────────
-- A cohort without an interview month takes it from its earliest interview
-- slot, else from when it was created.
update cohorts co set period = date_trunc('month', coalesce(
    (select min(c.interview_at) from candidates c where c.cohort_slug = co.slug), co.created_at))::date
 where co.period is null;
