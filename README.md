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

The project has a Next.js web scaffold under `apps/web`. Backend, database, and scheduling engine are not implemented yet.

Recommended next step: build the first framework-independent scheduling engine slice with tests.

## Development

Use pnpm from the repository root:

```bash
pnpm install
pnpm dev
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```
