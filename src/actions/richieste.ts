"use server";

import { getDb } from "@/db";
import { requests, patients, type Request, type NewRequest } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";

function generateId(): string {
  return crypto.randomUUID();
}

export type RequestWithPatient = Request & {
  patient: {
    id: string;
    nome: string;
    cognome: string;
  };
};

// Priority order for sorting
const urgenzaOrder = { alta: 0, media: 1, bassa: 2 };

export async function getRequests(
  statoFilter?: string
): Promise<RequestWithPatient[]> {
  const db = getDb();

  const query = db
    .select({
      id: requests.id,
      patientId: requests.patientId,
      motivo: requests.motivo,
      urgenza: requests.urgenza,
      stato: requests.stato,
      desiredDate: requests.desiredDate,
      note: requests.note,
      createdAt: requests.createdAt,
      patient: {
        id: patients.id,
        nome: patients.nome,
        cognome: patients.cognome,
      },
    })
    .from(requests)
    .innerJoin(patients, eq(requests.patientId, patients.id))
    .orderBy(desc(requests.createdAt));

  let results = await query;

  if (statoFilter && statoFilter !== "all") {
    results = results.filter((r) => r.stato === statoFilter);
  }

  // Sort by urgency (alta first) then by creation date
  results.sort((a, b) => {
    const urgA = urgenzaOrder[a.urgenza as keyof typeof urgenzaOrder] ?? 2;
    const urgB = urgenzaOrder[b.urgenza as keyof typeof urgenzaOrder] ?? 2;
    if (urgA !== urgB) return urgA - urgB;
    return b.createdAt.getTime() - a.createdAt.getTime();
  });

  return results;
}

export async function getRequest(
  id: string
): Promise<RequestWithPatient | undefined> {
  const db = getDb();
  const results = await db
    .select({
      id: requests.id,
      patientId: requests.patientId,
      motivo: requests.motivo,
      urgenza: requests.urgenza,
      stato: requests.stato,
      desiredDate: requests.desiredDate,
      note: requests.note,
      createdAt: requests.createdAt,
      patient: {
        id: patients.id,
        nome: patients.nome,
        cognome: patients.cognome,
      },
    })
    .from(requests)
    .innerJoin(patients, eq(requests.patientId, patients.id))
    .where(eq(requests.id, id))
    .limit(1);

  return results[0];
}

export async function getRequestsByPatient(
  patientId: string
): Promise<Request[]> {
  const db = getDb();
  return db
    .select()
    .from(requests)
    .where(eq(requests.patientId, patientId))
    .orderBy(desc(requests.createdAt));
}

export async function createRequest(
  _prevState: { error?: string } | undefined,
  formData: FormData
) {
  const patientId = formData.get("patientId") as string;
  const motivo = formData.get("motivo") as string;
  const urgenza = formData.get("urgenza") as "bassa" | "media" | "alta";
  const desiredDateStr = formData.get("desiredDate") as string;

  if (!patientId || !motivo || !urgenza) {
    return { error: "Tutti i campi obbligatori devono essere compilati" };
  }

  const db = getDb();
  const newRequest: NewRequest = {
    id: generateId(),
    patientId,
    motivo: motivo.trim(),
    urgenza,
    stato: "waiting",
    desiredDate: desiredDateStr ? new Date(desiredDateStr) : null,
    note: null,
    createdAt: new Date(),
  };

  await db.insert(requests).values(newRequest);
  revalidatePath("/lista-attesa");
  revalidatePath(`/pazienti/${patientId}`);
  revalidatePath("/");

  return { success: true };
}

export async function updateRequestStatus(
  id: string,
  stato: "waiting" | "scheduled" | "rejected"
) {
  const db = getDb();
  await db.update(requests).set({ stato }).where(eq(requests.id, id));
  revalidatePath("/lista-attesa");
  revalidatePath("/");
}

// Reject request (remove from waiting list)
export async function rejectRequest(id: string, note?: string) {
  const db = getDb();
  await db
    .update(requests)
    .set({ stato: "rejected", note: note || null })
    .where(eq(requests.id, id));
  revalidatePath("/lista-attesa");
  revalidatePath("/");
  return { success: true };
}

// Update request note
export async function updateRequestNote(id: string, note: string) {
  const db = getDb();
  await db
    .update(requests)
    .set({ note: note.trim() || null })
    .where(eq(requests.id, id));
  revalidatePath("/lista-attesa");
  return { success: true };
}

export async function deleteRequest(id: string) {
  const db = getDb();
  const request = await db
    .select({ patientId: requests.patientId })
    .from(requests)
    .where(eq(requests.id, id))
    .limit(1);

  await db.delete(requests).where(eq(requests.id, id));
  revalidatePath("/lista-attesa");
  revalidatePath("/");

  if (request[0]) {
    revalidatePath(`/pazienti/${request[0].patientId}`);
  }
}
