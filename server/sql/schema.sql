-- ════════════════════════════════════════════════════════════════════════
--  D. A. TWUM JNR. FELLOWSHIP — Panel Portal schema  (PostgreSQL 18)
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
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

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

-- ── updated_at trigger ──────────────────────────────────────────────────────
create or replace function touch_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end; $$ language plpgsql;

drop trigger if exists candidates_touch on candidates;
create trigger candidates_touch before update on candidates
  for each row execute function touch_updated_at();

drop trigger if exists feedback_touch on candidate_feedback;
create trigger feedback_touch before update on candidate_feedback
  for each row execute function touch_updated_at();
