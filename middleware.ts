import { NextRequest, NextResponse } from 'next/server';

// Simple in-memory rate limiting (use Redis in production)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

const RATE_LIMIT = {
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 20 // 20 requests per minute (increased for testing)
};

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only apply rate limiting to scraping endpoints
  if (pathname.startsWith('/api/on-demand-scrape') || pathname.startsWith('/api/generate-leads')) {
    const clientId = getClientId(request);
    const now = Date.now();

    // Get or create rate limit entry
    let rateLimit = rateLimitMap.get(clientId);
    if (!rateLimit || now > rateLimit.resetTime) {
      rateLimit = {
        count: 0,
        resetTime: now + RATE_LIMIT.windowMs
      };
    }

    // Check if rate limit exceeded
    if (rateLimit.count >= RATE_LIMIT.maxRequests) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          message: `Too many requests. Please try again in ${Math.ceil((rateLimit.resetTime - now) / 1000)} seconds.`
        },
        { status: 429 }
      );
    }

    // Increment count
    rateLimit.count++;
    rateLimitMap.set(clientId, rateLimit);

    // Add rate limit headers
    const response = NextResponse.next();
    response.headers.set('X-RateLimit-Limit', RATE_LIMIT.maxRequests.toString());
    response.headers.set('X-RateLimit-Remaining', (RATE_LIMIT.maxRequests - rateLimit.count).toString());
    response.headers.set('X-RateLimit-Reset', rateLimit.resetTime.toString());

    return response;
  }

  return NextResponse.next();
}

function getClientId(request: NextRequest): string {
  // Use IP address as client identifier
  // In production, you might want to use user ID from auth
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0] : 'unknown';
  return ip;
}

export const config = {
  matcher: [
    '/api/on-demand-scrape/:path*',
    '/api/generate-leads/:path*'
  ]
}; 