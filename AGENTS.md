# Project Instructions

These notes are persistent project context for Codex and other coding agents working in this repository.

## Required Startup Context

At the start of a new coding session, read this file first. Before making architectural, product, or implementation decisions, also read:
- `README.md` for the short project summary and current status.
- `docs/roadmap.md` for the current goal and next phase.
- `docs/product-concept.md` when touching product behavior, scheduling rules, participants, resources, or calendar UX.
- `docs/technical-direction.md` when touching stack, architecture, database, backend, frontend, or tests.
- `docs/agent-workflow.md` before doing substantial multi-step work.
- `docs/quality-gates.md` before marking implementation work complete.
- `docs/git-workflow.md` before creating branches, committing, pushing, or opening PRs.
- `docs/decisions/` before revisiting a previously decided technical choice.

Keep this file concise. Put detailed reasoning in `docs/` and link it from here.

## Project Overview

Scheduling App is an intelligent team calendar. Its main purpose is to find the best calendar slot for events by evaluating participants, priorities, availability, rooms, devices, and other constraints.

The product is calendar-first, not task-first. The first major workflow should be single-event planning: a user creates a normal event or a long all-day/multi-day event, defines constraints, and the system proposes the best slot(s).

Primary users:
- Teams that need to coordinate meetings, workshops, planning blocks, and longer calendar events.
- Organizers who need to find good slots across required and optional participants.

Core workflows:
- Create an event request with duration, time range, participants, priority, and constraints.
- Mark participants as required or optional.
- Add physical resource constraints such as room capacity, room features, or required devices.
- Toggle an event to online, which can remove or relax physical room/device constraints.
- Generate ranked scheduling suggestions with transparent scores.
- Accept a proposed slot into the team calendar.

Important domain rules:
- Required participants are hard constraints: if a required participant is unavailable, the slot is invalid.
- Optional participants are soft constraints: their availability improves the score but does not determine validity.
- Physical resources can be hard constraints, for example room seats, projector, whiteboard, accessibility, or specific devices.
- Online events can bypass room and device constraints unless the event explicitly still requires a physical resource.
- The first algorithmic approach should be a scoring engine, not a black-box optimizer.
- The scheduling engine should handle normal timed events and long all-day or multi-day events.

## Repository Structure

Current structure:
- `README.md` - short project overview
- `.gitignore` - ignored local, dependency, build, and environment files
- `AGENTS.md` - persistent project context and coding instructions
- `package.json` - root workspace scripts
- `pnpm-workspace.yaml` - pnpm workspace definition
- `apps/web/` - Next.js web application
- `apps/web/src/app/` - App Router UI entrypoint
- `docs/product-concept.md` - product concept, scheduling model, and MVP roadmap
- `docs/technical-direction.md` - recommended technical stack and architecture direction
- `docs/roadmap.md` - step-by-step implementation roadmap
- `docs/agent-workflow.md` - rules for efficient agentic coding with quality controls
- `docs/quality-gates.md` - checks required before work is considered complete
- `docs/git-workflow.md` - branch, commit, and PR workflow
- `docs/decisions/` - architecture decision records

Keep this section updated when adding major folders such as `apps/`, `src/`, `server/`, `web/`, `docs/`, or `tests/`.

## Development Commands

Use pnpm from the repository root:
- Install dependencies: `pnpm install`
- Start development server: `pnpm dev`
- Run tests: `pnpm test`
- Typecheck: `pnpm typecheck`
- Build: `pnpm build`
- Lint: `pnpm lint`

## Coding Guidelines

- Prefer clear, maintainable code over clever abstractions.
- Follow existing project patterns once they exist.
- Keep changes focused on the requested behavior.
- Do not commit generated files, local environment files, dependencies, or build output.
- Document important architectural decisions here when they affect future work.
- Build the scheduling engine as framework-independent, testable business logic.
- Do not mix scheduling rules directly into UI components.
- For larger features, create or update a short spec in `docs/tasks/` before implementation.
- Prefer small vertical slices that can be typechecked, tested, and reviewed.

## Agentic Coding Rules

- Optimize for quality per token: read the relevant docs first, then inspect only the files needed for the current task.
- State assumptions when product behavior is underspecified.
- Implement end-to-end slices instead of broad unfinished scaffolding.
- Add tests for scheduling logic whenever scoring, constraints, slot generation, or participant/resource handling changes.
- Update `AGENTS.md`, `docs/roadmap.md`, or related docs when project structure, commands, or decisions change.
- Before calling work complete, run the checks listed in `docs/quality-gates.md` when applicable.
- Use the branch and commit rules in `docs/git-workflow.md` for non-trivial changes.

## Environment Notes

- Do not store secrets in the repository.
- Use `.env.example` for documenting required environment variables.
- Local `.env` files should stay untracked.

## Open Questions

Use this section for unresolved project decisions:
- Frontend framework: Next.js
- Backend framework: Next.js API routes for MVP, separate Node API later if needed
- Database: recommended PostgreSQL
- ORM: recommended Prisma or Drizzle, undecided
- Authentication: undecided
- Deployment target: undecided
- Calendar sync: not part of MVP, but design should allow Google Calendar and Microsoft Graph later
