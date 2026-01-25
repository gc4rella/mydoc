"use server";

import { getDb } from "@/db";
import { doctorSlots, appointments, type DoctorSlot, type NewDoctorSlot } from "@/db/schema";
import { eq, and, gte, lte, asc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { generateSlotRanges } from "@/lib/slot-utils";

function generateId(): string {
  return crypto.randomUUID();
}

export async function getDoctorSlots(filters?: {
  startDate?: Date;
  endDate?: Date;
  onlyAvailable?: boolean;
}): Promise<DoctorSlot[]> {
  const db = getDb();

  const results = await db.select().from(doctorSlots).orderBy(asc(doctorSlots.startTime));

  let filtered = results;

  if (filters?.startDate) {
    filtered = filtered.filter((s) => s.startTime >= filters.startDate!);
  }
  if (filters?.endDate) {
    filtered = filtered.filter((s) => s.startTime <= filters.endDate!);
  }
  if (filters?.onlyAvailable) {
    filtered = filtered.filter((s) => s.isAvailable);
  }

  return filtered;
}

export async function getDoctorSlot(id: string): Promise<DoctorSlot | undefined> {
  const db = getDb();
  const results = await db
    .select()
    .from(doctorSlots)
    .where(eq(doctorSlots.id, id))
    .limit(1);

  return results[0];
}

export async function createDoctorSlot(
  _prevState: { error?: string } | undefined,
  formData: FormData
) {
  const startTimeStr = formData.get("startTime") as string;
  const endTimeStr = formData.get("endTime") as string;
  const durationMinutes = parseInt(formData.get("durationMinutes") as string) || 30;
  const note = formData.get("note") as string;

  if (!startTimeStr || !endTimeStr) {
    return { error: "Orario di inizio e fine sono obbligatori" };
  }

  const startTime = new Date(startTimeStr);
  const endTime = new Date(endTimeStr);

  if (endTime <= startTime) {
    return { error: "L'orario di fine deve essere successivo all'inizio" };
  }

  const db = getDb();
  const newSlot: NewDoctorSlot = {
    id: generateId(),
    startTime,
    endTime,
    durationMinutes,
    isAvailable: true,
    note: note?.trim() || null,
    createdAt: new Date(),
  };

  await db.insert(doctorSlots).values(newSlot);
  revalidatePath("/slots");
  revalidatePath("/agenda");

  return { success: true };
}

export async function createDoctorSlotsBlock(
  _prevState: { error?: string } | undefined,
  formData: FormData
) {
  const dateStr = formData.get("date") as string;
  const startHour = parseInt(formData.get("startHour") as string);
  const startMinute = parseInt(formData.get("startMinute") as string) || 0;
  const endHour = parseInt(formData.get("endHour") as string);
  const endMinute = parseInt(formData.get("endMinute") as string) || 0;
  const slotDuration = parseInt(formData.get("slotDuration") as string) || 30;

  if (!dateStr || isNaN(startHour) || isNaN(endHour)) {
    return { error: "Data e orari sono obbligatori" };
  }

  // Use utility function to generate slots with correct timezone handling
  const slotRanges = generateSlotRanges(
    dateStr,
    startHour,
    startMinute,
    endHour,
    endMinute,
    slotDuration
  );

  if (slotRanges.length === 0) {
    return { error: "Nessuno slot può essere creato con questi parametri" };
  }

  const db = getDb();
  const slots: NewDoctorSlot[] = slotRanges.map((range) => ({
    id: generateId(),
    startTime: range.startTime,
    endTime: range.endTime,
    durationMinutes: range.durationMinutes,
    isAvailable: true,
    note: null,
    createdAt: new Date(),
  }));

  await db.insert(doctorSlots).values(slots);
  revalidatePath("/slots");
  revalidatePath("/agenda");

  return { success: true, count: slots.length };
}

export async function deleteDoctorSlot(id: string) {
  const db = getDb();

  // Check if slot has any appointments
  const linkedAppointments = await db
    .select()
    .from(appointments)
    .where(eq(appointments.slotId, id))
    .limit(1);

  if (linkedAppointments.length > 0) {
    return { error: "Impossibile eliminare: slot con appuntamenti attivi" };
  }

  await db.delete(doctorSlots).where(eq(doctorSlots.id, id));
  revalidatePath("/slots");
  revalidatePath("/agenda");

  return { success: true };
}

export async function getNextAvailableSlot(fromDate?: Date): Promise<DoctorSlot | undefined> {
  const db = getDb();
  const checkDate = fromDate || new Date();

  const results = await db
    .select()
    .from(doctorSlots)
    .where(
      and(
        eq(doctorSlots.isAvailable, true),
        gte(doctorSlots.startTime, checkDate)
      )
    )
    .orderBy(asc(doctorSlots.startTime))
    .limit(1);

  return results[0];
}

export async function getAvailableSlotsInRange(
  start: Date,
  end: Date
): Promise<DoctorSlot[]> {
  const db = getDb();

  const results = await db
    .select()
    .from(doctorSlots)
    .where(
      and(
        gte(doctorSlots.startTime, start),
        lte(doctorSlots.startTime, end)
      )
    )
    .orderBy(asc(doctorSlots.startTime));

  return results;
}

export async function updateSlotAvailability(id: string, isAvailable: boolean) {
  const db = getDb();
  await db
    .update(doctorSlots)
    .set({ isAvailable })
    .where(eq(doctorSlots.id, id));

  revalidatePath("/slots");
  revalidatePath("/agenda");
}
