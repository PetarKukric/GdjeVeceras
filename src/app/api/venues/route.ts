import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { cleanupExpiredPromotions } from '@/lib/promotion-service';
import { getCityBySlug, getCityByName } from '@/lib/cities';

export async function GET(_request: NextRequest) {
  try {
    await cleanupExpiredPromotions();
    const { searchParams } = new URL(_request.url);
    const sort = searchParams.get('sort');
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;

    const orderBy: any = [];
    
    // Always put promoted first
    orderBy.push({ promoted: 'desc' });

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
        promotions: {
          where: {
            status: 'ACTIVE',
            endAt: { gte: new Date() }
          }
        },
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
        imageUrl: body.imageUrl,
        ownerId: (body.ownerId && body.ownerId !== "") ? body.ownerId : (session.user.role === 'OWNER' ? session.user.id : null),
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

    if (body.ownerId || session.user.role === 'OWNER') {
      await prisma.user.update({
        where: { id: body.ownerId || session.user.id },
        data: { role: 'OWNER' }
      });
    }

    return NextResponse.json(venue, { status: 201 });
  } catch (_unused) {
    console.error("POST Venue Error", _unused);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
