import { describe, expect, it } from "vitest";
import {
  deserializeScheduleRunHistory,
  deserializeScheduleRunResponse,
  deserializeSchedulingData,
  serializeScheduleRunHistory,
  serializeScheduleRunResponse,
  serializeSchedulingData,
} from "./api-types";
import type { ScheduleRunResponse, SchedulingData } from "./api-types";

describe("scheduling API serialization", () => {
  it("serializes Date values into JSON-safe strings", () => {
    const data = createSchedulingData();

    const serialized = serializeSchedulingData(data);

    expect(serialized.participantAvailability[0]?.windows[0]?.start).toBe(
      "2026-06-08T09:00:00.000Z",
    );
    expect(serialized.rooms[0]?.availability[0]?.end).toBe(
      "2026-06-08T17:00:00.000Z",
    );
    expect(serialized.calendarEvents[0]?.start).toBe(
      "2026-06-08T10:00:00.000Z",
    );
  });

  it("deserializes JSON-safe strings into Date values for the engine", () => {
    const serialized = serializeSchedulingData(createSchedulingData());

    const deserialized = deserializeSchedulingData(serialized);

    expect(
      deserialized.participantAvailability[0]?.windows[0]?.start,
    ).toBeInstanceOf(Date);
    expect(deserialized.rooms[0]?.availability[0]?.end).toBeInstanceOf(Date);
    expect(deserialized.calendarEvents[0]?.start).toBeInstanceOf(Date);
  });

  it("serializes and deserializes stored schedule run suggestions", () => {
    const response: ScheduleRunResponse = {
      eventRequestId: "request-1",
      scheduleRunId: "run-1",
      suggestions: [
        {
          id: "suggestion-1",
          start: new Date("2026-06-08T10:00:00.000Z"),
          end: new Date("2026-06-08T10:45:00.000Z"),
          score: 65,
          explanations: ["2 required participants available"],
          assignedResource: {
            id: "room-a",
            name: "Room A",
            capacity: 8,
            features: ["whiteboard"],
            availability: [],
          },
        },
      ],
    };

    const serialized = serializeScheduleRunResponse(response);
    const deserialized = deserializeScheduleRunResponse(serialized);

    expect(serialized.suggestions[0]?.start).toBe(
      "2026-06-08T10:00:00.000Z",
    );
    expect(deserialized.suggestions[0]?.start).toBeInstanceOf(Date);
    expect(deserialized.suggestions[0]?.id).toBe("suggestion-1");
  });

  it("serializes and deserializes schedule run history timestamps", () => {
    const serialized = serializeScheduleRunHistory([
      {
        id: "run-1",
        eventRequestId: "request-1",
        title: "Planning",
        createdAt: new Date("2026-06-08T10:00:00.000Z"),
        suggestionCount: 3,
        topScore: 65,
        acceptedEventId: "accepted-1",
      },
    ]);
    const deserialized = deserializeScheduleRunHistory(serialized);

    expect(serialized[0]?.createdAt).toBe("2026-06-08T10:00:00.000Z");
    expect(deserialized[0]?.createdAt).toBeInstanceOf(Date);
    expect(deserialized[0]?.acceptedEventId).toBe("accepted-1");
  });
});

function createSchedulingData(): SchedulingData {
  return {
    teamMembers: [
      {
        id: "mara",
        name: "Mara",
        defaultRole: "required",
      },
    ],
    participantAvailability: [
      {
        participantId: "mara",
        windows: [
          {
            start: new Date("2026-06-08T09:00:00.000Z"),
            end: new Date("2026-06-08T17:00:00.000Z"),
          },
        ],
      },
    ],
    rooms: [
      {
        id: "room-a",
        name: "Room A",
        capacity: 8,
        features: ["whiteboard"],
        availability: [
          {
            start: new Date("2026-06-08T09:00:00.000Z"),
            end: new Date("2026-06-08T17:00:00.000Z"),
          },
        ],
      },
    ],
    calendarEvents: [
      {
        id: "calendar-standup",
        title: "Daily standup",
        source: "seed",
        participantIds: ["mara"],
        resourceId: "room-a",
        start: new Date("2026-06-08T10:00:00.000Z"),
        end: new Date("2026-06-08T10:30:00.000Z"),
      },
    ],
  };
}
