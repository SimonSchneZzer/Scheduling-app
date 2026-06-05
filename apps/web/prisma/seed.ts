import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

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

const seedEvents = [
  // Monday
  event("calendar-standup", "Daily standup", "2026-06-08T09:00:00", "2026-06-08T09:30:00", ["mara", "simon", "lea", "jonas"], "room-a"),
  event("calendar-customer-call", "Customer call", "2026-06-08T11:00:00", "2026-06-08T11:45:00", ["simon"]),
  event("calendar-hiring-sync", "Hiring sync", "2026-06-08T11:15:00", "2026-06-08T12:00:00", ["mara", "jonas"], "room-b"),
  event("calendar-design-review", "Design review", "2026-06-08T13:30:00", "2026-06-08T14:30:00", ["lea"]),
  event("calendar-1on1", "1:1 Mara · Simon", "2026-06-08T15:00:00", "2026-06-08T15:30:00", ["mara", "simon"], "room-b"),

  // Tuesday
  event("calendar-standup-tue", "Daily standup", "2026-06-09T09:00:00", "2026-06-09T09:30:00", ["mara", "simon", "lea", "jonas"], "room-a"),
  event("calendar-sprint-planning", "Sprint planning", "2026-06-09T10:00:00", "2026-06-09T11:30:00", ["mara", "simon", "lea", "jonas"], "workshop-room"),
  event("calendar-lunch-learn", "Lunch & learn", "2026-06-09T12:30:00", "2026-06-09T13:15:00", ["lea", "jonas"], "room-b"),
  event("calendar-design-critique", "Design critique", "2026-06-09T15:00:00", "2026-06-09T16:00:00", ["mara", "lea"], "room-a"),

  // Wednesday (+ multi-day offsite spanning into Thursday)
  event("calendar-standup-wed", "Daily standup", "2026-06-10T09:00:00", "2026-06-10T09:30:00", ["mara", "simon", "lea", "jonas"], "room-a"),
  event("calendar-offsite", "Team offsite", "2026-06-10T00:00:00", "2026-06-12T00:00:00", ["mara", "simon", "lea", "jonas"], "workshop-room"),
  event("calendar-roadmap-sync", "Roadmap sync", "2026-06-10T14:00:00", "2026-06-10T15:00:00", ["mara", "simon"], "room-b"),

  // Thursday
  event("calendar-standup-thu", "Daily standup", "2026-06-11T09:00:00", "2026-06-11T09:30:00", ["mara", "simon", "lea", "jonas"], "room-a"),
  event("calendar-customer-demo", "Customer demo", "2026-06-11T14:00:00", "2026-06-11T15:00:00", ["mara", "simon"], "room-b"),

  // Friday
  event("calendar-standup-fri", "Daily standup", "2026-06-12T09:00:00", "2026-06-12T09:30:00", ["mara", "simon", "lea", "jonas"], "room-a"),
  event("calendar-focus-friday", "Focus Friday", "2026-06-12T00:00:00", "2026-06-13T00:00:00", ["mara", "simon", "lea", "jonas"]),
  event("calendar-retro", "Team retro", "2026-06-12T15:00:00", "2026-06-12T16:00:00", ["mara", "simon", "lea", "jonas"], "workshop-room"),
];

function event(
  id: string,
  title: string,
  start: string,
  end: string,
  participantIds: string[],
  roomId?: string,
) {
  return { id, title, participantIds, roomId, start, end };
}

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

  for (const event of seedEvents) {
    await prisma.calendarEvent.upsert({
      where: { id: event.id },
      create: {
        id: event.id,
        calendarId,
        title: event.title,
        source: "SEED",
        roomId: event.roomId,
        start: new Date(event.start),
        end: new Date(event.end),
      },
      update: {
        title: event.title,
        roomId: event.roomId,
        start: new Date(event.start),
        end: new Date(event.end),
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

  console.log("Seeded scheduling demo data.");
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
