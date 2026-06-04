# Task: All-Day And Multi-Day Scheduling

## Goal

Support event requests that are whole-day or multi-day blocks in addition to timed events.

## Non-Goals

- No recurring events.
- No partial-day split scheduling.
- No database persistence.
- No timezone configuration UI.

## User Flow

1. User chooses event type: timed, all-day, or multi-day.
2. Timed events use the existing time-window scheduling flow.
3. All-day events generate whole-day candidates over the search range.
4. Multi-day events generate contiguous day-block candidates.
5. Suggestions display either a time range or a date/date-range.
6. Accepted all-day and multi-day suggestions persist like other accepted events.

## Data Model Impact

Adds:
- `EventType`: `timed`, `all-day`, `multi-day`
- `eventType` on event requests
- optional `durationDays` for multi-day requests

## API Impact

No API yet. The UI still calls the scheduling engine directly.

## Scheduling Engine Impact

Implemented:
- timed candidate generation remains minute-based
- all-day candidate generation uses whole local calendar days
- multi-day candidate generation uses contiguous whole-day blocks
- existing participant/resource hard and soft constraints apply to whole-day ranges

## Tests

Added deterministic tests for:
- all-day candidate generation
- multi-day contiguous block generation
- required participant conflict invalidating a whole-day candidate
- optional participant conflict lowering whole-day score

## Open Questions

- Whether all-day availability should mean full midnight-to-midnight availability or configurable working-day availability.
- Whether multi-day events must use the same room for the full block or can change rooms per day.
