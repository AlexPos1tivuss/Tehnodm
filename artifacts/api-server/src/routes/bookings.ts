import { Router, type IRouter } from "express";
import { eq, desc, and } from "drizzle-orm";
import { db, bookingsTable, repairLogsTable, usersTable } from "@workspace/db";
import {
  CreateBookingBody,
  ListBookingsQueryParams,
  ListBookingsResponseItem,
  TrackBookingParams,
  TrackBookingResponse,
  GetBookingParams,
  GetBookingResponse,
  UpdateBookingStatusParams,
  UpdateBookingStatusBody,
  UpdateBookingStatusResponse,
  AssignTechnicianParams,
  AssignTechnicianBody,
  AssignTechnicianResponse,
} from "@workspace/api-zod";
import { requireAuth, requireRole } from "../middlewares/auth";
import { generateBookingCode } from "../lib/bookingCode";
import { getIO } from "../services/socket";

const VALID_TRANSITIONS: Record<string, string[]> = {
  new: ["accepted"],
  accepted: ["diagnosing"],
  diagnosing: ["repairing"],
  repairing: ["ready"],
  ready: ["closed"],
};

const router: IRouter = Router();

router.get("/bookings", requireAuth, requireRole("admin", "technician"), async (req, res): Promise<void> => {
  const params = ListBookingsQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const conditions = [];
  if (params.data.status) {
    conditions.push(eq(bookingsTable.status, params.data.status));
  }
  if (params.data.technicianId) {
    conditions.push(eq(bookingsTable.technicianId, params.data.technicianId));
  }

  const bookings = conditions.length > 0
    ? await db.select().from(bookingsTable).where(and(...conditions)).orderBy(desc(bookingsTable.createdAt))
    : await db.select().from(bookingsTable).orderBy(desc(bookingsTable.createdAt));

  res.json(bookings.map(b => ListBookingsResponseItem.parse(b)));
});

router.post("/bookings", requireAuth, async (req, res): Promise<void> => {
  const body = { ...req.body };
  if (body.appointmentAt && typeof body.appointmentAt === "string") {
    body.appointmentAt = new Date(body.appointmentAt);
  }
  const parsed = CreateBookingBody.safeParse(body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const code = generateBookingCode();
  const [booking] = await db.insert(bookingsTable).values({
    code,
    device: parsed.data.device,
    issue: parsed.data.issue,
    appointmentAt: parsed.data.appointmentAt || null,
    clientId: req.user!.userId,
    status: "new",
  }).returning();

  res.status(201).json(ListBookingsResponseItem.parse(booking));
});

router.get("/bookings/my", requireAuth, async (req, res): Promise<void> => {
  const bookings = await db.select().from(bookingsTable)
    .where(eq(bookingsTable.clientId, req.user!.userId))
    .orderBy(desc(bookingsTable.createdAt));

  res.json(bookings.map(b => ListBookingsResponseItem.parse(b)));
});

router.get("/bookings/track/:code", async (req, res): Promise<void> => {
  const params = TrackBookingParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [booking] = await db.select().from(bookingsTable).where(eq(bookingsTable.code, params.data.code));
  if (!booking) {
    res.status(404).json({ error: "Booking not found" });
    return;
  }

  const logs = await db.select({
    id: repairLogsTable.id,
    bookingId: repairLogsTable.bookingId,
    fromStatus: repairLogsTable.fromStatus,
    toStatus: repairLogsTable.toStatus,
    note: repairLogsTable.note,
    byUserId: repairLogsTable.byUserId,
    byUserName: usersTable.name,
    createdAt: repairLogsTable.createdAt,
  }).from(repairLogsTable)
    .innerJoin(usersTable, eq(repairLogsTable.byUserId, usersTable.id))
    .where(eq(repairLogsTable.bookingId, booking.id))
    .orderBy(repairLogsTable.createdAt);

  res.json(TrackBookingResponse.parse({ booking, logs }));
});

router.get("/bookings/:id", requireAuth, async (req, res): Promise<void> => {
  const params = GetBookingParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [booking] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, params.data.id));
  if (!booking) {
    res.status(404).json({ error: "Booking not found" });
    return;
  }

  const userRole = req.user!.role;
  if (userRole === "client" && booking.clientId !== req.user!.userId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const logs = await db.select({
    id: repairLogsTable.id,
    bookingId: repairLogsTable.bookingId,
    fromStatus: repairLogsTable.fromStatus,
    toStatus: repairLogsTable.toStatus,
    note: repairLogsTable.note,
    byUserId: repairLogsTable.byUserId,
    byUserName: usersTable.name,
    createdAt: repairLogsTable.createdAt,
  }).from(repairLogsTable)
    .innerJoin(usersTable, eq(repairLogsTable.byUserId, usersTable.id))
    .where(eq(repairLogsTable.bookingId, booking.id))
    .orderBy(repairLogsTable.createdAt);

  res.json(GetBookingResponse.parse({ booking, logs }));
});

router.patch("/bookings/:id/status", requireAuth, requireRole("admin", "technician"), async (req, res): Promise<void> => {
  const params = UpdateBookingStatusParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = UpdateBookingStatusBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [booking] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, params.data.id));
  if (!booking) {
    res.status(404).json({ error: "Booking not found" });
    return;
  }

  const allowed = VALID_TRANSITIONS[booking.status];
  if (!allowed || !allowed.includes(body.data.to)) {
    res.status(400).json({ error: `Invalid status transition from ${booking.status} to ${body.data.to}` });
    return;
  }

  const [updated] = await db.update(bookingsTable)
    .set({ status: body.data.to })
    .where(eq(bookingsTable.id, params.data.id))
    .returning();

  const [log] = await db.insert(repairLogsTable).values({
    bookingId: booking.id,
    fromStatus: booking.status,
    toStatus: body.data.to,
    note: body.data.note || null,
    byUserId: req.user!.userId,
  }).returning();

  const [logWithUser] = await db.select({
    id: repairLogsTable.id,
    bookingId: repairLogsTable.bookingId,
    fromStatus: repairLogsTable.fromStatus,
    toStatus: repairLogsTable.toStatus,
    note: repairLogsTable.note,
    byUserId: repairLogsTable.byUserId,
    byUserName: usersTable.name,
    createdAt: repairLogsTable.createdAt,
  }).from(repairLogsTable)
    .innerJoin(usersTable, eq(repairLogsTable.byUserId, usersTable.id))
    .where(eq(repairLogsTable.id, log.id));

  const allLogs = await db.select({
    id: repairLogsTable.id,
    bookingId: repairLogsTable.bookingId,
    fromStatus: repairLogsTable.fromStatus,
    toStatus: repairLogsTable.toStatus,
    note: repairLogsTable.note,
    byUserId: repairLogsTable.byUserId,
    byUserName: usersTable.name,
    createdAt: repairLogsTable.createdAt,
  }).from(repairLogsTable)
    .innerJoin(usersTable, eq(repairLogsTable.byUserId, usersTable.id))
    .where(eq(repairLogsTable.bookingId, booking.id))
    .orderBy(repairLogsTable.createdAt);

  try {
    const io = getIO();
    io.emit("booking:update", {
      bookingId: booking.id,
      newStatus: body.data.to,
      log: logWithUser,
    });
  } catch (err) {
    console.error("Socket.io emit failed:", err);
  }

  res.json(UpdateBookingStatusResponse.parse({ booking: updated, logs: allLogs }));
});

router.patch("/bookings/:id/assign", requireAuth, requireRole("admin"), async (req, res): Promise<void> => {
  const params = AssignTechnicianParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = AssignTechnicianBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [booking] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, params.data.id));
  if (!booking) {
    res.status(404).json({ error: "Booking not found" });
    return;
  }

  const [tech] = await db.select().from(usersTable).where(eq(usersTable.id, body.data.technicianId));
  if (!tech || tech.role !== "technician") {
    res.status(400).json({ error: "Invalid technician" });
    return;
  }

  const [updated] = await db.update(bookingsTable)
    .set({ technicianId: body.data.technicianId })
    .where(eq(bookingsTable.id, params.data.id))
    .returning();

  res.json(AssignTechnicianResponse.parse(updated));
});

export default router;
