const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = 'https://cltndnfdtytimrwticej.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNsdG5kbmZkdHl0aW1yd3RpY2VqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NzY2Mjk2OCwiZXhwIjoyMDYzMjM4OTY4fQ.jsxe-QXQ8C31R4aWVCP-o6UKpAF8n1LAu2xcg2sdMRk';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  try {
    console.log('🚀 Starting migration...');
    
    const migrationSQL = fs.readFileSync('system-message-restructure-migration.sql', 'utf8');
    
    // Split the migration into individual statements
    const statements = migrationSQL.split(';').filter(stmt => stmt.trim().length > 0);
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i].trim();
      if (statement.length === 0) continue;
      
      console.log(`Executing statement ${i + 1}/${statements.length}...`);
      
      try {
        const { data, error } = await supabase.rpc('exec_sql', {
          sql: statement
        });
        
        if (error) {
          console.error(`Error in statement ${i + 1}:`, error);
        } else {
          console.log(`✅ Statement ${i + 1} completed`);
        }
      } catch (err) {
        console.error(`Error executing statement ${i + 1}:`, err);
      }
    }
    
    console.log('✅ Migration completed!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
}

runMigration();