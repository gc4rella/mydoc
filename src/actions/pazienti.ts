"use server";

import { getDb } from "@/db";
import { patients, type Patient, type NewPatient } from "@/db/schema";
import { eq, like, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function generateId(): string {
  return crypto.randomUUID();
}

export async function getPatients(search?: string): Promise<Patient[]> {
  const db = getDb();
  const allPatients = await db.select().from(patients).orderBy(patients.cognome, patients.nome);

  if (!search || !search.trim()) {
    return allPatients;
  }

  // Fuzzy search: split into words and match each against nome, cognome, telefono
  const searchWords = search.toLowerCase().trim().split(/\s+/);

  return allPatients.filter((patient) => {
    const searchable = [
      patient.nome.toLowerCase(),
      patient.cognome.toLowerCase(),
      patient.telefono.toLowerCase(),
      `${patient.cognome} ${patient.nome}`.toLowerCase(),
      `${patient.nome} ${patient.cognome}`.toLowerCase(),
    ].join(" ");

    // All search words must be found somewhere
    return searchWords.every((word) => searchable.includes(word));
  });
}

export async function getPatient(id: string): Promise<Patient | undefined> {
  const db = getDb();
  const results = await db
    .select()
    .from(patients)
    .where(eq(patients.id, id))
    .limit(1);
  return results[0];
}

export async function checkPhoneDuplicate(
  telefono: string,
  excludeId?: string
): Promise<boolean> {
  const db = getDb();
  const results = await db
    .select()
    .from(patients)
    .where(eq(patients.telefono, telefono));

  if (excludeId) {
    return results.some((p) => p.id !== excludeId);
  }
  return results.length > 0;
}

export async function createPatient(
  _prevState: { error?: string } | undefined,
  formData: FormData
) {
  const nome = formData.get("nome") as string;
  const cognome = formData.get("cognome") as string;
  const telefono = formData.get("telefono") as string;
  const email = (formData.get("email") as string) || null;
  const note = (formData.get("note") as string) || null;

  if (!nome || !cognome || !telefono) {
    return { error: "Nome, cognome e telefono sono obbligatori" };
  }

  const isDuplicate = await checkPhoneDuplicate(telefono);
  if (isDuplicate) {
    return { error: "Esiste già un paziente con questo numero di telefono" };
  }

  const db = getDb();
  const newPatient: NewPatient = {
    id: generateId(),
    nome: nome.trim(),
    cognome: cognome.trim(),
    telefono: telefono.trim(),
    email: email?.trim() || null,
    note: note?.trim() || null,
    createdAt: new Date(),
  };

  await db.insert(patients).values(newPatient);
  revalidatePath("/pazienti");
  redirect("/pazienti");
}

export async function updatePatient(
  id: string,
  _prevState: { error?: string } | undefined,
  formData: FormData
) {
  const nome = formData.get("nome") as string;
  const cognome = formData.get("cognome") as string;
  const telefono = formData.get("telefono") as string;
  const email = (formData.get("email") as string) || null;
  const note = (formData.get("note") as string) || null;

  if (!nome || !cognome || !telefono) {
    return { error: "Nome, cognome e telefono sono obbligatori" };
  }

  const isDuplicate = await checkPhoneDuplicate(telefono, id);
  if (isDuplicate) {
    return { error: "Esiste già un paziente con questo numero di telefono" };
  }

  const db = getDb();
  await db
    .update(patients)
    .set({
      nome: nome.trim(),
      cognome: cognome.trim(),
      telefono: telefono.trim(),
      email: email?.trim() || null,
      note: note?.trim() || null,
    })
    .where(eq(patients.id, id));

  revalidatePath("/pazienti");
  revalidatePath(`/pazienti/${id}`);
  redirect(`/pazienti/${id}`);
}

export async function deletePatient(id: string) {
  const db = getDb();
  await db.delete(patients).where(eq(patients.id, id));
  revalidatePath("/pazienti");
  redirect("/pazienti");
}
