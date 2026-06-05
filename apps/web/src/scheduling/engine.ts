import type {
  CalendarEvent,
  EventRequest,
  GenerateScheduleSuggestionsInput,
  Participant,
  ParticipantAvailability,
  Priority,
  RoomResource,
  ScheduleSuggestion,
  TimeWindow,
} from "./types";

const DEFAULT_SLOT_INCREMENT_MINUTES = 15;
const DEFAULT_MAX_SUGGESTIONS = 5;

const PRIORITY_SCORE: Record<Priority, number> = {
  low: 5,
  medium: 15,
  high: 30,
  urgent: 45,
};

export function generateScheduleSuggestions({
  eventRequest,
  participantAvailability,
  existingEvents,
  resources,
  maxSuggestions = DEFAULT_MAX_SUGGESTIONS,
}: GenerateScheduleSuggestionsInput): ScheduleSuggestion[] {
  const candidates = generateCandidateSlots(eventRequest);

  return candidates
    .map((slot) =>
      evaluateSlot(
        slot,
        eventRequest,
        participantAvailability,
        existingEvents,
        resources,
      ),
    )
    .filter((suggestion): suggestion is ScheduleSuggestion => suggestion !== null)
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }

      return a.start.getTime() - b.start.getTime();
    })
    .slice(0, maxSuggestions);
}

export function generateCandidateSlots(eventRequest: EventRequest): TimeWindow[] {
  if (eventRequest.eventType === "all-day") {
    return generateDaySlots(eventRequest, eventRequest.durationDays ?? 1);
  }

  const incrementMinutes =
    eventRequest.slotIncrementMinutes ?? DEFAULT_SLOT_INCREMENT_MINUTES;
  const durationMs = minutesToMs(eventRequest.durationMinutes);
  const incrementMs = minutesToMs(incrementMinutes);
  const candidates: TimeWindow[] = [];

  for (
    let startMs = eventRequest.searchWindow.start.getTime();
    startMs + durationMs <= eventRequest.searchWindow.end.getTime();
    startMs += incrementMs
  ) {
    candidates.push({
      start: new Date(startMs),
      end: new Date(startMs + durationMs),
    });
  }

  return candidates;
}

function generateDaySlots(
  eventRequest: EventRequest,
  durationDays: number,
): TimeWindow[] {
  const normalizedDurationDays = Math.max(1, Math.floor(durationDays));
  const candidates: TimeWindow[] = [];
  let cursor = startOfDay(eventRequest.searchWindow.start);
  const searchEnd = startOfDay(eventRequest.searchWindow.end);

  while (cursor <= searchEnd) {
    const end = addDays(cursor, normalizedDurationDays);

    if (end <= addDays(searchEnd, 1)) {
      candidates.push({
        start: cursor,
        end,
      });
    }

    cursor = addDays(cursor, 1);
  }

  return candidates;
}

function evaluateSlot(
  slot: TimeWindow,
  eventRequest: EventRequest,
  participantAvailability: ParticipantAvailability[],
  existingEvents: CalendarEvent[],
  resources: RoomResource[],
): ScheduleSuggestion | null {
  const requiredParticipants = eventRequest.participants.filter(
    (participant) => participant.role === "required",
  );
  const optionalParticipants = eventRequest.participants.filter(
    (participant) => participant.role === "optional",
  );

  if (
    requiredParticipants.some((participant) => {
      return (
        !isParticipantAvailable(participant, slot, participantAvailability) ||
        hasParticipantEventConflict(slot, participant, existingEvents)
      );
    })
  ) {
    return null;
  }

  const availableOptionalCount = optionalParticipants.filter((participant) =>
    isParticipantAvailable(participant, slot, participantAvailability) &&
    !hasParticipantEventConflict(slot, participant, existingEvents),
  ).length;
  const optionalScore =
    optionalParticipants.length === 0
      ? 0
      : Math.round((availableOptionalCount / optionalParticipants.length) * 40);
  const priorityScore = PRIORITY_SCORE[eventRequest.priority];
  const assignedResource = findAssignedResource(
    slot,
    eventRequest,
    existingEvents,
    resources,
  );

  if (assignedResource === null) {
    return null;
  }

  const resourceScore =
    eventRequest.resourceRequirements.mode === "online" ? 0 : 10;
  const score = priorityScore + optionalScore + resourceScore;

  const explanations = [
    `${requiredParticipants.length} required participants available`,
    `${availableOptionalCount}/${optionalParticipants.length} optional participants available`,
    `${eventRequest.priority} priority adds ${priorityScore} points`,
    assignedResource
      ? `${assignedResource.name} fits room constraints`
      : "online event relaxes room constraints",
  ];

  return {
    start: slot.start,
    end: slot.end,
    score,
    explanations,
    assignedResource: assignedResource ?? undefined,
  };
}

function isParticipantAvailable(
  participant: Participant,
  slot: TimeWindow,
  availability: ParticipantAvailability[],
) {
  const participantAvailability = availability.find(
    (entry) => entry.participantId === participant.id,
  );

  if (!participantAvailability) {
    return false;
  }

  return participantAvailability.windows.some((window) =>
    containsWindow(window, slot),
  );
}

function hasParticipantEventConflict(
  slot: TimeWindow,
  participant: Participant,
  existingEvents: CalendarEvent[],
) {
  return existingEvents.some((event) => {
    const sharesParticipant = event.participantIds.includes(participant.id);

    return sharesParticipant && windowsOverlap(slot, event);
  });
}

function findAssignedResource(
  slot: TimeWindow,
  eventRequest: EventRequest,
  existingEvents: CalendarEvent[],
  resources: RoomResource[],
): RoomResource | null | undefined {
  const { resourceRequirements } = eventRequest;

  if (resourceRequirements.mode === "online") {
    return undefined;
  }

  const matchingResources = resources
    .filter((resource) => {
      return (
        resource.capacity >= resourceRequirements.seats &&
        resourceRequirements.features.every((feature) =>
          resource.features.includes(feature),
        ) &&
        resource.availability.some((window) => containsWindow(window, slot)) &&
        !hasResourceEventConflict(slot, resource, existingEvents)
      );
    })
    .sort((a, b) => {
      if (a.capacity !== b.capacity) {
        return a.capacity - b.capacity;
      }

      return a.name.localeCompare(b.name);
    });

  return matchingResources[0] ?? null;
}

function hasResourceEventConflict(
  slot: TimeWindow,
  resource: RoomResource,
  existingEvents: CalendarEvent[],
) {
  return existingEvents.some((event) => {
    return event.resourceId === resource.id && windowsOverlap(slot, event);
  });
}

function containsWindow(container: TimeWindow, target: TimeWindow) {
  return container.start <= target.start && container.end >= target.end;
}

function windowsOverlap(a: TimeWindow, b: TimeWindow) {
  return a.start < b.end && b.start < a.end;
}

function minutesToMs(minutes: number) {
  return minutes * 60 * 1000;
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}
