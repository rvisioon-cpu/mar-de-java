-- Update total occupied area specifications for units 101, 102, 501, 503.
UPDATE units SET area_sqm = 133.23, updated_at = unixepoch()
WHERE id = 'unit_1_102' AND deleted_at IS NULL;

UPDATE units SET area_sqm = 140.28, updated_at = unixepoch()
WHERE id = 'unit_1_101' AND deleted_at IS NULL;

UPDATE units SET area_sqm = 169.17, updated_at = unixepoch()
WHERE id IN ('unit_5_501', 'unit_6_601') AND deleted_at IS NULL;

UPDATE units SET area_sqm = 157.24, updated_at = unixepoch()
WHERE id IN ('unit_5_503', 'unit_6_602') AND deleted_at IS NULL;

-- Update video general with October 23 revision
UPDATE media SET url = 'videos/video_general_87d60c91f80a.mp4'
WHERE id = 'mar-java-video-general';
