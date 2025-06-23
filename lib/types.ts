export type PlatformType = 'twitter' | 'github' | 'substack' | 'linkedin' | 'other';

export interface Profile {
  id: string;
  name: string;
  bio: string | null;
  platform: PlatformType;
  tags: string[];
  score: number;
  last_updated: string;
  fit_summary: string | null;
  profile_url: string | null;
  username?: string;
  created_at: string;
  updated_at: string;
  tracking_count?: number;
  avatar_url?: string;
  followers?: number;
  following?: number;
  location?: string;
  public_repos?: number;
}

export interface CreateProfileInput {
  name: string;
  bio?: string;
  platform: PlatformType;
  tags?: string[];
  score?: number;
  fit_summary?: string;
  profile_url?: string;
  tracking_count?: number;
}

export interface UpdateProfileInput {
  name?: string;
  bio?: string;
  platform?: PlatformType;
  tags?: string[];
  score?: number;
  fit_summary?: string;
  profile_url?: string;
  tracking_count?: number;
}

export interface LeadGenerationRequest {
  companyDNA: string;
  prompt?: string;
  platform?: PlatformType;
  limit?: number;
}

export interface LeadGenerationResponse {
  leads: Profile[];
  total: number;
  source: 'database' | 'scraped';
}

export interface ScrapingRequest {
  query: string;
  platform: PlatformType;
  limit?: number;
}

export interface ScrapingResponse {
  profiles: Profile[];
  success: boolean;
  error?: string;
} 