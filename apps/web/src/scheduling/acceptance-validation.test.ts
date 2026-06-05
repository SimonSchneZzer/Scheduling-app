import { describe, expect, it } from "vitest";
import { validateAcceptedCalendarEvent } from "./acceptance-validation";
import type { AcceptSuggestionRequest, SchedulingData } from "./api-types";

describe("accepted calendar event validation", () => {
  it("accepts a slot when required participants and the selected room are free", () => {
    const result = validateAcceptedCalendarEvent(
      createRequest({
        start: "2026-06-08T10:00:00.000Z",
        end: "2026-06-08T10:45:00.000Z",
        participantIds: ["mara", "simon"],
        participantRoles: { mara: "required", simon: "optional" },
        resourceId: "room-a",
      }),
      createSchedulingData(),
    );

    expect(result).toEqual({ valid: true });
  });

  it("rejects a slot when a required participant is unavailable", () => {
    const result = validateAcceptedCalendarEvent(
      createRequest({
        start: "2026-06-08T08:00:00.000Z",
        end: "2026-06-08T08:45:00.000Z",
        participantIds: ["mara"],
      }),
      createSchedulingData(),
    );

    expect(result.valid).toBe(false);
    expect(result.valid ? [] : result.reasons).toContain(
      "Required participant mara is unavailable.",
    );
  });

  it("rejects a slot when a required participant already has an event", () => {
    const result = validateAcceptedCalendarEvent(
      createRequest({
        start: "2026-06-08T09:15:00.000Z",
        end: "2026-06-08T09:45:00.000Z",
        participantIds: ["mara"],
      }),
      createSchedulingData(),
    );

    expect(result.valid).toBe(false);
    expect(result.valid ? [] : result.reasons).toContain(
      "Required participant mara has a conflict.",
    );
  });

  it("allows optional participant conflicts without invalidating the slot", () => {
    const result = validateAcceptedCalendarEvent(
      createRequest({
        start: "2026-06-08T09:15:00.000Z",
        end: "2026-06-08T09:45:00.000Z",
        participantIds: ["mara", "simon"],
        participantRoles: { mara: "optional", simon: "required" },
      }),
      createSchedulingData(),
    );

    expect(result).toEqual({ valid: true });
  });

  it("rejects unknown participants and duplicate participant IDs", () => {
    const result = validateAcceptedCalendarEvent(
      createRequest({
        participantIds: ["mara", "mara", "unknown"],
      }),
      createSchedulingData(),
    );

    expect(result.valid).toBe(false);
    expect(result.valid ? [] : result.reasons).toContain(
      "Participant list contains duplicates.",
    );
    expect(result.valid ? [] : result.reasons).toContain(
      "Unknown participant IDs: unknown.",
    );
  });

  it("rejects a selected room when it is unavailable or already booked", () => {
    const data = createSchedulingData();

    const unavailable = validateAcceptedCalendarEvent(
      createRequest({
        start: "2026-06-08T17:00:00.000Z",
        end: "2026-06-08T17:30:00.000Z",
        resourceId: "room-a",
      }),
      data,
    );
    const booked = validateAcceptedCalendarEvent(
      createRequest({
        start: "2026-06-08T09:15:00.000Z",
        end: "2026-06-08T09:45:00.000Z",
        participantIds: ["simon"],
        resourceId: "room-a",
      }),
      data,
    );

    expect(unavailable.valid ? [] : unavailable.reasons).toContain(
      "Room room-a is unavailable.",
    );
    expect(booked.valid ? [] : booked.reasons).toContain(
      "Room room-a has a conflict.",
    );
  });

  it("ignores the current event when validating an update", () => {
    const result = validateAcceptedCalendarEvent(
      createRequest({
        start: "2026-06-08T09:00:00.000Z",
        end: "2026-06-08T09:30:00.000Z",
        participantIds: ["mara"],
        resourceId: "room-a",
      }),
      createSchedulingData(),
      { ignoredEventId: "standup" },
    );

    expect(result).toEqual({ valid: true });
  });

  it("still rejects other participant and room conflicts during an update", () => {
    const data = createSchedulingData({
      calendarEvents: [
        {
          id: "current",
          title: "Current",
          source: "accepted",
          participantIds: ["simon"],
          resourceId: "room-a",
          start: new Date("2026-06-08T10:00:00.000Z"),
          end: new Date("2026-06-08T10:45:00.000Z"),
        },
        {
          id: "other",
          title: "Other",
          source: "accepted",
          participantIds: ["simon"],
          resourceId: "room-a",
          start: new Date("2026-06-08T11:00:00.000Z"),
          end: new Date("2026-06-08T11:45:00.000Z"),
        },
      ],
    });

    const result = validateAcceptedCalendarEvent(
      createRequest({
        start: "2026-06-08T11:15:00.000Z",
        end: "2026-06-08T11:30:00.000Z",
        participantIds: ["simon"],
        resourceId: "room-a",
      }),
      data,
      { ignoredEventId: "current" },
    );

    expect(result.valid).toBe(false);
    expect(result.valid ? [] : result.reasons).toContain(
      "Required participant simon has a conflict.",
    );
    expect(result.valid ? [] : result.reasons).toContain(
      "Room room-a has a conflict.",
    );
  });
});

function createRequest(
  overrides: Partial<AcceptSuggestionRequest>,
): AcceptSuggestionRequest {
  return {
    title: "Planning",
    participantIds: ["mara"],
    start: "2026-06-08T10:00:00.000Z",
    end: "2026-06-08T10:45:00.000Z",
    ...overrides,
  };
}

function createSchedulingData(
  overrides: Partial<SchedulingData> = {},
): SchedulingData {
  const data: SchedulingData = {
    teamMembers: [
      { id: "mara", name: "Mara", defaultRole: "required" },
      { id: "simon", name: "Simon", defaultRole: "required" },
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
      {
        participantId: "simon",
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
        id: "standup",
        title: "Standup",
        source: "seed",
        participantIds: ["mara"],
        resourceId: "room-a",
        start: new Date("2026-06-08T09:00:00.000Z"),
        end: new Date("2026-06-08T09:30:00.000Z"),
      },
    ],
  };

  return {
    ...data,
    ...overrides,
  };
}
