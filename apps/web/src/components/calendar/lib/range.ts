// Pure date-range helpers for the calendar view.
// No React, no Date mutation of inputs — every function returns fresh values
// so the layout logic stays trivially testable (see range.test.ts).

const DAYS_PER_WEEK = 7;

/** Local midnight of the given date, as a new Date (input is never mutated). */
export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/**
 * Returns a new Date `days` after `date`, preserving the local wall-clock time.
 * Using setDate keeps this correct across month boundaries and DST shifts.
 */
export function addDays(date: Date, days: number): Date {
  const next = new Date(date.getTime());
  next.setDate(next.getDate() + days);
  return next;
}

/**
 * Monday-anchored start of the week containing `date`, at local midnight.
 * weekStartsOn defaults to Monday (1); 0 would anchor on Sunday.
 */
export function startOfWeek(date: Date, weekStartsOn = 1): Date {
  const day = date.getDay(); // 0 = Sunday … 6 = Saturday
  const offset = (day - weekStartsOn + DAYS_PER_WEEK) % DAYS_PER_WEEK;
  return addDays(startOfDay(date), -offset);
}

/**
 * The seven local-midnight days of the week containing `anchor`,
 * ordered from the week start (Monday by default).
 */
export function weekDays(anchor: Date, weekStartsOn = 1): Date[] {
  const start = startOfWeek(anchor, weekStartsOn);
  return Array.from({ length: DAYS_PER_WEEK }, (_, index) =>
    addDays(start, index),
  );
}

/** True when both dates fall on the same local calendar day. */
export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
