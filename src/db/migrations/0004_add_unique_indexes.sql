CREATE UNIQUE INDEX IF NOT EXISTS `doctor_slots_start_end_unique`
ON `doctor_slots` (`start_time`, `end_time`);

CREATE UNIQUE INDEX IF NOT EXISTS `appointments_request_id_unique`
ON `appointments` (`request_id`);

CREATE UNIQUE INDEX IF NOT EXISTS `appointments_slot_id_unique`
ON `appointments` (`slot_id`);
