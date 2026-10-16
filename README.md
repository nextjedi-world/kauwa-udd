# Kauwa Udd

A party game: hold, release, react, last bird wins the sky. Next.js 16 on Vercel, DynamoDB (single
table), Ably realtime, Vercel Workflow for rounds, Auth.js guest login. Live at https://kauwa-udd.vercel.app.

## Run locally

```bash
pnpm install            # or: make setup
cp .env.example .env.local   # fill ABLY_API_KEY and AUTH_SECRET
pnpm db:local           # DynamoDB Local on :8000 (keep running)
pnpm db:setup && pnpm db:seed
pnpm dev                # http://localhost:3000
```

## Checks

`make verify` runs lint, Prettier check, typecheck, Vitest and `next build`, the same as CI.
Git hooks (lefthook) are installed by `make setup`.

## Environment

Names only live in [.env.example](./.env.example). Production uses Vercel OIDC to reach DynamoDB
(`AWS_ROLE_ARN`), so no AWS keys are stored. Set `SENTRY_DSN` to enable error reporting (no-op when unset).

## Deploy

Vercel's Git integration deploys `main` to production and each pull request to a preview. Set env vars
in the Vercel project, not in git.

## Docs

[API](./docs/API.md), [schema](./docs/SCHEMA.md), [QA report](./docs/QA-REPORT.md),
[submission copy](./docs/SUBMISSION.md). Agent instructions: [CLAUDE.md](./CLAUDE.md).
