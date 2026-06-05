import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { initialCalendarEvents } from "../src/scheduling/mock-data";

const adapter = new PrismaPg({
  connectionString: requireDatabaseUrl(),
});
const prisma = new PrismaClient({ adapter });

const teamId = "team-product";
const calendarId = "calendar-team";

const users = [
  { id: "mara", name: "Mara", defaultRole: "REQUIRED" },
  { id: "simon", name: "Simon", defaultRole: "REQUIRED" },
  { id: "lea", name: "Lea", defaultRole: "OPTIONAL" },
  { id: "jonas", name: "Jonas", defaultRole: "OPTIONAL" },
] as const;

const features = [
  { id: "whiteboard", label: "Whiteboard" },
  { id: "screen", label: "Screen" },
  { id: "video", label: "Video conferencing" },
];

const rooms = [
  {
    id: "room-a",
    name: "Room A",
    capacity: 8,
    features: ["whiteboard", "screen"],
    availability: [
      window("2026-06-08T09:00:00", "2026-06-08T12:00:00"),
      window("2026-06-08T13:00:00", "2026-06-08T17:00:00"),
      window("2026-06-09T00:00:00", "2026-06-12T00:00:00"),
    ],
  },
  {
    id: "room-b",
    name: "Room B",
    capacity: 4,
    features: ["screen", "video"],
    availability: [window("2026-06-08T09:00:00", "2026-06-12T00:00:00")],
  },
  {
    id: "workshop-room",
    name: "Workshop Room",
    capacity: 14,
    features: ["whiteboard", "screen", "video"],
    availability: [window("2026-06-08T10:00:00", "2026-06-12T00:00:00")],
  },
];

const participantAvailability = [
  {
    userId: "mara",
    windows: [window("2026-06-08T00:00:00", "2026-06-12T00:00:00")],
  },
  {
    userId: "simon",
    windows: [
      window("2026-06-08T09:30:00", "2026-06-08T12:00:00"),
      window("2026-06-08T13:30:00", "2026-06-08T16:30:00"),
      window("2026-06-09T00:00:00", "2026-06-12T00:00:00"),
    ],
  },
  {
    userId: "lea",
    windows: [window("2026-06-08T10:00:00", "2026-06-11T00:00:00")],
  },
  {
    userId: "jonas",
    windows: [
      window("2026-06-08T09:00:00", "2026-06-08T11:30:00"),
      window("2026-06-08T14:00:00", "2026-06-08T17:00:00"),
      window("2026-06-09T00:00:00", "2026-06-12T00:00:00"),
    ],
  },
];

async function main() {
  await prisma.team.upsert({
    where: { id: teamId },
    create: { id: teamId, name: "Product Team" },
    update: { name: "Product Team" },
  });

  await prisma.calendar.upsert({
    where: { id: calendarId },
    create: { id: calendarId, teamId, name: "Team Calendar" },
    update: { name: "Team Calendar" },
  });

  for (const user of users) {
    await prisma.user.upsert({
      where: { id: user.id },
      create: { id: user.id, name: user.name },
      update: { name: user.name },
    });

    await prisma.teamMember.upsert({
      where: { teamId_userId: { teamId, userId: user.id } },
      create: {
        teamId,
        userId: user.id,
        defaultRole: user.defaultRole,
      },
      update: { defaultRole: user.defaultRole },
    });
  }

  for (const feature of features) {
    await prisma.roomFeature.upsert({
      where: { id: feature.id },
      create: feature,
      update: { label: feature.label },
    });
  }

  for (const room of rooms) {
    await prisma.room.upsert({
      where: { id: room.id },
      create: {
        id: room.id,
        teamId,
        name: room.name,
        capacity: room.capacity,
      },
      update: {
        name: room.name,
        capacity: room.capacity,
      },
    });

    await prisma.roomFeatureOnRoom.deleteMany({ where: { roomId: room.id } });
    await prisma.roomAvailabilityWindow.deleteMany({ where: { roomId: room.id } });

    await prisma.roomFeatureOnRoom.createMany({
      data: room.features.map((featureId) => ({
        roomId: room.id,
        featureId,
      })),
    });

    await prisma.roomAvailabilityWindow.createMany({
      data: room.availability.map((availability) => ({
        roomId: room.id,
        ...availability,
      })),
    });
  }

  for (const availability of participantAvailability) {
    await prisma.availabilityWindow.deleteMany({
      where: { userId: availability.userId },
    });

    await prisma.availabilityWindow.createMany({
      data: availability.windows.map((entry) => ({
        userId: availability.userId,
        ...entry,
      })),
    });
  }

  for (const event of initialCalendarEvents) {
    await prisma.calendarEvent.upsert({
      where: { id: event.id },
      create: {
        id: event.id,
        calendarId,
        title: event.title,
        source: "ACCEPTED",
        roomId: event.resourceId,
        start: event.start,
        end: event.end,
      },
      update: {
        title: event.title,
        roomId: event.resourceId,
        start: event.start,
        end: event.end,
      },
    });

    await prisma.calendarEventParticipant.deleteMany({
      where: { calendarEventId: event.id },
    });

    await prisma.calendarEventParticipant.createMany({
      data: event.participantIds.map((userId) => ({
        calendarEventId: event.id,
        userId,
        role: "REQUIRED",
      })),
    });
  }

  console.log(
    `Seeded scheduling data: reference data + ${initialCalendarEvents.length} calendar events.`,
  );
}

function window(start: string, end: string) {
  return {
    start: new Date(start),
    end: new Date(end),
  };
}

function requireDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required to seed the database.");
  }

  return databaseUrl;
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
