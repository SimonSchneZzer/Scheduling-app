# Task: Database Prisma Persistence

## Goal

Add the first database persistence foundation for the scheduling app using PostgreSQL and Prisma.

## Non-Goals

- Replace the current `localStorage` accepted-event flow.
- Add authentication or multi-tenant access control.
- Add external calendar sync.
- Move scheduling rules into database queries or API handlers.

## User Flow

The user-facing demo loads team members, availability, rooms, and calendar events from PostgreSQL when `DATABASE_URL` is configured and the database has been migrated/seeded. If PostgreSQL is unavailable, the UI falls back to the local mock data and browser storage path.

## Data Model Impact

The initial schema includes users, teams, team members, calendars, calendar events, event participants, availability windows, rooms, room features, room availability, generic resources, event requests, event request participants, required room features, schedule runs, and schedule suggestions.

## API Impact

Added route handlers:
- `GET /api/scheduling-data` loads team members, participant availability, rooms, and calendar events.
- `DELETE /api/scheduling-data` removes accepted demo events and returns refreshed scheduling data.
- `POST /api/calendar-events` persists an accepted suggestion as a calendar event with event participants and an optional room booking.

## Scheduling Engine Impact

No scheduling-engine behavior changes. The engine must continue to accept plain data and return plain suggestions.

## Tests

- Validate the Prisma schema.
- Generate Prisma Client.
- Run existing typecheck and scheduling tests.
- Test API serialization and deserialization across JSON boundaries.
- Run migrations and seed data once a local PostgreSQL database is available.

## Open Questions

- Whether local development should use Docker Compose, `prisma dev`, or a manually managed PostgreSQL instance.
- Whether accepted-event persistence should additionally store the original event request and schedule run in this MVP slice.
