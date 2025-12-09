const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')

// Initialize Supabase client with service role key
const supabaseUrl = 'https://cltndnfdtytimrwticej.supabase.co'
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNsdG5kbmZkdHl0aW1yd3RpY2VqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NzY2Mjk2OCwiZXhwIjoyMDYzMjM4OTY4fQ.jsxe-QXQ8C31R4aWVCP-o6UKpAF8n1LAu2xcg2sdMRk'

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function applyMigration() {
  try {
    console.log('Reading SQL migration file...')
    const sqlContent = fs.readFileSync('./add_pending_penalties_table.sql', 'utf8')

    console.log('Applying pending_penalties table migration...')
    console.log('This will:')
    console.log('  - Create pending_penalties table')
    console.log('  - Add RLS policies')
    console.log('  - Set up indexes')
    console.log('')

    // Split SQL into individual statements (separated by semicolons)
    const statements = sqlContent
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))

    console.log(`Found ${statements.length} SQL statements to execute\n`)

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      console.log(`[${i + 1}/${statements.length}] Executing statement...`)

      // Use Supabase's REST API to execute raw SQL
      const { data, error } = await supabase.rpc('exec_sql', {
        sql: statement
      })

      if (error) {
        // If exec_sql doesn't exist, try alternative approach
        if (error.message.includes('function') && error.message.includes('does not exist')) {
          console.log('\nNote: exec_sql function not available.')
          console.log('Please run this SQL manually in Supabase SQL Editor:')
          console.log('\n--- BEGIN SQL ---')
          console.log(sqlContent)
          console.log('--- END SQL ---\n')
          process.exit(0)
        }

        console.error(`Error on statement ${i + 1}:`, error)
        throw error
      }

      console.log(`✓ Statement ${i + 1} executed successfully`)
    }

    console.log('\n✅ Migration applied successfully!')
    console.log('\nNext steps:')
    console.log('1. Verify the table exists in Supabase Dashboard')
    console.log('2. Deploy to dev environment: vercel --dev')
    console.log('3. Test the penalty system\n')

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message)
    console.error('\nFull error:', error)

    console.log('\n📋 Manual application instructions:')
    console.log('1. Go to Supabase Dashboard → SQL Editor')
    console.log('2. Copy the contents of add_pending_penalties_table.sql')
    console.log('3. Paste and run the SQL')
    console.log('4. Verify the pending_penalties table is created\n')

    process.exit(1)
  }
}

applyMigration()
