const postgres = require('postgres');

const sql = postgres('postgresql://postgres.cltndnfdtytimrwticej:1UMGDjPFX02UJ6N6@aws-0-eu-west-3.pooler.supabase.com:5432/postgres', {
  max: 1
});

async function testQuery() {
  try {
    const profiles = await sql`
      SELECT username, total_penalty_owed
      FROM profiles
      WHERE username IN ('Stephan', 'Pauli', 'derfriesinger', 'Peter', 'Matthijs', 'Marius', 'Harry', 'Roel')
      ORDER BY username
    `;

    console.log('\n✅ Penalty amounts in database:');
    profiles.forEach(p => console.log(`  ${p.username}: €${p.total_penalty_owed || 0}`));

    const total = profiles.reduce((sum, p) => sum + (p.total_penalty_owed || 0), 0);
    console.log(`\n💰 Total pot: €${total}`);

    await sql.end();
  } catch (error) {
    console.error('❌ Query failed:', error.message);
  }
}

testQuery();
