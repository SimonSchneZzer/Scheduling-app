-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "ParticipantRole" AS ENUM ('required', 'optional');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('low', 'medium', 'high', 'urgent');

-- CreateEnum
CREATE TYPE "EventMode" AS ENUM ('offline', 'online');

-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('timed', 'all-day', 'multi-day');

-- CreateEnum
CREATE TYPE "CalendarEventSource" AS ENUM ('seed', 'accepted');

-- CreateEnum
CREATE TYPE "ResourceKind" AS ENUM ('device', 'equipment', 'vehicle', 'other');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teams" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_members" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "defaultRole" "ParticipantRole" NOT NULL DEFAULT 'optional',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "team_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calendars" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calendars_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calendar_events" (
    "id" TEXT NOT NULL,
    "calendarId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "source" "CalendarEventSource" NOT NULL,
    "start" TIMESTAMP(3) NOT NULL,
    "end" TIMESTAMP(3) NOT NULL,
    "roomId" TEXT,
    "eventRequestId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calendar_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calendar_event_participants" (
    "id" TEXT NOT NULL,
    "calendarEventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "ParticipantRole" NOT NULL,

    CONSTRAINT "calendar_event_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "availability_windows" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "start" TIMESTAMP(3) NOT NULL,
    "end" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "availability_windows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rooms" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "room_features" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "room_features_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "room_features_on_rooms" (
    "roomId" TEXT NOT NULL,
    "featureId" TEXT NOT NULL,

    CONSTRAINT "room_features_on_rooms_pkey" PRIMARY KEY ("roomId","featureId")
);

-- CreateTable
CREATE TABLE "room_availability_windows" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "start" TIMESTAMP(3) NOT NULL,
    "end" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "room_availability_windows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "room_bookings" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "calendarEventId" TEXT NOT NULL,
    "start" TIMESTAMP(3) NOT NULL,
    "end" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "room_bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resources" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "ResourceKind" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resource_availability_windows" (
    "id" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "start" TIMESTAMP(3) NOT NULL,
    "end" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "resource_availability_windows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resource_bookings" (
    "id" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "start" TIMESTAMP(3) NOT NULL,
    "end" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "resource_bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_requests" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "eventType" "EventType" NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "durationDays" INTEGER,
    "priority" "Priority" NOT NULL,
    "mode" "EventMode" NOT NULL,
    "requiredSeats" INTEGER NOT NULL DEFAULT 0,
    "searchStart" TIMESTAMP(3) NOT NULL,
    "searchEnd" TIMESTAMP(3) NOT NULL,
    "slotIncrementMinutes" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_request_participants" (
    "id" TEXT NOT NULL,
    "eventRequestId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "ParticipantRole" NOT NULL,

    CONSTRAINT "event_request_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_request_required_features" (
    "eventRequestId" TEXT NOT NULL,
    "featureId" TEXT NOT NULL,

    CONSTRAINT "event_request_required_features_pkey" PRIMARY KEY ("eventRequestId","featureId")
);

-- CreateTable
CREATE TABLE "event_request_resource_requirements" (
    "eventRequestId" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,

    CONSTRAINT "event_request_resource_requirements_pkey" PRIMARY KEY ("eventRequestId","resourceId")
);

-- CreateTable
CREATE TABLE "schedule_runs" (
    "id" TEXT NOT NULL,
    "eventRequestId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "schedule_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "schedule_suggestions" (
    "id" TEXT NOT NULL,
    "scheduleRunId" TEXT NOT NULL,
    "start" TIMESTAMP(3) NOT NULL,
    "end" TIMESTAMP(3) NOT NULL,
    "score" INTEGER NOT NULL,
    "explanations" JSONB NOT NULL,
    "assignedRoomId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "schedule_suggestions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "team_members_teamId_userId_key" ON "team_members"("teamId", "userId");

-- CreateIndex
CREATE INDEX "calendar_events_calendarId_start_end_idx" ON "calendar_events"("calendarId", "start", "end");

-- CreateIndex
CREATE INDEX "calendar_events_roomId_start_end_idx" ON "calendar_events"("roomId", "start", "end");

-- CreateIndex
CREATE INDEX "calendar_event_participants_userId_idx" ON "calendar_event_participants"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "calendar_event_participants_calendarEventId_userId_key" ON "calendar_event_participants"("calendarEventId", "userId");

-- CreateIndex
CREATE INDEX "availability_windows_userId_start_end_idx" ON "availability_windows"("userId", "start", "end");

-- CreateIndex
CREATE UNIQUE INDEX "rooms_teamId_name_key" ON "rooms"("teamId", "name");

-- CreateIndex
CREATE INDEX "room_availability_windows_roomId_start_end_idx" ON "room_availability_windows"("roomId", "start", "end");

-- CreateIndex
CREATE INDEX "room_bookings_roomId_start_end_idx" ON "room_bookings"("roomId", "start", "end");

-- CreateIndex
CREATE UNIQUE INDEX "resources_teamId_name_key" ON "resources"("teamId", "name");

-- CreateIndex
CREATE INDEX "resource_availability_windows_resourceId_start_end_idx" ON "resource_availability_windows"("resourceId", "start", "end");

-- CreateIndex
CREATE INDEX "resource_bookings_resourceId_start_end_idx" ON "resource_bookings"("resourceId", "start", "end");

-- CreateIndex
CREATE INDEX "event_requests_teamId_createdAt_idx" ON "event_requests"("teamId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "event_request_participants_eventRequestId_userId_key" ON "event_request_participants"("eventRequestId", "userId");

-- CreateIndex
CREATE INDEX "schedule_runs_eventRequestId_createdAt_idx" ON "schedule_runs"("eventRequestId", "createdAt");

-- CreateIndex
CREATE INDEX "schedule_suggestions_scheduleRunId_score_idx" ON "schedule_suggestions"("scheduleRunId", "score");

-- AddForeignKey
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendars" ADD CONSTRAINT "calendars_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_calendarId_fkey" FOREIGN KEY ("calendarId") REFERENCES "calendars"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_eventRequestId_fkey" FOREIGN KEY ("eventRequestId") REFERENCES "event_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_event_participants" ADD CONSTRAINT "calendar_event_participants_calendarEventId_fkey" FOREIGN KEY ("calendarEventId") REFERENCES "calendar_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_event_participants" ADD CONSTRAINT "calendar_event_participants_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "availability_windows" ADD CONSTRAINT "availability_windows_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_features_on_rooms" ADD CONSTRAINT "room_features_on_rooms_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_features_on_rooms" ADD CONSTRAINT "room_features_on_rooms_featureId_fkey" FOREIGN KEY ("featureId") REFERENCES "room_features"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_availability_windows" ADD CONSTRAINT "room_availability_windows_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_bookings" ADD CONSTRAINT "room_bookings_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_bookings" ADD CONSTRAINT "room_bookings_calendarEventId_fkey" FOREIGN KEY ("calendarEventId") REFERENCES "calendar_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resources" ADD CONSTRAINT "resources_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resource_availability_windows" ADD CONSTRAINT "resource_availability_windows_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "resources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resource_bookings" ADD CONSTRAINT "resource_bookings_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "resources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_requests" ADD CONSTRAINT "event_requests_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_request_participants" ADD CONSTRAINT "event_request_participants_eventRequestId_fkey" FOREIGN KEY ("eventRequestId") REFERENCES "event_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_request_participants" ADD CONSTRAINT "event_request_participants_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_request_required_features" ADD CONSTRAINT "event_request_required_features_eventRequestId_fkey" FOREIGN KEY ("eventRequestId") REFERENCES "event_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_request_required_features" ADD CONSTRAINT "event_request_required_features_featureId_fkey" FOREIGN KEY ("featureId") REFERENCES "room_features"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_request_resource_requirements" ADD CONSTRAINT "event_request_resource_requirements_eventRequestId_fkey" FOREIGN KEY ("eventRequestId") REFERENCES "event_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_request_resource_requirements" ADD CONSTRAINT "event_request_resource_requirements_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "resources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_runs" ADD CONSTRAINT "schedule_runs_eventRequestId_fkey" FOREIGN KEY ("eventRequestId") REFERENCES "event_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_suggestions" ADD CONSTRAINT "schedule_suggestions_scheduleRunId_fkey" FOREIGN KEY ("scheduleRunId") REFERENCES "schedule_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_suggestions" ADD CONSTRAINT "schedule_suggestions_assignedRoomId_fkey" FOREIGN KEY ("assignedRoomId") REFERENCES "rooms"("id") ON DELETE SET NULL ON UPDATE CASCADE;
