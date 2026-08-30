import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';

/**
 * Restrikcija korisnika (ban / skidanje bana) - samo ADMIN.
 * Restricted korisnik se ne može prijaviti.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id } = await params;
    if (id === session.user.id) {
      return NextResponse.json({ error: 'Ne možete ograničiti sopstveni nalog.' }, { status: 400 });
    }

    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) {
      return NextResponse.json({ error: 'Korisnik nije pronađen' }, { status: 404 });
    }
    if (target.role === 'ADMIN') {
      return NextResponse.json({ error: 'Admin nalog se ne može ograničiti.' }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const restricted = typeof body.restricted === 'boolean' ? body.restricted : !target.restricted;

    const updated = await prisma.user.update({
      where: { id },
      data: { restricted },
      select: { id: true, name: true, email: true, role: true, restricted: true },
    });

    return NextResponse.json({ message: restricted ? 'Korisnik ograničen.' : 'Ograničenje skinuto.', user: updated });
  } catch (error) {
    console.error('User Restrict API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id } = await params;

    // Prevent deleting self
    if (id === session.user.id) {
      return NextResponse.json({ error: 'Ne možete obrisati sopstveni nalog' }, { status: 400 });
    }

    // Check if user exists
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return NextResponse.json({ error: 'Korisnik nije pronađen' }, { status: 404 });
    }

    // Delete related records or handle constraints
    await prisma.venue.updateMany({
        where: { ownerId: id },
        data: { ownerId: null }
    });

    await prisma.user.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Korisnik obrisan' });
  } catch (error) {
    console.error('User Delete API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
