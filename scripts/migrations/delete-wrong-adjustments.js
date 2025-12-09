const postgres = require('postgres');

const sql = postgres('postgresql://postgres.cltndnfdtytimrwticej:1UMGDjPFX02UJ6N6@aws-0-eu-west-3.pooler.supabase.com:5432/postgres', {
  max: 1,
  idle_timeout: 20,
  connect_timeout: 10
});

async function deleteWrongAdjustments() {
  try {
    console.log('Deleting incorrect adjustment transactions...\n')

    // Delete the donation adjustments that were calculated incorrectly
    const result = await sql`
      DELETE FROM payment_transactions
      WHERE description = 'Pot balance adjustment - Manual correction'
      AND transaction_type = 'donation'
      RETURNING user_id, amount, transaction_type
    `

    console.log(`Deleted ${result.length} incorrect adjustment(s):`)
    result.forEach(r => {
      console.log(`  - User ID ${r.user_id}: €${r.amount} ${r.transaction_type}`)
    })

    await sql.end()
    process.exit(0)
  } catch (error) {
    console.error('❌ Error:', error.message)
    console.error(error)
    await sql.end()
    process.exit(1)
  }
}

deleteWrongAdjustments()
