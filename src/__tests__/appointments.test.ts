import { describe, it, expect, beforeEach, vi } from "vitest";
import { createTestDb } from "./test-db";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";
import { REQUEST_STATUS } from "@/lib/request-status";

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
  getAppointments,
  getAppointmentByRequest,
  getAutoAssignProposal,
  rescheduleAppointment,
} = await import("@/actions/appointments");

function setupTestData() {
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
    motivo: "Test motivo",
    urgenza: "media" as const,
    stato: REQUEST_STATUS.WAITING,
    createdAt: new Date(),
  }).run();

  db.insert(schema.doctorSlots).values({
    id: "s1",
    startTime: new Date(2026, 5, 1, 10, 0),
    endTime: new Date(2026, 5, 1, 10, 30),
    durationMinutes: 30,
    isAvailable: true,
    createdAt: new Date(),
  }).run();

  db.insert(schema.doctorSlots).values({
    id: "s2",
    startTime: new Date(2026, 5, 2, 10, 0),
    endTime: new Date(2026, 5, 2, 10, 30),
    durationMinutes: 30,
    isAvailable: true,
    createdAt: new Date(),
  }).run();
}

describe("appointments actions", () => {
  beforeEach(() => {
    db = createTestDb();
    vi.clearAllMocks();
  });

  describe("getAppointments", () => {
    it("returns empty array when no appointments", async () => {
      const result = await getAppointments();
      expect(result).toEqual([]);
    });

    it("returns appointments with joined data", async () => {
      setupTestData();
      db.insert(schema.appointments).values({
        id: "a1",
        requestId: "r1",
        slotId: "s1",
        createdAt: new Date(),
      }).run();

      const result = await getAppointments();

      expect(result).toHaveLength(1);
      expect(result[0].patient.nome).toBe("Mario");
      expect(result[0].request.motivo).toBe("Test motivo");
      expect(result[0].slot.id).toBe("s1");
    });
  });

  describe("getAppointmentByRequest", () => {
    it("returns appointment for a request", async () => {
      setupTestData();
      db.insert(schema.appointments).values({
        id: "a1",
        requestId: "r1",
        slotId: "s1",
        createdAt: new Date(),
      }).run();

      const result = await getAppointmentByRequest("r1");

      expect(result).toBeDefined();
      expect(result?.id).toBe("a1");
    });

    it("returns undefined when no appointment exists", async () => {
      setupTestData();

      const result = await getAppointmentByRequest("r1");

      expect(result).toBeUndefined();
    });
  });

  describe("getAutoAssignProposal", () => {
    it("returns next available slot after desiredDate", async () => {
      setupTestData();
      db.update(schema.requests)
        .set({ desiredDate: new Date(2026, 5, 2) })
        .where(eq(schema.requests.id, "r1"))
        .run();

      const result = await getAutoAssignProposal("r1");

      expect(result).not.toHaveProperty("error");
      const proposal = result as { slot: { id: string } };
      expect(proposal.slot.id).toBe("s2");
    });

    it("returns error when request not found", async () => {
      const result = await getAutoAssignProposal("nonexistent");

      expect(result).toHaveProperty("error");
      expect((result as { error: string }).error).toBe("Richiesta non trovata");
    });

    it("returns error when request not WAITING", async () => {
      setupTestData();
      db.update(schema.requests).set({ stato: REQUEST_STATUS.SCHEDULED }).where(eq(schema.requests.id, "r1")).run();

      const result = await getAutoAssignProposal("r1");

      expect(result).toHaveProperty("error");
      expect((result as { error: string }).error).toContain("lista d'attesa");
    });

    it("returns error when no slots available", async () => {
      setupTestData();
      db.update(schema.doctorSlots).set({ isAvailable: false }).run();

      const result = await getAutoAssignProposal("r1");

      expect(result).toHaveProperty("error");
      expect((result as { error: string }).error).toContain("Nessuno slot");
    });
  });

  describe("rescheduleAppointment", () => {
    it("returns error when appointment not found", async () => {
      const result = await rescheduleAppointment("nonexistent", "s1");

      expect(result).toHaveProperty("error");
      expect((result as { error: string }).error).toBe("Appuntamento non trovato");
    });

    it("returns error when new slot not available", async () => {
      setupTestData();
      db.insert(schema.appointments).values({
        id: "a1",
        requestId: "r1",
        slotId: "s1",
        createdAt: new Date(),
      }).run();
      db.update(schema.doctorSlots).set({ isAvailable: false }).where(eq(schema.doctorSlots.id, "s1")).run();
      db.update(schema.doctorSlots).set({ isAvailable: false }).where(eq(schema.doctorSlots.id, "s2")).run();

      const result = await rescheduleAppointment("a1", "s2");

      expect(result).toHaveProperty("error");
      expect((result as { error: string }).error).toContain("disponibile");
    });

    it("returns success when same slot (no-op)", async () => {
      setupTestData();
      db.insert(schema.appointments).values({
        id: "a1",
        requestId: "r1",
        slotId: "s1",
        createdAt: new Date(),
      }).run();
      db.update(schema.doctorSlots).set({ isAvailable: false }).where(eq(schema.doctorSlots.id, "s1")).run();

      const result = await rescheduleAppointment("a1", "s1");

      expect(result).toEqual({ success: true });
    });
  });
});
