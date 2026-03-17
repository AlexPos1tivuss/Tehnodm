import { describe, it, expect } from "vitest";
import { generateBookingCode } from "../lib/bookingCode";
import { generateSlots, isValidDate } from "../lib/calendarSlots";

describe("generateBookingCode", () => {
  it("returns a code matching R-XXXXX format", () => {
    const code = generateBookingCode();
    expect(code).toMatch(/^R-\d{5}$/);
  });

  it("generates different codes on consecutive calls", () => {
    const codes = new Set(Array.from({ length: 20 }, () => generateBookingCode()));
    expect(codes.size).toBeGreaterThan(1);
  });
});

describe("generateSlots", () => {
  it("returns 18 slots for a day (9:00-17:30)", () => {
    const slots = generateSlots("2026-03-18", []);
    expect(slots).toHaveLength(18);
    expect(slots[0].time).toBe("09:00");
    expect(slots[slots.length - 1].time).toBe("17:30");
  });

  it("marks booked times as unavailable", () => {
    const slots = generateSlots("2026-03-18", ["10:00", "14:30"]);
    const s1000 = slots.find(s => s.time === "10:00");
    const s1430 = slots.find(s => s.time === "14:30");
    const s0900 = slots.find(s => s.time === "09:00");
    expect(s1000?.available).toBe(false);
    expect(s1430?.available).toBe(false);
    expect(s0900?.available).toBe(true);
  });

  it("all slots available when no bookings", () => {
    const slots = generateSlots("2026-03-18", []);
    expect(slots.every(s => s.available)).toBe(true);
  });
});

describe("isValidDate", () => {
  it("accepts YYYY-MM-DD format", () => {
    expect(isValidDate("2026-03-18")).toBe(true);
    expect(isValidDate("2026-12-31")).toBe(true);
  });

  it("rejects invalid formats", () => {
    expect(isValidDate("18-03-2026")).toBe(false);
    expect(isValidDate("2026/03/18")).toBe(false);
    expect(isValidDate("not-a-date")).toBe(false);
    expect(isValidDate("")).toBe(false);
  });

  it("rejects invalid dates", () => {
    expect(isValidDate("2026-13-01")).toBe(false);
  });
});
