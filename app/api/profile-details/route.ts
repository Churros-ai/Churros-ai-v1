import { NextRequest, NextResponse } from 'next/server';
import { Profile } from '@/lib/types';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const profileId = searchParams.get('id');
  
  if (!profileId) {
    return NextResponse.json({ error: 'Profile ID is required' }, { status: 400 });
  }
  
  try {
    // First, try to get the profile from the database to get the username
    const { createClient } = await import('@supabase/supabase-js');
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Database configuration missing' }, { status: 500 });
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Get profile from database
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', profileId)
      .single();
    
    if (error || !profile) {
      console.log(`[DEBUG] Profile not found in database: ${profileId}`);
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }
    
    console.log(`[DEBUG] Found profile in database:`, {
      id: profile.id,
      username: profile.username,
      platform: profile.platform
    });
    
    // For GitHub profiles, fetch detailed data using the username
    if (profile.platform === 'github' && profile.username) {
      const githubData = await fetchGitHubProfile(profile.username);
      
      if (!githubData) {
        return NextResponse.json({ error: 'GitHub profile not found' }, { status: 404 });
      }
      
      // Fetch recent activity/signals
      const signals = await fetchGitHubSignals(profile.username);
      
      // Create detailed profile response
      const detailedProfile = {
        id: profile.id,
        name: githubData.name || profile.username,
        avatar: githubData.avatar_url,
        title: githubData.bio ? `${githubData.bio.split('.')[0]}` : 'GitHub Developer',
        location: githubData.location || 'Location not specified',
        summary: githubData.bio || `Active GitHub developer with ${githubData.public_repos} public repositories`,
        tldr: generateTLDR(githubData),
        matchScore: calculateMatchScore(githubData),
        alignment: generateAlignment(githubData),
        signals: signals,
        skills: extractSkills(githubData),
        experience: generateExperience(githubData),
        profile_url: githubData.html_url,
        platform: 'github'
      };
      
      return NextResponse.json(detailedProfile);
    }
    
    // For other platforms, return basic profile data
    return NextResponse.json({
      id: profile.id,
      name: profile.name,
      title: profile.bio || `${profile.platform} User`,
      summary: profile.bio || `Active ${profile.platform} user`,
      profile_url: profile.profile_url,
      platform: profile.platform,
      signals: []
    });
    
  } catch (error) {
    console.error('Error fetching profile details:', error);
    return NextResponse.json({ error: 'Failed to fetch profile details' }, { status: 500 });
  }
}

async function fetchGitHubProfile(username: string) {
  const githubToken = process.env.GITHUB_TOKEN;
  
  console.log(`[DEBUG] Fetching GitHub profile for username: ${username}`);
  console.log(`[DEBUG] GitHub token available: ${!!githubToken}`);
  
  try {
    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'Churros-AI-Lead-Generator'
    };
    
    if (githubToken) {
      headers['Authorization'] = `token ${githubToken}`;
    }
    
    const url = `https://api.github.com/users/${username}`;
    console.log(`[DEBUG] Making request to: ${url}`);
    
    const response = await fetch(url, { headers });
    
    console.log(`[DEBUG] GitHub API response status: ${response.status}`);
    
    if (!response.ok) {
      console.log(`[DEBUG] GitHub API error: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.log(`[DEBUG] Error response: ${errorText}`);
      return null;
    }
    
    const data = await response.json();
    console.log(`[DEBUG] Successfully fetched profile for ${username}:`, {
      name: data.name,
      bio: data.bio?.substring(0, 50) + '...',
      public_repos: data.public_repos,
      followers: data.followers
    });
    
    return data;
  } catch (error) {
    console.error('[DEBUG] Error fetching GitHub profile:', error);
    return null;
  }
}

async function fetchGitHubSignals(username: string) {
  const githubToken = process.env.GITHUB_TOKEN;
  const signals: any[] = [];
  
  try {
    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'Churros-AI-Lead-Generator'
    };
    
    if (githubToken) {
      headers['Authorization'] = `token ${githubToken}`;
    }
    
    // Fetch recent repositories
    const reposResponse = await fetch(
      `https://api.github.com/users/${username}/repos?sort=updated&per_page=5`,
      { headers }
    );
    
    if (reposResponse.ok) {
      const repos = await reposResponse.json();
      
      for (const repo of repos.slice(0, 3)) {
        signals.push({
          type: 'github',
          title: `Updated ${repo.name}`,
          content: repo.description || `Repository: ${repo.name}`,
          engagement: `${repo.stargazers_count} stars, ${repo.forks_count} forks`,
          date: formatDate(repo.updated_at),
          url: repo.html_url
        });
      }
    }
    
    // Fetch recent activity (public events)
    const eventsResponse = await fetch(
      `https://api.github.com/users/${username}/events/public?per_page=10`,
      { headers }
    );
    
    if (eventsResponse.ok) {
      const events = await eventsResponse.json();
      
      for (const event of events.slice(0, 2)) {
        if (event.type === 'PushEvent' && event.payload.commits) {
          const commit = event.payload.commits[0];
          signals.push({
            type: 'github',
            title: `Pushed to ${event.repo.name}`,
            content: commit.message || 'Code commit',
            engagement: `${event.payload.commits.length} commits`,
            date: formatDate(event.created_at),
            url: `https://github.com/${event.repo.name}/commit/${commit.sha}`
          });
        }
      }
    }
    
  } catch (error) {
    console.error('Error fetching GitHub signals:', error);
  }
  
  return signals;
}

function generateTLDR(githubData: any): string {
  const repos = githubData.public_repos;
  const followers = githubData.followers;
  const bio = githubData.bio || '';
  
  let tldr = `GitHub developer with ${repos} public repositories`;
  
  if (followers > 0) {
    tldr += ` and ${followers} followers`;
  }
  
  if (bio) {
    tldr += `. ${bio.split('.')[0]}.`;
  } else {
    tldr += '. Active in the developer community.';
  }
  
  return tldr;
}

function calculateMatchScore(githubData: any): number {
  let score = 50; // Base score
  
  // Add points for activity
  if (githubData.public_repos > 10) score += 20;
  if (githubData.public_repos > 5) score += 10;
  
  // Add points for community engagement
  if (githubData.followers > 100) score += 15;
  if (githubData.followers > 50) score += 10;
  
  // Add points for having a bio
  if (githubData.bio) score += 5;
  
  return Math.min(score, 95);
}

function generateAlignment(githubData: any) {
  const bio = githubData.bio || '';
  const company = githubData.company || '';
  
  let values = ['Open Source', 'Developer Community'];
  let vibe = 'Active Developer - contributes regularly to projects';
  let culture = 'Engaged in the GitHub ecosystem';
  
  if (bio.toLowerCase().includes('ai') || bio.toLowerCase().includes('machine learning')) {
    values.push('AI/ML');
    vibe = 'AI Enthusiast - passionate about artificial intelligence';
  }
  
  if (bio.toLowerCase().includes('react') || bio.toLowerCase().includes('frontend')) {
    values.push('Frontend Development');
    vibe = 'Frontend Developer - focused on user experience';
  }
  
  if (bio.toLowerCase().includes('full-stack') || bio.toLowerCase().includes('backend')) {
    values.push('Full-Stack Development');
    vibe = 'Full-Stack Developer - versatile technical skills';
  }
  
  if (company) {
    values.push('Professional Experience');
    culture = `Currently at ${company}, active in professional development`;
  }
  
  return {
    values,
    vibe,
    culture
  };
}

function extractSkills(githubData: any): string[] {
  const skills: string[] = [];
  const bio = githubData.bio || '';
  
  // Extract common tech skills from bio
  const techKeywords = [
    'React', 'JavaScript', 'TypeScript', 'Python', 'Node.js', 'Java', 'C++', 'Go', 'Rust',
    'AWS', 'Docker', 'Kubernetes', 'MongoDB', 'PostgreSQL', 'Redis', 'GraphQL', 'REST',
    'Machine Learning', 'AI', 'Data Science', 'DevOps', 'Frontend', 'Backend', 'Full-Stack'
  ];
  
  for (const skill of techKeywords) {
    if (bio.toLowerCase().includes(skill.toLowerCase())) {
      skills.push(skill);
    }
  }
  
  // Add GitHub-specific skills
  skills.push('Git', 'GitHub');
  
  if (githubData.public_repos > 5) {
    skills.push('Open Source');
  }
  
  return skills.slice(0, 8); // Limit to 8 skills
}

function generateExperience(githubData: any): string[] {
  const experience: string[] = [];
  
  if (githubData.public_repos > 0) {
    experience.push(`${githubData.public_repos} Public Repositories`);
  }
  
  if (githubData.followers > 0) {
    experience.push(`${githubData.followers} GitHub Followers`);
  }
  
  if (githubData.company) {
    experience.push(`Currently at ${githubData.company}`);
  }
  
  if (githubData.blog) {
    experience.push('Personal Blog/Website');
  }
  
  if (githubData.created_at) {
    const years = new Date().getFullYear() - new Date(githubData.created_at).getFullYear();
    if (years > 0) {
      experience.push(`${years}+ Years on GitHub`);
    }
  }
  
  return experience;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffInDays === 0) return 'Today';
  if (diffInDays === 1) return 'Yesterday';
  if (diffInDays < 7) return `${diffInDays} days ago`;
  if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
  if (diffInDays < 365) return `${Math.floor(diffInDays / 30)} months ago`;
  return `${Math.floor(diffInDays / 365)} years ago`;
} 