const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')

// Initialize Supabase with service role key
const supabase = createClient(
  'https://cltndnfdtytimrwticej.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNsdG5kbmZkdHl0aW1yd3RpY2VqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NzY2Mjk2OCwiZXhwIjoyMDYzMjM4OTY4fQ.jsxe-QXQ8C31R4aWVCP-o6UKpAF8n1LAu2xcg2sdMRk'
)

async function applyMigration() {
  try {
    console.log('Reading notification system schema...')
    const sql = fs.readFileSync('./notification_system_schema.sql', 'utf8')
    
    console.log('Executing SQL migration...')
    const { data, error } = await supabase.rpc('exec_sql', { sql })
    
    if (error) {
      console.error('Migration failed:', error)
      process.exit(1)
    }
    
    console.log('Migration completed successfully:', data)
  } catch (error) {
    console.error('Error applying migration:', error)
    process.exit(1)
  }
}

applyMigration()