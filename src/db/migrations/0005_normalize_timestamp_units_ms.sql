-- Normalize timestamp units across tables.
-- Some rows were stored as unix seconds, others as unix milliseconds.
-- We standardize everything to unix milliseconds.
--
-- Heuristic: values < 100000000000 (~1973-03-03 in ms) are treated as seconds.

UPDATE patients
SET created_at = created_at * 1000
WHERE created_at < 100000000000;

UPDATE requests
SET created_at = created_at * 1000
WHERE created_at < 100000000000;

UPDATE requests
SET desired_date = desired_date * 1000
WHERE desired_date IS NOT NULL
  AND desired_date < 100000000000;

-- doctor_slots has a unique (start_time, end_time) index.
-- If a slot exists in both seconds and ms, converting seconds -> ms would violate the unique constraint.
-- We resolve that by merging seconds-slots into their existing ms-slots (moving appointments), then
-- converting the remaining seconds-slots in-place.

-- Move appointments from seconds slots to their ms duplicates (if present).
UPDATE appointments
SET slot_id = (
  SELECT m.id
  FROM doctor_slots s
  JOIN doctor_slots m
    ON m.start_time = s.start_time * 1000
   AND m.end_time = s.end_time * 1000
  WHERE s.id = appointments.slot_id
)
WHERE EXISTS (
  SELECT 1
  FROM doctor_slots s
  JOIN doctor_slots m
    ON m.start_time = s.start_time * 1000
   AND m.end_time = s.end_time * 1000
  WHERE s.id = appointments.slot_id
    AND s.start_time < 100000000000
);

-- Merge "unavailable" state/note from seconds-slot into its ms duplicate (if any).
UPDATE doctor_slots
SET
  is_available = 0,
  note = COALESCE(note, (
    SELECT s.note
    FROM doctor_slots s
    WHERE s.start_time < 100000000000
      AND doctor_slots.start_time = s.start_time * 1000
      AND doctor_slots.end_time = s.end_time * 1000
    LIMIT 1
  ))
WHERE EXISTS (
  SELECT 1
  FROM doctor_slots s
  WHERE s.start_time < 100000000000
    AND doctor_slots.start_time = s.start_time * 1000
    AND doctor_slots.end_time = s.end_time * 1000
    AND s.is_available = 0
);

-- Delete seconds-slots that have an ms duplicate (we already moved appointments).
DELETE FROM doctor_slots
WHERE start_time < 100000000000
  AND EXISTS (
    SELECT 1
    FROM doctor_slots m
    WHERE m.start_time = doctor_slots.start_time * 1000
      AND m.end_time = doctor_slots.end_time * 1000
  );

-- Convert remaining seconds-slots in-place.
UPDATE doctor_slots
SET
  start_time = start_time * 1000,
  end_time = end_time * 1000,
  created_at = created_at * 1000
WHERE start_time < 100000000000;

UPDATE appointments
SET created_at = created_at * 1000
WHERE created_at < 100000000000;
