import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { RegisterBody, LoginBody, LoginResponse, GetMeResponse, RefreshTokenResponse } from "@workspace/api-zod";
import { hashPassword, comparePassword, signToken } from "../lib/auth";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.post("/auth/register", async (req, res): Promise<void> => {
  const parsed = RegisterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { email, password, name } = parsed.data;

  const existing = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (existing.length > 0) {
    res.status(409).json({ error: "Email already exists" });
    return;
  }

  const passwordHash = await hashPassword(password);
  const [user] = await db.insert(usersTable).values({ email, passwordHash, name, role: "client" }).returning();

  const accessToken = signToken({ userId: user.id, email: user.email, role: user.role });

  res.status(201).json(LoginResponse.parse({
    accessToken,
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
  }));
});

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { email, password } = parsed.data;

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (!user) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const valid = await comparePassword(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const accessToken = signToken({ userId: user.id, email: user.email, role: user.role });

  res.json(LoginResponse.parse({
    accessToken,
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
  }));
});

router.post("/auth/refresh", requireAuth, async (req, res): Promise<void> => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.userId));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const accessToken = signToken({ userId: user.id, email: user.email, role: user.role });
  res.json(RefreshTokenResponse.parse({ accessToken }));
});

router.get("/auth/me", requireAuth, async (req, res): Promise<void> => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.userId));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json(GetMeResponse.parse({ id: user.id, email: user.email, name: user.name, role: user.role }));
});

export default router;
