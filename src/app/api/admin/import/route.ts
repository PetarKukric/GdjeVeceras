import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';

/**
 * Mass Import — kreira/dopunjuje JEDAN element po pozivu (admin čarobnjak ide jedan po jedan).
 *
 * POST { action: 'lookup', name, city? }  → vraća postojeći lokal (ili null) sa radnim vremenom i tagovima
 * POST { type: 'VENUE', mode: 'create' | 'update', id?, data, imageUrl? } — unos novog / dopuna postojećeg
 * POST { type: 'EVENT', data, imageUrl? } — unos događaja
 *
 * Slika NIJE obavezna — imageUrl može biti null.
 */
const OPENING_GROUPS = ['WEEKDAYS', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

function normalize(value: string): string {
  return value.trim().toLocaleLowerCase('bs').normalize('NFC');
}

function makeSlug(base: string): string {
  const clean = base
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // čćžšđ → cczsd
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return `${clean || 'import'}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

function parseDate(input: string, time?: string): Date | null {
  if (!input) return null;
  let iso = null;
  const ymd = input.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const dmy = input.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (ymd) iso = `${ymd[1]}-${ymd[2]}-${ymd[3]}`;
  else if (dmy) iso = `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;
  if (!iso) return null;
  const t = time && time.match(/^(\d{1,2}):(\d{2})$/)
    ? `${time.split(':')[0].padStart(2, '0')}:${time.split(':')[1]}`
    : '20:00';
  const d = new Date(`${iso}T${t}:00`);
  return isNaN(d.getTime()) ? null : d;
}

/** Radno vrijeme iz čarobnjaka → čisti redovi za bazu */
function cleanOpening(hours: unknown): { dayGroup: string; openTime: string | null; closeTime: string | null; isClosed: boolean }[] {
  if (!Array.isArray(hours)) return [];
  return hours
    .filter((h: any) => h && OPENING_GROUPS.includes(h.dayGroup))
    .map((h: any) => {
      const isClosed = Boolean(h.isClosed ?? h.closed);
      return {
        dayGroup: h.dayGroup,
        openTime: isClosed ? null : (h.openTime || h.open || null),
        closeTime: isClosed ? null : (h.closeTime || h.close || null),
        isClosed,
      };
    });
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Samo administrator.' }, { status: 403 });
    }

    const body = await request.json();

    // ===== LOOKUP: da li lokal već postoji u bazi? =====
    if (body.action === 'lookup') {
      const name = String(body.name || '').trim();
      const city = String(body.city || '').trim();
      if (!name) return NextResponse.json({ venue: null });
      const candidates = await prisma.venue.findMany({
        include: { openingHours: true, tags: true },
      });
      const venue = candidates.find((candidate) =>
        normalize(candidate.name) === normalize(name) && (!city || normalize(candidate.city) === normalize(city))
      ) || null;
      return NextResponse.json({ venue });
    }

    const { type, data, imageUrl } = body;
    if (!type || !data) {
      return NextResponse.json({ error: 'Nedostaju podaci.' }, { status: 400 });
    }

    // ===== LOKAL =====
    if (type === 'VENUE') {
      const mode = body.mode === 'update' ? 'update' : 'create';

      // --- DOPUNA POSTOJEĆEG: samo polja koja šalje čarobnjak (u UI se prikazuju samo prazna) ---
      if (mode === 'update') {
        const id = String(body.id || '');
        if (!id) return NextResponse.json({ error: 'Nedostaje ID lokala.' }, { status: 400 });
        const existing = await prisma.venue.findUnique({ where: { id }, include: { openingHours: true, tags: true } });
        if (!existing) return NextResponse.json({ error: 'Lokal ne postoji.' }, { status: 404 });

        const update: Record<string, unknown> = {};
        for (const key of ['address', 'city', 'phone', 'website', 'instagramUrl', 'facebookUrl', 'tiktokUrl', 'description', 'email'] as const) {
          const v = data[key];
          if (!existing[key] && typeof v === 'string' && v.trim() !== '') update[key] = v.trim();
        }
        for (const key of ['latitude', 'longitude'] as const) {
          const n = parseFloat(String(data[key] ?? ''));
          if (existing[key] == null && data[key] !== undefined && data[key] !== null && data[key] !== '' && !isNaN(n)) update[key] = n;
        }
        if (!existing.imageUrl && typeof imageUrl === 'string' && imageUrl !== '') update.imageUrl = imageUrl;

        if (Array.isArray(data.openingHours) && data.openingHours.length > 0 && existing.openingHours.length === 0) {
          update.openingHours = {
            deleteMany: {},
            create: cleanOpening(data.openingHours),
          };
        }

        // dodaj tagove (Tip lokala) koje lokal već nema
        const newTags: string[] = [];
        if (Array.isArray(data.tags)) {
          const have = new Set(existing.tags.map((t) => t.name.toLowerCase()));
          for (const t of data.tags) {
            const name = String(t || '').trim();
            if (name && !have.has(name.toLowerCase())) newTags.push(name);
          }
        }
        if (newTags.length > 0) update.tags = { create: newTags.map((name) => ({ name })) };

        if (Object.keys(update).length === 0) {
          return NextResponse.json({ message: 'Nema novih podataka za unos.', venue: existing, nothingToDo: true });
        }

        const venue = await prisma.venue.update({ where: { id }, data: update, include: { openingHours: true, tags: true } });
        return NextResponse.json({ message: 'Lokal dopunjen.', venue, updatedFields: Object.keys(update) });
      }

      // --- NOVI LOKAL ---
      const name = String(data.name || '').trim();
      const city = String(data.city || '').trim();
      const address = String(data.address || '').trim() || 'Nepoznata adresa';
      if (!name || !city) {
        return NextResponse.json({ error: 'Naziv i grad su obavezni za lokal.' }, { status: 400 });
      }

      const venueCandidates = await prisma.venue.findMany({ select: { id: true, name: true, city: true } });
      const dup = venueCandidates.find(
        (venue) => normalize(venue.name) === normalize(name) && normalize(venue.city) === normalize(city)
      );
      if (dup) {
        return NextResponse.json({ error: `Lokal "${name}" već postoji u ${city}.`, duplicate: true }, { status: 409 });
      }

      const lat = data.latitude !== undefined && data.latitude !== null && data.latitude !== '' ? parseFloat(String(data.latitude)) : null;
      const lng = data.longitude !== undefined && data.longitude !== null && data.longitude !== '' ? parseFloat(String(data.longitude)) : null;

      const venue = await prisma.venue.create({
        data: {
          name,
          city,
          address,
          description: data.description ? String(data.description).trim() : null,
          phone: data.phone ? String(data.phone).trim() : null,
          website: data.website ? String(data.website).trim() : null,
          instagramUrl: data.instagramUrl ? String(data.instagramUrl).trim() : null,
          facebookUrl: data.facebookUrl ? String(data.facebookUrl).trim() : null,
          tiktokUrl: data.tiktokUrl ? String(data.tiktokUrl).trim() : null,
          email: data.email ? String(data.email).trim() : null,
          latitude: lat !== null && !isNaN(lat) ? lat : null,
          longitude: lng !== null && !isNaN(lng) ? lng : null,
          imageUrl: imageUrl || null,
          slug: makeSlug(name),
          openingHours: { create: cleanOpening(data.openingHours) },
          tags: { create: (Array.isArray(data.tags) ? data.tags : []).map((t: string) => ({ name: String(t).trim() })).filter((t: any) => t.name) },
        },
        include: { openingHours: true, tags: true },
      });
      return NextResponse.json({ message: 'Lokal unešen.', venue }, { status: 201 });
    }

    // ===== DOGAĐAJ =====
    if (type === 'EVENT') {
      const title = String(data.title || '').trim();
      if (!title) {
        return NextResponse.json({ error: 'Naslov je obavezan za događaj.' }, { status: 400 });
      }

      const start = parseDate(String(data.date || ''), data.time ? String(data.time) : undefined);
      if (!start) {
        return NextResponse.json({ error: 'Neispravan datum (koristi YYYY-MM-DD ili DD.MM.YYYY).' }, { status: 400 });
      }
      const end = new Date(start.getTime() + 6 * 60 * 60 * 1000); // default +6h

      const venues = await prisma.venue.findMany({ select: { id: true, name: true, city: true } });
      let selectedVenue = data.venueId
        ? venues.find((venue) => venue.id === String(data.venueId))
        : undefined;
      if (!selectedVenue && data.venueName) {
        const venueName = normalize(String(data.venueName));
        const city = data.city ? normalize(String(data.city)) : null;
        selectedVenue = venues.find((venue) =>
          normalize(venue.name) === venueName && (!city || normalize(venue.city) === city)
        );
      }
      if (!selectedVenue) {
        return NextResponse.json({ error: 'Lokal nije pronađen — izaberi lokal iz liste.' }, { status: 400 });
      }
      const venueId = selectedVenue.id;

      const catRaw = String(data.category || '').toLowerCase();
      const category = catRaw.includes('live') || catRaw.includes('muz') ? 'LIVE_MUSIC' : 'PARTY';

      const priceRaw = data.price === '' || data.price === undefined || data.price === null ? null : parseFloat(String(data.price));
      const price = priceRaw !== null && !isNaN(priceRaw) && priceRaw >= 0 ? priceRaw : null;

      const duplicate = await prisma.event.findFirst({
        where: { title, venueId, startDateTime: start },
        select: { id: true },
      });
      if (duplicate) {
        return NextResponse.json({ error: `Događaj "${title}" već postoji u ovom terminu.`, duplicate: true }, { status: 409 });
      }

      const event = await prisma.event.create({
        data: {
          title,
          description: data.description ? String(data.description).trim() : null,
          venueId,
          startDateTime: start,
          endDateTime: end,
          price,
          category,
          imageUrl: imageUrl || null,
          slug: makeSlug(title),
          status: 'PUBLISHED',
          createdById: session.user.id,
        },
      });
      return NextResponse.json({ message: 'Događaj unešen.', event }, { status: 201 });
    }

    return NextResponse.json({ error: 'Nepoznat tip (VENUE ili EVENT).' }, { status: 400 });
  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json({ error: 'Greška na serveru pri uvozu.' }, { status: 500 });
  }
}
