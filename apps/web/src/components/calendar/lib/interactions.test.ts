import { describe, expect, it } from "vitest";
import type { CalendarEvent } from "@/scheduling";
import {
  hasRequiredConflict,
  interactionReducer,
  type Interaction,
} from "./interactions";

function event(
  id: string,
  start: string,
  end: string,
  overrides: Partial<CalendarEvent> = {},
): CalendarEvent {
  return {
    id,
    title: id,
    source: "accepted",
    participantIds: [],
    start: new Date(start),
    end: new Date(end),
    ...overrides,
  };
}

const idle: Interaction = { kind: "idle" };

describe("interactionReducer", () => {
  it("transitions idle -> moving and updates the candidate range", () => {
    const target = event("a", "2026-06-08T09:00:00", "2026-06-08T10:00:00");

    const moving = interactionReducer(idle, { type: "beginMove", event: target });
    expect(moving.kind).toBe("moving");
    if (moving.kind !== "moving") throw new Error("unreachable");
    expect(moving.start).toEqual(target.start);

    const updated = interactionReducer(moving, {
      type: "updateMove",
      start: new Date("2026-06-08T11:00:00"),
      end: new Date("2026-06-08T12:00:00"),
    });
    if (updated.kind !== "moving") throw new Error("unreachable");
    expect(updated.start.getHours()).toBe(11);
    expect(updated.end.getHours()).toBe(12);
  });

  it("enforces 15 minute minimum on resize", () => {
    const target = event("a", "2026-06-08T09:00:00", "2026-06-08T10:00:00");
    const resizing = interactionReducer(idle, {
      type: "beginResize",
      event: target,
    });

    const tooShort = interactionReducer(resizing, {
      type: "updateResize",
      end: new Date("2026-06-08T09:05:00"),
    });
    if (tooShort.kind !== "resizing") throw new Error("unreachable");
    expect(tooShort.end.getMinutes()).toBe(15);
  });

  it("creates a range and flips direction when dragged above the anchor", () => {
    const anchor = new Date("2026-06-08T10:00:00");
    const begin = interactionReducer(idle, { type: "beginCreate", anchor });
    if (begin.kind !== "creating") throw new Error("unreachable");
    expect(begin.start).toEqual(anchor);

    const downward = interactionReducer(begin, {
      type: "updateCreate",
      cursor: new Date("2026-06-08T11:30:00"),
    });
    if (downward.kind !== "creating") throw new Error("unreachable");
    expect(downward.start.getHours()).toBe(10);
    expect(downward.end.getHours()).toBe(11);
    expect(downward.end.getMinutes()).toBe(30);

    const upward = interactionReducer(begin, {
      type: "updateCreate",
      cursor: new Date("2026-06-08T09:15:00"),
    });
    if (upward.kind !== "creating") throw new Error("unreachable");
    expect(upward.start.getHours()).toBe(9);
    expect(upward.end.getHours()).toBe(10);
  });

  it("ignores update actions when the state doesn't match", () => {
    expect(
      interactionReducer(idle, {
        type: "updateMove",
        start: new Date(),
        end: new Date(),
      }),
    ).toBe(idle);
  });

  it("returns to idle on the idle action", () => {
    const anchor = new Date("2026-06-08T10:00:00");
    const creating = interactionReducer(idle, {
      type: "beginCreate",
      anchor,
    });
    expect(interactionReducer(creating, { type: "idle" })).toEqual(idle);
  });
});

describe("hasRequiredConflict", () => {
  it("detects an overlap with a required participant", () => {
    const existing = event(
      "existing",
      "2026-06-08T09:00:00",
      "2026-06-08T10:00:00",
      { participantIds: ["alice"] },
    );
    expect(
      hasRequiredConflict(
        [existing],
        new Date("2026-06-08T09:30:00"),
        new Date("2026-06-08T10:30:00"),
        ["alice"],
      ),
    ).toBe(true);
  });

  it("ignores the moving event itself", () => {
    const moving = event(
      "moving",
      "2026-06-08T09:00:00",
      "2026-06-08T10:00:00",
      { participantIds: ["alice"] },
    );
    expect(
      hasRequiredConflict(
        [moving],
        new Date("2026-06-08T09:30:00"),
        new Date("2026-06-08T10:30:00"),
        ["alice"],
        "moving",
      ),
    ).toBe(false);
  });

  it("returns false when no participants are required", () => {
    const existing = event("existing", "2026-06-08T09:00:00", "2026-06-08T10:00:00");
    expect(
      hasRequiredConflict(
        [existing],
        new Date("2026-06-08T09:00:00"),
        new Date("2026-06-08T10:00:00"),
        [],
      ),
    ).toBe(false);
  });
});
