const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const migrationFile = '000_create_exec_sql_function.sql';
  const sqlPath = path.join(__dirname, '..', 'supabase', 'migrations', migrationFile);
  const sql = fs.readFileSync(sqlPath, 'utf8');

  // The 'exec_sql' rpc does not exist yet.
  // A raw postgrest request is needed to execute the sql.
  const { error } = await supabase.rpc('query', { sql_query: sql });

  if (error) {
    console.error('Error running initial migration:', error);
    process.exit(1);
  }

  console.log('Successfully ran initial migration to create exec_sql function.');
}

run(); 