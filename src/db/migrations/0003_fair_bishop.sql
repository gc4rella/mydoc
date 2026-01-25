-- Convert old request states to new simplified states
-- old: new, waiting, pending, confirmed, rejected
-- new: waiting, scheduled, rejected

-- Simplify appointments table (remove state machine columns)
PRAGMA foreign_keys=OFF;--> statement-breakpoint

-- Recreate appointments table without state columns
CREATE TABLE `__new_appointments` (
	`id` text PRIMARY KEY NOT NULL,
	`request_id` text NOT NULL,
	`slot_id` text NOT NULL,
	`note` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`request_id`) REFERENCES `requests`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`slot_id`) REFERENCES `doctor_slots`(`id`) ON UPDATE no action ON DELETE no action
);--> statement-breakpoint
INSERT INTO `__new_appointments`("id", "request_id", "slot_id", "note", "created_at")
SELECT "id", "request_id", "slot_id", "note", "created_at" FROM `appointments`;--> statement-breakpoint
DROP TABLE `appointments`;--> statement-breakpoint
ALTER TABLE `__new_appointments` RENAME TO `appointments`;--> statement-breakpoint

-- Recreate requests table with new states
CREATE TABLE `__new_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`patient_id` text NOT NULL,
	`motivo` text NOT NULL,
	`urgenza` text NOT NULL,
	`stato` text DEFAULT 'waiting' NOT NULL,
	`desired_date` integer,
	`note` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON UPDATE no action ON DELETE no action
);--> statement-breakpoint
INSERT INTO `__new_requests`("id", "patient_id", "motivo", "urgenza", "stato", "desired_date", "note", "created_at")
SELECT
  "id",
  "patient_id",
  "motivo",
  "urgenza",
  CASE
    WHEN "stato" = 'new' THEN 'waiting'
    WHEN "stato" = 'pending' THEN 'scheduled'
    WHEN "stato" = 'confirmed' THEN 'scheduled'
    ELSE "stato"
  END,
  "desired_date",
  "note",
  "created_at"
FROM `requests`;--> statement-breakpoint
DROP TABLE `requests`;--> statement-breakpoint
ALTER TABLE `__new_requests` RENAME TO `requests`;--> statement-breakpoint

PRAGMA foreign_keys=ON;
