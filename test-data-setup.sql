-- Test Data Setup Script for Commitment App
-- This creates realistic test data to showcase the group features

-- Note: Run this through Supabase dashboard or with proper admin permissions

-- 1. Test Users for the "Girls" group (4e6215d5-6c60-451f-84f6-783545ace8a2)
INSERT INTO profiles (id, email, role, group_id, preferred_weight, is_weekly_mode, location, created_at)
VALUES 
  ('550e8400-e29b-41d4-a716-446655440001', 'sarah.fitness@example.com', 'user', '4e6215d5-6c60-451f-84f6-783545ace8a2', 65, false, 'Amsterdam', '2024-01-01T00:00:00Z'),
  ('550e8400-e29b-41d4-a716-446655440002', 'emma.strong@example.com', 'group_admin', '4e6215d5-6c60-451f-84f6-783545ace8a2', 70, true, 'Rotterdam', '2024-01-01T00:00:00Z'),
  ('550e8400-e29b-41d4-a716-446655440003', 'lisa.runner@example.com', 'user', '4e6215d5-6c60-451f-84f6-783545ace8a2', 58, false, 'Utrecht', '2024-01-01T00:00:00Z'),
  ('550e8400-e29b-41d4-a716-446655440004', 'mia.yoga@example.com', 'user', '4e6215d5-6c60-451f-84f6-783545ace8a2', 62, false, 'Den Haag', '2024-01-01T00:00:00Z'),
  ('550e8400-e29b-41d4-a716-446655440005', 'anna.crossfit@example.com', 'user', '4e6215d5-6c60-451f-84f6-783545ace8a2', 68, false, 'Eindhoven', '2024-01-01T00:00:00Z')
ON CONFLICT (id) DO NOTHING;

-- 2. Today's workout logs - showing different activity levels
-- Sarah (high performer today)
INSERT INTO logs (id, user_id, group_id, exercise_id, count, weight, duration, points, date, timestamp, created_at)
VALUES 
  (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440001', '4e6215d5-6c60-451f-84f6-783545ace8a2', 'squats', 50, 0, 0, 50, CURRENT_DATE, extract(epoch from now()) * 1000, now() - interval '2 hours'),
  (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440001', '4e6215d5-6c60-451f-84f6-783545ace8a2', 'pullups', 8, 0, 0, 32, CURRENT_DATE, extract(epoch from now()) * 1000, now() - interval '1.5 hours'),
  (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440001', '4e6215d5-6c60-451f-84f6-783545ace8a2', 'plank', 0, 0, 2, 50, CURRENT_DATE, extract(epoch from now()) * 1000, now() - interval '1 hour');

-- Emma (group admin, moderate activity)
INSERT INTO logs (id, user_id, group_id, exercise_id, count, weight, duration, points, date, timestamp, created_at)
VALUES 
  (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440002', '4e6215d5-6c60-451f-84f6-783545ace8a2', 'sport_medium', 0, 0, 1, 250, CURRENT_DATE, extract(epoch from now()) * 1000, now() - interval '3 hours'),
  (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440002', '4e6215d5-6c60-451f-84f6-783545ace8a2', 'burpees', 15, 0, 0, 45, CURRENT_DATE, extract(epoch from now()) * 1000, now() - interval '2.5 hours');

-- Lisa (runner, early bird)
INSERT INTO logs (id, user_id, group_id, exercise_id, count, weight, duration, points, date, timestamp, created_at)
VALUES 
  (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440003', '4e6215d5-6c60-451f-84f6-783545ace8a2', 'sport_light', 0, 0, 1, 125, CURRENT_DATE, extract(epoch from now()) * 1000, now() - interval '6 hours'),
  (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440003', '4e6215d5-6c60-451f-84f6-783545ace8a2', 'jumpingJacks', 60, 0, 0, 20, CURRENT_DATE, extract(epoch from now()) * 1000, now() - interval '5.5 hours');

-- Mia (yoga enthusiast, steady progress)
INSERT INTO logs (id, user_id, group_id, exercise_id, count, weight, duration, points, date, timestamp, created_at)
VALUES 
  (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440004', '4e6215d5-6c60-451f-84f6-783545ace8a2', 'plank', 0, 0, 3, 75, CURRENT_DATE, extract(epoch from now()) * 1000, now() - interval '4 hours'),
  (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440004', '4e6215d5-6c60-451f-84f6-783545ace8a2', 'wallSit', 0, 0, 1, 25, CURRENT_DATE, extract(epoch from now()) * 1000, now() - interval '3.5 hours');

-- Anna (just started today, lower activity)
INSERT INTO logs (id, user_id, group_id, exercise_id, count, weight, duration, points, date, timestamp, created_at)
VALUES 
  (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440005', '4e6215d5-6c60-451f-84f6-783545ace8a2', 'squats', 20, 0, 0, 20, CURRENT_DATE, extract(epoch from now()) * 1000, now() - interval '1 hour');

-- 3. Daily checkins for streaks (last 7 days)
-- Sarah (6-day streak)
INSERT INTO daily_checkins (id, user_id, group_id, date, total_points, target_points, is_complete, created_at)
VALUES 
  (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440001', '4e6215d5-6c60-451f-84f6-783545ace8a2', CURRENT_DATE - 6, 150, 125, true, now() - interval '6 days'),
  (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440001', '4e6215d5-6c60-451f-84f6-783545ace8a2', CURRENT_DATE - 5, 180, 125, true, now() - interval '5 days'),
  (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440001', '4e6215d5-6c60-451f-84f6-783545ace8a2', CURRENT_DATE - 4, 145, 125, true, now() - interval '4 days'),
  (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440001', '4e6215d5-6c60-451f-84f6-783545ace8a2', CURRENT_DATE - 3, 160, 125, true, now() - interval '3 days'),
  (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440001', '4e6215d5-6c60-451f-84f6-783545ace8a2', CURRENT_DATE - 2, 140, 125, true, now() - interval '2 days'),
  (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440001', '4e6215d5-6c60-451f-84f6-783545ace8a2', CURRENT_DATE - 1, 170, 125, true, now() - interval '1 day');

-- Emma (4-day streak, had a rest day)
INSERT INTO daily_checkins (id, user_id, group_id, date, total_points, target_points, is_complete, created_at)
VALUES 
  (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440002', '4e6215d5-6c60-451f-84f6-783545ace8a2', CURRENT_DATE - 5, 80, 125, false, now() - interval '5 days'),
  (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440002', '4e6215d5-6c60-451f-84f6-783545ace8a2', CURRENT_DATE - 4, 130, 125, true, now() - interval '4 days'),
  (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440002', '4e6215d5-6c60-451f-84f6-783545ace8a2', CURRENT_DATE - 3, 155, 125, true, now() - interval '3 days'),
  (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440002', '4e6215d5-6c60-451f-84f6-783545ace8a2', CURRENT_DATE - 2, 140, 125, true, now() - interval '2 days'),
  (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440002', '4e6215d5-6c60-451f-84f6-783545ace8a2', CURRENT_DATE - 1, 125, 125, true, now() - interval '1 day');

-- Lisa (3-day streak)
INSERT INTO daily_checkins (id, user_id, group_id, date, total_points, target_points, is_complete, created_at)
VALUES 
  (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440003', '4e6215d5-6c60-451f-84f6-783545ace8a2', CURRENT_DATE - 3, 130, 125, true, now() - interval '3 days'),
  (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440003', '4e6215d5-6c60-451f-84f6-783545ace8a2', CURRENT_DATE - 2, 145, 125, true, now() - interval '2 days'),
  (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440003', '4e6215d5-6c60-451f-84f6-783545ace8a2', CURRENT_DATE - 1, 135, 125, true, now() - interval '1 day');

-- Mia (2-day streak)
INSERT INTO daily_checkins (id, user_id, group_id, date, total_points, target_points, is_complete, created_at)
VALUES 
  (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440004', '4e6215d5-6c60-451f-84f6-783545ace8a2', CURRENT_DATE - 2, 120, 125, false, now() - interval '2 days'),
  (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440004', '4e6215d5-6c60-451f-84f6-783545ace8a2', CURRENT_DATE - 1, 130, 125, true, now() - interval '1 day');

-- Anna (1-day streak, just started)
INSERT INTO daily_checkins (id, user_id, group_id, date, total_points, target_points, is_complete, created_at)
VALUES 
  (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440005', '4e6215d5-6c60-451f-84f6-783545ace8a2', CURRENT_DATE - 1, 125, 125, true, now() - interval '1 day');

-- 4. Group chat messages to show interaction
INSERT INTO chat_messages (id, group_id, user_id, message, created_at)
VALUES 
  (gen_random_uuid(), '4e6215d5-6c60-451f-84f6-783545ace8a2', '550e8400-e29b-41d4-a716-446655440002', 'Good morning girls! Ready to crush today''s workout? 💪', now() - interval '8 hours'),
  (gen_random_uuid(), '4e6215d5-6c60-451f-84f6-783545ace8a2', '550e8400-e29b-41d4-a716-446655440001', 'Already done with my morning squats! Who''s joining me for an afternoon session?', now() - interval '7 hours'),
  (gen_random_uuid(), '4e6215d5-6c60-451f-84f6-783545ace8a2', '550e8400-e29b-41d4-a716-446655440003', 'Just finished my run! Beautiful morning in Utrecht 🌅', now() - interval '6 hours'),
  (gen_random_uuid(), '4e6215d5-6c60-451f-84f6-783545ace8a2', '550e8400-e29b-41d4-a716-446655440004', 'Starting with some yoga today. Anyone want to join a virtual session later?', now() - interval '5 hours'),
  (gen_random_uuid(), '4e6215d5-6c60-451f-84f6-783545ace8a2', '550e8400-e29b-41d4-a716-446655440005', 'Hi everyone! New to the group, excited to start this journey with you all! 🎉', now() - interval '4 hours'),
  (gen_random_uuid(), '4e6215d5-6c60-451f-84f6-783545ace8a2', '550e8400-e29b-41d4-a716-446655440002', 'Welcome Anna! We''re so glad to have you. Don''t hesitate to ask if you need any tips!', now() - interval '3 hours'),
  (gen_random_uuid(), '4e6215d5-6c60-451f-84f6-783545ace8a2', '550e8400-e29b-41d4-a716-446655440001', 'Sarah here with 8 pull-ups done! Who can beat that? 😄', now() - interval '2 hours'),
  (gen_random_uuid(), '4e6215d5-6c60-451f-84f6-783545ace8a2', '550e8400-e29b-41d4-a716-446655440003', 'Challenge accepted! 💪 Going for 10 tomorrow', now() - interval '1 hour'),
  (gen_random_uuid(), '4e6215d5-6c60-451f-84f6-783545ace8a2', '550e8400-e29b-41d4-a716-446655440004', 'You girls are inspiring! Just finished my plank challenge 🧘‍♀️', now() - interval '30 minutes');

-- 5. Historical workout data for the past week to show consistency
-- Sarah's previous workouts
INSERT INTO logs (id, user_id, group_id, exercise_id, count, weight, duration, points, date, timestamp, created_at)
VALUES 
  (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440001', '4e6215d5-6c60-451f-84f6-783545ace8a2', 'squats', 40, 0, 0, 40, CURRENT_DATE - 1, extract(epoch from (now() - interval '1 day')) * 1000, now() - interval '1 day'),
  (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440001', '4e6215d5-6c60-451f-84f6-783545ace8a2', 'pullups', 6, 0, 0, 24, CURRENT_DATE - 1, extract(epoch from (now() - interval '1 day')) * 1000, now() - interval '1 day'),
  (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440001', '4e6215d5-6c60-451f-84f6-783545ace8a2', 'sport_medium', 0, 0, 1, 250, CURRENT_DATE - 2, extract(epoch from (now() - interval '2 days')) * 1000, now() - interval '2 days');

-- Emma's previous workouts
INSERT INTO logs (id, user_id, group_id, exercise_id, count, weight, duration, points, date, timestamp, created_at)
VALUES 
  (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440002', '4e6215d5-6c60-451f-84f6-783545ace8a2', 'sport_light', 0, 0, 2, 250, CURRENT_DATE - 1, extract(epoch from (now() - interval '1 day')) * 1000, now() - interval '1 day'),
  (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440002', '4e6215d5-6c60-451f-84f6-783545ace8a2', 'squats', 30, 0, 0, 30, CURRENT_DATE - 2, extract(epoch from (now() - interval '2 days')) * 1000, now() - interval '2 days');

-- This setup creates:
-- - 5 test users with different personalities and activity levels
-- - Today's workout data showing current rankings: Sarah (132pts), Emma (295pts), Lisa (145pts), Mia (100pts), Anna (20pts)
-- - Different streak lengths: Sarah (6), Emma (4), Lisa (3), Mia (1), Anna (1)
-- - Realistic chat messages showing group interaction
-- - Historical data to show progress over time

-- To apply this data:
-- 1. Copy this script
-- 2. Go to your Supabase dashboard
-- 3. Navigate to SQL Editor
-- 4. Paste and run this script
-- 5. Refresh your app to see the test data in action!