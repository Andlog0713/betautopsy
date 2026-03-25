import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const protectedRoutes = ['/dashboard', '/upload', '/uploads', '/bets', '/reports', '/pricing', '/settings', '/admin'];
const authRoutes = ['/login', '/signup'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip auth check for public routes and OAuth callback
  if (pathname.startsWith('/auth/callback') || pathname.startsWith('/api/webhook') || pathname.startsWith('/api/template') || pathname.startsWith('/api/og')) {
    return NextResponse.next();
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
  const isProtected = protectedRoutes.some((route) => pathname.startsWith(route));
  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
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

  // Redirect returning users (2+ logins) from landing page to dashboard
  if (pathname === '/' && user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('login_count')
      .eq('id', user.id)
      .single();

    if (profile && profile.login_count >= 2) {
      const url = request.nextUrl.clone();
      url.pathname = '/dashboard';
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
