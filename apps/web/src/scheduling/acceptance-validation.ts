import type { AcceptSuggestionRequest, SchedulingData } from "./api-types";
import type { CalendarEvent, ParticipantRole, TimeWindow } from "./types";

export type AcceptanceValidationResult =
  | { valid: true }
  | { valid: false; reasons: string[] };

export type AcceptanceValidationOptions = {
  ignoredEventId?: string;
};

export function validateAcceptedCalendarEvent(
  request: AcceptSuggestionRequest,
  data: SchedulingData,
  options: AcceptanceValidationOptions = {},
): AcceptanceValidationResult {
  const slot = {
    start: new Date(request.start),
    end: new Date(request.end),
  };
  const reasons: string[] = [];
  const participantIds = unique(request.participantIds);

  if (participantIds.length === 0) {
    reasons.push("At least one participant is required.");
  }

  if (participantIds.length !== request.participantIds.length) {
    reasons.push("Participant list contains duplicates.");
  }

  const teamMemberIds = new Set(data.teamMembers.map((member) => member.id));
  const unknownParticipantIds = participantIds.filter(
    (participantId) => !teamMemberIds.has(participantId),
  );

  if (unknownParticipantIds.length > 0) {
    reasons.push(
      `Unknown participant IDs: ${unknownParticipantIds.join(", ")}.`,
    );
  }

  for (const participantId of participantIds) {
    const role = participantRoleFor(request, participantId);

    if (role !== "required") {
      continue;
    }

    if (!isParticipantAvailable(participantId, slot, data)) {
      reasons.push(`Required participant ${participantId} is unavailable.`);
    }

    if (
      hasParticipantConflict(
        participantId,
        slot,
        data.calendarEvents,
        options.ignoredEventId,
      )
    ) {
      reasons.push(`Required participant ${participantId} has a conflict.`);
    }
  }

  if (request.resourceId) {
    const room = data.rooms.find((item) => item.id === request.resourceId);

    if (!room) {
      reasons.push(`Unknown room ID: ${request.resourceId}.`);
    } else {
      if (!room.availability.some((window) => containsWindow(window, slot))) {
        reasons.push(`Room ${request.resourceId} is unavailable.`);
      }

      if (
        hasRoomConflict(
          request.resourceId,
          slot,
          data.calendarEvents,
          options.ignoredEventId,
        )
      ) {
        reasons.push(`Room ${request.resourceId} has a conflict.`);
      }
    }
  }

  if (reasons.length > 0) {
    return { valid: false, reasons };
  }

  return { valid: true };
}

function participantRoleFor(
  request: AcceptSuggestionRequest,
  participantId: string,
): ParticipantRole {
  return request.participantRoles?.[participantId] ?? "required";
}

function isParticipantAvailable(
  participantId: string,
  slot: TimeWindow,
  data: SchedulingData,
) {
  const availability = data.participantAvailability.find(
    (entry) => entry.participantId === participantId,
  );

  if (!availability) {
    return false;
  }

  return availability.windows.some((window) => containsWindow(window, slot));
}

function hasParticipantConflict(
  participantId: string,
  slot: TimeWindow,
  events: CalendarEvent[],
  ignoredEventId: string | undefined,
) {
  return events.some(
    (event) =>
      event.id !== ignoredEventId &&
      event.participantIds.includes(participantId) && windowsOverlap(slot, event),
  );
}

function hasRoomConflict(
  roomId: string,
  slot: TimeWindow,
  events: CalendarEvent[],
  ignoredEventId: string | undefined,
) {
  return events.some(
    (event) =>
      event.id !== ignoredEventId &&
      event.resourceId === roomId &&
      windowsOverlap(slot, event),
  );
}

function containsWindow(container: TimeWindow, target: TimeWindow) {
  return container.start <= target.start && container.end >= target.end;
}

function windowsOverlap(a: TimeWindow, b: TimeWindow) {
  return a.start < b.end && b.start < a.end;
}

function unique(values: string[]) {
  return [...new Set(values)];
}
