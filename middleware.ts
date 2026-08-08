// Rebuild trigger: 2026-04-09 — pick up NEXT_PUBLIC_SENTRY_DSN env var
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { GEO_COOKIE_NAME, isConsentRequiredCountry } from '@/lib/consent-region';

const protectedRoutes = ['/dashboard', '/upload', '/uploads', '/bets', '/reports', '/settings', '/admin'];
const authRoutes = ['/login', '/signup'];

// Vercel kills the whole middleware invocation (MIDDLEWARE_INVOCATION_TIMEOUT,
// 25s) if it never returns. Supabase auth calls have no built-in timeout, so a
// transient DNS/network blip on the Supabase host (observed: intermittent
// `getaddrinfo ENOTFOUND` on the project host) previously hung every request —
// including the marketing homepage, which doesn't even need auth — until the
// platform killed it. Bound every Supabase call in middleware and fail
// closed-but-fast: on timeout/error, treat the request as unauthenticated
// rather than hanging.
const SUPABASE_CALL_TIMEOUT_MS = 5000;

function withTimeout<T>(promise: PromiseLike<T>, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`${label} timed out after ${SUPABASE_CALL_TIMEOUT_MS}ms`)),
      SUPABASE_CALL_TIMEOUT_MS
    );
    Promise.resolve(promise).then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
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

  let user: Awaited<ReturnType<typeof supabase.auth.getUser>>['data']['user'] = null;
  try {
    const { data } = await withTimeout(supabase.auth.getUser(), 'supabase.auth.getUser');
    user = data.user;
  } catch (err) {
    console.error('[middleware] supabase.auth.getUser failed; treating as unauthenticated', err);
    Sentry.captureException(err, { tags: { location: 'middleware.auth.getUser' } });
  }

  // Redirect unauthenticated users away from protected routes
  const isProtected = protectedRoutes.some((route) => pathname.startsWith(route));
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
    let isAdmin = false;
    try {
      const { data: profile } = await withTimeout(
        supabase.from('profiles').select('is_admin').eq('id', user.id).single(),
        'supabase.from(profiles).select(is_admin)'
      );
      isAdmin = Boolean(profile?.is_admin);
    } catch (err) {
      console.error('[middleware] admin profile lookup failed; denying admin access', err);
      Sentry.captureException(err, { tags: { location: 'middleware.admin.profile' } });
    }

    if (!isAdmin) {
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
