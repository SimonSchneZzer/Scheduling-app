# Task: Calendar View

## Goal

Replace the sorted list of accepted events on the dashboard with a real calendar grid. Users see seed and accepted events laid out by time, can switch between week and day, navigate between weeks/days, filter by room or person, open event details, and see pending suggestions overlaid on the grid before accepting them.

## Non-Goals

- No drag-to-move, drag-to-resize, or in-grid editing.
- No recurring events.
- No external calendar sync (Google, Outlook).
- No new persistence layer; the view reads existing `SchedulingData` and `acceptedEvents`.
- No timezone configuration UI; the grid stays in the user's local timezone.
- No month view in this slice.

## User Flow

1. The dashboard shows a calendar grid in place of the current "Team calendar" list section.
2. Default view is **week**, starting on the Monday of the week containing the configured `eventDate`.
3. A toggle switches between **week** (Mon–Fri or Mon–Sun, see Open Questions) and **day**.
4. Header shows the visible range and has previous/next/today controls.
5. Timed events render as positioned blocks in a time grid (default 08:00–18:00, see Open Questions).
6. All-day and multi-day events render in a swimlane above the time grid; multi-day events span across day columns.
7. Each block shows title, time, and a small room badge if assigned. Color/border distinguishes `source: "seed"` from `source: "accepted"`.
8. Clicking a block opens a details panel (popover or right drawer) showing title, full time range, source, participants (resolved names), room name, and a close action.
9. A filter section (in the existing sidebar) lets the user toggle visibility per room and per team member. Filters are inclusive: hiding a room hides events booked into that room; hiding a person hides events where they are a participant.
10. After a "Calculate" run, ranked suggestions are also rendered in the grid as dashed/translucent blocks. Clicking one opens the same details panel with an "Accept" action that calls the existing accept flow.
11. Accepting a suggestion removes the dashed overlay and renders a solid accepted block.

## Data Model Impact

None. All required data exists in the current model:
- `CalendarEvent.start/end`, `source`, `participantIds`, `resourceId`
- `ScheduleSuggestion.start/end`, `assignedResource`, `explanations`
- `TeamMember.id/name`
- `RoomResource.id/name`

If suggestions need to render without an accepted event id, the existing in-memory `suggestions` state from the dashboard is sufficient; nothing needs to be persisted.

## API Impact

None. The view consumes:
- Existing `GET /api/scheduling-data` for seed + accepted events, members, rooms.
- Existing `POST /api/calendar-events` for the accept action triggered from the details panel.

## Scheduling Engine Impact

None. The engine continues to produce `ScheduleSuggestion[]`; only rendering changes.

## UI Architecture

Extract from the single `scheduling-dashboard.tsx` into focused, framework-independent components under `apps/web/src/components/calendar/`:

- `CalendarView.tsx` — orchestrator: holds `mode: "week" | "day"`, `anchorDate`, `filters`; receives events, suggestions, members, rooms via props; emits `onAcceptSuggestion`.
- `CalendarHeader.tsx` — range label, prev/next/today, mode toggle.
- `TimeGrid.tsx` — day columns + hour rows; positions `EventBlock`s by `start/end`.
- `AllDayLane.tsx` — swimlane above the grid; lays out all-day and multi-day spans.
- `EventBlock.tsx` — one timed event; variants for seed, accepted, and suggestion.
- `EventDetails.tsx` — popover/drawer triggered by click.
- `CalendarFilters.tsx` — per-room and per-person toggles; lives in the existing sidebar.

Pure helpers under `apps/web/src/components/calendar/lib/`:
- `range.ts` — `weekRange(anchor)`, `dayRange(anchor)`, `addDays`, `startOfDay`.
- `layout.ts` — `groupEventsByDay`, `splitAllDayVsTimed`, `positionInGrid(event, dayStart, pxPerHour)`, overlap-column assignment for concurrent events.

These helpers must be pure functions on plain data (no React, no Date mutation), to mirror the engine's testability discipline (`AGENTS.md` line 89).

## Recommended Slicing

The full scope is large for one PR. Suggested incremental slices, each shippable:

1. **Week grid for timed events** — `CalendarView` + `TimeGrid` + `EventBlock`. Replaces the sorted list. **Done.**
2. **All-day swimlane** — `AllDayLane`, multi-day spans across columns. **Done** (pulled into slice 1 so all-day accepted events do not disappear from the calendar).
3. **Week navigation** — prev/next/today. **Done** (pulled into slice 1 for usability). Day-view toggle is still pending.
4. **Filters** — `CalendarFilters` in the sidebar.
5. **Event details** — `EventDetails` popover. **Done.** Suggestions overlay (dashed blocks, accept-from-grid) still pending.

Delivered in slice 5a — event details (`event-details.tsx`):
- Click any timed block or all-day bar to open a popover anchored to it (portal to `document.body`, so the horizontal scroll container never clips it).
- Popover flips to the left near the right edge and clamps to the viewport; closes on outside click, Escape, scroll, or resize.
- Shows title, source, a type-aware time description (`formatEventWhen`), room + capacity, and participant name chips.
- The selected block gets a ring; navigating weeks clears the selection.

Delivered in slice 1 (`apps/web/src/components/calendar/`):
- `calendar-view.tsx` orchestrator, `calendar-header.tsx`, `time-grid.tsx`, `all-day-lane.tsx`, `event-block.tsx`.
- Pure helpers `lib/range.ts`, `lib/layout.ts`, `lib/format.ts`, `lib/dimensions.ts`.
- Unit tests for `range` and `layout`; current-time indicator deferred to mount to avoid hydration mismatch.

Each slice updates `docs/roadmap.md` Phase 4 progress.

## Tests

Vitest unit tests for the pure layout helpers (no React rendering needed for the first slice):
- `weekRange` returns Monday-anchored 7-day span for various input dates, including DST boundaries.
- `splitAllDayVsTimed` separates events by duration ≥ 24h or whole-day alignment.
- `positionInGrid` returns correct top/height for timed events; clamps events that start before / end after the visible window.
- Overlap-column assignment: two overlapping events get adjacent columns; a third nested event gets a third column; a non-overlapping later event reuses column 0.
- `groupEventsByDay` places multi-day events into every day they touch.

UI smoke tests deferred to Playwright in a later phase (matches current project posture: no UI tests yet).

## Open Questions

- Week view: Mon–Fri only, or full Mon–Sun? The demo data sits on weekdays, but team scheduling will likely want weekends visible at some point.
- Visible hour range: fixed 08:00–18:00, configurable, or auto-fit to the earliest/latest event of the visible range?
- Event details: inline popover anchored to the block, or right-side drawer? Drawer scales better for long participant lists; popover feels lighter.
- Suggestions overlay z-order: should suggestions render above accepted events, or only in empty space? "Above" makes them more visible but visually noisy.
- Should the filter state persist (localStorage) across reloads, or reset each session?
