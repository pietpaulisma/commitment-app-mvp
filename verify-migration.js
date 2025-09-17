const { createClient } = require('@supabase/supabase-js')

// Initialize Supabase with service role key
const supabase = createClient(
  'https://cltndnfdtytimrwticej.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNsdG5kbmZkdHl0aW1yd3RpY2VqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NzY2Mjk2OCwiZXhwIjoyMDYzMjM4OTY4fQ.jsxe-QXQ8C31R4aWVCP-o6UKpAF8n1LAu2xcg2sdMRk'
)

async function verifyTables() {
  console.log('Verifying notification tables...')
  
  try {
    // Test push_subscriptions table
    console.log('Checking push_subscriptions table...')
    const { data: subscriptions, error: subError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .limit(1)
    
    if (subError) {
      console.error('❌ push_subscriptions table error:', subError.message)
    } else {
      console.log('✅ push_subscriptions table exists and accessible')
    }
    
    // Test notification_preferences table
    console.log('Checking notification_preferences table...')
    const { data: preferences, error: prefError } = await supabase
      .from('notification_preferences')
      .select('*')
      .limit(1)
    
    if (prefError) {
      console.error('❌ notification_preferences table error:', prefError.message)
    } else {
      console.log('✅ notification_preferences table exists and accessible')
    }
    
    if (!subError && !prefError) {
      console.log('\n🎉 Migration verification successful!')
      console.log('The notification system should now work properly.')
      console.log('Visit: https://commitment-app-3fjsubyht-pietpaulismas-projects.vercel.app')
    } else {
      console.log('\n⚠️  Migration not complete. Please run the SQL in Supabase dashboard.')
      console.log('See MIGRATION_INSTRUCTIONS.md for detailed steps.')
    }
    
  } catch (error) {
    console.error('Error verifying tables:', error)
  }
}

verifyTables()