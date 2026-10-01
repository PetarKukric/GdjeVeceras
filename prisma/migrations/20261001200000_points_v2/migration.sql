-- CreateTable
CREATE TABLE "ReceiptClaim" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "venueId" TEXT NOT NULL,
    "checkInId" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "photoUrl" TEXT NOT NULL,
    "qrData" TEXT,
    "qrHash" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "points" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReceiptClaim_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ReceiptClaim_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ReceiptClaim_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ReceiptClaim_checkInId_fkey" FOREIGN KEY ("checkInId") REFERENCES "CheckIn" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MonthlyAward" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "month" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "points" INTEGER NOT NULL,
    "rewardId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "redemptionId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MonthlyAward_rewardId_fkey" FOREIGN KEY ("rewardId") REFERENCES "Reward" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MonthlyAward_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Venue" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "latitude" REAL,
    "longitude" REAL,
    "phone" TEXT,
    "website" TEXT,
    "instagramUrl" TEXT,
    "facebookUrl" TEXT,
    "tiktokUrl" TEXT,
    "email" TEXT,
    "reservationsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "imageUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "ownerId" TEXT,
    "isPartner" BOOLEAN NOT NULL DEFAULT false,
    "checkInPoints" INTEGER NOT NULL DEFAULT 100,
    "checkInVersion" INTEGER NOT NULL DEFAULT 1,
    "boostedUntil" DATETIME,
    "receiptBoostEnabled" BOOLEAN NOT NULL DEFAULT false,
    "receiptMinAmount" REAL NOT NULL DEFAULT 120,
    "receiptBonusPoints" INTEGER NOT NULL DEFAULT 30,
    CONSTRAINT "Venue_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Venue" ("address", "checkInPoints", "checkInVersion", "city", "createdAt", "description", "email", "facebookUrl", "id", "imageUrl", "instagramUrl", "isPartner", "latitude", "longitude", "name", "ownerId", "phone", "reservationsEnabled", "slug", "tiktokUrl", "updatedAt", "website") SELECT "address", "checkInPoints", "checkInVersion", "city", "createdAt", "description", "email", "facebookUrl", "id", "imageUrl", "instagramUrl", "isPartner", "latitude", "longitude", "name", "ownerId", "phone", "reservationsEnabled", "slug", "tiktokUrl", "updatedAt", "website" FROM "Venue";
DROP TABLE "Venue";
ALTER TABLE "new_Venue" RENAME TO "Venue";
CREATE UNIQUE INDEX "Venue_slug_key" ON "Venue"("slug");
CREATE TABLE "new_Reward" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "titleEn" TEXT,
    "description" TEXT,
    "descriptionEn" TEXT,
    "kind" TEXT NOT NULL DEFAULT 'DRINK',
    "cost" INTEGER NOT NULL,
    "imageUrl" TEXT,
    "stock" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "venueId" TEXT,
    "provider" TEXT,
    "type" TEXT NOT NULL DEFAULT 'REDEEM',
    "topRank" INTEGER,
    "month" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Reward_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Reward" ("active", "cost", "createdAt", "description", "descriptionEn", "id", "imageUrl", "kind", "stock", "title", "titleEn", "updatedAt", "venueId") SELECT "active", "cost", "createdAt", "description", "descriptionEn", "id", "imageUrl", "kind", "stock", "title", "titleEn", "updatedAt", "venueId" FROM "Reward";
DROP TABLE "Reward";
ALTER TABLE "new_Reward" RENAME TO "Reward";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "ReceiptClaim_checkInId_key" ON "ReceiptClaim"("checkInId");

-- CreateIndex
CREATE UNIQUE INDEX "ReceiptClaim_qrHash_key" ON "ReceiptClaim"("qrHash");

-- CreateIndex
CREATE INDEX "ReceiptClaim_status_createdAt_idx" ON "ReceiptClaim"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "MonthlyAward_month_rank_key" ON "MonthlyAward"("month", "rank");

