# ADR 0001: Application Stack Direction

## Status

Proposed

## Context

The product is an intelligent team calendar with a scheduling engine. The first implementation should support fast iteration while keeping the scheduling logic testable and independent from UI and persistence concerns.

The project needs:
- frontend UI for calendar and scheduling suggestions
- backend APIs for event requests, schedule runs, and accepted calendar events
- relational data storage for teams, participants, rooms, resources, and time-based events
- deterministic tests for scheduling behavior

## Decision

Start with a TypeScript-first stack:
- Next.js for the web application
- Next.js API routes for the MVP backend
- PostgreSQL for the database
- Prisma or Drizzle for ORM, to be finalized during scaffolding
- Vitest for scheduling engine tests
- Playwright later for important UI flows

The scheduling engine must be implemented as framework-independent TypeScript business logic.

## Consequences

Positive:
- One language across frontend, backend, and scheduling logic.
- Fast MVP setup.
- Easy path to shared types.
- Scheduling engine can be tested without browser or database setup.
- Backend can be extracted later if needed.

Tradeoffs:
- Next.js API routes may become limiting if scheduling jobs become long-running.
- A separate worker or backend service may be needed later.
- ORM choice is still open and should be decided before schema implementation.

## Follow-Up

During application scaffold, decide between Prisma and Drizzle and update this ADR or add a new one.
