-- Atomic, idempotent usage synchronization.
-- Apply after server/sql/schema.sql in the Supabase SQL editor.
-- The server invokes this function with the service-role client only.

create or replace function public.sync_usage_summary(
  p_user_id uuid,
  p_sync_date date,
  p_total_minutes integer,
  p_top_app jsonb,
  p_apps jsonb,
  p_display_name text,
  p_initials text,
  p_avatar_color text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  previous_total integer;
  delta_minutes integer;
  calculated_rank integer;
  average_minutes integer;
  app_count integer;
begin
  if p_user_id is null or p_sync_date is null then
    raise exception 'user_id and sync_date are required';
  end if;

  if p_total_minutes < 0 or p_total_minutes > 1440 then
    raise exception 'total_minutes must be between 0 and 1440';
  end if;

  if coalesce(trim(p_top_app->>'name'), '') = '' then
    raise exception 'top_app.name is required';
  end if;

  select total_minutes
    into previous_total
    from public.daily_usage
   where user_id = p_user_id
     and date = p_sync_date - 1;

  delta_minutes := p_total_minutes - coalesce(previous_total, p_total_minutes);

  insert into public.daily_usage (user_id, date, total_minutes, delta_minutes)
  values (p_user_id, p_sync_date, p_total_minutes, delta_minutes)
  on conflict (user_id, date) do update
    set total_minutes = excluded.total_minutes,
        delta_minutes = excluded.delta_minutes;

  delete from public.app_usage
   where user_id = p_user_id
     and date = p_sync_date;

  insert into public.app_usage (user_id, date, app_name, app_icon, minutes, color)
  select
    p_user_id,
    p_sync_date,
    trim(app_row->>'name'),
    coalesce(nullif(trim(app_row->>'icon'), ''), '📱'),
    greatest(0, round(coalesce(nullif(app_row->>'minutes', '')::numeric, 0))::integer),
    nullif(app_row->>'color', '')
  from jsonb_array_elements(coalesce(p_apps, '[]'::jsonb)) as app_row
  where trim(coalesce(app_row->>'name', '')) <> '';

  calculated_rank := 1 + (
    select count(*)
      from public.daily_usage
     where date = p_sync_date
       and total_minutes < p_total_minutes
  );

  update public.daily_usage
     set rank = calculated_rank
   where user_id = p_user_id
     and date = p_sync_date;

  insert into public.leaderboard_daily (
    date,
    user_id,
    display_name,
    initials,
    avatar_color,
    total_minutes,
    top_app_name,
    top_app_icon,
    delta_minutes,
    is_you
  ) values (
    p_sync_date,
    p_user_id,
    p_display_name,
    p_initials,
    p_avatar_color,
    p_total_minutes,
    trim(p_top_app->>'name'),
    coalesce(nullif(trim(p_top_app->>'icon'), ''), '📱'),
    delta_minutes,
    true
  )
  on conflict (date, user_id) do update
    set display_name = excluded.display_name,
        initials = excluded.initials,
        avatar_color = excluded.avatar_color,
        total_minutes = excluded.total_minutes,
        top_app_name = excluded.top_app_name,
        top_app_icon = excluded.top_app_icon,
        delta_minutes = excluded.delta_minutes,
        is_you = excluded.is_you;

  select coalesce(round(avg(total_minutes))::integer, 0)
    into average_minutes
    from public.daily_usage
   where user_id = p_user_id
     and date >= p_sync_date - 29;

  insert into public.profiles (
    id,
    display_name,
    initials,
    avatar_color,
    member_since,
    groups_count,
    rank,
    avg_daily_minutes
  ) values (
    p_user_id,
    p_display_name,
    p_initials,
    p_avatar_color,
    'April 2026',
    1,
    calculated_rank,
    average_minutes
  )
  on conflict (id) do update
    set display_name = excluded.display_name,
        initials = excluded.initials,
        avatar_color = excluded.avatar_color,
        rank = excluded.rank,
        avg_daily_minutes = excluded.avg_daily_minutes;

  select count(*) into app_count
    from jsonb_array_elements(coalesce(p_apps, '[]'::jsonb));

  return jsonb_build_object(
    'source', 'supabase',
    'synced', true,
    'date', p_sync_date,
    'stored', jsonb_build_object(
      'totalMinutes', p_total_minutes,
      'deltaMinutes', delta_minutes,
      'topApp', p_top_app,
      'appsCount', app_count,
      'rank', calculated_rank
    )
  );
end;
$$;

revoke execute on function public.sync_usage_summary(uuid, date, integer, jsonb, jsonb, text, text, text) from public, anon, authenticated;
grant execute on function public.sync_usage_summary(uuid, date, integer, jsonb, jsonb, text, text, text) to service_role;
