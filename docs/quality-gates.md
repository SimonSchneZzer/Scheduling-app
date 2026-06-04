# Quality Gates

## Always

- Keep changes focused on the requested goal.
- Do not commit secrets or local environment files.
- Do not commit dependency folders or build output.
- Update documentation when product behavior, architecture, commands, or repository structure changes.
- Check `git status` before finishing.

## Before Marking Code Complete

Run applicable checks once the stack exists:
- typecheck
- unit tests
- lint
- build

If a check does not exist yet, say that explicitly.

## Scheduling Engine Changes

Scheduling logic needs tests when changing:
- candidate slot generation
- required participant availability
- optional participant scoring
- room constraints
- device/resource constraints
- online/offline constraint relaxation
- all-day or multi-day event handling
- score weights or score explanations

Expected test style:
- deterministic input data
- explicit expected valid/invalid slots
- explicit score or score-order assertions
- edge cases for unavailable required participants and partially available optional participants

## Frontend Changes

For UI work:
- Verify responsive layout where the changed screen matters.
- Ensure text does not overlap or overflow.
- Prefer dense calendar/product UI over marketing-page design.
- Use real product flows as the first screen, not a landing page.

## Backend And Database Changes

For backend or DB work:
- Add or update migrations when schema changes.
- Keep API validation explicit.
- Preserve tenant/team boundaries in queries.
- Avoid putting scheduling rules only in request handlers.
- Keep seed data realistic enough to test calendar conflicts.

## Documentation Changes

For docs:
- Keep `AGENTS.md` concise.
- Put detailed reasoning in `docs/`.
- Add an ADR when a decision affects future architecture or tradeoffs.
- Update `docs/roadmap.md` when phase status changes.
