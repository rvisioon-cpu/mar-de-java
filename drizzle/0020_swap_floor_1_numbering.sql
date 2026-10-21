-- Rename the two apartments on floor 1. Stable IDs keep each location,
-- media, Kuula collection and commercial history attached to its apartment.
-- Absolute assignments make this safe to repeat after a direct D1 execution.
UPDATE units
SET identifier = CASE id
    WHEN 'unit_1_101' THEN '102'
    WHEN 'unit_1_102' THEN '101'
  END,
  updated_at = unixepoch()
WHERE floor_id = 'floor_1'
  AND id IN ('unit_1_101', 'unit_1_102')
  AND deleted_at IS NULL;

-- The former 101 tour is now 102, and the former 102 tour is now 101.
UPDATE tours
SET title = 'Unidad ' || (SELECT identifier FROM units WHERE units.id = tours.unit_id),
    target_url = (SELECT tour_url FROM units WHERE units.id = tours.unit_id)
WHERE deleted_at IS NULL
  AND unit_id IN (
    SELECT id FROM units
    WHERE floor_id = 'floor_1'
      AND id IN ('unit_1_101', 'unit_1_102')
      AND deleted_at IS NULL
  );
