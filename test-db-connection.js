const postgres = require('postgres');

const sql = postgres('postgresql://postgres.cltndnfdtytimrwticej:1UMGDjPFX02UJ6N6@aws-0-eu-west-3.pooler.supabase.com:5432/postgres', {
  max: 1,
  idle_timeout: 20,
  connect_timeout: 10
});

async function testConnection() {
  try {
    console.log('Testing database connection...');

    // Test basic connection
    const result = await sql`SELECT current_database(), current_user`;
    console.log('✅ Connection successful!');
    console.log('Database:', result[0].current_database);
    console.log('User:', result[0].current_user);

    // List all tables
    const tables = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `;

    console.log('\n📋 Tables in database:');
    tables.forEach(t => console.log(`  - ${t.table_name}`));

    await sql.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    process.exit(1);
  }
}

testConnection();
