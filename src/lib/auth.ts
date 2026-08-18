import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

// Tajni ključ iz env varijable (produkcija); fallback za lokalni razvoj.
// Važno: fallback je identičan JWT_SECRET iz .env — tako da ne može doći do
// neusklađenosti između Node runtime-a i middleware-a ni u jednoj kombinaciji.
const secretKey = process.env.JWT_SECRET || 'gradiska-events-very-secret-key-123456789'; 
const key = new TextEncoder().encode(secretKey);

export interface JWTPayload {
  user: { id: string; email: string; role: string; name: string };
  expires: string | Date;
}

export async function encrypt(payload: JWTPayload) {
  return await new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(key);
}

export async function decrypt(input: string): Promise<JWTPayload | null> {
  if (!input) return null;
  try {
    const { payload } = await jwtVerify(input, key, {
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
    sameSite: 'none', 
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
    sameSite: 'none',
    expires: new Date(parsed.expires),
    path: '/',
  });
  return res;
}
