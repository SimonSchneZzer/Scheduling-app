export type ParticipantRole = "required" | "optional";

export type Priority = "low" | "medium" | "high" | "urgent";

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
  participantIds: string[];
  start: Date;
  end: Date;
};

export type EventRequest = {
  id: string;
  durationMinutes: number;
  priority: Priority;
  participants: Participant[];
  searchWindow: TimeWindow;
  slotIncrementMinutes?: number;
};

export type ScheduleSuggestion = {
  start: Date;
  end: Date;
  score: number;
  explanations: string[];
};

export type GenerateScheduleSuggestionsInput = {
  eventRequest: EventRequest;
  participantAvailability: ParticipantAvailability[];
  existingEvents: CalendarEvent[];
  maxSuggestions?: number;
};
