import { describe, it, expect, beforeEach, vi } from "vitest";
import { createTestDb } from "./test-db";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";

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
  getRequests,
  getRequest,
  getRequestsByPatient,
  createRequest,
  updateRequestStatus,
  rejectRequest,
  updateRequestNote,
  deleteRequest,
} = await import("@/actions/richieste");

describe("richieste actions", () => {
  beforeEach(() => {
    db = createTestDb();
    vi.clearAllMocks();
  });

  function createTestPatient(overrides: Record<string, unknown> = {}) {
    const patient = {
      id: "p1",
      nome: "Mario",
      cognome: "Rossi",
      telefono: "3331234567",
      createdAt: new Date(),
      ...overrides,
    };
    db.insert(schema.patients).values(patient).run();
    return patient;
  }

  function createTestRequest(overrides: Record<string, unknown> = {}) {
    const req = {
      id: "r1",
      patientId: "p1",
      motivo: "Test motivo",
      urgenza: "media" as const,
      stato: "waiting" as const,
      createdAt: new Date(),
      ...overrides,
    };
    db.insert(schema.requests).values(req).run();
    return req;
  }

  describe("getRequests", () => {
    it("returns empty array when no requests", async () => {
      const result = await getRequests();
      expect(result).toEqual([]);
    });

    it("returns requests with patient data", async () => {
      createTestPatient();
      createTestRequest();

      const result = await getRequests();

      expect(result).toHaveLength(1);
      expect(result[0].patient.nome).toBe("Mario");
      expect(result[0].patient.cognome).toBe("Rossi");
    });

    it("filters by stato", async () => {
      createTestPatient();
      createTestRequest({ id: "r1", stato: "waiting" });
      createTestRequest({ id: "r2", stato: "scheduled" });

      const result = await getRequests("waiting");

      expect(result).toHaveLength(1);
      expect(result[0].stato).toBe("waiting");
    });

    it("filters by urgenza", async () => {
      createTestPatient();
      createTestRequest({ id: "r1", urgenza: "alta" });
      createTestRequest({ id: "r2", urgenza: "bassa" });

      const result = await getRequests(undefined, undefined, "alta");

      expect(result).toHaveLength(1);
      expect(result[0].urgenza).toBe("alta");
    });

    it("filters by search query", async () => {
      createTestPatient();
      createTestRequest({ id: "r1", motivo: "Mal di testa" });
      createTestRequest({ id: "r2", motivo: "Febbre" });

      const result = await getRequests(undefined, "testa");

      expect(result).toHaveLength(1);
      expect(result[0].motivo).toBe("Mal di testa");
    });

    it("sorts by urgency then date", async () => {
      createTestPatient();
      createTestRequest({ id: "r1", urgenza: "bassa", createdAt: new Date(2024, 0, 1) });
      createTestRequest({ id: "r2", urgenza: "alta", createdAt: new Date(2024, 0, 2) });

      const result = await getRequests();

      expect(result[0].urgenza).toBe("alta");
      expect(result[1].urgenza).toBe("bassa");
    });
  });

  describe("getRequest", () => {
    it("returns request with patient data", async () => {
      createTestPatient();
      createTestRequest();

      const result = await getRequest("r1");

      expect(result).toBeDefined();
      expect(result?.motivo).toBe("Test motivo");
      expect(result?.patient.nome).toBe("Mario");
    });

    it("returns undefined for non-existent request", async () => {
      const result = await getRequest("nonexistent");
      expect(result).toBeUndefined();
    });
  });

  describe("getRequestsByPatient", () => {
    it("returns requests for a specific patient", async () => {
      createTestPatient();
      createTestRequest({ id: "r1", patientId: "p1" });
      createTestRequest({ id: "r2", patientId: "p1" });

      const result = await getRequestsByPatient("p1");

      expect(result).toHaveLength(2);
    });

    it("returns empty array for patient with no requests", async () => {
      createTestPatient();

      const result = await getRequestsByPatient("p1");

      expect(result).toEqual([]);
    });
  });

  describe("createRequest", () => {
    it("creates a request with WAITING status", async () => {
      createTestPatient();
      const fd = new FormData();
      fd.set("patientId", "p1");
      fd.set("motivo", "Controllo");
      fd.set("urgenza", "bassa");

      const result = await createRequest(undefined, fd);

      expect(result).toEqual({ success: true });
    });

    it("rejects missing required fields", async () => {
      const fd = new FormData();
      fd.set("patientId", "");
      fd.set("motivo", "");
      fd.set("urgenza", "");

      const result = await createRequest(undefined, fd);

      expect(result).toHaveProperty("error");
    });
  });

  describe("updateRequestStatus", () => {
    it("changes request status", async () => {
      createTestPatient();
      createTestRequest({ stato: "waiting" });

      await updateRequestStatus("r1", "scheduled");

      const updated = db.select().from(schema.requests).where(eq(schema.requests.id, "r1")).all();
      expect(updated[0].stato).toBe("scheduled");
    });
  });

  describe("rejectRequest", () => {
    it("sets request to rejected", async () => {
      createTestPatient();
      createTestRequest({ stato: "waiting" });

      await rejectRequest("r1");

      const updated = db.select().from(schema.requests).where(eq(schema.requests.id, "r1")).all()[0];
      expect(updated.stato).toBe("rejected");
    });
  });

  describe("updateRequestNote", () => {
    it("updates request note", async () => {
      createTestPatient();
      createTestRequest();

      await updateRequestNote("r1", "Nuova nota");

      const updated = db.select().from(schema.requests).where(eq(schema.requests.id, "r1")).all()[0];
      expect(updated.note).toBe("Nuova nota");
    });
  });

  describe("deleteRequest", () => {
    it("deletes request without appointment", async () => {
      createTestPatient();
      createTestRequest();

      const result = await deleteRequest("r1");

      expect(result).toEqual({ success: true });
    });

    it("cascades delete: frees slot, removes appointment, removes request", async () => {
      createTestPatient();
      createTestRequest();
      db.insert(schema.doctorSlots).values({
        id: "s1",
        startTime: new Date(2026, 5, 1, 10, 0),
        endTime: new Date(2026, 5, 1, 10, 30),
        durationMinutes: 30,
        isAvailable: false,
        createdAt: new Date(),
      }).run();
      db.insert(schema.appointments).values({
        id: "a1",
        requestId: "r1",
        slotId: "s1",
        createdAt: new Date(),
      }).run();

      const result = await deleteRequest("r1");

      expect(result).toEqual({ success: true });

      const slot = db.select().from(schema.doctorSlots).where(eq(schema.doctorSlots.id, "s1")).all()[0];
      expect(slot.isAvailable).toBe(true);

      const appointments = db.select().from(schema.appointments).where(eq(schema.appointments.requestId, "r1")).all();
      expect(appointments).toHaveLength(0);

      const requests = db.select().from(schema.requests).where(eq(schema.requests.id, "r1")).all();
      expect(requests).toHaveLength(0);
    });

    it("returns error for non-existent request", async () => {
      const result = await deleteRequest("nonexistent");

      expect(result).toHaveProperty("error");
      expect((result as { error: string }).error).toBe("Richiesta non trovata");
    });
  });
});
