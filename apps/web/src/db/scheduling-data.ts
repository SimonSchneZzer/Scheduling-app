import { randomUUID } from "node:crypto";
import { getPrismaClient } from "./prisma";
import type {
  AcceptSuggestionRequest,
  SchedulingData,
  TeamMember,
  UpdateCalendarEventRequest,
} from "@/scheduling";
import type {
  CalendarEvent,
  CalendarEventSource,
  ParticipantAvailability,
  ParticipantRole,
  ResourceFeature,
  RoomResource,
} from "@/scheduling";

export const DEMO_TEAM_ID = "team-product";
export const DEMO_CALENDAR_ID = "calendar-team";

type PrismaParticipantRole = "REQUIRED" | "OPTIONAL";
type PrismaCalendarEventSource = "SEED" | "ACCEPTED";

export async function loadSchedulingData(): Promise<SchedulingData> {
  const prisma = getPrismaClient();

  const [teamMembers, availabilityWindows, rooms, calendarEvents] =
    await Promise.all([
      prisma.teamMember.findMany({
        where: { teamId: DEMO_TEAM_ID },
        include: { user: true },
        orderBy: { createdAt: "asc" },
      }),
      prisma.availabilityWindow.findMany({
        where: {
          user: {
            teamMemberships: {
              some: { teamId: DEMO_TEAM_ID },
            },
          },
        },
        orderBy: [{ userId: "asc" }, { start: "asc" }],
      }),
      prisma.room.findMany({
        where: { teamId: DEMO_TEAM_ID },
        include: {
          features: true,
          availabilityWindows: {
            orderBy: { start: "asc" },
          },
        },
        orderBy: { name: "asc" },
      }),
      prisma.calendarEvent.findMany({
        where: { calendarId: DEMO_CALENDAR_ID },
        include: {
          participants: true,
        },
        orderBy: { start: "asc" },
      }),
    ]);

  return {
    teamMembers: teamMembers.map<TeamMember>((member) => ({
      id: member.userId,
      name: member.user.name,
      defaultRole: mapParticipantRole(member.defaultRole),
    })),
    participantAvailability: groupAvailabilityWindows(availabilityWindows),
    rooms: rooms.map<RoomResource>((room) => ({
      id: room.id,
      name: room.name,
      capacity: room.capacity,
      features: room.features.map((feature) => feature.featureId as ResourceFeature),
      availability: room.availabilityWindows.map((availability) => ({
        start: availability.start,
        end: availability.end,
      })),
    })),
    calendarEvents: calendarEvents.map<CalendarEvent>((event) => ({
      id: event.id,
      title: event.title,
      source: mapCalendarEventSource(event.source),
      participantIds: event.participants.map((participant) => participant.userId),
      resourceId: event.roomId ?? undefined,
      start: event.start,
      end: event.end,
    })),
  };
}

export async function createAcceptedCalendarEvent(
  input: AcceptSuggestionRequest,
): Promise<CalendarEvent> {
  const prisma = getPrismaClient();
  const start = new Date(input.start);
  const end = new Date(input.end);
  const id = `accepted-${randomUUID()}`;

  const event = await prisma.calendarEvent.create({
    data: {
      id,
      calendarId: DEMO_CALENDAR_ID,
      title: input.title,
      source: "ACCEPTED",
      roomId: input.resourceId,
      start,
      end,
      participants: {
        create: input.participantIds.map((participantId) => ({
          userId: participantId,
          role: mapParticipantRoleToPrisma(
            input.participantRoles?.[participantId] ?? "required",
          ),
        })),
      },
      roomBookings: input.resourceId
        ? {
            create: {
              roomId: input.resourceId,
              start,
              end,
            },
          }
        : undefined,
    },
    include: {
      participants: true,
    },
  });

  return {
    id: event.id,
    title: event.title,
    source: "accepted",
    participantIds: event.participants.map((participant) => participant.userId),
    resourceId: event.roomId ?? undefined,
    start: event.start,
    end: event.end,
  };
}

export async function updateAcceptedCalendarEvent(
  id: string,
  patch: UpdateCalendarEventRequest,
): Promise<CalendarEvent | null> {
  const prisma = getPrismaClient();
  const start = new Date(patch.start);
  const end = new Date(patch.end);
  const nextRoomId = patch.resourceId === undefined ? undefined : patch.resourceId;

  const existing = await prisma.calendarEvent.findUnique({
    where: { id },
    select: { id: true, source: true, roomId: true },
  });

  if (!existing || existing.source !== "ACCEPTED") {
    return null;
  }

  const event = await prisma.$transaction(async (tx) => {
    await tx.roomBooking.deleteMany({ where: { calendarEventId: id } });

    const roomIdToUse =
      nextRoomId === undefined ? existing.roomId : nextRoomId;

    return tx.calendarEvent.update({
      where: { id },
      data: {
        start,
        end,
        ...(patch.title !== undefined ? { title: patch.title } : {}),
        ...(nextRoomId === undefined ? {} : { roomId: nextRoomId }),
        ...(roomIdToUse
          ? {
              roomBookings: {
                create: { roomId: roomIdToUse, start, end },
              },
            }
          : {}),
      },
      include: { participants: true },
    });
  });

  return {
    id: event.id,
    title: event.title,
    source: "accepted",
    participantIds: event.participants.map((participant) => participant.userId),
    resourceId: event.roomId ?? undefined,
    start: event.start,
    end: event.end,
  };
}

export async function deleteAcceptedCalendarEvents() {
  const prisma = getPrismaClient();

  await prisma.calendarEvent.deleteMany({
    where: {
      calendarId: DEMO_CALENDAR_ID,
      source: "ACCEPTED",
    },
  });
}

function groupAvailabilityWindows(
  windows: Array<{ userId: string; start: Date; end: Date }>,
): ParticipantAvailability[] {
  const grouped = new Map<string, ParticipantAvailability>();

  for (const window of windows) {
    const availability = grouped.get(window.userId) ?? {
      participantId: window.userId,
      windows: [],
    };

    availability.windows.push({
      start: window.start,
      end: window.end,
    });
    grouped.set(window.userId, availability);
  }

  return [...grouped.values()];
}

function mapParticipantRole(role: PrismaParticipantRole): ParticipantRole {
  return role === "REQUIRED" ? "required" : "optional";
}

function mapParticipantRoleToPrisma(role: ParticipantRole): PrismaParticipantRole {
  return role === "required" ? "REQUIRED" : "OPTIONAL";
}

function mapCalendarEventSource(
  source: PrismaCalendarEventSource,
): CalendarEventSource {
  return source === "ACCEPTED" ? "accepted" : "seed";
}
