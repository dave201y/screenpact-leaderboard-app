-- Persistent groups and memberships for the account-based app.
create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 40),
  invite_code text not null unique check (invite_code ~ '^[A-Z0-9]{6,12}$'),
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.group_members (
  group_id uuid not null references public.groups (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create index if not exists idx_group_members_user_id on public.group_members (user_id);
create unique index if not exists idx_one_group_owner on public.group_members (group_id) where role = 'owner';

alter table public.groups enable row level security;
alter table public.group_members enable row level security;

drop policy if exists "groups members can view" on public.groups;
create policy "groups members can view"
  on public.groups for select using (
    exists (
      select 1 from public.group_members
      where group_members.group_id = groups.id
        and group_members.user_id = auth.uid()
    )
  );

drop policy if exists "group members can view membership" on public.group_members;
create policy "group members can view membership"
  on public.group_members for select using (auth.uid() = user_id);
