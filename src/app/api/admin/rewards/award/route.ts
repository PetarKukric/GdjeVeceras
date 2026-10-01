import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getSession } from '@/lib/auth';
import { awardMonth, monthlyTop } from '@/lib/rewards';
import { monthKey, previousMonthKey } from '@/lib/score';

/**
 * GET  — pregled: trenutni poredak ovog mjeseca i prošlog mjeseca (admin)
 * POST — dodijeli nagrade za prošli mjesec. Može ga pozvati admin iz panela
 *        ili Vercel Cron sa zaglavljem `Authorization: Bearer <CRON_SECRET>` (vercel.json, 1. u mjesecu).
 */
function cronAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get('authorization') || '';
  if (!secret || !header.startsWith('Bearer ')) return false;
  const a = Buffer.from(header.slice(7)), b = Buffer.from(secret);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export async function GET(request: NextRequest) {
  // Vercel Cron šalje GET
  if (cronAuthorized(request)) return NextResponse.json(await awardMonth());
  const session = await getSession();
  if (session?.user.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  const current = monthKey();
  const previous = previousMonthKey(current);
  const [now, last] = await Promise.all([monthlyTop(current), monthlyTop(previous)]);
  return NextResponse.json({ current, previous, standings: now, lastMonth: last });
}

export async function POST(request: NextRequest) {
  if (!cronAuthorized(request)) {
    const session = await getSession();
    if (session?.user.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  return NextResponse.json(await awardMonth());
}
