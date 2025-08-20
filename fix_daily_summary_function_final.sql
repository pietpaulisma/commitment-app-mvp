-- Fix the generate_daily_summary function with correct GROUP BY syntax
CREATE OR REPLACE FUNCTION generate_daily_summary(p_group_id UUID) RETURNS UUID AS $$
DECLARE
  v_summary_content TEXT;
  v_total_members INTEGER;
  v_committed_members INTEGER;
  v_commitment_rate DECIMAL;
  v_top_performer TEXT;
  v_top_points INTEGER;
  v_today_workouts INTEGER;
BEGIN
  -- Calculate total members in group
  SELECT COUNT(DISTINCT p.id) INTO v_total_members
  FROM profiles p
  WHERE p.group_id = p_group_id;

  -- Count members who worked out today using logs table
  SELECT COUNT(DISTINCT l.user_id) INTO v_committed_members
  FROM logs l
  JOIN profiles p ON l.user_id = p.id
  WHERE p.group_id = p_group_id 
  AND DATE(l.created_at) = CURRENT_DATE;

  -- Count total workouts logged today
  SELECT COUNT(*) INTO v_today_workouts
  FROM logs l
  JOIN profiles p ON l.user_id = p.id
  WHERE p.group_id = p_group_id 
  AND DATE(l.created_at) = CURRENT_DATE;

  -- Calculate commitment rate
  v_commitment_rate := CASE 
    WHEN v_total_members > 0 THEN (v_committed_members::DECIMAL / v_total_members::DECIMAL) * 100
    ELSE 0
  END;

  -- Find top performer based on total workout count today
  SELECT p.username, COUNT(l.id) as workout_count
  INTO v_top_performer, v_top_points
  FROM logs l
  JOIN profiles p ON l.user_id = p.id
  WHERE p.group_id = p_group_id 
  AND DATE(l.created_at) = CURRENT_DATE
  GROUP BY p.id, p.username
  ORDER BY workout_count DESC
  LIMIT 1;

  -- Build summary content with actual data
  v_summary_content := format(
    '🌅 **Daily Summary** - %s

💪 **Commitment Rate**: %s%% (%s/%s members)
🏆 **Top Performer**: %s (%s workouts)
📊 **Total Workouts**: %s

%s',
    CURRENT_DATE::DATE,
    ROUND(v_commitment_rate, 1),
    v_committed_members,
    v_total_members,
    COALESCE(v_top_performer, 'No one yet'),
    COALESCE(v_top_points, 0),
    v_today_workouts,
    CASE 
      WHEN v_commitment_rate = 100 THEN '🎉 Perfect day! Everyone is committed today!'
      WHEN v_commitment_rate >= 80 THEN '✨ Great commitment from the team!'
      WHEN v_commitment_rate >= 50 THEN '📈 Good progress, let''s keep it up!'
      ELSE '💪 Let''s crush those goals today!'
    END
  );

  -- Insert system message
  RETURN insert_system_message_to_chat(
    p_group_id,
    'daily_summary',
    'common',
    'Daily Summary',
    v_summary_content,
    jsonb_build_object(
      'commitment_rate', v_commitment_rate,
      'committed_members', v_committed_members,
      'total_members', v_total_members,
      'top_performer', v_top_performer,
      'top_performer_workouts', v_top_points,
      'total_workouts_today', v_today_workouts,
      'generated_at', NOW()
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;