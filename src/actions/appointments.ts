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
import { and, asc, desc, eq, gte } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { REQUEST_STATUS } from "@/lib/request-status";

function generateId(): string {
  return crypto.randomUUID();
}

class AppointmentActionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AppointmentActionError";
  }
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    // Some runtimes attach additional info on `cause`.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cause = (error as any).cause as unknown;
    if (cause instanceof Error) {
      return `${error.message} (cause: ${cause.message})`;
    }
    if (cause) {
      try {
        return `${error.message} (cause: ${JSON.stringify(cause)})`;
      } catch {
        return `${error.message} (cause: ${String(cause)})`;
      }
    }
    return error.message;
  }
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

function isBusyOrLockedError(error: unknown): boolean {
  const message = getErrorMessage(error).toLowerCase();
  return (
    message.includes("sqlite_busy") ||
    message.includes("database is locked") ||
    message.includes("d1_error") && message.includes("locked") ||
    message.includes("timeout") ||
    message.includes("busy")
  );
}

function isUniqueConstraintError(error: unknown): boolean {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  return (
    message.includes("unique") ||
    message.includes("constraint failed") ||
    message.includes("sqlite_constraint")
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withTransientRetry<T>(fn: () => Promise<T>, maxRetries = 2): Promise<T> {
  // Cloudflare D1 can throw transient "busy/locked" errors under concurrent writes.
  // A short retry significantly improves UX without changing semantics.
  // (The transaction either fails before commit or is rolled back by drizzle.)
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (!isBusyOrLockedError(error) || attempt === maxRetries) {
        throw error;
      }
      await sleep(50 * (attempt + 1));
    }
  }
  // Unreachable, but TypeScript doesn't know the loop always returns/throws.
  throw new Error("Retry loop exited unexpectedly");
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

  const now = new Date();
  const newAppointment: NewAppointment = {
    id: generateId(),
    requestId,
    slotId,
    note: null,
    createdAt: now,
  };

  try {
    await withTransientRetry(() =>
      db.transaction(async (tx) => {
      const existingAppointment = await tx
        .select({ id: appointments.id })
        .from(appointments)
        .where(eq(appointments.requestId, requestId))
        .limit(1);

      if (existingAppointment.length > 0) {
        throw new AppointmentActionError("La richiesta ha già un appuntamento");
      }

      const slot = await tx
        .select()
        .from(doctorSlots)
        .where(eq(doctorSlots.id, slotId))
        .limit(1);

      if (!slot[0]) {
        throw new AppointmentActionError("Slot non trovato");
      }

      if (!slot[0].isAvailable) {
        throw new AppointmentActionError("Slot non disponibile");
      }

      const request = await tx
        .select()
        .from(requests)
        .where(eq(requests.id, requestId))
        .limit(1);

      if (!request[0]) {
        throw new AppointmentActionError("Richiesta non trovata");
      }

      if (request[0].stato !== REQUEST_STATUS.WAITING) {
        throw new AppointmentActionError("La richiesta non è in lista d'attesa");
      }

      await tx.insert(appointments).values(newAppointment);
      await tx
        .update(doctorSlots)
        .set({ isAvailable: false })
        .where(eq(doctorSlots.id, slotId));
      await tx
        .update(requests)
        .set({ stato: REQUEST_STATUS.SCHEDULED })
        .where(eq(requests.id, requestId));
      })
    );
  } catch (error) {
    if (error instanceof AppointmentActionError) {
      return { error: error.message };
    }
    if (isUniqueConstraintError(error)) {
      return { error: "Slot già prenotato o richiesta già assegnata" };
    }
    if (isBusyOrLockedError(error)) {
      return { error: "Database occupato. Riprova tra qualche secondo." };
    }

    const debugId = generateId().slice(0, 8);
    console.error(`[scheduleRequest:${debugId}] Failed`, {
      requestId,
      slotId,
      message: getErrorMessage(error),
      error,
    });

    if (process.env.NODE_ENV !== "production") {
      return { error: `Errore durante la prenotazione (${debugId}): ${getErrorMessage(error)}` };
    }
    return { error: "Errore durante la prenotazione" };
  }

  revalidatePath("/lista-attesa");
  revalidatePath("/slots");
  revalidatePath("/agenda");

  return { success: true, appointmentId: newAppointment.id };
}

export async function scheduleRequestAtNextAvailable(requestId: string) {
  const db = getDb();

  const request = await db
    .select({
      id: requests.id,
      stato: requests.stato,
      desiredDate: requests.desiredDate,
    })
    .from(requests)
    .where(eq(requests.id, requestId))
    .limit(1);

  if (!request[0]) {
    return { error: "Richiesta non trovata" };
  }

  if (request[0].stato !== REQUEST_STATUS.WAITING) {
    return { error: "La richiesta non è in lista d'attesa" };
  }

  const now = new Date();
  const fromDate =
    request[0].desiredDate && request[0].desiredDate > now
      ? request[0].desiredDate
      : now;

  const nextSlot = await db
    .select({
      id: doctorSlots.id,
    })
    .from(doctorSlots)
    .where(
      and(
        eq(doctorSlots.isAvailable, true),
        gte(doctorSlots.startTime, fromDate)
      )
    )
    .orderBy(asc(doctorSlots.startTime))
    .limit(1);

  if (!nextSlot[0]) {
    return { error: "Nessuno slot disponibile" };
  }

  return scheduleRequest(requestId, nextSlot[0].id);
}

export async function rescheduleAppointment(appointmentId: string, newSlotId: string) {
  const db = getDb();
  let noChanges = false;

  try {
    await withTransientRetry(() =>
      db.transaction(async (tx) => {
      const appointment = await tx
        .select()
        .from(appointments)
        .where(eq(appointments.id, appointmentId))
        .limit(1);

      if (!appointment[0]) {
        throw new AppointmentActionError("Appuntamento non trovato");
      }

      const currentSlotId = appointment[0].slotId;
      if (currentSlotId === newSlotId) {
        noChanges = true;
        return;
      }

      const newSlot = await tx
        .select()
        .from(doctorSlots)
        .where(eq(doctorSlots.id, newSlotId))
        .limit(1);

      if (!newSlot[0]) {
        throw new AppointmentActionError("Slot non trovato");
      }

      if (!newSlot[0].isAvailable) {
        throw new AppointmentActionError("Slot non disponibile");
      }

      await tx
        .update(doctorSlots)
        .set({ isAvailable: false })
        .where(eq(doctorSlots.id, newSlotId));

      await tx
        .update(appointments)
        .set({ slotId: newSlotId })
        .where(eq(appointments.id, appointmentId));

      await tx
        .update(doctorSlots)
        .set({ isAvailable: true })
        .where(eq(doctorSlots.id, currentSlotId));
      })
    );
  } catch (error) {
    if (error instanceof AppointmentActionError) {
      return { error: error.message };
    }
    if (isUniqueConstraintError(error)) {
      return { error: "Slot già prenotato" };
    }
    if (isBusyOrLockedError(error)) {
      return { error: "Database occupato. Riprova tra qualche secondo." };
    }

    const debugId = generateId().slice(0, 8);
    console.error(`[rescheduleAppointment:${debugId}] Failed`, {
      appointmentId,
      newSlotId,
      message: getErrorMessage(error),
      error,
    });

    if (process.env.NODE_ENV !== "production") {
      return { error: `Errore durante lo spostamento (${debugId}): ${getErrorMessage(error)}` };
    }
    return { error: "Errore durante lo spostamento" };
  }

  if (noChanges) {
    return { success: true };
  }

  revalidatePath("/lista-attesa");
  revalidatePath("/slots");
  revalidatePath("/agenda");

  return { success: true };
}

export async function cancelAppointment(appointmentId: string) {
  const db = getDb();

  try {
    await withTransientRetry(() =>
      db.transaction(async (tx) => {
      const appointment = await tx
        .select()
        .from(appointments)
        .where(eq(appointments.id, appointmentId))
        .limit(1);

      if (!appointment[0]) {
        throw new AppointmentActionError("Appuntamento non trovato");
      }

      await tx
        .update(doctorSlots)
        .set({ isAvailable: true })
        .where(eq(doctorSlots.id, appointment[0].slotId));

      await tx
        .update(requests)
        .set({ stato: REQUEST_STATUS.WAITING })
        .where(eq(requests.id, appointment[0].requestId));

      await tx.delete(appointments).where(eq(appointments.id, appointmentId));
      })
    );
  } catch (error) {
    if (error instanceof AppointmentActionError) {
      return { error: error.message };
    }
    if (isBusyOrLockedError(error)) {
      return { error: "Database occupato. Riprova tra qualche secondo." };
    }

    const debugId = generateId().slice(0, 8);
    console.error(`[cancelAppointment:${debugId}] Failed`, {
      appointmentId,
      message: getErrorMessage(error),
      error,
    });

    if (process.env.NODE_ENV !== "production") {
      return { error: `Errore durante l'annullamento (${debugId}): ${getErrorMessage(error)}` };
    }
    return { error: "Errore durante l'annullamento" };
  }

  revalidatePath("/lista-attesa");
  revalidatePath("/slots");
  revalidatePath("/agenda");

  return { success: true };
}
