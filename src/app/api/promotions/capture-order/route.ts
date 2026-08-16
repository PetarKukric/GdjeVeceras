import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { capturePayPalOrder } from '@/lib/paypal';

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { orderId } = await request.json();

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }

    // Capture PayPal Payment
    const captureData = await capturePayPalOrder(orderId);

    if (captureData.status === 'COMPLETED') {
      const captureId = captureData.purchase_units[0].payments.captures[0].id;

      // Find promotion by order ID
      const promotion = await prisma.promotion.findUnique({
        where: { paypalOrderId: orderId }
      });

      if (!promotion) {
        return NextResponse.json({ error: 'Promotion not found' }, { status: 404 });
      }

      if (promotion.status === 'ACTIVE') {
        return NextResponse.json({ success: true, message: 'Already activated' });
      }

      // Activate Promotion
      const startAt = new Date();
      const endAt = new Date();
      endAt.setDate(startAt.getDate() + promotion.durationDays);

      await prisma.$transaction(async (tx) => {
        await tx.promotion.update({
          where: { id: promotion.id },
          data: {
            status: 'ACTIVE',
            paypalCaptureId: captureId,
            startAt,
            endAt,
          }
        });

        if (promotion.venueId) {
          await tx.venue.update({
            where: { id: promotion.venueId },
            data: { promoted: true }
          });
        } else if (promotion.eventId) {
          await tx.event.update({
            where: { id: promotion.eventId },
            data: { promoted: true }
          });
        }
      });

      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ error: 'Payment not completed', status: captureData.status }, { status: 400 });
    }

  } catch (error) {
    console.error('Promotion Capture Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
