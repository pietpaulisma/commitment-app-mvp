const postgres = require('postgres');

const sql = postgres('postgresql://postgres.cltndnfdtytimrwticej:1UMGDjPFX02UJ6N6@aws-0-eu-west-3.pooler.supabase.com:5432/postgres', {
  max: 1,
  idle_timeout: 20,
  connect_timeout: 10
});

async function checkCurrentPot() {
  try {
    console.log('Checking current pot balances...\n')

    // Get current pot balance for each user (penalties - payments - donations)
    const balances = await sql`
      SELECT
        p.username,
        COALESCE(SUM(CASE WHEN pt.transaction_type = 'penalty' THEN pt.amount ELSE 0 END), 0) -
        COALESCE(SUM(CASE WHEN pt.transaction_type = 'payment' THEN pt.amount ELSE 0 END), 0) -
        COALESCE(SUM(CASE WHEN pt.transaction_type = 'donation' THEN pt.amount ELSE 0 END), 0) as pot_balance
      FROM profiles p
      LEFT JOIN payment_transactions pt ON p.id = pt.user_id
      GROUP BY p.id, p.username
      ORDER BY pot_balance DESC
    `

    console.log('Current Pot Balances:')
    balances.forEach(b => {
      console.log(`${b.username}: €${b.pot_balance}`)
    })

    const total = balances.reduce((sum, b) => sum + parseFloat(b.pot_balance || 0), 0)
    console.log(`\nTotal pot: €${total}`)

    await sql.end()
    process.exit(0)
  } catch (error) {
    console.error('❌ Error:', error.message)
    await sql.end()
    process.exit(1)
  }
}

checkCurrentPot()
