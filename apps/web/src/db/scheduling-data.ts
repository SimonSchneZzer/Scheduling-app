import { randomUUID } from "node:crypto";
import { getPrismaClient } from "./prisma";
import { validateAcceptedCalendarEvent } from "@/scheduling/acceptance-validation";
import { generateScheduleSuggestions } from "@/scheduling/engine";
import type {
  AcceptSuggestionRequest,
  CreateScheduleRunRequest,
  ScheduleRunHistoryItem,
  ScheduleRunResponse,
  SchedulingData,
  StoredScheduleSuggestion,
  TeamMember,
  UpdateCalendarEventRequest,
} from "@/scheduling";
import type {
  CalendarEvent,
  ParticipantAvailability,
  ParticipantRole,
  Priority,
  ResourceFeature,
  RoomResource,
} from "@/scheduling";

export const DEMO_TEAM_ID = "team-product";
export const DEMO_CALENDAR_ID = "calendar-team";

export class CalendarEventValidationError extends Error {
  constructor(public readonly reasons: string[]) {
    super(reasons.join(" "));
    this.name = "CalendarEventValidationError";
  }
}

export class ScheduleSuggestionNotFoundError extends Error {
  constructor() {
    super("Schedule suggestion was not found.");
    this.name = "ScheduleSuggestionNotFoundError";
  }
}

type PrismaParticipantRole = "REQUIRED" | "OPTIONAL";
type PrismaPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
type PrismaEventMode = "OFFLINE" | "ONLINE";
type PrismaEventType = "TIMED" | "ALL_DAY";

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
      description: event.description ?? undefined,
      source: "accepted",
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
  return createValidatedAcceptedCalendarEvent(input);
}

export async function createScheduleRun(
  input: CreateScheduleRunRequest,
): Promise<ScheduleRunResponse> {
  const prisma = getPrismaClient();
  const schedulingData = await loadSchedulingData();
  const suggestions = generateScheduleSuggestions({
    eventRequest: input.eventRequest,
    participantAvailability: schedulingData.participantAvailability,
    existingEvents: schedulingData.calendarEvents,
    resources: schedulingData.rooms,
    maxSuggestions: 6,
  });
  const eventRequestId = `request-${randomUUID()}`;

  const run = await prisma.$transaction(async (tx) => {
    await tx.eventRequest.create({
      data: {
        id: eventRequestId,
        teamId: DEMO_TEAM_ID,
        title: input.title,
        eventType: mapEventTypeToPrisma(input.eventRequest.eventType),
        durationMinutes: input.eventRequest.durationMinutes,
        durationDays: input.eventRequest.durationDays,
        priority: mapPriorityToPrisma(input.eventRequest.priority),
        mode: mapEventModeToPrisma(input.eventRequest.resourceRequirements.mode),
        requiredSeats: input.eventRequest.resourceRequirements.seats,
        searchStart: input.eventRequest.searchWindow.start,
        searchEnd: input.eventRequest.searchWindow.end,
        slotIncrementMinutes: input.eventRequest.slotIncrementMinutes,
        participants: {
          create: input.eventRequest.participants.map((participant) => ({
            userId: participant.id,
            role: mapParticipantRoleToPrisma(participant.role),
          })),
        },
        requiredFeatures: {
          create: input.eventRequest.resourceRequirements.features.map(
            (featureId) => ({ featureId }),
          ),
        },
      },
    });

    return tx.scheduleRun.create({
      data: {
        eventRequestId,
        suggestions: {
          create: suggestions.map((suggestion) => ({
            start: suggestion.start,
            end: suggestion.end,
            score: suggestion.score,
            explanations: suggestion.explanations,
            assignedRoomId: suggestion.assignedResource?.id,
          })),
        },
      },
      include: {
        suggestions: {
          include: { assignedRoom: true },
          orderBy: [{ score: "desc" }, { start: "asc" }],
        },
      },
    });
  });

  return {
    eventRequestId,
    scheduleRunId: run.id,
    suggestions: run.suggestions.map((suggestion) =>
      mapStoredScheduleSuggestion(suggestion, schedulingData.rooms),
    ),
  };
}

export async function loadScheduleRunHistory(): Promise<ScheduleRunHistoryItem[]> {
  const prisma = getPrismaClient();
  const runs = await prisma.scheduleRun.findMany({
    where: {
      eventRequest: { teamId: DEMO_TEAM_ID },
    },
    include: {
      eventRequest: {
        include: {
          acceptedEvents: {
            select: { id: true },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      },
      suggestions: {
        select: { score: true },
        orderBy: { score: "desc" },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 12,
  });

  return runs.map((run) => ({
    id: run.id,
    eventRequestId: run.eventRequestId,
    title: run.eventRequest.title,
    createdAt: run.createdAt,
    suggestionCount: run.suggestions.length,
    topScore: run.suggestions[0]?.score,
    acceptedEventId: run.eventRequest.acceptedEvents[0]?.id,
  }));
}

export async function acceptStoredScheduleSuggestion(
  suggestionId: string,
): Promise<CalendarEvent> {
  const prisma = getPrismaClient();
  const suggestion = await prisma.scheduleSuggestion.findUnique({
    where: { id: suggestionId },
    include: {
      scheduleRun: {
        include: {
          eventRequest: {
            include: {
              participants: true,
            },
          },
        },
      },
    },
  });

  if (!suggestion) {
    throw new ScheduleSuggestionNotFoundError();
  }

  const eventRequest = suggestion.scheduleRun.eventRequest;
  const participantRoles = Object.fromEntries(
    eventRequest.participants.map((participant) => [
      participant.userId,
      mapParticipantRole(participant.role),
    ]),
  );
  const input: AcceptSuggestionRequest = {
    title: eventRequest.title,
    participantIds: eventRequest.participants.map(
      (participant) => participant.userId,
    ),
    participantRoles,
    resourceId: suggestion.assignedRoomId ?? undefined,
    start: suggestion.start.toISOString(),
    end: suggestion.end.toISOString(),
  };

  return createValidatedAcceptedCalendarEvent(input, eventRequest.id);
}

async function createValidatedAcceptedCalendarEvent(
  input: AcceptSuggestionRequest,
  eventRequestId?: string,
): Promise<CalendarEvent> {
  const prisma = getPrismaClient();
  const schedulingData = await loadSchedulingData();
  const validation = validateAcceptedCalendarEvent(input, schedulingData);

  if (!validation.valid) {
    throw new CalendarEventValidationError(validation.reasons);
  }

  const start = new Date(input.start);
  const end = new Date(input.end);
  const id = `accepted-${randomUUID()}`;

  const event = await prisma.calendarEvent.create({
    data: {
      id,
      calendarId: DEMO_CALENDAR_ID,
      title: input.title,
      description: input.description,
      source: "ACCEPTED",
      roomId: input.resourceId,
      eventRequestId,
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
    description: event.description ?? undefined,
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
    include: { participants: true },
  });

  if (!existing || existing.source !== "ACCEPTED") {
    return null;
  }

  const roomIdToUse = nextRoomId === undefined ? existing.roomId : nextRoomId;
  const input: AcceptSuggestionRequest = {
    title: patch.title ?? existing.title,
    participantIds: existing.participants.map((participant) => participant.userId),
    participantRoles: Object.fromEntries(
      existing.participants.map((participant) => [
        participant.userId,
        mapParticipantRole(participant.role),
      ]),
    ),
    resourceId: roomIdToUse ?? undefined,
    start: patch.start,
    end: patch.end,
  };
  const validation = validateAcceptedCalendarEvent(
    input,
    await loadSchedulingData(),
    { ignoredEventId: id },
  );

  if (!validation.valid) {
    throw new CalendarEventValidationError(validation.reasons);
  }

  const event = await prisma.$transaction(async (tx) => {
    await tx.roomBooking.deleteMany({ where: { calendarEventId: id } });

    return tx.calendarEvent.update({
      where: { id },
      data: {
        start,
        end,
        ...(patch.title !== undefined ? { title: patch.title } : {}),
        ...(patch.description === undefined
          ? {}
          : { description: patch.description }),
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
    description: event.description ?? undefined,
    source: "accepted",
    participantIds: event.participants.map((participant) => participant.userId),
    resourceId: event.roomId ?? undefined,
    start: event.start,
    end: event.end,
  };
}

export async function deleteAcceptedCalendarEvent(
  id: string,
): Promise<CalendarEvent | null> {
  const prisma = getPrismaClient();
  const existing = await prisma.calendarEvent.findUnique({
    where: { id },
    include: { participants: true },
  });

  if (!existing || existing.source !== "ACCEPTED") {
    return null;
  }

  await prisma.$transaction(async (tx) => {
    await tx.roomBooking.deleteMany({ where: { calendarEventId: id } });
    await tx.calendarEvent.delete({ where: { id } });
  });

  return {
    id: existing.id,
    title: existing.title,
    description: existing.description ?? undefined,
    source: "accepted",
    participantIds: existing.participants.map((participant) => participant.userId),
    resourceId: existing.roomId ?? undefined,
    start: existing.start,
    end: existing.end,
  };
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


function mapPriorityToPrisma(priority: Priority): PrismaPriority {
  return priority.toUpperCase() as PrismaPriority;
}

function mapEventModeToPrisma(mode: "offline" | "online"): PrismaEventMode {
  return mode === "offline" ? "OFFLINE" : "ONLINE";
}

function mapEventTypeToPrisma(
  eventType: "timed" | "all-day",
): PrismaEventType {
  return eventType === "all-day" ? "ALL_DAY" : "TIMED";
}

function mapStoredScheduleSuggestion(
  suggestion: {
    id: string;
    start: Date;
    end: Date;
    score: number;
    explanations: unknown;
    assignedRoomId: string | null;
  },
  rooms: RoomResource[],
): StoredScheduleSuggestion {
  const assignedResource = suggestion.assignedRoomId
    ? rooms.find((room) => room.id === suggestion.assignedRoomId)
    : undefined;

  return {
    id: suggestion.id,
    start: suggestion.start,
    end: suggestion.end,
    score: suggestion.score,
    explanations: Array.isArray(suggestion.explanations)
      ? suggestion.explanations.filter(
          (explanation): explanation is string => typeof explanation === "string",
        )
      : [],
    assignedResource,
  };
}
