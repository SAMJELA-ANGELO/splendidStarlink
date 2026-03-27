import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Middleware to protect routes that require authentication
 * Routes like /dashboard require a valid JWT token
 */
export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // List of protected routes
  const protectedRoutes = ['/dashboard', '/plans', '/status'];

  // Check if the current route is protected
  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  );

  if (isProtectedRoute) {
    // Get the token from cookies or localStorage (note: middleware runs on server, so we check headers)
    // For Next.js, we typically check a secure httpOnly cookie
    const token = request.cookies.get('utoken')?.value;

    if (!token) {
      // Redirect to login if no token found
      return NextResponse.redirect(new URL('/auth/login?redirect=' + pathname, request.url));
    }
  }

  return NextResponse.next();
}

/**
 * Configure which routes the middleware should run on
 */
export const config = {
  matcher: ['/dashboard/:path*', '/plans/:path*', '/status/:path*'],
};
