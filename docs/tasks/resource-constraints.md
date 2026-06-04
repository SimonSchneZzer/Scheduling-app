# Task: Resource Constraints

## Goal

Add room constraints to the core scheduling flow. Offline events should require a fitting available room, while online events should relax physical room constraints.

## Non-Goals

- No database persistence.
- No room management CRUD.
- No device inventory beyond room features.
- No all-day or multi-day resource planning yet.

## User Flow

1. User chooses online or offline mode.
2. For offline events, user sets required seats and required room features.
3. Engine returns only slots with a fitting available room.
4. Suggestions show the assigned room.
5. Accepted suggestions store the room booking in local calendar state.
6. Future calculations treat accepted room bookings as conflicts.

## Data Model Impact

Adds plain TypeScript types for:
- event mode
- resource features
- room resources
- resource requirements
- optional `resourceId` on calendar events
- optional `assignedResource` on schedule suggestions

## API Impact

No API yet. The UI still calls the scheduling engine directly.

## Scheduling Engine Impact

Implemented:
- room capacity hard constraint
- required room feature hard constraint
- room availability hard constraint
- room booking conflict hard constraint
- online mode relaxation of room constraints
- room assignment in suggestions

## Tests

Added deterministic tests for:
- too few room seats invalidates offline slots
- missing room feature invalidates offline slots
- online mode ignores physical room constraints
- fitting room is returned in suggestions
- already booked room invalidates candidate slots

## Open Questions

- Whether standalone devices should be modeled as generic resources or separate from rooms.
- Whether room fit should add a simple score or become pure hard-constraint metadata.
