#!/usr/bin/env node

/**
 * Direct SQL execution for user_recovery_days table
 */

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://cltndnfdtytimrwticej.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNsdG5kbmZkdHl0aW1yd3RpY2VqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NzY2Mjk2OCwiZXhwIjoyMDYzMjM4OTY4fQ.jsxe-QXQ8C31R4aWVCP-o6UKpAF8n1LAu2xcg2sdMRk'

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

const sql = `
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
`

const policies = [
  {
    name: "Users can view own recovery days",
    sql: `CREATE POLICY "Users can view own recovery days" ON user_recovery_days FOR SELECT USING (auth.uid() = user_id)`
  },
  {
    name: "Users can insert own recovery days", 
    sql: `CREATE POLICY "Users can insert own recovery days" ON user_recovery_days FOR INSERT WITH CHECK (auth.uid() = user_id)`
  },
  {
    name: "Users can update own recovery days",
    sql: `CREATE POLICY "Users can update own recovery days" ON user_recovery_days FOR UPDATE USING (auth.uid() = user_id)`
  },
  {
    name: "Users can delete own recovery days",
    sql: `CREATE POLICY "Users can delete own recovery days" ON user_recovery_days FOR DELETE USING (auth.uid() = user_id)`
  },
  {
    name: "Group members can view recovery days",
    sql: `CREATE POLICY "Group members can view recovery days" ON user_recovery_days FOR SELECT USING (EXISTS (SELECT 1 FROM profiles p1 JOIN profiles p2 ON p1.group_id = p2.group_id WHERE p1.id = auth.uid() AND p2.id = user_recovery_days.user_id))`
  }
]

async function run() {
  console.log('🧘 Creating user_recovery_days table...\n')

  try {
    // Try using the database REST API endpoint
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ sql_query: sql })
    })

    if (!response.ok) {
      const text = await response.text()
      console.log('RPC method not available, trying alternative...')
      
      // Alternative: use pg-meta API
      const metaResponse = await fetch(`${supabaseUrl}/pg/query`, {
        method: 'POST',
        headers: {
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query: sql })
      })
      
      if (!metaResponse.ok) {
        console.log('❌ Could not execute SQL automatically.')
        console.log('\n📋 Please run the SQL manually in Supabase SQL Editor:')
        console.log('   https://supabase.com/dashboard/project/cltndnfdtytimrwticej/sql/new\n')
        console.log('Copy the SQL from: add_user_recovery_days.sql')
        return
      }
    }

    console.log('✅ Table created successfully!')
    
    // Verify
    const { data, error } = await supabase
      .from('user_recovery_days')
      .select('id')
      .limit(1)
    
    if (error) {
      console.log('⚠️ Table verification failed:', error.message)
    } else {
      console.log('✅ Table verified and ready to use!')
    }

  } catch (error) {
    console.error('Error:', error.message)
    console.log('\n📋 Please run the SQL manually in Supabase SQL Editor:')
    console.log('   https://supabase.com/dashboard/project/cltndnfdtytimrwticej/sql/new')
  }
}

run()


