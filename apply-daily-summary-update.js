const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function applyMigration() {
  try {
    console.log('📖 Reading SQL migration file...')
    const sqlPath = path.join(__dirname, 'update_daily_summary_format.sql')
    const sql = fs.readFileSync(sqlPath, 'utf8')

    console.log('🔄 Applying migration to database...')
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql }).catch(async () => {
      // If exec_sql doesn't exist, try direct query
      const { data, error } = await supabase.from('_sqlx_migrations').select('*').limit(1)
      if (error) {
        // Use the PostgreSQL REST API directly
        const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseServiceKey,
            'Authorization': `Bearer ${supabaseServiceKey}`
          },
          body: JSON.stringify({ query: sql })
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${await response.text()}`)
        }

        return { data: await response.json(), error: null }
      }
      throw new Error('Could not execute SQL migration')
    })

    if (error) {
      console.error('❌ Migration failed:', error)
      process.exit(1)
    }

    console.log('✅ Migration applied successfully!')
    console.log('📊 Daily summary format has been updated')

  } catch (error) {
    console.error('❌ Error:', error.message)
    console.log('\n📝 Manual application required:')
    console.log('1. Go to your Supabase SQL Editor')
    console.log('2. Open: update_daily_summary_format.sql')
    console.log('3. Run the SQL script')
  }
}

applyMigration()
