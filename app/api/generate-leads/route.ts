import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { ProfileMatcher, MatchScore } from '../../../lib/matcher';
import { LeadGenerationRequest, LeadGenerationResponse, Profile } from '../../../lib/types';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(request: NextRequest) {
  try {
    const { companyDNA, platform, limit = 10 } = await request.json();

    if (!companyDNA) {
      return NextResponse.json({ error: 'Company DNA is required' }, { status: 400 });
    }

    console.log('Generating leads for:', companyDNA);

    // Step 1: Search existing database
    let databaseLeads: Profile[] = [];
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .ilike('bio', `%${companyDNA.split(' ').slice(0, 3).join(' ')}%`)
        .order('score', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Database search error:', error);
      } else {
        databaseLeads = data || [];
      }
    } catch (error) {
      console.error('Database connection error:', error);
    }

    // Step 2: If not enough results, trigger on-demand scraping
    let scrapedLeads: Profile[] = [];
    if (databaseLeads.length < Math.min(limit, 5)) {
      console.log('Not enough database results, triggering on-demand scraping...');
      try {
        scrapedLeads = await triggerOnDemandScraping(companyDNA, platform, limit);
      } catch (error) {
        console.error('Error triggering on-demand scraping:', error);
      }
    }

    // Step 3: Combine and deduplicate results
    const allLeads = [...databaseLeads, ...scrapedLeads];
    const uniqueLeads = allLeads.filter((lead, index, self) => 
      index === self.findIndex(l => l.name === lead.name && l.platform === lead.platform)
    );

    // Step 4: Sort by score and limit results
    const sortedLeads = uniqueLeads
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    const source = databaseLeads.length > 0 ? 'database' : 'scraped';

    // Return the exact structure the frontend expects
    return NextResponse.json({
      leads: sortedLeads,
      source
    });

  } catch (error) {
    console.error('Error generating leads:', error);
    return NextResponse.json({ 
      error: 'Failed to generate leads',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * Trigger on-demand scraping
 */
async function triggerOnDemandScraping(
  companyDNA: string,
  platform?: string,
  limit: number = 10
): Promise<Profile[]> {
  try {
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000';
    const scrapingUrl = `${baseUrl}/api/on-demand-scrape`;
    
    const response = await fetch(scrapingUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: companyDNA,
        platform: platform || 'github', // Default to GitHub
        limit
      })
    });

    if (!response.ok) {
      console.error('On-demand scraping failed:', response.statusText);
      return [];
    }

    const result = await response.json();
    return result.profiles || [];

  } catch (error) {
    console.error('Error triggering on-demand scraping:', error);
    return [];
  }
}

/**
 * GET endpoint for testing
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const companyDNA = searchParams.get('companyDNA');
  const platform = searchParams.get('platform') as any;
  const limit = parseInt(searchParams.get('limit') || '10');

  if (!companyDNA) {
    return NextResponse.json(
      { error: 'companyDNA query parameter is required' },
      { status: 400 }
    );
  }

  // Reuse POST logic
  const body: LeadGenerationRequest = { companyDNA, platform, limit };
  const mockRequest = new NextRequest('http://localhost/api/generate-leads', {
    method: 'POST',
    body: JSON.stringify(body)
  });

  return POST(mockRequest);
}

/**
 * Robust NLP parser for natural language queries
 */
function parseNaturalLanguageQuery(query: string, defaultPlatform?: string): { searchQuery: string, targetPlatforms: string[] } {
  const queryLower = query.toLowerCase();
  
  console.log('[DEBUG] Parsing query:', query);
  
  // Enhanced role detection with multiple roles
  const roles = [
    'designer', 'developer', 'engineer', 'manager', 'lead', 'architect', 
    'artist', 'writer', 'founder', 'maker', 'builder', 'hacker', 'coder', 
    'programmer', 'consultant', 'specialist', 'expert', 'professional',
    'frontend', 'backend', 'fullstack', 'ui', 'ux', 'product', 'data',
    'devops', 'mobile', 'web', 'software', 'systems', 'cloud'
  ];
  
  // Enhanced platform detection
  const platformKeywords = {
    github: ['github', 'git', 'repo', 'repository', 'code', 'developer', 'programmer', 'coding'],
    twitter: ['twitter', 'tweet', 'social', 'x.com', 'social media'],
    linkedin: ['linkedin', 'professional', 'business', 'career', 'network'],
    substack: ['substack', 'newsletter', 'blog', 'writing', 'content']
  };
  
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
  
  // Extract roles
  const detectedRoles: string[] = [];
  for (const role of roles) {
    if (queryLower.includes(role)) {
      detectedRoles.push(role);
    }
  }
  
  // Extract platforms
  const detectedPlatforms: string[] = [];
  for (const [platform, keywords] of Object.entries(platformKeywords)) {
    if (keywords.some(keyword => queryLower.includes(keyword))) {
      detectedPlatforms.push(platform);
    }
  }
  
  // Check for activity
  const hasActivity = activityKeywords.some(keyword => queryLower.includes(keyword));
  
  // Check for experience level
  const experienceLevel = experienceKeywords.find(keyword => queryLower.includes(keyword)) || '';
  
  console.log('[DEBUG] Detected:', {
    roles: detectedRoles,
    platforms: detectedPlatforms,
    hasActivity,
    experienceLevel
  });
  
  // If no platforms detected, use default or GitHub
  const targetPlatforms = detectedPlatforms.length > 0 ? detectedPlatforms : [defaultPlatform || 'github'];
  
  // Build search query
  let searchQuery = query;
  
  // Remove exact platform names only
  const exactPlatformNames = ['github', 'twitter', 'linkedin', 'substack'];
  for (const platform of exactPlatformNames) {
    searchQuery = searchQuery.replace(new RegExp(platform, 'gi'), '').trim();
  }
  
  // Remove only specific filler words that don't add meaning
  const fillerWords = ['with', 'who', 'that', 'have', 'has', 'are', 'is', 'the', 'a', 'an'];
  for (const word of fillerWords) {
    searchQuery = searchQuery.replace(new RegExp(`\\b${word}\\b`, 'gi'), '').trim();
  }
  
  // Clean up extra spaces
  searchQuery = searchQuery.replace(/\s+/g, ' ').trim();
  
  // If search query is empty, use the first detected role
  if (!searchQuery && detectedRoles.length > 0) {
    searchQuery = detectedRoles[0];
  }
  
  // If still empty, use a generic term
  if (!searchQuery) {
    searchQuery = 'developer';
  }
  
  // Add experience level if detected
  if (experienceLevel && !searchQuery.includes(experienceLevel)) {
    searchQuery = `${experienceLevel} ${searchQuery}`.trim();
  }
  
  console.log('[DEBUG] Final parsed result:', { 
    searchQuery, 
    targetPlatforms,
    hasActivity,
    experienceLevel 
  });
  
  return { searchQuery, targetPlatforms };
} 