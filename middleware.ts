// Rebuild trigger: 2026-04-09 — pick up NEXT_PUBLIC_SENTRY_DSN env var
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { GEO_COOKIE_NAME, isConsentRequiredCountry } from '@/lib/consent-region';

const protectedRoutes = ['/dashboard', '/upload', '/uploads', '/bets', '/reports', '/settings', '/admin'];
const authRoutes = ['/login', '/signup'];
const PLAYWRIGHT_AUTH_HEADER = 'x-betautopsy-playwright-auth';
const PLAYWRIGHT_AUTH_TOKEN = 'paid-report-integrity-e2e-v1';

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

  // Skip auth check for public routes and OAuth callback
  if (pathname.startsWith('/auth/callback') || pathname.startsWith('/api/webhook') || pathname.startsWith('/api/template') || pathname.startsWith('/og') || pathname.startsWith('/api/digest') || pathname.startsWith('/api/weekend-autopsy') || pathname.startsWith('/api/unsubscribe') || pathname.startsWith('/api/freeze-refill') || pathname.startsWith('/api/send-email')) {
    return NextResponse.next();
  }

  // Bypass middleware entirely for public content pages (crawlability)
  const publicRoutes = ['/blog', '/quiz', '/faq', '/how-to-upload', '/privacy', '/sitemap.xml', '/robots.txt', '/reset-password'];
  const isPublicRoute = publicRoutes.some((route) => pathname === route || pathname.startsWith('/blog/'));
  if (isPublicRoute) {
    return attachGeoCookie(request, NextResponse.next());
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
    return attachGeoCookie(request, NextResponse.next({ request }));
  }

  let supabaseResponse = NextResponse.next({ request });

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
          supabaseResponse = NextResponse.next({ request });
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
    return attachGeoCookie(request, NextResponse.redirect(url));
  }

  // Defense-in-depth: block protected routes for users who haven't verified their email.
  // OAuth users (Google) are auto-verified, so email_confirmed_at is set at signup.
  if (isProtected && user && !user.email_confirmed_at) {
    const url = request.nextUrl.clone();
    url.pathname = '/signup';
    url.searchParams.set('verify', 'true');
    return attachGeoCookie(request, NextResponse.redirect(url));
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
      return attachGeoCookie(request, NextResponse.redirect(url));
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
          return attachGeoCookie(request, NextResponse.redirect(dest));
        }
      } catch {}
    }
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    url.search = '';
    return attachGeoCookie(request, NextResponse.redirect(url));
  }

  return attachGeoCookie(request, supabaseResponse);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
