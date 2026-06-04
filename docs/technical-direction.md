# Technical Direction

## Recommendation

Start with a TypeScript-first web application:
- Frontend: Next.js
- Backend: Next.js API routes for the MVP
- Database: PostgreSQL
- ORM: Prisma or Drizzle
- Styling: Tailwind CSS or a small component system
- Tests: Vitest for business logic, Playwright later for key flows

This keeps the MVP simple while leaving room to extract a separate backend later if the scheduling engine becomes large.

## Architecture Shape

Recommended initial structure:

```text
apps/
  web/
    src/
      app/
      components/
      server/
      scheduling/
      db/
docs/
```

Current scaffold:
- `apps/web` contains the Next.js App Router frontend.
- Root `package.json` contains workspace scripts.
- Root `pnpm-workspace.yaml` defines app packages.
- Vitest is installed for business-logic tests.

The scheduling engine should live in a framework-independent module, not directly inside UI components. It should be easy to test with plain input data.

## Backend Responsibilities

The backend should handle:
- users and teams
- calendars and accepted events
- event requests
- participant roles
- rooms and resources
- availability rules
- schedule runs
- schedule suggestions

The backend should expose APIs for:
- creating event requests
- calculating suggestions
- accepting suggestions
- managing rooms/resources
- managing calendar events

## Scheduling Engine Responsibilities

The engine should:
- receive an event request and relevant calendar/resource data
- generate candidate slots
- filter hard-constraint violations
- score remaining candidates
- return ranked suggestions
- include score explanations

The engine should not:
- depend on UI state
- directly query the database
- silently mutate calendar data

## Data Storage Direction

Use PostgreSQL because scheduling queries will likely need structured relations and time-based filtering.

Likely core tables:
- users
- teams
- team_members
- calendars
- events
- event_requests
- event_participants
- resources
- rooms
- room_features
- resource_bookings
- availability_rules
- schedule_runs
- schedule_suggestions

## Future Integration Direction

External calendar sync is not required for the MVP, but the model should leave room for:
- Google Calendar
- Microsoft Outlook / Microsoft Graph
- CalDAV

Internal calendar events should be the source of truth during the MVP.
