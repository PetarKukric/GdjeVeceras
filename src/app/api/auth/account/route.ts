import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession, logout } from '@/lib/auth';

/**
 * Brisanje sopstvenog naloga (GDPR).
 * Vlasnici lokala ne mogu obrisati nalog dok su vlasnici — prvo prenos vlasništva.
 */
export async function DELETE(_request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // Blokiraj brisanje ako korisnik posjeduje lokale
    const ownedVenues = await prisma.venue.count({ where: { ownerId: userId } });
    if (ownedVenues > 0) {
      return NextResponse.json(
        { error: 'Posjedujete lokal(e). Prenesite vlasništvo ili nas kontaktirajte prije brisanja naloga.' },
        { status: 400 }
      );
    }

    // Događaji koje je korisnik kreirao — obriši sve povezano pa događaj
    const userEvents = await prisma.event.findMany({ where: { createdById: userId } });
    for (const event of userEvents) {
      await prisma.eventFloorItem.deleteMany({ where: { eventId: event.id } });
      await prisma.eventTableGroup.deleteMany({ where: { eventId: event.id } });
      await prisma.reservation.deleteMany({ where: { eventId: event.id } });
      await prisma.eventFavorite.deleteMany({ where: { eventId: event.id } });
      await prisma.comment.deleteMany({ where: { eventId: event.id } });
      await prisma.report.deleteMany({ where: { eventId: event.id } });
      await prisma.promotion.deleteMany({ where: { eventId: event.id } });
      await prisma.eventLiveMedia.deleteMany({ where: { eventId: event.id } });
      await prisma.event.delete({ where: { id: event.id } });
    }

    // Lični podaci korisnika
    await prisma.eventFavorite.deleteMany({ where: { userId } });
    await prisma.venueFavorite.deleteMany({ where: { userId } });
    await prisma.comment.deleteMany({ where: { userId } });
    await prisma.report.deleteMany({ where: { userId } });
    await prisma.chatReport.deleteMany({ where: { userId } });
    await prisma.globalMessage.deleteMany({ where: { senderId: userId } });
    await prisma.message.deleteMany({ where: { senderUserId: userId } });
    await prisma.notification.deleteMany({ where: { userId } });
    await prisma.eventLiveMedia.deleteMany({ where: { uploadedByUserId: userId } });
    await prisma.promotion.deleteMany({ where: { ownerId: userId } });
    await prisma.block.deleteMany({ where: { OR: [{ blockerId: userId }, { blockedId: userId }] } });

    // Rezervacije korisnika (prvo oslobodi stolove)
    const userReservations = await prisma.reservation.findMany({ where: { userId } });
    for (const r of userReservations) {
      await prisma.eventFloorItem.updateMany({
        where: { reservationId: r.id },
        data: { status: 'AVAILABLE', reservationId: null },
      });
      await prisma.eventTableGroup.updateMany({
        where: { reservationId: r.id },
        data: { reservationId: null },
      });
    }
    await prisma.reservation.deleteMany({ where: { userId } });

    // Razgovori u kojima učestvuje
    const conversations = await prisma.conversation.findMany({
      where: { participants: { some: { userId } } },
      select: { id: true },
    });
    const conversationIds = conversations.map((c) => c.id);
    if (conversationIds.length > 0) {
      await prisma.chatMessage.deleteMany({ where: { conversationId: { in: conversationIds } } });
      await prisma.conversationParticipant.deleteMany({ where: { conversationId: { in: conversationIds } } });
      await prisma.conversation.deleteMany({ where: { id: { in: conversationIds } } });
    }

    // Na kraju — korisnik
    await prisma.user.delete({ where: { id: userId } });

    // Odjava (čisti cookie)
    await logout();

    return NextResponse.json({ message: 'Nalog je uspješno obrisan.' });
  } catch (error) {
    console.error('Delete account error:', error);
    return NextResponse.json({ error: 'Greška pri brisanju naloga.' }, { status: 500 });
  }
}
