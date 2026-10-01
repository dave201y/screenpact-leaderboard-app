-- Core tables for Screenpact leaderboard app.
-- Run in Supabase SQL editor.

-- Persistent server-side session store for express-session.
create table if not exists public.sessions (
  sid text primary key,
  sess jsonb not null,
  expire timestamptz not null
);

create index if not exists sessions_expire_idx on public.sessions (expire);

-- Optional: auto-clean expired sessions daily so the table does not grow forever.
-- Requires pg_cron extension (enable in Database > Extensions in Supabase dashboard).
--
-- select cron.schedule('cleanup-sessions', '0 3 * * *', $$
--   delete from public.sessions where expire < now();
-- $$);

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  initials text not null,
  avatar_color text not null default 'purple',
  member_since text not null,
  groups_count int not null default 1,
  rank int not null default 0,
  avg_daily_minutes int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.leaderboard_daily (
  id bigserial primary key,
  date date not null,
  user_id uuid references auth.users (id) on delete cascade,
  display_name text not null,
  initials text not null,
  avatar_color text not null,
  total_minutes int not null,
  top_app_name text not null,
  top_app_icon text not null,
  delta_minutes int not null default 0,
  is_you boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_leaderboard_daily_date on public.leaderboard_daily (date);
create unique index if not exists idx_leaderboard_daily_date_user_unique on public.leaderboard_daily (date, user_id);

create table if not exists public.daily_usage (
  id bigserial primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  total_minutes int not null,
  delta_minutes int not null default 0,
  rank int,
  created_at timestamptz not null default now(),
  unique (user_id, date)
);

create table if not exists public.app_usage (
  id bigserial primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  app_name text not null,
  app_icon text not null,
  minutes int not null,
  color text,
  created_at timestamptz not null default now()
);

create index if not exists idx_app_usage_user_date on public.app_usage (user_id, date);

create table if not exists public.achievements (
  id bigserial primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  sort_order int not null default 0,
  icon text not null,
  label text not null,
  value text not null,
  color text,
  created_at timestamptz not null default now()
);

create table if not exists public.user_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  notifications boolean not null default true,
  dark_mode boolean not null default false,
  daily_goal_minutes int not null default 180,
  updated_at timestamptz not null default now()
);

create table if not exists public.devices (
  id bigserial primary key,
  owner_key text not null,
  user_id uuid references auth.users (id) on delete set null,
  device_name text not null,
  platform text not null default 'web',
  permission_status text not null default 'unknown' check (permission_status in ('unknown', 'requested', 'granted', 'denied', 'restricted')),
  permission_updated_at timestamptz,
  device_token_hash text,
  token_issued_at timestamptz,
  token_last_used_at timestamptz,
  created_at timestamptz not null default now(),
  last_synced_at timestamptz,
  revoked_at timestamptz
);

alter table public.devices add column if not exists permission_status text not null default 'unknown';
alter table public.devices add column if not exists permission_updated_at timestamptz;
alter table public.devices add column if not exists device_token_hash text;
alter table public.devices add column if not exists token_issued_at timestamptz;
alter table public.devices add column if not exists token_last_used_at timestamptz;

alter table public.devices
  drop constraint if exists devices_permission_status_check;
alter table public.devices
  add constraint devices_permission_status_check
  check (permission_status in ('unknown', 'requested', 'granted', 'denied', 'restricted'));

create index if not exists idx_devices_owner_key on public.devices (owner_key);
create index if not exists idx_devices_user_id on public.devices (user_id);
create unique index if not exists idx_devices_token_hash_unique on public.devices (device_token_hash) where device_token_hash is not null;

create table if not exists public.device_pairing_codes (
  id bigserial primary key,
  owner_key text not null,
  user_id uuid references auth.users (id) on delete set null,
  code text not null unique,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  consumed_at timestamptz
);

create index if not exists idx_device_pairing_codes_owner_key on public.device_pairing_codes (owner_key);
create index if not exists idx_device_pairing_codes_expires_at on public.device_pairing_codes (expires_at);

create table if not exists public.device_sync_logs (
  id bigserial primary key,
  device_id bigint not null references public.devices (id) on delete cascade,
  synced_at timestamptz not null default now(),
  status text not null default 'ok' check (status in ('ok', 'partial', 'error')),
  detail text
);

create index if not exists idx_device_sync_logs_device_id on public.device_sync_logs (device_id, synced_at desc);

create table if not exists public.privacy_requests (
  id bigserial primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  request_type text not null check (request_type in ('export', 'delete')),
  status text not null default 'pending' check (status in ('pending', 'processing', 'completed', 'rejected')),
  note text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists idx_privacy_requests_user_created on public.privacy_requests (user_id, created_at desc);

alter table public.profiles enable row level security;
alter table public.leaderboard_daily enable row level security;
alter table public.daily_usage enable row level security;
alter table public.app_usage enable row level security;
alter table public.achievements enable row level security;
alter table public.user_settings enable row level security;
alter table public.devices enable row level security;
alter table public.device_pairing_codes enable row level security;
alter table public.device_sync_logs enable row level security;
alter table public.privacy_requests enable row level security;

-- Basic RLS examples. Adjust for your exact security model.
drop policy if exists "profiles select own" on public.profiles;
create policy "profiles select own"
  on public.profiles for select using (auth.uid() = id);

drop policy if exists "settings select own" on public.user_settings;
create policy "settings select own"
  on public.user_settings for select using (auth.uid() = user_id);

drop policy if exists "settings update own" on public.user_settings;
create policy "settings update own"
  on public.user_settings for update using (auth.uid() = user_id);

drop policy if exists "daily usage select own" on public.daily_usage;
create policy "daily usage select own"
  on public.daily_usage for select using (auth.uid() = user_id);

drop policy if exists "app usage select own" on public.app_usage;
create policy "app usage select own"
  on public.app_usage for select using (auth.uid() = user_id);

drop policy if exists "achievements select own" on public.achievements;
create policy "achievements select own"
  on public.achievements for select using (auth.uid() = user_id);

drop policy if exists "privacy requests select own" on public.privacy_requests;
create policy "privacy requests select own"
  on public.privacy_requests for select using (auth.uid() = user_id);

drop policy if exists "privacy requests insert own" on public.privacy_requests;
create policy "privacy requests insert own"
  on public.privacy_requests for insert with check (auth.uid() = user_id);

drop policy if exists "devices select own" on public.devices;
create policy "devices select own"
  on public.devices for select using (auth.uid() = user_id);

drop policy if exists "devices insert own" on public.devices;
create policy "devices insert own"
  on public.devices for insert with check (auth.uid() = user_id);

drop policy if exists "devices update own" on public.devices;
create policy "devices update own"
  on public.devices for update using (auth.uid() = user_id);

drop policy if exists "device pairing select own" on public.device_pairing_codes;
create policy "device pairing select own"
  on public.device_pairing_codes for select using (auth.uid() = user_id);

drop policy if exists "device pairing insert own" on public.device_pairing_codes;
create policy "device pairing insert own"
  on public.device_pairing_codes for insert with check (auth.uid() = user_id);

drop policy if exists "device sync logs select own" on public.device_sync_logs;
create policy "device sync logs select own"
  on public.device_sync_logs for select using (
    exists (
      select 1
      from public.devices d
      where d.id = device_id and d.user_id = auth.uid()
    )
  );

-- Leaderboard can be public read if you want rankings visible.
drop policy if exists "leaderboard public read" on public.leaderboard_daily;
create policy "leaderboard public read"
  on public.leaderboard_daily for select using (true);
