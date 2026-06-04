# Web App

Next.js application for the Scheduling App team calendar.

## Commands

Prefer running commands from the repository root:

```bash
pnpm dev
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

App-local equivalents:

```bash
pnpm --filter @scheduling-app/web dev
pnpm --filter @scheduling-app/web typecheck
pnpm --filter @scheduling-app/web lint
pnpm --filter @scheduling-app/web test
pnpm --filter @scheduling-app/web build
```

## Notes

- The initial page is a static scheduling dashboard shell.
- Scheduling engine code should be framework-independent and tested with Vitest.
- Do not put scheduling rules directly in React components.
