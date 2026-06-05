# Task: Unified Event Sheet, Selection Preview, and Editing

## Goal

Make creating and editing a calendar event use one and the same right-side
sheet. Clicking an event opens that sheet in an edit mode (instead of the small
details popover), pre-filled with the event's title, time, room, participants,
and a new free-text **description**. While selecting a range on the grid, the
prospective event is shown as a live preview block where it will land, reusing
the existing suggestion-preview rendering path (single source of truth). The
sheet opens with an animation.

This advances Phase 4 (Calendar UI MVP) and Phase 5 (resources): it extends the
existing "create / accept into calendar" flow with first-class editing and a
clearer creation affordance, without changing the calendar-first scheduling
philosophy.

## Non-Goals

- **Editing participants in edit mode is out of scope.** Participants are shown
  read-only when editing an existing event; changing them (and any deeper people
  handling) is deferred to a later "people" task. Create mode keeps the existing
  required/optional selection.
- No new manual-creation path that bypasses server-side constraint validation.
  Create and edit both keep running through the existing validated endpoints.
- No recurring events, no external calendar sync.
- No rich-text description; plain text only.
- No redesign of the scoring engine or suggestion flow.

## User Flow

### Create (existing, refined)
1. Header CTA "Add event" or press-and-drag on an empty grid range opens the
   sheet (now animated).
2. During the drag-select, a **preview block** renders in the grid at the
   selected range so the user sees where the event will land. It clears when the
   sheet is submitted or cancelled.
3. The sheet pre-fills the selected time. The user sets title, optional
   **description**, participants (required/optional), and room, optionally runs
   "Find best slot", and submits. The event is created via the existing accept
   endpoint (with validation).

### Edit (new)
4. Clicking an existing accepted event opens **the same sheet** in edit mode,
   pre-filled from the event (title, description, start/end, room). Participants
   are shown **read-only** in this mode. The small details popover is removed for
   accepted events.
5. The user changes the editable fields and saves; changes persist via the
   existing `PATCH /api/calendar-events/[id]` route (which already validates
   participant/room constraints). Delete stays available from the sheet.
6. Suggestion preview blocks remain non-interactive for edit (no sheet open,
   no drag), driven by the existing `preview` flag.

## Data Model Impact

- Add `description` (nullable text) to `CalendarEvent` in `schema.prisma` + a
  migration. `EventRequest.description` already exists; this mirrors it onto the
  persisted event.
- Extend the domain `CalendarEvent` type (`scheduling/types.ts`) with
  `description?: string`.
- Extend `AcceptSuggestionRequest` and `UpdateCalendarEventRequest`
  (`scheduling/api-types.ts`) with optional `description`, and the matching
  guards in `scheduling/request-validation.ts`.

## API Impact

- `POST /api/calendar-events` and `PATCH /api/calendar-events/[id]`: accept and
  persist `description`. No new endpoints.
- `db/scheduling-data.ts`: thread `description` through create/update/load.
  Editing continues to call `validateAcceptedCalendarEvent` — this is the one
  invariant that must not regress (manual edits must respect hard constraints).

## Scheduling Engine Impact

None. `description` is metadata the engine ignores. Candidate generation,
constraints, and scoring are unchanged.

## UI / SSOT Impact

- **Selection preview**: reuse the existing preview-event mechanism — render the
  in-progress selection as a `CalendarEvent` with `preview: true` and feed it
  through the same `suggestionEvents`/`EventBlock` path. Do **not** add a second
  rendering route for "the selection rectangle". The selection geometry already
  lives in `components/calendar/lib/interactions.ts` + `layout.ts`; the preview
  block consumes the same computed range.
- **One sheet**: `event-sheet.tsx` gains a `mode: "create" | "edit"` (or an
  optional `event` prop). Create keeps calling `onSubmit` (accept); edit calls a
  new `onUpdate` that hits PATCH. Field layout is shared.
- **Animation**: animate the sheet's mount/unmount (transform/opacity
  transition), respecting `prefers-reduced-motion`.

## Tests

- `request-validation` unit tests: `description` accepted as optional string,
  rejected when wrong type, in both accept and update payloads.
- A small unit test for the selection→preview-event mapping (pure function:
  range in → `preview:true` CalendarEvent out).
- Manual verification in the browser preview: drag-select shows a preview block;
  submitting creates the event at that range; clicking an event opens the
  pre-filled sheet; editing time into a conflict is rejected with the existing
  constraint message; description round-trips through create and edit.

## Decisions

- `description` is shown **only inside the sheet** (not on grid blocks/tooltips).
- Participants are **read-only in edit mode**; participant editing is deferred to
  the later "people" task.

## Open Questions

1. Animation style/duration — match any existing motion tokens, or introduce a
   small shared transition util?
