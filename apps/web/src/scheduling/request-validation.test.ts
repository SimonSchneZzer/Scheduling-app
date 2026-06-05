import { describe, expect, it } from "vitest";
import {
  isAcceptSuggestionRequest,
  isUpdateCalendarEventRequest,
  parseCreateScheduleRunRequest,
  parseFeatureInput,
  parseParticipantInput,
  parseRoomInput,
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

  it("accepts an optional string description and rejects a non-string one", () => {
    expect(isAcceptSuggestionRequest({ ...valid, description: "Notes" })).toBe(
      true,
    );
    expect(isAcceptSuggestionRequest({ ...valid, description: 7 })).toBe(false);
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

  it("accepts a null or string description and rejects other types", () => {
    expect(isUpdateCalendarEventRequest({ ...valid, description: null })).toBe(
      true,
    );
    expect(
      isUpdateCalendarEventRequest({ ...valid, description: "Notes" }),
    ).toBe(true);
    expect(isUpdateCalendarEventRequest({ ...valid, description: 7 })).toBe(
      false,
    );
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

describe("parseParticipantInput", () => {
  it("parses a valid participant with availability", () => {
    const result = parseParticipantInput({
      name: "Mara",
      defaultRole: "required",
      availability: [
        { start: "2026-06-08T09:00:00.000Z", end: "2026-06-08T17:00:00.000Z" },
      ],
    });
    expect(result).not.toBeNull();
    expect(result?.availability).toHaveLength(1);
  });

  it("defaults availability to an empty list when omitted", () => {
    const result = parseParticipantInput({ name: "Lea", defaultRole: "optional" });
    expect(result?.availability).toEqual([]);
  });

  it("rejects a blank name, unknown role, or inverted window", () => {
    expect(
      parseParticipantInput({ name: "  ", defaultRole: "required" }),
    ).toBeNull();
    expect(parseParticipantInput({ name: "X", defaultRole: "boss" })).toBeNull();
    expect(
      parseParticipantInput({
        name: "X",
        defaultRole: "required",
        availability: [{ start: "2026-06-08T17:00:00.000Z", end: "2026-06-08T09:00:00.000Z" }],
      }),
    ).toBeNull();
  });
});

describe("parseRoomInput", () => {
  it("parses a valid room and floors capacity", () => {
    const result = parseRoomInput({
      name: "Room A",
      capacity: 8.6,
      featureIds: ["whiteboard"],
      availability: [],
    });
    expect(result?.capacity).toBe(8);
    expect(result?.featureIds).toEqual(["whiteboard"]);
  });

  it("rejects negative capacity or non-string feature ids", () => {
    expect(
      parseRoomInput({ name: "R", capacity: -1, featureIds: [] }),
    ).toBeNull();
    expect(
      parseRoomInput({ name: "R", capacity: 4, featureIds: [7] }),
    ).toBeNull();
  });
});

describe("parseFeatureInput", () => {
  it("accepts a non-empty label and rejects a blank one", () => {
    expect(parseFeatureInput({ label: "Projector" })).toEqual({
      label: "Projector",
    });
    expect(parseFeatureInput({ label: "   " })).toBeNull();
    expect(parseFeatureInput({})).toBeNull();
  });
});
