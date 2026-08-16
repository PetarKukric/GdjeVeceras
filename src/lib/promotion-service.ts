import prisma from './prisma';

export async function cleanupExpiredPromotions() {
  try {
    const now = new Date();
    
    // Find all active promotions that should be expired
    const expiredPromotions = await prisma.promotion.findMany({
      where: {
        status: 'ACTIVE',
        endAt: { lt: now }
      }
    });

    for (const promo of expiredPromotions) {
      await prisma.$transaction(async (tx) => {
        await tx.promotion.update({
          where: { id: promo.id },
          data: { status: 'EXPIRED' }
        });

        // Check if there are ANY other active promotions for this venue/event
        if (promo.venueId) {
          const otherActive = await tx.promotion.count({
            where: { venueId: promo.venueId, status: 'ACTIVE', endAt: { gte: now } }
          });
          if (otherActive === 0) {
            await tx.venue.update({ where: { id: promo.venueId }, data: { promoted: false } });
          }
        } else if (promo.eventId) {
          const otherActive = await tx.promotion.count({
            where: { eventId: promo.eventId, status: 'ACTIVE', endAt: { gte: now } }
          });
          if (otherActive === 0) {
            await tx.event.update({ where: { id: promo.eventId }, data: { promoted: false } });
          }
        }
      });
    }
  } catch (error) {
    console.error('Cleanup Expired Promotions Error:', error);
  }
}

export async function sendPromotedEventNotifications(eventId: string, venueId: string) {
  try {
    // 1. Find if there is an active venue promotion
    const activePromotion = await prisma.promotion.findFirst({
      where: {
        venueId,
        type: 'VENUE',
        status: 'ACTIVE',
        endAt: { gte: new Date() }
      }
    });

    if (!activePromotion) return;

    // 2. Get all users to notify (targeting can be added here)
    const users = await prisma.user.findMany({
      select: { id: true }
    });

    // 3. Create notifications/messages
    // To avoid massive overhead in MVP, we use the Notification model which is lighter
    // Or we could use a special System Conversation if it existed.
    // For now, we'll create records in PromotedEventNotification to track sending
    // and then create actual Notifications for the users.

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: { venue: true }
    });

    if (!event) return;

    for (const user of users) {
      try {
        // Check if already notified for this event + promotion
        const existing = await prisma.promotedEventNotification.findUnique({
          where: {
            userId_eventId_promotionId: {
              userId: user.id,
              eventId,
              promotionId: activePromotion.id
            }
          }
        });

        if (existing) continue;

        // Create tracking record
        await prisma.promotedEventNotification.create({
          data: {
            userId: user.id,
            eventId,
            promotionId: activePromotion.id
          }
        });

        // Create system notification
        await prisma.notification.create({
          data: {
            userId: user.id,
            type: 'PROMOTED_EVENT',
            content: `${event.venue.name} ima novi događaj: ${event.title}`,
            eventId: event.id
          }
        });

      } catch (err) {
        console.error(`Failed to notify user ${user.id} about promoted event ${eventId}`, err);
      }
    }

  } catch (error) {
    console.error('Error sending promoted event notifications:', error);
  }
}
