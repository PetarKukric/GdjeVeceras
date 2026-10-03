import prisma from '@/lib/prisma';
import { friendIds } from '@/lib/profile-data';
import { resolveOccurrence, toExceptionMap } from '@/lib/recurrence';

export interface AtmosphereItem {
  id: string;
  source: 'OWNER' | 'CHECKIN' | 'PHOTO';
  type: 'IMAGE' | 'VIDEO';
  mediaUrl: string;
  caption: string | null;
  createdAt: Date;
  visibility: 'PUBLIC' | 'FRIENDS';
  uploadedBy: { id: string; name: string | null; avatarUrl: string | null };
}

const userSelect = { id: true, name: true, avatarUrl: true } as const;

/**
 * "Atmosfera sa događaja": objave vlasnika + fotke koje su gosti objavili dok su bili u lokalu tokom događaja:
 * - fotke sa check-ina u lokalu (glavnom ili dodatnom) između početka i kraja događaja
 * - fotke sa profila označene tim lokalom, ali samo od ljudi koji su se tu i čekirali u tom periodu (dokaz da su bili tamo)
 * Check-in fotke "samo prijatelji" vide samo autor i njegovi prijatelji (međusobno praćenje) — ostalima se uopšte ne šalju.
 * Korisnici koji su sakrili check-ine (showCheckIns = false) ili su blokirani se ne prikazuju.
 */
export async function loadAtmosphere(slug: string, viewerId: string | null, date?: string | null) {
  const event = await prisma.event.findUnique({
    where: { slug },
    include: {
      additionalVenues: { select: { venueId: true } },
      liveMedia: { orderBy: { createdAt: 'desc' }, include: { uploadedBy: { select: userSelect } } },
    },
  });
  if (!event) return null;

  // Ponavljajući događaj: prozor je konkretan termin (?date=YYYY-MM-DD)
  let start = event.startDateTime;
  let end = event.endDateTime;
  if (date && event.isRecurring) {
    const exceptions = await prisma.eventOccurrenceException.findMany({ where: { parentEventId: event.id } });
    const occurrence = resolveOccurrence(event as never, date, toExceptionMap(exceptions));
    if (occurrence) { start = new Date(occurrence.startDateTime); end = new Date(occurrence.endDateTime ?? occurrence.startDateTime); }
  }

  const owner: AtmosphereItem[] = event.liveMedia.map((m) => ({
    id: m.id, source: 'OWNER', type: m.type, mediaUrl: m.mediaUrl, caption: m.caption, createdAt: m.createdAt,
    visibility: 'PUBLIC', uploadedBy: m.uploadedBy,
  }));

  const now = new Date();
  if (start > now) return { event, items: owner };
  const window = { gte: start, lte: end < now ? end : now };
  const venueIds = [event.venueId, ...event.additionalVenues.map((v) => v.venueId)];
  const visibleUser = { restricted: false, showCheckIns: true };

  const [checkIns, photos] = await Promise.all([
    prisma.checkIn.findMany({
      where: { venueId: { in: venueIds }, createdAt: window, user: visibleUser },
      orderBy: { createdAt: 'desc' },
      take: 300,
      select: { id: true, userId: true, venueId: true, photoUrl: true, photoVisibility: true, createdAt: true, user: { select: userSelect } },
    }),
    prisma.userPhoto.findMany({
      where: { venueId: { in: venueIds }, createdAt: window, user: visibleUser },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: { id: true, userId: true, url: true, caption: true, createdAt: true, user: { select: userSelect } },
    }),
  ]);

  const wasThere = new Set(checkIns.map((c) => c.userId));
  const needsFriends = viewerId && checkIns.some((c) => c.photoUrl && c.photoVisibility === 'FRIENDS' && c.userId !== viewerId);
  const friends = needsFriends ? await friendIds(viewerId) : new Set<string>();
  const canSee = (c: { userId: string; photoVisibility: string }) =>
    c.photoVisibility !== 'FRIENDS' || c.userId === viewerId || friends.has(c.userId);

  const guests: AtmosphereItem[] = [
    ...checkIns.filter((c) => c.photoUrl && canSee(c)).map((c): AtmosphereItem => ({
      id: `c_${c.id}`, source: 'CHECKIN', type: 'IMAGE', mediaUrl: c.photoUrl!, caption: null, createdAt: c.createdAt,
      visibility: c.photoVisibility === 'FRIENDS' ? 'FRIENDS' : 'PUBLIC', uploadedBy: c.user,
    })),
    ...photos.filter((p) => wasThere.has(p.userId)).map((p): AtmosphereItem => ({
      id: `p_${p.id}`, source: 'PHOTO', type: 'IMAGE', mediaUrl: p.url, caption: p.caption, createdAt: p.createdAt,
      visibility: 'PUBLIC', uploadedBy: p.user,
    })),
  ];

  const items = [...owner, ...guests].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  return { event, items };
}
