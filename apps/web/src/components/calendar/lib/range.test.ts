import { describe, expect, it } from "vitest";
import { addDays, isSameDay, startOfDay, startOfWeek, weekDays } from "./range";

describe("startOfDay", () => {
  it("returns local midnight without mutating the input", () => {
    const input = new Date("2026-06-10T14:37:21");
    const result = startOfDay(input);

    expect(result.getHours()).toBe(0);
    expect(result.getMinutes()).toBe(0);
    expect(result.getDate()).toBe(10);
    // Input is untouched.
    expect(input.getHours()).toBe(14);
  });
});

describe("addDays", () => {
  it("adds days across a month boundary", () => {
    const result = addDays(new Date("2026-06-30T09:00:00"), 2);

    expect(result.getMonth()).toBe(6); // July (zero-based)
    expect(result.getDate()).toBe(2);
    expect(result.getHours()).toBe(9);
  });

  it("subtracts days with a negative offset", () => {
    const result = addDays(new Date("2026-06-01T00:00:00"), -1);

    expect(result.getMonth()).toBe(4); // May
    expect(result.getDate()).toBe(31);
  });
});

describe("startOfWeek", () => {
  it("anchors on Monday for a mid-week date", () => {
    // 2026-06-10 is a Wednesday; the Monday of that week is 2026-06-08.
    const monday = startOfWeek(new Date("2026-06-10T12:00:00"));

    expect(monday.getDay()).toBe(1);
    expect(monday.getDate()).toBe(8);
    expect(monday.getHours()).toBe(0);
  });

  it("treats Sunday as the last day of the Monday-anchored week", () => {
    // 2026-06-14 is a Sunday; its week still starts on Monday 2026-06-08.
    const monday = startOfWeek(new Date("2026-06-14T23:00:00"));

    expect(monday.getDay()).toBe(1);
    expect(monday.getDate()).toBe(8);
  });

  it("returns the same day when the date is already Monday", () => {
    const monday = startOfWeek(new Date("2026-06-08T00:00:00"));

    expect(monday.getDate()).toBe(8);
  });
});

describe("weekDays", () => {
  it("returns seven sequential local-midnight days starting on Monday", () => {
    const days = weekDays(new Date("2026-06-10T12:00:00"));

    expect(days).toHaveLength(7);
    expect(days[0].getDay()).toBe(1);
    expect(days[6].getDay()).toBe(0);
    expect(days.map((day) => day.getDate())).toEqual([
      8, 9, 10, 11, 12, 13, 14,
    ]);
    expect(days.every((day) => day.getHours() === 0)).toBe(true);
  });

  it("keeps every day at local midnight across a DST boundary", () => {
    // Central European DST ends on 2026-10-25; the following week crosses it.
    const days = weekDays(new Date("2026-10-26T12:00:00"));

    expect(days).toHaveLength(7);
    expect(days.every((day) => day.getHours() === 0)).toBe(true);
    expect(days.every((day) => day.getMinutes() === 0)).toBe(true);
  });
});

describe("isSameDay", () => {
  it("ignores the time component", () => {
    expect(
      isSameDay(
        new Date("2026-06-08T00:01:00"),
        new Date("2026-06-08T23:59:00"),
      ),
    ).toBe(true);
  });

  it("distinguishes different days", () => {
    expect(
      isSameDay(
        new Date("2026-06-08T23:59:00"),
        new Date("2026-06-09T00:01:00"),
      ),
    ).toBe(false);
  });
});
