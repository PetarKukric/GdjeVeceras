-- CreateTable
CREATE TABLE "UserPhoto" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "caption" TEXT,
    "venueId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserPhoto_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UserPhoto_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "restricted" BOOLEAN NOT NULL DEFAULT false,
    "emailVerified" DATETIME,
    "verificationToken" TEXT,
    "tokenExpires" DATETIME,
    "lastResentAt" DATETIME,
    "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
    "loginLockoutUntil" DATETIME,
    "adminLoginResentAt" DATETIME,
    "adminPasswordExpiresAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 0,
    "totalPoints" INTEGER NOT NULL DEFAULT 0,
    "googleId" TEXT,
    "bio" TEXT,
    "showCheckIns" BOOLEAN NOT NULL DEFAULT true
);
INSERT INTO "new_User" ("adminLoginResentAt", "adminPasswordExpiresAt", "avatarUrl", "createdAt", "email", "emailVerified", "failedLoginAttempts", "id", "lastResentAt", "loginLockoutUntil", "name", "passwordHash", "points", "restricted", "role", "tokenExpires", "totalPoints", "updatedAt", "verificationToken") SELECT "adminLoginResentAt", "adminPasswordExpiresAt", "avatarUrl", "createdAt", "email", "emailVerified", "failedLoginAttempts", "id", "lastResentAt", "loginLockoutUntil", "name", "passwordHash", "points", "restricted", "role", "tokenExpires", "totalPoints", "updatedAt", "verificationToken" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_verificationToken_key" ON "User"("verificationToken");
CREATE UNIQUE INDEX "User_googleId_key" ON "User"("googleId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "UserPhoto_userId_createdAt_idx" ON "UserPhoto"("userId", "createdAt");

