-- AlterEnum
-- Remove the 'seed' value from CalendarEventSource. Every persisted calendar
-- event is now user-originated ('accepted'); demo fixtures are no longer seeded.
BEGIN;
CREATE TYPE "CalendarEventSource_new" AS ENUM ('accepted');
ALTER TABLE "calendar_events" ALTER COLUMN "source" TYPE "CalendarEventSource_new" USING ("source"::text::"CalendarEventSource_new");
ALTER TYPE "CalendarEventSource" RENAME TO "CalendarEventSource_old";
ALTER TYPE "CalendarEventSource_new" RENAME TO "CalendarEventSource";
DROP TYPE "CalendarEventSource_old";
COMMIT;
