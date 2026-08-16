import { NextRequest, NextResponse } from 'next/server';

/**
 * Javna PayPal konfiguracija za SDK (klijentska dugmad).
 * Client ID je javan po prirodi — secret nikad ne izlazi iz servera.
 */
export async function GET(_request: NextRequest) {
  const raw = (process.env.PAYPAL_CLIENT_ID || '').trim();
  const environment = process.env.PAYPAL_ENVIRONMENT === 'live' ? 'live' : 'sandbox';

  if (!raw) {
    return NextResponse.json({
      ready: false,
      environment,
      clientId: '',
      hint: 'missing',
    });
  }

  // PayPal client ID je dugačak base64url niz (počinje sa "A" ili "B")
  const looksValid = /^[A-Za-z0-9_-]{40,}$/.test(raw);
  if (!looksValid) {
    return NextResponse.json({
      ready: false,
      environment,
      clientId: '',
      hint: 'invalid_format',
    });
  }

  console.log(`💳 PayPal SDK konfiguracija: environment=${environment} (client ID: ${raw.slice(0, 6)}...)`);
  return NextResponse.json({ ready: true, environment, clientId: raw, hint: '' });
}
