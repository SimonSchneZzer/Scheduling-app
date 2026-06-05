export type ParticipantRole = "required" | "optional";

export type Priority = "low" | "medium" | "high" | "urgent";

export type EventMode = "offline" | "online";

// An all-day event spans one or more whole days (durationDays >= 1); the former
// "multi-day" type is just an all-day event with durationDays > 1.
export type EventType = "timed" | "all-day";

// A room feature is a user-created record, referenced by its id.
export type ResourceFeature = string;

export type CalendarEventSource = "accepted";

export type TimeWindow = {
  start: Date;
  end: Date;
};

export type Participant = {
  id: string;
  role: ParticipantRole;
};

export type ParticipantAvailability = {
  participantId: string;
  windows: TimeWindow[];
};

export type CalendarEvent = {
  id: string;
  title: string;
  description?: string;
  source: CalendarEventSource;
  /** UI-only marker for unsaved suggestion previews; never persisted. */
  preview?: boolean;
  participantIds: string[];
  resourceId?: string;
  start: Date;
  end: Date;
};

export type RoomResource = {
  id: string;
  name: string;
  capacity: number;
  features: ResourceFeature[];
  availability: TimeWindow[];
};

export type ResourceRequirements = {
  mode: EventMode;
  seats: number;
  features: ResourceFeature[];
};

export type EventRequest = {
  id: string;
  eventType: EventType;
  durationMinutes: number;
  durationDays?: number;
  priority: Priority;
  resourceRequirements: ResourceRequirements;
  participants: Participant[];
  searchWindow: TimeWindow;
  slotIncrementMinutes?: number;
};

export type ScheduleSuggestion = {
  start: Date;
  end: Date;
  score: number;
  explanations: string[];
  assignedResource?: RoomResource;
};

export type GenerateScheduleSuggestionsInput = {
  eventRequest: EventRequest;
  participantAvailability: ParticipantAvailability[];
  existingEvents: CalendarEvent[];
  resources: RoomResource[];
  maxSuggestions?: number;
};
