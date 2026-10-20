-- Restore the original 202 visual typology for 202, 402 and 502.
-- Coordinates, specifications, availability and unit-specific 360 tours are preserved.
UPDATE units SET
  photos_furnished = '["plants/details/x02/furnished.webp"]',
  photos_unfurnished = '["plants/details/x02/unfurnished.webp"]',
  photos_plans = '["plants/details/x02/plans.webp"]',
  gallery = '["plants/details/x02/gallery/1.webp","plants/details/x02/gallery/2.webp","plants/details/x02/gallery/3.webp","plants/details/x02/gallery/4.webp","plants/details/x02/gallery/5.webp","plants/details/x02/gallery/6.webp","plants/details/x02/gallery/7.webp","plants/details/x02/gallery/8.webp","plants/details/x02/gallery/9.webp","plants/details/x02/gallery/10.webp"]',
  updated_at = unixepoch()
WHERE id IN ('unit_2_202', 'unit_4_402', 'unit_5_502');

UPDATE tours SET thumbnail_url = 'plants/details/x02/gallery/1.webp'
WHERE unit_id IN ('unit_2_202', 'unit_4_402', 'unit_5_502');
