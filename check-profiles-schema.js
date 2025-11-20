const postgres = require('postgres');

const sql = postgres('postgresql://postgres.cltndnfdtytimrwticej:1UMGDjPFX02UJ6N6@aws-0-eu-west-3.pooler.supabase.com:5432/postgres', {
  max: 1,
  idle_timeout: 20,
  connect_timeout: 10
});

async function checkSchema() {
  try {
    console.log('Checking profiles table schema...\n')

    const columns = await sql`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'profiles'
      ORDER BY ordinal_position
    `

    console.log('Columns in profiles table:')
    columns.forEach(c => {
      console.log(`  - ${c.column_name} (${c.data_type})`)
    })

    console.log('\n--- Sample Data ---')
    const sample = await sql`
      SELECT * FROM profiles LIMIT 1
    `

    if (sample.length > 0) {
      console.log('Sample profile fields:', Object.keys(sample[0]).join(', '))
    }

    await sql.end()
    process.exit(0)
  } catch (error) {
    console.error('❌ Error:', error.message)
    await sql.end()
    process.exit(1)
  }
}

checkSchema()
