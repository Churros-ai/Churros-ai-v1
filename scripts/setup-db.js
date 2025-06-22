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

async function executeSQL(sql) {
  try {
    // Split SQL into individual statements
    const statements = sql.split(';').filter(stmt => stmt.trim());
    
    for (const statement of statements) {
      if (statement.trim()) {
        console.log(`Executing: ${statement.trim().substring(0, 50)}...`);
        
        const { error } = await supabase.rpc('exec_sql', { 
          sql: statement.trim() + ';' 
        });
        
        if (error) {
          console.error('❌ Error:', error);
          return false;
        }
      }
    }
    return true;
  } catch (error) {
    console.error('❌ Error executing SQL:', error);
    return false;
  }
}

async function setupDatabase() {
  console.log('🚀 Setting up database tables...\n');
  
  // Migration 1: Create profiles table
  console.log('📄 Creating profiles table...');
  const migration1 = `
    CREATE TYPE IF NOT EXISTS platform_type AS ENUM ('twitter', 'github', 'substack', 'linkedin', 'other');
    
    CREATE TABLE IF NOT EXISTS profiles (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        name TEXT NOT NULL,
        bio TEXT,
        platform platform_type NOT NULL,
        tags TEXT[] DEFAULT '{}',
        score FLOAT DEFAULT 0.0,
        last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        fit_summary TEXT,
        profile_url TEXT,
        tracking_count INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    CREATE INDEX IF NOT EXISTS idx_profiles_platform ON profiles(platform);
    CREATE INDEX IF NOT EXISTS idx_profiles_tags ON profiles USING GIN(tags);
    CREATE INDEX IF NOT EXISTS idx_profiles_score ON profiles(score DESC);
    CREATE INDEX IF NOT EXISTS idx_profiles_last_updated ON profiles(last_updated DESC);
    
    ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "Allow all operations on profiles" ON profiles;
    CREATE POLICY "Allow all operations on profiles" ON profiles
        FOR ALL USING (true);
    
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
    END;
    $$ language 'plpgsql';
    
    DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
    CREATE TRIGGER update_profiles_updated_at 
        BEFORE UPDATE ON profiles 
        FOR EACH ROW 
        EXECUTE FUNCTION update_updated_at_column();
  `;
  
  const success1 = await executeSQL(migration1);
  if (!success1) {
    console.error('❌ Failed to create profiles table');
    return;
  }
  
  console.log('✅ Profiles table created successfully!\n');
  
  // Migration 2: Create tracked_profiles table
  console.log('📄 Creating tracked_profiles table...');
  const migration2 = `
    CREATE TABLE IF NOT EXISTS tracked_profiles (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL,
        notes TEXT,
        status TEXT DEFAULT 'interested' CHECK (status IN ('interested', 'contacted', 'hired', 'rejected')),
        tracked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(profile_id, user_id)
    );
    
    CREATE INDEX IF NOT EXISTS idx_tracked_profiles_user_id ON tracked_profiles(user_id);
    CREATE INDEX IF NOT EXISTS idx_tracked_profiles_profile_id ON tracked_profiles(profile_id);
    CREATE INDEX IF NOT EXISTS idx_tracked_profiles_status ON tracked_profiles(status);
    CREATE INDEX IF NOT EXISTS idx_tracked_profiles_tracked_at ON tracked_profiles(tracked_at DESC);
    
    ALTER TABLE tracked_profiles ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "Allow all operations on tracked_profiles" ON tracked_profiles;
    CREATE POLICY "Allow all operations on tracked_profiles" ON tracked_profiles
        FOR ALL USING (true);
    
    DROP TRIGGER IF EXISTS update_tracked_profiles_updated_at ON tracked_profiles;
    CREATE TRIGGER update_tracked_profiles_updated_at 
        BEFORE UPDATE ON tracked_profiles 
        FOR EACH ROW 
        EXECUTE FUNCTION update_updated_at_column();
  `;
  
  const success2 = await executeSQL(migration2);
  if (!success2) {
    console.error('❌ Failed to create tracked_profiles table');
    return;
  }
  
  console.log('✅ Tracked profiles table created successfully!\n');
  console.log('🎉 Database setup completed!');
  console.log('Your tables are now ready for use.');
}

setupDatabase().catch(console.error); 