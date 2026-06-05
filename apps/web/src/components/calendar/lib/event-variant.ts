import type { CalendarEvent, CalendarEventSource } from "@/scheduling";

/** Visual variant for a calendar event: its DB source, or a preview suggestion. */
export type CalendarEventVariant = CalendarEventSource | "suggestion";

export function eventVariant(event: CalendarEvent): CalendarEventVariant {
  return event.preview ? "suggestion" : event.source;
}
