# ADR 0002: Prisma Persistence

## Status

Accepted

## Context

The product needs relational persistence for teams, users, calendar events, event requests, participant roles, rooms, resources, schedule runs, and suggestions. The scheduling engine should stay framework-independent and should receive plain data instead of querying persistence directly.

## Decision

Use Prisma with PostgreSQL for MVP persistence.

The initial Prisma schema lives in `apps/web/prisma/schema.prisma` and models:
- users, teams, team members, and calendars
- calendar events and event participants
- participant availability windows
- rooms, room features, room availability, and room bookings
- generic resources for later device/resource constraints
- event requests, request participants, required features, schedule runs, and suggestions

Prisma Client is generated into `apps/web/src/generated/prisma` and ignored from Git. Server code should use `apps/web/src/db/prisma.ts` to construct the Prisma client with the PostgreSQL adapter.

## Consequences

Positive:
- Prisma gives a typed relational schema and migration workflow.
- The schema maps directly to the current scheduling concepts.
- The generated client keeps persistence code type-safe.
- The scheduling engine can remain independent from database access.

Tradeoffs:
- Developers must run `pnpm db:generate` after installing dependencies or changing the Prisma schema.
- Local development needs a PostgreSQL-compatible database URL before migrations or seed data can run.
- API routes still need to be added before the UI moves from `localStorage` to database persistence.
