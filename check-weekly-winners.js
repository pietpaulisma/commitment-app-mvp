const postgres = require('postgres')

const sql = postgres('postgresql://postgres.cltndnfdtytimrwticej:1UMGDjPFX02UJ6N6@aws-0-eu-west-3.pooler.supabase.com:5432/postgres', {
  max: 1,
  idle_timeout: 20,
  connect_timeout: 10
})

async function checkWeeklyWinners() {
  try {
    console.log('Checking weekly_overperformer_history table...\n')

    const records = await sql`
      SELECT
        w.*,
        p.username
      FROM weekly_overperformer_history w
      JOIN profiles p ON w.user_id = p.id
      ORDER BY w.week_start_date DESC
    `

    console.log(`Found ${records.length} records\n`)

    if (records.length > 0) {
      records.forEach(record => {
        console.log('---')
        console.log(`Week: ${record.week_start_date} to ${record.week_end_date}`)
        console.log(`Winner: ${record.username}`)
        console.log(`Season: ${record.season} ${record.year}`)
        console.log(`Performance: ${record.total_points} pts (${parseFloat(record.percentage_over_target).toFixed(1)}% over target of ${record.target_points})`)
        console.log('')
      })
    } else {
      console.log('No weekly winners recorded yet.')
      console.log('\nPossible reasons:')
      console.log('1. The "Run Penalty Check" button has never been pressed on a Monday')
      console.log('2. No one exceeded their weekly target in previous weeks')
      console.log('3. The table was created but never populated')
    }
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await sql.end()
  }
}

checkWeeklyWinners().then(() => process.exit(0))
