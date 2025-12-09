const { createClient } = require('@supabase/supabase-js')

// Initialize Supabase with service role key
const supabase = createClient(
  'https://cltndnfdtytimrwticej.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNsdG5kbmZkdHl0aW1yd3RpY2VqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NzY2Mjk2OCwiZXhwIjoyMDYzMjM4OTY4fQ.jsxe-QXQ8C31R4aWVCP-o6UKpAF8n1LAu2xcg2sdMRk'
)

async function applyMigration() {
  try {
    console.log('Creating push_subscriptions table...')
    
    // Create push_subscriptions table
    const { error: table1Error } = await supabase
      .from('push_subscriptions')
      .select('*')
      .limit(1)
    
    if (table1Error && table1Error.code === 'PGRST106') {
      console.log('push_subscriptions table does not exist, need to create it via SQL')
    }
    
    console.log('Creating notification_preferences table...')
    
    // Create notification_preferences table
    const { error: table2Error } = await supabase
      .from('notification_preferences')
      .select('*')
      .limit(1)
    
    if (table2Error && table2Error.code === 'PGRST106') {
      console.log('notification_preferences table does not exist, need to create it via SQL')
    }
    
    console.log('Tables need to be created via direct SQL execution or Supabase dashboard')
    console.log('Please run the notification_system_schema.sql file in the Supabase SQL editor')
    
  } catch (error) {
    console.error('Error checking tables:', error)
  }
}

applyMigration()