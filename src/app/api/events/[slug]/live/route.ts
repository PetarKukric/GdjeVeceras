import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { saveUpload, deleteUpload } from '@/lib/uploads';
import crypto from 'crypto';
import { isEventLive, archiveEventLiveMedia, sendLiveUpdateNotifications } from '@/lib/live-service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const event = await prisma.event.findUnique({
      where: { slug },
      include: {
        liveMedia: {
          orderBy: { createdAt: 'desc' },
          include: { uploadedBy: { select: { name: true } } }
        }
      }
    });

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Check if event is finished and archive if not already done
    const now = new Date();
    if (event.endDateTime < now) {
        // Archive in background (or wait for it)
        await archiveEventLiveMedia(event.id);
    }

    return NextResponse.json(event.liveMedia);
  } catch (error) {
    console.error('Live Media GET Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await getSession();
    const { slug } = await params;

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const event = await prisma.event.findUnique({
      where: { slug },
      include: { venue: true }
    });

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Authorization
    const isOwner = event.venue.ownerId === session.user.id;
    const isAdmin = session.user.role === 'ADMIN';

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Timing
    if (!isEventLive(event.startDateTime, event.endDateTime)) {
        if (event.startDateTime > new Date()) {
            return NextResponse.json({ error: 'Događaj još nije počeo.' }, { status: 400 });
        } else {
            return NextResponse.json({ error: 'Događaj je završen.' }, { status: 400 });
        }
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const caption = formData.get('caption') as string;

    if (!file) {
      return NextResponse.json({ error: 'Nema fajla.' }, { status: 400 });
    }

    // Validation
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');

    if (!isImage && !isVideo) {
      return NextResponse.json({ error: 'Dozvoljene su samo slike i video snimci.' }, { status: 400 });
    }

    if (isImage && file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'Slika je prevelika (maks 10MB).' }, { status: 400 });
    }

    if (isVideo && file.size > 100 * 1024 * 1024) {
      return NextResponse.json({ error: 'Video je prevelik (maks 100MB).' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const filename = `${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const mediaUrl = await saveUpload(
      `live/${event.id}/${filename}`,
      buffer,
      file.type
    );

    const liveMedia = await prisma.eventLiveMedia.create({
      data: {
        eventId: event.id,
        venueId: event.venueId,
        uploadedByUserId: session.user.id,
        type: isVideo ? 'VIDEO' : 'IMAGE',
        mediaUrl,
        caption: caption || null,
      },
    });

    // Send notifications to users who saved this event or venue
    await sendLiveUpdateNotifications(event.id, event.venueId, session.user.id, liveMedia.type);

    return NextResponse.json(liveMedia, { status: 201 });

  } catch (error) {
    console.error('Live Media POST Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await getSession();
    const { slug } = await params;
    const { searchParams } = new URL(request.url);
    const mediaId = searchParams.get('mediaId');

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!mediaId) {
      return NextResponse.json({ error: 'Media ID is required' }, { status: 400 });
    }

    const event = await prisma.event.findUnique({
      where: { slug },
      include: { venue: true }
    });

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    const media = await prisma.eventLiveMedia.findUnique({
      where: { id: mediaId }
    });

    if (!media) {
      return NextResponse.json({ error: 'Media not found' }, { status: 404 });
    }

    // Auth check
    if (event.venue.ownerId !== session.user.id && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // If it was already archived, we should also delete from VenueImage?
    // Actually, the user says: "Ako ga izbriše nakon eventa iz galerije: -> ukloni odgovarajuću gallery/media referencu i storage file"
    // If we are deleting from the LIVE API, it might be while event is live or after.
    
    // Clean up file
    await deleteUpload(media.mediaUrl);

    // Delete from both places if archived
    await prisma.$transaction([
      prisma.venueImage.deleteMany({
        where: { imageUrl: media.mediaUrl, venueId: event.venueId }
      }),
      prisma.eventLiveMedia.delete({
        where: { id: mediaId }
      })
    ]);

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Live Media DELETE Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
