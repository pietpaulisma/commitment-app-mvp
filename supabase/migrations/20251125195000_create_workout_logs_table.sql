-- Create workout_logs table
create table if not exists public.workout_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) not null,
  exercise_id text not null, -- Using text to be safe, references exercises(id) conceptually
  exercise_name text not null,
  count numeric default 0,
  duration numeric default 0,
  weight numeric default 0,
  points numeric default 0,
  is_decreased boolean default false,
  sets integer default 1,
  date text, -- Format YYYY-MM-DD
  timestamp bigint, -- For sorting/logic
  logged_at timestamptz default now(),
  group_id uuid -- Optional, for faster group filtering
);

-- Enable RLS
alter table public.workout_logs enable row level security;

-- Policies

-- 1. Users can view their own logs
create policy "Users can view their own logs"
  on public.workout_logs for select
  using (auth.uid() = user_id);

-- 2. Users can insert their own logs
create policy "Users can insert their own logs"
  on public.workout_logs for insert
  with check (auth.uid() = user_id);

-- 3. Users can update their own logs
create policy "Users can update their own logs"
  on public.workout_logs for update
  using (auth.uid() = user_id);

-- 4. Users can delete their own logs
create policy "Users can delete their own logs"
  on public.workout_logs for delete
  using (auth.uid() = user_id);

-- 5. Group members can view logs of users in the same group (for dashboard)
create policy "Group members can view group logs"
  on public.workout_logs for select
  using (
    exists (
      select 1 from profiles
      where profiles.id = workout_logs.user_id
      and profiles.group_id = (
        select group_id from profiles where id = auth.uid()
      )
    )
  );
