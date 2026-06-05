// Locale-aware display formatters for the calendar view.
// Kept apart from the layout math so the math stays timezone-independent.

import type { CalendarEvent, RoomResource } from "@/scheduling";
import { isAllDayEvent } from "./layout";
import { addDays, isSameDay } from "./range";

const timeFormatter = new Intl.DateTimeFormat("en", {
  hour: "2-digit",
  minute: "2-digit",
});

const weekdayFormatter = new Intl.DateTimeFormat("en", { weekday: "short" });

const monthDayFormatter = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
});

const dayLongFormatter = new Intl.DateTimeFormat("en", {
  weekday: "short",
  month: "short",
  day: "numeric",
});

/** "09:00" */
export function formatTime(date: Date): string {
  return timeFormatter.format(date);
}

/** "09:00 – 10:30" */
export function formatTimeRange(start: Date, end: Date): string {
  return `${timeFormatter.format(start)} – ${timeFormatter.format(end)}`;
}

/** "Mon" */
export function formatWeekday(date: Date): string {
  return weekdayFormatter.format(date);
}

/** "Mon, Jun 8" */
export function formatDayLong(date: Date): string {
  return dayLongFormatter.format(date);
}

/**
 * Human description of when an event happens, branching on type:
 * - timed:      "Mon, Jun 8 · 09:00 – 09:30"
 * - all-day:    "All day · Mon, Jun 8"
 * - multi-day:  "All day · Mon, Jun 8 – Wed, Jun 10" (end is inclusive)
 */
export function formatEventWhen(event: CalendarEvent): string {
  if (isAllDayEvent(event.start, event.end)) {
    const inclusiveEnd = addDays(event.end, -1);

    if (isSameDay(event.start, inclusiveEnd)) {
      return `All day · ${formatDayLong(event.start)}`;
    }

    return `All day · ${formatDayLong(event.start)} – ${formatDayLong(inclusiveEnd)}`;
  }

  return `${formatDayLong(event.start)} · ${formatTime(event.start)} – ${formatTime(event.end)}`;
}

/** Hour-axis label such as "9 AM". */
export function formatHourLabel(hour: number): string {
  const normalized = ((hour % 24) + 24) % 24;
  const suffix = normalized < 12 ? "AM" : "PM";
  const display = normalized % 12 === 0 ? 12 : normalized % 12;
  return `${display} ${suffix}`;
}

/** "Jun 8 – 14" or "Jun 29 – Jul 5", collapsing a shared month. */
export function formatWeekRangeLabel(days: Date[]): string {
  if (days.length === 0) {
    return "";
  }

  const first = days[0];
  const last = days[days.length - 1];

  if (first.getMonth() === last.getMonth()) {
    return `${monthDayFormatter.format(first)} – ${last.getDate()}`;
  }

  return `${monthDayFormatter.format(first)} – ${monthDayFormatter.format(last)}`;
}

/** Resolve a room id to its display name, or null when there is no room. */
export function roomLabel(
  resourceId: string | undefined,
  rooms: RoomResource[],
): string | null {
  if (!resourceId) {
    return null;
  }

  return rooms.find((room) => room.id === resourceId)?.name ?? resourceId;
}
