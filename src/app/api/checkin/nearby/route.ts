import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { distanceMeters, isBoosted, venuePoints } from '@/lib/score';

/** Lokali u blizini (za check-in fotkom + lokacijom) — svaki lokal daje bodove */
export async function GET(request: NextRequest) {
  const lat = Number(request.nextUrl.searchParams.get('lat'));
  const lng = Number(request.nextUrl.searchParams.get('lng'));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: 'noLocation' }, { status: 400 });
  }

  const venues = await prisma.venue.findMany({
    where: { latitude: { not: null }, longitude: { not: null } },
    select: { id: true, name: true, slug: true, city: true, imageUrl: true, latitude: true, longitude: true, isPartner: true, boostedUntil: true },
  });

  const nearby = venues
    .map(({ latitude, longitude, boostedUntil, ...venue }) => ({ ...venue, boosted: isBoosted({ boostedUntil }), checkInPoints: venuePoints({ isPartner: venue.isPartner, boostedUntil }), distanceM: distanceMeters(lat, lng, latitude!, longitude!) }))
    .filter((venue) => venue.distanceM <= 5000)
    .sort((a, b) => a.distanceM - b.distanceM)
    .slice(0, 10);

  return NextResponse.json({ venues: nearby });
}
