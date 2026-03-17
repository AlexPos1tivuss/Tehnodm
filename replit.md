# Repair Story Pro

## Overview

Full-stack service center management app for **ТехноДимак** (tehnodm.by) — welding and industrial equipment services. pnpm workspace monorepo using TypeScript.

Services: welding equipment maintenance, plasma portal repair/modernization, equipment rental, general welding equipment repair.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite + Tailwind CSS + React Query (Orval-generated hooks)
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Auth**: JWT (jsonwebtoken) + bcrypt, 3 roles: client / technician / admin
- **Realtime**: Socket.io (path: `/api/socket.io`)
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Export**: PDFKit (PDF), CSV
- **Tests**: Vitest + Supertest

## Structure

```text
├── artifacts/
│   ├── api-server/          # Express API server
│   │   ├── src/
│   │   │   ├── routes/      # auth, bookings, calendar, export, users, health
│   │   │   ├── middlewares/  # JWT auth middleware
│   │   │   ├── lib/         # auth utils, booking code generator, calendar slots
│   │   │   ├── services/    # Socket.io
│   │   │   └── __tests__/   # Vitest tests (unit + API integration)
│   │   └── package.json
│   └── repair-story-pro/    # React frontend (Vite)
│       ├── src/
│       │   ├── pages/       # home, login, register, dashboard, admin, technician, track, troubleshooter, booking, calendar
│       │   ├── components/  # Navbar, StatusBadge, PageTransition
│       │   └── lib/         # auth context, troubleshooter-data, utils
│       └── public/data/tree.json
├── lib/
│   ├── api-spec/            # OpenAPI 3.1 spec + Orval config
│   ├── api-client-react/    # Generated React Query hooks
│   ├── api-zod/             # Generated Zod schemas
│   └── db/                  # Drizzle ORM schema (users, bookings, repair_logs)
├── scripts/
│   └── src/seed.ts          # Seed: admin, tech1, client1 + sample booking
├── README.md
├── demo.sh
└── replit.md
```

## Key Commands

- `pnpm install` — install all deps
- `pnpm --filter @workspace/scripts run seed` — create demo users
- `pnpm --filter @workspace/api-server run test` — run Vitest tests (27 tests)
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API client + Zod schemas
- `pnpm --filter @workspace/db run push` — push schema to DB

## Demo Users

| Email | Password | Role |
|-------|----------|------|
| admin@example.com | Passw0rd! | admin |
| tech1@example.com | Passw0rd! | technician |
| client1@example.com | Passw0rd! | client |

## API Routes

All mounted under `/api`:

- `POST /auth/register`, `POST /auth/login`, `GET /auth/me`
- `GET /bookings` (admin/tech), `POST /bookings` (auth), `GET /bookings/my` (auth)
- `GET /bookings/track/:code` (public), `PATCH /bookings/:id/status` (admin/tech), `PATCH /bookings/:id/assign` (admin)
- `GET /calendar/slots?date=YYYY-MM-DD` (public)
- `GET /export/:id/pdf` (auth), `GET /export/csv` (admin)
- `GET /users/technicians` (admin), `GET /users` (admin)
- `GET /stats` (admin) — booking statistics
- `GET /bookings-with-clients` (admin) — bookings with client info joined
- `GET /healthz`

## Booking Status Workflow

```
new → accepted → diagnosing → repairing → ready → closed
```

Each transition creates a `repair_logs` entry and emits Socket.io `booking:update`.

## JWT Configuration

- Secret: env `JWT_SECRET` (default: `repair-story-pro-secret-key-change-in-production`)
- Expiry: 15 minutes
- Token passed via `Authorization: Bearer <token>`

## DB Schema

- `users`: id, name, email (unique), passwordHash, role (client/technician/admin), createdAt
- `bookings`: id, code (unique, R-XXXXX), device, issue, status, appointmentAt, clientId (FK), technicianId (FK), createdAt, updatedAt
- `repair_logs`: id, bookingId (FK), fromStatus, toStatus, note, changedBy (FK), createdAt

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` with `composite: true`. Root `tsconfig.json` lists all packages as project references. Typecheck from root: `pnpm run typecheck`.

## Packages

### `artifacts/api-server` (`@workspace/api-server`)
Express 5 API server with JWT auth, CRUD bookings, status workflow, calendar slots, PDF/CSV export, Socket.io realtime.

### `artifacts/repair-story-pro` (`@workspace/repair-story-pro`)
React + Vite frontend. Russian UI for ТехноДимак branding. Pages: Home, Login, Register, ClientDashboard, AdminDashboard (full: stats, tabs, search, detail drawer, status modal, user/technician management), TechnicianDashboard, PublicTracker, BookingForm, Calendar, Troubleshooter.

### `lib/db` (`@workspace/db`)
Drizzle ORM schema + PostgreSQL connection. Tables: users, bookings, repair_logs.

### `lib/api-spec` (`@workspace/api-spec`)
OpenAPI 3.1 spec + Orval codegen config.

### `lib/api-zod` (`@workspace/api-zod`)
Generated Zod schemas from OpenAPI spec.

### `lib/api-client-react` (`@workspace/api-client-react`)
Generated React Query hooks + fetch client.

### `scripts` (`@workspace/scripts`)
Utility scripts. Run via `pnpm --filter @workspace/scripts run <script>`.
