import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import app from "../app";

let clientToken: string;
let adminToken: string;
let bookingId: number;
let bookingCode: string;

describe("Auth API", () => {
  it("POST /api/auth/register — creates a new user", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({
        name: "Test User",
        email: `test-${Date.now()}@example.com`,
        password: "Test1234!",
      });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("accessToken");
    expect(res.body).toHaveProperty("user");
    expect(res.body.user.role).toBe("client");
  });

  it("POST /api/auth/register — rejects duplicate email", async () => {
    const email = `dup-${Date.now()}@example.com`;
    await request(app)
      .post("/api/auth/register")
      .send({ name: "Dup", email, password: "Test1234!" });
    const res = await request(app)
      .post("/api/auth/register")
      .send({ name: "Dup2", email, password: "Test1234!" });
    expect(res.status).toBe(409);
  });

  it("POST /api/auth/login — returns token for valid credentials", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "client1@example.com", password: "Passw0rd!" });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("accessToken");
    expect(res.body.user.email).toBe("client1@example.com");
    clientToken = res.body.accessToken;
  });

  it("POST /api/auth/login — rejects wrong password", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "client1@example.com", password: "wrong" });
    expect(res.status).toBe(401);
  });

  it("GET /api/auth/me — returns current user with valid token", async () => {
    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${clientToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("email", "client1@example.com");
  });

  it("GET /api/auth/me — rejects without token", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
  });
});

describe("Bookings API", () => {
  beforeAll(async () => {
    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({ email: "admin@example.com", password: "Passw0rd!" });
    adminToken = loginRes.body.accessToken;
  });

  it("POST /api/bookings — creates a booking", async () => {
    const res = await request(app)
      .post("/api/bookings")
      .set("Authorization", `Bearer ${clientToken}`)
      .send({ device: "Test Phone", issue: "Broken screen" });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("code");
    expect(res.body.code).toMatch(/^R-\d{5}$/);
    expect(res.body.status).toBe("new");
    bookingId = res.body.id;
    bookingCode = res.body.code;
  });

  it("POST /api/bookings — creates a booking with appointmentAt", async () => {
    const res = await request(app)
      .post("/api/bookings")
      .set("Authorization", `Bearer ${clientToken}`)
      .send({
        device: "Laptop",
        issue: "Won't boot",
        appointmentAt: "2026-03-20T14:00:00Z",
      });
    expect(res.status).toBe(201);
    expect(res.body.appointmentAt).toBeTruthy();
  });

  it("POST /api/bookings — rejects without auth", async () => {
    const res = await request(app)
      .post("/api/bookings")
      .send({ device: "Phone", issue: "Broken" });
    expect(res.status).toBe(401);
  });

  it("GET /api/bookings/my — lists client bookings", async () => {
    const res = await request(app)
      .get("/api/bookings/my")
      .set("Authorization", `Bearer ${clientToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it("GET /api/bookings/track/:code — tracks by code (public)", async () => {
    const res = await request(app)
      .get(`/api/bookings/track/${bookingCode}`);
    expect(res.status).toBe(200);
    expect(res.body.booking.code).toBe(bookingCode);
    expect(res.body).toHaveProperty("logs");
  });

  it("GET /api/bookings/track/:code — 404 for unknown code", async () => {
    const res = await request(app)
      .get("/api/bookings/track/R-99999");
    expect(res.status).toBe(404);
  });

  it("PATCH /api/bookings/:id/status — changes status (admin)", async () => {
    const res = await request(app)
      .patch(`/api/bookings/${bookingId}/status`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ to: "accepted", note: "Test accept" });
    expect(res.status).toBe(200);
    expect(res.body.booking.status).toBe("accepted");
  });

  it("PATCH /api/bookings/:id/status — enforces valid transitions", async () => {
    const res = await request(app)
      .patch(`/api/bookings/${bookingId}/status`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ to: "closed", note: "Skip steps" });
    expect(res.status).toBe(400);
  });

  it("PATCH /api/bookings/:id/status — rejects client role", async () => {
    const res = await request(app)
      .patch(`/api/bookings/${bookingId}/status`)
      .set("Authorization", `Bearer ${clientToken}`)
      .send({ to: "diagnosing", note: "Not allowed" });
    expect(res.status).toBe(403);
  });

  it("GET /api/bookings — lists all bookings (admin)", async () => {
    const res = await request(app)
      .get("/api/bookings")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("GET /api/bookings/:id — client can access own booking", async () => {
    const res = await request(app)
      .get(`/api/bookings/${bookingId}`)
      .set("Authorization", `Bearer ${clientToken}`);
    expect(res.status).toBe(200);
    expect(res.body.booking.id).toBe(bookingId);
  });

  it("GET /api/bookings/:id — client cannot access another client booking", async () => {
    const regRes = await request(app)
      .post("/api/auth/register")
      .send({ name: "Other", email: `other-${Date.now()}@example.com`, password: "Test1234!" });
    const otherToken = regRes.body.accessToken;
    const res = await request(app)
      .get(`/api/bookings/${bookingId}`)
      .set("Authorization", `Bearer ${otherToken}`);
    expect(res.status).toBe(403);
  });

  it("GET /api/bookings/:id — admin can access any booking", async () => {
    const res = await request(app)
      .get(`/api/bookings/${bookingId}`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
  });
});

describe("Calendar API", () => {
  it("GET /api/calendar/slots — returns slots for a date", async () => {
    const res = await request(app)
      .get("/api/calendar/slots?date=2026-03-18");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(18);
    expect(res.body[0]).toHaveProperty("time");
    expect(res.body[0]).toHaveProperty("available");
  });

  it("GET /api/calendar/slots — rejects invalid date", async () => {
    const res = await request(app)
      .get("/api/calendar/slots?date=not-a-date");
    expect(res.status).toBe(400);
  });
});

describe("Health API", () => {
  it("GET /api/healthz — returns ok", async () => {
    const res = await request(app).get("/api/healthz");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
  });
});
