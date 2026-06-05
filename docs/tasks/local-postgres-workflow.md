# Task: Local PostgreSQL Workflow

## Goal

Make the database-backed scheduling flow easy to run locally with a predictable PostgreSQL service, setup commands, and documentation.

## Non-Goals

- Add production database configuration.
- Add authentication or deployment infrastructure.
- Remove the browser local-storage fallback.

## User Flow

A contributor copies `apps/web/.env.example` to `apps/web/.env`, starts PostgreSQL with `pnpm db:up`, runs `pnpm db:setup`, then starts the app with `pnpm dev`.

## Data Model Impact

No schema changes. The existing Prisma migration and seed data are used.

## API Impact

No API changes.

## Scheduling Engine Impact

No scheduling-engine changes.

## Tests

- Validate the Prisma schema.
- Run typecheck, lint, tests, and build.
- If Docker is available, start PostgreSQL and run migrations/seeding.

## Open Questions

- Whether future development should add a separate test database for integration tests.
