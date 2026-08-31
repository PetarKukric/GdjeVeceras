ALTER TABLE "Venue" ADD COLUMN "email" TEXT;

CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");
CREATE INDEX "Event_status_startDateTime_idx" ON "Event"("status", "startDateTime");
CREATE INDEX "Event_venueId_idx" ON "Event"("venueId");
CREATE INDEX "Reservation_userId_idx" ON "Reservation"("userId");
