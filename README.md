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
NODE_ENV=production PORT=3100 bun run src/server/index.ts
```

The SQLite database is stored in `data/scheduler.db` so updates to the source tree do not affect persisted state.

## PWA notes

- Android browsers will generally surface an install prompt automatically.
- On iOS, install is manual through the Share menu and `Add to Home Screen`.
- The app shell is cached for offline use; API requests remain network-first.

## Deployment

The app is designed to run as a single Fastify process behind a TLS-terminating reverse proxy (for example, Caddy or Nginx).

### 1) Prepare the host

- Install Bun on the target host.
- Create a service user (example: `scheduler`).
- Copy this project to a deployment directory (example: `/opt/scheduler`).

### 2) Install and build

Run from the project directory:

```bash
bun install --frozen-lockfile
bun run build
bun run migrate
```

Notes:

- `bun run build` is required if you want the server to also serve the frontend. Without it, `/` returns a fallback page.
- The SQLite file is created at `data/scheduler.db` relative to the process working directory.

### 3) Configure systemd

The repository includes `scheduler.service` as a starting point, but you should verify Bun path and environment for your machine.

Recommended unit (adjust user/group/paths as needed):

```ini
[Unit]
Description=Personal Scheduler
After=network.target

[Service]
Type=simple
User=scheduler
Group=scheduler
WorkingDirectory=/opt/scheduler
ExecStart=/usr/bin/env bun run src/server/index.ts
Environment=NODE_ENV=production
Environment=PORT=3100
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Then enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now scheduler
sudo systemctl status scheduler
```

### 4) Put a reverse proxy in front

Proxy all traffic to `127.0.0.1:3100`, and keep forwarding host/protocol information.

Example Caddyfile:

```caddy
scheduler.example.com {
	reverse_proxy 127.0.0.1:3100
}
```

Fastify is configured with `trustProxy: true`, so forwarded headers are used for generated URLs (such as iCal export links).

### 5) Verify after deploy

- Open the app over HTTPS and complete setup/login.
- Confirm authenticated requests under `/api/*` succeed.
- In Settings, confirm the generated iCal export URL uses your public HTTPS host.
- Restart the service once and confirm data persists (SQLite file under `data/`).
