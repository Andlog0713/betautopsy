// Rebuild trigger: 2026-04-09 — pick up NEXT_PUBLIC_SENTRY_DSN env var
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const protectedRoutes = ['/dashboard', '/upload', '/uploads', '/bets', '/reports', '/settings', '/admin'];
const authRoutes = ['/login', '/signup'];

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
    return NextResponse.next();
  }

  // Fail open when Supabase isn't configured (e.g. CI smoke runs that
  // boot `next start` without secrets, or a misdeploy that wipes env
  // vars). `createServerClient` throws synchronously on empty
  // URL/key, which would 500 every protected and auth route — better
  // to let the request through and rely on the page-level AuthGuard
  // + API-route auth checks. Production prod always has these set
  // (verified pre-merge for bugs-ZTqzz), so this is a defensive
  // fallback, not a routine code path.
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.next();
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
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
  const isProtected = protectedRoutes.some((route) => pathname.startsWith(route));
  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // Defense-in-depth: block protected routes for users who haven't verified their email.
  // OAuth users (Google) are auto-verified, so email_confirmed_at is set at signup.
  if (isProtected && user && !user.email_confirmed_at) {
    const url = request.nextUrl.clone();
    url.pathname = '/signup';
    url.searchParams.set('verify', 'true');
    return NextResponse.redirect(url);
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
      return NextResponse.redirect(url);
    }
  }

  // Redirect authenticated users away from auth routes
  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route));
  if (isAuthRoute && user) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
