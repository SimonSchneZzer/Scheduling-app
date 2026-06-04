# Roadmap

## Current Goal

Set up the project foundation so a new development context immediately understands the product goal, architecture direction, and next implementation steps.

## Phase 0: Project Context

Status: in progress

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

Status: next

- Choose package manager.
- Initialize frontend application.
- Add TypeScript.
- Add basic styling setup.
- Add initial project structure.
- Add build and development commands.
- Update `AGENTS.md` with real commands.
- Commit the project-context foundation before broad scaffolding.

## Phase 2: Data Model

Status: planned

- Choose ORM.
- Add PostgreSQL setup.
- Model users, teams, calendars, events, event requests, participants, rooms, and resources.
- Add migrations.
- Add seed data for local development.

## Phase 3: Scheduling Engine MVP

Status: planned

- Implement candidate slot generation.
- Implement required participant hard constraints.
- Implement optional participant scoring.
- Implement priority scoring.
- Return ranked suggestions.
- Add tests for scheduling logic.

## Phase 4: Calendar UI MVP

Status: planned

- Show team calendar.
- Create event request form.
- Select required and optional participants.
- Show scheduling suggestions.
- Accept a suggestion into the calendar.

## Phase 5: Resources And Long Events

Status: planned

- Add rooms.
- Add room capacity and features.
- Add devices/resources.
- Add online/offline mode.
- Support all-day and multi-day event planning.
