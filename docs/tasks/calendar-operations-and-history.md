# Task: Calendar Operations And History

## Goal

Add the next calendar operations after database-backed scheduling: delete accepted events, switch day/week views, filter by room or participant, preview pending suggestions, interact with all-day/multi-day events, and show schedule run history.

## Non-Goals

- Add authentication or multi-team access control.
- Add full keyboard support for drag/resize.
- Add a full historical detail page for every schedule run.
- Replace existing local fallback behavior.

## User Flow

Users can delete accepted events from the event details popover. The calendar can switch between week and day views, filter visible events by participant or room, and display pending suggestion previews after calculating best slots. Accepted all-day and multi-day events can be moved between days and resized in the all-day lane. The dashboard shows a compact history of persisted schedule runs.

## Data Model Impact

No migration is needed. Existing `ScheduleRun`, `ScheduleSuggestion`, `EventRequest`, `CalendarEvent`, and `RoomBooking` tables are used.

## API Impact

- Add `DELETE /api/calendar-events/[id]` for accepted event deletion.
- Add `GET /api/schedule-runs` for schedule run history.

## Scheduling Engine Impact

No scoring or candidate-generation changes.

## Tests

- Unit-test schedule run history serialization.
- Keep existing scheduling, serialization, layout, and persistence tests green.
- Run typecheck, lint, and build.

## Open Questions

- Whether all-day drag/resize should later get dedicated keyboard controls and conflict previews.
- Whether schedule run history should become a separate detail page with full suggestion explanations.
