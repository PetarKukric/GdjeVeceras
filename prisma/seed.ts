import { PrismaClient, Category, Status, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('password123', 10);

  // Users
  // Admin se prijavljuje preko email-OTP: svaki pokušaj prijave generiše
  // novu nasumičnu lozinku koja se šalje na email (nema trajne lozinke).
  const adminEmail = process.env.ADMIN_EMAIL || 'gdjevecerasbusiness@gmail.com';
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { emailVerified: new Date(), passwordHash: '' },
    create: {
      email: adminEmail,
      name: 'Admin',
      passwordHash: '',
      role: Role.ADMIN,
      emailVerified: new Date(),
    },
  });

  // Demo podaci (lokali, događaji, Marko korisnik) NE stvaraju se po defaultu.
  // Vraćaju se samo eksplicitno: SEED_DEMO=true npm run seed
  if (process.env.NODE_ENV === 'production' || process.env.SEED_DEMO !== 'true') {
    console.log('🌱 Seed: kreiran samo admin nalog (bez demo podataka).');
    console.log(`Admin: ${adminEmail} (prijava preko jednokratne lozinke na email)`);
    console.log('   Za demo podatke pokreni: SEED_DEMO=true npm run seed');
    return;
  }

  // Demo podaci samo u razvoju uz SEED_DEMO=true
  const user1 = await prisma.user.upsert({
    where: { email: 'marko@example.com' },
    update: { emailVerified: new Date() },
    create: {
      email: 'marko@example.com',
      name: 'Marko Marković',
      passwordHash,
      role: Role.USER,
      emailVerified: new Date(),
    },
  });

  // Venues
  const venues = [
    {
      name: 'Club Cristal',
      slug: 'club-cristal',
      description: 'Najpopularniji noćni klub u regiji.',
      address: 'Dositejeva bb',
      city: 'Gradiška',
      latitude: 45.1465,
      longitude: 17.2520,
      imageUrl: '/bg-tonight.jpg',
    },
    {
      name: 'Pub Dva Prijatelja',
      slug: 'pub-dva-prijatelja',
      description: 'Domaća atmosfera, vrhunsko pivo i live svirke.',
      address: 'Vidovdanska 12',
      city: 'Gradiška',
      latitude: 45.1440,
      longitude: 17.2555,
      imageUrl: '/bg-venues.jpg',
    },
    {
      name: 'Garden Bar',
      slug: 'garden-bar',
      description: 'Savršeno mjesto za opuštanje uz koktele.',
      address: 'Savska obala',
      city: 'Gradiška',
      latitude: 45.1425,
      longitude: 17.2510,
      imageUrl: '/bg-weekend.jpg',
    },
  ];

  const createdVenues = await Promise.all(
    venues.map((v) =>
      prisma.venue.upsert({
        where: { slug: v.slug },
        update: {},
        create: v,
      })
    )
  );

  const venueIds = createdVenues.map((v) => v.id);

  // Events
  const now = new Date();
  const events = [
    // Tonight
    {
      title: 'Techno Invasion',
      slug: 'techno-invasion',
      description: 'Vrhunska techno žurka uz regionalne DJ zvijezde.',
      venueId: venueIds[0],
      startDateTime: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 22, 0),
      endDateTime: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 4, 0),
      price: 10,
      category: Category.PARTY,
      status: Status.PUBLISHED,
      featured: true,
      imageUrl: '/events/party-1.jpg',
      createdById: admin.id,
    },
    {
      title: 'Acoustic Rock Night',
      slug: 'acoustic-rock-night',
      description: 'Ex-Yu rock klasici u akustičnom izvođenju.',
      venueId: venueIds[1],
      startDateTime: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 21, 0),
      endDateTime: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 1, 0),
      price: 0,
      category: Category.LIVE_MUSIC,
      status: Status.PUBLISHED,
      imageUrl: '/events/live-1.jpg',
      createdById: admin.id,
    },
    {
      title: 'Neon Disco Party',
      slug: 'neon-disco',
      description: 'Najbolji disco hitovi pod neon svetlima.',
      venueId: venueIds[2],
      startDateTime: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 22, 0),
      endDateTime: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2, 4, 0),
      price: 5,
      category: Category.PARTY,
      status: Status.PUBLISHED,
      imageUrl: '/events/party-2.jpg',
      createdById: admin.id,
    },
    {
      title: 'Jazz Lounge',
      slug: 'jazz-lounge',
      description: 'Opuštajuće veče uz svetske jazz klasike.',
      venueId: venueIds[2],
      startDateTime: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 20, 0),
      endDateTime: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 23, 0),
      price: 0,
      category: Category.LIVE_MUSIC,
      status: Status.PUBLISHED,
      imageUrl: '/events/live-2.jpg',
      createdById: admin.id,
    },
  ];

  for (const event of events) {
    await prisma.event.upsert({
      where: { slug: event.slug },
      update: {
        // Osvježi demo datume da događaji uvijek budu "večeras/sutra"
        startDateTime: event.startDateTime,
        endDateTime: event.endDateTime,
      },
      create: event,
    });
  }

  // POPULARITY SEED
  console.log('Seeding popularity data...');
  const users = await prisma.user.findMany({ take: 5 });
  const allVenues = await prisma.venue.findMany();
  const allEvents = await prisma.event.findMany({ where: { status: Status.PUBLISHED } });

  if (users.length >= 2 && allVenues.length > 0) {
    // Make first venue popular
    const v = allVenues[0];
    for (const u of users) {
      await prisma.venueFavorite.upsert({
        where: { userId_venueId: { userId: u.id, venueId: v.id } },
        create: { userId: u.id, venueId: v.id },
        update: {}
      });
    }
  }

  if (users.length >= 2 && allEvents.length > 0) {
    // Make first event popular
    const e = allEvents[0];
    for (const u of users) {
      await prisma.eventFavorite.upsert({
        where: { userId_eventId: { userId: u.id, eventId: e.id } },
        create: { userId: u.id, eventId: e.id },
        update: {}
      });
    }
  }

  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
