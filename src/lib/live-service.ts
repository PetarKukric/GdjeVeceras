import prisma from './prisma';
import { MediaType } from '@prisma/client';

export const LIVE_NOTIFICATION_COOLDOWN = 15 * 60 * 1000; // 15 minutes

export async function archiveEventLiveMedia(eventId: string) {
  try {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        liveMedia: {
          where: { archivedToGallery: false }
        }
      }
    });

    if (!event || event.liveMedia.length === 0) return;

    // Move to VenueImage
    await prisma.$transaction(async (tx) => {
      for (const media of event.liveMedia) {
        await tx.venueImage.create({
          data: {
            venueId: event.venueId,
            imageUrl: media.mediaUrl,
            type: media.type,
            eventId: event.id,
            displayOrder: 0
          }
        });

        await tx.eventLiveMedia.update({
          where: { id: media.id },
          data: { archivedToGallery: true }
        });
      }
    });

    console.log(`Archived ${event.liveMedia.length} media items for event ${eventId} to venue gallery.`);
  } catch (error) {
    console.error('Archive Event Live Media Error:', error);
  }
}

export function isEventLive(startDateTime: Date, endDateTime: Date) {
  const now = new Date();
  return now >= startDateTime && now <= endDateTime;
}

export async function checkAndArchiveFinishedEvents() {
  try {
    const now = new Date();
    const finishedEvents = await prisma.event.findMany({
      where: {
        endDateTime: { lt: now },
        liveMedia: {
          some: { archivedToGallery: false }
        }
      }
    });

    for (const event of finishedEvents) {
      await archiveEventLiveMedia(event.id);
    }
  } catch (error) {
    console.error('Check and Archive Error:', error);
  }
}

export async function sendLiveUpdateNotifications(eventId: string, venueId: string, uploadedByUserId: string, mediaType: MediaType) {
  try {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: { venue: true }
    });

    if (!event) return;

    // 1. Find all interested users (saved event OR saved venue)
    // Excluding the owner/uploader
    const interestedUsers = await prisma.user.findMany({
      where: {
        id: { not: uploadedByUserId },
        OR: [
          { eventFavorites: { some: { eventId } } },
          { venueFavorites: { some: { venueId } } }
        ]
      },
      select: { id: true }
    });

    if (interestedUsers.length === 0) return;

    const now = new Date();
    const cooldownDate = new Date(now.getTime() - LIVE_NOTIFICATION_COOLDOWN);

    for (const user of interestedUsers) {
      try {
        // 2. Check for existing notification in cooldown period
        const existing = await prisma.notification.findFirst({
          where: {
            userId: user.id,
            eventId: event.id,
            type: 'EVENT_LIVE_UPDATE',
            createdAt: { gte: cooldownDate }
          },
          orderBy: { createdAt: 'desc' }
        });

        if (existing) {
          // Update content if needed or just skip to avoid spam
          // We can count how many updates happened in this window
          const updateCount = await prisma.eventLiveMedia.count({
            where: {
              eventId: event.id,
              createdAt: { gte: cooldownDate }
            }
          });

          await prisma.notification.update({
            where: { id: existing.id },
            data: {
              content: `${event.title}: ${event.venue.name} ima ${updateCount} novih LIVE objava.`,
              isRead: false,
              createdAt: now
            }
          });
        } else {
          // 3. Create new notification
          const mediaLabel = mediaType === 'VIDEO' ? 'video snimak' : 'fotografiju';
          await prisma.notification.create({
            data: {
              userId: user.id,
              eventId: event.id,
              type: 'EVENT_LIVE_UPDATE',
              content: `NOVO UŽIVO: ${event.title}. ${event.venue.name} je upravo objavio novu ${mediaLabel} sa događaja.`
            }
          });
        }
      } catch (err) {
        console.error(`Failed to notify user ${user.id} about live update for event ${eventId}`, err);
      }
    }
  } catch (error) {
    console.error('Error sending live update notifications:', error);
  }
}
