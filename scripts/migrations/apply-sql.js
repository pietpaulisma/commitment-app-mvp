const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')

// Initialize Supabase client with service role key
const supabase = createClient(
  'https://cltndnfdtytimrwticej.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNsdG5kbmZkdHl0aW1yd3RpY2VqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NzY2Mjk2OCwiZXhwIjoyMDYzMjM4OTY4fQ.jsxe-QXQ8C31R4aWVCP-o6UKpAF8n1LAu2xcg2sdMRk',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

async function applySql() {
  try {
    // Read the SQL file
    const sqlContent = fs.readFileSync('./add_daily_summary_for_date.sql', 'utf8')
    
    console.log('Applying database function...')
    
    // Execute the SQL
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: sqlContent
    })
    
    if (error) {
      console.error('Error applying SQL:', error)
      process.exit(1)
    }
    
    console.log('Database function applied successfully!')
    console.log('Data:', data)
    
  } catch (error) {
    console.error('Script error:', error)
    process.exit(1)
  }
}

applySql()