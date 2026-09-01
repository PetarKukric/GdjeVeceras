import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { saveUpload, deleteUpload } from '@/lib/uploads';
import { detectMedia, mediaMatchesDeclaredType } from '@/lib/media-validation';
import crypto from 'crypto';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await getSession();
    const { slug: venueId } = await params;

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const venue = await prisma.venue.findUnique({
      where: { id: venueId },
    });

    if (!venue) {
      return NextResponse.json({ error: 'Venue not found' }, { status: 404 });
    }

    // Check ownership
    if (venue.ownerId !== session.user.id && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const allowedMimeTypes = new Set([
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'video/mp4', 'video/quicktime', 'video/webm',
    ]);
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');

    if ((!isImage && !isVideo) || !allowedMimeTypes.has(file.type)) {
      return NextResponse.json({ error: 'Dozvoljeni formati su slike i video snimci.' }, { status: 400 });
    }

    if (isImage && file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'Slika je prevelika (maks 10MB).' }, { status: 400 });
    }

    if (isVideo && file.size > 100 * 1024 * 1024) {
      return NextResponse.json({ error: 'Video je prevelik (maks 100MB).' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const detected = detectMedia(buffer);

    if (!detected || !mediaMatchesDeclaredType(detected, file.type)) {
      return NextResponse.json({ error: 'Sadržaj fajla ne odgovara dozvoljenom formatu.' }, { status: 400 });
    }

    const filename = `${crypto.randomUUID()}.${detected.ext}`;
    const imageUrl = await saveUpload(
      `venues/${venueId}/${filename}`,
      buffer,
      detected.mime
    );

    const venueImage = await prisma.venueImage.create({
      data: {
        venueId,
        imageUrl,
        type: detected.kind,
        displayOrder: 0,
      },
    });

    return NextResponse.json(venueImage, { status: 201 });

  } catch (error) {
    console.error('Gallery POST Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await getSession();
    const { slug: venueId } = await params;
    const { searchParams } = new URL(request.url);
    const imageId = searchParams.get('imageId');

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!imageId) {
      return NextResponse.json({ error: 'Image ID is required' }, { status: 400 });
    }

    const venue = await prisma.venue.findUnique({
      where: { id: venueId },
    });

    if (!venue) {
      return NextResponse.json({ error: 'Venue not found' }, { status: 404 });
    }

    // Check ownership
    if (venue.ownerId !== session.user.id && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const image = await prisma.venueImage.findUnique({
      where: { id: imageId },
    });

    if (!image) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }

    // Delete file (Blob u produkciji, disk lokalno)
    await deleteUpload(image.imageUrl);

    // Delete from both places
    await prisma.$transaction([
      prisma.eventLiveMedia.deleteMany({
        where: { mediaUrl: image.imageUrl, venueId: venue.id }
      }),
      prisma.venueImage.delete({
        where: { id: imageId },
      })
    ]);

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Gallery DELETE Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await getSession();
    const { slug: venueId } = await params;
    const { action, imageUrl } = await request.json();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const venue = await prisma.venue.findUnique({
      where: { id: venueId },
    });

    if (!venue) {
      return NextResponse.json({ error: 'Venue not found' }, { status: 404 });
    }

    // Check ownership
    if (venue.ownerId !== session.user.id && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (action === 'setCover') {
      if (!imageUrl) return NextResponse.json({ error: 'Image URL required' }, { status: 400 });

      await prisma.venue.update({
        where: { id: venueId },
        data: { imageUrl },
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('Gallery PATCH Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
