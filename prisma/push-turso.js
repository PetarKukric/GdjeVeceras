// Kreira/ažurira šemu baze podataka (radi i sa Turso libsql:// URL-ovima i sa lokalnim file:)
// Koristi isti driver adapter kao aplikacija — zato radi gdje god aplikacija radi.
const { execSync } = require('child_process');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const { PrismaLibSQL } = require('@prisma/adapter-libsql');
const { createClient } = require('@libsql/client');

const url = process.env.DATABASE_URL || '';
const authToken = process.env.DATABASE_AUTH_TOKEN || '';

async function main() {
  const isRemote = url.startsWith('libsql://') || url.startsWith('https://') || url.startsWith('http://');
  console.log('🗄️  Push schema →', isRemote ? 'Turso (remote)' : 'lokalna SQLite baza');
  console.log('    URL:', url.replace(/\/\/[^@/]+@/, '//***@').slice(0, 60));

  // 1. Generiši SQL šemu (offline — ne treba konekcija sa bazom)
  console.log('📝 Generišem SQL šemu...');
  let sql;
  try {
    sql = execSync(
      `npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script`,
      { encoding: 'utf8' }
    );
  } catch (e) {
    console.error('✗ Ne mogu generisati SQL:', e.message);
    process.exit(1);
  }
  if (!sql || !sql.trim()) {
    console.error('✗ Generisan SQL je prazan.');
    process.exit(1);
  }
  console.log('    SQL generisan (' + sql.length + ' znakova).');

  // 2. Klijent sa adapterom (kao u src/lib/prisma.ts)
  let prisma;
  if (isRemote) {
    const libsql = createClient({ url, authToken: authToken || undefined });
    const adapter = new PrismaLibSQL(libsql);
    prisma = new PrismaClient({ adapter: adapter });
  } else {
    prisma = new PrismaClient();
  }

  // 3. Izvrši naredbe — idempotentno (može se pokretati više puta)
  console.log('🚀 Izvršavam naredbe...');
  const statements = sql
    .split(/;\s*\n/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  let ok = 0;
  let skipped = 0;
  for (const stmt of statements) {
    // Idempotencija: IF NOT EXISTS gdje je moguće
    let safe = stmt;
    if (/^CREATE\s+TABLE/i.test(safe)) {
      safe = safe.replace(/^CREATE\s+TABLE/i, 'CREATE TABLE IF NOT EXISTS');
    } else if (/^CREATE\s+UNIQUE\s+INDEX/i.test(safe)) {
      safe = safe.replace(/^CREATE\s+UNIQUE\s+INDEX/i, 'CREATE UNIQUE INDEX IF NOT EXISTS');
    } else if (/^CREATE\s+INDEX/i.test(safe)) {
      safe = safe.replace(/^CREATE\s+INDEX/i, 'CREATE INDEX IF NOT EXISTS');
    }

    try {
      await prisma.$executeRawUnsafe(safe);
      ok++;
    } catch (e) {
      const msg = String(e && e.message || e);
      if (/already exists/i.test(msg)) {
        skipped++;
        continue;
      }
      if (/^PRAGMA/i.test(safe)) {
        continue; // PRAGMA naredbe su nebitne za šemu
      }
      console.error('✗ Naredba nije prošla:', safe.slice(0, 90));
      console.error('  Greška:', msg.slice(0, 200));
      process.exit(1);
    }
  }

  // CREATE TABLE IF NOT EXISTS ne dodaje nova polja postojećim tabelama.
  // Ove aditivne izmjene su bezbjedne za postojeću Turso bazu i ponovljene deploye.
  const additiveMigrations = [
    'ALTER TABLE "Venue" ADD COLUMN "reservationsEnabled" BOOLEAN NOT NULL DEFAULT false',
    'ALTER TABLE "Event" ADD COLUMN "isRecurring" BOOLEAN NOT NULL DEFAULT false',
    'ALTER TABLE "Event" ADD COLUMN "recurrenceType" TEXT',
    'ALTER TABLE "Event" ADD COLUMN "recurrenceDays" TEXT',
    'ALTER TABLE "Event" ADD COLUMN "recurrenceStart" DATETIME',
    'ALTER TABLE "Event" ADD COLUMN "recurrenceEnd" DATETIME',
    'ALTER TABLE "Reservation" ADD COLUMN "occurrenceDate" TEXT',
    'ALTER TABLE "User" ADD COLUMN "restricted" BOOLEAN NOT NULL DEFAULT false',
    'ALTER TABLE "Venue" ADD COLUMN "email" TEXT',
  ];
  for (const migration of additiveMigrations) {
    try {
      await prisma.$executeRawUnsafe(migration);
      ok++;
    } catch (e) {
      const msg = String(e && e.message || e);
      if (/duplicate column name|already exists/i.test(msg)) {
        skipped++;
        continue;
      }
      console.error('✗ Aditivna migracija nije prošla:', migration);
      console.error('  Greška:', msg.slice(0, 200));
      process.exit(1);
    }
  }

  await prisma.$disconnect();
  console.log(`✅ Šema postavljena: ${ok} naredbi izvršeno, ${skipped} već postojalo.`);
}

main().catch((e) => {
  console.error('FATAL:', e);
  process.exit(1);
});
