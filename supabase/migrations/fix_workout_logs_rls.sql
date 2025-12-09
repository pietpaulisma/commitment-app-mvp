-- Drop the complex/slow policy
drop policy if exists "Group members can view group logs" on public.workout_logs;

-- Create a simpler, faster policy based on the group_id column
create policy "Group members can view group logs"
  on public.workout_logs for select
  using (
    group_id = (
      select group_id from profiles
      where id = auth.uid()
    )
  );
