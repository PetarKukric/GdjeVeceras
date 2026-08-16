import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { isValidEmail, normalizeEmail } from '@/lib/validation';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, subject, message, venueId } = body;
    const session = await getSession();

    // 1. Validation
    if (!name || !email || !subject || !message) {
      return NextResponse.json({ error: 'Sva polja su obavezna.' }, { status: 400 });
    }

    if (!isValidEmail(normalizeEmail(email))) {
      return NextResponse.json({ error: 'Unesite ispravnu email adresu.' }, { status: 400 });
    }

    if (message.length < 5) {
      return NextResponse.json({ error: 'Poruka je prekratka.' }, { status: 400 });
    }

    // 2. Security Check for senderUserId (to prevent P2003 if session is stale)
    let validSenderId = null;
    if (session?.user?.id) {
      const userExists = await prisma.user.findUnique({ where: { id: session.user.id } });
      if (userExists) validSenderId = session.user.id;
    }

    // 3. Find Venue and Owner (if venueId provided)
    let venue = null;
    if (venueId) {
      venue = await prisma.venue.findUnique({
        where: { id: venueId },
        include: { owner: true }
      });
    }

    // 4. Create Message
    const newMessage = await prisma.message.create({
      data: {
        senderName: name,
        senderEmail: normalizeEmail(email),
        senderUserId: validSenderId,
        subject,
        message,
        venueId: venueId || null,
      }
    });

    // 5. Create Notifications
    const recipients: string[] = [];

    // Find all admins
    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN' },
      select: { id: true }
    });
    admins.forEach(admin => recipients.push(admin.id));

    // Add Venue Owner if they exist and are not already an admin
    if (venue && venue.ownerId && !recipients.includes(venue.ownerId)) {
      recipients.push(venue.ownerId);
    }

    // Create notifications in bulk
    if (recipients.length > 0) {
      const notificationContent = venue 
        ? `Nova poruka za ${venue.name}: ${subject}`
        : `Opšti upit od ${name}: ${subject}`;

      await prisma.notification.createMany({
        data: recipients.map(userId => ({
          userId,
          messageId: newMessage.id,
          type: 'NEW_MESSAGE',
          content: notificationContent,
        }))
      });
    }

    return NextResponse.json({ message: 'Poruka je uspješno poslana.' }, { status: 201 });

  } catch (error) {
    console.error('Contact API Error:', error);
    return NextResponse.json({ error: 'Došlo je do greške na serveru.' }, { status: 500 });
  }
}
