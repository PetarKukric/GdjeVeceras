import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { requireVerifiedEmail } from '@/lib/verification';
import { getCityBySlug, getCityByName } from '@/lib/cities';

export async function GET(_request: NextRequest) {
  try {
    const { searchParams } = new URL(_request.url);
    const sort = searchParams.get('sort');
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;

    const orderBy: any = [];

    if (sort === 'popularity') {
      orderBy.push({ favorites: { _count: 'desc' } });
    } else {
      orderBy.push({ name: 'asc' });
    }

    const cityParam = searchParams.get('city');
    const city = getCityBySlug(cityParam) || getCityByName(cityParam);

    const venues = await prisma.venue.findMany({
      where: city ? { city: city.name } : undefined,
      include: {
        openingHours: true,
        tags: true,
        _count: {
          select: { events: true, favorites: true }
        }
      },
      orderBy,
      take: limit
    });
    return NextResponse.json(venues);
  } catch (_unused) {
    console.error("Venues API Error", _unused);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(_request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'OWNER')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    const verificationError = await requireVerifiedEmail(session.user.id);
    if (verificationError) return verificationError;

    const body = await _request.json();
    
    if (!body.name || !body.address || !body.city) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const slug = body.name.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '') + '-' + Date.now();

    const venue = await prisma.venue.create({
      data: {
        name: body.name,
        description: body.description,
        address: body.address,
        city: body.city,
        latitude: body.latitude,
        longitude: body.longitude,
        phone: body.phone,
        website: body.website,
        instagramUrl: body.instagramUrl,
        facebookUrl: body.facebookUrl,
        tiktokUrl: body.tiktokUrl,
        reservationsEnabled: !!body.reservationsEnabled,
        imageUrl: body.imageUrl,
        // Samo ADMIN smije dodijeliti lokal drugom korisniku.
        // OWNER koji kreira lokal uvijek postaje vlasnik tog lokala.
        ownerId: session.user.role === 'ADMIN'
          ? ((body.ownerId && body.ownerId !== '') ? body.ownerId : null)
          : session.user.id,
        slug,
        openingHours: {
          create: (body.openingHours || []).map((h: any) => ({
            dayGroup: h.dayGroup,
            openTime: h.openTime,
            closeTime: h.closeTime,
            isClosed: h.isClosed
          }))
        },
        tags: {
          create: (body.tags || []).map((tag: string) => ({ name: tag }))
        }
      },
    });

    if (session.user.role === 'ADMIN' && body.ownerId) {
      await prisma.user.update({
        where: { id: body.ownerId },
        data: { role: 'OWNER' }
      });
    }

    return NextResponse.json(venue, { status: 201 });
  } catch (_unused) {
    console.error("POST Venue Error", _unused);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
