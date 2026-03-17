import { db, usersTable, bookingsTable, repairLogsTable } from "@workspace/db";
import { pool } from "@workspace/db";
import bcrypt from "bcrypt";

async function seed() {
  console.log("Seeding database...");

  const passwordHash = await bcrypt.hash("Passw0rd!", 10);

  await db.delete(repairLogsTable);
  await db.delete(bookingsTable);
  await db.delete(usersTable);

  const [admin] = await db.insert(usersTable).values({
    email: "admin@example.com",
    passwordHash,
    name: "Admin User",
    role: "admin",
  }).returning();
  console.log(`Created admin: ${admin.email} (id=${admin.id})`);

  const [tech] = await db.insert(usersTable).values({
    email: "tech1@example.com",
    passwordHash,
    name: "Technician One",
    role: "technician",
  }).returning();
  console.log(`Created technician: ${tech.email} (id=${tech.id})`);

  const [client] = await db.insert(usersTable).values({
    email: "client1@example.com",
    passwordHash,
    name: "Client One",
    role: "client",
  }).returning();
  console.log(`Created client: ${client.email} (id=${client.id})`);

  const [booking] = await db.insert(bookingsTable).values({
    code: "R-00001",
    device: "iPhone 13",
    issue: "Broken screen",
    status: "new",
    clientId: client.id,
  }).returning();
  console.log(`Created sample booking: ${booking.code} (id=${booking.id})`);

  console.log("\nSeed complete!");
  console.log("Test credentials (all passwords: Passw0rd!):");
  console.log("  admin@example.com  (admin)");
  console.log("  tech1@example.com  (technician)");
  console.log("  client1@example.com (client)");

  await pool.end();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
