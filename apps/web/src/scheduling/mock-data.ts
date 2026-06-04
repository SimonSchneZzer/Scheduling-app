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
      window("2026-06-08T09:00:00", "2026-06-08T12:00:00"),
      window("2026-06-08T13:00:00", "2026-06-08T17:00:00"),
    ],
  },
  {
    participantId: "simon",
    windows: [
      window("2026-06-08T09:30:00", "2026-06-08T12:00:00"),
      window("2026-06-08T13:30:00", "2026-06-08T16:30:00"),
    ],
  },
  {
    participantId: "lea",
    windows: [window("2026-06-08T10:00:00", "2026-06-08T15:00:00")],
  },
  {
    participantId: "jonas",
    windows: [
      window("2026-06-08T09:00:00", "2026-06-08T11:30:00"),
      window("2026-06-08T14:00:00", "2026-06-08T17:00:00"),
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
    ],
  },
  {
    id: "room-b",
    name: "Room B",
    capacity: 4,
    features: ["screen", "video"],
    availability: [window("2026-06-08T09:00:00", "2026-06-08T17:00:00")],
  },
  {
    id: "workshop-room",
    name: "Workshop Room",
    capacity: 14,
    features: ["whiteboard", "screen", "video"],
    availability: [window("2026-06-08T10:00:00", "2026-06-08T16:00:00")],
  },
];

export const initialCalendarEvents: CalendarEvent[] = [
  {
    id: "calendar-standup",
    title: "Daily standup",
    source: "seed",
    participantIds: ["mara", "simon", "lea", "jonas"],
    resourceId: "room-a",
    start: new Date("2026-06-08T09:00:00"),
    end: new Date("2026-06-08T09:30:00"),
  },
  {
    id: "calendar-customer-call",
    title: "Customer call",
    source: "seed",
    participantIds: ["simon"],
    start: new Date("2026-06-08T11:00:00"),
    end: new Date("2026-06-08T11:45:00"),
  },
  {
    id: "calendar-design-review",
    title: "Design review",
    source: "seed",
    participantIds: ["lea"],
    start: new Date("2026-06-08T13:30:00"),
    end: new Date("2026-06-08T14:30:00"),
  },
];

function window(start: string, end: string) {
  return {
    start: new Date(start),
    end: new Date(end),
  };
}
