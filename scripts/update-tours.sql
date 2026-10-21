-- Apply to existing databases only; fresh databases use generate-seed.mjs.
-- Kuula assignments verified against the collection titles on 2026-10-20.
-- Only tour links change: preserve unit specifications, assets and sale states.
-- Keep the unit page and /recorridos gallery synchronized without reseeding.
UPDATE units SET tour_url = 'https://kuula.co/share/collection/7dlHt?logo=-1&card=1&info=0&fs=1&vr=1&gyro=0&initload=0&thumbs=1&inst=es', updated_at = unixepoch() WHERE identifier = '101' AND deleted_at IS NULL;
UPDATE units SET tour_url = 'https://kuula.co/share/collection/7dlM4?logo=-1&card=1&info=0&fs=1&vr=1&gyro=0&initload=0&thumbs=1&inst=es', updated_at = unixepoch() WHERE identifier = '102' AND deleted_at IS NULL;
UPDATE units SET tour_url = 'https://kuula.co/share/collection/7dlMh?logo=-1&card=1&info=0&fs=1&vr=1&gyro=0&initload=0&thumbs=1&inst=es', updated_at = unixepoch() WHERE identifier = '201' AND deleted_at IS NULL;
UPDATE units SET tour_url = 'https://kuula.co/share/collection/7dlMZ?logo=-1&card=1&info=0&fs=1&vr=1&gyro=0&initload=0&thumbs=1&inst=es', updated_at = unixepoch() WHERE identifier = '202' AND deleted_at IS NULL;
UPDATE units SET tour_url = 'https://kuula.co/share/collection/7dlMd?logo=-1&card=1&info=0&fs=1&vr=1&gyro=0&initload=0&thumbs=1&inst=es', updated_at = unixepoch() WHERE identifier = '203' AND deleted_at IS NULL;
UPDATE units SET tour_url = 'https://kuula.co/share/collection/7dlMP?logo=-1&card=1&info=0&fs=1&vr=1&gyro=0&initload=0&thumbs=1&inst=es', updated_at = unixepoch() WHERE identifier = '301' AND deleted_at IS NULL;
UPDATE units SET tour_url = 'https://kuula.co/share/collection/7dlMD?logo=-1&card=1&info=0&fs=1&vr=1&gyro=0&initload=0&thumbs=1&inst=es', updated_at = unixepoch() WHERE identifier = '302' AND deleted_at IS NULL;
UPDATE units SET tour_url = 'https://kuula.co/share/collection/7dlMF?logo=-1&card=1&info=0&fs=1&vr=1&gyro=0&initload=0&thumbs=1&inst=es', updated_at = unixepoch() WHERE identifier = '401' AND deleted_at IS NULL;
UPDATE units SET tour_url = 'https://kuula.co/share/collection/7dlMH?logo=-1&card=1&info=0&fs=1&vr=1&gyro=0&initload=0&thumbs=1&inst=es', updated_at = unixepoch() WHERE identifier = '402' AND deleted_at IS NULL;
UPDATE units SET tour_url = 'https://kuula.co/share/collection/7dlM3?logo=-1&card=1&info=0&fs=1&vr=1&gyro=0&initload=0&thumbs=1&inst=es', updated_at = unixepoch() WHERE identifier = '403' AND deleted_at IS NULL;
UPDATE units SET tour_url = 'https://kuula.co/share/collection/7dlMt?logo=-1&card=1&info=0&fs=1&vr=1&gyro=0&initload=0&thumbs=1&inst=es', updated_at = unixepoch() WHERE identifier = '501' AND deleted_at IS NULL;
UPDATE units SET tour_url = 'https://kuula.co/share/collection/7dPKv?logo=-1&card=1&info=0&fs=1&vr=1&zoom=1&sd=1&thumbs=3&inst=es', updated_at = unixepoch() WHERE identifier = '502' AND deleted_at IS NULL;

-- 503 had been given flat 502's collection. Preserve any independently supplied tour.
UPDATE units SET tour_url = NULL, updated_at = unixepoch()
WHERE identifier = '503' AND tour_url LIKE 'https://kuula.co/share/collection/7dPKv%';
UPDATE tours SET is_active = 0
WHERE (unit_id IN (SELECT id FROM units WHERE identifier = '503') OR id = 'tour-503')
  AND target_url LIKE 'https://kuula.co/share/collection/7dPKv%';

UPDATE tours SET target_url = (SELECT u.tour_url FROM units u WHERE u.id = tours.unit_id)
WHERE deleted_at IS NULL AND unit_id IN (
  SELECT id FROM units WHERE deleted_at IS NULL AND identifier IN ('101', '102', '201', '202', '203', '301', '302', '401', '402', '403', '501', '502')
);

UPDATE tours SET target_url = 'https://kuula.co/share/collection/7dhMt?logo=-1&card=1&info=0&fs=1&vr=1&zoom=1&sd=1&thumbs=3&inst=es'
WHERE id = 'building-main' AND deleted_at IS NULL;

-- Client supplied and Kuula title verified: DÚPLEX 503 - MAR DE JAVA.
-- Both floor records belong to the same apartment.
UPDATE units SET tour_url = 'https://kuula.co/share/collection/7dlT4?logo=-1&card=1&info=0&fs=1&vr=1&gyro=0&initload=0&thumbs=1&inst=es', updated_at = unixepoch()
WHERE identifier = '503' AND deleted_at IS NULL;

UPDATE tours SET target_url = 'https://kuula.co/share/collection/7dlT4?logo=-1&card=1&info=0&fs=1&vr=1&gyro=0&initload=0&thumbs=1&inst=es', is_active = 1
WHERE unit_id IN (SELECT id FROM units WHERE identifier = '503' AND deleted_at IS NULL)
  AND deleted_at IS NULL;
