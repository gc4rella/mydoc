import { z } from "zod";

export const patientSchema = z.object({
  nome: z.string().min(1, "Nome obbligatorio"),
  cognome: z.string().min(1, "Cognome obbligatorio"),
  telefono: z.string().min(1, "Telefono obbligatorio"),
  email: z.string().email("Email non valida").optional().or(z.literal("")),
  note: z.string().optional().or(z.literal("")),
});

export const requestSchema = z.object({
  patientId: z.string().min(1, "Paziente obbligatorio"),
  motivo: z.string().min(1, "Motivo obbligatorio"),
  urgenza: z.enum(["bassa", "media", "alta"], {
    error: "Urgenza non valida",
  }),
  desiredDate: z.string().optional().or(z.literal("")),
});

export const slotSchema = z.object({
  startTime: z.string().min(1, "Orario di inizio obbligatorio"),
  endTime: z.string().min(1, "Orario di fine obbligatorio"),
  durationMinutes: z.coerce.number().int().min(1).default(30),
  note: z.string().optional().or(z.literal("")),
});

export const slotBlockSchema = z.object({
  date: z.string().min(1, "Data obbligatoria"),
  startHour: z.coerce.number().int().min(0).max(23),
  startMinute: z.coerce.number().int().min(0).max(59).default(0),
  endHour: z.coerce.number().int().min(0).max(23),
  endMinute: z.coerce.number().int().min(0).max(59).default(0),
  slotDuration: z.coerce.number().int().min(1).default(30),
});

export type PatientInput = z.infer<typeof patientSchema>;
export type RequestInput = z.infer<typeof requestSchema>;
export type SlotInput = z.infer<typeof slotSchema>;
export type SlotBlockInput = z.infer<typeof slotBlockSchema>;
