import { describe, expect, it } from "vitest";
import type { CalendarEvent } from "@/scheduling";
import {
  allDaySpan,
  assignColumns,
  dateFromGridOffset,
  eventsForDay,
  isAllDayEvent,
  packAllDayRows,
  positionInGrid,
  snapMinutes,
  splitEvents,
  visibleHourRange,
} from "./layout";

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

describe("isAllDayEvent", () => {
  it("is true for a midnight-to-midnight range", () => {
    expect(
      isAllDayEvent(
        new Date("2026-06-08T00:00:00"),
        new Date("2026-06-09T00:00:00"),
      ),
    ).toBe(true);
  });

  it("is false for a timed range", () => {
    expect(
      isAllDayEvent(
        new Date("2026-06-08T09:00:00"),
        new Date("2026-06-08T09:30:00"),
      ),
    ).toBe(false);
  });
});

describe("splitEvents", () => {
  it("partitions events into all-day and timed groups", () => {
    const allDay = event("allday", "2026-06-08T00:00:00", "2026-06-09T00:00:00");
    const timed = event("timed", "2026-06-08T09:00:00", "2026-06-08T10:00:00");

    const result = splitEvents([allDay, timed]);

    expect(result.allDay.map((item) => item.id)).toEqual(["allday"]);
    expect(result.timed.map((item) => item.id)).toEqual(["timed"]);
  });
});

describe("eventsForDay", () => {
  it("returns only events intersecting the given day", () => {
    const onDay = event("on", "2026-06-09T09:00:00", "2026-06-09T10:00:00");
    const otherDay = event("off", "2026-06-10T09:00:00", "2026-06-10T10:00:00");

    const result = eventsForDay([onDay, otherDay], new Date("2026-06-09T00:00:00"));

    expect(result.map((item) => item.id)).toEqual(["on"]);
  });
});

describe("positionInGrid", () => {
  const dayMidnight = new Date("2026-06-08T00:00:00");

  it("places an event proportionally within the window", () => {
    // 08:00–18:00 window (600 min). 09:00–10:00 → top 1/10, height 1/10.
    const { top, height } = positionInGrid(
      new Date("2026-06-08T09:00:00"),
      new Date("2026-06-08T10:00:00"),
      dayMidnight,
      8,
      18,
    );

    expect(top).toBeCloseTo(0.1, 5);
    expect(height).toBeCloseTo(0.1, 5);
  });

  it("clamps an event that starts before the window", () => {
    const { top, height } = positionInGrid(
      new Date("2026-06-08T06:00:00"),
      new Date("2026-06-08T09:00:00"),
      dayMidnight,
      8,
      18,
    );

    expect(top).toBe(0);
    expect(height).toBeCloseTo(0.1, 5);
  });

  it("clamps an event that ends after the window", () => {
    const { top, height } = positionInGrid(
      new Date("2026-06-08T17:00:00"),
      new Date("2026-06-08T20:00:00"),
      dayMidnight,
      8,
      18,
    );

    expect(top).toBeCloseTo(0.9, 5);
    expect(height).toBeCloseTo(0.1, 5);
  });
});

describe("snapMinutes", () => {
  it("snaps to the nearest multiple", () => {
    expect(snapMinutes(7, 15)).toBe(0);
    expect(snapMinutes(8, 15)).toBe(15);
    expect(snapMinutes(22, 15)).toBe(15);
    expect(snapMinutes(23, 15)).toBe(30);
  });

  it("passes the value through when snap is zero", () => {
    expect(snapMinutes(13.7, 0)).toBe(13.7);
  });
});

describe("dateFromGridOffset", () => {
  const dayMidnight = new Date("2026-06-08T00:00:00");

  it("returns the window start at fraction 0", () => {
    const date = dateFromGridOffset(dayMidnight, 0, 8, 18, 15);
    expect(date.getHours()).toBe(8);
    expect(date.getMinutes()).toBe(0);
  });

  it("snaps mid-window offsets to 15 minutes", () => {
    // 0.5 of 8-18 window → 13:00 sharp.
    const date = dateFromGridOffset(dayMidnight, 0.5, 8, 18, 15);
    expect(date.getHours()).toBe(13);
    expect(date.getMinutes()).toBe(0);
  });

  it("clamps negative fractions to the window start", () => {
    const date = dateFromGridOffset(dayMidnight, -0.5, 8, 18, 15);
    expect(date.getHours()).toBe(8);
    expect(date.getMinutes()).toBe(0);
  });

  it("clamps fractions above 1 to the window end", () => {
    const date = dateFromGridOffset(dayMidnight, 1.2, 8, 18, 15);
    expect(date.getHours()).toBe(18);
    expect(date.getMinutes()).toBe(0);
  });

  it("snaps to the configured increment", () => {
    // 0.02 of the 8-18 window (600 min) → 12 min → snaps to 15.
    const date = dateFromGridOffset(dayMidnight, 0.02, 8, 18, 15);
    expect(date.getHours()).toBe(8);
    expect(date.getMinutes()).toBe(15);
  });
});

describe("assignColumns", () => {
  it("places two overlapping events in adjacent columns", () => {
    const a = event("a", "2026-06-08T09:00:00", "2026-06-08T10:00:00");
    const b = event("b", "2026-06-08T09:30:00", "2026-06-08T10:30:00");

    const result = assignColumns([a, b]);
    const byId = indexById(result);

    expect(byId.a.column).toBe(0);
    expect(byId.b.column).toBe(1);
    expect(byId.a.columnCount).toBe(2);
    expect(byId.b.columnCount).toBe(2);
  });

  it("gives a third overlapping event its own column", () => {
    const a = event("a", "2026-06-08T09:00:00", "2026-06-08T12:00:00");
    const b = event("b", "2026-06-08T09:30:00", "2026-06-08T11:00:00");
    const c = event("c", "2026-06-08T10:00:00", "2026-06-08T10:45:00");

    const result = assignColumns([a, b, c]);
    const byId = indexById(result);

    expect(byId.a.column).toBe(0);
    expect(byId.b.column).toBe(1);
    expect(byId.c.column).toBe(2);
    expect(byId.a.columnCount).toBe(3);
    expect(byId.b.columnCount).toBe(3);
    expect(byId.c.columnCount).toBe(3);
  });

  it("reuses column 0 for a later non-overlapping event", () => {
    const a = event("a", "2026-06-08T09:00:00", "2026-06-08T10:00:00");
    const b = event("b", "2026-06-08T11:00:00", "2026-06-08T12:00:00");

    const result = assignColumns([a, b]);
    const byId = indexById(result);

    expect(byId.a.column).toBe(0);
    expect(byId.b.column).toBe(0);
    expect(byId.a.columnCount).toBe(1);
    expect(byId.b.columnCount).toBe(1);
  });
});

describe("visibleHourRange", () => {
  it("returns the default window when events fit inside it", () => {
    const result = visibleHourRange([
      event("a", "2026-06-08T09:00:00", "2026-06-08T10:00:00"),
    ]);

    expect(result).toEqual({ startHour: 8, endHour: 18 });
  });

  it("expands to include early and late events", () => {
    const result = visibleHourRange([
      event("early", "2026-06-08T06:30:00", "2026-06-08T07:00:00"),
      event("late", "2026-06-08T18:15:00", "2026-06-08T19:45:00"),
    ]);

    expect(result.startHour).toBe(6);
    expect(result.endHour).toBe(20);
  });

  it("does not pad an event ending exactly on the hour", () => {
    const result = visibleHourRange([
      event("a", "2026-06-08T08:00:00", "2026-06-08T18:00:00"),
    ]);

    expect(result).toEqual({ startHour: 8, endHour: 18 });
  });
});

describe("allDaySpan", () => {
  const week = [
    "2026-06-08",
    "2026-06-09",
    "2026-06-10",
    "2026-06-11",
    "2026-06-12",
    "2026-06-13",
    "2026-06-14",
  ].map((day) => new Date(`${day}T00:00:00`));

  it("spans a single day for a one-day all-day event", () => {
    const span = allDaySpan(
      event("a", "2026-06-09T00:00:00", "2026-06-10T00:00:00"),
      week,
    );

    expect(span).toEqual({ startIndex: 1, span: 1 });
  });

  it("spans multiple days for a multi-day event", () => {
    const span = allDaySpan(
      event("a", "2026-06-08T00:00:00", "2026-06-11T00:00:00"),
      week,
    );

    expect(span).toEqual({ startIndex: 0, span: 3 });
  });

  it("clips a span to the visible week", () => {
    const span = allDaySpan(
      event("a", "2026-06-13T00:00:00", "2026-06-20T00:00:00"),
      week,
    );

    expect(span).toEqual({ startIndex: 5, span: 2 });
  });

  it("returns null when the event is outside the week", () => {
    const span = allDaySpan(
      event("a", "2026-07-01T00:00:00", "2026-07-02T00:00:00"),
      week,
    );

    expect(span).toBeNull();
  });
});

describe("packAllDayRows", () => {
  const week = [
    "2026-06-08",
    "2026-06-09",
    "2026-06-10",
    "2026-06-11",
    "2026-06-12",
    "2026-06-13",
    "2026-06-14",
  ].map((day) => new Date(`${day}T00:00:00`));

  it("packs non-overlapping bars into a single row", () => {
    const rows = packAllDayRows(
      [
        event("a", "2026-06-08T00:00:00", "2026-06-09T00:00:00"),
        event("b", "2026-06-10T00:00:00", "2026-06-11T00:00:00"),
      ],
      week,
    );

    expect(rows).toHaveLength(1);
    expect(rows[0].map((item) => item.event.id)).toEqual(["a", "b"]);
  });

  it("pushes overlapping bars onto separate rows", () => {
    const rows = packAllDayRows(
      [
        event("a", "2026-06-08T00:00:00", "2026-06-11T00:00:00"),
        event("b", "2026-06-09T00:00:00", "2026-06-10T00:00:00"),
      ],
      week,
    );

    expect(rows).toHaveLength(2);
  });
});

function indexById(positioned: ReturnType<typeof assignColumns>) {
  return Object.fromEntries(
    positioned.map((item) => [item.event.id, item]),
  ) as Record<string, (typeof positioned)[number]>;
}
