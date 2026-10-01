import { NextRequest, NextResponse } from 'next/server';
import QRCode from 'qrcode';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { checkInUrl } from '@/lib/score-service';

/** SVG QR kod za štampu na ulazu lokala: /api/admin/checkin/qr?venueId=...[&download=1] */
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'OWNER')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const venueId = request.nextUrl.searchParams.get('venueId') || '';
  const venue = await prisma.venue.findUnique({
    where: { id: venueId },
    select: { id: true, slug: true, ownerId: true, checkInVersion: true },
  });
  if (!venue) return NextResponse.json({ error: 'Lokal nije pronađen.' }, { status: 404 });
  if (session.user.role !== 'ADMIN' && venue.ownerId !== session.user.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const svg = await QRCode.toString(checkInUrl(venue), {
    type: 'svg',
    errorCorrectionLevel: 'M',
    margin: 2,
    color: { dark: '#070708', light: '#ffffff' },
  });

  const headers: Record<string, string> = {
    'Content-Type': 'image/svg+xml',
    'Cache-Control': 'private, no-store',
  };
  if (request.nextUrl.searchParams.get('download')) {
    headers['Content-Disposition'] = `attachment; filename="gdjeveceras-checkin-${venue.slug}-v${venue.checkInVersion}.svg"`;
  }
  return new NextResponse(svg, { headers });
}
