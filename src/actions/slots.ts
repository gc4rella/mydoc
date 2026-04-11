"use server";

import { getDb } from "@/db";
import { doctorSlots, appointments, type DoctorSlot, type NewDoctorSlot } from "@/db/schema";
import { eq, and, gte, lte, asc, lt, gt } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { generateSlotRanges } from "@/lib/slot-utils";
import { generateId } from "@/lib/id";
import { slotSchema, slotBlockSchema } from "@/lib/validations";

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
  const validated = slotSchema.safeParse({
    startTime: formData.get("startTime"),
    endTime: formData.get("endTime"),
    durationMinutes: formData.get("durationMinutes"),
    note: formData.get("note") ?? "",
  });

  if (!validated.success) {
    return { error: validated.error.issues[0].message };
  }

  const { startTime: startTimeStr, endTime: endTimeStr, durationMinutes, note = "" } = validated.data;

  const startTime = new Date(startTimeStr);
  const endTime = new Date(endTimeStr);

  if (endTime <= startTime) {
    return { error: "L'orario di fine deve essere successivo all'inizio" };
  }

  const db = getDb();
  const overlapping = await db
    .select({ id: doctorSlots.id })
    .from(doctorSlots)
    .where(
      and(
        lt(doctorSlots.startTime, endTime),
        gt(doctorSlots.endTime, startTime)
      )
    )
    .limit(1);

  if (overlapping.length > 0) {
    return { error: "Esiste già uno slot sovrapposto in questo orario" };
  }

  const newSlot: NewDoctorSlot = {
    id: generateId(),
    startTime,
    endTime,
    durationMinutes,
    isAvailable: true,
    note: note.trim() || null,
    createdAt: new Date(),
  };

  try {
    await db.insert(doctorSlots).values(newSlot);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.toLowerCase().includes("unique")) {
      return { error: "Slot duplicato" };
    }
    return { error: "Errore durante la creazione dello slot" };
  }
  revalidatePath("/slots");
  revalidatePath("/agenda");

  return { success: true };
}

export async function createDoctorSlotsBlock(
  _prevState: { error?: string } | undefined,
  formData: FormData
) {
  const validated = slotBlockSchema.safeParse({
    date: formData.get("date"),
    startHour: formData.get("startHour"),
    startMinute: formData.get("startMinute") ?? 0,
    endHour: formData.get("endHour"),
    endMinute: formData.get("endMinute") ?? 0,
    slotDuration: formData.get("slotDuration") ?? 30,
  });

  if (!validated.success) {
    return { error: validated.error.issues[0].message };
  }

  const { date: dateStr, startHour, startMinute, endHour, endMinute, slotDuration } = validated.data;

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
  const blockStart = slotRanges[0].startTime;
  const blockEnd = slotRanges[slotRanges.length - 1].endTime;

  const existing = await db
    .select({
      startTime: doctorSlots.startTime,
      endTime: doctorSlots.endTime,
    })
    .from(doctorSlots)
    .where(
      and(
        lt(doctorSlots.startTime, blockEnd),
        gt(doctorSlots.endTime, blockStart)
      )
    );

  const hasOverlap = (startTime: Date, endTime: Date) =>
    existing.some(
      (slot) => slot.startTime < endTime && slot.endTime > startTime
    );

  const availableRanges = slotRanges.filter(
    (range) => !hasOverlap(range.startTime, range.endTime)
  );

  if (availableRanges.length === 0) {
    return { error: "Tutti gli slot risultano già occupati o sovrapposti" };
  }

  const slots: NewDoctorSlot[] = availableRanges.map((range) => ({
    id: generateId(),
    startTime: range.startTime,
    endTime: range.endTime,
    durationMinutes: range.durationMinutes,
    isAvailable: true,
    note: null,
    createdAt: new Date(),
  }));

  try {
    await db.insert(doctorSlots).values(slots);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.toLowerCase().includes("unique")) {
      return { error: "Slot duplicati rilevati, creazione annullata" };
    }
    return { error: "Errore durante la creazione degli slot" };
  }
  revalidatePath("/slots");
  revalidatePath("/agenda");

  const skipped = slotRanges.length - slots.length;
  return { success: true, count: slots.length, skipped };
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
