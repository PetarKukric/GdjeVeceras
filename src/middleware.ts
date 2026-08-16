import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { decrypt } from './lib/auth';

export async function middleware(request: NextRequest) {
  const sessionCookie = request.cookies.get('bl_session')?.value;
  const pathname = request.nextUrl.pathname;
  
  console.log(`MIDDLEWARE: Path: ${pathname}, Has Cookie: ${!!sessionCookie}`);

  let session = null;
  if (sessionCookie) {
    try {
      session = await decrypt(sessionCookie);
      console.log(`MIDDLEWARE: Decrypted session user: ${session?.user?.email}, Role: ${session?.user?.role}`);
    } catch {
      console.log('MIDDLEWARE: Decrypt failed');
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
