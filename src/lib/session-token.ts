import { SignJWT, jwtVerify } from 'jose';

const DEV_FALLBACK_SECRET = 'gradiska-events-very-secret-key-123456789';
export const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000;

function getKey(): Uint8Array {
  if (process.env.JWT_SECRET) return new TextEncoder().encode(process.env.JWT_SECRET);
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET nije postavljen u produkciji.');
  }
  return new TextEncoder().encode(DEV_FALLBACK_SECRET);
}

export interface JWTPayload {
  user: { id: string; email: string; role: string; name: string };
  expires: string | Date;
}

export async function encrypt(payload: JWTPayload) {
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(getKey());
}

export async function decrypt(input: string): Promise<JWTPayload | null> {
  if (!input) return null;
  try {
    const { payload } = await jwtVerify(input, getKey(), { algorithms: ['HS256'] });
    return payload as unknown as JWTPayload;
  } catch (error) {
    console.error('Auth: Decrypt failed', error);
    return null;
  }
}
