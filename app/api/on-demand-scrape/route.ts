import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import * as playwright from 'playwright';
import { Profile, PlatformType } from '@/lib/types';
import { randomUUID } from 'crypto';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(request: NextRequest) {
  try {
    const { query, platform = 'github', limit = 10 } = await request.json();

    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    console.log(`On-demand scraping for: ${query} on ${platform}`);

    // Scrape real profiles
    const profiles = await scrapeProfiles(query, platform, limit);
    
    if (profiles.length === 0) {
      return NextResponse.json({ 
        profiles: [],
        message: 'No profiles found for the given query'
      });
    }

    // Analyze profiles with AI
    const analyzedProfiles = await analyzeProfilesWithAI(query, profiles);
    
    // Save to database
    await saveProfilesToDatabase(analyzedProfiles);

    return NextResponse.json({
      profiles: analyzedProfiles,
      count: analyzedProfiles.length
    });

  } catch (error) {
    console.error('Error in on-demand scraping:', error);
    return NextResponse.json({ 
      error: 'Failed to scrape profiles',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * Main scraping function using Playwright
 */
async function scrapeProfiles(
  query: string,
  platform: PlatformType,
  limit: number
): Promise<Profile[]> {
  const profiles: Profile[] = [];
  
  try {
    const browser = await playwright.chromium.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled']
    });
    
    const page = await browser.newPage();
    
    // Set more realistic headers to avoid detection
    await page.setExtraHTTPHeaders({
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Accept-Encoding': 'gzip, deflate, br',
      'DNT': '1',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
    });
    
    // Add GitHub token if available
    const githubToken = process.env.GITHUB_TOKEN;
    if (githubToken) {
      await page.setExtraHTTPHeaders({
        'Authorization': `token ${githubToken}`
      });
    }
    
    await page.setViewportSize({ width: 1920, height: 1080 });

    if (platform === 'github') {
      const githubProfiles = await scrapeGitHubProfiles(page, query, limit);
      profiles.push(...githubProfiles);
    } else if (platform === 'twitter') {
      const twitterProfiles = await scrapeTwitterProfiles(page, query, limit);
      profiles.push(...twitterProfiles);
    } else if (platform === 'linkedin') {
      const linkedinProfiles = await scrapeLinkedInProfiles(page, query, limit);
      profiles.push(...linkedinProfiles);
    }

    await browser.close();
    console.log(`Scraped ${profiles.length} real profiles for query: ${query}`);
    
  } catch (error) {
    console.error('Error in scraping:', error);
    throw new Error(`Scraping failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return profiles;
}

/**
 * Scrape GitHub profiles
 */
async function scrapeGitHubProfiles(page: any, query: string, limit: number): Promise<Profile[]> {
  const profiles: Profile[] = [];
  try {
    // Search GitHub users
    const searchUrl = `https://github.com/search?q=${encodeURIComponent(query)}&type=users`;
    console.log(`[DEBUG] Scraping GitHub URL: ${searchUrl}`);
    await page.goto(searchUrl, { waitUntil: 'networkidle', timeout: 30000 });

    // Use the latest selector for user cards
    const userElements = await page.$$(`div[data-testid="search-user-result"]`);
    console.log(`[DEBUG] Found ${userElements.length} user cards`);

    // If no results from scraping, try GitHub API
    if (userElements.length === 0) {
      console.log('[DEBUG] No results from scraping, trying GitHub API...');
      return await scrapeGitHubWithAPI(query, limit);
    }

    for (let i = 0; i < Math.min(limit, userElements.length); i++) {
      try {
        const userElement = userElements[i];
        // Username
        const usernameElement = await userElement.$('a[data-testid="UserLink"]');
        const usernameHref = usernameElement ? await usernameElement.getAttribute('href') : null;
        const username = usernameHref ? usernameHref.replace('/', '') : null;
        // Name
        const nameElement = await userElement.$('span[data-testid="UserName"]');
        const name = nameElement ? (await nameElement.textContent())?.trim() : username;
        // Bio
        const bioElement = await userElement.$('p[data-testid="UserBio"]');
        const bio = bioElement ? (await bioElement.textContent())?.trim() : '';
        // Debug log extracted values
        console.log(`[DEBUG] Element ${i}: username=${username}, name=${name}, bio=${bio}`);
        if (!username) {
          console.log(`[DEBUG] Skipping element ${i} - no username found`);
          continue;
        }
        // Extract tags from bio and username
        const tags = extractTags(bio + ' ' + username);
        const profile: Profile = {
          id: randomUUID(),
          name: name || username,
          bio: bio || `GitHub user ${username}`,
          platform: 'github',
          tags: tags,
          score: 0.7,
          last_updated: new Date().toISOString(),
          fit_summary: null,
          profile_url: `https://github.com/${username}`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        profiles.push(profile);
        console.log(`[DEBUG] Added profile: ${JSON.stringify(profile)}`);
      } catch (error) {
        console.error(`[DEBUG] Error extracting profile ${i}:`, error);
        continue;
      }
    }
  } catch (error) {
    console.error('[DEBUG] Error scraping GitHub:', error);
    // Try GitHub API as fallback
    console.log('[DEBUG] Scraping failed, trying GitHub API...');
    return await scrapeGitHubWithAPI(query, limit);
  }
  return profiles;
}

/**
 * Scrape GitHub using official API
 */
async function scrapeGitHubWithAPI(query: string, limit: number): Promise<Profile[]> {
  const profiles: Profile[] = [];
  const githubToken = process.env.GITHUB_TOKEN;
  
  // Use enhanced NLP parser
  const { searchQuery, filters, sortBy } = parseGitHubQuery(query);
  
  // Build the final GitHub API query
  let githubQuery = '';
  
  if (filters.length > 0) {
    // Use filters as the main query (they include the search terms)
    githubQuery = filters.join(' ');
  } else {
    // Fallback to search query if no filters
    githubQuery = searchQuery;
  }
  
  console.log(`[DEBUG] Final GitHub API query: '${githubQuery}'`);
  console.log(`[DEBUG] Sort by: ${sortBy}`);
  
  try {
    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'Churros-AI-Lead-Generator'
    };
    
    if (githubToken) {
      headers['Authorization'] = `token ${githubToken}`;
    }
    
    // Build URL with sort parameter
    const url = `https://api.github.com/search/users?q=${encodeURIComponent(githubQuery)}&sort=${sortBy}&order=desc&per_page=${limit * 2}`;
    console.log(`[DEBUG] GitHub API URL: ${url}`);
    
    const response = await fetch(url, { headers });
    
    if (!response.ok) {
      console.error(`[DEBUG] GitHub API error: ${response.status} ${response.statusText}`);
      return [];
    }
    
    const data = await response.json();
    console.log(`[DEBUG] GitHub API found ${data.items?.length || 0} users`);
    
    for (const user of data.items || []) {
      try {
        // Skip enterprise/organization accounts
        if (user.type === 'Organization') {
          console.log(`[DEBUG] Skipping organization: ${user.login}`);
          continue;
        }
        
        // Get detailed user info
        const userResponse = await fetch(`https://api.github.com/users/${user.login}`, { headers });
        const userData = userResponse.ok ? await userResponse.json() : user;
        
        // Skip if it's an organization
        if (userData.type === 'Organization') {
          console.log(`[DEBUG] Skipping organization (detailed): ${user.login}`);
          continue;
        }
        
        // Skip if no bio and low activity (likely inactive accounts)
        if (!userData.bio && userData.public_repos < 1) {
          console.log(`[DEBUG] Skipping inactive user: ${user.login}`);
          continue;
        }
        
        const profile: Profile = {
          id: randomUUID(),
          name: userData.name || user.login,
          bio: userData.bio || `Active GitHub developer`,
          platform: 'github',
          username: user.login,
          tags: extractTags((userData.bio || '') + ' ' + user.login + ' ' + (userData.company || '')),
          score: 0.7,
          last_updated: new Date().toISOString(),
          fit_summary: null,
          profile_url: userData.html_url || `https://github.com/${user.login}`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        profiles.push(profile);
        console.log(`[DEBUG] Added API profile: ${user.login}`);
        
        // Stop when we have enough individual users
        if (profiles.length >= limit) {
          break;
        }
      } catch (error) {
        console.error(`[DEBUG] Error getting user details for ${user.login}:`, error);
        continue;
      }
    }
  } catch (error) {
    console.error('[DEBUG] Error with GitHub API:', error);
  }
  
  return profiles;
}

/**
 * Scrape Twitter profiles
 */
async function scrapeTwitterProfiles(page: any, query: string, limit: number): Promise<Profile[]> {
  const profiles: Profile[] = [];
  
  try {
    // Search Twitter users
    const searchUrl = `https://twitter.com/search?q=${encodeURIComponent(query)}&src=typed_query&f=user`;
    await page.goto(searchUrl, { waitUntil: 'networkidle' });
    
    // Wait for results to load
    await page.waitForSelector('[data-testid="UserCell"]', { timeout: 10000 });
    
    // Extract user profiles
    const userElements = await page.$$('[data-testid="UserCell"]');
    
    for (let i = 0; i < Math.min(limit, userElements.length); i++) {
      try {
        const userElement = userElements[i];
        
        // Extract username
        const usernameElement = await userElement.$('[data-testid="User-Name"] a');
        const username = usernameElement ? await usernameElement.textContent() : null;
        
        if (!username) continue;
        
        // Extract bio
        const bioElement = await userElement.$('[data-testid="UserDescription"]');
        const bio = bioElement ? await bioElement.textContent() : '';
        
        // Extract display name
        const nameElement = await userElement.$('[data-testid="UserName"] span');
        const name = nameElement ? await nameElement.textContent() : username;
        
        // Extract tags
        const tags = extractTags(bio + ' ' + username);
        
        const profile: Profile = {
          id: randomUUID(),
          name: name.trim(),
          bio: bio.trim(),
          platform: 'twitter',
          username: username,
          tags: tags,
          score: 0.7,
          last_updated: new Date().toISOString(),
          fit_summary: null,
          profile_url: `https://twitter.com/${username}`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        profiles.push(profile);
        
      } catch (error) {
        console.error(`Error extracting Twitter profile ${i}:`, error);
        continue;
      }
    }
    
  } catch (error) {
    console.error('Error scraping Twitter:', error);
    throw error;
  }
  
  return profiles;
}

/**
 * Scrape LinkedIn profiles
 */
async function scrapeLinkedInProfiles(page: any, query: string, limit: number): Promise<Profile[]> {
  const profiles: Profile[] = [];
  
  try {
    // Search LinkedIn people
    const searchUrl = `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(query)}`;
    await page.goto(searchUrl, { waitUntil: 'networkidle' });
    
    // Wait for results to load
    await page.waitForSelector('.entity-result__item', { timeout: 10000 });
    
    // Extract user profiles
    const userElements = await page.$$('.entity-result__item');
    
    for (let i = 0; i < Math.min(limit, userElements.length); i++) {
      try {
        const userElement = userElements[i];
        
        // Extract name
        const nameElement = await userElement.$('.entity-result__title-text a');
        const name = nameElement ? await nameElement.textContent() : null;
        
        if (!name) continue;
        
        // Extract title
        const titleElement = await userElement.$('.entity-result__primary-subtitle');
        const title = titleElement ? await titleElement.textContent() : '';
        
        // Extract bio
        const bioElement = await userElement.$('.entity-result__summary');
        const bio = bioElement ? await bioElement.textContent() : title;
        
        // Extract tags
        const tags = extractTags(bio + ' ' + title);
        
        const profile: Profile = {
          id: randomUUID(),
          name: name.trim(),
          bio: bio.trim(),
          platform: 'linkedin',
          username: name.toLowerCase().replace(/\s+/g, '-'),
          tags: tags,
          score: 0.7,
          last_updated: new Date().toISOString(),
          fit_summary: null,
          profile_url: `https://linkedin.com/in/${name.toLowerCase().replace(/\s+/g, '-')}`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        profiles.push(profile);
        
      } catch (error) {
        console.error(`Error extracting LinkedIn profile ${i}:`, error);
        continue;
      }
    }
    
  } catch (error) {
    console.error('Error scraping LinkedIn:', error);
    throw error;
  }
  
  return profiles;
}

/**
 * Analyze profiles with AI
 */
async function analyzeProfilesWithAI(
  query: string,
  profiles: Profile[]
): Promise<Profile[]> {
  const groqApiKey = process.env.GROQ_API_KEY;
  
  if (!groqApiKey) {
    console.warn('GROQ_API_KEY not found, skipping AI analysis');
    return profiles;
  }

  const analyzedProfiles: Profile[] = [];

  for (const profile of profiles) {
    try {
      const analysis = await analyzeProfileWithGroq(query, profile);
      
      analyzedProfiles.push({
        ...profile,
        fit_summary: analysis.fitSummary,
        score: analysis.score,
        tags: [...new Set([...profile.tags, ...analysis.tags])]
      });
      
    } catch (error) {
      console.error(`Error analyzing profile ${profile.name}:`, error);
      // Keep profile without AI analysis
      analyzedProfiles.push(profile);
    }
  }

  return analyzedProfiles;
}

/**
 * Analyze a single profile with Groq AI
 */
async function analyzeProfileWithGroq(
  query: string,
  profile: Profile
): Promise<{ fitSummary: string; score: number; tags: string[] }> {
  const groqApiKey = process.env.GROQ_API_KEY;
  
  if (!groqApiKey) {
    return {
      fitSummary: `Profile matches ${query} criteria`,
      score: 0.7,
      tags: profile.tags || []
    };
  }

  try {
    const prompt = `Analyze this candidate profile for a job search and respond ONLY with valid JSON.

Query: "${query}"
Candidate: ${profile.name}
Bio: ${profile.bio || 'No bio available'}
Platform: ${profile.platform}

Respond with ONLY this JSON format (no other text):
{
  "fitSummary": "Brief summary of why this candidate fits",
  "score": 0.85,
  "tags": ["tag1", "tag2", "tag3"]
}`;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama3-70b-8192',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 500
      })
    });

    if (!response.ok) {
      throw new Error(`Groq API error: ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      throw new Error('No content in Groq response');
    }

    // Try to extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const analysis = JSON.parse(jsonMatch[0]);
    
    return {
      fitSummary: analysis.fitSummary || `Profile matches ${query} criteria`,
      score: analysis.score || 0.7,
      tags: analysis.tags || profile.tags || []
    };
    
  } catch (error) {
    console.error('Error in Groq analysis:', error);
    return {
      fitSummary: `Profile matches ${query} criteria`,
      score: 0.7,
      tags: profile.tags || []
    };
  }
}

/**
 * Save profiles to database
 */
async function saveProfilesToDatabase(profiles: Profile[]): Promise<void> {
  try {
    for (const profile of profiles) {
      try {
        const { error } = await supabase
          .from('profiles')
          .upsert({
            id: profile.id,
            name: profile.name,
            bio: profile.bio,
            platform: profile.platform,
            username: profile.username,
            tags: profile.tags,
            score: profile.score,
            last_updated: profile.last_updated,
            fit_summary: profile.fit_summary,
            profile_url: profile.profile_url,
            created_at: profile.created_at,
            updated_at: profile.updated_at
          });

        if (error) {
          console.error('Error saving profile to database:', error);
        }
      } catch (error) {
        console.error('Error saving profile to database:', error);
      }
    }
  } catch (error) {
    console.error('Error in database save:', error);
  }
}

/**
 * Extract tags from text
 */
function extractTags(text: string): string[] {
  const tags: string[] = [];
  const textLower = text.toLowerCase();
  
  // Common tech tags
  const techKeywords = [
    'javascript', 'python', 'react', 'node', 'typescript', 'java', 'go', 'rust',
    'ai', 'ml', 'machine learning', 'data science', 'frontend', 'backend',
    'devops', 'cloud', 'aws', 'docker', 'kubernetes', 'sql', 'nosql',
    'design', 'ux', 'ui', 'product', 'management', 'leadership'
  ];
  
  techKeywords.forEach(keyword => {
    if (textLower.includes(keyword)) {
      tags.push(keyword.replace(/\s+/g, '-'));
    }
  });
  
  return tags.slice(0, 10); // Limit to 10 tags
}

/**
 * Robust GitHub query parser that handles complex natural language
 */
function parseGitHubQuery(prompt: string): { searchQuery: string, filters: string[], sortBy: string } {
  const queryLower = prompt.toLowerCase();
  
  console.log('[DEBUG] Parsing GitHub query:', prompt);
  
  // Comprehensive role/skill detection
  const roles = [
    'designer', 'developer', 'engineer', 'manager', 'lead', 'architect', 
    'artist', 'writer', 'founder', 'maker', 'builder', 'hacker', 'coder', 
    'programmer', 'consultant', 'specialist', 'expert', 'professional',
    'frontend', 'backend', 'fullstack', 'ui', 'ux', 'product', 'data',
    'devops', 'mobile', 'web', 'software', 'systems', 'cloud', 'ai', 'ml',
    'machine learning', 'data science', 'analyst', 'scientist'
  ];
  
  // Activity indicators
  const activityKeywords = [
    'active', 'activity', 'recent', 'commit', 'contributor', 'repos', 
    'repository', 'contributions', 'posts', 'tweets', 'updates', 'latest',
    'ongoing', 'current', 'recently', 'frequently', 'regular'
  ];
  
  // Experience level indicators
  const experienceKeywords = [
    'senior', 'junior', 'mid', 'experienced', 'expert', 'beginner', 
    'advanced', 'intermediate', 'veteran', 'seasoned', 'new', 'fresh'
  ];
  
  // Extract all relevant keywords (don't strip them!)
  const detectedKeywords: string[] = [];
  
  // Extract roles
  for (const role of roles) {
    if (queryLower.includes(role)) {
      detectedKeywords.push(role);
    }
  }
  
  // Extract experience level
  const experienceLevel = experienceKeywords.find(keyword => queryLower.includes(keyword)) || '';
  if (experienceLevel) {
    detectedKeywords.push(experienceLevel);
  }
  
  // Check for activity
  const hasActivity = activityKeywords.some(keyword => queryLower.includes(keyword));
  
  console.log('[DEBUG] Detected keywords:', detectedKeywords);
  console.log('[DEBUG] Has activity:', hasActivity);
  
  // Build search query - KEEP ALL RELEVANT KEYWORDS
  let searchQuery = '';
  
  if (detectedKeywords.length > 0) {
    // Use all detected keywords
    searchQuery = detectedKeywords.join(' ');
  } else {
    // If no keywords detected, extract meaningful words from the prompt
    const words = prompt.toLowerCase().split(/\s+/);
    const meaningfulWords = words.filter(word => 
      word.length > 2 && 
      !['with', 'who', 'that', 'have', 'has', 'are', 'is', 'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'by', 'github', 'git'].includes(word)
    );
    searchQuery = meaningfulWords.join(' ');
  }
  
  // If still empty, use a fallback
  if (!searchQuery.trim()) {
    searchQuery = 'developer';
  }
  
  // Build GitHub API filters
  const filters: string[] = [];
  let sortBy = 'followers'; // Default sort
  
  // Add activity filters if requested
  if (hasActivity) {
    filters.push('repos:>1');
    filters.push('followers:>10');
    sortBy = 'repositories'; // Sort by repository count for active users
  }
  
  // Add experience-based filters
  if (experienceLevel === 'senior' || experienceLevel === 'experienced' || experienceLevel === 'expert') {
    filters.push('repos:>5');
    filters.push('followers:>50');
  }
  
  // Add bio search to focus on relevant profiles
  if (searchQuery) {
    filters.push(`in:bio ${searchQuery}`);
  }
  
  console.log('[DEBUG] Final GitHub query:', { 
    searchQuery, 
    filters, 
    sortBy,
    finalQuery: filters.join(' ')
  });
  
  return { searchQuery, filters, sortBy };
} 