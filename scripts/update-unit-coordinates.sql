-- Update unit polygon coordinates, bedrooms, bathrooms, area_sqm, and identifiers
-- for Residencial Mar de Java (Floors 1 to 6), and upsert Duplex 203 & Duplex 403.

-- Piso 1
UPDATE units SET identifier = '101', bedrooms = 3, bathrooms = 2.5, area_sqm = 110.89, coordinates = '{"x":62.3,"y":46.81,"path":"M 65.3 13.0 L 79.2 13.0 L 81.8 81.8 L 58.5 84.3 L 58.3 56.8 L 54.7 56.8 L 54.7 50.2 L 52.5 50.2 L 52.5 31.0 L 65.5 31.0 Z"}', updated_at = unixepoch() WHERE id = 'unit_1_101';
UPDATE units SET identifier = '102', bedrooms = 3, bathrooms = 2.5, area_sqm = 108.06, coordinates = '{"x":32.7,"y":58.67,"path":"M 13.5 26.2 L 43.5 26.2 L 43.5 55.6 L 49.5 55.6 L 49.5 70.5 L 48.6 70.5 L 48.6 86.2 L 20.7 89.2 L 21.2 74.8 L 19.6 74.8 L 21.2 37.2 L 13.0 37.2 Z"}', updated_at = unixepoch() WHERE id = 'unit_1_102';

-- Piso 2
UPDATE units SET identifier = '201', bedrooms = 3, bathrooms = 2.5, area_sqm = 116.28, coordinates = '{"x":64.71,"y":44.88,"path":"M 65.3 13.2 L 79.2 13.2 L 81.0 68.0 L 75.3 68.0 L 75.3 70.3 L 64.3 71.2 L 64.0 50.8 L 52.5 50.8 L 52.5 38.0 L 50.8 38.0 L 50.8 28.5 L 65.5 28.5 Z"}', updated_at = unixepoch() WHERE id = 'unit_2_201';
UPDATE units SET identifier = '202', bedrooms = 3, bathrooms = 2.5, area_sqm = 102.1, coordinates = '{"x":34.99,"y":47.01,"path":"M 21.2 13.2 L 50.8 13.2 L 50.8 25.8 L 43.5 25.8 L 43.5 44.8 L 34.5 44.8 L 34.2 76.5 L 25.7 77.3 L 25.5 74.2 L 20.2 74.5 Z"}', updated_at = unixepoch() WHERE id = 'unit_2_202';
INSERT INTO units (id, floor_id, identifier, type, bedrooms, bathrooms, area_sqm, coordinates, state, tour_url, photos_furnished, photos_unfurnished, photos_plans, gallery)
VALUES ('unit_2_203', 'floor_2', '203', 'DUPLEX', 2, 2.5, 114.87, '{"x":47.8,"y":56.26,"path":"M 34.5 44.8 L 43.5 44.8 L 43.5 55.6 L 49.2 55.6 L 49.2 50.8 L 64.0 50.8 L 64.3 71.2 L 34.2 76.5 Z"}', 'AVAILABLE', NULL, '["plants/details/203.1/furnished.webp"]', '["plants/details/203.1/unfurnished.webp"]', '["plants/details/203.1/plans.webp"]', '["plants/details/203/gallery/1.webp","plants/details/203/gallery/2.webp","plants/details/203/gallery/3.webp","plants/details/203/gallery/4.webp","plants/details/203/gallery/5.webp","plants/details/203/gallery/6.webp","plants/details/203/gallery/7.webp","plants/details/203/gallery/8.webp","plants/details/203/gallery/9.webp","plants/details/203/gallery/10.webp"]')
ON CONFLICT(id) DO UPDATE SET
  floor_id = excluded.floor_id,
  identifier = excluded.identifier,
  type = excluded.type,
  bedrooms = excluded.bedrooms,
  bathrooms = excluded.bathrooms,
  area_sqm = excluded.area_sqm,
  coordinates = excluded.coordinates,
  photos_furnished = excluded.photos_furnished,
  photos_unfurnished = excluded.photos_unfurnished,
  photos_plans = excluded.photos_plans,
  gallery = excluded.gallery,
  deleted_at = NULL,
  updated_at = unixepoch();

-- Piso 3
UPDATE units SET identifier = '301', bedrooms = 3, bathrooms = 2.5, area_sqm = 116.28, coordinates = '{"x":64.71,"y":44.77,"path":"M 65.3 13.2 L 79.2 13.2 L 81.0 68.0 L 75.3 68.0 L 75.3 70.3 L 64.3 71.2 L 64.0 50.2 L 52.5 50.2 L 52.5 38.0 L 50.8 38.0 L 50.8 28.5 L 65.5 28.5 Z"}', updated_at = unixepoch() WHERE id = 'unit_3_301';
UPDATE units SET identifier = '302', bedrooms = 3, bathrooms = 2.5, area_sqm = 101.31, coordinates = '{"x":34.99,"y":47.01,"path":"M 21.2 13.2 L 50.8 13.2 L 50.8 25.8 L 43.5 25.8 L 43.5 44.8 L 34.5 44.8 L 34.2 76.5 L 25.7 77.3 L 25.5 74.2 L 20.2 74.5 Z"}', updated_at = unixepoch() WHERE id = 'unit_3_302';
INSERT INTO units (id, floor_id, identifier, type, bedrooms, bathrooms, area_sqm, coordinates, state, tour_url, photos_furnished, photos_unfurnished, photos_plans, gallery)
VALUES ('unit_3_303', 'floor_3', '203', 'DUPLEX', 2, 2.5, 114.87, '{"x":47.7,"y":56.11,"path":"M 34.5 44.8 L 43.5 44.8 L 43.5 55.6 L 48.8 55.6 L 48.8 50.2 L 64.0 50.2 L 64.3 71.2 L 34.2 76.5 Z"}', 'AVAILABLE', NULL, '["plants/details/203.2/furnished.webp"]', '["plants/details/203.2/unfurnished.webp"]', '["plants/details/203.2/plans.webp"]', '["plants/details/203/gallery/1.webp","plants/details/203/gallery/2.webp","plants/details/203/gallery/3.webp","plants/details/203/gallery/4.webp","plants/details/203/gallery/5.webp","plants/details/203/gallery/6.webp","plants/details/203/gallery/7.webp","plants/details/203/gallery/8.webp","plants/details/203/gallery/9.webp","plants/details/203/gallery/10.webp"]')
ON CONFLICT(id) DO UPDATE SET
  floor_id = excluded.floor_id,
  identifier = excluded.identifier,
  type = excluded.type,
  bedrooms = excluded.bedrooms,
  bathrooms = excluded.bathrooms,
  area_sqm = excluded.area_sqm,
  coordinates = excluded.coordinates,
  photos_furnished = excluded.photos_furnished,
  photos_unfurnished = excluded.photos_unfurnished,
  photos_plans = excluded.photos_plans,
  gallery = excluded.gallery,
  deleted_at = NULL,
  updated_at = unixepoch();

-- Piso 4
UPDATE units SET identifier = '401', bedrooms = 3, bathrooms = 2.5, area_sqm = 116.28, coordinates = '{"x":64.38,"y":45.32,"path":"M 65.3 13.2 L 79.2 13.2 L 81.0 68.0 L 75.3 68.0 L 75.3 70.3 L 62.3 71.2 L 62.0 53.5 L 52.5 53.5 L 52.5 38.0 L 50.8 38.0 L 50.8 28.5 L 65.5 28.5 Z"}', updated_at = unixepoch() WHERE id = 'unit_4_401';
UPDATE units SET identifier = '402', bedrooms = 3, bathrooms = 2.5, area_sqm = 108.22, coordinates = '{"x":34.99,"y":47.01,"path":"M 21.2 13.2 L 50.8 13.2 L 50.8 25.8 L 43.5 25.8 L 43.5 44.8 L 34.5 44.8 L 34.2 76.5 L 25.7 77.3 L 25.5 74.2 L 20.2 74.5 Z"}', updated_at = unixepoch() WHERE id = 'unit_4_402';
INSERT INTO units (id, floor_id, identifier, type, bedrooms, bathrooms, area_sqm, coordinates, state, tour_url, photos_furnished, photos_unfurnished, photos_plans, gallery)
VALUES ('unit_4_403', 'floor_4', '403', 'DUPLEX', 3, 2.5, 104.52, '{"x":47.3,"y":56.94,"path":"M 34.5 44.8 L 43.5 44.8 L 43.5 55.6 L 49.2 55.6 L 49.2 53.5 L 62.0 53.5 L 62.3 71.2 L 34.2 76.5 Z"}', 'AVAILABLE', NULL, '["plants/details/403.1/furnished.webp"]', '["plants/details/403.1/unfurnished.webp"]', '["plants/details/403.1/plans.webp"]', '["plants/details/403/gallery/1.webp","plants/details/403/gallery/2.webp","plants/details/403/gallery/3.webp","plants/details/403/gallery/4.webp","plants/details/403/gallery/5.webp","plants/details/403/gallery/6.webp","plants/details/403/gallery/7.webp","plants/details/403/gallery/8.webp","plants/details/403/gallery/9.webp","plants/details/403/gallery/10.webp"]')
ON CONFLICT(id) DO UPDATE SET
  floor_id = excluded.floor_id,
  identifier = excluded.identifier,
  type = excluded.type,
  bedrooms = excluded.bedrooms,
  bathrooms = excluded.bathrooms,
  area_sqm = excluded.area_sqm,
  coordinates = excluded.coordinates,
  photos_furnished = excluded.photos_furnished,
  photos_unfurnished = excluded.photos_unfurnished,
  photos_plans = excluded.photos_plans,
  gallery = excluded.gallery,
  deleted_at = NULL,
  updated_at = unixepoch();

-- Piso 5
UPDATE units SET identifier = '501', bedrooms = 3, bathrooms = 4, area_sqm = 113.98, coordinates = '{"x":34.48,"y":43.56,"path":"M 21.2 13.2 L 50.8 13.2 L 50.8 25.8 L 43.5 25.8 L 43.5 44.5 L 30.2 44.5 L 30.2 59.8 L 27.2 59.8 L 27.2 74.5 L 20.2 74.5 Z"}', updated_at = unixepoch() WHERE id = 'unit_5_501';
INSERT INTO units (id, floor_id, identifier, type, bedrooms, bathrooms, area_sqm, coordinates, state, tour_url, photos_furnished, photos_unfurnished, photos_plans, gallery)
VALUES ('unit_5_403', 'floor_5', '403', 'DUPLEX', 3, 2.5, 104.52, '{"x":42.37,"y":57.52,"path":"M 30.2 44.5 L 43.5 44.5 L 43.5 55.6 L 48.8 55.6 L 48.8 53.5 L 62.0 53.5 L 62.3 71.2 L 27.2 77.2 L 27.2 59.8 L 30.2 59.8 Z"}', 'AVAILABLE', NULL, '["plants/details/403.2/furnished.webp"]', '["plants/details/403.2/unfurnished.webp"]', '["plants/details/403.2/plans.webp"]', '["plants/details/403/gallery/1.webp","plants/details/403/gallery/2.webp","plants/details/403/gallery/3.webp","plants/details/403/gallery/4.webp","plants/details/403/gallery/5.webp","plants/details/403/gallery/6.webp","plants/details/403/gallery/7.webp","plants/details/403/gallery/8.webp","plants/details/403/gallery/9.webp","plants/details/403/gallery/10.webp"]')
ON CONFLICT(id) DO UPDATE SET
  floor_id = excluded.floor_id,
  identifier = excluded.identifier,
  type = excluded.type,
  bedrooms = excluded.bedrooms,
  bathrooms = excluded.bathrooms,
  area_sqm = excluded.area_sqm,
  coordinates = excluded.coordinates,
  photos_furnished = excluded.photos_furnished,
  photos_unfurnished = excluded.photos_unfurnished,
  photos_plans = excluded.photos_plans,
  gallery = excluded.gallery,
  deleted_at = NULL,
  updated_at = unixepoch();
UPDATE units SET identifier = '503', bedrooms = 3, bathrooms = 4, area_sqm = 116.88, coordinates = '{"x":64.38,"y":45.32,"path":"M 65.3 13.2 L 79.2 13.2 L 81.0 68.0 L 75.3 68.0 L 75.3 70.3 L 62.3 71.2 L 62.0 53.5 L 52.5 53.5 L 52.5 38.0 L 50.8 38.0 L 50.8 28.5 L 65.5 28.5 Z"}', updated_at = unixepoch() WHERE id = 'unit_5_502';

-- Piso 6
UPDATE units SET identifier = '501', bedrooms = 3, bathrooms = 4, area_sqm = 113.98, coordinates = '{"x":37.95,"y":45.67,"path":"M 21.2 13.2 L 48.5 13.2 L 48.5 25.8 L 43.5 25.8 L 43.5 55.6 L 48.8 55.6 L 48.8 58.0 L 56.5 58.0 L 56.5 73.5 L 19.5 77.5 L 20.0 55.0 L 20.6 35.0 Z"}', updated_at = unixepoch() WHERE id = 'unit_6_601';
UPDATE units SET identifier = '503', bedrooms = 3, bathrooms = 4, area_sqm = 116.88, coordinates = '{"x":61.43,"y":42.38,"path":"M 68.2 13.2 L 79.2 13.2 L 80.8 69.5 L 56.5 73.5 L 56.5 58.0 L 51.5 58.0 L 51.5 38.0 L 50.8 38.0 L 50.8 31.2 L 68.5 31.2 Z"}', updated_at = unixepoch() WHERE id = 'unit_6_602';
