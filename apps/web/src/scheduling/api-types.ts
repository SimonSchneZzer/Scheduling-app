import type {
  CalendarEvent,
  ParticipantAvailability,
  ParticipantRole,
  RoomResource,
} from "./types";

export type TeamMember = {
  id: string;
  name: string;
  defaultRole: ParticipantRole;
};

export type SchedulingData = {
  teamMembers: TeamMember[];
  participantAvailability: ParticipantAvailability[];
  rooms: RoomResource[];
  calendarEvents: CalendarEvent[];
};

export type SerializedTimeWindow = {
  start: string;
  end: string;
};

export type SerializedParticipantAvailability = {
  participantId: string;
  windows: SerializedTimeWindow[];
};

export type SerializedCalendarEvent = Omit<CalendarEvent, "start" | "end"> & {
  start: string;
  end: string;
};

export type SerializedRoomResource = Omit<RoomResource, "availability"> & {
  availability: SerializedTimeWindow[];
};

export type SerializedSchedulingData = {
  teamMembers: TeamMember[];
  participantAvailability: SerializedParticipantAvailability[];
  rooms: SerializedRoomResource[];
  calendarEvents: SerializedCalendarEvent[];
};

export type AcceptSuggestionRequest = {
  title: string;
  participantIds: string[];
  participantRoles?: Record<string, ParticipantRole>;
  resourceId?: string;
  start: string;
  end: string;
};

export type UpdateCalendarEventRequest = {
  start: string;
  end: string;
  resourceId?: string | null;
  title?: string;
};

export function serializeSchedulingData(
  data: SchedulingData,
): SerializedSchedulingData {
  return {
    teamMembers: data.teamMembers,
    participantAvailability: data.participantAvailability.map((availability) => ({
      participantId: availability.participantId,
      windows: availability.windows.map(serializeTimeWindow),
    })),
    rooms: data.rooms.map((room) => ({
      ...room,
      availability: room.availability.map(serializeTimeWindow),
    })),
    calendarEvents: data.calendarEvents.map((event) => ({
      ...event,
      start: event.start.toISOString(),
      end: event.end.toISOString(),
    })),
  };
}

export function deserializeSchedulingData(
  data: SerializedSchedulingData,
): SchedulingData {
  return {
    teamMembers: data.teamMembers,
    participantAvailability: data.participantAvailability.map((availability) => ({
      participantId: availability.participantId,
      windows: availability.windows.map(deserializeTimeWindow),
    })),
    rooms: data.rooms.map((room) => ({
      ...room,
      availability: room.availability.map(deserializeTimeWindow),
    })),
    calendarEvents: data.calendarEvents.map((event) => ({
      ...event,
      start: new Date(event.start),
      end: new Date(event.end),
    })),
  };
}

function serializeTimeWindow(window: { start: Date; end: Date }) {
  return {
    start: window.start.toISOString(),
    end: window.end.toISOString(),
  };
}

function deserializeTimeWindow(window: SerializedTimeWindow) {
  return {
    start: new Date(window.start),
    end: new Date(window.end),
  };
}
