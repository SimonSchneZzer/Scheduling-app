import { describe, expect, it } from "vitest";
import { generateScheduleSuggestions } from "./engine";
import type {
  CalendarEvent,
  EventRequest,
  ParticipantAvailability,
} from "./types";

const baseSearchWindow = {
  start: date("2026-06-08T09:00:00.000Z"),
  end: date("2026-06-08T10:00:00.000Z"),
};

const baseEventRequest: EventRequest = {
  id: "event-request-1",
  durationMinutes: 30,
  priority: "medium",
  slotIncrementMinutes: 30,
  searchWindow: baseSearchWindow,
  participants: [
    { id: "required-1", role: "required" },
    { id: "optional-1", role: "optional" },
  ],
};

const fullyAvailable: ParticipantAvailability[] = [
  {
    participantId: "required-1",
    windows: [baseSearchWindow],
  },
  {
    participantId: "optional-1",
    windows: [baseSearchWindow],
  },
];

describe("generateScheduleSuggestions", () => {
  it("filters out slots where a required participant is unavailable", () => {
    const suggestions = generateScheduleSuggestions({
      eventRequest: baseEventRequest,
      participantAvailability: [
        {
          participantId: "required-1",
          windows: [
            {
              start: date("2026-06-08T09:30:00.000Z"),
              end: date("2026-06-08T10:00:00.000Z"),
            },
          ],
        },
        {
          participantId: "optional-1",
          windows: [baseSearchWindow],
        },
      ],
      existingEvents: [],
    });

    expect(suggestions).toHaveLength(1);
    expect(suggestions[0]?.start).toEqual(date("2026-06-08T09:30:00.000Z"));
  });

  it("keeps a slot valid when an optional participant is unavailable but lowers its score", () => {
    const withOptional = generateScheduleSuggestions({
      eventRequest: baseEventRequest,
      participantAvailability: fullyAvailable,
      existingEvents: [],
      maxSuggestions: 1,
    });
    const withoutOptional = generateScheduleSuggestions({
      eventRequest: baseEventRequest,
      participantAvailability: [
        {
          participantId: "required-1",
          windows: [baseSearchWindow],
        },
        {
          participantId: "optional-1",
          windows: [],
        },
      ],
      existingEvents: [],
      maxSuggestions: 1,
    });

    expect(withOptional).toHaveLength(1);
    expect(withoutOptional).toHaveLength(1);
    expect(withOptional[0]?.score).toBeGreaterThan(withoutOptional[0]!.score);
    expect(withoutOptional[0]?.explanations).toContain(
      "0/1 optional participants available",
    );
  });

  it("adds more score for higher priority requests", () => {
    const lowPriority = generateScheduleSuggestions({
      eventRequest: { ...baseEventRequest, priority: "low" },
      participantAvailability: fullyAvailable,
      existingEvents: [],
      maxSuggestions: 1,
    });
    const urgentPriority = generateScheduleSuggestions({
      eventRequest: { ...baseEventRequest, priority: "urgent" },
      participantAvailability: fullyAvailable,
      existingEvents: [],
      maxSuggestions: 1,
    });

    expect(urgentPriority[0]!.score).toBeGreaterThan(lowPriority[0]!.score);
  });

  it("filters out slots that conflict with existing calendar events", () => {
    const existingEvents: CalendarEvent[] = [
      {
        id: "existing-1",
        participantIds: ["required-1"],
        start: date("2026-06-08T09:00:00.000Z"),
        end: date("2026-06-08T09:30:00.000Z"),
      },
    ];

    const suggestions = generateScheduleSuggestions({
      eventRequest: baseEventRequest,
      participantAvailability: fullyAvailable,
      existingEvents,
    });

    expect(suggestions).toHaveLength(1);
    expect(suggestions[0]?.start).toEqual(date("2026-06-08T09:30:00.000Z"));
  });

  it("sorts suggestions by score first and start time second", () => {
    const suggestions = generateScheduleSuggestions({
      eventRequest: baseEventRequest,
      participantAvailability: [
        {
          participantId: "required-1",
          windows: [baseSearchWindow],
        },
        {
          participantId: "optional-1",
          windows: [
            {
              start: date("2026-06-08T09:30:00.000Z"),
              end: date("2026-06-08T10:00:00.000Z"),
            },
          ],
        },
      ],
      existingEvents: [],
    });

    expect(suggestions).toHaveLength(2);
    expect(suggestions[0]?.start).toEqual(date("2026-06-08T09:30:00.000Z"));
    expect(suggestions[0]!.score).toBeGreaterThan(suggestions[1]!.score);
  });
});

function date(value: string) {
  return new Date(value);
}
