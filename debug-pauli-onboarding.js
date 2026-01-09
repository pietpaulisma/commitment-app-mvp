const postgres = require('postgres');

const sql = postgres('postgresql://postgres.cltndnfdtytimrwticej:1UMGDjPFX02UJ6N6@aws-0-eu-west-3.pooler.supabase.com:5432/postgres', {
  max: 1,
  idle_timeout: 20,
  connect_timeout: 10
});

async function checkPauliOnboarding() {
  try {
    console.log('=== Checking Pauli\'s Full Profile ===\n')

    const pauliProfile = await sql`
      SELECT *
      FROM profiles
      WHERE LOWER(username) LIKE 'pauli%'
    `

    if (pauliProfile.length === 0) {
      console.log('Could not find Pauli\'s profile')
      await sql.end()
      return
    }

    const pauli = pauliProfile[0]
    console.log('Full profile data:')
    Object.entries(pauli).forEach(([key, value]) => {
      console.log(`  ${key}: ${value}`)
    })

    // Check if onboarding_completed exists and its exact value
    console.log('\n=== Onboarding Status Details ===')
    console.log(`onboarding_completed value: ${pauli.onboarding_completed}`)
    console.log(`onboarding_completed type: ${typeof pauli.onboarding_completed}`)
    console.log(`onboarding_completed === true: ${pauli.onboarding_completed === true}`)
    console.log(`onboarding_completed == true: ${pauli.onboarding_completed == true}`)
    console.log(`Boolean(onboarding_completed): ${Boolean(pauli.onboarding_completed)}`)

    // Ensure it's explicitly true (not null, undefined, or any falsy value)
    if (pauli.onboarding_completed !== true) {
      console.log('\n⚠️  onboarding_completed is NOT explicitly true!')
      console.log('Fixing by setting to explicit true...')
      
      await sql`
        UPDATE profiles
        SET onboarding_completed = true
        WHERE id = ${pauli.id}
      `
      
      console.log('✅ Set onboarding_completed = true')
    } else {
      console.log('\n✅ onboarding_completed is explicitly true')
    }

    await sql.end()
    process.exit(0)
  } catch (error) {
    console.error('❌ Error:', error.message)
    console.error(error)
    await sql.end()
    process.exit(1)
  }
}

checkPauliOnboarding()
