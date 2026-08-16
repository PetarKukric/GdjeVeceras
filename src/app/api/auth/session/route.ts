import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getSession();
    console.log('Session API: Current session:', session);
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    return NextResponse.json(session);
  } catch (error) {
    console.error('Session API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
