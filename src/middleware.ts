import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { decrypt } from './lib/session-token';

/**
 * Cijeli sajt je iza prijave: bez sesije svaka stranica preusmjerava na /login?next=<gdje si krenuo>.
 * Javne ostaju samo auth stranice, pravni tekstovi i kontakt. API rute same provjeravaju sesiju (vraćaju 401),
 * pa ih ovdje ne preusmjeravamo — inače bi fetch dobio HTML umjesto JSON-a.
 */
// /contact je javan da bi vlasnici lokala mogli pisati i bez naloga; /faq i /how-it-works su javni (i za Google)
const PUBLIC_PATHS = ['/login', '/signup', '/forgot-password', '/reset-password', '/verify-email', '/terms', '/privacy', '/contact', '/faq', '/how-it-works'];

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

  const isAuthPage = pathname === '/login' || pathname === '/signup';
  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  if (!session && !isPublic) {
    // Razvoj (npm run dev): bez prijave — automatski se uloguj kao lokalni dev nalog
    if (process.env.NODE_ENV === 'development') {
      const dev = new URL('/api/dev/login', request.url);
      dev.searchParams.set('next', pathname + request.nextUrl.search);
      return NextResponse.redirect(dev);
    }
    const login = new URL('/login', request.url);
    const next = pathname + request.nextUrl.search;
    if (next !== '/') login.searchParams.set('next', next);
    return NextResponse.redirect(login);
  }

  if (pathname.startsWith('/admin') && session && session.user.role !== 'ADMIN' && session.user.role !== 'OWNER') {
    return NextResponse.redirect(new URL('/', request.url));
  }

  if (isAuthPage && session) {
    const next = request.nextUrl.searchParams.get('next');
    const safeNext = next && next.startsWith('/') && !next.startsWith('//') ? next : null;
    const staff = session.user.role === 'ADMIN' || session.user.role === 'OWNER';
    return NextResponse.redirect(new URL(safeNext || (staff ? '/admin' : '/'), request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Sve osim API ruta, Next internih fajlova i statičkih fajlova (slike, ikone, manifest, sw.js, robots, sitemap)
  matcher: ['/((?!api/|_next/|favicon\\.ico|manifest\\.webmanifest|robots\\.txt|sitemap\\.xml|sw\\.js|.*\\.[a-zA-Z0-9]+$).*)'],
};
