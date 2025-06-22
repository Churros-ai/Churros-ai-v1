import { chromium, Browser, Page } from 'playwright';
import * as cheerio from 'cheerio';
import { createClient } from '@supabase/supabase-js';
import { Profile, PlatformType } from '../lib/types';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

class ProfileScraper {
  private browser: Browser | null = null;

  async init() {
    console.log('Initializing browser...');
    this.browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
  }

  async close() {
    if (this.browser) {
      console.log('Closing browser...');
      await this.browser.close();
    }
  }

  async scrapeGitHubTrending(): Promise<Profile[]> {
    const profiles: Profile[] = [];
    const page = await this.browser!.newPage();
    
    try {
      console.log('Scraping GitHub trending repositories...');
      
      // Set user agent and viewport
      await page.setExtraHTTPHeaders({
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      });
      
      // Scrape trending repositories
      await page.goto('https://github.com/trending', { 
        waitUntil: 'networkidle',
        timeout: 30000 
      });
      
      await page.waitForTimeout(3000);
      const content = await page.content();
      const $ = cheerio.load(content);

      $('article.Box-row').each((i, element) => {
        if (i >= 15) return; // Limit to 15 trending repos

        const repoName = $(element).find('h2.h3 a').text().trim();
        const description = $(element).find('p').text().trim();
        const author = repoName.split('/')[0];
        const language = $(element).find('[itemprop="programmingLanguage"]').text().trim();
        
        // Extract tags from description, repo name, and language
        const tags = this.extractTags(description + ' ' + repoName + ' ' + language);
        
        profiles.push({
          id: `github-${author}-${Date.now()}`,
          name: author,
          bio: description || `Creator of ${repoName}`,
          platform: 'github' as PlatformType,
          tags,
          score: 0.8, // High score for trending repos
          last_updated: new Date().toISOString(),
          fit_summary: `Trending GitHub developer with popular repository ${repoName}`,
          profile_url: `https://github.com/${author}`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      });

      console.log(`Found ${profiles.length} trending repository creators`);

      // Also scrape trending developers
      console.log('Scraping GitHub trending developers...');
      await page.goto('https://github.com/trending/developers', { 
        waitUntil: 'networkidle',
        timeout: 30000 
      });
      
      await page.waitForTimeout(3000);
      const devContent = await page.content();
      const $dev = cheerio.load(devContent);

      $dev('article.Box-row').each((i, element) => {
        if (i >= 10) return; // Limit to 10 trending developers

        const devName = $dev(element).find('h1.h3 a').text().trim();
        const bio = $dev(element).find('p').text().trim();
        const tags = this.extractTags(bio + ' ' + devName);
        
        profiles.push({
          id: `github-${devName}-${Date.now()}`,
          name: devName,
          bio: bio || `Trending GitHub developer`,
          platform: 'github' as PlatformType,
          tags,
          score: 0.9, // Very high score for trending developers
          last_updated: new Date().toISOString(),
          fit_summary: `Trending GitHub developer with high activity`,
          profile_url: `https://github.com/${devName}`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      });

      console.log(`Found ${profiles.length} total GitHub profiles`);

    } catch (error) {
      console.error('Error scraping GitHub:', error);
    } finally {
      await page.close();
    }

    return profiles;
  }

  async scrapeTwitterTrending(): Promise<Profile[]> {
    const profiles: Profile[] = [];
    const page = await this.browser!.newPage();
    
    try {
      console.log('Scraping Twitter trending topics...');
      
      // Set user agent and viewport
      await page.setExtraHTTPHeaders({
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      });
      
      // Note: Twitter scraping is more complex due to authentication
      // This is a simplified version that might need adjustments
      await page.goto('https://twitter.com/explore', { 
        waitUntil: 'networkidle',
        timeout: 30000 
      });
      
      await page.waitForTimeout(5000);

      // Look for trending topics and users
      const trendingUsers = await page.$$eval(
        '[data-testid="trend"]',
        (elements) => {
          return elements.slice(0, 10).map((el) => {
            const text = el.textContent || '';
            return text.split('\n')[0]; // Get the first line
          });
        }
      );

      trendingUsers.forEach((user, index) => {
        if (user && user.length > 0) {
          profiles.push({
            id: `twitter-${user}-${Date.now()}`,
            name: user,
            bio: `Trending Twitter user`,
            platform: 'twitter' as PlatformType,
            tags: this.extractTags(user),
            score: 0.7,
            last_updated: new Date().toISOString(),
            fit_summary: `Trending Twitter user with high engagement`,
            profile_url: `https://twitter.com/${user.replace('@', '')}`,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        }
      });

      console.log(`Found ${profiles.length} Twitter profiles`);

    } catch (error) {
      console.error('Error scraping Twitter:', error);
    } finally {
      await page.close();
    }

    return profiles;
  }

  async scrapeSubstackTrending(): Promise<Profile[]> {
    const profiles: Profile[] = [];
    const page = await this.browser!.newPage();
    
    try {
      console.log('Scraping Substack trending newsletters...');
      
      // Set user agent and viewport
      await page.setExtraHTTPHeaders({
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      });
      
      await page.goto('https://substack.com/discover', { 
        waitUntil: 'networkidle',
        timeout: 30000 
      });
      
      await page.waitForTimeout(3000);

      const content = await page.content();
      const $ = cheerio.load(content);

      // Look for newsletter authors
      $('[data-testid="publication-card"]').each((i, element) => {
        if (i >= 10) return;

        const authorName = $(element).find('h3').text().trim();
        const description = $(element).find('p').text().trim();
        const tags = this.extractTags(description + ' ' + authorName);

        profiles.push({
          id: `substack-${authorName}-${Date.now()}`,
          name: authorName,
          bio: description || `Substack newsletter author`,
          platform: 'substack' as PlatformType,
          tags,
          score: 0.6,
          last_updated: new Date().toISOString(),
          fit_summary: `Substack newsletter author with engaged audience`,
          profile_url: `https://substack.com/@${authorName.toLowerCase().replace(/\s+/g, '')}`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      });

      console.log(`Found ${profiles.length} Substack profiles`);

    } catch (error) {
      console.error('Error scraping Substack:', error);
    } finally {
      await page.close();
    }

    return profiles;
  }

  private extractTags(text: string): string[] {
    const tags: string[] = [];
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
    commonTags.forEach(tag => {
      if (lowerText.includes(tag)) {
        tags.push(tag);
      }
    });

    return tags;
  }

  async saveProfilesToDatabase(profiles: Profile[]): Promise<void> {
    if (profiles.length === 0) {
      console.log('No profiles to save');
      return;
    }

    console.log(`Saving ${profiles.length} profiles to database...`);

    try {
      // Batch insert profiles
      const { error } = await supabase
        .from('profiles')
        .upsert(profiles, { 
          onConflict: 'profile_url',
          ignoreDuplicates: false 
        });

      if (error) {
        console.error('Error saving profiles to database:', error);
        throw error;
      }

      console.log(`Successfully saved ${profiles.length} profiles to database`);

    } catch (error) {
      console.error('Failed to save profiles to database:', error);
      throw error;
    }
  }

  async runScheduledScrape(): Promise<void> {
    console.log('Starting scheduled profile scraping...');
    const startTime = Date.now();

    try {
      await this.init();

      const allProfiles: Profile[] = [];

      // Scrape from all platforms
      const platforms = [
        { name: 'GitHub', scraper: () => this.scrapeGitHubTrending() },
        { name: 'Twitter', scraper: () => this.scrapeTwitterTrending() },
        { name: 'Substack', scraper: () => this.scrapeSubstackTrending() }
      ];

      for (const platform of platforms) {
        try {
          console.log(`\n--- Scraping ${platform.name} ---`);
          const profiles = await platform.scraper();
          allProfiles.push(...profiles);
          console.log(`Completed ${platform.name} scraping: ${profiles.length} profiles`);
        } catch (error) {
          console.error(`Error scraping ${platform.name}:`, error);
          // Continue with other platforms even if one fails
        }
      }

      // Save all profiles to database
      if (allProfiles.length > 0) {
        await this.saveProfilesToDatabase(allProfiles);
      }

      const endTime = Date.now();
      const duration = (endTime - startTime) / 1000;
      
      console.log(`\n=== Scraping completed ===`);
      console.log(`Total profiles scraped: ${allProfiles.length}`);
      console.log(`Duration: ${duration.toFixed(2)} seconds`);
      console.log(`Average: ${(allProfiles.length / duration).toFixed(2)} profiles/second`);

    } catch (error) {
      console.error('Scheduled scraping failed:', error);
      throw error;
    } finally {
      await this.close();
    }
  }
}

// Main execution
async function main() {
  const scraper = new ProfileScraper();
  
  try {
    await scraper.runScheduledScrape();
    console.log('Scraping completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Scraping failed:', error);
    process.exit(1);
  }
}

// Run if this file is executed directly
if (require.main === module) {
  main();
}

export { ProfileScraper }; 