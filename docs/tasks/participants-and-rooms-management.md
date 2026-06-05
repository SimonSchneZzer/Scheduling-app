# Task: Participants & Rooms Management Pages

## Goal

Add dedicated, full-CRUD management pages for **participants** (people) and
**rooms** (with seats/capacity and features), reachable from a top navigation
bar alongside the calendar. Features become first-class, user-creatable records
(no longer a fixed set). The event sheet keeps letting users invite people and
either pick a specific room or require features (the engine then assigns a
fitting room) — now sourced from the managed data.

## Non-Goals

- No auth / multi-tenant; everything stays under the single demo team.
- No per-room or per-person calendar inside these pages (availability windows
  are edited as plain start/end rows).
- No bulk import.

## Navigation

- A shared top nav bar (Calendar · Participants · Rooms) rendered in the root
  layout. Routes: `/` (calendar), `/participants`, `/rooms`.

## Pages

### /participants
- List people with name, default role, and availability summary.
- Create / edit / delete a person: name, default role (required/optional),
  availability windows (repeatable start/end rows).
- Delete warns that the person is removed from existing events.

### /rooms
- List rooms with name, seats (capacity), features, availability summary.
- Create / edit / delete a room: name, seats, feature multi-select,
  availability windows.
- **Features section:** create / edit / delete features (label). Features are
  global and selectable on any room and in the event sheet.

## Data Model Impact

- No schema change. Uses existing `User` + `TeamMember`, `AvailabilityWindow`,
  `Room` + `RoomFeatureOnRoom` + `RoomAvailabilityWindow`, and `RoomFeature`.
- **`ResourceFeature` widens from the fixed union to `string`** (a feature id).
  The engine already matches features by string equality, so this is safe.
  Touches `types.ts`, `request-validation.ts` (guard → `typeof === "string"`),
  the sheet's feature options (now loaded), and the DB feature mapping.

## API Impact

New REST routes (single demo team, server-side validated):
- `GET/POST /api/participants`, `PUT/DELETE /api/participants/[id]`
- `GET/POST /api/rooms`, `PUT/DELETE /api/rooms/[id]`
- `GET/POST /api/room-features`, `PUT/DELETE /api/room-features/[id]`

New DB-layer functions in `db/scheduling-data.ts` (or a sibling module):
list/create/update/delete for participants, rooms, and features, threading
availability windows and room features. Reuses `DEMO_TEAM_ID`/`DEMO_CALENDAR_ID`.

## Scheduling Engine Impact

None beyond the `ResourceFeature` widening (string equality already).

## Tests

- `request-validation` unit tests for the new payload guards (participant, room,
  feature) — required fields, types, date validity.
- Manual browser verification: create a person/room/feature, see it in the
  calendar sheet's invite/feature/room controls, edit and delete.

## Open Questions

- Deleting a room currently nulls `CalendarEvent.roomId` (schema `SetNull`);
  deleting a person cascades them out of events. Surface these as confirm
  dialogs; no soft-delete in this slice.
