ALTER TABLE `appointments` ADD `updated_at` integer;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `appointments_request_id_unique` ON `appointments` (`request_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `appointments_slot_id_unique` ON `appointments` (`slot_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `appointments_request_id_idx` ON `appointments` (`request_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `appointments_slot_id_idx` ON `appointments` (`slot_id`);--> statement-breakpoint
ALTER TABLE `doctor_slots` ADD `updated_at` integer;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `doctor_slots_start_end_unique` ON `doctor_slots` (`start_time`,`end_time`);--> statement-breakpoint
ALTER TABLE `patients` ADD `updated_at` integer;--> statement-breakpoint
ALTER TABLE `requests` ADD `updated_at` integer;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `requests_patient_id_idx` ON `requests` (`patient_id`);
