const { createClient } = require('@supabase/supabase-js')

// Initialize Supabase with service role key
const supabase = createClient(
  'https://cltndnfdtytimrwticej.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNsdG5kbmZkdHl0aW1yd3RpY2VqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NzY2Mjk2OCwiZXhwIjoyMDYzMjM4OTY4fQ.jsxe-QXQ8C31R4aWVCP-o6UKpAF8n1LAu2xcg2sdMRk',
  {
    db: {
      schema: 'public'
    }
  }
)

async function createTables() {
  try {
    console.log('Creating notification tables via RPC function...')
    
    // First, let's create a simple RPC function to execute SQL
    const createExecFunction = `
      CREATE OR REPLACE FUNCTION exec_sql(sql_text text)
      RETURNS text
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      BEGIN
        EXECUTE sql_text;
        RETURN 'SUCCESS';
      END;
      $$;
    `
    
    console.log('Creating exec_sql function...')
    const { data: funcData, error: funcError } = await supabase.rpc('exec', { sql: createExecFunction })
    
    if (funcError) {
      console.log('Function creation failed, trying direct table creation...')
      
      // Try creating tables directly with specific SQL
      const createPushSubscriptionsTable = `
        CREATE TABLE IF NOT EXISTS push_subscriptions (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
          endpoint TEXT NOT NULL,
          p256dh TEXT NOT NULL,
          auth TEXT NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(user_id, endpoint)
        );
      `
      
      const createPreferencesTable = `
        CREATE TABLE IF NOT EXISTS notification_preferences (
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
        );
      `
      
      console.log('Executing table creation SQL directly...')
      
      // Try using the supabase client's query method
      const { data: table1Data, error: table1Error } = await supabase
        .rpc('exec_sql', { sql_text: createPushSubscriptionsTable })
        
      if (table1Error) {
        console.error('Failed to create push_subscriptions table:', table1Error)
      } else {
        console.log('push_subscriptions table created successfully')
      }
      
      const { data: table2Data, error: table2Error } = await supabase
        .rpc('exec_sql', { sql_text: createPreferencesTable })
        
      if (table2Error) {
        console.error('Failed to create notification_preferences table:', table2Error)
      } else {
        console.log('notification_preferences table created successfully')
      }
      
    } else {
      console.log('exec_sql function created successfully')
    }
    
  } catch (error) {
    console.error('Error creating tables:', error)
  }
}

createTables()