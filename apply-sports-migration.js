#!/usr/bin/env node

/**
 * Apply Sports Table Migration
 * Creates the sports table and inserts default sports
 */

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:')
  console.error('   NEXT_PUBLIC_SUPABASE_URL')
  console.error('   SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function applySportsMigration() {
  console.log('🏀 Applying sports table migration...\n')

  try {
    // Read the SQL file
    const sql = fs.readFileSync('./create_sports_table.sql', 'utf8')

    // Split by semicolons to execute statements individually
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))

    console.log(`📝 Found ${statements.length} SQL statements to execute\n`)

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      console.log(`   [${i + 1}/${statements.length}] Executing...`)

      const { error } = await supabase.rpc('exec_sql', { sql_query: statement })

      if (error) {
        // Try direct query if RPC fails
        const { error: directError } = await supabase.from('_sql').insert({ query: statement })

        if (directError) {
          console.error(`   ❌ Error: ${error.message}`)
          console.error(`      Statement: ${statement.substring(0, 100)}...`)
        } else {
          console.log(`   ✅ Success`)
        }
      } else {
        console.log(`   ✅ Success`)
      }
    }

    console.log('\n✅ Sports migration completed!')
    console.log('\n📊 Verifying sports table...')

    // Verify the table was created and check sports count
    const { data: sports, error: fetchError } = await supabase
      .from('sports')
      .select('id, name, emoji')
      .order('name')

    if (fetchError) {
      console.error('❌ Error fetching sports:', fetchError.message)
    } else {
      console.log(`✅ Sports table verified! Found ${sports.length} sports:\n`)
      sports.forEach(sport => {
        console.log(`   ${sport.emoji} ${sport.name}`)
      })
    }

  } catch (error) {
    console.error('❌ Migration failed:', error.message)
    process.exit(1)
  }
}

applySportsMigration()
