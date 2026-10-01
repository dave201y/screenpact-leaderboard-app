-- Seed data for local testing.
-- Replace the user id below with a real auth.users id from Supabase Auth.

-- Example user id format: 11111111-2222-3333-4444-555555555555
-- You can find it in Authentication -> Users.

-- Optional cleanup
delete from public.leaderboard_daily;
delete from public.app_usage;
delete from public.daily_usage;
delete from public.achievements;
delete from public.user_settings;
delete from public.profiles;

-- Replace this UUID before running.
-- Do not include quotes in psql variable usage.
-- In Supabase SQL editor, easiest is direct string replace.

insert into public.profiles (
  id, display_name, initials, avatar_color, member_since, groups_count, rank, avg_daily_minutes
) values (
  '00000000-0000-0000-0000-000000000000', 'You', 'YO', 'purple', 'March 2026', 1, 3, 231
);

insert into public.user_settings (
  user_id, notifications, dark_mode, daily_goal_minutes
) values (
  '00000000-0000-0000-0000-000000000000', true, false, 180
);

insert into public.achievements (user_id, sort_order, icon, label, value, color) values
('00000000-0000-0000-0000-000000000000', 1, 'trophy', '1st Place Finishes', '3', 'text-sp-gold'),
('00000000-0000-0000-0000-000000000000', 2, 'trending-down', 'Best Reduction', '2h 14m', 'text-sp-green'),
('00000000-0000-0000-0000-000000000000', 3, 'calendar', 'Days Tracked', '28', 'text-sp-blue'),
('00000000-0000-0000-0000-000000000000', 4, 'flame', 'Current Streak', '5 days', 'text-sp-coral');

insert into public.daily_usage (user_id, date, total_minutes, delta_minutes, rank) values
('00000000-0000-0000-0000-000000000000', current_date - interval '6 days', 245, -10, 4),
('00000000-0000-0000-0000-000000000000', current_date - interval '5 days', 312, 22, 5),
('00000000-0000-0000-0000-000000000000', current_date - interval '4 days', 198, -17, 2),
('00000000-0000-0000-0000-000000000000', current_date - interval '3 days', 287, 15, 4),
('00000000-0000-0000-0000-000000000000', current_date - interval '2 days', 230, -8, 3),
('00000000-0000-0000-0000-000000000000', current_date - interval '1 days', 341, 41, 6),
('00000000-0000-0000-0000-000000000000', current_date, 158, -22, 3);

insert into public.app_usage (user_id, date, app_name, app_icon, minutes, color) values
('00000000-0000-0000-0000-000000000000', current_date, 'YouTube', '▶️', 68, 'hsl(0 72% 51%)'),
('00000000-0000-0000-0000-000000000000', current_date, 'Messages', '💬', 32, 'hsl(92 60% 25%)'),
('00000000-0000-0000-0000-000000000000', current_date, 'Instagram', '📸', 24, 'hsl(340 48% 40%)'),
('00000000-0000-0000-0000-000000000000', current_date, 'Safari', '🌐', 18, 'hsl(213 72% 37%)'),
('00000000-0000-0000-0000-000000000000', current_date, 'Spotify', '🎵', 14, 'hsl(160 77% 30%)'),
('00000000-0000-0000-0000-000000000000', current_date, 'Other', '···', 2, 'hsl(0 0% 53%)');

insert into public.leaderboard_daily (
  date, user_id, display_name, initials, avatar_color, total_minutes, top_app_name, top_app_icon, delta_minutes, is_you
) values
(current_date, null, 'Alex', 'AL', 'teal', 72, 'Messages', '💬', -48, false),
(current_date, null, 'Jordan', 'JO', 'blue', 118, 'Instagram', '📸', 12, false),
(current_date, '00000000-0000-0000-0000-000000000000', 'You', 'YO', 'purple', 158, 'YouTube', '▶️', -22, true),
(current_date, null, 'Sam', 'SA', 'coral', 201, 'TikTok', '🎵', 34, false),
(current_date, null, 'Riley', 'RI', 'pink', 243, 'Reddit', '📱', 5, false),
(current_date, null, 'Casey', 'CA', 'amber', 297, 'Twitter/X', '🐦', 61, false);
