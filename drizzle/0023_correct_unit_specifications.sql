-- Align apartment and duplex specifications with the current unit schedule.
UPDATE units SET area_sqm = 116.28, updated_at = unixepoch()
WHERE id IN ('unit_2_201', 'unit_4_401') AND deleted_at IS NULL;
UPDATE units SET area_sqm = 102.1, updated_at = unixepoch()
WHERE id = 'unit_2_202' AND deleted_at IS NULL;
UPDATE units SET area_sqm = 116.28, updated_at = unixepoch()
WHERE id = 'unit_3_301' AND deleted_at IS NULL;
UPDATE units SET area_sqm = 101.31, updated_at = unixepoch()
WHERE id = 'unit_3_302' AND deleted_at IS NULL;
UPDATE units SET area_sqm = 108.22, updated_at = unixepoch()
WHERE id = 'unit_4_402' AND deleted_at IS NULL;
