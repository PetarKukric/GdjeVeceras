import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  if (!token) {
    return NextResponse.json({ error: 'Nedostaje token za verifikaciju.' }, { status: 400 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { verificationToken: token },
    });

    if (!user) {
      return NextResponse.json({ error: 'Neispravan ili već iskorišten token.' }, { status: 400 });
    }

    if (user.tokenExpires && user.tokenExpires < new Date()) {
      return NextResponse.json({ 
        error: 'Link za potvrdu je istekao. Pošalji novi verifikacioni email.',
        expired: true 
      }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: new Date(),
        verificationToken: null,
        tokenExpires: null,
      },
    });

    return NextResponse.json({ message: 'Email je uspješno potvrđen.' });
  } catch (error) {
    console.error('Verification error:', error);
    return NextResponse.json({ error: 'Greška pri verifikaciji.' }, { status: 500 });
  }
}
