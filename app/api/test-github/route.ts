import { NextRequest, NextResponse } from 'next/server';

// Runtime configuration for production
export const runtime = 'nodejs';
export const maxDuration = 30;

// CORS headers for production
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { headers: corsHeaders });
}

export async function GET(request: NextRequest) {
  try {
    // Test environment variables
    const envCheck = {
      githubToken: process.env.GITHUB_TOKEN ? 'SET' : 'NOT SET',
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'NOT SET',
      supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'NOT SET',
      groqKey: process.env.GROQ_API_KEY ? 'SET' : 'NOT SET',
      vercelUrl: process.env.VERCEL_URL || 'NOT SET',
    };

    // Test GitHub API connectivity
    let githubTest = { success: false, error: null, data: null };
    
    if (process.env.GITHUB_TOKEN) {
      try {
        const response = await fetch('https://api.github.com/user', {
          headers: {
            Authorization: `token ${process.env.GITHUB_TOKEN}`,
            'User-Agent': 'ChurrosAI/1.0',
          },
        });

        if (response.ok) {
          const userData = await response.json();
          githubTest = { 
            success: true, 
            error: null, 
            data: { login: userData.login, id: userData.id } 
          };
        } else {
          githubTest = { 
            success: false, 
            error: `GitHub API Error: ${response.status} ${response.statusText}`,
            data: null 
          };
        }
      } catch (error) {
        githubTest = { 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error',
          data: null 
        };
      }
    } else {
      githubTest = { 
        success: false, 
        error: 'GitHub token not configured',
        data: null 
      };
    }

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      environment: envCheck,
      githubTest,
      message: 'GitHub API connectivity test completed'
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('Test GitHub API error:', error);
    return NextResponse.json({
      error: 'Test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500, headers: corsHeaders });
  }
} 