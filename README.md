# Scheduling App

Scheduling App is an intelligent team calendar for finding the best slot for team events.

The product is calendar-first. Users create event requests with participants, priority, availability, rooms, devices, and constraints. The system generates ranked scheduling suggestions with transparent scoring, then the user accepts one suggestion into the team calendar.

## Product Direction

The first product goal is single-event planning:
- timed events, for example a 45-minute meeting
- all-day events
- multi-day events, for example workshops or offsites
- required and optional participants
- room capacity and room feature constraints
- device/resource constraints
- online mode that relaxes physical room/device constraints

The initial algorithm should be a scoring engine:
1. generate candidate slots
2. filter invalid slots with hard constraints
3. score valid slots with soft constraints
4. return ranked suggestions with explanations

## Documentation

- `AGENTS.md` - persistent project context for Codex and other coding agents
- `docs/product-concept.md` - product concept, scheduling model, and MVP roadmap
- `docs/technical-direction.md` - recommended technical direction
- `docs/roadmap.md` - implementation roadmap
- `docs/agent-workflow.md` - agentic coding workflow and credit optimization rules
- `docs/quality-gates.md` - completion checks for implementation work
- `docs/git-workflow.md` - branch, commit, and PR workflow
- `docs/decisions/` - architecture decision records

## Current Status

The project has a Next.js web app under `apps/web` with the first local core scheduling flow. Users can define timed, all-day, or multi-day event requests, calculate ranked slot suggestions from the scheduling engine, include room constraints for offline events, and accept a suggestion into local calendar state. Accepted events persist in browser local storage for the demo.

Prisma has been selected for PostgreSQL persistence. The first database schema, migration, seed script, Prisma Client setup, and database-backed API flow are in place. The UI loads and persists through PostgreSQL when available, with local browser persistence as a demo fallback.

Recommended next step: validate the database-backed scheduling flow locally, then add conflict validation to calendar drag/resize updates.

## Development

Use pnpm from the repository root:

```bash
pnpm install
pnpm dev
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm db:validate
pnpm db:generate
pnpm db:migrate
pnpm db:seed
```

## Local Database

The database-backed flow uses the local PostgreSQL service defined in `compose.yaml`. It publishes PostgreSQL on host port `55432` to avoid collisions with any existing local database on `5432`.

1. Copy the example environment file:

```bash
cp apps/web/.env.example apps/web/.env
```

2. Start PostgreSQL:

```bash
pnpm db:up
```

3. Run migrations and seed demo data:

```bash
pnpm db:setup
```

4. Start the app:

```bash
pnpm dev
```

Useful database commands:

```bash
pnpm db:down
pnpm db:reset
```

`pnpm db:reset` clears the local database, reruns migrations, and asks Prisma to reseed data.
