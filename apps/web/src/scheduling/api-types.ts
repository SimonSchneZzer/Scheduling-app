import type {
  CalendarEvent,
  EventRequest,
  ParticipantAvailability,
  ParticipantRole,
  RoomResource,
  ScheduleSuggestion,
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

export type StoredScheduleSuggestion = ScheduleSuggestion & {
  id: string;
};

export type SerializedStoredScheduleSuggestion = Omit<
  StoredScheduleSuggestion,
  "start" | "end"
> & {
  start: string;
  end: string;
};

export type SerializedSchedulingData = {
  teamMembers: TeamMember[];
  participantAvailability: SerializedParticipantAvailability[];
  rooms: SerializedRoomResource[];
  calendarEvents: SerializedCalendarEvent[];
};

export type CreateScheduleRunRequest = {
  title: string;
  eventRequest: EventRequest;
};

export type ScheduleRunResponse = {
  eventRequestId: string;
  scheduleRunId: string;
  suggestions: StoredScheduleSuggestion[];
};

export type ScheduleRunHistoryItem = {
  id: string;
  eventRequestId: string;
  title: string;
  createdAt: Date;
  suggestionCount: number;
  topScore?: number;
  acceptedEventId?: string;
};

export type SerializedScheduleRunResponse = Omit<
  ScheduleRunResponse,
  "suggestions"
> & {
  suggestions: SerializedStoredScheduleSuggestion[];
};

export type SerializedScheduleRunHistoryItem = Omit<
  ScheduleRunHistoryItem,
  "createdAt"
> & {
  createdAt: string;
};

export type AcceptSuggestionRequest = {
  title: string;
  description?: string;
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
  description?: string | null;
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

export function serializeScheduleRunResponse(
  response: ScheduleRunResponse,
): SerializedScheduleRunResponse {
  return {
    ...response,
    suggestions: response.suggestions.map((suggestion) => ({
      ...suggestion,
      start: suggestion.start.toISOString(),
      end: suggestion.end.toISOString(),
    })),
  };
}

export function deserializeScheduleRunResponse(
  response: SerializedScheduleRunResponse,
): ScheduleRunResponse {
  return {
    ...response,
    suggestions: response.suggestions.map((suggestion) => ({
      ...suggestion,
      start: new Date(suggestion.start),
      end: new Date(suggestion.end),
    })),
  };
}

export function serializeScheduleRunHistory(
  runs: ScheduleRunHistoryItem[],
): SerializedScheduleRunHistoryItem[] {
  return runs.map((run) => ({
    ...run,
    createdAt: run.createdAt.toISOString(),
  }));
}

export function deserializeScheduleRunHistory(
  runs: SerializedScheduleRunHistoryItem[],
): ScheduleRunHistoryItem[] {
  return runs.map((run) => ({
    ...run,
    createdAt: new Date(run.createdAt),
  }));
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
