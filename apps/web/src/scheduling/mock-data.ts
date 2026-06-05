import type { CalendarEvent, ParticipantAvailability, RoomResource } from "./types";
import type { SchedulingData, TeamMember } from "./api-types";

export const teamMembers: TeamMember[] = [
  { id: "mara", name: "Mara", defaultRole: "required" },
  { id: "simon", name: "Simon", defaultRole: "required" },
  { id: "lea", name: "Lea", defaultRole: "optional" },
  { id: "jonas", name: "Jonas", defaultRole: "optional" },
];

export const participantAvailability: ParticipantAvailability[] = [
  {
    participantId: "mara",
    windows: [
      window("2026-06-08T00:00:00", "2026-06-12T00:00:00"),
    ],
  },
  {
    participantId: "simon",
    windows: [
      window("2026-06-08T09:30:00", "2026-06-08T12:00:00"),
      window("2026-06-08T13:30:00", "2026-06-08T16:30:00"),
      window("2026-06-09T00:00:00", "2026-06-12T00:00:00"),
    ],
  },
  {
    participantId: "lea",
    windows: [window("2026-06-08T10:00:00", "2026-06-11T00:00:00")],
  },
  {
    participantId: "jonas",
    windows: [
      window("2026-06-08T09:00:00", "2026-06-08T11:30:00"),
      window("2026-06-08T14:00:00", "2026-06-08T17:00:00"),
      window("2026-06-09T00:00:00", "2026-06-12T00:00:00"),
    ],
  },
];

export const rooms: RoomResource[] = [
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

export const initialCalendarEvents: CalendarEvent[] = [
  // Monday
  calendarEvent("calendar-standup", "Daily standup", "2026-06-08T09:00:00", "2026-06-08T09:30:00", ["mara", "simon", "lea", "jonas"], "room-a"),
  calendarEvent("calendar-customer-call", "Customer call", "2026-06-08T11:00:00", "2026-06-08T11:45:00", ["simon"]),
  calendarEvent("calendar-hiring-sync", "Hiring sync", "2026-06-08T11:15:00", "2026-06-08T12:00:00", ["mara", "jonas"], "room-b"),
  calendarEvent("calendar-design-review", "Design review", "2026-06-08T13:30:00", "2026-06-08T14:30:00", ["lea"]),
  calendarEvent("calendar-1on1", "1:1 Mara · Simon", "2026-06-08T15:00:00", "2026-06-08T15:30:00", ["mara", "simon"], "room-b"),

  // Tuesday
  calendarEvent("calendar-standup-tue", "Daily standup", "2026-06-09T09:00:00", "2026-06-09T09:30:00", ["mara", "simon", "lea", "jonas"], "room-a"),
  calendarEvent("calendar-sprint-planning", "Sprint planning", "2026-06-09T10:00:00", "2026-06-09T11:30:00", ["mara", "simon", "lea", "jonas"], "workshop-room"),
  calendarEvent("calendar-lunch-learn", "Lunch & learn", "2026-06-09T12:30:00", "2026-06-09T13:15:00", ["lea", "jonas"], "room-b"),
  calendarEvent("calendar-design-critique", "Design critique", "2026-06-09T15:00:00", "2026-06-09T16:00:00", ["mara", "lea"], "room-a"),

  // Wednesday (+ multi-day offsite spanning into Thursday)
  calendarEvent("calendar-standup-wed", "Daily standup", "2026-06-10T09:00:00", "2026-06-10T09:30:00", ["mara", "simon", "lea", "jonas"], "room-a"),
  calendarEvent("calendar-offsite", "Team offsite", "2026-06-10T00:00:00", "2026-06-12T00:00:00", ["mara", "simon", "lea", "jonas"], "workshop-room"),
  calendarEvent("calendar-roadmap-sync", "Roadmap sync", "2026-06-10T14:00:00", "2026-06-10T15:00:00", ["mara", "simon"], "room-b"),

  // Thursday
  calendarEvent("calendar-standup-thu", "Daily standup", "2026-06-11T09:00:00", "2026-06-11T09:30:00", ["mara", "simon", "lea", "jonas"], "room-a"),
  calendarEvent("calendar-customer-demo", "Customer demo", "2026-06-11T14:00:00", "2026-06-11T15:00:00", ["mara", "simon"], "room-b"),

  // Friday
  calendarEvent("calendar-standup-fri", "Daily standup", "2026-06-12T09:00:00", "2026-06-12T09:30:00", ["mara", "simon", "lea", "jonas"], "room-a"),
  calendarEvent("calendar-focus-friday", "Focus Friday", "2026-06-12T00:00:00", "2026-06-13T00:00:00", ["mara", "simon", "lea", "jonas"]),
  calendarEvent("calendar-retro", "Team retro", "2026-06-12T15:00:00", "2026-06-12T16:00:00", ["mara", "simon", "lea", "jonas"], "workshop-room"),
];

export const mockSchedulingData: SchedulingData = {
  teamMembers,
  participantAvailability,
  rooms,
  calendarEvents: initialCalendarEvents,
};

function window(start: string, end: string) {
  return {
    start: new Date(start),
    end: new Date(end),
  };
}

function calendarEvent(
  id: string,
  title: string,
  start: string,
  end: string,
  participantIds: string[],
  resourceId?: string,
): CalendarEvent {
  return {
    id,
    title,
    source: "seed",
    participantIds,
    resourceId,
    start: new Date(start),
    end: new Date(end),
  };
}
