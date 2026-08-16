const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET;
const PAYPAL_API_BASE = process.env.PAYPAL_ENVIRONMENT === 'live' 
  ? 'https://api-m.paypal.com' 
  : 'https://api-m.sandbox.paypal.com';

async function getAccessToken() {
  if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
    throw new Error('PayPal credentials missing');
  }
  const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString('base64');
  const response = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: 'POST',
    body: 'grant_type=client_credentials',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });

  const data = await response.json();
  return data.access_token;
}

export async function createPayPalOrder(amount: number, currency: string, referenceId: string) {
  try {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      throw new Error('No access token (provjeri PAYPAL_CLIENT_ID i PAYPAL_CLIENT_SECRET u .env)');
    }
    const response = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [
          {
            reference_id: referenceId,
            amount: {
              currency_code: currency,
              value: amount.toFixed(2),
            },
          },
        ],
      }),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    if (process.env.PAYPAL_ENVIRONMENT !== 'live') {
      console.warn('💳 PayPal API nije dostupan — korišten SIMULATOR.');
      console.warn('   Uzrok (najčešće): pogrešan PAYPAL_CLIENT_ID/SECRET ili ključevi ne pripadaju ovom environmentu (sandbox vs live).');
      console.warn('   Detalji:', error instanceof Error ? error.message : error);
      return { id: `SIM-${Date.now()}`, status: 'CREATED' };
    }
    throw error;
  }
}

export async function capturePayPalOrder(orderId: string) {
  try {
    if (orderId.startsWith('SIM-')) {
       return { 
         status: 'COMPLETED', 
         purchase_units: [{ payments: { captures: [{ id: `CAP-${Date.now()}` }] } }] 
       };
    }
    const accessToken = await getAccessToken();
    const response = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders/${orderId}/capture`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    return data;
  } catch (error) {
    if (process.env.PAYPAL_ENVIRONMENT !== 'live' && orderId.startsWith('SIM-')) {
        return { 
          status: 'COMPLETED', 
          purchase_units: [{ payments: { captures: [{ id: `CAP-${Date.now()}` }] } }] 
        };
    }
    throw error;
  }
}

export async function verifyPayPalWebhook(headers: any, body: any) {
  // Implementation of webhook signature verification
  // For sandbox/MVP, we might skip full verification if it's too complex to implement from scratch without sdk
  // but it's better to at least check if we can reach PayPal to verify.
  const accessToken = await getAccessToken();
  const response = await fetch(`${PAYPAL_API_BASE}/v1/notifications/verify-webhook-signature`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      auth_algo: headers['paypal-auth-algo'],
      cert_url: headers['paypal-cert-url'],
      transmission_id: headers['paypal-transmission-id'],
      transmission_sig: headers['paypal-transmission-sig'],
      transmission_time: headers['paypal-transmission-time'],
      webhook_id: process.env.PAYPAL_WEBHOOK_ID,
      webhook_event: body,
    }),
  });

  const data = await response.json();
  return data.verification_status === 'SUCCESS';
}
