CREATE TABLE `appointments` (
	`id` text PRIMARY KEY NOT NULL,
	`request_id` text NOT NULL,
	`slot_id` text NOT NULL,
	`stato` text DEFAULT 'proposed' NOT NULL,
	`proposed_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	`confirmed_at` integer,
	`note` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`request_id`) REFERENCES `requests`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`slot_id`) REFERENCES `doctor_slots`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `doctor_slots` (
	`id` text PRIMARY KEY NOT NULL,
	`start_time` integer NOT NULL,
	`end_time` integer NOT NULL,
	`duration_minutes` integer DEFAULT 30 NOT NULL,
	`is_available` integer DEFAULT true NOT NULL,
	`note` text,
	`created_at` integer NOT NULL
);
