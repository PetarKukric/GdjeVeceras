import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { getPersonalizedRecommendations } from '@/lib/recommendation-service';
import { expandRecurringEvents, toExceptionMap } from '@/lib/recurrence';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '4');

    if (!session) {
      // Za neprijavljene korisnike vraćamo popularne događaje,
      // but the prompt says: "Ako korisnik nije prijavljen: NE prikazuj personalizovanu sekciju"
      // So we'll return an empty list or 401. 
      // Actually, returning empty is better for the UI to just hide the section.
      return NextResponse.json({ events: [], message: 'Not logged in' });
    }

    const recommendations: any[] = await getPersonalizedRecommendations(session.user.id, limit);

    // ===== Ponavljajući događaji: termini učestvuju u preporukama (bounded 30 dana) =====
    // Virtualni termin NIJE novi događaj → nikakve nove notifikacije.
    if (recommendations.length < limit) {
      const inList = new Set(recommendations.map((e: any) => e.id));
      const favIds = new Set(
        (await prisma.eventFavorite.findMany({ where: { userId: session.user.id }, select: { eventId: true } }))
          .map((f: any) => f.eventId)
      );
      const parents = await prisma.event.findMany({
        where: { status: 'PUBLISHED', isRecurring: true },
        include: { venue: true, occurrenceExceptions: true, _count: { select: { favorites: true } } },
        take: 100,
      });
      const exByParent: Record<string, any> = {};
      for (const p of parents) {
        exByParent[p.id] = toExceptionMap(p.occurrenceExceptions as any);
        delete (p as any).occurrenceExceptions;
      }
      const occurrences = expandRecurringEvents(parents as any, new Date(), new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), exByParent)
        .filter((o: any) => !inList.has(o.parentEventId) && !favIds.has(o.parentEventId))
        .sort((a: any, b: any) => (b._count?.favorites || 0) - (a._count?.favorites || 0));
      for (const occ of occurrences) {
        if (recommendations.length >= limit) break;
        occ.recommendationReason = 'Redovno se dešava u tvom gradu';
        recommendations.push(occ);
      }
    }

    return NextResponse.json({
      events: recommendations,
      isPersonalized: true
    });
  } catch (error) {
    console.error('Recommendations API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
