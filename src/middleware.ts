import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { decrypt } from './lib/session-token';

/**
 * Gosti mogu razgledati: početnu, događaje, lokale, rang listu, nagrade i info stranice (i Google ih indeksira).
 * Lične stranice (profil, sačuvano, poruke, podešavanja, tuđi profili, admin) traže nalog.
 * /checkin je javan jer gostu sam objasni check-in i ponudi registraciju (i čuva QR kod u `next`).
 * API rute same provjeravaju sesiju (vraćaju 401), pa ih ovdje ne preusmjeravamo — inače bi fetch dobio HTML umjesto JSON-a.
 */
const PUBLIC_PATHS = [
  '/login', '/signup', '/forgot-password', '/reset-password', '/verify-email',
  '/terms', '/privacy', '/contact', '/faq', '/how-it-works',
  '/events', '/venues', '/leaderboard', '/rewards', '/checkin',
];

// Razlog koji signup stranica prikaže gostu ("Napravi nalog da bi...")
const REASON_BY_PATH: [string, string][] = [['/favorites', 'save'], ['/chat', 'chat'], ['/u/', 'follow']];

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
  const isPublic = pathname === '/' || PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  if (!session && !isPublic) {
    // Razvoj (npm run dev): bez prijave — automatski se uloguj kao lokalni dev nalog
    if (process.env.NODE_ENV === 'development') {
      const dev = new URL('/api/dev/login', request.url);
      dev.searchParams.set('next', pathname + request.nextUrl.search);
      return NextResponse.redirect(dev);
    }
    // Istekla sesija (ili admin panel) = postojeći korisnik, ide na prijavu; pravi gost ide na registraciju sa razlogom
    const next = pathname + request.nextUrl.search;
    const toLogin = Boolean(sessionCookie) || pathname.startsWith('/admin');
    const target = new URL(toLogin ? '/login' : '/signup', request.url);
    target.searchParams.set('next', next);
    if (!toLogin) {
      const reason = REASON_BY_PATH.find(([p]) => pathname.startsWith(p))?.[1] ?? 'profile';
      target.searchParams.set('reason', reason);
    }
    return NextResponse.redirect(target);
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
