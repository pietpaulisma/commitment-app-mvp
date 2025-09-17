const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')

// Initialize Supabase admin client
const supabaseUrl = 'https://cltndnfdtytimrwticej.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNsdG5kbmZkdHl0aW1yd3RpY2VqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NzY2Mjk2OCwiZXhwIjoyMDYzMjM4OTY4fQ.jsxe-QXQ8C31R4aWVCP-o6UKpAF8n1LAu2xcg2sdMRk'

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// SQL statements to execute
const sqlStatements = [
  // Create tables
  `CREATE TABLE IF NOT EXISTS push_subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, endpoint)
  );`,
  
  `CREATE TABLE IF NOT EXISTS notification_preferences (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
    chat_messages BOOLEAN DEFAULT TRUE,
    workout_completions BOOLEAN DEFAULT TRUE,
    group_achievements BOOLEAN DEFAULT TRUE,
    quiet_hours_enabled BOOLEAN DEFAULT FALSE,
    quiet_hours_start TIME DEFAULT '22:00',
    quiet_hours_end TIME DEFAULT '08:00',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );`,
  
  // Create indexes
  `CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions(user_id);`,
  `CREATE INDEX IF NOT EXISTS idx_push_subscriptions_endpoint ON push_subscriptions(endpoint);`,
  `CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id ON notification_preferences(user_id);`,
  
  // Enable RLS
  `ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;`,
  `ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;`
]

async function executeMigration() {
  try {
    console.log('Starting database migration...')
    
    for (let i = 0; i < sqlStatements.length; i++) {
      const sql = sqlStatements[i]
      console.log(`Executing statement ${i + 1}/${sqlStatements.length}...`)
      
      try {
        // Use direct SQL execution via the REST API
        const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'apikey': supabaseServiceKey
          },
          body: JSON.stringify({ sql })
        })
        
        if (!response.ok) {
          console.log(`SQL statement ${i + 1} failed, but continuing...`)
          console.log('Response:', await response.text())
        } else {
          console.log(`✅ Statement ${i + 1} executed successfully`)
        }
      } catch (error) {
        console.log(`Error executing statement ${i + 1}:`, error.message)
      }
    }
    
    console.log('\nMigration completed. Verifying tables...')
    
    // Verify tables exist
    const { data: subscriptions, error: subError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .limit(1)
    
    const { data: preferences, error: prefError } = await supabase
      .from('notification_preferences')
      .select('*')
      .limit(1)
    
    if (!subError && !prefError) {
      console.log('🎉 Migration successful! Both tables are accessible.')
    } else {
      console.log('⚠️ Some tables may not be accessible:', { subError, prefError })
    }
    
  } catch (error) {
    console.error('Migration failed:', error)
  }
}

executeMigration()