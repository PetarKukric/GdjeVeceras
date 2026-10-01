import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { distanceMeters } from '@/lib/score';

/** Partner lokali u blizini (za check-in fotkom + lokacijom) */
export async function GET(request: NextRequest) {
  const lat = Number(request.nextUrl.searchParams.get('lat'));
  const lng = Number(request.nextUrl.searchParams.get('lng'));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: 'noLocation' }, { status: 400 });
  }

  const venues = await prisma.venue.findMany({
    where: { isPartner: true, latitude: { not: null }, longitude: { not: null } },
    select: { id: true, name: true, slug: true, city: true, imageUrl: true, latitude: true, longitude: true, checkInPoints: true },
  });

  const nearby = venues
    .map(({ latitude, longitude, ...venue }) => ({ ...venue, distanceM: distanceMeters(lat, lng, latitude!, longitude!) }))
    .filter((venue) => venue.distanceM <= 5000)
    .sort((a, b) => a.distanceM - b.distanceM)
    .slice(0, 10);

  return NextResponse.json({ venues: nearby });
}
