const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('Please check your .env.local file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration(migrationFile) {
  try {
    console.log(`📄 Running migration: ${migrationFile}`);
    
    const sqlPath = path.join(__dirname, '..', 'supabase', 'migrations', migrationFile);
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    const { error } = await supabase.rpc('exec_sql', { sql });
    
    if (error) {
      console.error(`❌ Error running ${migrationFile}:`, error);
      return false;
    }
    
    console.log(`✅ Successfully ran ${migrationFile}`);
    return true;
  } catch (error) {
    console.error(`❌ Error running ${migrationFile}:`, error);
    return false;
  }
}

async function runMigrations() {
  console.log('🚀 Starting database migrations...\n');
  
  const migrations = [
    '001_create_profiles_table.sql',
    '002_create_tracked_profiles_table.sql'
  ];
  
  for (const migration of migrations) {
    const success = await runMigration(migration);
    if (!success) {
      console.error(`❌ Failed to run migration: ${migration}`);
      process.exit(1);
    }
    console.log('');
  }
  
  console.log('🎉 All migrations completed successfully!');
  console.log('Your database tables are now ready.');
}

runMigrations().catch(console.error); 