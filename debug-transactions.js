const postgres = require('postgres');

const sql = postgres('postgresql://postgres.cltndnfdtytimrwticej:1UMGDjPFX02UJ6N6@aws-0-eu-west-3.pooler.supabase.com:5432/postgres', {
  max: 1,
  idle_timeout: 20,
  connect_timeout: 10
});

async function debugTransactions() {
  try {
    console.log('Debugging transaction calculations...\n')

    // Get ALL transactions for derfriesinger
    const derfriesingerTransactions = await sql`
      SELECT
        pt.transaction_type,
        pt.amount,
        pt.description,
        pt.created_at
      FROM payment_transactions pt
      JOIN profiles p ON pt.user_id = p.id
      WHERE p.username = 'derfriesinger'
      ORDER BY pt.created_at
    `

    console.log('=== ALL TRANSACTIONS FOR derfriesinger ===')
    let penaltySum = 0
    let paymentSum = 0
    let donationSum = 0

    derfriesingerTransactions.forEach(t => {
      console.log(`${t.created_at.toISOString().split('T')[0]} | ${t.transaction_type.padEnd(8)} | €${t.amount} | ${t.description}`)

      if (t.transaction_type === 'penalty') penaltySum += parseFloat(t.amount)
      if (t.transaction_type === 'payment') paymentSum += parseFloat(t.amount)
      if (t.transaction_type === 'donation') donationSum += parseFloat(t.amount)
    })

    console.log('\n--- SUMS ---')
    console.log(`Penalties: €${penaltySum}`)
    console.log(`Payments: €${paymentSum}`)
    console.log(`Donations: €${donationSum}`)
    console.log(`\nDashboard calculation (penalties - payments - donations): €${penaltySum - paymentSum - donationSum}`)
    console.log(`Check script calculation (penalties - donations): €${penaltySum - donationSum}`)
    console.log(`Expected final balance: €370`)

    console.log('\n\n=== ALL USER BALANCES (Dashboard Logic) ===')
    const allBalances = await sql`
      SELECT
        p.username,
        COALESCE(SUM(CASE WHEN pt.transaction_type = 'penalty' THEN pt.amount ELSE 0 END), 0) as penalties,
        COALESCE(SUM(CASE WHEN pt.transaction_type = 'payment' THEN pt.amount ELSE 0 END), 0) as payments,
        COALESCE(SUM(CASE WHEN pt.transaction_type = 'donation' THEN pt.amount ELSE 0 END), 0) as donations,
        COALESCE(SUM(CASE WHEN pt.transaction_type = 'penalty' THEN pt.amount ELSE 0 END), 0) -
        COALESCE(SUM(CASE WHEN pt.transaction_type = 'payment' THEN pt.amount ELSE 0 END), 0) -
        COALESCE(SUM(CASE WHEN pt.transaction_type = 'donation' THEN pt.amount ELSE 0 END), 0) as net_balance
      FROM profiles p
      LEFT JOIN payment_transactions pt ON p.id = pt.user_id
      GROUP BY p.id, p.username
      ORDER BY net_balance DESC
    `

    allBalances.forEach(b => {
      console.log(`${b.username.padEnd(15)} | Pen: €${b.penalties.toString().padEnd(6)} | Pay: €${b.payments.toString().padEnd(6)} | Don: €${b.donations.toString().padEnd(6)} | Net: €${b.net_balance}`)
    })

    const total = allBalances.reduce((sum, b) => sum + parseFloat(b.net_balance || 0), 0)
    console.log(`\nTotal pot: €${total}`)
    console.log(`Expected total: €1850`)

    await sql.end()
    process.exit(0)
  } catch (error) {
    console.error('❌ Error:', error.message)
    console.error(error)
    await sql.end()
    process.exit(1)
  }
}

debugTransactions()
