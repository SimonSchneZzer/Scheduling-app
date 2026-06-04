# Git Workflow

## Goals

Use Git to keep AI-driven work reviewable, reversible, and easy to continue in a new context.

## Branches

Default branch:
- `main`

Use a feature branch for non-trivial implementation work:
- `feature/<short-name>` for product features
- `fix/<short-name>` for bug fixes
- `docs/<short-name>` for documentation-only work
- `chore/<short-name>` for maintenance and setup
- `spike/<short-name>` for disposable exploration

When Codex creates a branch, prefix it with `codex/` unless the user asks for a different branch name.

Examples:
- `feature/event-request-form`
- `feature/scheduling-engine-mvp`
- `fix/required-participant-filter`
- `docs/agent-workflow`
- `chore/app-scaffold`
- `codex/chore/app-scaffold`

Keep branch names lowercase and hyphen-separated.

## When To Branch

Create a branch before:
- scaffolding frontend/backend/database structure
- adding or changing scheduling engine behavior
- adding database schema or migrations
- implementing a user-facing feature
- doing work expected to take more than one focused session
- doing risky refactors

Working directly on `main` is acceptable for:
- tiny docs edits
- typo fixes
- very small repository setup changes before the first remote exists

When unsure, create a branch.

## Branch Startup Checklist

Before creating a branch:
1. Check `git status`.
2. Do not overwrite unrelated user changes.
3. Make sure the current worktree state is understood.
4. If uncommitted changes already belong to the same task, keep them.
5. If uncommitted changes are unrelated, ask before mixing work.

## Commits

Commit in small logical units.

Good commit examples:
- `docs: add agent workflow`
- `chore: scaffold next app`
- `feat: add event request model`
- `test: cover required participant constraints`
- `fix: exclude unavailable required participants`

Use conventional prefixes where they fit:
- `feat:`
- `fix:`
- `docs:`
- `test:`
- `refactor:`
- `chore:`

Each commit should ideally:
- build on its own
- avoid unrelated file churn
- include tests when behavior changes
- update docs when project structure or behavior changes

## Pull Requests

Use PRs once a remote repository exists.

PRs should include:
- summary
- verification performed
- screenshots or recordings for meaningful UI changes
- migrations noted explicitly
- remaining risks or follow-up tasks

## Agent Rules

Agents should:
- read `AGENTS.md`, `docs/roadmap.md`, and this file before Git operations
- avoid destructive Git commands unless the user explicitly asks
- never revert unrelated user changes
- check status before and after staging
- stage only files relevant to the current task
- mention uncommitted changes clearly in the final response

Agents should not:
- create noisy commits mixing docs, scaffolding, and feature logic unless they are one coherent setup unit
- rewrite branch history unless explicitly requested
- push without user intent or an established workflow
