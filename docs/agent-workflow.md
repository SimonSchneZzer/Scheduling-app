# Agent Workflow

## Goal

This project should support AI-first development without losing engineering quality. New coding sessions should quickly understand the product goal, current roadmap, architecture direction, and quality gates before making changes.

## Startup Routine

At the beginning of substantial work:
1. Read `AGENTS.md`.
2. Read `docs/roadmap.md`.
3. Read the task-relevant concept or technical docs.
4. Read `docs/git-workflow.md` if the work may need a branch, commit, push, or PR.
5. Inspect the smallest useful set of source files.
6. Make a focused change.
7. Verify with the relevant quality gates.
8. Update docs when decisions, commands, structure, or behavior changed.

For tiny tasks, keep this lightweight, but do not skip `AGENTS.md`.

## Credit Optimization

- Prefer short targeted file reads over broad exploration.
- Use existing docs as the source of truth instead of rediscovering decisions.
- Keep `AGENTS.md` short and high-signal.
- Put long explanations in `docs/`.
- Work in small vertical slices that produce testable behavior.
- Avoid speculative abstractions before the scheduling rules are stable.
- Do not scaffold unused layers just because they might be needed later.

## Feature Workflow

For meaningful features, create or update a short task spec in `docs/tasks/`.

Recommended task spec shape:
- goal
- non-goals
- user flow
- data model impact
- API impact
- scheduling engine impact
- tests
- open questions

Only create a task spec when it reduces ambiguity. Small cleanup work does not need one.

## Implementation Rules

- Keep the scheduling engine independent from frontend and database code.
- Pass plain input data into scheduling logic and return plain results.
- Make score explanations part of the engine output.
- Treat required participants as hard constraints.
- Treat optional participants as scoring inputs.
- Treat offline room/device requirements as constraints.
- Relax physical constraints for online events unless explicitly required.

## Completion Routine

Before saying implementation work is complete:
1. Check `git status`.
2. Run relevant tests, typechecks, builds, or lint commands when available.
3. Manually inspect affected docs and generated outputs where applicable.
4. Mention any checks that could not be run.
5. Keep the final response short and focused on changed files, verification, and next step.
