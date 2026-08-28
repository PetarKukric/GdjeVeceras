import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';

/**
 * Mass Import — kreira JEDAN element po pozivu (admin čarobnjak ide jedan po jedan).
 * POST { type: 'VENUE' | 'EVENT', data: {...}, imageUrl?: string | null }
 * Slika NIJE obavezna — imageUrl može biti null.
 */
function makeSlug(base: string): string {
  const clean = base
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // skini dijakritike (čćžšđ → cczsd)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return `${clean || 'import'}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

function normalize(value: string): string {
  return value.trim().toLocaleLowerCase('bs').normalize('NFC');
}

function parseDate(input: string, time?: string): Date | null {
  if (!input) return null;
  // Podržani: YYYY-MM-DD i DD.MM.YYYY
  let iso = null;
  const ymd = input.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const dmy = input.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (ymd) iso = `${ymd[1]}-${ymd[2]}-${ymd[3]}`;
  else if (dmy) iso = `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;
  if (!iso) return null;

  const t = (time && time.match(/^(\d{1,2}):(\d{2})$/)) ? `${time.split(':')[0].padStart(2, '0')}:${time.split(':')[1]}` : '20:00';
  const d = new Date(`${iso}T${t}:00`);
  return isNaN(d.getTime()) ? null : d;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Samo administrator.' }, { status: 403 });
    }

    const body = await request.json();
    const { type, data, imageUrl } = body;
    if (!type || !data) {
      return NextResponse.json({ error: 'Nedostaju podaci.' }, { status: 400 });
    }

    // ===== LOKAL =====
    if (type === 'VENUE') {
      const name = String(data.name || '').trim();
      const city = String(data.city || '').trim();
      const address = String(data.address || '').trim() || 'Nepoznata adresa';
      if (!name || !city) {
        return NextResponse.json({ error: 'Naziv i grad su obavezni za lokal.' }, { status: 400 });
      }

      // Preskoči duplikat (isti naziv + grad)
      const venueCandidates = await prisma.venue.findMany({
        select: { id: true, name: true, city: true },
      });
      const existing = venueCandidates.find(
        (venue) => normalize(venue.name) === normalize(name) && normalize(venue.city) === normalize(city)
      );
      if (existing) {
        return NextResponse.json({ error: `Lokal "${name}" već postoji u ${city}.`, duplicate: true }, { status: 409 });
      }

      const venue = await prisma.venue.create({
        data: {
          name,
          city,
          address,
          description: data.description ? String(data.description).trim() : null,
          imageUrl: imageUrl || null,
          slug: makeSlug(name),
        },
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

      // Lokal: po ID-u (izabran u čarobnjaku) ili po nazivu iz fajla
      const venues = await prisma.venue.findMany({ select: { id: true, name: true, city: true } });
      let selectedVenue = data.venueId
        ? venues.find((venue) => venue.id === String(data.venueId))
        : undefined;
      if (!selectedVenue && data.venueName) {
        const venueName = normalize(String(data.venueName));
        const city = data.city ? normalize(String(data.city)) : null;
        selectedVenue = venues.find(
          (venue) => normalize(venue.name) === venueName && (!city || normalize(venue.city) === city)
        );
      }
      if (!selectedVenue) {
        return NextResponse.json({ error: 'Lokal nije pronađen — izaberi lokal iz liste.' }, { status: 400 });
      }
      const venueId = selectedVenue.id;

      // Kategorija
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
