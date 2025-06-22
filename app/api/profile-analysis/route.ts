import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Groq from 'groq-sdk';
import { Profile, PlatformType } from '../../../lib/types';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Initialize Groq client
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY!,
});

export async function POST(request: NextRequest) {
  try {
    const { profileId, companyDNA } = await request.json();

    if (!profileId || !companyDNA) {
      return NextResponse.json({ 
        error: 'Profile ID and company DNA are required' 
      }, { status: 400 });
    }

    console.log(`Analyzing profile ${profileId} for company DNA: ${companyDNA}`);

    // Get profile from database
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', profileId)
      .single();

    if (error || !profile) {
      return NextResponse.json({ 
        error: 'Profile not found' 
      }, { status: 404 });
    }

    // Analyze profile with AI
    const analysis = await analyzeProfileWithAI(profile, companyDNA);

    // Update profile with analysis results
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        score: analysis.score,
        fit_summary: analysis.fitSummary,
        tags: analysis.enhancedTags,
        updated_at: new Date().toISOString()
      })
      .eq('id', profileId);

    if (updateError) {
      console.error('Error updating profile:', updateError);
    }

    return NextResponse.json({
      profile: {
        ...profile,
        score: analysis.score,
        fit_summary: analysis.fitSummary,
        tags: analysis.enhancedTags
      },
      analysis
    });

  } catch (error) {
    console.error('Profile analysis failed:', error);
    return NextResponse.json({ 
      error: 'Failed to analyze profile',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * Analyze profile with AI using Groq
 */
async function analyzeProfileWithAI(
  profile: Profile, 
  companyDNA: string
): Promise<{
  score: number;
  fitSummary: string;
  enhancedTags: string[];
  reasoning: string;
}> {
  try {
    const prompt = `
You are an expert at analyzing professional profiles and determining how well they match a company's needs.

Company DNA: "${companyDNA}"

Profile to analyze:
- Name: ${profile.name}
- Platform: ${profile.platform}
- Bio: ${profile.bio || 'No bio available'}
- Current tags: ${profile.tags.join(', ')}

Please provide a comprehensive analysis in the following JSON format:
{
  "score": 0.85,
  "fitSummary": "Brief explanation of why this person is a good fit",
  "enhancedTags": ["tag1", "tag2", "tag3"],
  "reasoning": "Detailed explanation of the score and fit assessment"
}

Guidelines:
- Score should be between 0.0 and 1.0 (higher = better fit)
- Consider platform relevance, bio content, and tag alignment
- Enhanced tags should include relevant skills and interests
- Fit summary should be 1-2 sentences explaining the match
- Reasoning should be 2-3 sentences with specific details

Respond only with valid JSON.
`;

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are a professional profile analyst. Always respond with valid JSON."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      model: "llama3-70b-8192",
      temperature: 0.3,
      max_tokens: 1000,
    });

    const response = completion.choices[0]?.message?.content;
    
    if (!response) {
      throw new Error('No response from AI');
    }

    // Parse JSON response
    const analysis = JSON.parse(response);

    // Validate and sanitize the response
    return {
      score: Math.max(0, Math.min(1, analysis.score || 0.5)),
      fitSummary: analysis.fitSummary || 'Profile shows potential alignment with company needs.',
      enhancedTags: Array.isArray(analysis.enhancedTags) ? analysis.enhancedTags.slice(0, 10) : profile.tags,
      reasoning: analysis.reasoning || 'Analysis completed based on profile information.'
    };

  } catch (error) {
    console.error('AI analysis failed:', error);
    
    // Fallback analysis
    const fallbackScore = calculateFallbackScore(profile, companyDNA);
    const fallbackTags = extractFallbackTags(profile, companyDNA);
    
    return {
      score: fallbackScore,
      fitSummary: `Profile shows ${fallbackScore >= 0.7 ? 'strong' : fallbackScore >= 0.5 ? 'moderate' : 'some'} potential alignment with your company's focus.`,
      enhancedTags: fallbackTags,
      reasoning: 'Analysis completed using fallback scoring method due to AI service unavailability.'
    };
  }
}

/**
 * Calculate fallback score when AI is unavailable
 */
function calculateFallbackScore(profile: Profile, companyDNA: string): number {
  let score = 0.5; // Base score
  
  const dna = companyDNA.toLowerCase();
  const bio = (profile.bio || '').toLowerCase();
  
  // Bio relevance
  const dnaWords = dna.split(' ').filter(word => word.length > 3);
  const matchingWords = dnaWords.filter(word => bio.includes(word));
  score += (matchingWords.length / Math.max(dnaWords.length, 1)) * 0.3;
  
  // Tag relevance
  const matchingTags = profile.tags.filter(tag => 
    dna.includes(tag.toLowerCase())
  );
  score += (matchingTags.length / Math.max(profile.tags.length, 1)) * 0.2;
  
  return Math.min(score, 1.0);
}

/**
 * Extract fallback tags when AI is unavailable
 */
function extractFallbackTags(profile: Profile, companyDNA: string): string[] {
  const existingTags = new Set(profile.tags);
  const dna = companyDNA.toLowerCase();
  
  const commonTags = [
    'javascript', 'typescript', 'react', 'node', 'python', 'ai', 'ml',
    'startup', 'tech', 'developer', 'entrepreneur', 'writer', 'designer',
    'product', 'marketing', 'growth', 'saas', 'open source', 'blockchain',
    'web3', 'data', 'analytics', 'mobile', 'ios', 'android', 'fullstack',
    'frontend', 'backend', 'devops', 'cloud', 'aws', 'gcp', 'azure',
    'fintech', 'healthtech', 'edtech', 'ecommerce', 'social', 'media',
    'content', 'creator', 'influencer', 'consultant', 'freelancer'
  ];
  
  // Add relevant tags from company DNA
  commonTags.forEach(tag => {
    if (dna.includes(tag) && !existingTags.has(tag)) {
      existingTags.add(tag);
    }
  });
  
  return Array.from(existingTags).slice(0, 10);
}

/**
 * GET endpoint for testing
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const profileId = searchParams.get('profileId');
  const companyDNA = searchParams.get('companyDNA');

  if (!profileId || !companyDNA) {
    return NextResponse.json(
      { error: 'profileId and companyDNA query parameters are required' },
      { status: 400 }
    );
  }

  // Reuse POST logic
  const body = { profileId, companyDNA };
  const mockRequest = new NextRequest('http://localhost/api/profile-analysis', {
    method: 'POST',
    body: JSON.stringify(body)
  });

  return POST(mockRequest);
} 