#!/usr/bin/env node

/**
 * Apply User Recovery Days Table Migration
 * Creates the user_recovery_days table for the new recovery day feature
 */

const { createClient } = require('@supabase/supabase-js')

// Supabase config (using service role for admin operations)
const supabaseUrl = 'https://cltndnfdtytimrwticej.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNsdG5kbmZkdHl0aW1yd3RpY2VqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NzY2Mjk2OCwiZXhwIjoyMDYzMjM4OTY4fQ.jsxe-QXQ8C31R4aWVCP-o6UKpAF8n1LAu2xcg2sdMRk'

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function applyMigration() {
  console.log('🧘 Applying user_recovery_days table migration...\n')

  try {
    // First, check if table already exists by trying to query it
    const { error: checkError } = await supabase
      .from('user_recovery_days')
      .select('id')
      .limit(1)

    if (!checkError) {
      console.log('✅ Table user_recovery_days already exists!')
      console.log('\n📊 Table is ready to use.')
      return
    }

    if (checkError.code !== '42P01') {
      // 42P01 = table does not exist, anything else is a real error
      console.log('⚠️ Unexpected error checking table:', checkError.message)
    }

    console.log('📝 Table does not exist. Please run the following SQL in your Supabase SQL Editor:\n')
    console.log('=' .repeat(80))
    console.log(`
-- Create the user_recovery_days table
CREATE TABLE IF NOT EXISTS user_recovery_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  week_start_date DATE NOT NULL,
  used_date DATE NOT NULL,
  recovery_minutes INTEGER DEFAULT 0,
  is_complete BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, week_start_date)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_recovery_days_user_id ON user_recovery_days(user_id);
CREATE INDEX IF NOT EXISTS idx_user_recovery_days_week_start ON user_recovery_days(week_start_date);
CREATE INDEX IF NOT EXISTS idx_user_recovery_days_used_date ON user_recovery_days(used_date);

-- Enable RLS
ALTER TABLE user_recovery_days ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own recovery days"
  ON user_recovery_days FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own recovery days"
  ON user_recovery_days FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own recovery days"
  ON user_recovery_days FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own recovery days"
  ON user_recovery_days FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Group members can view recovery days"
  ON user_recovery_days FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p1
      JOIN profiles p2 ON p1.group_id = p2.group_id
      WHERE p1.id = auth.uid() AND p2.id = user_recovery_days.user_id
    )
  );
`)
    console.log('=' .repeat(80))
    console.log('\n📋 Copy the SQL above and paste it into your Supabase SQL Editor.')
    console.log('   Go to: https://supabase.com/dashboard → Your Project → SQL Editor')

  } catch (error) {
    console.error('❌ Migration check failed:', error.message)
    process.exit(1)
  }
}

applyMigration()
