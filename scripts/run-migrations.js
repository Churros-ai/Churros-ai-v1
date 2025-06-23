const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ Missing DATABASE_URL environment variable');
  console.error('Please add your full database connection string to .env.local');
  process.exit(1);
}

const client = new Client({ connectionString });

async function ensureMigrationsTable() {
  await client.query(`
    CREATE TABLE IF NOT EXISTS migrations_log (
      id SERIAL PRIMARY KEY,
      migration_name VARCHAR(255) NOT NULL UNIQUE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);
}

async function getRanMigrations() {
  const res = await client.query('SELECT migration_name FROM migrations_log');
  return new Set(res.rows.map(r => r.migration_name));
}

async function runMigration(migrationFile) {
  try {
    console.log(`📄 Running migration: ${migrationFile}`);
    const sqlPath = path.join(__dirname, '..', 'supabase', 'migrations', migrationFile);
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    await client.query(sql);
    await client.query('INSERT INTO migrations_log (migration_name) VALUES ($1)', [migrationFile]);
    
    console.log(`✅ Successfully ran and logged ${migrationFile}`);
    return true;
  } catch (error) {
    console.error(`❌ Error running ${migrationFile}:`, error);
    return false;
  }
}

async function runMigrations() {
  await client.connect();
  console.log('🚀 Starting database migrations...\n');
  
  try {
    await ensureMigrationsTable();
    const ranMigrations = await getRanMigrations();
    const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations');
    const allMigrations = fs.readdirSync(migrationsDir).sort();
  
    for (const migration of allMigrations) {
      if (!ranMigrations.has(migration)) {
    const success = await runMigration(migration);
    if (!success) {
      console.error(`❌ Failed to run migration: ${migration}`);
      process.exit(1);
    }
    console.log('');
      } else {
        console.log(`Skipping already run migration: ${migration}`);
      }
  }
  
  console.log('🎉 All migrations completed successfully!');
  } finally {
    await client.end();
  }
}

runMigrations().catch(error => {
  console.error('❌ Migration process failed:', error);
  process.exit(1);
}); 