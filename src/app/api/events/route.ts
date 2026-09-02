import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { Category, Status } from '@prisma/client';
import { getCityBySlug, getCityByName } from '@/lib/cities';
import { getSarajevoNow, sarajevoStartOfDay } from '@/lib/bosnia-time';
import { expandRecurringEvents, toExceptionMap, validateRecurrenceInput } from '@/lib/recurrence';
import { getSession } from '@/lib/auth';
import { requireVerifiedEmail } from '@/lib/verification';

// Ograničenje ekspanzije ponavljajućih događaja za otvorenije opsege (upcoming/all)
const EXPANSION_WINDOW_MS = 60 * 24 * 60 * 60 * 1000; // 60 dana

export async function GET(_request: NextRequest) {
  try {
    const { searchParams } = new URL(_request.url);
    
    // Pagination
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    // Filtering
    const category = searchParams.get('category') as Category | null;
    const venueSlug = searchParams.get('venue');
    const cityParam = searchParams.get('city'); // slug (npr. "banja-luka") ili naziv ("Banja Luka")
    const dateFilter = searchParams.get('date'); // today, tomorrow, weekend, upcoming, YYYY-MM-DD, all
    const minPrice = searchParams.get('minPrice') ? parseFloat(searchParams.get('minPrice')!) : undefined;
    const maxPrice = searchParams.get('maxPrice') ? parseFloat(searchParams.get('maxPrice')!) : undefined;
    const search = searchParams.get('search');
    const status = (searchParams.get('status') as Status) || Status.PUBLISHED;

    // Grad — rezolucija na kanonski naziv (gradovi dolaze iz centralne liste)
    const city = getCityBySlug(cityParam) || getCityByName(cityParam);

    // Sorting
    const sort = searchParams.get('sort') || 'startTime';
    const userLat = searchParams.get('lat') ? parseFloat(searchParams.get('lat')!) : null;
    const userLng = searchParams.get('lng') ? parseFloat(searchParams.get('lng')!) : null;

    const where: any = {
      status: status,
      isRecurring: false, // ponavljajući se dodaju kao izračunati termini (ispod)
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

    // Date filtering logic — granice dana po SARAJEVSKOM vremenu
    // (da događaj unesen za petak 22:00 ne "sklizne" u subotu zbog UTC-a na serveru)
    const bosniaNow = getSarajevoNow();
    const todayStart = sarajevoStartOfDay(bosniaNow);
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000 - 1);

    // Raspon za ekspanziju ponavljajućih događaja (uvijek ograničen!)
    let rangeStart: Date | null = null;
    let rangeEnd: Date | null = null;

    if (dateFilter === 'today') {
      where.startDateTime = { gte: todayStart, lte: todayEnd };
      rangeStart = todayStart; rangeEnd = todayEnd;
    } else if (dateFilter === 'tomorrow') {
      const tomorrowStart = new Date(todayStart);
      tomorrowStart.setDate(tomorrowStart.getDate() + 1);
      const tomorrowEnd = new Date(todayEnd);
      tomorrowEnd.setDate(tomorrowEnd.getDate() + 1);
      where.startDateTime = { gte: tomorrowStart, lte: tomorrowEnd };
      rangeStart = tomorrowStart; rangeEnd = tomorrowEnd;
    } else if (dateFilter === 'weekend') {
      // Vikend: petak (sarajevsko vrijeme) do nedjelje 23:59:59
      const dayOfWeek = bosniaNow.getUTCDay(); // 0=ned..6=sub u Sarajevu
      const daysToFriday = (5 - dayOfWeek + 7) % 7;
      const friday = new Date(todayStart.getTime() + daysToFriday * 24 * 60 * 60 * 1000);
      const sunday = new Date(friday.getTime() + 3 * 24 * 60 * 60 * 1000 - 1);
      where.startDateTime = { gte: friday, lte: sunday };
      rangeStart = friday; rangeEnd = sunday;
    } else if (dateFilter === 'upcoming') {
      // Samo događaji koji još nisu završili (prošli se ne prikazuju)
      where.endDateTime = { gte: new Date() };
      rangeStart = new Date(); rangeEnd = new Date(Date.now() + EXPANSION_WINDOW_MS);
    } else if (dateFilter && dateFilter.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const customDate = new Date(dateFilter);
      const customDateEnd = new Date(customDate);
      customDateEnd.setHours(23, 59, 59, 999);
      where.startDateTime = { gte: customDate, lte: customDateEnd };
      rangeStart = customDate; rangeEnd = customDateEnd;
    } else if (dateFilter === 'all') {
        // Show all future events starting from today
        where.startDateTime = { gte: todayStart };
        rangeStart = todayStart; rangeEnd = new Date(todayStart.getTime() + EXPANSION_WINDOW_MS);
    } else {
        // Default behavior: all future events
        where.startDateTime = { gte: todayStart };
        rangeStart = todayStart; rangeEnd = new Date(todayStart.getTime() + EXPANSION_WINDOW_MS);
    }

    // Sorting logic
    const orderBy: any[] = [];
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
      orderBy.push({ startDateTime: 'asc' });
    }

    // Distance sorting requires fetching all events and sorting in memory
    const isDistanceSort = sort === 'distance' && userLat !== null && userLng !== null;

    // ===== PONAVLJAJUĆI DOGAĐAJI — ekspanzija termina unutar [rangeStart, rangeEnd] =====
    // Ne generišu se DB redovi: termini se računaju iz pravila + izuzetaka.
    let occurrences: any[] = [];
    let recurringCount = 0;
    if (rangeStart && rangeEnd) {
      const recWhere: any = { ...where, isRecurring: true };
      delete recWhere.startDateTime;
      delete recWhere.endDateTime;
      recurringCount = await prisma.event.count({ where: recWhere });
      if (recurringCount > 0) {
        const recurringEvents = await prisma.event.findMany({
          where: recWhere,
          include: {
            venue: { include: { openingHours: true } },
            additionalVenues: {
              include: { venue: { select: { id: true, name: true, city: true, slug: true, address: true } } },
            },
            occurrenceExceptions: true,
            _count: { select: { favorites: true, liveMedia: true } },
          },
          take: 200, // gornja granica serija po upitu
        });
        const exceptionsByParent: Record<string, any> = {};
        for (const ev of recurringEvents) {
          exceptionsByParent[ev.id] = toExceptionMap(ev.occurrenceExceptions);
          delete (ev as any).occurrenceExceptions;
        }
        occurrences = expandRecurringEvents(recurringEvents, rangeStart, rangeEnd, exceptionsByParent);
      }
    }

    // Ako nema ponavljajućih — ponašanje identično starom (SQL paginacija)
    const mergeInMemory = isDistanceSort || occurrences.length > 0;

    const [events, total] = await Promise.all([
      prisma.event.findMany({
        where,
        include: {
          venue: {
            include: {
              openingHours: true
            }
          },
          additionalVenues: {
            include: {
              venue: {
                select: { id: true, name: true, city: true, slug: true, address: true }
              }
            }
          },
          _count: {
            select: { favorites: true, liveMedia: true }
          }
        },
        ...(mergeInMemory ? {} : { orderBy, skip, take: limit }),
      }),
      prisma.event.count({ where }),
    ]);

    let finalEvents: any[] = mergeInMemory ? [...events, ...occurrences] : events;

    if (mergeInMemory) {
      if (isDistanceSort) {
        const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
          const R = 6371;
          const dLat = (lat2 - lat1) * Math.PI / 180;
          const dLon = (lon2 - lon1) * Math.PI / 180;
          const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                    Math.sin(dLon/2) * Math.sin(dLon/2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
          return R * c;
        };
        finalEvents = finalEvents.map(event => {
          let distance = null;
          if (event.venue?.latitude && event.venue?.longitude) {
            distance = getDistance(userLat!, userLng!, event.venue.latitude, event.venue.longitude);
          }
          return { ...event, distance };
        }).sort((a, b) => {
          if (a.distance === null) return 1;
          if (b.distance === null) return -1;
          return a.distance - b.distance;
        });
      } else {
        // isti redoslijed kao DB orderBy varijante
        finalEvents.sort((a: any, b: any) => {
          if (sort === 'newest') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          if (sort === 'price') return (a.price ?? 0) - (b.price ?? 0);
          if (sort === 'popularity') {
            const favDiff = (b._count?.favorites || 0) - (a._count?.favorites || 0);
            if (favDiff !== 0) return favDiff;
          }
          return new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime();
        });
      }
      finalEvents = finalEvents.slice(skip, skip + limit);
    }

    const finalTotal = mergeInMemory ? total + occurrences.length : total;

    return NextResponse.json({
      events: finalEvents,
      pagination: {
        total: finalTotal,
        page,
        limit,
        totalPages: Math.ceil(finalTotal / limit),
      },
    });
  } catch (_unused) {
    console.error("Events API Error", _unused);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
export async function POST(_request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Morate biti prijavljeni' }, { status: 401 });
    }
    if (session.user.role !== 'ADMIN' && session.user.role !== 'OWNER') {
      return NextResponse.json({ error: 'Nemate dozvolu za dodavanje događaja.' }, { status: 403 });
    }
    const verificationError = await requireVerifiedEmail(session.user.id);
    if (verificationError) return verificationError;

    const body = await _request.json();
    
    // Basic validation (should use zod in production)
    if (!body.title || !body.venueId || !body.startDateTime || !body.category) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    if (!['PARTY', 'LIVE_MUSIC', 'CONCERT'].includes(body.category)) {
      return NextResponse.json({ error: 'Nepoznata kategorija događaja.' }, { status: 400 });
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

    // Ponavljajući događaji — validacija pravila na serveru
    const recurrence = validateRecurrenceInput(body);
    if (recurrence.error) {
      return NextResponse.json({ error: recurrence.error }, { status: 400 });
    }

    const slug = body.title.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '') + '-' + Date.now();

    // Dodatni lokali (zajednički događaj) — validacija
    let additionalVenueIds: string[] = [];
    if (Array.isArray(body.additionalVenueIds) && body.additionalVenueIds.length > 0) {
      const unique: string[] = Array.from(new Set((body.additionalVenueIds as any[]).filter((v: any) => v && v !== body.venueId)));
      const found = await prisma.venue.findMany({ where: { id: { in: unique } }, select: { id: true } });
      additionalVenueIds = found.map((v) => v.id);
    }

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
        additionalVenues: additionalVenueIds.length > 0
          ? { create: additionalVenueIds.map((vid) => ({ venueId: vid })) }
          : undefined,
        ...recurrence.data,
      },
    });

    return NextResponse.json(event, { status: 201 });
  } catch (_unused) {
    console.error("API Error", _unused);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
