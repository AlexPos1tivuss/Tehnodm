import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
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

export default router;
