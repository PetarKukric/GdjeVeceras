import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

// Tajni ključ iz env varijable (produkcija); fallback SAMO za lokalni razvoj.
// U produkciji JWT_SECRET MORA biti postavljen — fallback ključ je javno vidljiv
// u repu, pa bi bez env varijable bilo ko mogao kovati sesijski kolačić (i ADMIN
// sesiju). Zato fail-closed: prijava odbija da radi bez JWT_SECRET.
const DEV_FALLBACK_SECRET = 'gradiska-events-very-secret-key-123456789';

function getKey(): Uint8Array {
  if (process.env.JWT_SECRET) return new TextEncoder().encode(process.env.JWT_SECRET);
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'JWT_SECRET nije postavljen! Postavi ga u Vercel → Settings → Environment Variables (nasumičan, dug niz).'
    );
  }
  return new TextEncoder().encode(DEV_FALLBACK_SECRET);
}

// SameSite: 'lax' u produkciji (zaštita od CSRF); 'none' samo u razvoju
// (cross-origin preview iframe-ovi). Aplikacija i API su na istom domenu,
// pa 'lax' ne smeta normalnom radu sajta.
const COOKIE_SAMESITE: 'lax' | 'none' = process.env.NODE_ENV === 'production' ? 'lax' : 'none';

export interface JWTPayload {
  user: { id: string; email: string; role: string; name: string };
  expires: string | Date;
}

export async function encrypt(payload: JWTPayload) {
  return await new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(getKey());
}

export async function decrypt(input: string): Promise<JWTPayload | null> {
  if (!input) return null;
  try {
    const { payload } = await jwtVerify(input, getKey(), {
      algorithms: ['HS256'],
    });
    return payload as unknown as JWTPayload;
  } catch (error) {
    console.error('Auth: Decrypt failed', error);
    return null;
  }
}

export async function login(user: { id: string; email: string; role: string; name: string }) {
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
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
    return await decrypt(session);
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

  parsed.expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
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
