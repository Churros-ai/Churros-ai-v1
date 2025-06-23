import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  const results = {
    github: { status: 'not tested', error: null as string | null },
    twitter: { status: 'not tested', error: null as string | null },
    groq: { status: 'not tested', error: null as string | null },
    supabase: { status: 'not tested', error: null as string | null }
  };

  // Test GitHub
  try {
    const githubToken = process.env.GITHUB_TOKEN;
    if (githubToken) {
      const response = await fetch('https://api.github.com/user', {
        headers: {
          Authorization: `token ${githubToken}`,
          'User-Agent': 'ChurrosAI/1.0',
        },
      });
      results.github.status = response.ok ? 'working' : `error: ${response.status}`;
      if (!response.ok) {
        results.github.error = await response.text();
      }
    } else {
      results.github.status = 'no token';
    }
  } catch (error) {
    results.github.status = 'failed';
    results.github.error = error instanceof Error ? error.message : 'Unknown error';
  }

  // Test Twitter
  try {
    const twitterToken = process.env.TWITTER_BEARER_TOKEN;
    if (twitterToken) {
      const response = await fetch('https://api.twitter.com/2/users/by/username/twitter', {
        headers: {
          Authorization: `Bearer ${twitterToken}`,
        },
      });
      results.twitter.status = response.ok ? 'working' : `error: ${response.status}`;
      if (!response.ok) {
        results.twitter.error = await response.text();
      }
    } else {
      results.twitter.status = 'no token';
    }
  } catch (error) {
    results.twitter.status = 'failed';
    results.twitter.error = error instanceof Error ? error.message : 'Unknown error';
  }

  // Test Groq
  try {
    const groqKey = process.env.GROQ_API_KEY;
    if (groqKey) {
      const response = await fetch('https://api.groq.com/openai/v1/models', {
        headers: {
          Authorization: `Bearer ${groqKey}`,
        },
      });
      results.groq.status = response.ok ? 'working' : `error: ${response.status}`;
      if (!response.ok) {
        results.groq.error = await response.text();
      }
    } else {
      results.groq.status = 'no key';
    }
  } catch (error) {
    results.groq.status = 'failed';
    results.groq.error = error instanceof Error ? error.message : 'Unknown error';
  }

  // Test Supabase
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (supabaseUrl && supabaseKey) {
      const supabase = createClient(supabaseUrl, supabaseKey);
      const { data, error } = await supabase.from('profiles').select('count').limit(1);
      results.supabase.status = error ? `error: ${error.message}` : 'working';
      if (error) {
        results.supabase.error = error.message;
      }
    } else {
      results.supabase.status = 'missing credentials';
    }
  } catch (error) {
    results.supabase.status = 'failed';
    results.supabase.error = error instanceof Error ? error.message : 'Unknown error';
  }

  return NextResponse.json(results);
} 