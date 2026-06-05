import { describe, expect, it } from "vitest";
import {
  deserializeSchedulingData,
  serializeSchedulingData,
} from "./api-types";
import type { SchedulingData } from "./api-types";

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
