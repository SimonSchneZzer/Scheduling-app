# Task: Event Request And Schedule Run Persistence

## Goal

Persist the database-backed scheduling flow as event requests, schedule runs, and schedule suggestions before accepting a suggestion into the calendar.

## Non-Goals

- Add authentication or multi-team selection.
- Replace the local browser fallback flow.
- Change scheduling-engine scoring or candidate generation.
- Add historical UI for browsing old schedule runs.

## User Flow

When PostgreSQL is available, the add-event sheet saves the current request and calculates a schedule run on the server. Suggestions returned from that run are stored in the database. Accepting a stored suggestion creates an accepted calendar event linked back to the event request.

When PostgreSQL is unavailable, the existing local demo flow continues to calculate suggestions in the browser and stores accepted events in local storage.

## Data Model Impact

No migration is expected. The existing `EventRequest`, `EventRequestParticipant`, `EventRequestRequiredFeature`, `ScheduleRun`, and `ScheduleSuggestion` tables are used.

Accepted `CalendarEvent` rows should set `eventRequestId` when created from a stored suggestion.

## API Impact

- Add `POST /api/schedule-runs` to persist an event request, generate suggestions, and store a schedule run.
- Add `POST /api/schedule-suggestions/[id]/accept` to accept a stored suggestion.

## Scheduling Engine Impact

No engine behavior change. The server API passes plain scheduling input into the existing framework-independent engine.

## Tests

- Unit-test serialization for stored schedule suggestions.
- Keep existing scheduling-engine tests green.
- Run typecheck, lint, and build.

## Open Questions

- Whether later runs for an edited-but-similar request should reuse the same event request or create a new one. This slice creates a new request per server calculation.
