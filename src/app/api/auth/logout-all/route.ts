import { NextResponse } from 'next/server';
import { getSession, login, revokeSessions } from '@/lib/auth';

/** "Odjavi me sa svih uređaja": poništi sve sesije, ovaj uređaj dobija novu */
export async function POST() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'auth' }, { status: 401 });
  await revokeSessions(session.user.id);
  await login(session.user);
  return NextResponse.json({ ok: true });
}
