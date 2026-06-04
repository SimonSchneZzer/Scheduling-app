import type {
  CalendarEvent,
  EventRequest,
  GenerateScheduleSuggestionsInput,
  Participant,
  ParticipantAvailability,
  Priority,
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
  maxSuggestions = DEFAULT_MAX_SUGGESTIONS,
}: GenerateScheduleSuggestionsInput): ScheduleSuggestion[] {
  const candidates = generateCandidateSlots(eventRequest);

  return candidates
    .map((slot) =>
      evaluateSlot(slot, eventRequest, participantAvailability, existingEvents),
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

function evaluateSlot(
  slot: TimeWindow,
  eventRequest: EventRequest,
  participantAvailability: ParticipantAvailability[],
  existingEvents: CalendarEvent[],
): ScheduleSuggestion | null {
  const requiredParticipants = eventRequest.participants.filter(
    (participant) => participant.role === "required",
  );
  const optionalParticipants = eventRequest.participants.filter(
    (participant) => participant.role === "optional",
  );

  if (
    requiredParticipants.some(
      (participant) =>
        !isParticipantAvailable(participant, slot, participantAvailability),
    )
  ) {
    return null;
  }

  if (hasExistingEventConflict(slot, eventRequest.participants, existingEvents)) {
    return null;
  }

  const availableOptionalCount = optionalParticipants.filter((participant) =>
    isParticipantAvailable(participant, slot, participantAvailability),
  ).length;
  const optionalScore =
    optionalParticipants.length === 0
      ? 0
      : Math.round((availableOptionalCount / optionalParticipants.length) * 40);
  const priorityScore = PRIORITY_SCORE[eventRequest.priority];
  const score = priorityScore + optionalScore;

  const explanations = [
    `${requiredParticipants.length} required participants available`,
    `${availableOptionalCount}/${optionalParticipants.length} optional participants available`,
    `${eventRequest.priority} priority adds ${priorityScore} points`,
  ];

  return {
    start: slot.start,
    end: slot.end,
    score,
    explanations,
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

function hasExistingEventConflict(
  slot: TimeWindow,
  participants: Participant[],
  existingEvents: CalendarEvent[],
) {
  const participantIds = new Set(participants.map((participant) => participant.id));

  return existingEvents.some((event) => {
    const sharesParticipant = event.participantIds.some((participantId) =>
      participantIds.has(participantId),
    );

    return sharesParticipant && windowsOverlap(slot, event);
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
