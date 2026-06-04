# Roadmap

## Current Goal

Set up the project foundation so a new development context immediately understands the product goal, architecture direction, and next implementation steps.

## Phase 0: Project Context

Status: done

- Create repository.
- Add `README.md`.
- Add `.gitignore`.
- Add `AGENTS.md` for persistent agent context.
- Add product concept documentation.
- Add technical direction documentation.
- Add roadmap documentation.
- Add agent workflow documentation.
- Add quality gates documentation.
- Add git workflow documentation.
- Add initial architecture decision record for the application stack.

## Phase 1: Application Scaffold

Status: in progress

- Choose package manager.
- Initialize frontend application.
- Add TypeScript.
- Add basic styling setup.
- Add initial project structure.
- Add build and development commands.
- Update `AGENTS.md` with real commands.
- Commit the project-context foundation before broad scaffolding.

Completed:
- Package manager: pnpm.
- Next.js app scaffolded in `apps/web`.
- TypeScript, Tailwind, ESLint, and Vitest are configured.
- Root workspace scripts are available.

Remaining:
- Decide ORM.
- Add backend/database setup.
- Add first scheduling-engine module and tests. Done in `docs/tasks/scheduling-engine-mvp.md`.

## Phase 2: Data Model

Status: planned

- Choose ORM.
- Add PostgreSQL setup.
- Model users, teams, calendars, events, event requests, participants, rooms, and resources.
- Add migrations.
- Add seed data for local development.

## Phase 3: Scheduling Engine MVP

Status: in progress

- Implement candidate slot generation.
- Implement required participant hard constraints.
- Implement optional participant scoring.
- Implement priority scoring.
- Return ranked suggestions.
- Add tests for scheduling logic.

Completed first slice:
- Candidate slot generation for timed events.
- Required participant availability hard constraint.
- Existing calendar event conflict hard constraint.
- Optional participant availability scoring.
- Priority scoring.
- Ranked suggestions with explanations.

## Phase 4: Calendar UI MVP

Status: in progress

- Show team calendar.
- Create event request form.
- Select required and optional participants.
- Show scheduling suggestions.
- Accept a suggestion into the calendar.

Completed first slice:
- Event request form for title, duration, priority, date, time window, and participant roles.
- Mock team availability and initial calendar events.
- UI calls the scheduling engine directly.
- Ranked suggestions are shown with explanations.
- Accepted suggestions are added to local calendar state.

## Phase 5: Resources And Long Events

Status: in progress

- Add rooms.
- Add room capacity and features.
- Add devices/resources.
- Add online/offline mode.
- Support all-day and multi-day event planning.

Completed first resource slice:
- Mock rooms with capacity, features, and availability.
- Offline event requests require a fitting available room.
- Online event requests relax room constraints.
- Suggestions include the assigned room.
- Accepted suggestions store local room bookings.
