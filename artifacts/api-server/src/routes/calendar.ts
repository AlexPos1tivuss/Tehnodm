import { Router, type IRouter } from "express";
import { and, gte, lt } from "drizzle-orm";
import { db, bookingsTable } from "@workspace/db";
import { GetCalendarSlotsResponse } from "@workspace/api-zod";
import { generateSlots, isValidDate } from "../lib/calendarSlots";

const router: IRouter = Router();

router.get("/calendar/slots", async (req, res): Promise<void> => {
  const dateStr = typeof req.query.date === "string" ? req.query.date : "";

  if (!isValidDate(dateStr)) {
    res.status(400).json({ error: "Invalid date format. Use YYYY-MM-DD" });
    return;
  }

  const dayStart = new Date(dateStr + "T00:00:00Z");
  const dayEnd = new Date(dateStr + "T23:59:59Z");

  const bookings = await db.select().from(bookingsTable)
    .where(
      and(
        gte(bookingsTable.appointmentAt, dayStart),
        lt(bookingsTable.appointmentAt, dayEnd)
      )
    );

  const bookedTimes = bookings
    .filter(b => b.appointmentAt)
    .map(b => {
      const d = new Date(b.appointmentAt!);
      return `${d.getUTCHours().toString().padStart(2, "0")}:${d.getUTCMinutes().toString().padStart(2, "0")}`;
    });

  const slots = generateSlots(dateStr, bookedTimes);
  res.json(GetCalendarSlotsResponse.parse(slots));
});

export default router;
