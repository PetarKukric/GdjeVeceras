import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { Category, Status } from '@prisma/client';
import { cleanupExpiredPromotions } from '@/lib/promotion-service';
import { getCityBySlug, getCityByName } from '@/lib/cities';

export async function GET(_request: NextRequest) {
  try {
    await cleanupExpiredPromotions();
    const { searchParams } = new URL(_request.url);
    
    // Pagination
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    // Filtering
    const category = searchParams.get('category') as Category | null;
    const venueSlug = searchParams.get('venue');
    const cityParam = searchParams.get('city'); // slug (npr. "banja-luka") ili naziv ("Banja Luka")
    const dateFilter = searchParams.get('date'); // today, tomorrow, weekend, YYYY-MM-DD
    const minPrice = searchParams.get('minPrice') ? parseFloat(searchParams.get('minPrice')!) : undefined;
    const maxPrice = searchParams.get('maxPrice') ? parseFloat(searchParams.get('maxPrice')!) : undefined;
    const search = searchParams.get('search');
    const status = (searchParams.get('status') as Status) || Status.PUBLISHED;

    // Grad — rezolucija na kanonski naziv (gradovi dolaze iz centralne liste)
    const city = getCityBySlug(cityParam) || getCityByName(cityParam);

    // Sorting
    const sort = searchParams.get('sort') || 'startTime'; // startTime, newest, price, relevance, distance
    const userLat = searchParams.get('lat') ? parseFloat(searchParams.get('lat')!) : null;
    const userLng = searchParams.get('lng') ? parseFloat(searchParams.get('lng')!) : null;

    const where: any = {
      status: status,
    };

    if (category) {
      where.category = category;
    }

    if (venueSlug || city) {
      const venueWhere: any = {};
      if (venueSlug) venueWhere.slug = venueSlug;
      if (city) venueWhere.city = city.name;
      where.venue = venueWhere;
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      where.price = {};
      if (minPrice !== undefined) where.price.gte = minPrice;
      if (maxPrice !== undefined) where.price.lte = maxPrice;
    }

    if (search) {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } },
        { performers: { contains: search } },
        { venue: { name: { contains: search } } },
      ];
    }

    // Date filtering logic
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    if (dateFilter === 'today') {
      where.startDateTime = {
        gte: todayStart,
        lte: todayEnd,
      };
    } else if (dateFilter === 'tomorrow') {
      const tomorrowStart = new Date(todayStart);
      tomorrowStart.setDate(tomorrowStart.getDate() + 1);
      const tomorrowEnd = new Date(todayEnd);
      tomorrowEnd.setDate(tomorrowEnd.getDate() + 1);
      where.startDateTime = {
        gte: tomorrowStart,
        lte: tomorrowEnd,
      };
    } else if (dateFilter === 'weekend') {
      // Assuming weekend is Friday evening to Sunday night
      const friday = new Date(todayStart);
      friday.setDate(todayStart.getDate() + (5 - todayStart.getDay() + 7) % 7);
      const sunday = new Date(friday);
      sunday.setDate(friday.getDate() + 2);
      sunday.setHours(23, 59, 59, 999);
      where.startDateTime = {
        gte: friday,
        lte: sunday,
      };
    } else if (dateFilter === 'upcoming') {
      // Samo događaji koji još nisu završili (prošli se ne prikazuju)
      where.endDateTime = {
        gte: new Date(),
      };
    } else if (dateFilter && dateFilter.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const customDate = new Date(dateFilter);
      const customDateEnd = new Date(customDate);
      customDateEnd.setHours(23, 59, 59, 999);
      where.startDateTime = {
        gte: customDate,
        lte: customDateEnd,
      };
    } else if (dateFilter === 'all') {
        // Show all future events starting from today
        where.startDateTime = {
            gte: todayStart
        };
    } else {
        // Default behavior: all future events
        where.startDateTime = {
            gte: todayStart
        };
    }

    // Sorting logic
    const orderBy: any = [];
    
    // Always put promoted first
    orderBy.push({ promoted: 'desc' });

    if (sort === 'startTime') {
      orderBy.push({ startDateTime: 'asc' });
    } else if (sort === 'newest') {
      orderBy.push({ createdAt: 'desc' });
    } else if (sort === 'price') {
      orderBy.push({ price: 'asc' });
    } else if (sort === 'popularity') {
      orderBy.push({ favorites: { _count: 'desc' } });
      orderBy.push({ startDateTime: 'asc' });
    } else if (sort === 'relevance') {
      orderBy.push({ featured: 'desc' });
      orderBy.push({ promoted: 'desc' });
      orderBy.push({ startDateTime: 'asc' });
    }

    // Distance sorting requires fetching all events and sorting in memory
    const isDistanceSort = sort === 'distance' && userLat !== null && userLng !== null;

    const [events, total] = await Promise.all([
      prisma.event.findMany({
        where,
        include: {
          venue: {
            include: {
              openingHours: true
            }
          },
          promotions: {
            where: {
              status: 'ACTIVE',
              endAt: { gte: new Date() }
            }
          },
          _count: {
            select: { favorites: true, liveMedia: true }
          }
        },
        ...(isDistanceSort ? {} : { orderBy, skip, take: limit }),
      }),
      prisma.event.count({ where }),
    ]);

    let finalEvents = events;

    if (isDistanceSort) {
      const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
                  Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
      };

      finalEvents = events.map(event => {
        let distance = null;
        if (event.venue.latitude && event.venue.longitude) {
          distance = getDistance(userLat!, userLng!, event.venue.latitude, event.venue.longitude);
        }
        return { ...event, distance };
      }).sort((a, b) => {
        if (a.distance === null) return 1;
        if (b.distance === null) return -1;
        return a.distance - b.distance;
      });

      // Manual pagination for memory-sorted results
      finalEvents = finalEvents.slice(skip, skip + limit);
    }

    return NextResponse.json({
      events: finalEvents,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (_unused) {
    console.error("API Error", _unused);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

import {  getSession } from '@/lib/auth';
import { sendPromotedEventNotifications } from '@/lib/promotion-service';

export async function POST(_request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Morate biti prijavljeni' }, { status: 401 });
    }

    const body = await _request.json();
    
    // Basic validation (should use zod in production)
    if (!body.title || !body.venueId || !body.startDateTime || !body.category) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Authorization check
    if (session.user.role === 'OWNER') {
      const ownedVenue = await prisma.venue.findFirst({
        where: { id: body.venueId, ownerId: session.user.id }
      });
      if (!ownedVenue) {
        return NextResponse.json({ error: 'Nemate dozvolu da dodajete događaje za ovaj lokal' }, { status: 403 });
      }
    }

    if (body.dressCodeType === 'SPECIAL' && !body.dressCodeName) {
      return NextResponse.json({ error: 'Naziv dress code-a je obavezan za specijalni tip.' }, { status: 400 });
    }

    const slug = body.title.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '') + '-' + Date.now();

    const event = await prisma.event.create({
      data: {
        title: body.title,
        description: body.description,
        slug,
        venue: { connect: { id: body.venueId } },
        startDateTime: new Date(body.startDateTime),
        endDateTime: body.endDateTime ? new Date(body.endDateTime) : new Date(new Date(body.startDateTime).getTime() + 4 * 60 * 60 * 1000),
        price: body.price ? parseFloat(body.price) : 0,
        currency: body.currency || 'KM',
        category: body.category,
        performers: body.performers || null,
        minimumAge: body.minimumAge ? parseInt(body.minimumAge) : null,
        dressCodeType: body.dressCodeType || 'NONE',
        dressCodeName: body.dressCodeName || null,
        dressCodeDescription: body.dressCodeDescription || null,
        imageUrl: body.imageUrl || null,
        ticketUrl: body.ticketUrl || null,
        instagramUrl: body.instagramUrl || null,
        facebookUrl: body.facebookUrl || null,
        createdBy: { connect: { id: session.user.id } },
        status: session.user.role === 'ADMIN' ? 'PUBLISHED' : 'PENDING',
      },
    });

    // If published, check for promotions
    if (event.status === 'PUBLISHED') {
      await sendPromotedEventNotifications(event.id, event.venueId);
    }

    return NextResponse.json(event, { status: 201 });
  } catch (_unused) {
    console.error("API Error", _unused);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
