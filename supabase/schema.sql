-- Saaya (Supabase) schema
-- Run this in Supabase SQL Editor.

create extension if not exists "pgcrypto";
create extension if not exists "postgis";

-- Enums
do $$ begin
  create type public.journey_status as enum ('active', 'completed', 'cancelled');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.sos_status as enum ('triggered', 'acknowledged', 'resolved');
exception when duplicate_object then null;
end $$;

-- Contacts
create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  phone text not null,
  relationship text,
  created_at timestamptz not null default now()
);

-- Incidents / community reporting
create table if not exists public.incidents (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references auth.users(id) on delete set null,
  type text not null,
  severity int not null check (severity between 1 and 5),
  description text,
  lat double precision not null,
  lng double precision not null,
  geog geography(point, 4326) generated always as (
    st_setsrid(st_makepoint(lng, lat), 4326)::geography
  ) stored,
  verified boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists incidents_geog_gist on public.incidents using gist (geog);
create index if not exists incidents_created_at_idx on public.incidents (created_at desc);

-- Journeys
create table if not exists public.journeys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  origin_lat double precision not null,
  origin_lng double precision not null,
  dest_lat double precision not null,
  dest_lng double precision not null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  status public.journey_status not null default 'active'
);
create index if not exists journeys_user_started_idx on public.journeys (user_id, started_at desc);

-- SOS events (pluggable escalation)
create table if not exists public.sos_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  journey_id uuid references public.journeys(id) on delete set null,
  level int not null default 1 check (level between 1 and 3),
  status public.sos_status not null default 'triggered',
  created_at timestamptz not null default now()
);
create index if not exists sos_user_created_idx on public.sos_events (user_id, created_at desc);

-- Evidence files (metadata). Actual bytes live in Supabase Storage bucket "evidence".
create table if not exists public.evidence_files (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  sos_event_id uuid references public.sos_events(id) on delete set null,
  incident_id uuid references public.incidents(id) on delete set null,
  path text not null,
  mime text not null,
  created_at timestamptz not null default now()
);
create index if not exists evidence_user_created_idx on public.evidence_files (user_id, created_at desc);

-- Devices (push tokens)
create table if not exists public.devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  platform text not null default 'web',
  push_token text,
  created_at timestamptz not null default now()
);
create index if not exists devices_user_idx on public.devices (user_id, created_at desc);

-- SOS action audit log (escalation steps)
create table if not exists public.sos_actions (
  id uuid primary key default gen_random_uuid(),
  sos_event_id uuid not null references public.sos_events(id) on delete cascade,
  action text not null,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists sos_actions_event_idx on public.sos_actions (sos_event_id, created_at desc);

-- Community help (digital witnesses)
create table if not exists public.witness_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  sos_event_id uuid references public.sos_events(id) on delete set null,
  message text,
  lat double precision,
  lng double precision,
  status text not null default 'open', -- open/closed
  created_at timestamptz not null default now()
);
create index if not exists witness_requests_created_idx on public.witness_requests (created_at desc);

create table if not exists public.witness_responses (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.witness_requests(id) on delete cascade,
  helper_user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  status text not null default 'offered', -- offered/accepted/cancelled
  created_at timestamptz not null default now()
);
create index if not exists witness_responses_req_idx on public.witness_responses (request_id, created_at desc);

-- ===== RLS =====
alter table public.contacts enable row level security;
alter table public.incidents enable row level security;
alter table public.journeys enable row level security;
alter table public.sos_events enable row level security;
alter table public.evidence_files enable row level security;
alter table public.devices enable row level security;
alter table public.sos_actions enable row level security;
alter table public.witness_requests enable row level security;
alter table public.witness_responses enable row level security;

-- Contacts: owner only
drop policy if exists "contacts_select_own" on public.contacts;
create policy "contacts_select_own"
on public.contacts for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "contacts_write_own" on public.contacts;
create policy "contacts_write_own"
on public.contacts for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "contacts_update_own" on public.contacts;
create policy "contacts_update_own"
on public.contacts for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "contacts_delete_own" on public.contacts;
create policy "contacts_delete_own"
on public.contacts for delete
to authenticated
using (user_id = auth.uid());

-- Incidents: readable by anyone (anon + authenticated) so the dashboard can work without login
drop policy if exists "incidents_read" on public.incidents;
drop policy if exists "incidents_read_anon" on public.incidents;
create policy "incidents_read_anon"
on public.incidents for select
to anon
using (true);

create policy "incidents_read"
on public.incidents for select
to authenticated
using (true);

drop policy if exists "incidents_insert" on public.incidents;
create policy "incidents_insert"
on public.incidents for insert
to authenticated
with check (true);

-- Journeys: owner only
drop policy if exists "journeys_own" on public.journeys;
create policy "journeys_own"
on public.journeys for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- SOS events: owner only
drop policy if exists "sos_own" on public.sos_events;
create policy "sos_own"
on public.sos_events for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- Evidence metadata: owner only
drop policy if exists "evidence_own" on public.evidence_files;
create policy "evidence_own"
on public.evidence_files for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- Devices: owner only
drop policy if exists "devices_own" on public.devices;
create policy "devices_own"
on public.devices for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- SOS actions: only readable by owner via join with sos_events
drop policy if exists "sos_actions_read" on public.sos_actions;
create policy "sos_actions_read"
on public.sos_actions for select
to authenticated
using (
  exists (
    select 1 from public.sos_events se
    where se.id = sos_actions.sos_event_id and se.user_id = auth.uid()
  )
);

-- Witness requests/responses: UI-first policies (authenticated can read open requests; only owner can write own)
drop policy if exists "witness_requests_read" on public.witness_requests;
create policy "witness_requests_read"
on public.witness_requests for select
to authenticated
using (true);

drop policy if exists "witness_requests_write" on public.witness_requests;
create policy "witness_requests_write"
on public.witness_requests for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "witness_requests_update" on public.witness_requests;
create policy "witness_requests_update"
on public.witness_requests for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "witness_responses_read" on public.witness_responses;
create policy "witness_responses_read"
on public.witness_responses for select
to authenticated
using (true);

drop policy if exists "witness_responses_write" on public.witness_responses;
create policy "witness_responses_write"
on public.witness_responses for insert
to authenticated
with check (helper_user_id = auth.uid());

-- ===== Storage bucket + policies =====
-- Create bucket "evidence" (public = false).
insert into storage.buckets (id, name, public)
values ('evidence', 'evidence', false)
on conflict (id) do nothing;

-- Lock down objects to user-owned folder:
-- users/{auth.uid()}/...
drop policy if exists "evidence_read_own" on storage.objects;
create policy "evidence_read_own"
on storage.objects for select
to authenticated
using (
  bucket_id = 'evidence'
  and (storage.foldername(name))[1] = 'users'
  and (storage.foldername(name))[2] = auth.uid()::text
);

drop policy if exists "evidence_write_own" on storage.objects;
create policy "evidence_write_own"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'evidence'
  and (storage.foldername(name))[1] = 'users'
  and (storage.foldername(name))[2] = auth.uid()::text
);

drop policy if exists "evidence_delete_own" on storage.objects;
create policy "evidence_delete_own"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'evidence'
  and (storage.foldername(name))[1] = 'users'
  and (storage.foldername(name))[2] = auth.uid()::text
);
