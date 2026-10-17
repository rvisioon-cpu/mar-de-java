-- Kuula 360 tours delivered by the client.
-- NOTE: these now live in src/data/floors.ts (per unit) and generate-seed.mjs
-- (the building-wide one) and ship in the generated seed, so this script is only
-- for patching a database in place — no wipe, unlike seeding.
-- Two consumers: units.tour_url powers the "Tour 360" button inside each unit
-- page, and the tours table powers the /recorridos gallery. The general tour
-- keeps the id 'building-main' because the showroom's "Recorrido General"
-- button deep-links to /recorridos?tourId=building-main.
--
-- Thumbnails point at each typology's first interior render; the general one
-- uses the daytime central face of the building.
--
-- NOTE: the collection ids are case sensitive.
-- Updated 2026-10-13 with the client's new collection ids (7dlH*/7dlM*/7dPKv/7dhMt).

UPDATE units SET tour_url = 'https://kuula.co/share/collection/7dlHt?logo=-1&card=1&info=0&fs=1&vr=1&gyro=0&initload=0&thumbs=1&inst=es', updated_at = unixepoch() WHERE id = 'unit_1_101';
UPDATE units SET tour_url = 'https://kuula.co/share/collection/7dlM4?logo=-1&card=1&info=0&fs=1&vr=1&gyro=0&initload=0&thumbs=1&inst=es', updated_at = unixepoch() WHERE id = 'unit_1_102';
UPDATE units SET tour_url = 'https://kuula.co/share/collection/7dlMh?logo=-1&card=1&info=0&fs=1&vr=1&gyro=0&initload=0&thumbs=1&inst=es', updated_at = unixepoch() WHERE id = 'unit_2_201';
UPDATE units SET tour_url = 'https://kuula.co/share/collection/7dlMZ?logo=-1&card=1&info=0&fs=1&vr=1&gyro=0&initload=0&thumbs=1&inst=es', updated_at = unixepoch() WHERE id = 'unit_2_202';
UPDATE units SET tour_url = 'https://kuula.co/share/collection/7dlMP?logo=-1&card=1&info=0&fs=1&vr=1&gyro=0&initload=0&thumbs=1&inst=es', updated_at = unixepoch() WHERE id = 'unit_3_301';
UPDATE units SET tour_url = 'https://kuula.co/share/collection/7dlMD?logo=-1&card=1&info=0&fs=1&vr=1&gyro=0&initload=0&thumbs=1&inst=es', updated_at = unixepoch() WHERE id = 'unit_3_302';
UPDATE units SET tour_url = 'https://kuula.co/share/collection/7dlMF?logo=-1&card=1&info=0&fs=1&vr=1&gyro=0&initload=0&thumbs=1&inst=es', updated_at = unixepoch() WHERE id = 'unit_4_401';
UPDATE units SET tour_url = 'https://kuula.co/share/collection/7dlMH?logo=-1&card=1&info=0&fs=1&vr=1&gyro=0&initload=0&thumbs=1&inst=es', updated_at = unixepoch() WHERE id = 'unit_4_402';

-- Each duplex is one apartment across floors 5 and 6, so both of its unit rows
-- offer the same tour.
UPDATE units SET tour_url = 'https://kuula.co/share/collection/7dlMt?logo=-1&card=1&info=0&fs=1&vr=1&gyro=0&initload=0&thumbs=1&inst=es', updated_at = unixepoch() WHERE id IN ('unit_5_501', 'unit_6_601');
UPDATE units SET tour_url = 'https://kuula.co/share/collection/7dPKv?logo=-1&card=1&info=0&fs=1&vr=1&zoom=1&sd=1&thumbs=3&inst=es', updated_at = unixepoch() WHERE id IN ('unit_5_502', 'unit_6_602');

DELETE FROM tours WHERE id = 'building-main' OR id LIKE 'tour-%';

INSERT INTO tours (id, title, subtitle, thumbnail_url, type, target_url, unit_id, is_active, "order") VALUES
  ('building-main', 'Recorrido General', 'Áreas comunes', 'building/photos/1.1.webp', 'building', 'https://kuula.co/share/collection/7dhMt?logo=-1&card=1&info=0&fs=1&vr=1&zoom=1&sd=1&thumbs=3&inst=es', NULL, 1, 0),
  ('tour-101', 'Unidad 101', 'Flat', 'plants/details/101/gallery/1.webp', 'unit', 'https://kuula.co/share/collection/7dlHt?logo=-1&card=1&info=0&fs=1&vr=1&gyro=0&initload=0&thumbs=1&inst=es', 'unit_1_101', 1, 1),
  ('tour-102', 'Unidad 102', 'Flat', 'plants/details/102/gallery/1.webp', 'unit', 'https://kuula.co/share/collection/7dlM4?logo=-1&card=1&info=0&fs=1&vr=1&gyro=0&initload=0&thumbs=1&inst=es', 'unit_1_102', 1, 2),
  ('tour-201', 'Unidad 201', 'Flat', 'plants/details/x01/gallery/1.webp', 'unit', 'https://kuula.co/share/collection/7dlMh?logo=-1&card=1&info=0&fs=1&vr=1&gyro=0&initload=0&thumbs=1&inst=es', 'unit_2_201', 1, 3),
  ('tour-202', 'Unidad 202', 'Flat', 'plants/details/x02/gallery/1.webp', 'unit', 'https://kuula.co/share/collection/7dlMZ?logo=-1&card=1&info=0&fs=1&vr=1&gyro=0&initload=0&thumbs=1&inst=es', 'unit_2_202', 1, 4),
  ('tour-301', 'Unidad 301', 'Flat', 'plants/details/x01/gallery/1.webp', 'unit', 'https://kuula.co/share/collection/7dlMP?logo=-1&card=1&info=0&fs=1&vr=1&gyro=0&initload=0&thumbs=1&inst=es', 'unit_3_301', 1, 5),
  ('tour-302', 'Unidad 302', 'Flat', 'plants/details/x02/gallery/1.webp', 'unit', 'https://kuula.co/share/collection/7dlMD?logo=-1&card=1&info=0&fs=1&vr=1&gyro=0&initload=0&thumbs=1&inst=es', 'unit_3_302', 1, 6),
  ('tour-401', 'Unidad 401', 'Flat', 'plants/details/x01/gallery/1.webp', 'unit', 'https://kuula.co/share/collection/7dlMF?logo=-1&card=1&info=0&fs=1&vr=1&gyro=0&initload=0&thumbs=1&inst=es', 'unit_4_401', 1, 7),
  ('tour-402', 'Unidad 402', 'Flat', 'plants/details/x02/gallery/1.webp', 'unit', 'https://kuula.co/share/collection/7dlMH?logo=-1&card=1&info=0&fs=1&vr=1&gyro=0&initload=0&thumbs=1&inst=es', 'unit_4_402', 1, 8),
  ('tour-501', 'Unidad 501', 'Dúplex', 'plants/details/501/gallery/1.webp', 'unit', 'https://kuula.co/share/collection/7dlMt?logo=-1&card=1&info=0&fs=1&vr=1&gyro=0&initload=0&thumbs=1&inst=es', 'unit_5_501', 1, 9),
  ('tour-503', 'Unidad 503', 'Dúplex', 'plants/details/502/gallery/1.webp', 'unit', 'https://kuula.co/share/collection/7dPKv?logo=-1&card=1&info=0&fs=1&vr=1&zoom=1&sd=1&thumbs=3&inst=es', 'unit_5_502', 1, 10);
