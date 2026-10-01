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
    "showCheckIns" BOOLEAN NOT NULL DEFAULT true,
    "sessionVersion" INTEGER NOT NULL DEFAULT 0
);
INSERT INTO "new_User" ("adminLoginResentAt", "adminPasswordExpiresAt", "avatarUrl", "bio", "createdAt", "email", "emailVerified", "failedLoginAttempts", "googleId", "id", "lastResentAt", "loginLockoutUntil", "name", "passwordHash", "points", "restricted", "role", "showCheckIns", "tokenExpires", "totalPoints", "updatedAt", "verificationToken") SELECT "adminLoginResentAt", "adminPasswordExpiresAt", "avatarUrl", "bio", "createdAt", "email", "emailVerified", "failedLoginAttempts", "googleId", "id", "lastResentAt", "loginLockoutUntil", "name", "passwordHash", "points", "restricted", "role", "showCheckIns", "tokenExpires", "totalPoints", "updatedAt", "verificationToken" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_verificationToken_key" ON "User"("verificationToken");
CREATE UNIQUE INDEX "User_googleId_key" ON "User"("googleId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

