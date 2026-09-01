import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { decrypt } from './lib/session-token';

export async function middleware(request: NextRequest) {
  const sessionCookie = request.cookies.get('bl_session')?.value;
  const pathname = request.nextUrl.pathname;
  
  let session = null;
  if (sessionCookie) {
    try {
      session = await decrypt(sessionCookie);
    } catch {
    }
  }

  const isAdminPage = pathname.startsWith('/admin');
  const isAuthPage = pathname === '/login' || pathname === '/signup';

  if (isAdminPage) {
    if (!session) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    if (session.user.role !== 'ADMIN' && session.user.role !== 'OWNER') {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  if (isAuthPage && session) {
    return NextResponse.redirect(new URL('/admin', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/login',
    '/signup'
  ],
};
