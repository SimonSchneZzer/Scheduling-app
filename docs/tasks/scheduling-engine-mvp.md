# Task: Scheduling Engine MVP

## Goal

Create the first framework-independent scheduling engine slice. Given an event request, participant availability, existing calendar events, and a search window, the engine should return ranked scheduling suggestions.

## Non-Goals

- No database integration.
- No API route.
- No external calendar sync.
- No room/device constraints yet.
- No all-day or multi-day scheduling yet.
- No UI wiring yet.

## User Flow

An organizer creates an event request with duration, priority, required participants, optional participants, and a scheduling window. The engine evaluates candidate slots and returns the best valid suggestions with score explanations.

## Data Model Impact

No database schema yet. This task defines plain TypeScript input/output types that can later inform the database model.

## API Impact

No public API yet. The engine should expose a pure function that can later be called by an API route or server action.

## Scheduling Engine Impact

Implement:
- candidate slot generation
- required participant availability as a hard constraint
- existing calendar event conflicts as hard constraints
- optional participant availability as a scoring signal
- priority as a scoring signal
- ranked suggestions with explanations

## Tests

Add deterministic Vitest coverage for:
- required participant unavailable makes a candidate invalid
- optional participant unavailable keeps a candidate valid but lowers score
- higher priority increases score
- existing calendar conflict blocks a candidate slot
- suggestions are sorted best-first

## Open Questions

- Exact scoring weights can be constants for now.
- Room/resource constraints will be a later slice.
- All-day and multi-day scheduling will be a later slice.
