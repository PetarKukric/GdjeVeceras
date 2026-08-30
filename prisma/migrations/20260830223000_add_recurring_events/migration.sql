ALTER TABLE "Event" ADD COLUMN "isRecurring" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Event" ADD COLUMN "recurrenceType" TEXT;
ALTER TABLE "Event" ADD COLUMN "recurrenceDays" TEXT;
ALTER TABLE "Event" ADD COLUMN "recurrenceStart" DATETIME;
ALTER TABLE "Event" ADD COLUMN "recurrenceEnd" DATETIME;
ALTER TABLE "Reservation" ADD COLUMN "occurrenceDate" TEXT;

CREATE TABLE "EventOccurrenceException" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "parentEventId" TEXT NOT NULL,
    "occurrenceDate" TEXT NOT NULL,
    "isCancelled" BOOLEAN NOT NULL DEFAULT false,
    "startDateTime" DATETIME,
    "endDateTime" DATETIME,
    "title" TEXT,
    "performers" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "EventOccurrenceException_parentEventId_fkey" FOREIGN KEY ("parentEventId") REFERENCES "Event" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "EventOccurrenceException_parentEventId_occurrenceDate_key"
ON "EventOccurrenceException"("parentEventId", "occurrenceDate");
