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
- ORM choice: Prisma.

Remaining:
- Decide local PostgreSQL workflow for contributors.
- Add first scheduling-engine module and tests. Done in `docs/tasks/scheduling-engine-mvp.md`.

## Phase 2: Data Model

Status: in progress

- Choose ORM.
- Add PostgreSQL setup.
- Model users, teams, calendars, events, event requests, participants, rooms, and resources.
- Add migrations.
- Add seed data for local development.

Completed first persistence slice:
- Prisma added as the ORM.
- Initial PostgreSQL schema and migration added.
- Seed data mirrors the current local demo team, availability, rooms, and calendar events.
- Prisma Client generation and schema validation scripts are available.
- API routes load scheduling data and persist accepted suggestions in PostgreSQL.
- The UI uses PostgreSQL when configured and falls back to local demo persistence when unavailable.

Remaining:
- Decide local PostgreSQL workflow for contributors.
- Add conflict-aware validation in the accept endpoint before writing calendar events.
- Store event requests and schedule runs for accepted suggestions.

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
- Accepted suggestions persist in local browser storage.

Interim persistence:
- Accepted events persist in PostgreSQL when available.
- Accepted events fall back to `localStorage` for the browser demo when PostgreSQL is unavailable.
- Seed events and accepted events are separated by event source.

Calendar view (first slice, see `docs/tasks/calendar-view.md`):
- Replaced the sorted event list with a Monday-anchored week grid.
- Timed events render as positioned, overlap-aware blocks; all-day and multi-day events render in a swimlane above the grid.
- The visible hour window auto-expands to fit early or late events.
- Previous/next/today navigation between weeks.
- Current-time indicator and seed-vs-accepted color coding.
- Pure layout/range helpers in `apps/web/src/components/calendar/lib` with unit tests.
- Event details popover on click (title, source, time, room + capacity, participants).

Calendar interactions + add-event sheet:
- Drag accepted events between days/times via dnd-kit, snapped to 15 minutes.
- Resize accepted events by dragging the bottom edge (pointer events, 15-min snap).
- Press-and-drag on an empty grid cell selects a range that opens the add-event sheet pre-filled.
- Header CTA "Termin hinzufügen" opens a right-side sheet with the full event-request form.
- Inside the sheet, a collapsible "Besten Slot finden" section runs the scoring engine and applies a ranked suggestion's time/room back into the form.
- Move and resize persist via a new `PATCH /api/calendar-events/[id]` route, with localStorage fallback for the demo.
- Conflict warning during drag/resize highlights overlaps with the event's own participants — drop is still allowed.

Remaining for the calendar UI:
- Day-view toggle alongside the week view.
- Filter the grid by room or participant.
- Render pending suggestions on the grid before accepting.
- Delete events from the calendar UI.
- Drag and resize for all-day / multi-day events.

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

Completed first long-event slice:
- Event requests support timed, all-day, and multi-day types.
- All-day requests generate whole-day candidates.
- Multi-day requests generate contiguous day-block candidates.
- UI displays date ranges for whole-day suggestions.
