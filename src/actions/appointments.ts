"use server";

import { getDb } from "@/db";
import {
  appointments,
  doctorSlots,
  requests,
  patients,
  type Appointment,
  type NewAppointment,
} from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";

function generateId(): string {
  return crypto.randomUUID();
}

export type AppointmentWithDetails = Appointment & {
  slot: {
    id: string;
    startTime: Date;
    endTime: Date;
    durationMinutes: number;
  };
  request: {
    id: string;
    motivo: string;
    urgenza: string;
  };
  patient: {
    id: string;
    nome: string;
    cognome: string;
  };
};

export async function getAppointments(): Promise<AppointmentWithDetails[]> {
  const db = getDb();

  const results = await db
    .select({
      id: appointments.id,
      requestId: appointments.requestId,
      slotId: appointments.slotId,
      note: appointments.note,
      createdAt: appointments.createdAt,
      slot: {
        id: doctorSlots.id,
        startTime: doctorSlots.startTime,
        endTime: doctorSlots.endTime,
        durationMinutes: doctorSlots.durationMinutes,
      },
      request: {
        id: requests.id,
        motivo: requests.motivo,
        urgenza: requests.urgenza,
      },
      patient: {
        id: patients.id,
        nome: patients.nome,
        cognome: patients.cognome,
      },
    })
    .from(appointments)
    .innerJoin(doctorSlots, eq(appointments.slotId, doctorSlots.id))
    .innerJoin(requests, eq(appointments.requestId, requests.id))
    .innerJoin(patients, eq(requests.patientId, patients.id))
    .orderBy(desc(appointments.createdAt));

  return results;
}

export async function getAppointmentByRequest(
  requestId: string
): Promise<AppointmentWithDetails | undefined> {
  const db = getDb();

  const results = await db
    .select({
      id: appointments.id,
      requestId: appointments.requestId,
      slotId: appointments.slotId,
      note: appointments.note,
      createdAt: appointments.createdAt,
      slot: {
        id: doctorSlots.id,
        startTime: doctorSlots.startTime,
        endTime: doctorSlots.endTime,
        durationMinutes: doctorSlots.durationMinutes,
      },
      request: {
        id: requests.id,
        motivo: requests.motivo,
        urgenza: requests.urgenza,
      },
      patient: {
        id: patients.id,
        nome: patients.nome,
        cognome: patients.cognome,
      },
    })
    .from(appointments)
    .innerJoin(doctorSlots, eq(appointments.slotId, doctorSlots.id))
    .innerJoin(requests, eq(appointments.requestId, requests.id))
    .innerJoin(patients, eq(requests.patientId, patients.id))
    .where(eq(appointments.requestId, requestId))
    .limit(1);

  return results[0];
}

export async function scheduleRequest(requestId: string, slotId: string) {
  const db = getDb();

  // Check slot is available
  const slot = await db
    .select()
    .from(doctorSlots)
    .where(eq(doctorSlots.id, slotId))
    .limit(1);

  if (!slot[0]) {
    return { error: "Slot non trovato" };
  }

  if (!slot[0].isAvailable) {
    return { error: "Slot non disponibile" };
  }

  // Check request exists and is waiting
  const request = await db
    .select()
    .from(requests)
    .where(eq(requests.id, requestId))
    .limit(1);

  if (!request[0]) {
    return { error: "Richiesta non trovata" };
  }

  if (request[0].stato !== "waiting") {
    return { error: "La richiesta non è in lista d'attesa" };
  }

  const now = new Date();

  const newAppointment: NewAppointment = {
    id: generateId(),
    requestId,
    slotId,
    note: null,
    createdAt: now,
  };

  // Create appointment, mark slot as booked, update request to scheduled
  await db.insert(appointments).values(newAppointment);
  await db
    .update(doctorSlots)
    .set({ isAvailable: false })
    .where(eq(doctorSlots.id, slotId));
  await db
    .update(requests)
    .set({ stato: "scheduled" })
    .where(eq(requests.id, requestId));

  revalidatePath("/lista-attesa");
  revalidatePath("/slots");
  revalidatePath("/agenda");

  return { success: true, appointmentId: newAppointment.id };
}

export async function cancelAppointment(appointmentId: string) {
  const db = getDb();

  const appointment = await db
    .select()
    .from(appointments)
    .where(eq(appointments.id, appointmentId))
    .limit(1);

  if (!appointment[0]) {
    return { error: "Appuntamento non trovato" };
  }

  // Free the slot
  await db
    .update(doctorSlots)
    .set({ isAvailable: true })
    .where(eq(doctorSlots.id, appointment[0].slotId));

  // Move request back to waiting list
  await db
    .update(requests)
    .set({ stato: "waiting" })
    .where(eq(requests.id, appointment[0].requestId));

  // Delete the appointment
  await db.delete(appointments).where(eq(appointments.id, appointmentId));

  revalidatePath("/lista-attesa");
  revalidatePath("/slots");
  revalidatePath("/agenda");

  return { success: true };
}
