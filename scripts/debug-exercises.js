require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

(async () => {
  const { data, error } = await supabase
    .from('exercises')
    .select('id, name, points_per_unit, is_time_based, type')
    .order('name');

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('\n=== ALL EXERCISES WITH POINT VALUES ===\n');
    data.forEach(ex => {
      const timeLabel = ex.is_time_based ? '[TIME-BASED]' : '';
      console.log(`${ex.name.padEnd(25)} | ${ex.points_per_unit.toString().padStart(2)} pts/unit | ${timeLabel}`);
    });

    console.log('\n=== ANALYSIS ===');
    console.log('Time-based exercises:', data.filter(e => e.is_time_based).map(e => e.name).join(', '));
    console.log('\nPull-ups (4 pts):', data.filter(e => e.points_per_unit === 4).map(e => e.name).join(', '));
    console.log('Push-ups (2 pts):', data.filter(e => e.points_per_unit === 2).map(e => e.name).join(', '));
    console.log('Burpees (3 pts):', data.filter(e => e.points_per_unit === 3).map(e => e.name).join(', '));
    const notTimeBased = data.filter(e => e.is_time_based === false);
    console.log('Standard (1 pt):', notTimeBased.filter(e => e.points_per_unit === 1).map(e => e.name).join(', '));
  }
})();
