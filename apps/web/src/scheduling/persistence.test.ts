import { describe, expect, it } from "vitest";
import {
  deserializeAcceptedEvents,
  serializeAcceptedEvents,
} from "./persistence";
import type { CalendarEvent } from "./types";

const acceptedEvent: CalendarEvent = {
  id: "accepted-1",
  title: "Workshop planning slot",
  source: "accepted",
  participantIds: ["mara", "simon"],
  resourceId: "room-a",
  start: new Date("2026-06-08T10:00:00.000Z"),
  end: new Date("2026-06-08T10:45:00.000Z"),
};

const seedEvent: CalendarEvent = {
  id: "seed-1",
  title: "Standup",
  source: "seed",
  participantIds: ["mara"],
  start: new Date("2026-06-08T09:00:00.000Z"),
  end: new Date("2026-06-08T09:30:00.000Z"),
};

describe("accepted event persistence", () => {
  it("serializes and deserializes accepted events with dates", () => {
    const restored = deserializeAcceptedEvents(
      serializeAcceptedEvents([acceptedEvent]),
    );

    expect(restored).toEqual([acceptedEvent]);
    expect(restored[0]?.start).toBeInstanceOf(Date);
    expect(restored[0]?.end).toBeInstanceOf(Date);
  });

  it("does not serialize seed events", () => {
    const restored = deserializeAcceptedEvents(
      serializeAcceptedEvents([seedEvent, acceptedEvent]),
    );

    expect(restored).toEqual([acceptedEvent]);
  });

  it("returns an empty list for missing or invalid payloads", () => {
    expect(deserializeAcceptedEvents(null)).toEqual([]);
    expect(deserializeAcceptedEvents("not-json")).toEqual([]);
    expect(deserializeAcceptedEvents(JSON.stringify({ version: 999 }))).toEqual(
      [],
    );
  });
});
