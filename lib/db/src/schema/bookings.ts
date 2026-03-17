import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const bookingsTable = pgTable("bookings", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  device: text("device").notNull(),
  issue: text("issue").notNull(),
  status: text("status", { enum: ["new", "accepted", "diagnosing", "repairing", "ready", "closed"] }).notNull().default("new"),
  appointmentAt: timestamp("appointment_at", { withTimezone: true }),
  clientId: integer("client_id").notNull().references(() => usersTable.id),
  technicianId: integer("technician_id").references(() => usersTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertBookingSchema = createInsertSchema(bookingsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type Booking = typeof bookingsTable.$inferSelect;
