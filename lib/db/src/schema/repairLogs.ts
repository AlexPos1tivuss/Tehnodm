import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { bookingsTable } from "./bookings";
import { usersTable } from "./users";

export const repairLogsTable = pgTable("repair_logs", {
  id: serial("id").primaryKey(),
  bookingId: integer("booking_id").notNull().references(() => bookingsTable.id),
  fromStatus: text("from_status").notNull(),
  toStatus: text("to_status").notNull(),
  note: text("note"),
  byUserId: integer("by_user_id").notNull().references(() => usersTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertRepairLogSchema = createInsertSchema(repairLogsTable).omit({ id: true, createdAt: true });
export type InsertRepairLog = z.infer<typeof insertRepairLogSchema>;
export type RepairLog = typeof repairLogsTable.$inferSelect;
