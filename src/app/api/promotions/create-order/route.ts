import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { createPayPalOrder } from '@/lib/paypal';
import { getPlanById, CURRENCY } from '@/lib/promotion-config';

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || (session.user.role !== 'OWNER' && session.user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { planId, type, venueId, eventId, simulate } = await request.json();

    if (!planId || !type || (!venueId && !eventId)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const plan = getPlanById(planId);
    if (!plan) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
    }

    // Verify ownership
    if (type === 'VENUE' && venueId) {
      const venue = await prisma.venue.findUnique({ where: { id: venueId } });
      if (!venue || (venue.ownerId !== session.user.id && session.user.role !== 'ADMIN')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    } else if (type === 'EVENT' && eventId) {
      const event = await prisma.event.findUnique({ where: { id: eventId }, include: { venue: true } });
      if (!event || (event.venue.ownerId !== session.user.id && session.user.role !== 'ADMIN')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    // Create Promotion Record (PENDING_PAYMENT)
    const promotion = await prisma.promotion.create({
      data: {
        ownerId: session.user.id,
        venueId: type === 'VENUE' ? venueId : null,
        eventId: type === 'EVENT' ? eventId : null,
        type: type as any,
        status: 'PENDING_PAYMENT',
        price: plan.price,
        currency: CURRENCY,
        durationDays: plan.durationDays,
      }
    });

    // Create PayPal Order (ili simulator ako se eksplicitno traži)
    let order;
    if (simulate) {
      order = { id: `SIM-${Date.now()}`, status: 'CREATED' };
    } else {
      order = await createPayPalOrder(plan.price, CURRENCY, promotion.id);
    }

    if (!order || !order.id) {
      console.error('PayPal Order ID missing:', order);
      return NextResponse.json({ error: 'PayPal service unavailable' }, { status: 502 });
    }

    // Update promotion with order ID
    await prisma.promotion.update({
      where: { id: promotion.id },
      data: { paypalOrderId: order.id }
    });

    return NextResponse.json({ orderId: order.id, promotionId: promotion.id });

  } catch (error) {
    console.error('Promotion Create Order Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
