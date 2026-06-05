import type { CalendarEvent } from "./types";

type StoredCalendarEvent = Omit<CalendarEvent, "start" | "end"> & {
  start: string;
  end: string;
};

const STORAGE_VERSION = 1;

type StoredAcceptedEvents = {
  version: typeof STORAGE_VERSION;
  events: StoredCalendarEvent[];
};

export function serializeAcceptedEvents(events: CalendarEvent[]) {
  const payload: StoredAcceptedEvents = {
    version: STORAGE_VERSION,
    events: events
      .filter((event) => !event.preview)
      .map((event) => ({
        ...event,
        start: event.start.toISOString(),
        end: event.end.toISOString(),
      })),
  };

  return JSON.stringify(payload);
}

export function deserializeAcceptedEvents(value: string | null): CalendarEvent[] {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value) as Partial<StoredAcceptedEvents>;

    if (parsed.version !== STORAGE_VERSION || !Array.isArray(parsed.events)) {
      return [];
    }

    return parsed.events
      .map((event) => ({
        ...event,
        start: new Date(event.start),
        end: new Date(event.end),
      }))
      .filter(isValidCalendarEvent);
  } catch {
    return [];
  }
}

function isValidCalendarEvent(event: CalendarEvent) {
  return (
    event.source === "accepted" &&
    typeof event.id === "string" &&
    typeof event.title === "string" &&
    Array.isArray(event.participantIds) &&
    event.start instanceof Date &&
    !Number.isNaN(event.start.getTime()) &&
    event.end instanceof Date &&
    !Number.isNaN(event.end.getTime()) &&
    event.start < event.end
  );
}
