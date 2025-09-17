-- Add function to generate daily summary for a specific date
-- This function extends the existing daily summary functionality to work with historical dates

CREATE OR REPLACE FUNCTION generate_daily_summary_for_date(
  p_group_id UUID,
  p_date DATE
) RETURNS UUID AS $$
DECLARE
  summary_message_id UUID;
  summary_content TEXT;
  workout_count INTEGER;
  total_members INTEGER;
  completion_rate DECIMAL;
  top_performer_name TEXT;
  top_performer_points INTEGER;
  system_sender_name TEXT;
  config_row RECORD;
  missed_members TEXT[];
  penalty_amount DECIMAL;
  total_penalties DECIMAL;
BEGIN
  -- Get daily summary configuration
  SELECT * INTO config_row
  FROM daily_summary_config
  WHERE enabled = true
  LIMIT 1;
  
  -- If daily summaries are disabled, return null
  IF NOT FOUND OR NOT config_row.enabled THEN
    RETURN NULL;
  END IF;

  -- Get system sender name for the group
  SELECT COALESCE(gs.system_sender_name, 'Barry') INTO system_sender_name
  FROM groups gs
  WHERE gs.id = p_group_id;

  -- Calculate workout completion stats for the specified date
  -- Count members who reached their sane target vs total members
  WITH member_targets AS (
    SELECT 
      p.id as user_id,
      p.username,
      p.is_weekly_mode,
      COALESCE(SUM(l.points), 0) as total_points,
      -- Calculate sane target for each member
      CASE 
        WHEN gs.start_date IS NOT NULL THEN
          CASE 
            WHEN (p_date - gs.start_date::date) >= 448 
                 AND (p.is_weekly_mode IS NULL OR p.is_weekly_mode = false) THEN
              -- Sane mode: weekly progression for groups 448+ days old
              448 + FLOOR(((p_date - gs.start_date::date) - 448) / 7)
            ELSE
              -- Regular progression: 1 + days since start
              1 + GREATEST(0, (p_date - gs.start_date::date))
          END
        ELSE 100 -- Fallback if no start date
      END as daily_target
    FROM profiles p
    LEFT JOIN logs l ON p.id = l.user_id AND l.date = p_date
    LEFT JOIN groups gs ON p.group_id = gs.id
    WHERE p.group_id = p_group_id
    GROUP BY p.id, p.username, p.is_weekly_mode, gs.start_date
  )
  SELECT 
    COUNT(CASE WHEN total_points >= daily_target THEN 1 END)::INTEGER,
    COUNT(*)::INTEGER
  INTO workout_count, total_members
  FROM member_targets;

  -- Calculate completion rate
  IF total_members > 0 THEN
    completion_rate := (workout_count::DECIMAL / total_members::DECIMAL) * 100;
  ELSE
    completion_rate := 0;
  END IF;

  -- Find top performer for the date (by total points across all exercises)
  SELECT 
    p.username,
    SUM(l.points)
  INTO top_performer_name, top_performer_points
  FROM logs l
  JOIN profiles p ON l.user_id = p.id
  WHERE p.group_id = p_group_id 
    AND l.date = p_date
  GROUP BY p.id, p.username
  ORDER BY SUM(l.points) DESC
  LIMIT 1;

  -- Find members who missed their workout and got penalties on this date
  SELECT 
    array_agg(p.username),
    COALESCE(SUM(pt.amount), 0)
  INTO missed_members, total_penalties
  FROM payment_transactions pt
  JOIN profiles p ON pt.user_id = p.id
  WHERE pt.group_id = p_group_id 
    AND pt.transaction_type = 'penalty'
    AND DATE(pt.created_at) = p_date;

  -- Get the standard penalty amount for this group
  SELECT COALESCE(penalty_amount, 10) INTO penalty_amount
  FROM groups
  WHERE id = p_group_id;

  -- Build summary content based on configuration
  summary_content := '📊 **Daily Summary for ' || to_char(p_date, 'Month DD, YYYY') || '**' || CHR(10) || CHR(10);

  -- Add workout completion rate if enabled
  IF config_row.include_commitment_rate THEN
    summary_content := summary_content || 
      '💪 **Workout Completion:** ' || workout_count || '/' || total_members || 
      ' members (' || ROUND(completion_rate) || '%)' || CHR(10);
    
    IF completion_rate >= 80 THEN
      summary_content := summary_content || '🎉 Outstanding group commitment!' || CHR(10);
    ELSIF completion_rate >= 60 THEN
      summary_content := summary_content || '👍 Great team effort!' || CHR(10);
    ELSIF completion_rate >= 40 THEN
      summary_content := summary_content || '📈 Room for improvement!' || CHR(10);
    ELSE
      summary_content := summary_content || '⚡ Let''s step it up team!' || CHR(10);
    END IF;
    
    summary_content := summary_content || CHR(10);
  END IF;

  -- Add top performer if enabled and exists
  IF config_row.include_top_performer AND top_performer_name IS NOT NULL THEN
    summary_content := summary_content || 
      '🏆 **Top Performer:** ' || top_performer_name || 
      ' with ' || top_performer_points || ' points!' || CHR(10) || 
      'Way to lead by example! 💪' || CHR(10) || CHR(10);
  END IF;

  -- Add missed workouts info if there were any penalties
  IF missed_members IS NOT NULL AND array_length(missed_members, 1) > 0 THEN
    summary_content := summary_content || 
      '💸 **Missed Targets:** ' || array_to_string(missed_members, ', ') || 
      ' each donated €' || penalty_amount || ' to the pot' || CHR(10);
    summary_content := summary_content || 
      '💰 **Total Penalties:** €' || total_penalties || ' added to group fund' || CHR(10) || CHR(10);
  ELSE
    summary_content := summary_content || 
      '🎯 **Perfect Day:** Everyone hit their targets! No penalties today.' || CHR(10) || CHR(10);
  END IF;

  -- Add motivational message if enabled
  IF config_row.include_motivational_message THEN
    summary_content := summary_content || 
      '✨ **Daily Motivation:** "Every workout is a step towards a stronger you. Keep pushing forward, team!"' || CHR(10) || CHR(10);
  END IF;

  -- Add historical note
  summary_content := summary_content || 
    '📅 *This summary covers workouts from ' || to_char(p_date, 'FMMonth DD, YYYY') || '*';

  -- Create the system message using the proper RPC function
  SELECT insert_system_message_to_chat(
    p_group_id,
    'daily_summary'::text,
    'common'::text,
    'Daily Summary - ' || to_char(p_date, 'FMMonth DD'),
    summary_content,
    jsonb_build_object(
      'date', p_date,
      'workout_count', workout_count,
      'total_members', total_members,
      'completion_rate', completion_rate,
      'top_performer', top_performer_name,
      'top_performer_points', top_performer_points,
      'missed_members', missed_members,
      'total_penalties', total_penalties,
      'penalty_amount', penalty_amount,
      'generated_for_date', p_date
    ),
    system_sender_name
  ) INTO summary_message_id;

  RETURN summary_message_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION generate_daily_summary_for_date(UUID, DATE) TO authenticated;