-- Atomic usage-sync verification script.
-- Requires a Supabase test database with server/sql/schema.sql and
-- server/sql/migrations/001_atomic_usage_sync.sql applied.
-- Run in a transaction and roll back; do not run against production data.

begin;

do $$
declare
  test_user uuid;
  first_result jsonb;
  retry_result jsonb;
  daily_count integer;
  app_count integer;
  leaderboard_count integer;
begin
  select id into test_user from auth.users order by created_at limit 1;
  if test_user is null then
    raise exception 'No auth.users row is available for the atomic sync test';
  end if;

  first_result := public.sync_usage_summary(
    test_user,
    date '2099-01-15',
    120,
    jsonb_build_object('name', 'Browser', 'icon', '📱', 'minutes', 60),
    jsonb_build_array(jsonb_build_object('name', 'Browser', 'icon', '📱', 'minutes', 60)),
    'Atomic Test User',
    'AT',
    'blue'
  );

  retry_result := public.sync_usage_summary(
    test_user,
    date '2099-01-15',
    120,
    jsonb_build_object('name', 'Browser', 'icon', '📱', 'minutes', 60),
    jsonb_build_array(jsonb_build_object('name', 'Browser', 'icon', '📱', 'minutes', 60)),
    'Atomic Test User',
    'AT',
    'blue'
  );

  if first_result <> retry_result then
    raise exception 'Retry result differs from the original idempotent result';
  end if;

  select count(*) into daily_count from public.daily_usage where user_id = test_user and date = date '2099-01-15';
  select count(*) into app_count from public.app_usage where user_id = test_user and date = date '2099-01-15';
  select count(*) into leaderboard_count from public.leaderboard_daily where user_id = test_user and date = date '2099-01-15';

  if daily_count <> 1 or app_count <> 1 or leaderboard_count <> 1 then
    raise exception 'Duplicate retry created extra rows: daily %, apps %, leaderboard %', daily_count, app_count, leaderboard_count;
  end if;

  delete from public.daily_usage where user_id = test_user and date = date '2099-01-16';
  delete from public.app_usage where user_id = test_user and date = date '2099-01-16';
  delete from public.leaderboard_daily where user_id = test_user and date = date '2099-01-16';

  begin
    perform public.sync_usage_summary(
      test_user,
      date '2099-01-16',
      121,
      jsonb_build_object('name', 'Browser', 'icon', '📱', 'minutes', 60),
      jsonb_build_array(jsonb_build_object('name', 'Browser', 'minutes', 'not-a-number')),
      'Atomic Test User',
      'AT',
      'blue'
    );
    raise exception 'Expected invalid app minutes to fail';
  exception when others then
    null;
  end;

  select count(*) into daily_count from public.daily_usage where user_id = test_user and date = date '2099-01-16';
  select count(*) into app_count from public.app_usage where user_id = test_user and date = date '2099-01-16';
  select count(*) into leaderboard_count from public.leaderboard_daily where user_id = test_user and date = date '2099-01-16';

  if daily_count <> 0 or app_count <> 0 or leaderboard_count <> 0 then
    raise exception 'Partial failure left rows behind: daily %, apps %, leaderboard %', daily_count, app_count, leaderboard_count;
  end if;
end;
$$;

rollback;
