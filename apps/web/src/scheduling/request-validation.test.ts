import { describe, expect, it } from "vitest";
import {
  isAcceptSuggestionRequest,
  isUpdateCalendarEventRequest,
  parseCreateScheduleRunRequest,
} from "./request-validation";

describe("isAcceptSuggestionRequest", () => {
  const valid = {
    title: "Planning",
    participantIds: ["mara", "simon"],
    participantRoles: { mara: "required", simon: "optional" },
    resourceId: "room-a",
    start: "2026-06-08T10:00:00.000Z",
    end: "2026-06-08T10:45:00.000Z",
  };

  it("accepts a well-formed payload", () => {
    expect(isAcceptSuggestionRequest(valid)).toBe(true);
  });

  it("accepts when optional fields are omitted", () => {
    expect(
      isAcceptSuggestionRequest({
        title: "Sync",
        participantIds: ["mara"],
        start: "2026-06-08T10:00:00.000Z",
        end: "2026-06-08T10:30:00.000Z",
      }),
    ).toBe(true);
  });

  it("rejects non-objects and blank titles", () => {
    expect(isAcceptSuggestionRequest(null)).toBe(false);
    expect(isAcceptSuggestionRequest({ ...valid, title: "  " })).toBe(false);
  });

  it("rejects non-string participant IDs", () => {
    expect(
      isAcceptSuggestionRequest({ ...valid, participantIds: ["mara", 7] }),
    ).toBe(false);
  });

  it("rejects when end is not after start", () => {
    expect(
      isAcceptSuggestionRequest({
        ...valid,
        start: "2026-06-08T10:45:00.000Z",
        end: "2026-06-08T10:00:00.000Z",
      }),
    ).toBe(false);
  });

  it("rejects invalid date strings", () => {
    expect(isAcceptSuggestionRequest({ ...valid, start: "not-a-date" })).toBe(
      false,
    );
  });

  it("rejects participant role maps with unknown roles", () => {
    expect(
      isAcceptSuggestionRequest({
        ...valid,
        participantRoles: { mara: "organizer" },
      }),
    ).toBe(false);
  });
});

describe("isUpdateCalendarEventRequest", () => {
  const valid = {
    start: "2026-06-08T10:00:00.000Z",
    end: "2026-06-08T10:45:00.000Z",
  };

  it("accepts a minimal start/end payload", () => {
    expect(isUpdateCalendarEventRequest(valid)).toBe(true);
  });

  it("accepts a null resourceId (clearing the room)", () => {
    expect(isUpdateCalendarEventRequest({ ...valid, resourceId: null })).toBe(
      true,
    );
  });

  it("rejects when end is not after start", () => {
    expect(
      isUpdateCalendarEventRequest({
        start: "2026-06-08T10:45:00.000Z",
        end: "2026-06-08T10:00:00.000Z",
      }),
    ).toBe(false);
  });

  it("rejects a non-string title", () => {
    expect(isUpdateCalendarEventRequest({ ...valid, title: 7 })).toBe(false);
  });
});

describe("parseCreateScheduleRunRequest", () => {
  const validEventRequest = {
    id: "req-1",
    eventType: "timed",
    durationMinutes: 45,
    priority: "high",
    resourceRequirements: {
      mode: "offline",
      seats: 4,
      features: ["whiteboard"],
    },
    participants: [{ id: "mara", role: "required" }],
    searchWindow: {
      start: "2026-06-08T09:00:00.000Z",
      end: "2026-06-08T17:00:00.000Z",
    },
  };

  it("parses a valid payload and converts the search window to Dates", () => {
    const result = parseCreateScheduleRunRequest({
      title: "Kickoff",
      eventRequest: validEventRequest,
    });

    expect(result).not.toBeNull();
    expect(result?.eventRequest.searchWindow.start).toBeInstanceOf(Date);
    expect(result?.eventRequest.searchWindow.end).toBeInstanceOf(Date);
    expect(result?.title).toBe("Kickoff");
  });

  it("returns null for a blank title", () => {
    expect(
      parseCreateScheduleRunRequest({
        title: "   ",
        eventRequest: validEventRequest,
      }),
    ).toBeNull();
  });

  it("returns null for a non-positive duration", () => {
    expect(
      parseCreateScheduleRunRequest({
        title: "Kickoff",
        eventRequest: { ...validEventRequest, durationMinutes: 0 },
      }),
    ).toBeNull();
  });

  it("returns null when the search window is inverted", () => {
    expect(
      parseCreateScheduleRunRequest({
        title: "Kickoff",
        eventRequest: {
          ...validEventRequest,
          searchWindow: {
            start: "2026-06-08T17:00:00.000Z",
            end: "2026-06-08T09:00:00.000Z",
          },
        },
      }),
    ).toBeNull();
  });

  it("returns null for an unknown event type or invalid participant", () => {
    expect(
      parseCreateScheduleRunRequest({
        title: "Kickoff",
        eventRequest: { ...validEventRequest, eventType: "recurring" },
      }),
    ).toBeNull();
    expect(
      parseCreateScheduleRunRequest({
        title: "Kickoff",
        eventRequest: {
          ...validEventRequest,
          participants: [{ id: "mara", role: "spectator" }],
        },
      }),
    ).toBeNull();
  });
});
