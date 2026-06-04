# Task: Core Scheduling Flow

## Goal

Create the first usable vertical product slice: define an event request, calculate ranked slots with the scheduling engine, and accept a suggestion into the local team calendar state.

## Non-Goals

- No persistent database.
- No authentication.
- No external calendar sync.
- No room/device constraints.
- No all-day or multi-day event UI.

## User Flow

1. User edits title, duration, priority, date, and time window.
2. User marks team members as required, optional, or not included.
3. User calculates best slots.
4. App shows ranked suggestions with score explanations.
5. User accepts a suggestion.
6. Accepted suggestion appears in the team calendar and blocks future required-participant suggestions.

## Data Model Impact

Uses temporary mock data:
- team members
- participant availability
- initial calendar events

Accepted suggestions live in local React state only.

## API Impact

No API yet. The UI calls the framework-independent scheduling engine directly.

## Scheduling Engine Impact

Engine behavior was refined so required participant calendar conflicts are hard constraints, while optional participant conflicts lower the score instead of invalidating the slot.

## Tests

Scheduling engine tests cover:
- required availability constraints
- required calendar conflicts
- optional availability scoring
- optional calendar conflict scoring
- priority scoring
- score ordering

## Open Questions

- Whether the next slice should persist event requests and accepted events.
- Whether room/resource constraints should come before database setup.
