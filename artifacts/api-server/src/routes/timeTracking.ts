import { Router, type IRouter } from "express";
import { eq, and, gte, lte, isNull, sql, desc } from "drizzle-orm";
import { db, workSessionsTable, usersTable } from "@workspace/db";
import { requireAuth, requireRole } from "../middlewares/auth";

const router: IRouter = Router();

router.post("/time-tracking/clock-in", requireAuth, requireRole("technician", "admin"), async (req, res): Promise<void> => {
  try {
    const userId = req.user!.userId;

    const openSession = await db.select()
      .from(workSessionsTable)
      .where(and(
        eq(workSessionsTable.userId, userId),
        isNull(workSessionsTable.clockOut)
      ))
      .limit(1);

    if (openSession.length > 0) {
      res.status(400).json({ error: "Вы уже на смене" });
      return;
    }

    const [session] = await db.insert(workSessionsTable).values({
      userId,
      clockIn: new Date(),
    }).returning();

    res.status(201).json(session);
  } catch (e) {
    console.error("clock-in error:", e);
    res.status(500).json({ error: "Внутренняя ошибка сервера" });
  }
});

router.post("/time-tracking/clock-out", requireAuth, requireRole("technician", "admin"), async (req, res): Promise<void> => {
  try {
    const userId = req.user!.userId;

    const [openSession] = await db.select()
      .from(workSessionsTable)
      .where(and(
        eq(workSessionsTable.userId, userId),
        isNull(workSessionsTable.clockOut)
      ))
      .limit(1);

    if (!openSession) {
      res.status(400).json({ error: "Вы не на смене" });
      return;
    }

    const [updated] = await db.update(workSessionsTable)
      .set({ clockOut: new Date() })
      .where(eq(workSessionsTable.id, openSession.id))
      .returning();

    res.json(updated);
  } catch (e) {
    console.error("clock-out error:", e);
    res.status(500).json({ error: "Внутренняя ошибка сервера" });
  }
});

router.get("/time-tracking/my-status", requireAuth, requireRole("technician", "admin"), async (req, res): Promise<void> => {
  try {
    const userId = req.user!.userId;

    const [openSession] = await db.select()
      .from(workSessionsTable)
      .where(and(
        eq(workSessionsTable.userId, userId),
        isNull(workSessionsTable.clockOut)
      ))
      .limit(1);

    res.json({
      onShift: !!openSession,
      session: openSession || null,
    });
  } catch (e) {
    console.error("my-status error:", e);
    res.status(500).json({ error: "Внутренняя ошибка сервера" });
  }
});

router.get("/time-tracking/sessions", requireAuth, requireRole("admin"), async (req, res): Promise<void> => {
  try {
    const userId = req.query.userId ? Number(req.query.userId) : undefined;
    const dateFrom = req.query.dateFrom as string | undefined;
    const dateTo = req.query.dateTo as string | undefined;

    const conditions = [];
    if (userId) {
      conditions.push(eq(workSessionsTable.userId, userId));
    }
    if (dateFrom) {
      const from = new Date(dateFrom);
      if (isNaN(from.getTime())) {
        res.status(400).json({ error: "Некорректная дата dateFrom" });
        return;
      }
      conditions.push(gte(workSessionsTable.clockIn, from));
    }
    if (dateTo) {
      const to = new Date(dateTo);
      if (isNaN(to.getTime())) {
        res.status(400).json({ error: "Некорректная дата dateTo" });
        return;
      }
      to.setHours(23, 59, 59, 999);
      conditions.push(lte(workSessionsTable.clockIn, to));
    }

    const sessions = await db.select({
      id: workSessionsTable.id,
      userId: workSessionsTable.userId,
      userName: usersTable.name,
      clockIn: workSessionsTable.clockIn,
      clockOut: workSessionsTable.clockOut,
      note: workSessionsTable.note,
      createdAt: workSessionsTable.createdAt,
    })
      .from(workSessionsTable)
      .innerJoin(usersTable, eq(workSessionsTable.userId, usersTable.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(workSessionsTable.clockIn));

    res.json(sessions);
  } catch (e) {
    console.error("list sessions error:", e);
    res.status(500).json({ error: "Внутренняя ошибка сервера" });
  }
});

router.post("/time-tracking/sessions", requireAuth, requireRole("admin"), async (req, res): Promise<void> => {
  try {
    const { userId, clockIn, clockOut, note } = req.body;

    if (!userId || !clockIn) {
      res.status(400).json({ error: "userId и clockIn обязательны" });
      return;
    }

    const clockInDate = new Date(clockIn);
    if (isNaN(clockInDate.getTime())) {
      res.status(400).json({ error: "Некорректная дата clockIn" });
      return;
    }

    let clockOutDate: Date | null = null;
    if (clockOut) {
      clockOutDate = new Date(clockOut);
      if (isNaN(clockOutDate.getTime())) {
        res.status(400).json({ error: "Некорректная дата clockOut" });
        return;
      }
      if (clockOutDate <= clockInDate) {
        res.status(400).json({ error: "Конец смены должен быть позже начала" });
        return;
      }
    }

    if (!clockOutDate) {
      const [existingOpen] = await db.select()
        .from(workSessionsTable)
        .where(and(
          eq(workSessionsTable.userId, Number(userId)),
          isNull(workSessionsTable.clockOut)
        ))
        .limit(1);
      if (existingOpen) {
        res.status(409).json({ error: "У сотрудника уже есть открытая смена" });
        return;
      }
    }

    const [session] = await db.insert(workSessionsTable).values({
      userId: Number(userId),
      clockIn: clockInDate,
      clockOut: clockOutDate,
      note: note || null,
    }).returning();

    res.status(201).json(session);
  } catch (e) {
    console.error("create session error:", e);
    res.status(500).json({ error: "Внутренняя ошибка сервера" });
  }
});

router.patch("/time-tracking/sessions/:id", requireAuth, requireRole("admin"), async (req, res): Promise<void> => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: "Некорректный id" });
      return;
    }

    const [existing] = await db.select().from(workSessionsTable).where(eq(workSessionsTable.id, id));
    if (!existing) {
      res.status(404).json({ error: "Сессия не найдена" });
      return;
    }

    const { clockIn, clockOut, note } = req.body;
    const updateData: Record<string, unknown> = {};

    if (clockIn) {
      const d = new Date(clockIn);
      if (isNaN(d.getTime())) {
        res.status(400).json({ error: "Некорректная дата clockIn" });
        return;
      }
      updateData.clockIn = d;
    }
    if (clockOut !== undefined) {
      if (clockOut) {
        const d = new Date(clockOut);
        if (isNaN(d.getTime())) {
          res.status(400).json({ error: "Некорректная дата clockOut" });
          return;
        }
        updateData.clockOut = d;
      } else {
        updateData.clockOut = null;
      }
    }
    if (note !== undefined) {
      updateData.note = note || null;
    }

    const effectiveClockIn = updateData.clockIn ? (updateData.clockIn as Date) : existing.clockIn;
    const effectiveClockOut = updateData.clockOut !== undefined ? (updateData.clockOut as Date | null) : existing.clockOut;
    if (effectiveClockOut && effectiveClockOut <= effectiveClockIn) {
      res.status(400).json({ error: "Конец смены должен быть позже начала" });
      return;
    }

    const [updated] = await db.update(workSessionsTable)
      .set(updateData)
      .where(eq(workSessionsTable.id, id))
      .returning();

    res.json(updated);
  } catch (e) {
    console.error("update session error:", e);
    res.status(500).json({ error: "Внутренняя ошибка сервера" });
  }
});

router.delete("/time-tracking/sessions/:id", requireAuth, requireRole("admin"), async (req, res): Promise<void> => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: "Некорректный id" });
      return;
    }

    const [existing] = await db.select().from(workSessionsTable).where(eq(workSessionsTable.id, id));
    if (!existing) {
      res.status(404).json({ error: "Сессия не найдена" });
      return;
    }

    await db.delete(workSessionsTable).where(eq(workSessionsTable.id, id));
    res.json({ error: "" });
  } catch (e) {
    console.error("delete session error:", e);
    res.status(500).json({ error: "Внутренняя ошибка сервера" });
  }
});

router.get("/time-tracking/summary", requireAuth, requireRole("admin"), async (req, res): Promise<void> => {
  try {
    const dateFrom = req.query.dateFrom as string | undefined;
    const dateTo = req.query.dateTo as string | undefined;

    const conditions = [];
    if (dateFrom) {
      const from = new Date(dateFrom);
      if (isNaN(from.getTime())) {
        res.status(400).json({ error: "Некорректная дата dateFrom" });
        return;
      }
      conditions.push(gte(workSessionsTable.clockIn, from));
    }
    if (dateTo) {
      const to = new Date(dateTo);
      if (isNaN(to.getTime())) {
        res.status(400).json({ error: "Некорректная дата dateTo" });
        return;
      }
      to.setHours(23, 59, 59, 999);
      conditions.push(lte(workSessionsTable.clockIn, to));
    }

    const results = await db.select({
      userId: workSessionsTable.userId,
      userName: usersTable.name,
      totalSeconds: sql<number>`coalesce(sum(extract(epoch from (coalesce(${workSessionsTable.clockOut}, now()) - ${workSessionsTable.clockIn}))), 0)::float`,
      sessionCount: sql<number>`count(*)::int`,
    })
      .from(workSessionsTable)
      .innerJoin(usersTable, eq(workSessionsTable.userId, usersTable.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .groupBy(workSessionsTable.userId, usersTable.name);

    const summary = results.map(r => ({
      userId: r.userId,
      userName: r.userName,
      totalHours: Math.round((r.totalSeconds / 3600) * 100) / 100,
      sessionCount: r.sessionCount,
    }));

    res.json(summary);
  } catch (e) {
    console.error("summary error:", e);
    res.status(500).json({ error: "Внутренняя ошибка сервера" });
  }
});

export default router;
