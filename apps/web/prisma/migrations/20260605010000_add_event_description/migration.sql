-- AlterTable
-- Add an optional free-text description to calendar events (sheet-only field).
ALTER TABLE "calendar_events" ADD COLUMN "description" TEXT;
