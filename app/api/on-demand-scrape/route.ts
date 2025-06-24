import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import chromium from '@sparticuz/chromium';
import * as playwright from 'playwright-core';
import { Profile, PlatformType } from '@/lib/types';
import { randomUUID } from 'crypto';

// Runtime configuration for production
export const runtime = 'nodejs';
export const maxDuration = 60; // 60 seconds for scraping operations

// CORS headers for production
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function OPTIONS() {
  return new NextResponse(null, { headers: corsHeaders });
}

export async function POST(request: NextRequest) {
  // Comprehensive environment variable check
  console.log('[DEBUG] Vercel Environment Check:');
  console.log(`- GITHUB_TOKEN: ${process.env.GITHUB_TOKEN ? 'SET' : 'NOT SET'}`);
  console.log(`- TWITTER_BEARER_TOKEN: ${process.env.TWITTER_BEARER_TOKEN ? 'SET' : 'NOT SET'}`);
  console.log(`- GROQ_API_KEY: ${process.env.GROQ_API_KEY ? 'SET' : 'NOT SET'}`);
  console.log(`- SUPABASE_SERVICE_ROLE_KEY: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'NOT SET'}`);

  try {
    const { query, platform = 'github', limit = 10 } = await request.json();

    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400, headers: corsHeaders });
    }

    console.log(`On-demand scraping for: ${query} on ${platform}`);

    // Scrape real profiles
    const profiles = await scrapeProfiles(query, platform, limit);

    if (profiles.length === 0) {
      return NextResponse.json({
        profiles: [],
        message: 'No profiles found for the given query'
      }, { headers: corsHeaders });
    }

    // Analyze profiles with AI
    const analyzedProfiles = await analyzeProfilesWithAI(query, profiles);

    return NextResponse.json({
      profiles: analyzedProfiles,
      count: analyzedProfiles.length
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('[CRITICAL] ON-DEMAND SCRAPE FAILED:', JSON.stringify(error, null, 2));
    
    // Check if it's a GitHub authentication error
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const isGitHubAuthError = errorMessage.includes('GitHub API Unauthorized') || errorMessage.includes('Unauthorized');
    
    if (isGitHubAuthError) {
      const githubTokenStatus = process.env.GITHUB_TOKEN ? 'SET' : 'NOT SET';
      return NextResponse.json({
        error: 'GitHub authentication failed',
        details: `GitHub token status: ${githubTokenStatus}. ${errorMessage}`,
        solution: 'Please check your GitHub token in Vercel environment variables'
      }, { status: 401, headers: corsHeaders });
    }
    
    return NextResponse.json({
      error: 'Failed to scrape profiles',
      details: errorMessage
    }, { status: 500, headers: corsHeaders });
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
  let browser = null;

  try {
    console.log('[DEBUG] Launching browser with @sparticuz/chromium...');
    browser = await playwright.chromium.launch({
        args: chromium.args,
        executablePath: await chromium.executablePath(),
        headless: chromium.headless,
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
      // First, try to get profiles from public repositories
      console.log('[DEBUG] Starting repository-based profile discovery...');
      const repoProfiles = await scrapeGitHubFromRepos(query, Math.floor(limit / 2));
      profiles.push(...repoProfiles);
      console.log(`[DEBUG] Found ${repoProfiles.length} profiles from repositories`);

      // Then, get profiles from user search to fill the remaining slots
      const remainingLimit = limit - profiles.length;
      if (remainingLimit > 0) {
        console.log(`[DEBUG] Getting ${remainingLimit} more profiles from user search...`);
        const userProfiles = await scrapeGitHubProfiles(page, query, remainingLimit);
        profiles.push(...userProfiles);
        console.log(`[DEBUG] Found ${userProfiles.length} profiles from user search`);
      }
    } else if (platform === 'twitter') {
      const twitterProfiles = await scrapeTwitterProfiles(page, query, limit);
      profiles.push(...twitterProfiles);
    } else if (platform === 'linkedin') {
      const linkedinProfiles = await scrapeLinkedInProfiles(page, query, limit);
      profiles.push(...linkedinProfiles);
    }

    console.log(`Scraped ${profiles.length} real profiles for query: ${query}`);

  } catch (error) {
    console.error('Error in scraping:', error);
    throw new Error(`Scraping failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  } finally {
      if (browser) {
          await browser.close();
      }
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

  console.log(`[DEBUG] GitHub API - Token present: ${githubToken ? 'YES' : 'NO'}`);
  if (!githubToken) {
    console.error('[DEBUG] GitHub API - No token available, cannot make API calls');
    return [];
  }

  // Use enhanced NLP parser
  const { searchQuery, filters, sortBy } = parseGitHubQuery(query);

  // Build the final GitHub API query
  let githubQuery = '';

  if (filters.length > 0) {
    // Use filters as the main query (they include the search terms)
    githubQuery = filters.join(' ');
  } else {
    // Basic query if no filters are detected
    githubQuery = `${searchQuery} in:bio`;
  }
  console.log(`[DEBUG] Final GitHub API query: '${githubQuery}'`);
  console.log(`[DEBUG] Sort by: ${sortBy}`);


  const apiUrl = `https://api.github.com/search/users?q=${encodeURIComponent(githubQuery)}&sort=${sortBy}&order=desc&per_page=${limit * 2}`;
  console.log(`[DEBUG] GitHub API URL: ${apiUrl}`);

  try {
    const response = await fetch(apiUrl, {
      headers: {
        Authorization: `token ${githubToken}`,
        'User-Agent': 'ChurrosAI/1.0',
      },
    });

    if (!response.ok) {
      console.error(`[DEBUG] GitHub API error: ${response.status} ${response.statusText}`);
      const errorBody = await response.text();
      console.error(`[DEBUG] GitHub API error body: ${errorBody}`);
      
      if (response.status === 401) {
        throw new Error(`GitHub API Unauthorized: Token may be invalid or expired. Status: ${response.status}, Body: ${errorBody}`);
      } else if (response.status === 403) {
        throw new Error(`GitHub API Forbidden: Rate limit exceeded or insufficient permissions. Status: ${response.status}, Body: ${errorBody}`);
      } else {
        throw new Error(`GitHub API Error: ${response.status} ${response.statusText}. Body: ${errorBody}`);
      }
    }

    const data = await response.json();
    console.log(`[DEBUG] GitHub API found ${data.items.length} users`);

    for (const item of data.items) {
      if (profiles.length >= limit) break;

      // Simple check to filter out organizations
      if (item.type === 'Organization') {
        console.log(`[DEBUG] Skipping organization: ${item.login}`);
        continue;
      }

      // Fetch full user profile for more details
      const userResponse = await fetch(item.url, {
        headers: {
          Authorization: `token ${githubToken}`,
          'User-Agent': 'ChurrosAI/1.0',
        },
      });

      if (!userResponse.ok) {
        console.log(`[DEBUG] Could not fetch full profile for ${item.login}: ${userResponse.status}`);
        continue;
      }
      const user = await userResponse.json();
      console.log(`[DEBUG] Added API profile: ${user.login}`);

      const tags = extractTags(user.bio || '' + ' ' + user.login + ' ' + (user.name || ''));

      profiles.push({
        id: randomUUID(),
        name: user.name || user.login,
        bio: user.bio || `A developer on GitHub.`,
        platform: 'github',
        tags: tags,
        score: 0.8,
        last_updated: new Date().toISOString(),
        fit_summary: null,
        profile_url: user.html_url,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        avatar_url: user.avatar_url,
        followers: user.followers,
        following: user.following,
        location: user.location,
        public_repos: user.public_repos,
      });
    }
  } catch (error) {
    console.error('[DEBUG] Error fetching from GitHub API:', error);
    throw error; // Re-throw to be caught by the main error handler
  }
  return profiles;
}

/**
 * Scrape Twitter profiles
 */
async function scrapeTwitterProfiles(page: any, query: string, limit: number): Promise<Profile[]> {
  const twitterBearerToken = process.env.TWITTER_BEARER_TOKEN;
  const profiles: Profile[] = [];

  console.log(`[DEBUG] Starting Twitter scraping for query: "${query}" with limit: ${limit}`);

  try {
    console.log('[DEBUG] Trying Twitter API v2...');
    const searchUrl = `https://api.twitter.com/2/tweets/search/recent?query=${encodeURIComponent(query)}&max_results=${limit * 5}&expansions=author_id&user.fields=description,profile_image_url,public_metrics,location`;

    const response = await fetch(searchUrl, {
      headers: {
        Authorization: `Bearer ${twitterBearerToken}`,
      },
    });

    if (!response.ok) {
      console.error(`[DEBUG] Twitter API search error: ${response.status}`);
      const errorBody = await response.text();
      console.error(`[DEBUG] Twitter API error body: ${errorBody}`);

      if (response.status === 403) {
          console.error("[DEBUG] Twitter user search requires elevated access, trying alternative approach...");
          return [];
      }

      return [];
    }

    const data = await response.json();
    const users = data.includes?.users || [];

    if (users.length > 0) {
      console.log(`[DEBUG] Twitter API returned ${users.length} profiles`);
      for (const user of users.slice(0, limit)) {
        const tags = extractTags(user.description || '' + ' ' + user.name + ' ' + user.username);

        profiles.push({
          id: randomUUID(),
          name: user.name,
          bio: user.description || `A user on Twitter/X.`,
          platform: 'twitter',
          tags: tags,
          score: 0.75,
          last_updated: new Date().toISOString(),
          fit_summary: null,
          profile_url: `https://twitter.com/${user.username}`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          avatar_url: user.profile_image_url,
          followers: user.public_metrics?.followers_count || 0,
          following: user.public_metrics?.following_count || 0,
          location: user.location,
        });
      }
    } else {
        console.log("[DEBUG] Twitter API did not return any users, trying Playwright fallback (not implemented)...");
    }

  } catch (error) {
    console.error('Error fetching from Twitter API:', error);
  }

  return profiles;
}

/**
 * Scrape LinkedIn profiles
 */
async function scrapeLinkedInProfiles(page: any, query: string, limit: number): Promise<Profile[]> {
    console.log("[DEBUG] LinkedIn scraping is not implemented yet.");
    return [];
}


/**
 * Use AI to analyze profiles and score them
 */
async function analyzeProfilesWithAI(
  query: string,
  profiles: Profile[]
): Promise<Profile[]> {
  const analyzedProfiles: Profile[] = [];

  for (const profile of profiles) {
    try {
      const { fitSummary, score, tags } = await analyzeProfileWithGroq(query, profile);

      const updatedProfile = {
        ...profile,
        fit_summary: fitSummary,
        score: score,
        tags: [...new Set([...profile.tags, ...tags])] // Merge and deduplicate tags
      };

      analyzedProfiles.push(updatedProfile);
    } catch (error) {
      console.error(`Error analyzing profile ${profile.name}:`, error);
      // Add the profile anyway with a default score
      analyzedProfiles.push({
        ...profile,
        fit_summary: "Could not analyze profile.",
        score: 0.5,
      });
    }
  }

  return analyzedProfiles;
}


async function analyzeProfileWithGroq(
  query: string,
  profile: Profile
): Promise<{ fitSummary: string; score: number; tags: string[] }> {
    const groqApiKey = process.env.GROQ_API_KEY;
    if (!groqApiKey) {
        throw new Error("GROQ_API_KEY is not set");
    }

    const { Groq } = require("groq-sdk");
    const groq = new Groq({ apiKey: groqApiKey });

    const systemPrompt = `
You are an expert talent evaluator. Your task is to analyze a candidate's profile based on a company's ideal candidate profile.
The user will provide the company's ideal candidate profile (the 'query') and the candidate's professional bio.
You must return a JSON object with three fields:
1.  "fitSummary": A concise, 1-2 sentence summary explaining why this candidate is or is not a good fit.
2.  "score": A numerical score from 0.0 to 1.0 representing the match quality (0.0 = no match, 1.0 = perfect match).
3.  "tags": An array of 3-5 relevant keyword tags from the candidate's bio (e.g., ["React", "Node.js", "AI", "SaaS", "Founder"]).

Analyze based on skills, experience, and overall vibe.
If the bio is empty or uninformative, provide a low score and a summary explaining the lack of information.
Be critical but fair. Do not invent information not present in the bio.
`;

    const userPrompt = `
**Company Query:** "${query}"
**Candidate Profile (${profile.platform}):**
- **Name:** ${profile.name}
- **Bio:** ${profile.bio}
`;

    try {
        const chatCompletion = await groq.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: systemPrompt,
                },
                {
                    role: "user",
                    content: userPrompt,
                },
            ],
            model: "llama3-8b-8192",
            temperature: 0.3,
            max_tokens: 200,
            response_format: { type: "json_object" },
        });

        const result = JSON.parse(chatCompletion.choices[0]?.message?.content || "{}");

        // Basic validation of the result
        if (typeof result.fitSummary === 'string' && typeof result.score === 'number' && Array.isArray(result.tags)) {
            return {
                fitSummary: result.fitSummary,
                score: Math.max(0, Math.min(1, result.score)), // Clamp score between 0 and 1
                tags: result.tags.map((tag: any) => String(tag)), // Ensure tags are strings
            };
        } else {
             throw new Error("Invalid JSON structure from AI analysis");
        }

    } catch (error) {
        console.error("Error analyzing profile with Groq:", error);
        throw error;
    }
}


/**
 * Extracts relevant tags from a text string
 */
function extractTags(text: string): string[] {
  if (!text) return [];

  const commonWords = new Set(['a', 'an', 'the', 'and', 'or', 'in', 'on', 'at', 'to', 'for', 'with', 'by', 'as', 'i', 'you', 'he', 'she', 'it', 'we', 'they']);

  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9#+\-.]/g, ' ') // Allow #, +, - for things like C++, C#, .NET
    .split(/\s+/)
    .filter(word => word.length > 1 && !commonWords.has(word) && !/^\d+$/.test(word));

  // A simple heuristic for identifying potential tech/skill tags
  const potentialTags = words.filter(word =>
    word.includes('#') ||
    word.includes('+') ||
    word.includes('.') ||
    /^[a-zA-Z]{2,20}$/.test(word) // common skills are usually just letters
  );

  // Return a unique set of the most frequent tags
  const tagCounts: { [key: string]: number } = {};
  potentialTags.forEach(tag => {
    tagCounts[tag] = (tagCounts[tag] || 0) + 1;
  });

  return Object.keys(tagCounts)
    .sort((a, b) => tagCounts[b] - tagCounts[a])
    .slice(0, 10);
}


function parseGitHubQuery(prompt: string): { searchQuery: string, filters: string[], sortBy: string } {
    const query = prompt.toLowerCase();

    console.log("[DEBUG] Parsing GitHub query:", prompt);

    // Define keywords for different categories
    const roleKeywords = ['software engineer', 'developer', 'designer', 'data scientist', 'product manager', 'founder'];
    const techKeywords = ['react', 'python', 'typescript', 'node.js', 'ai', 'machine learning', 'devops'];
    const activityKeywords = {
        'followers': ['popular', 'well-known', 'influential'],
        'repositories': ['prolific', 'active developer', 'many projects', 'many repos'],
        'joined': ['new user', 'recently joined', 'new to github'],
    };

    let detectedKeywords: string[] = [];
    let hasActivity = false;

    // Detect roles and technologies
    [...roleKeywords, ...techKeywords].forEach(keyword => {
        if (query.includes(keyword)) {
            detectedKeywords.push(keyword);
        }
    });

    console.log("[DEBUG] Detected keywords:", detectedKeywords);

    // Determine sort order based on activity
    let sortBy = 'followers'; // Default sort
    for (const [sortKey, keywords] of Object.entries(activityKeywords)) {
        if (keywords.some(k => query.includes(k))) {
            sortBy = sortKey;
            hasActivity = true;
            break;
        }
    }

    console.log("[DEBUG] Has activity:", hasActivity);

    // Randomize sort if no activity is specified to get varied results
    if (!hasActivity) {
        const sortOptions = ['followers', 'repositories', 'joined'];
        sortBy = sortOptions[Math.floor(Math.random() * sortOptions.length)];
    }

    // Build search filters
    const filters: string[] = [];
    if (detectedKeywords.length > 0) {
        detectedKeywords.forEach(keyword => {
            filters.push(`in:bio ${keyword}`);
        });
    } else {
        // If no keywords, use the original prompt as a general search
        filters.push(`in:bio ${prompt}`);
    }

    // Create the final search query
    const finalQuery = filters.join(' ');

    const result = {
        searchQuery: detectedKeywords.join(' ') || prompt,
        filters,
        sortBy,
        finalQuery
    };

    console.log("[DEBUG] Final GitHub query:", result);

    return result;
}

/**
 * Scrape GitHub profiles from public repositories
 */
async function scrapeGitHubFromRepos(query: string, limit: number): Promise<Profile[]> {
  const profiles: Profile[] = [];
  const githubToken = process.env.GITHUB_TOKEN;

  console.log(`[DEBUG] GitHub Repo API - Token present: ${githubToken ? 'YES' : 'NO'}`);
  if (!githubToken) {
    console.error('[DEBUG] GitHub API - No token available, cannot make API calls');
    return [];
  }

  try {
    // First, search for repositories that match the query
    const repoSearchUrl = `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=stars&order=desc&per_page=10`;
    console.log(`[DEBUG] Searching repositories: ${repoSearchUrl}`);

    const repoResponse = await fetch(repoSearchUrl, {
      headers: {
        Authorization: `token ${githubToken}`,
        'User-Agent': 'ChurrosAI/1.0',
      },
    });

    if (!repoResponse.ok) {
      console.error(`[DEBUG] GitHub Repo API error: ${repoResponse.status} ${repoResponse.statusText}`);
      return [];
    }

    const repoData = await repoResponse.json();
    console.log(`[DEBUG] Found ${repoData.items.length} repositories`);

    // For each repository, get contributors
    for (const repo of repoData.items.slice(0, 5)) { // Limit to top 5 repos
      if (profiles.length >= limit) break;

      console.log(`[DEBUG] Getting contributors for repo: ${repo.full_name}`);
      
      const contributorsUrl = `https://api.github.com/repos/${repo.full_name}/contributors?per_page=10`;
      const contributorsResponse = await fetch(contributorsUrl, {
        headers: {
          Authorization: `token ${githubToken}`,
          'User-Agent': 'ChurrosAI/1.0',
        },
      });

      if (!contributorsResponse.ok) {
        console.log(`[DEBUG] Could not fetch contributors for ${repo.full_name}: ${contributorsResponse.status}`);
        continue;
      }

      const contributors = await contributorsResponse.json();
      console.log(`[DEBUG] Found ${contributors.length} contributors for ${repo.full_name}`);

      // Get detailed profile for each contributor
      for (const contributor of contributors) {
        if (profiles.length >= limit) break;

        // Skip if we already have this profile
        if (profiles.some(p => p.name === contributor.login)) continue;

        try {
          const userResponse = await fetch(contributor.url, {
            headers: {
              Authorization: `token ${githubToken}`,
              'User-Agent': 'ChurrosAI/1.0',
            },
          });

          if (!userResponse.ok) continue;

          const user = await userResponse.json();
          console.log(`[DEBUG] Added repo contributor: ${user.login} from ${repo.full_name}`);

          const tags = extractTags(user.bio || '' + ' ' + user.login + ' ' + (user.name || '') + ' ' + repo.name);

          profiles.push({
            id: randomUUID(),
            name: user.name || user.login,
            bio: user.bio || `Contributor to ${repo.full_name}`,
            platform: 'github',
            tags: tags,
            score: 0.8,
            last_updated: new Date().toISOString(),
            fit_summary: null,
            profile_url: user.html_url,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            avatar_url: user.avatar_url,
            followers: user.followers,
            following: user.following,
            location: user.location,
            public_repos: user.public_repos,
          });
        } catch (error) {
          console.error(`[DEBUG] Error fetching user ${contributor.login}:`, error);
          continue;
        }
      }
    }
  } catch (error) {
    console.error('[DEBUG] Error fetching from GitHub Repo API:', error);
  }

  return profiles;
}