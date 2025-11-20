-- Update the generate_daily_summary function to use new format
-- New format is more concise and shows member details

CREATE OR REPLACE FUNCTION generate_daily_summary(
  p_group_id UUID
) RETURNS UUID AS $$
DECLARE
  summary_message_id UUID;
  summary_content TEXT;
  workout_count INTEGER;
  total_members INTEGER;
  system_sender_name TEXT;
  config_row RECORD;
  penalty_amount DECIMAL;
  group_pot_total DECIMAL;
  sick_members_list TEXT;
  missed_details TEXT;
  summary_date DATE;
BEGIN
  summary_date := CURRENT_DATE - INTERVAL '1 day'; -- Yesterday's data

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

  -- Get the penalty amount for this group
  SELECT COALESCE(penalty_amount, 10) INTO penalty_amount
  FROM groups
  WHERE id = p_group_id;

  -- Get the current group pot total
  SELECT COALESCE(SUM(amount), 0) INTO group_pot_total
  FROM payment_transactions
  WHERE group_id = p_group_id;

  -- Calculate workout completions (members who hit their sane target)
  WITH member_targets AS (
    SELECT
      p.id as user_id,
      p.username,
      p.is_sick_mode,
      p.is_weekly_mode,
      COALESCE(SUM(l.points), 0) as total_points,
      CASE
        WHEN gs.start_date IS NOT NULL THEN
          CASE
            WHEN (summary_date - gs.start_date::date) >= 448
                 AND (p.is_weekly_mode IS NULL OR p.is_weekly_mode = false) THEN
              448 + FLOOR(((summary_date - gs.start_date::date) - 448) / 7)
            ELSE
              1 + GREATEST(0, (summary_date - gs.start_date::date))
          END
        ELSE 100
      END as daily_target
    FROM profiles p
    LEFT JOIN logs l ON p.id = l.user_id AND l.date = summary_date
    LEFT JOIN groups gs ON p.group_id = gs.id
    WHERE p.group_id = p_group_id
    GROUP BY p.id, p.username, p.is_sick_mode, p.is_weekly_mode, gs.start_date
  )
  SELECT
    COUNT(CASE WHEN total_points >= daily_target THEN 1 END)::INTEGER,
    COUNT(*)::INTEGER
  INTO workout_count, total_members
  FROM member_targets
  WHERE is_sick_mode = false OR is_sick_mode IS NULL;

  -- Get sick members list
  SELECT string_agg(username, ', ')
  INTO sick_members_list
  FROM profiles
  WHERE group_id = p_group_id
    AND is_sick_mode = true;

  -- Build missed check-ins details with individual penalties
  WITH missed_checkins AS (
    SELECT
      p.username,
      pt.amount as penalty,
      (SELECT COALESCE(SUM(pt2.amount), 0)
       FROM payment_transactions pt2
       WHERE pt2.user_id = p.id
         AND pt2.transaction_type = 'penalty') as member_total
    FROM payment_transactions pt
    JOIN profiles p ON pt.user_id = p.id
    WHERE pt.group_id = p_group_id
      AND pt.transaction_type = 'penalty'
      AND DATE(pt.created_at) = summary_date
    ORDER BY p.username
  )
  SELECT string_agg(
    username || ' → €' || penalty || ' penalty (now at €' || member_total || ' total)',
    CHR(10) || '💸 Missed Check-in: '
  )
  INTO missed_details
  FROM missed_checkins;

  -- Build the summary content with new format
  summary_content := '📊 Daily Recap – ' || to_char(summary_date, 'FMMonth DD, YYYY') || CHR(10) || CHR(10);

  -- Show workout completions
  summary_content := summary_content || '💪 ' || workout_count || ' members completed their workout' || CHR(10);

  -- Show sick members if any
  IF sick_members_list IS NOT NULL AND sick_members_list != '' THEN
    summary_content := summary_content || '😷 Sick Mode: ' || sick_members_list || CHR(10);
  END IF;

  -- Show missed check-ins if any
  IF missed_details IS NOT NULL AND missed_details != '' THEN
    summary_content := summary_content || '💸 Missed Check-in: ' || missed_details || CHR(10);
  END IF;

  -- Always show group pot
  summary_content := summary_content || '🏦 Group pot: €' || group_pot_total;

  -- Create the system message
  SELECT insert_system_message_to_chat(
    p_group_id,
    'daily_summary'::text,
    'common'::text,
    'Daily Recap - ' || to_char(summary_date, 'FMMonth DD'),
    summary_content,
    jsonb_build_object(
      'date', summary_date,
      'workout_count', workout_count,
      'total_members', total_members,
      'group_pot_total', group_pot_total,
      'sick_members', sick_members_list,
      'missed_details', missed_details
    ),
    system_sender_name
  ) INTO summary_message_id;

  RETURN summary_message_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION generate_daily_summary(UUID) TO authenticated;
