-- Client supplied and Kuula title verified: DÚPLEX 503 - MAR DE JAVA.
-- Both floor records belong to the same apartment.
UPDATE units SET tour_url = 'https://kuula.co/share/collection/7dlT4?logo=-1&card=1&info=0&fs=1&vr=1&gyro=0&initload=0&thumbs=1&inst=es', updated_at = unixepoch()
WHERE identifier = '503' AND deleted_at IS NULL;

UPDATE tours SET target_url = 'https://kuula.co/share/collection/7dlT4?logo=-1&card=1&info=0&fs=1&vr=1&gyro=0&initload=0&thumbs=1&inst=es', is_active = 1
WHERE unit_id IN (SELECT id FROM units WHERE identifier = '503' AND deleted_at IS NULL)
  AND deleted_at IS NULL;
