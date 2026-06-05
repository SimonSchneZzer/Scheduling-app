import type {
  AcceptSuggestionRequest,
  CreateScheduleRunRequest,
  UpdateCalendarEventRequest,
} from "./api-types";
import type {
  FeatureInput,
  ManagedWindow,
  ParticipantInput,
  RoomInput,
} from "./management-types";
import type {
  EventMode,
  EventRequest,
  EventType,
  ParticipantRole,
  Priority,
  ResourceFeature,
} from "./types";

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function isValidDate(value: string) {
  return !Number.isNaN(new Date(value).getTime());
}

export function isParticipantRole(value: unknown): value is ParticipantRole {
  return value === "required" || value === "optional";
}

export function isPriority(value: unknown): value is Priority {
  return (
    value === "low" ||
    value === "medium" ||
    value === "high" ||
    value === "urgent"
  );
}

export function isEventMode(value: unknown): value is EventMode {
  return value === "offline" || value === "online";
}

export function isEventType(value: unknown): value is EventType {
  return value === "timed" || value === "all-day";
}

export function isResourceFeature(value: unknown): value is ResourceFeature {
  return typeof value === "string" && value.length > 0;
}

function isParticipant(value: unknown): value is {
  id: string;
  role: ParticipantRole;
} {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    isParticipantRole(value.role)
  );
}

function isParticipantRoleMap(value: unknown) {
  if (value === undefined) {
    return true;
  }

  if (!isRecord(value)) {
    return false;
  }

  return Object.values(value).every(isParticipantRole);
}

export function isAcceptSuggestionRequest(
  value: unknown,
): value is AcceptSuggestionRequest {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.title === "string" &&
    value.title.trim().length > 0 &&
    (value.description === undefined ||
      typeof value.description === "string") &&
    Array.isArray(value.participantIds) &&
    value.participantIds.every(
      (participantId) => typeof participantId === "string",
    ) &&
    (value.resourceId === undefined || typeof value.resourceId === "string") &&
    typeof value.start === "string" &&
    isValidDate(value.start) &&
    typeof value.end === "string" &&
    isValidDate(value.end) &&
    new Date(value.start) < new Date(value.end) &&
    isParticipantRoleMap(value.participantRoles)
  );
}

export function isUpdateCalendarEventRequest(
  value: unknown,
): value is UpdateCalendarEventRequest {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.start === "string" &&
    isValidDate(value.start) &&
    typeof value.end === "string" &&
    isValidDate(value.end) &&
    new Date(value.start) < new Date(value.end) &&
    (value.resourceId === undefined ||
      value.resourceId === null ||
      typeof value.resourceId === "string") &&
    (value.title === undefined || typeof value.title === "string") &&
    (value.description === undefined ||
      value.description === null ||
      typeof value.description === "string")
  );
}

function isManagedWindow(value: unknown): value is ManagedWindow {
  return (
    isRecord(value) &&
    typeof value.start === "string" &&
    isValidDate(value.start) &&
    typeof value.end === "string" &&
    isValidDate(value.end) &&
    new Date(value.start) < new Date(value.end)
  );
}

function parseWindows(value: unknown): ManagedWindow[] | null {
  if (value === undefined) {
    return [];
  }
  if (!Array.isArray(value) || !value.every(isManagedWindow)) {
    return null;
  }
  return value.map((window) => ({ start: window.start, end: window.end }));
}

export function parseParticipantInput(
  value: unknown,
): ParticipantInput | null {
  if (
    !isRecord(value) ||
    typeof value.name !== "string" ||
    value.name.trim().length === 0 ||
    !isParticipantRole(value.defaultRole)
  ) {
    return null;
  }

  const availability = parseWindows(value.availability);
  if (!availability) {
    return null;
  }

  return { name: value.name, defaultRole: value.defaultRole, availability };
}

export function parseRoomInput(value: unknown): RoomInput | null {
  if (
    !isRecord(value) ||
    typeof value.name !== "string" ||
    value.name.trim().length === 0 ||
    typeof value.capacity !== "number" ||
    !Number.isFinite(value.capacity) ||
    value.capacity < 0 ||
    !Array.isArray(value.featureIds) ||
    !value.featureIds.every((id) => typeof id === "string")
  ) {
    return null;
  }

  const availability = parseWindows(value.availability);
  if (!availability) {
    return null;
  }

  return {
    name: value.name,
    capacity: Math.floor(value.capacity),
    featureIds: value.featureIds,
    availability,
  };
}

export function parseFeatureInput(value: unknown): FeatureInput | null {
  if (
    !isRecord(value) ||
    typeof value.label !== "string" ||
    value.label.trim().length === 0
  ) {
    return null;
  }
  return { label: value.label };
}

export function parseCreateScheduleRunRequest(
  value: unknown,
): CreateScheduleRunRequest | null {
  if (!isRecord(value) || typeof value.title !== "string") {
    return null;
  }

  const eventRequest = parseEventRequest(value.eventRequest);

  if (!eventRequest || value.title.trim().length === 0) {
    return null;
  }

  return {
    title: value.title,
    eventRequest,
  };
}

export function parseEventRequest(value: unknown): EventRequest | null {
  if (!isRecord(value) || !isRecord(value.searchWindow)) {
    return null;
  }

  if (
    typeof value.id !== "string" ||
    !isEventType(value.eventType) ||
    typeof value.durationMinutes !== "number" ||
    value.durationMinutes <= 0 ||
    (value.durationDays !== undefined &&
      (typeof value.durationDays !== "number" || value.durationDays <= 0)) ||
    !isPriority(value.priority) ||
    !isRecord(value.resourceRequirements) ||
    !isEventMode(value.resourceRequirements.mode) ||
    typeof value.resourceRequirements.seats !== "number" ||
    value.resourceRequirements.seats < 0 ||
    !Array.isArray(value.resourceRequirements.features) ||
    !value.resourceRequirements.features.every(isResourceFeature) ||
    !Array.isArray(value.participants) ||
    !value.participants.every(isParticipant) ||
    typeof value.searchWindow.start !== "string" ||
    !isValidDate(value.searchWindow.start) ||
    typeof value.searchWindow.end !== "string" ||
    !isValidDate(value.searchWindow.end) ||
    new Date(value.searchWindow.start) >= new Date(value.searchWindow.end) ||
    (value.slotIncrementMinutes !== undefined &&
      (typeof value.slotIncrementMinutes !== "number" ||
        value.slotIncrementMinutes <= 0))
  ) {
    return null;
  }

  return {
    id: value.id,
    eventType: value.eventType,
    durationMinutes: value.durationMinutes,
    durationDays: value.durationDays,
    priority: value.priority,
    resourceRequirements: {
      mode: value.resourceRequirements.mode,
      seats: value.resourceRequirements.seats,
      features: value.resourceRequirements.features,
    },
    participants: value.participants,
    searchWindow: {
      start: new Date(value.searchWindow.start),
      end: new Date(value.searchWindow.end),
    },
    slotIncrementMinutes: value.slotIncrementMinutes,
  };
}
