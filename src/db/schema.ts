import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const patients = sqliteTable("patients", {
  id: text("id").primaryKey(),
  nome: text("nome").notNull(),
  cognome: text("cognome").notNull(),
  telefono: text("telefono").notNull(),
  email: text("email"),
  note: text("note"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const requests = sqliteTable("requests", {
  id: text("id").primaryKey(),
  patientId: text("patient_id")
    .notNull()
    .references(() => patients.id),
  motivo: text("motivo").notNull(),
  urgenza: text("urgenza", { enum: ["bassa", "media", "alta"] }).notNull(),
  stato: text("stato", {
    enum: ["waiting", "scheduled", "rejected"],
  })
    .notNull()
    .default("waiting"),
  desiredDate: integer("desired_date", { mode: "timestamp" }),
  note: text("note"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const doctorSlots = sqliteTable("doctor_slots", {
  id: text("id").primaryKey(),
  startTime: integer("start_time", { mode: "timestamp" }).notNull(),
  endTime: integer("end_time", { mode: "timestamp" }).notNull(),
  durationMinutes: integer("duration_minutes").notNull().default(30),
  isAvailable: integer("is_available", { mode: "boolean" }).notNull().default(true),
  note: text("note"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const appointments = sqliteTable("appointments", {
  id: text("id").primaryKey(),
  requestId: text("request_id")
    .notNull()
    .references(() => requests.id),
  slotId: text("slot_id")
    .notNull()
    .references(() => doctorSlots.id),
  note: text("note"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export type Patient = typeof patients.$inferSelect;
export type NewPatient = typeof patients.$inferInsert;
export type Request = typeof requests.$inferSelect;
export type NewRequest = typeof requests.$inferInsert;
export type DoctorSlot = typeof doctorSlots.$inferSelect;
export type NewDoctorSlot = typeof doctorSlots.$inferInsert;
export type Appointment = typeof appointments.$inferSelect;
export type NewAppointment = typeof appointments.$inferInsert;
