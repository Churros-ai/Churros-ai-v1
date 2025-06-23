import { NextRequest, NextResponse } from 'next/server';
import chromium from '@sparticuz/chromium';
import * as playwright from 'playwright-core';

export async function POST(request: NextRequest) {
  try {
    const { query, platform = 'github', limit = 5 } = await request.json();
    
    console.log(`[TEST] Testing scrape-only for: ${query} on ${platform}`);
    
    // Test only the scraping part, no AI analysis or database
    const profiles = await testScrapeOnly(query, platform, limit);
    
    return NextResponse.json({
      success: true,
      profiles: profiles,
      count: profiles.length
    });
    
  } catch (error) {
    console.error('[TEST] Scrape-only test failed:', error);
    return NextResponse.json({
      error: 'Scrape-only test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

async function testScrapeOnly(query: string, platform: string, limit: number) {
  let browser = null;
  
  try {
    console.log('[TEST] Launching browser...');
    browser = await playwright.chromium.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true,
    });

    const page = await browser.newPage();
    await page.setViewportSize({ width: 1920, height: 1080 });

    if (platform === 'github') {
      console.log('[TEST] Testing GitHub scraping...');
      return await testGitHubScraping(page, query, limit);
    } else if (platform === 'twitter') {
      console.log('[TEST] Testing Twitter scraping...');
      return await testTwitterScraping(page, query, limit);
    }
    
    return [];
    
  } catch (error) {
    console.error('[TEST] Browser error:', error);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

async function testGitHubScraping(page: any, query: string, limit: number) {
  try {
    console.log('[TEST] Testing GitHub API...');
    const githubToken = process.env.GITHUB_TOKEN;
    
    if (!githubToken) {
      throw new Error('GitHub token not found');
    }
    
    const apiUrl = `https://api.github.com/search/users?q=${encodeURIComponent(query)}&per_page=${limit}`;
    console.log(`[TEST] GitHub API URL: ${apiUrl}`);
    
    const response = await fetch(apiUrl, {
      headers: {
        Authorization: `token ${githubToken}`,
        'User-Agent': 'ChurrosAI/1.0',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`GitHub API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log(`[TEST] GitHub API returned ${data.items.length} users`);
    
    return data.items.slice(0, limit).map((user: any) => ({
      name: user.login,
      bio: 'Test profile',
      platform: 'github'
    }));
    
  } catch (error) {
    console.error('[TEST] GitHub scraping failed:', error);
    throw error;
  }
}

async function testTwitterScraping(page: any, query: string, limit: number) {
  try {
    console.log('[TEST] Testing Twitter API...');
    const twitterToken = process.env.TWITTER_BEARER_TOKEN;
    
    if (!twitterToken) {
      throw new Error('Twitter token not found');
    }
    
    const searchUrl = `https://api.twitter.com/2/tweets/search/recent?query=${encodeURIComponent(query)}&max_results=${limit * 2}&expansions=author_id&user.fields=description`;
    
    const response = await fetch(searchUrl, {
      headers: {
        Authorization: `Bearer ${twitterToken}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Twitter API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const users = data.includes?.users || [];
    console.log(`[TEST] Twitter API returned ${users.length} users`);
    
    return users.slice(0, limit).map((user: any) => ({
      name: user.name,
      bio: user.description || 'Test profile',
      platform: 'twitter'
    }));
    
  } catch (error) {
    console.error('[TEST] Twitter scraping failed:', error);
    throw error;
  }
} 