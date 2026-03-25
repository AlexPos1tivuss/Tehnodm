# Repair Story Pro

Full-stack service center management application for "ТехноДимак" (tehnodm.by).

## Architecture

- **Monorepo** managed by pnpm workspaces
- **Frontend**: React + Vite + TypeScript + Tailwind CSS (`artifacts/repair-story-pro`)
- **Backend**: Express + TypeScript (`artifacts/api-server`)
- **Database**: PostgreSQL via Drizzle ORM (`lib/db`)
- **API Spec**: OpenAPI 3.1 with Orval codegen (`lib/api-spec`)
- **Generated clients**: `lib/api-client-react` (React Query hooks), `lib/api-zod` (Zod validators)

## Database Schema

- `users` — id, email, passwordHash, name, role (client/technician/admin), createdAt
- `bookings` — id, code (R-XXXXX), device, issue, status, appointmentAt, clientId, technicianId, timestamps
- `repair_logs` — id, bookingId, fromStatus, toStatus, note, byUserId, createdAt
- `work_sessions` — id, userId, clockIn, clockOut, note, createdAt (time tracking)

## Key Features

- Auth: register/login with JWT, role-based access (client, technician, admin)
- Booking workflow: new → accepted → diagnosing → repairing → ready → closed
- Real-time updates via Socket.io
- Public tracker by repair code
- PDF/CSV export
- Calendar slots (30-min, 09:00-18:00)
- Troubleshooter decision tree
- **Time Tracking**: Clock-in/out for technicians, admin management with CRUD, summary reports

## Time Tracking System

### Backend endpoints (all under `/api/time-tracking/`):
- `POST /clock-in` — Start shift (technician/admin)
- `POST /clock-out` — End shift (technician/admin)
- `GET /my-status` — Current shift status (technician/admin)
- `GET /sessions` — List all sessions with filters (admin)
- `POST /sessions` — Create manual session (admin)
- `PATCH /sessions/:id` — Edit session (admin)
- `DELETE /sessions/:id` — Delete session (admin)
- `GET /summary` — Per-employee hours summary (admin)

### Frontend:
- Technician dashboard: shift status card with timer, clock-in/out buttons
- Admin panel: "Рабочее время" tab with summary cards, filterable table, CRUD modal

## Demo Users (seed)

- admin@example.com / Passw0rd! (admin)
- tech1@example.com / Passw0rd! (technician)
- client1@example.com / Passw0rd! (client)
