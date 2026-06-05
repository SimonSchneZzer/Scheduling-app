-- AlterEnum
-- Merge "multi-day" into "all-day": an all-day event now spans one or more whole
-- days via durationDays. Existing multi-day requests are migrated to all-day.
BEGIN;
CREATE TYPE "EventType_new" AS ENUM ('timed', 'all-day');
ALTER TABLE "event_requests" ALTER COLUMN "eventType" TYPE "EventType_new" USING (
  (CASE WHEN "eventType"::text = 'multi-day' THEN 'all-day' ELSE "eventType"::text END)::"EventType_new"
);
ALTER TYPE "EventType" RENAME TO "EventType_old";
ALTER TYPE "EventType_new" RENAME TO "EventType";
DROP TYPE "EventType_old";
COMMIT;
