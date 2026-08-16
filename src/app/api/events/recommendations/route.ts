import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getPersonalizedRecommendations } from '@/lib/recommendation-service';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '4');

    if (!session) {
      // For non-logged in users, we could return featured/popular, 
      // but the prompt says: "Ako korisnik nije prijavljen: NE prikazuj personalizovanu sekciju"
      // So we'll return an empty list or 401. 
      // Actually, returning empty is better for the UI to just hide the section.
      return NextResponse.json({ events: [], message: 'Not logged in' });
    }

    const recommendations = await getPersonalizedRecommendations(session.user.id, limit);

    return NextResponse.json({
      events: recommendations,
      isPersonalized: true
    });
  } catch (error) {
    console.error('Recommendations API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
