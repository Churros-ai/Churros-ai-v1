import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const githubToken = process.env.GITHUB_TOKEN;
  
  if (!githubToken) {
    return NextResponse.json({
      error: 'GitHub token is not set',
      status: 'missing'
    });
  }

  try {
    // Test the token by making a simple API call
    const response = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `token ${githubToken}`,
        'User-Agent': 'ChurrosAI/1.0',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json({
        error: `GitHub API returned ${response.status}`,
        details: errorText,
        status: 'unauthorized'
      });
    }

    const userData = await response.json();
    return NextResponse.json({
      success: true,
      user: userData.login,
      status: 'valid'
    });

  } catch (error) {
    return NextResponse.json({
      error: 'Failed to test GitHub token',
      details: error instanceof Error ? error.message : 'Unknown error',
      status: 'error'
    });
  }
} 