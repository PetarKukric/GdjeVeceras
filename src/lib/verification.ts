import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function requireVerifiedEmail(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { emailVerified: true },
  });

  if (user?.emailVerified) return null;

  return NextResponse.json(
    {
      error: 'Potvrdi email da bi koristio ovu opciju.',
      code: 'EMAIL_VERIFICATION_REQUIRED',
      requiresVerification: true,
    },
    { status: 403 }
  );
}
