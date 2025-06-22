import { Profile, PlatformType } from './types';
import Groq from 'groq-sdk';

export interface MatchScore {
  profile: Profile;
  score: number;
  reasons: string[];
}

export class ProfileMatcher {
  private static readonly WEIGHTS = {
    tagMatch: 0.3,
    bioSimilarity: 0.25,
    vectorSimilarity: 0.3,
    platformRelevance: 0.1,
    recency: 0.05
  };

  private static groq: Groq | null = null;

  private static getGroqClient(): Groq {
    if (!this.groq) {
      this.groq = new Groq({
        apiKey: process.env.GROQ_API_KEY!,
      });
    }
    return this.groq;
  }

  /**
   * Match company DNA against existing profiles with vector search
   */
  static async matchProfiles(
    companyDNA: string,
    profiles: Profile[],
    platform?: PlatformType,
    limit: number = 10
  ): Promise<MatchScore[]> {
    const matches: MatchScore[] = [];

    // Get embeddings for company DNA
    const companyEmbedding = await this.getEmbedding(companyDNA);

    for (const profile of profiles) {
      // Skip if platform filter is specified and doesn't match
      if (platform && profile.platform !== platform) {
        continue;
      }

      const score = await this.calculateMatchScore(companyDNA, profile, companyEmbedding);
      
      if (score.score > 0.1) { // Only include relevant matches
        matches.push(score);
      }
    }

    // Sort by score descending and return top results
    return matches
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  /**
   * Calculate match score between company DNA and profile with vector similarity
   */
  private static async calculateMatchScore(
    companyDNA: string, 
    profile: Profile, 
    companyEmbedding?: number[]
  ): Promise<MatchScore> {
    const reasons: string[] = [];
    let totalScore = 0;

    // 1. Tag matching (30% weight)
    const tagScore = this.calculateTagMatch(companyDNA, profile.tags);
    totalScore += tagScore.score * this.WEIGHTS.tagMatch;
    if (tagScore.score > 0) {
      reasons.push(`Tag match: ${tagScore.matchedTags.join(', ')}`);
    }

    // 2. Bio similarity (25% weight)
    const bioScore = this.calculateBioSimilarity(companyDNA, profile.bio || '');
    totalScore += bioScore * this.WEIGHTS.bioSimilarity;
    if (bioScore > 0.3) {
      reasons.push('Bio content relevance');
    }

    // 3. Vector similarity (30% weight) - if embeddings are available
    if (companyEmbedding && profile.bio) {
      try {
        const profileEmbedding = await this.getEmbedding(profile.bio);
        const vectorScore = this.calculateCosineSimilarity(companyEmbedding, profileEmbedding);
        totalScore += vectorScore * this.WEIGHTS.vectorSimilarity;
        if (vectorScore > 0.5) {
          reasons.push('High semantic similarity');
        }
      } catch (error) {
        console.warn('Vector similarity calculation failed:', error);
      }
    }

    // 4. Platform relevance (10% weight)
    const platformScore = this.calculatePlatformRelevance(companyDNA, profile.platform);
    totalScore += platformScore * this.WEIGHTS.platformRelevance;
    if (platformScore > 0.5) {
      reasons.push(`${profile.platform} platform relevance`);
    }

    // 5. Recency bonus (5% weight)
    const recencyScore = this.calculateRecencyScore(profile.last_updated);
    totalScore += recencyScore * this.WEIGHTS.recency;
    if (recencyScore > 0.8) {
      reasons.push('Recently active');
    }

    // Add base profile score
    totalScore += profile.score * 0.2;

    return {
      profile,
      score: Math.min(totalScore, 1.0), // Cap at 1.0
      reasons
    };
  }

  /**
   * Get embedding for text using Groq
   */
  private static async getEmbedding(text: string): Promise<number[]> {
    try {
      const groq = this.getGroqClient();
      const response = await groq.embeddings.create({
        model: "text-embedding-3-small",
        input: text,
        encoding_format: "float",
      });

      return response.data[0].embedding;
    } catch (error) {
      console.error('Error getting embedding:', error);
      // Return zero vector as fallback
      return new Array(1536).fill(0);
    }
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private static calculateCosineSimilarity(vec1: number[], vec2: number[]): number {
    if (vec1.length !== vec2.length) {
      return 0;
    }

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i];
      norm1 += vec1[i] * vec1[i];
      norm2 += vec2[i] * vec2[i];
    }

    norm1 = Math.sqrt(norm1);
    norm2 = Math.sqrt(norm2);

    if (norm1 === 0 || norm2 === 0) {
      return 0;
    }

    return dotProduct / (norm1 * norm2);
  }

  /**
   * Calculate tag matching score
   */
  private static calculateTagMatch(companyDNA: string, profileTags: string[]): { score: number; matchedTags: string[] } {
    const companyTags = this.extractTags(companyDNA);
    const matchedTags: string[] = [];

    let matchCount = 0;
    for (const companyTag of companyTags) {
      for (const profileTag of profileTags) {
        if (this.isTagMatch(companyTag, profileTag)) {
          matchedTags.push(profileTag);
          matchCount++;
        }
      }
    }

    const score = profileTags.length > 0 ? matchCount / Math.max(companyTags.length, profileTags.length) : 0;
    return { score, matchedTags: [...new Set(matchedTags)] };
  }

  /**
   * Calculate bio similarity using simple text matching
   */
  private static calculateBioSimilarity(companyDNA: string, bio: string): number {
    if (!bio) return 0;

    const companyWords = this.tokenize(companyDNA);
    const bioWords = this.tokenize(bio);

    let commonWords = 0;
    for (const word of companyWords) {
      if (bioWords.includes(word) && word.length > 3) {
        commonWords++;
      }
    }

    return bioWords.length > 0 ? commonWords / Math.max(companyWords.length, bioWords.length) : 0;
  }

  /**
   * Calculate platform relevance score
   */
  private static calculatePlatformRelevance(companyDNA: string, platform: PlatformType): number {
    const dna = companyDNA.toLowerCase();
    
    switch (platform) {
      case 'github':
        return this.hasTechKeywords(dna) ? 0.9 : 0.3;
      case 'twitter':
        return this.hasSocialKeywords(dna) ? 0.8 : 0.5;
      case 'substack':
        return this.hasContentKeywords(dna) ? 0.8 : 0.4;
      case 'linkedin':
        return this.hasBusinessKeywords(dna) ? 0.9 : 0.6;
      default:
        return 0.5;
    }
  }

  /**
   * Calculate recency score based on last_updated
   */
  private static calculateRecencyScore(lastUpdated: string): number {
    const daysSinceUpdate = (Date.now() - new Date(lastUpdated).getTime()) / (1000 * 60 * 60 * 24);
    
    if (daysSinceUpdate <= 1) return 1.0;
    if (daysSinceUpdate <= 7) return 0.9;
    if (daysSinceUpdate <= 30) return 0.7;
    if (daysSinceUpdate <= 90) return 0.5;
    return 0.3;
  }

  /**
   * Extract tags from text
   */
  private static extractTags(text: string): string[] {
    const commonTags = [
      'javascript', 'typescript', 'react', 'node', 'python', 'ai', 'ml',
      'startup', 'tech', 'developer', 'entrepreneur', 'writer', 'designer',
      'product', 'marketing', 'growth', 'saas', 'open source', 'blockchain',
      'web3', 'data', 'analytics', 'mobile', 'ios', 'android', 'fullstack',
      'frontend', 'backend', 'devops', 'cloud', 'aws', 'gcp', 'azure',
      'fintech', 'healthtech', 'edtech', 'ecommerce', 'social', 'media',
      'content', 'creator', 'influencer', 'consultant', 'freelancer'
    ];

    const lowerText = text.toLowerCase();
    return commonTags.filter(tag => lowerText.includes(tag));
  }

  /**
   * Check if two tags match (with fuzzy matching)
   */
  private static isTagMatch(tag1: string, tag2: string): boolean {
    if (tag1 === tag2) return true;
    if (tag1.includes(tag2) || tag2.includes(tag1)) return true;
    
    // Handle common variations
    const variations: { [key: string]: string[] } = {
      'ai': ['artificial intelligence', 'machine learning', 'ml'],
      'ml': ['machine learning', 'artificial intelligence', 'ai'],
      'saas': ['software as a service', 'subscription'],
      'startup': ['startup', 'start-up', 'company'],
      'developer': ['dev', 'programmer', 'coder'],
      'entrepreneur': ['founder', 'ceo', 'business owner']
    };

    for (const [key, values] of Object.entries(variations)) {
      if ((tag1 === key && values.includes(tag2)) || 
          (tag2 === key && values.includes(tag1))) {
        return true;
      }
    }

    return false;
  }

  /**
   * Tokenize text into words
   */
  private static tokenize(text: string): string[] {
    return text.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 2);
  }

  /**
   * Check if text contains tech keywords
   */
  private static hasTechKeywords(text: string): boolean {
    const techKeywords = ['tech', 'software', 'developer', 'programming', 'code', 'ai', 'ml', 'data'];
    return techKeywords.some(keyword => text.includes(keyword));
  }

  /**
   * Check if text contains social keywords
   */
  private static hasSocialKeywords(text: string): boolean {
    const socialKeywords = ['social', 'community', 'network', 'content', 'creator', 'influencer'];
    return socialKeywords.some(keyword => text.includes(keyword));
  }

  /**
   * Check if text contains content keywords
   */
  private static hasContentKeywords(text: string): boolean {
    const contentKeywords = ['content', 'writer', 'author', 'newsletter', 'blog', 'publish'];
    return contentKeywords.some(keyword => text.includes(keyword));
  }

  /**
   * Check if text contains business keywords
   */
  private static hasBusinessKeywords(text: string): boolean {
    const businessKeywords = ['business', 'startup', 'entrepreneur', 'founder', 'ceo', 'company'];
    return businessKeywords.some(keyword => text.includes(keyword));
  }

  /**
   * Generate fit summary for a match
   */
  static generateFitSummary(companyDNA: string, matchScore: MatchScore): string {
    const { profile, score, reasons } = matchScore;
    
    if (score >= 0.8) {
      return `Excellent match! ${profile.name} has strong alignment with your company's focus on ${companyDNA.split(' ').slice(0, 3).join(' ')}. ${reasons.slice(0, 2).join('. ')}.`;
    } else if (score >= 0.6) {
      return `Good potential match. ${profile.name} shows relevant experience in areas that align with your ${companyDNA.split(' ').slice(0, 2).join(' ')} focus. ${reasons[0] || 'Relevant background and skills.'}`;
    } else {
      return `Moderate match. ${profile.name} has some relevant experience that could be valuable for your ${companyDNA.split(' ').slice(0, 2).join(' ')} initiatives.`;
    }
  }
} 