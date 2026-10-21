-- Exchange content between floor 1 apartments while preserving numbering,
-- coordinates, specifications, commercial state and stable IDs.
-- Absolute assignments allow safe repeated execution.
UPDATE units SET tour_url = 'https://kuula.co/share/collection/7dlM4?logo=-1&card=1&info=0&fs=1&vr=1&gyro=0&initload=0&thumbs=1&inst=es', photos_furnished = '["plants/details/102/furnished.webp"]', photos_unfurnished = '["plants/details/102/unfurnished.webp"]', photos_plans = '["plants/details/102/plans.webp"]', photos_balcony = NULL, gallery = '["plants/details/102/gallery/1.webp","plants/details/102/gallery/2.webp","plants/details/102/gallery/3.webp","plants/details/102/gallery/4.webp","plants/details/102/gallery/5.webp","plants/details/102/gallery/6.webp","plants/details/102/gallery/7.webp","plants/details/102/gallery/8.webp","plants/details/102/gallery/9.webp","plants/details/102/gallery/10.webp","plants/details/102/gallery/11.webp","plants/details/102/gallery/12.webp"]', renders = NULL, updated_at = unixepoch() WHERE id = 'unit_1_101' AND floor_id = 'floor_1' AND deleted_at IS NULL;
UPDATE units SET tour_url = 'https://kuula.co/share/collection/7dlHt?logo=-1&card=1&info=0&fs=1&vr=1&gyro=0&initload=0&thumbs=1&inst=es', photos_furnished = '["plants/details/101/furnished.webp"]', photos_unfurnished = '["plants/details/101/unfurnished.webp"]', photos_plans = '["plants/details/101/plans.webp"]', photos_balcony = NULL, gallery = '["plants/details/101/gallery/1.webp","plants/details/101/gallery/2.webp","plants/details/101/gallery/3.webp","plants/details/101/gallery/4.webp","plants/details/101/gallery/5.webp","plants/details/101/gallery/6.webp","plants/details/101/gallery/7.webp","plants/details/101/gallery/8.webp","plants/details/101/gallery/9.webp","plants/details/101/gallery/10.webp","plants/details/101/gallery/11.webp"]', renders = NULL, updated_at = unixepoch() WHERE id = 'unit_1_102' AND floor_id = 'floor_1' AND deleted_at IS NULL;
UPDATE tours
SET target_url = (SELECT tour_url FROM units WHERE units.id = tours.unit_id),
    thumbnail_url = (SELECT json_extract(gallery, '$[0]') FROM units WHERE units.id = tours.unit_id)
WHERE deleted_at IS NULL AND unit_id IN (
  SELECT id FROM units WHERE id IN ('unit_1_101', 'unit_1_102')
    AND floor_id = 'floor_1' AND deleted_at IS NULL
);
