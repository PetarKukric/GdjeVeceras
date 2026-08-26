import * as bcrypt from 'bcryptjs';
import crypto from 'crypto';

/**
 * Generiše nasumičnu, ljudski čitljivu lozinku (za admin email-OTP prijavu).
 */
export function generateRandomPassword(length = 12): string {
  const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  const bytes = crypto.randomBytes(length);
  let result = '';
  for (let i = 0; i < length; i++) {
    result += charset[bytes[i] % charset.length];
  }
  return result;
}

/**
 * Generiše nasumični token (za reset lozinke).
 */
export function generateResetToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Hash tokena (SHA-256) prije nego što se upiše u bazu.
 * Email linkovi i dalje nose originalni token — u bazi se čuva samo hash,
 * pa curanje baze ne otkriva validne linkove za reset/verifikaciju.
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    return await bcrypt.compare(password, hash);
  } catch {
    return false;
  }
}
