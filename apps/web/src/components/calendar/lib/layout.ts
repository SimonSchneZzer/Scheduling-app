// Pure layout helpers that turn calendar events into grid coordinates.
// No React, no Date mutation — see layout.test.ts.

import type { CalendarEvent } from "@/scheduling";
import { addDays, startOfDay } from "./range";

export const DEFAULT_START_HOUR = 8;
export const DEFAULT_END_HOUR = 18;

const MINUTES_PER_HOUR = 60;
const MS_PER_MINUTE = 60_000;

/**
 * An all-day or multi-day event is aligned to local midnight on both ends.
 * This mirrors how the scheduling engine emits whole-day candidates.
 */
export function isAllDayEvent(start: Date, end: Date): boolean {
  return (
    isMidnight(start) && isMidnight(end) && end.getTime() > start.getTime()
  );
}

/** Partition events into all-day (lane) and timed (grid) groups. */
export function splitEvents(events: CalendarEvent[]): {
  allDay: CalendarEvent[];
  timed: CalendarEvent[];
} {
  const allDay: CalendarEvent[] = [];
  const timed: CalendarEvent[] = [];

  for (const event of events) {
    if (isAllDayEvent(event.start, event.end)) {
      allDay.push(event);
    } else {
      timed.push(event);
    }
  }

  return { allDay, timed };
}

/** Timed events that intersect the local day starting at `dayMidnight`. */
export function eventsForDay(
  timed: CalendarEvent[],
  dayMidnight: Date,
): CalendarEvent[] {
  const dayStart = dayMidnight.getTime();
  const dayEnd = addDays(dayMidnight, 1).getTime();

  return timed.filter(
    (event) =>
      event.start.getTime() < dayEnd && event.end.getTime() > dayStart,
  );
}

export type PositionedEvent = {
  event: CalendarEvent;
  /** Zero-based column within its overlap cluster. */
  column: number;
  /** Total columns in the cluster, so width = 1 / columnCount. */
  columnCount: number;
};

/**
 * Assign overlapping events to side-by-side columns (calendar style).
 * Events that do not overlap reuse the leftmost free column, and every event
 * in a connected overlap cluster shares the same columnCount so the cluster
 * renders as equal-width columns.
 */
export function assignColumns(events: CalendarEvent[]): PositionedEvent[] {
  const sorted = [...events].sort(
    (a, b) => a.start.getTime() - b.start.getTime() || a.end.getTime() - b.end.getTime(),
  );

  const result: PositionedEvent[] = [];
  let cluster: PositionedEvent[] = [];
  let columnEnds: number[] = [];
  let clusterEnd = Number.NEGATIVE_INFINITY;

  const flushCluster = () => {
    const count = columnEnds.length || 1;
    for (const positioned of cluster) {
      positioned.columnCount = count;
    }
    result.push(...cluster);
    cluster = [];
    columnEnds = [];
    clusterEnd = Number.NEGATIVE_INFINITY;
  };

  for (const event of sorted) {
    const start = event.start.getTime();
    const end = event.end.getTime();

    // A gap with no active events closes the current cluster.
    if (cluster.length > 0 && start >= clusterEnd) {
      flushCluster();
    }

    let column = columnEnds.findIndex((columnEnd) => columnEnd <= start);
    if (column === -1) {
      column = columnEnds.length;
      columnEnds.push(end);
    } else {
      columnEnds[column] = end;
    }

    cluster.push({ event, column, columnCount: 0 });
    clusterEnd = Math.max(clusterEnd, end);
  }

  if (cluster.length > 0) {
    flushCluster();
  }

  return result;
}

/**
 * Vertical placement of a timed event inside the visible hour window,
 * expressed as fractions (0..1) of the window height. Values are clamped so
 * events starting before / ending after the window stay inside the grid.
 */
export function positionInGrid(
  start: Date,
  end: Date,
  dayMidnight: Date,
  startHour: number,
  endHour: number,
): { top: number; height: number } {
  const windowStart = startHour * MINUTES_PER_HOUR;
  const windowEnd = endHour * MINUTES_PER_HOUR;
  const span = windowEnd - windowStart;

  if (span <= 0) {
    return { top: 0, height: 0 };
  }

  const dayStart = dayMidnight.getTime();
  const startMinutes = (start.getTime() - dayStart) / MS_PER_MINUTE;
  const endMinutes = (end.getTime() - dayStart) / MS_PER_MINUTE;

  const top = (clamp(startMinutes, windowStart, windowEnd) - windowStart) / span;
  const bottom = (clamp(endMinutes, windowStart, windowEnd) - windowStart) / span;

  return { top, height: Math.max(bottom - top, 0) };
}

/**
 * Snap a minute count to the nearest multiple of `snap`. Used by drag/resize
 * to keep candidate event times on 15-minute (or other) boundaries.
 */
export function snapMinutes(totalMinutes: number, snap: number): number {
  if (snap <= 0) {
    return totalMinutes;
  }

  return Math.round(totalMinutes / snap) * snap;
}

/**
 * Inverse of `positionInGrid`: turn a fractional y-offset within the time grid
 * body into a concrete Date on `dayMidnight`, snapped to `snap` minutes.
 */
export function dateFromGridOffset(
  dayMidnight: Date,
  yFraction: number,
  startHour: number,
  endHour: number,
  snap = 15,
): Date {
  const windowStart = startHour * MINUTES_PER_HOUR;
  const windowEnd = endHour * MINUTES_PER_HOUR;
  const span = windowEnd - windowStart;
  const clampedFraction = clamp(yFraction, 0, 1);
  const rawMinutes = windowStart + clampedFraction * span;
  const snapped = clamp(snapMinutes(rawMinutes, snap), windowStart, windowEnd);

  const date = new Date(dayMidnight);
  date.setHours(0, snapped, 0, 0);
  return date;
}

/**
 * The hour window to render: the default business window, expanded as needed
 * to fully contain every timed event. Returns whole-hour bounds in [0, 24].
 */
export function visibleHourRange(
  timed: CalendarEvent[],
  defaultStartHour = DEFAULT_START_HOUR,
  defaultEndHour = DEFAULT_END_HOUR,
): { startHour: number; endHour: number } {
  let startHour = defaultStartHour;
  let endHour = defaultEndHour;

  for (const event of timed) {
    startHour = Math.min(startHour, event.start.getHours());

    const endsOnBoundary =
      event.end.getMinutes() === 0 && event.end.getSeconds() === 0;
    const eventEndHour = event.end.getHours() + (endsOnBoundary ? 0 : 1);
    endHour = Math.max(endHour, eventEndHour);
  }

  startHour = clamp(Math.floor(startHour), 0, 23);
  endHour = clamp(Math.ceil(endHour), startHour + 1, 24);

  return { startHour, endHour };
}

export type AllDaySpan = {
  /** Index into the visible week (0..length-1) where the bar starts. */
  startIndex: number;
  /** Number of day columns the bar spans, clipped to the visible week. */
  span: number;
};

/**
 * Where an all-day / multi-day event sits within the visible week.
 * Returns null when the event does not touch any visible day.
 */
export function allDaySpan(
  event: CalendarEvent,
  visibleDays: Date[],
): AllDaySpan | null {
  const indices: number[] = [];

  visibleDays.forEach((day, index) => {
    const dayStart = day.getTime();
    const dayEnd = addDays(day, 1).getTime();

    if (event.start.getTime() < dayEnd && event.end.getTime() > dayStart) {
      indices.push(index);
    }
  });

  if (indices.length === 0) {
    return null;
  }

  const startIndex = indices[0];
  const endIndex = indices[indices.length - 1];

  return { startIndex, span: endIndex - startIndex + 1 };
}

export type AllDayPlacement = AllDaySpan & { event: CalendarEvent };

/**
 * Pack all-day bars into as few stacked rows as possible so non-overlapping
 * bars share a row. Returns rows ordered top-to-bottom.
 */
export function packAllDayRows(
  events: CalendarEvent[],
  visibleDays: Date[],
): AllDayPlacement[][] {
  const placements = events
    .map<AllDayPlacement | null>((event) => {
      const span = allDaySpan(event, visibleDays);
      return span ? { ...span, event } : null;
    })
    .filter((placement): placement is AllDayPlacement => placement !== null)
    .sort((a, b) => a.startIndex - b.startIndex || b.span - a.span);

  const rows: AllDayPlacement[][] = [];

  for (const placement of placements) {
    const row = rows.find((existing) =>
      existing.every((other) => !spansOverlap(other, placement)),
    );

    if (row) {
      row.push(placement);
    } else {
      rows.push([placement]);
    }
  }

  return rows;
}

function spansOverlap(a: AllDaySpan, b: AllDaySpan): boolean {
  return (
    a.startIndex < b.startIndex + b.span && b.startIndex < a.startIndex + a.span
  );
}

function isMidnight(date: Date): boolean {
  return (
    date.getHours() === 0 &&
    date.getMinutes() === 0 &&
    date.getSeconds() === 0 &&
    date.getMilliseconds() === 0
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

// Re-exported for components that need a day's midnight from an arbitrary date.
export { startOfDay };
