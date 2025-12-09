const postgres = require('postgres');

const sql = postgres('postgresql://postgres.cltndnfdtytimrwticej:1UMGDjPFX02UJ6N6@aws-0-eu-west-3.pooler.supabase.com:5432/postgres', {
  max: 1,
  idle_timeout: 20,
  connect_timeout: 10
});

const targetBalances = {
  'Stephan': 340,
  'Pauli': 360,
  'derfriesinger': 370,
  'Peter': 290,
  'Matthijs': 140,
  'Marius': 200,
  'Harry': 80,
  'Roel': 70
}

async function updatePotBalances() {
  try {
    console.log('Updating pot balances...\n')

    // Get current balances (penalties - payments - donations)
    const currentBalances = await sql`
      SELECT
        p.id,
        p.username,
        p.group_id,
        COALESCE(SUM(CASE WHEN pt.transaction_type = 'penalty' THEN pt.amount ELSE 0 END), 0) -
        COALESCE(SUM(CASE WHEN pt.transaction_type = 'payment' THEN pt.amount ELSE 0 END), 0) -
        COALESCE(SUM(CASE WHEN pt.transaction_type = 'donation' THEN pt.amount ELSE 0 END), 0) as current_balance
      FROM profiles p
      LEFT JOIN payment_transactions pt ON p.id = pt.user_id
      GROUP BY p.id, p.username, p.group_id
    `

    console.log('Current vs Target Balances:')
    console.log('─'.repeat(60))

    for (const user of currentBalances) {
      const targetBalance = targetBalances[user.username]
      if (targetBalance === undefined) continue

      const current = parseFloat(user.current_balance)
      const difference = targetBalance - current

      console.log(`${user.username}:`)
      console.log(`  Current: €${current}, Target: €${targetBalance}, Diff: €${difference}`)

      if (Math.abs(difference) < 0.01) {
        console.log(`  ✓ Already correct\n`)
        continue
      }

      // Add adjustment transaction
      const transactionType = difference > 0 ? 'penalty' : 'donation'
      const amount = Math.abs(difference)

      await sql`
        INSERT INTO payment_transactions (user_id, group_id, amount, transaction_type, description, created_at)
        VALUES (
          ${user.id},
          ${user.group_id},
          ${amount},
          ${transactionType},
          ${'Pot balance adjustment - Manual correction'},
          NOW()
        )
      `

      console.log(`  ✅ Added ${transactionType} of €${amount}\n`)
    }

    console.log('─'.repeat(60))
    console.log('\n--- Final Balances ---')

    const finalBalances = await sql`
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

    finalBalances.forEach(b => {
      console.log(`${b.username}: €${b.pot_balance}`)
    })

    const total = finalBalances.reduce((sum, b) => sum + parseFloat(b.pot_balance || 0), 0)
    console.log(`\nTotal pot: €${total}`)

    await sql.end()
    process.exit(0)
  } catch (error) {
    console.error('❌ Error:', error.message)
    console.error(error)
    await sql.end()
    process.exit(1)
  }
}

updatePotBalances()
