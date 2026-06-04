# Task: Local Persistence

## Goal

Persist accepted scheduling suggestions locally so the demo remains useful after a browser reload without adding database complexity yet.

## Non-Goals

- No backend persistence.
- No database.
- No authentication.
- No multi-user synchronization.

## User Flow

1. User accepts a scheduling suggestion.
2. Accepted event appears in the team calendar as an accepted event.
3. Browser reload keeps accepted events.
4. User can reset demo data to return to the seed calendar.

## Data Model Impact

Calendar events now include:
- `title`
- `source`: `seed` or `accepted`

Only accepted events are serialized. Seed events remain code-defined mock data.

## API Impact

No API yet. Persistence uses browser `localStorage`.

## Scheduling Engine Impact

No engine behavior change. Accepted events loaded from storage are passed into the existing engine as calendar facts.

## Tests

Added deterministic tests for:
- accepted event serialization/deserialization
- seed events excluded from persisted payload
- invalid persisted payloads returning an empty list

## Open Questions

- Whether DB persistence should come before all-day/multi-day scheduling.
- Whether accepted event history should later include the original schedule run and score.
