#!/usr/bin/env tsx

import { execSync } from 'child_process';
import { existsSync, writeFileSync } from 'fs';
import { join } from 'path';

console.log('🚀 Setting up Churros AI Lead Generation System...\n');

// Check if .env.local exists
const envPath = join(process.cwd(), '.env.local');
if (!existsSync(envPath)) {
  console.log('📝 Creating .env.local file...');
  
  const envContent = `# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Groq AI Configuration
GROQ_API_KEY=your_groq_api_key

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
`;

  writeFileSync(envPath, envContent);
  console.log('✅ Created .env.local file');
  console.log('⚠️  Please update the environment variables in .env.local with your actual values\n');
} else {
  console.log('✅ .env.local file already exists\n');
}

// Check if dependencies are installed
try {
  console.log('📦 Checking dependencies...');
  execSync('npm list @supabase/supabase-js', { stdio: 'pipe' });
  console.log('✅ Dependencies are installed\n');
} catch (error) {
  console.log('📦 Installing dependencies...');
  try {
    execSync('npm install', { stdio: 'inherit' });
    console.log('✅ Dependencies installed successfully\n');
  } catch (installError) {
    console.error('❌ Failed to install dependencies:', installError);
    process.exit(1);
  }
}

// Check if Playwright browsers are installed
try {
  console.log('🌐 Checking Playwright browsers...');
  execSync('npx playwright install chromium', { stdio: 'pipe' });
  console.log('✅ Playwright browsers are ready\n');
} catch (error) {
  console.log('🌐 Installing Playwright browsers...');
  try {
    execSync('npx playwright install chromium', { stdio: 'inherit' });
    console.log('✅ Playwright browsers installed successfully\n');
  } catch (browserError) {
    console.error('❌ Failed to install Playwright browsers:', browserError);
    process.exit(1);
  }
}

console.log('🎉 Setup completed successfully!');
console.log('\n📋 Next steps:');
console.log('1. Update the environment variables in .env.local');
console.log('2. Set up your Supabase database and run migrations');
console.log('3. Get your Groq API key from https://console.groq.com');
console.log('4. Run "npm run dev" to start the development server');
console.log('5. Run "npm run scrape" to test the scraper');
console.log('\n📚 For more information, see the README.md file'); 