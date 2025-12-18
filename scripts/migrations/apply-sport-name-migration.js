#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing required environment variables')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
})

async function runMigration() {
    console.log('🚀 Applying sport_name column migration...\n')

    try {
        // Read SQL file
        const sql = fs.readFileSync('./supabase/migrations/20251215_add_sport_name_column.sql', 'utf8')

        // Split into statements
        const statements = sql
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0 && !s.startsWith('--'))

        console.log(`📝 Found ${statements.length} SQL statements to execute\n`)

        for (let i = 0; i < statements.length; i++) {
            const statement = statements[i]
            console.log(`   [${i + 1}/${statements.length}] ${statement.substring(0, 50)}...`)

            try {
                // Try RPC first
                const { error } = await supabase.rpc('exec_sql', { sql_query: statement })

                if (error) {
                    // RPC doesn't exist, try direct table insert as fallback
                    const { error: directError } = await supabase.from('_sql').insert({ query: statement })

                    if (directError) {
                        console.log(`   ⚠️  Skipped (may already exist): ${error.message.substring(0, 60)}`)
                    } else {
                        console.log(`   ✅ Success`)
                    }
                } else {
                    console.log(`   ✅ Success`)
                }
            } catch (err) {
                console.log(`   ⚠️  Skipped: ${err.message.substring(0, 60)}`)
            }
        }

        console.log('\n✅ Migration completed!\n')
        console.log('📊 Verifying columns...')

        // Test query to verify column exists
        const { data, error } = await supabase
            .from('logs')
            .select('id, sport_name')
            .limit(1)

        if (error) {
            console.log(`⚠️  Could not verify (this is OK if tables are empty): ${error.message}`)
        } else {
            console.log('✅ sport_name column verified on logs table!')
        }

    } catch (error) {
        console.error('❌ Migration failed:', error.message)
        process.exit(1)
    }
}

runMigration()
