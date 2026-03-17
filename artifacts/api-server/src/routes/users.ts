import { Router, type IRouter } from "express";
import { eq, sql, desc } from "drizzle-orm";
import { db, usersTable, bookingsTable } from "@workspace/db";
import { ListTechniciansResponse } from "@workspace/api-zod";
import { requireAuth, requireRole } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/users/technicians", requireAuth, requireRole("admin"), async (_req, res): Promise<void> => {
  const technicians = await db.select({
    id: usersTable.id,
    email: usersTable.email,
    name: usersTable.name,
    role: usersTable.role,
  }).from(usersTable).where(eq(usersTable.role, "technician"));

  res.json(ListTechniciansResponse.parse(technicians));
});

router.get("/users", requireAuth, requireRole("admin"), async (_req, res): Promise<void> => {
  const users = await db.select({
    id: usersTable.id,
    email: usersTable.email,
    name: usersTable.name,
    role: usersTable.role,
    createdAt: usersTable.createdAt,
  }).from(usersTable).orderBy(desc(usersTable.createdAt));

  res.json(users);
});

router.get("/stats", requireAuth, requireRole("admin"), async (_req, res): Promise<void> => {
  const allBookings = await db.select({
    status: bookingsTable.status,
    count: sql<number>`count(*)::int`,
  }).from(bookingsTable).groupBy(bookingsTable.status);

  const statusCounts: Record<string, number> = {};
  let total = 0;
  for (const row of allBookings) {
    statusCounts[row.status] = row.count;
    total += row.count;
  }

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const [todayResult] = await db.select({
    count: sql<number>`count(*)::int`,
  }).from(bookingsTable).where(
    sql`${bookingsTable.createdAt} >= ${todayStart}`
  );

  res.json({
    total,
    statusCounts,
    todayCount: todayResult?.count || 0,
    activeCount: (statusCounts["new"] || 0) + (statusCounts["accepted"] || 0) + (statusCounts["diagnosing"] || 0) + (statusCounts["repairing"] || 0),
  });
});

router.get("/bookings-with-clients", requireAuth, requireRole("admin"), async (_req, res): Promise<void> => {
  const bookings = await db.select({
    id: bookingsTable.id,
    code: bookingsTable.code,
    device: bookingsTable.device,
    issue: bookingsTable.issue,
    status: bookingsTable.status,
    appointmentAt: bookingsTable.appointmentAt,
    clientId: bookingsTable.clientId,
    technicianId: bookingsTable.technicianId,
    createdAt: bookingsTable.createdAt,
    updatedAt: bookingsTable.updatedAt,
    clientName: usersTable.name,
    clientEmail: usersTable.email,
  })
    .from(bookingsTable)
    .innerJoin(usersTable, eq(bookingsTable.clientId, usersTable.id))
    .orderBy(desc(bookingsTable.createdAt));

  res.json(bookings);
});

export default router;
