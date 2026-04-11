import { describe, it, expect, beforeEach, vi } from "vitest";
import { createTestDb } from "./test-db";
import * as schema from "@/db/schema";
import { eq, and, gte, lte } from "drizzle-orm";

let db: ReturnType<typeof createTestDb>;

vi.mock("@/db", () => ({
  getDb: () => db,
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

const {
  getDoctorSlots,
  getDoctorSlot,
  createDoctorSlot,
  createDoctorSlotsBlock,
  deleteDoctorSlot,
  getNextAvailableSlot,
  getAvailableSlotsInRange,
  updateSlotAvailability,
} = await import("@/actions/slots");

describe("slots actions", () => {
  beforeEach(() => {
    db = createTestDb();
    vi.clearAllMocks();
  });

  function createTestSlot(overrides: Record<string, unknown> = {}) {
    const slot = {
      id: "s1",
      startTime: new Date(2026, 5, 1, 10, 0),
      endTime: new Date(2026, 5, 1, 10, 30),
      durationMinutes: 30,
      isAvailable: true,
      createdAt: new Date(),
      ...overrides,
    };
    db.insert(schema.doctorSlots).values(slot).run();
    return slot;
  }

  describe("getDoctorSlots", () => {
    it("returns all slots ordered by startTime", async () => {
      createTestSlot({ id: "s1", startTime: new Date(2026, 5, 2, 10, 0) });
      createTestSlot({ id: "s2", startTime: new Date(2026, 5, 1, 10, 0) });

      const result = await getDoctorSlots();

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe("s2");
      expect(result[1].id).toBe("s1");
    });

    it("filters by startDate", async () => {
      createTestSlot({ id: "s1", startTime: new Date(2026, 5, 1, 10, 0) });
      createTestSlot({ id: "s2", startTime: new Date(2026, 5, 5, 10, 0) });

      const result = await getDoctorSlots({ startDate: new Date(2026, 5, 2) });

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("s2");
    });

    it("filters by onlyAvailable", async () => {
      createTestSlot({ id: "s1", isAvailable: true, startTime: new Date(2026, 5, 1, 10, 0), endTime: new Date(2026, 5, 1, 10, 30) });
      createTestSlot({ id: "s2", isAvailable: false, startTime: new Date(2026, 5, 1, 11, 0), endTime: new Date(2026, 5, 1, 11, 30) });

      const result = await getDoctorSlots({ onlyAvailable: true });

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("s1");
    });
  });

  describe("getDoctorSlot", () => {
    it("returns slot by id", async () => {
      createTestSlot();

      const result = await getDoctorSlot("s1");

      expect(result).toBeDefined();
      expect(result?.id).toBe("s1");
    });

    it("returns undefined for non-existent slot", async () => {
      const result = await getDoctorSlot("nonexistent");
      expect(result).toBeUndefined();
    });
  });

  describe("createDoctorSlot", () => {
    it("creates a slot successfully", async () => {
      const fd = new FormData();
      fd.set("startTime", "2026-06-01T10:00");
      fd.set("endTime", "2026-06-01T10:30");
      fd.set("durationMinutes", "30");

      const result = await createDoctorSlot(undefined, fd);

      expect(result).toEqual({ success: true });
    });

    it("rejects overlapping slots", async () => {
      createTestSlot();

      const fd = new FormData();
      fd.set("startTime", "2026-06-01T10:15");
      fd.set("endTime", "2026-06-01T10:45");
      fd.set("durationMinutes", "30");

      const result = await createDoctorSlot(undefined, fd);

      expect(result).toHaveProperty("error");
      expect((result as { error: string }).error).toContain("sovrapposto");
    });

    it("rejects when end is before start", async () => {
      const fd = new FormData();
      fd.set("startTime", "2026-06-01T10:30");
      fd.set("endTime", "2026-06-01T10:00");
      fd.set("durationMinutes", "30");

      const result = await createDoctorSlot(undefined, fd);

      expect(result).toHaveProperty("error");
      expect((result as { error: string }).error).toContain("successivo");
    });

    it("rejects missing required fields", async () => {
      const fd = new FormData();
      fd.set("startTime", "");
      fd.set("endTime", "");

      const result = await createDoctorSlot(undefined, fd);

      expect(result).toHaveProperty("error");
    });
  });

  describe("createDoctorSlotsBlock", () => {
    it("creates multiple slots", async () => {
      const fd = new FormData();
      fd.set("date", "2026-06-01");
      fd.set("startHour", "9");
      fd.set("startMinute", "0");
      fd.set("endHour", "10");
      fd.set("endMinute", "0");
      fd.set("slotDuration", "30");

      const result = await createDoctorSlotsBlock(undefined, fd);

      expect(result).toHaveProperty("success", true);
      expect((result as { success: boolean; count: number }).count).toBe(2);
    });

    it("skips overlapping slots and creates the rest", async () => {
      createTestSlot({
        id: "s1",
        startTime: new Date(2026, 5, 1, 9, 0),
        endTime: new Date(2026, 5, 1, 9, 30),
      });

      const fd = new FormData();
      fd.set("date", "2026-06-01");
      fd.set("startHour", "9");
      fd.set("startMinute", "0");
      fd.set("endHour", "10");
      fd.set("endMinute", "0");
      fd.set("slotDuration", "30");

      const result = await createDoctorSlotsBlock(undefined, fd);

      expect(result).toHaveProperty("success", true);
      const r = result as { success: boolean; count: number; skipped: number };
      expect(r.count).toBe(1);
      expect(r.skipped).toBe(1);
    });

    it("returns error when all slots overlap", async () => {
      createTestSlot({
        id: "s1",
        startTime: new Date(2026, 5, 1, 9, 0),
        endTime: new Date(2026, 5, 1, 9, 30),
      });
      createTestSlot({
        id: "s2",
        startTime: new Date(2026, 5, 1, 9, 30),
        endTime: new Date(2026, 5, 1, 10, 0),
      });

      const fd = new FormData();
      fd.set("date", "2026-06-01");
      fd.set("startHour", "9");
      fd.set("startMinute", "0");
      fd.set("endHour", "10");
      fd.set("endMinute", "0");
      fd.set("slotDuration", "30");

      const result = await createDoctorSlotsBlock(undefined, fd);

      expect(result).toHaveProperty("error");
      expect((result as { error: string }).error).toContain("occupati");
    });

    it("rejects missing required fields", async () => {
      const fd = new FormData();
      fd.set("date", "");
      fd.set("startHour", "");
      fd.set("endHour", "");

      const result = await createDoctorSlotsBlock(undefined, fd);

      expect(result).toHaveProperty("error");
    });
  });

  describe("deleteDoctorSlot", () => {
    it("deletes available slot", async () => {
      createTestSlot();

      const result = await deleteDoctorSlot("s1");

      expect(result).toEqual({ success: true });
    });

    it("blocks deletion when slot has appointments", async () => {
      createTestSlot();
      db.insert(schema.patients).values({
        id: "p1",
        nome: "Mario",
        cognome: "Rossi",
        telefono: "3331234567",
        createdAt: new Date(),
      }).run();
      db.insert(schema.requests).values({
        id: "r1",
        patientId: "p1",
        motivo: "Test",
        urgenza: "bassa",
        stato: "scheduled",
        createdAt: new Date(),
      }).run();
      db.insert(schema.appointments).values({
        id: "a1",
        requestId: "r1",
        slotId: "s1",
        createdAt: new Date(),
      }).run();

      const result = await deleteDoctorSlot("s1");

      expect(result).toHaveProperty("error");
      expect((result as { error: string }).error).toContain("appuntamenti");
    });
  });

  describe("getNextAvailableSlot", () => {
    it("returns first available slot from date", async () => {
      createTestSlot({ id: "s1", startTime: new Date(2026, 5, 5, 10, 0) });
      createTestSlot({ id: "s2", startTime: new Date(2026, 5, 1, 10, 0) });

      const result = await getNextAvailableSlot(new Date(2026, 5, 1));

      expect(result).toBeDefined();
      expect(result?.id).toBe("s2");
    });

    it("returns undefined when no available slots", async () => {
      const result = await getNextAvailableSlot();
      expect(result).toBeUndefined();
    });

    it("skips unavailable slots", async () => {
      createTestSlot({ id: "s1", isAvailable: false, startTime: new Date(2026, 5, 1, 10, 0) });
      createTestSlot({ id: "s2", isAvailable: true, startTime: new Date(2026, 5, 2, 10, 0) });

      const result = await getNextAvailableSlot(new Date(2026, 5, 1));

      expect(result?.id).toBe("s2");
    });
  });

  describe("getAvailableSlotsInRange", () => {
    it("returns slots within date range", async () => {
      createTestSlot({ id: "s1", startTime: new Date(2026, 5, 1, 10, 0) });
      createTestSlot({ id: "s2", startTime: new Date(2026, 5, 5, 10, 0) });
      createTestSlot({ id: "s3", startTime: new Date(2026, 5, 10, 10, 0) });

      const result = await getAvailableSlotsInRange(
        new Date(2026, 5, 1),
        new Date(2026, 5, 6)
      );

      expect(result).toHaveLength(2);
    });
  });

  describe("updateSlotAvailability", () => {
    it("toggles slot availability", async () => {
      createTestSlot({ isAvailable: true });

      await updateSlotAvailability("s1", false);

      const slot = db.select().from(schema.doctorSlots).where(eq(schema.doctorSlots.id, "s1")).all()[0];
      expect(slot.isAvailable).toBe(false);
    });
  });
});
