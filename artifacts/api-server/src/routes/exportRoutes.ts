import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, bookingsTable, repairLogsTable, usersTable } from "@workspace/db";
import { ExportPdfParams } from "@workspace/api-zod";
import { requireAuth, requireRole } from "../middlewares/auth";
import PDFDocument from "pdfkit";

const router: IRouter = Router();

router.get("/export/:id/pdf", requireAuth, async (req, res): Promise<void> => {
  const params = ExportPdfParams.safeParse(req.params);
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

  const doc = new PDFDocument({ margin: 50 });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename=booking-${booking.code}.pdf`);

  doc.pipe(res);

  doc.fontSize(20).text("Repair Story Pro", { align: "center" });
  doc.fontSize(12).text("TehnoDimak Service Center", { align: "center" });
  doc.moveDown();

  doc.fontSize(16).text(`Booking: ${booking.code}`);
  doc.moveDown(0.5);

  doc.fontSize(12);
  doc.text(`Device: ${booking.device}`);
  doc.text(`Issue: ${booking.issue}`);
  doc.text(`Status: ${booking.status}`);
  doc.text(`Created: ${booking.createdAt.toISOString()}`);
  if (booking.appointmentAt) {
    doc.text(`Appointment: ${booking.appointmentAt.toISOString()}`);
  }
  doc.moveDown();

  if (logs.length > 0) {
    doc.fontSize(14).text("Repair Timeline");
    doc.moveDown(0.5);

    doc.fontSize(10);
    for (const log of logs) {
      doc.text(
        `${log.createdAt.toISOString()} | ${log.fromStatus} -> ${log.toStatus} | By: ${log.byUserName}${log.note ? ` | Note: ${log.note}` : ""}`
      );
    }
  }

  doc.end();
});

router.get("/export/csv", requireAuth, requireRole("admin"), async (_req, res): Promise<void> => {
  const bookings = await db.select().from(bookingsTable);

  const header = "id,code,device,issue,status,clientId,technicianId,appointmentAt,createdAt,updatedAt";
  const rows = bookings.map(b =>
    `${b.id},"${b.code}","${b.device}","${b.issue}","${b.status}",${b.clientId},${b.technicianId || ""},${b.appointmentAt?.toISOString() || ""},${b.createdAt.toISOString()},${b.updatedAt.toISOString()}`
  );

  const csv = [header, ...rows].join("\n");

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=bookings.csv");
  res.send(csv);
});

export default router;
