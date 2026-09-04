import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { decrypt, encrypt, SESSION_DURATION_MS } from '@/lib/session-token';

export { decrypt, encrypt, SESSION_DURATION_MS } from '@/lib/session-token';
export type { JWTPayload } from '@/lib/session-token';

// SameSite: 'lax' u produkciji (zaštita od CSRF); 'none' samo u razvoju
// (cross-origin preview iframe-ovi). Aplikacija i API su na istom domenu,
// pa 'lax' ne smeta normalnom radu sajta.
const COOKIE_SAMESITE: 'lax' | 'none' = process.env.NODE_ENV === 'production' ? 'lax' : 'none';

export async function login(user: { id: string; email: string; role: string; name: string }) {
  const expires = new Date(Date.now() + SESSION_DURATION_MS);
  const session = await encrypt({ user, expires });
  const cookieStore = await cookies();
  
  cookieStore.set('bl_session', session, { 
    expires, 
    httpOnly: true, 
    secure: true, 
    sameSite: COOKIE_SAMESITE,
    path: '/',
  });
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.set('bl_session', '', { expires: new Date(0), path: '/' });
}

export async function getSession() {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get('bl_session')?.value;
    if (!session) return null;
    const parsed = await decrypt(session);
    if (!parsed?.user?.id) return null;

    // Uloga i status naloga u JWT-u mogu zastarjeti. Za serverske zahtjeve
    // uvijek potvrdi trenutno stanje u bazi, tako da zabrana ili uklanjanje
    // ADMIN/OWNER uloge počinju važiti odmah, a ne tek nakon isteka cookieja.
    const { default: prisma } = await import('@/lib/prisma');
    const currentUser = await prisma.user.findUnique({
      where: { id: parsed.user.id },
      select: { id: true, email: true, role: true, name: true, restricted: true },
    });

    if (!currentUser || currentUser.restricted) return null;

    return {
      ...parsed,
      user: {
        id: currentUser.id,
        email: currentUser.email,
        role: currentUser.role,
        name: currentUser.name || '',
      },
    };
  } catch (error) {
    // Tokom statičke faze build-a nema kolačića (nema korisnika) —
    // Next.js javlja "Dynamic server usage" i to je potpuno očekivano.
    // Stranica se tada automatski prebaci u dinamički režim.
    const digest = (error as any)?.digest;
    if (digest === 'DYNAMIC_SERVER_USAGE') {
      return null;
    }
    console.error('getSession error:', error);
    return null;
  }
}

export async function updateSession(request: NextRequest) {
  const session = request.cookies.get('bl_session')?.value;
  if (!session) return;

  const parsed = await decrypt(session);
  if (!parsed) return;

  parsed.expires = new Date(Date.now() + SESSION_DURATION_MS);
  const res = NextResponse.next();
  res.cookies.set({
    name: 'bl_session',
    value: await encrypt(parsed),
    httpOnly: true,
    secure: true,
    sameSite: COOKIE_SAMESITE,
    expires: new Date(parsed.expires),
    path: '/',
  });
  return res;
}
