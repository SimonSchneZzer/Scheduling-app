import { describe, expect, it } from "vitest";
import { generateScheduleSuggestions } from "./engine";
import type {
  CalendarEvent,
  EventRequest,
  ParticipantAvailability,
  RoomResource,
} from "./types";

const baseSearchWindow = {
  start: date("2026-06-08T09:00:00.000Z"),
  end: date("2026-06-08T10:00:00.000Z"),
};

const baseEventRequest: EventRequest = {
  id: "event-request-1",
  eventType: "timed",
  durationMinutes: 30,
  priority: "medium",
  resourceRequirements: {
    mode: "online",
    seats: 0,
    features: [],
  },
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

const baseRoom: RoomResource = {
  id: "room-a",
  name: "Room A",
  capacity: 8,
  features: ["whiteboard", "screen"],
  availability: [baseSearchWindow],
};

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
      resources: [],
    });

    expect(suggestions).toHaveLength(1);
    expect(suggestions[0]?.start).toEqual(date("2026-06-08T09:30:00.000Z"));
  });

  it("keeps a slot valid when an optional participant is unavailable but lowers its score", () => {
    const withOptional = generateScheduleSuggestions({
      eventRequest: baseEventRequest,
      participantAvailability: fullyAvailable,
      existingEvents: [],
      resources: [],
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
      resources: [],
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
      resources: [],
      maxSuggestions: 1,
    });
    const urgentPriority = generateScheduleSuggestions({
      eventRequest: { ...baseEventRequest, priority: "urgent" },
      participantAvailability: fullyAvailable,
      existingEvents: [],
      resources: [],
      maxSuggestions: 1,
    });

    expect(urgentPriority[0]!.score).toBeGreaterThan(lowPriority[0]!.score);
  });

  it("filters out slots that conflict with existing calendar events", () => {
    const existingEvents: CalendarEvent[] = [
      {
        id: "existing-1",
        title: "Existing meeting",
        source: "seed",
        participantIds: ["required-1"],
        start: date("2026-06-08T09:00:00.000Z"),
        end: date("2026-06-08T09:30:00.000Z"),
      },
    ];

    const suggestions = generateScheduleSuggestions({
      eventRequest: baseEventRequest,
      participantAvailability: fullyAvailable,
      existingEvents,
      resources: [],
    });

    expect(suggestions).toHaveLength(1);
    expect(suggestions[0]?.start).toEqual(date("2026-06-08T09:30:00.000Z"));
  });

  it("keeps a slot valid when an optional participant has an existing conflict but lowers its score", () => {
    const noConflict = generateScheduleSuggestions({
      eventRequest: baseEventRequest,
      participantAvailability: fullyAvailable,
      existingEvents: [],
      resources: [],
      maxSuggestions: 2,
    });
    const optionalConflict = generateScheduleSuggestions({
      eventRequest: baseEventRequest,
      participantAvailability: fullyAvailable,
      existingEvents: [
        {
          id: "optional-conflict",
          title: "Optional conflict",
          source: "seed",
          participantIds: ["optional-1"],
          start: date("2026-06-08T09:00:00.000Z"),
          end: date("2026-06-08T09:30:00.000Z"),
        },
      ],
      resources: [],
      maxSuggestions: 2,
    });
    const noConflictFirstSlot = noConflict.find(
      (suggestion) =>
        suggestion.start.getTime() ===
        date("2026-06-08T09:00:00.000Z").getTime(),
    );
    const optionalConflictFirstSlot = optionalConflict.find(
      (suggestion) =>
        suggestion.start.getTime() ===
        date("2026-06-08T09:00:00.000Z").getTime(),
    );

    expect(optionalConflictFirstSlot).toBeDefined();
    expect(noConflictFirstSlot!.score).toBeGreaterThan(
      optionalConflictFirstSlot!.score,
    );
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
      resources: [],
    });

    expect(suggestions).toHaveLength(2);
    expect(suggestions[0]?.start).toEqual(date("2026-06-08T09:30:00.000Z"));
    expect(suggestions[0]!.score).toBeGreaterThan(suggestions[1]!.score);
  });

  it("filters out offline slots when no room has enough seats", () => {
    const suggestions = generateScheduleSuggestions({
      eventRequest: {
        ...baseEventRequest,
        resourceRequirements: {
          mode: "offline",
          seats: 10,
          features: [],
        },
      },
      participantAvailability: fullyAvailable,
      existingEvents: [],
      resources: [baseRoom],
    });

    expect(suggestions).toHaveLength(0);
  });

  it("filters out offline slots when no room has a required feature", () => {
    const suggestions = generateScheduleSuggestions({
      eventRequest: {
        ...baseEventRequest,
        resourceRequirements: {
          mode: "offline",
          seats: 4,
          features: ["video"],
        },
      },
      participantAvailability: fullyAvailable,
      existingEvents: [],
      resources: [baseRoom],
    });

    expect(suggestions).toHaveLength(0);
  });

  it("ignores room constraints for online events", () => {
    const suggestions = generateScheduleSuggestions({
      eventRequest: {
        ...baseEventRequest,
        resourceRequirements: {
          mode: "online",
          seats: 99,
          features: ["video"],
        },
      },
      participantAvailability: fullyAvailable,
      existingEvents: [],
      resources: [],
      maxSuggestions: 1,
    });

    expect(suggestions).toHaveLength(1);
    expect(suggestions[0]?.assignedResource).toBeUndefined();
    expect(suggestions[0]?.explanations).toContain(
      "online event relaxes room constraints",
    );
  });

  it("returns the fitting room for offline events", () => {
    const suggestions = generateScheduleSuggestions({
      eventRequest: {
        ...baseEventRequest,
        resourceRequirements: {
          mode: "offline",
          seats: 6,
          features: ["whiteboard"],
        },
      },
      participantAvailability: fullyAvailable,
      existingEvents: [],
      resources: [baseRoom],
      maxSuggestions: 1,
    });

    expect(suggestions).toHaveLength(1);
    expect(suggestions[0]?.assignedResource?.id).toBe("room-a");
    expect(suggestions[0]?.explanations).toContain(
      "Room A fits room constraints",
    );
  });

  it("filters out rooms already booked for the candidate slot", () => {
    const suggestions = generateScheduleSuggestions({
      eventRequest: {
        ...baseEventRequest,
        resourceRequirements: {
          mode: "offline",
          seats: 6,
          features: ["whiteboard"],
        },
      },
      participantAvailability: fullyAvailable,
      existingEvents: [
        {
          id: "room-booking",
          title: "Room booking",
          source: "seed",
          participantIds: [],
          resourceId: "room-a",
          start: date("2026-06-08T09:00:00.000Z"),
          end: date("2026-06-08T10:00:00.000Z"),
        },
      ],
      resources: [baseRoom],
    });

    expect(suggestions).toHaveLength(0);
  });

  it("generates all-day candidates as whole-day slots", () => {
    const suggestions = generateScheduleSuggestions({
      eventRequest: {
        ...baseEventRequest,
        eventType: "all-day",
        searchWindow: {
          start: date("2026-06-08T09:00:00.000Z"),
          end: date("2026-06-09T17:00:00.000Z"),
        },
      },
      participantAvailability: [
        {
          participantId: "required-1",
          windows: [
            {
              start: date("2026-06-08T00:00:00"),
              end: date("2026-06-10T00:00:00"),
            },
          ],
        },
        {
          participantId: "optional-1",
          windows: [
            {
              start: date("2026-06-08T00:00:00"),
              end: date("2026-06-10T00:00:00"),
            },
          ],
        },
      ],
      existingEvents: [],
      resources: [],
    });

    expect(suggestions).toHaveLength(2);
    expect(suggestions[0]?.start).toEqual(date("2026-06-08T00:00:00"));
    expect(suggestions[0]?.end).toEqual(date("2026-06-09T00:00:00"));
    expect(suggestions[1]?.start).toEqual(date("2026-06-09T00:00:00"));
    expect(suggestions[1]?.end).toEqual(date("2026-06-10T00:00:00"));
  });

  it("generates multi-day candidates as contiguous day blocks", () => {
    const suggestions = generateScheduleSuggestions({
      eventRequest: {
        ...baseEventRequest,
        eventType: "multi-day",
        durationDays: 2,
        searchWindow: {
          start: date("2026-06-08T09:00:00.000Z"),
          end: date("2026-06-10T17:00:00.000Z"),
        },
      },
      participantAvailability: [
        {
          participantId: "required-1",
          windows: [
            {
              start: date("2026-06-08T00:00:00"),
              end: date("2026-06-11T00:00:00"),
            },
          ],
        },
        {
          participantId: "optional-1",
          windows: [
            {
              start: date("2026-06-08T00:00:00"),
              end: date("2026-06-11T00:00:00"),
            },
          ],
        },
      ],
      existingEvents: [],
      resources: [],
    });

    expect(suggestions).toHaveLength(2);
    expect(suggestions[0]?.start).toEqual(date("2026-06-08T00:00:00"));
    expect(suggestions[0]?.end).toEqual(date("2026-06-10T00:00:00"));
    expect(suggestions[1]?.start).toEqual(date("2026-06-09T00:00:00"));
    expect(suggestions[1]?.end).toEqual(date("2026-06-11T00:00:00"));
  });

  it("filters out all-day candidates when a required participant has a conflict that day", () => {
    const suggestions = generateScheduleSuggestions({
      eventRequest: {
        ...baseEventRequest,
        eventType: "all-day",
        searchWindow: {
          start: date("2026-06-08T09:00:00.000Z"),
          end: date("2026-06-09T17:00:00.000Z"),
        },
      },
      participantAvailability: [
        {
          participantId: "required-1",
          windows: [
            {
              start: date("2026-06-08T00:00:00"),
              end: date("2026-06-10T00:00:00"),
            },
          ],
        },
        {
          participantId: "optional-1",
          windows: [
            {
              start: date("2026-06-08T00:00:00"),
              end: date("2026-06-10T00:00:00"),
            },
          ],
        },
      ],
      existingEvents: [
        {
          id: "required-day-conflict",
          title: "Required conflict",
          source: "seed",
          participantIds: ["required-1"],
          start: date("2026-06-08T13:00:00.000Z"),
          end: date("2026-06-08T14:00:00.000Z"),
        },
      ],
      resources: [],
    });

    expect(suggestions).toHaveLength(1);
    expect(suggestions[0]?.start).toEqual(date("2026-06-09T00:00:00"));
  });

  it("keeps all-day candidates valid when optional participants conflict but lowers score", () => {
    const noConflict = generateScheduleSuggestions({
      eventRequest: {
        ...baseEventRequest,
        eventType: "all-day",
        searchWindow: {
          start: date("2026-06-08T09:00:00.000Z"),
          end: date("2026-06-08T17:00:00.000Z"),
        },
      },
      participantAvailability: [
        {
          participantId: "required-1",
          windows: [
            {
              start: date("2026-06-08T00:00:00"),
              end: date("2026-06-09T00:00:00"),
            },
          ],
        },
        {
          participantId: "optional-1",
          windows: [
            {
              start: date("2026-06-08T00:00:00"),
              end: date("2026-06-09T00:00:00"),
            },
          ],
        },
      ],
      existingEvents: [],
      resources: [],
    });
    const optionalConflict = generateScheduleSuggestions({
      eventRequest: {
        ...baseEventRequest,
        eventType: "all-day",
        searchWindow: {
          start: date("2026-06-08T09:00:00.000Z"),
          end: date("2026-06-08T17:00:00.000Z"),
        },
      },
      participantAvailability: [
        {
          participantId: "required-1",
          windows: [
            {
              start: date("2026-06-08T00:00:00"),
              end: date("2026-06-09T00:00:00"),
            },
          ],
        },
        {
          participantId: "optional-1",
          windows: [
            {
              start: date("2026-06-08T00:00:00"),
              end: date("2026-06-09T00:00:00"),
            },
          ],
        },
      ],
      existingEvents: [
        {
          id: "optional-day-conflict",
          title: "Optional conflict",
          source: "seed",
          participantIds: ["optional-1"],
          start: date("2026-06-08T13:00:00.000Z"),
          end: date("2026-06-08T14:00:00.000Z"),
        },
      ],
      resources: [],
    });

    expect(optionalConflict).toHaveLength(1);
    expect(noConflict[0]!.score).toBeGreaterThan(optionalConflict[0]!.score);
  });
});

function date(value: string) {
  return new Date(value);
}
