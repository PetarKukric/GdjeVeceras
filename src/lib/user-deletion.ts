import prisma from '@/lib/prisma';
import { deleteUpload } from '@/lib/uploads';

/**
 * Potpuno brisanje korisnika i svih njegovih podataka (GDPR) — koristi ga i "Obriši nalog" i admin.
 * Briše i fajlove koje je korisnik uploadovao (profilna, fotke sa profila, check-in i live fotke),
 * ne samo redove u bazi. Eksplicitno brišemo zavisne redove umjesto da se oslanjamo na ON DELETE
 * CASCADE, jer SQLite/Turso ne mora imati uključene strane ključeve na svakoj konekciji.
 *
 * reassignEventsTo: ako je zadan (admin briše vlasnika), događaji korisnika se prebacuju na tog
 * korisnika umjesto da se brišu — lokal ne gubi program zbog brisanja jednog naloga.
 */
export async function deleteUserCompletely(userId: string, opts: { reassignEventsTo?: string } = {}) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { avatarUrl: true } });
  if (!user) return;

  const [photos, checkInPhotos, liveMedia] = await Promise.all([
    prisma.userPhoto.findMany({ where: { userId }, select: { url: true } }),
    prisma.checkIn.findMany({ where: { userId, photoUrl: { not: null } }, select: { photoUrl: true } }),
    prisma.eventLiveMedia.findMany({ where: { uploadedByUserId: userId }, select: { mediaUrl: true, thumbnailUrl: true } }),
  ]);

  if (opts.reassignEventsTo) {
    await prisma.event.updateMany({ where: { createdById: userId }, data: { createdById: opts.reassignEventsTo } });
    await prisma.venue.updateMany({ where: { ownerId: userId }, data: { ownerId: null } });
  } else {
    const events = await prisma.event.findMany({ where: { createdById: userId }, select: { id: true } });
    const eventIds = events.map((e) => e.id);
    if (eventIds.length) {
      await prisma.$transaction([
        prisma.eventFloorItem.deleteMany({ where: { eventId: { in: eventIds } } }),
        prisma.eventTableGroup.deleteMany({ where: { eventId: { in: eventIds } } }),
        prisma.reservation.deleteMany({ where: { eventId: { in: eventIds } } }),
        prisma.eventFavorite.deleteMany({ where: { eventId: { in: eventIds } } }),
        prisma.comment.deleteMany({ where: { eventId: { in: eventIds } } }),
        prisma.report.deleteMany({ where: { eventId: { in: eventIds } } }),
        prisma.eventLiveMedia.deleteMany({ where: { eventId: { in: eventIds } } }),
        prisma.checkIn.updateMany({ where: { eventId: { in: eventIds } }, data: { eventId: null } }),
        prisma.event.deleteMany({ where: { id: { in: eventIds } } }),
      ]);
    }
  }

  const conversations = await prisma.conversation.findMany({ where: { participants: { some: { userId } } }, select: { id: true } });
  const conversationIds = conversations.map((c) => c.id);

  await prisma.$transaction([
    prisma.eventFavorite.deleteMany({ where: { userId } }),
    prisma.venueFavorite.deleteMany({ where: { userId } }),
    prisma.comment.deleteMany({ where: { userId } }),
    prisma.report.deleteMany({ where: { userId } }),
    prisma.chatReport.deleteMany({ where: { userId } }),
    prisma.globalMessage.deleteMany({ where: { senderId: userId } }),
    prisma.notification.deleteMany({ where: { userId } }),
    prisma.message.deleteMany({ where: { senderUserId: userId } }),
    prisma.eventLiveMedia.deleteMany({ where: { uploadedByUserId: userId } }),
    prisma.block.deleteMany({ where: { OR: [{ blockerId: userId }, { blockedId: userId }] } }),
    prisma.eventFloorItem.updateMany({ where: { reservation: { userId } }, data: { status: 'AVAILABLE', reservationId: null } }),
    prisma.eventTableGroup.updateMany({ where: { reservation: { userId } }, data: { reservationId: null } }),
    prisma.reservation.deleteMany({ where: { userId } }),
    prisma.checkIn.deleteMany({ where: { userId } }),
    prisma.redemption.deleteMany({ where: { userId } }),
    prisma.follow.deleteMany({ where: { OR: [{ followerId: userId }, { followingId: userId }] } }),
    prisma.userPhoto.deleteMany({ where: { userId } }),
    prisma.chatMessage.deleteMany({ where: { conversationId: { in: conversationIds } } }),
    prisma.conversationParticipant.deleteMany({ where: { conversationId: { in: conversationIds } } }),
    prisma.conversation.deleteMany({ where: { id: { in: conversationIds } } }),
    prisma.user.delete({ where: { id: userId } }),
  ]);

  // Fajlovi tek nakon što su redovi uspješno obrisani (deleteUpload ignoriše greške i vanjske URL-ove)
  const files = [
    user.avatarUrl,
    ...photos.map((p) => p.url),
    ...checkInPhotos.map((c) => c.photoUrl),
    ...liveMedia.flatMap((m) => [m.mediaUrl, m.thumbnailUrl]),
  ].filter((url): url is string => Boolean(url) && !url!.includes('googleusercontent.com'));
  await Promise.all(files.map((url) => deleteUpload(url)));
}
