CREATE TABLE `patients` (
	`id` text PRIMARY KEY NOT NULL,
	`nome` text NOT NULL,
	`cognome` text NOT NULL,
	`telefono` text NOT NULL,
	`email` text,
	`note` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `requests` (
	`id` text PRIMARY KEY NOT NULL,
	`patient_id` text NOT NULL,
	`motivo` text NOT NULL,
	`urgenza` text NOT NULL,
	`stato` text DEFAULT 'new' NOT NULL,
	`desired_date` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON UPDATE no action ON DELETE no action
);
