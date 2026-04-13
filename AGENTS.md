# AGENTS.md — Repository Agent Guide

## Purpose

This file tells AI agents (GitHub Copilot, other assistants) how to work in this repository.
It summarizes the stack, key files, developer workflows, safety rules, and example prompts so edits are safe, minimal, and reviewable.

## Repository summary

- Runtime: Bun
- Backend: Fastify (src/server)
- ORM: Drizzle with SQLite (src/server/db)
- Frontend: React + TypeScript built with Vite (src/client)
- Natural language parsing: `chrono-node`
- Recurrence + iCal export: `rrule`

## Quick dev commands

Run these locally to verify changes:

```
bun install
bun run migrate         # apply Drizzle/SQL migrations
bun run dev:server      # backend (PORT or 3100)
bun run dev:client      # Vite (5173)
bun run build           # production build
bun run format          # code formatter used by this repo
```

## Important paths

- Server entry: `src/server/index.ts`
- Server routes: `src/server/routes/`
- DB code: `src/server/db/` (client, migrate, schema)
- Migrations: `src/server/db/migrations/`
- Frontend: `src/client/` (App.tsx, main.tsx, components/)
- Public assets / PWA: `public/` (manifest.json, sw.js, icons)
- Persistent DB (do not commit changes): `data/calist.db`

## Agent editing guidelines

- Scope: safe to change application code (server and client). Avoid editing files under `data/` or other runtime state.
- Fix root causes when feasible, but keep risk low — do not perform broad refactors without approval.
- Type safety: preserve or add TypeScript types rather than removing them.
- Formatting: run `bun run format` before finishing edits.
- Dependencies: if you add dependencies, update `package.json` and run `bun install`.
- Migrations: do not add schema-breaking migrations without asking. Always run `bun run migrate` locally to validate.
- Database: never commit or alter `data/calist.db` in the repository. If tests or local runs need a fresh DB, use a temporary copy.

## Edit/patch conventions for automated edits

- Keep diffs small and local to the feature/bug.
- Follow existing code style and import patterns used in the repo.
- Do not add license headers or change file encodings.
- Run prettier (using `bun run format`) after making changes
- Commit any changes made with a clear message. The author should be GitHub Copilot (`--author="GitHub Copilot <copilot@github.com>"`).

## Testing and verification

After making changes, verify as appropriate:

1. Run `bun run migrate` to ensure migrations apply cleanly.
2. Start backend: `bun run dev:server` and confirm it listens (default 3100).
3. Start frontend: `bun run dev:client` and verify UI flows (http://localhost:5173).
4. Manually test key flows: quick add, recurring events, iCal export, and authentication flows.

## Commit message style

- Use imperative mood: "Fix event parsing for recurring rules"
- Keep subject ≤ 72 characters and add a short body if context is needed.

## Safety and escalation

- Ask for confirmation before: schema changes, large refactors, or operations that modify `data/`.
- When in doubt, request review from the repository owner or the person who opened the task.
- Be conservative: prefer asking for clarification over making large, high-risk changes.

## Notes for automated tools

- This repository uses Bun scripts. When running commands in CI or locally, ensure Bun is available in the environment.
- Ports: server default is 3100; Vite dev is 5173.
