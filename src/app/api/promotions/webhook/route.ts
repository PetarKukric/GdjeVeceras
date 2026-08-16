import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyPayPalWebhook } from '@/lib/paypal';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const headers = {
      'paypal-auth-algo': request.headers.get('paypal-auth-algo'),
      'paypal-cert-url': request.headers.get('paypal-cert-url'),
      'paypal-transmission-id': request.headers.get('paypal-transmission-id'),
      'paypal-transmission-sig': request.headers.get('paypal-transmission-sig'),
      'paypal-transmission-time': request.headers.get('paypal-transmission-time'),
    };

    // Verify webhook
    const isValid = await verifyPayPalWebhook(headers, body);
    if (!isValid) {
      console.warn('Invalid PayPal Webhook received');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    const eventType = body.event_type;

    if (eventType === 'PAYMENT.CAPTURE.COMPLETED') {
      const orderId = body.resource.supplementary_data?.related_ids?.order_id || body.resource.parent_payment; // Depending on API version
      // Or find by reference_id if available in body.resource.custom_id
      
      const captureId = body.resource.id;
      
      // Fallback: search by captureId or orderId
      const promotion = await prisma.promotion.findFirst({
        where: {
          OR: [
            { paypalOrderId: orderId },
            { paypalCaptureId: captureId }
          ]
        }
      });

      if (promotion && promotion.status !== 'ACTIVE') {
        const startAt = new Date();
        const endAt = new Date();
        endAt.setDate(startAt.getDate() + promotion.durationDays);

        await prisma.promotion.update({
          where: { id: promotion.id },
          data: {
            status: 'ACTIVE',
            paypalCaptureId: captureId,
            startAt,
            endAt,
          }
        });
      }
    }

    return NextResponse.json({ received: true });

  } catch (error) {
    console.error('PayPal Webhook Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
