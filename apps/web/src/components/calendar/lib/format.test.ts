import { describe, expect, it } from "vitest";
import type { CalendarEvent } from "@/scheduling";
import { formatEventWhen } from "./format";

function event(start: string, end: string): CalendarEvent {
  return {
    id: "e",
    title: "Event",
    source: "seed",
    participantIds: [],
    start: new Date(start),
    end: new Date(end),
  };
}

describe("formatEventWhen", () => {
  it("describes a timed event with a time range", () => {
    const text = formatEventWhen(
      event("2026-06-08T09:00:00", "2026-06-08T09:30:00"),
    );

    expect(text).toContain("Mon, Jun 8");
    expect(text).toMatch(/\d{1,2}:\d{2}/); // contains a clock time
    expect(text).not.toContain("All day");
  });

  it("labels a single all-day event without a time", () => {
    const text = formatEventWhen(
      event("2026-06-12T00:00:00", "2026-06-13T00:00:00"),
    );

    expect(text).toBe("All day · Fri, Jun 12");
  });

  it("shows an inclusive range for a multi-day event", () => {
    // Midnight 06-10 → midnight 06-12 covers the 10th and 11th.
    const text = formatEventWhen(
      event("2026-06-10T00:00:00", "2026-06-12T00:00:00"),
    );

    expect(text).toBe("All day · Wed, Jun 10 – Thu, Jun 11");
  });
});
