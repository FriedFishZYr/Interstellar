-- Tidal Forecast Mission: the two tables that receive study data.
-- Run this once in the Supabase SQL editor (Project → SQL Editor → New query → Run).
--
-- The module uses the project's publishable (anon) key, which is public in the page source.
-- Row-level security therefore allows that key to ADD rows and nothing else: it cannot read,
-- change or delete anyone's data. Read the data in the dashboard (Table Editor) or with the
-- secret key, never from the page.
--
-- Columns are text rather than uuid on purpose: one malformed value would otherwise reject a
-- whole batch of events.

create table if not exists public.session_snapshots (
  id              bigint generated always as identity primary key,
  received_at     timestamptz not null default now(),
  participant_id  text,
  session_id      text,
  condition       text,
  module_version  text,
  dev             boolean not null default false,
  reason          text,
  client_time     timestamptz,
  record          jsonb not null
);

create table if not exists public.events (
  id              bigint generated always as identity primary key,
  received_at     timestamptz not null default now(),
  participant_id  text,
  session_id      text,
  condition       text,
  module_version  text,
  dev             boolean not null default false,
  seq             integer,
  client_time     timestamptz,
  type            text,
  page            text,
  data            jsonb
);

create index if not exists session_snapshots_participant on public.session_snapshots (participant_id, received_at);
create index if not exists events_participant on public.events (participant_id, seq);

alter table public.session_snapshots enable row level security;
alter table public.events enable row level security;

drop policy if exists "page can add snapshots" on public.session_snapshots;
create policy "page can add snapshots" on public.session_snapshots
  for insert to anon with check (true);

drop policy if exists "page can add events" on public.events;
create policy "page can add events" on public.events
  for insert to anon with check (true);

grant insert on public.session_snapshots, public.events to anon;

-- Views for analysis (security_invoker: the public key can't read them either).

-- The latest snapshot of each mission session: the one to analyze.
create or replace view public.latest_snapshots with (security_invoker = true) as
  select distinct on (session_id) *
  from public.session_snapshots
  where not dev
  order by session_id, received_at desc;

-- Events without duplicates (an event can arrive twice if a closing tab's request also went
-- out again from the browser's outbox on the next visit).
create or replace view public.events_clean with (security_invoker = true) as
  select distinct on (participant_id, session_id, seq) *
  from public.events
  where not dev
  order by participant_id, session_id, seq, received_at;
