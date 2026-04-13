# Personal Scheduler

A Bun-powered personal scheduler with a Fastify API, a React + TypeScript frontend, SQLite storage, quick natural-language entry, installable PWA support, and iCal export.

## Stack

- Bun runtime
- Fastify server
- Drizzle ORM with SQLite
- React + TypeScript client built with Vite
- `chrono-node` for natural language date parsing
- `rrule` for recurrence parsing and iCal recurrence export

## Development

```bash
bun install
bun run migrate
bun run dev:server
bun run dev:client
```

The server listens on `PORT` or `3100` by default. The Vite client runs on `5173` in development.

## Production build

```bash
bun install
bun run migrate
bun run build
PORT=3100 bun run src/server/index.ts
```

The SQLite database is stored in `data/scheduler.db` so updates to the source tree do not affect persisted state.

## PWA notes

- Android browsers will generally surface an install prompt automatically.
- On iOS, install is manual through the Share menu and `Add to Home Screen`.
- The app shell is cached for offline use; API requests remain network-first.

## Deployment

Use the included `scheduler.service` unit behind a TLS-terminating reverse proxy such as Caddy.
