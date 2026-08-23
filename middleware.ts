// Rebuild trigger: 2026-04-09 — pick up NEXT_PUBLIC_SENTRY_DSN env var
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { GEO_COOKIE_NAME, isConsentRequiredCountry } from '@/lib/consent-region';
import {
  CSP_HEADER,
  CSP_NONCE_HEADER,
  createCspNonce,
  createDocumentContentSecurityPolicy,
  createNonDocumentContentSecurityPolicy,
} from '@/lib/content-security-policy';

const protectedRoutes = ['/dashboard', '/upload', '/uploads', '/bets', '/reports', '/settings', '/admin'];
const authRoutes = ['/login', '/signup'];
const PLAYWRIGHT_AUTH_HEADER = 'x-betautopsy-playwright-auth';
const PLAYWRIGHT_AUTH_TOKEN = 'paid-report-integrity-e2e-v1';

interface SecurityContext {
  contentSecurityPolicy: string;
  requestHeaders: Headers;
}

function createSecurityContext(request: NextRequest): SecurityContext {
  const nonce = createCspNonce();
  const forwardedProtocol = request.headers
    .get('x-forwarded-proto')
    ?.split(',')[0]
    .trim();
  const isHttpsRequest = forwardedProtocol
    ? forwardedProtocol === 'https'
    : request.nextUrl.protocol === 'https:';
  const contentSecurityPolicy = createDocumentContentSecurityPolicy(
    nonce,
    process.env.NODE_ENV ?? 'development',
    isHttpsRequest
  );
  const requestHeaders = new Headers(request.headers);

  // Next.js reads the request CSP to attach this nonce to its framework
  // scripts. The separate header lets app-owned scripts use the same value.
  requestHeaders.set(CSP_HEADER, contentSecurityPolicy);
  requestHeaders.set(CSP_NONCE_HEADER, nonce);

  return { contentSecurityPolicy, requestHeaders };
}

function nextWithSecurity(context: SecurityContext): NextResponse {
  return NextResponse.next({ request: { headers: context.requestHeaders } });
}

function attachSecurityHeaders(
  request: NextRequest,
  response: NextResponse,
  context: SecurityContext
): NextResponse {
  const pathname = request.nextUrl.pathname;
  const isDocument =
    pathname.startsWith('/api/unsubscribe') ||
    (!pathname.startsWith('/api/') &&
      !pathname.startsWith('/auth/callback') &&
      !pathname.startsWith('/og') &&
      !pathname.endsWith('.xml') &&
      !pathname.endsWith('.txt') &&
      !pathname.endsWith('.webmanifest'));

  response.headers.set(
    CSP_HEADER,
    isDocument
      ? context.contentSecurityPolicy
      : createNonDocumentContentSecurityPolicy()
  );
  if (isDocument) {
    // A cached nonce is a shared password. Each document must keep the
    // request-specific nonce and matching HTML together without CDN reuse.
    response.headers.set('Cache-Control', 'private, no-store');
  }
  return response;
}

function finalizeResponse(
  request: NextRequest,
  response: NextResponse,
  context: SecurityContext,
  includeGeoCookie = true
): NextResponse {
  const securedResponse = attachSecurityHeaders(request, response, context);
  return includeGeoCookie
    ? attachGeoCookie(request, securedResponse)
    : securedResponse;
}

// Stamps the geo-consent cookie on the outgoing response so the static layout
// + client-side scripts can decide whether to show the EU banner / default
// GA consent to denied. Idempotent: skips if the cookie is already present.
function attachGeoCookie(request: NextRequest, response: NextResponse): NextResponse {
  if (request.cookies.has(GEO_COOKIE_NAME)) return response;
  const country = request.headers.get('x-vercel-ip-country');
  const requireConsent = isConsentRequiredCountry(country);
  response.cookies.set(GEO_COOKIE_NAME, requireConsent ? '1' : '0', {
    httpOnly: false, // CookieConsent + GoogleAnalytics inline script must read it
    sameSite: 'lax',
    secure: true,
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isProtected = protectedRoutes.some((route) => pathname.startsWith(route));
  const securityContext = createSecurityContext(request);

  // Skip auth check for public routes and OAuth callback
  if (pathname.startsWith('/auth/callback') || pathname.startsWith('/api/webhook') || pathname.startsWith('/api/template') || pathname.startsWith('/og') || pathname.startsWith('/api/digest') || pathname.startsWith('/api/weekend-autopsy') || pathname.startsWith('/api/unsubscribe') || pathname.startsWith('/api/freeze-refill') || pathname.startsWith('/api/send-email')) {
    return finalizeResponse(
      request,
      nextWithSecurity(securityContext),
      securityContext,
      false
    );
  }

  // Bypass middleware entirely for public content pages (crawlability)
  const publicRoutes = ['/blog', '/quiz', '/faq', '/how-to-upload', '/privacy', '/sitemap.xml', '/robots.txt', '/reset-password'];
  const isPublicRoute = publicRoutes.some((route) => pathname === route || pathname.startsWith('/blog/'));
  if (isPublicRoute) {
    return finalizeResponse(request, nextWithSecurity(securityContext), securityContext);
  }

  // Authenticated browser tests need to reach the static dashboard shell
  // without a live Supabase account. This bypass is deliberately unavailable
  // on Vercel and requires both a test-run-only server flag and a matching
  // request header. API authorization is untouched and remains independently
  // enforced or mocked by the test.
  const isPlaywrightAuthBypass =
    isProtected &&
    !pathname.startsWith('/admin') &&
    process.env.BETAUTOPSY_PLAYWRIGHT_E2E === '1' &&
    process.env.VERCEL !== '1' &&
    request.headers.get(PLAYWRIGHT_AUTH_HEADER) === PLAYWRIGHT_AUTH_TOKEN;
  if (isPlaywrightAuthBypass) {
    return finalizeResponse(request, nextWithSecurity(securityContext), securityContext);
  }

  let supabaseResponse = nextWithSecurity(securityContext);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = nextWithSecurity(securityContext);
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  // Redirect unauthenticated users away from protected routes
  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return finalizeResponse(request, NextResponse.redirect(url), securityContext);
  }

  // Defense-in-depth: block protected routes for users who haven't verified their email.
  // OAuth users (Google) are auto-verified, so email_confirmed_at is set at signup.
  if (isProtected && user && !user.email_confirmed_at) {
    const url = request.nextUrl.clone();
    url.pathname = '/signup';
    url.searchParams.set('verify', 'true');
    return finalizeResponse(request, NextResponse.redirect(url), securityContext);
  }

  // Admin route protection — require is_admin flag
  if (pathname.startsWith('/admin') && user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!profile?.is_admin) {
      const url = request.nextUrl.clone();
      url.pathname = '/dashboard';
      return finalizeResponse(request, NextResponse.redirect(url), securityContext);
    }
  }

  // Redirect authenticated users away from auth routes. Honor a same-origin
  // ?next= so landing-page CTAs (e.g. /signup?next=/reports?run=true) survive
  // the redirect — without this, signed-in users dead-end on /dashboard.
  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route));
  if (isAuthRoute && user) {
    const next = request.nextUrl.searchParams.get('next');
    if (next && next.startsWith('/') && !next.startsWith('//') && !next.startsWith('/\\')) {
      try {
        const dest = new URL(next, request.nextUrl.origin);
        if (dest.origin === request.nextUrl.origin) {
          return finalizeResponse(request, NextResponse.redirect(dest), securityContext);
        }
      } catch {}
    }
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    url.search = '';
    return finalizeResponse(request, NextResponse.redirect(url), securityContext);
  }

  return finalizeResponse(request, supabaseResponse, securityContext);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
