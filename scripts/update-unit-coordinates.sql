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
UPDATE units SET identifier = '501', bedrooms = 3, bathrooms = 4, area_sqm = 113.98, coordinates = '{"x":34.26,"y":50.84,"path":"M 26.84 73.62 L 21.59 73.81 L 21.64 79.13 L 18.96 79.97 L 21.17 13.77 L 50.74 13.49 L 50.74 25.44 L 43.33 25.91 L 43.12 48.04 L 39.34 48.23 L 39.34 55.42 L 37.66 55.7 L 37.5 59.52 L 27.63 59.71 Z"}', updated_at = unixepoch() WHERE id = 'unit_5_501';
INSERT INTO units (id, floor_id, identifier, type, bedrooms, bathrooms, area_sqm, coordinates, state, tour_url, photos_furnished, photos_unfurnished, photos_plans, gallery)
VALUES ('unit_5_403', 'floor_5', '403', 'DUPLEX', 3, 2.5, 104.52, '{"x":43.39,"y":61.59,"path":"M 23.84 77.64 L 23.74 74 L 27.36 74.46 L 27.73 59.71 L 37.92 59.9 L 38.08 56.16 L 39.39 55.79 L 39.39 48.32 L 43.12 48.51 L 43.28 55.6 L 48.32 55.79 L 48.48 53.92 L 62.18 53.64 L 62.34 57.28 L 62.03 69.14 L 61.66 73.06 L 48.69 74.09 Z"}', 'AVAILABLE', NULL, '["plants/details/403.2/furnished.webp"]', '["plants/details/403.2/unfurnished.webp"]', '["plants/details/403.2/plans.webp"]', '["plants/details/403/gallery/1.webp","plants/details/403/gallery/2.webp","plants/details/403/gallery/3.webp","plants/details/403/gallery/4.webp","plants/details/403/gallery/5.webp","plants/details/403/gallery/6.webp","plants/details/403/gallery/7.webp","plants/details/403/gallery/8.webp","plants/details/403/gallery/9.webp","plants/details/403/gallery/10.webp"]')
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
UPDATE units SET identifier = '501', bedrooms = 3, bathrooms = 4, area_sqm = 113.98, coordinates = '{"x":36.49,"y":40.77,"path":"M 27.84 75.86 L 19.54 77.26 L 22.16 15.73 L 48.06 13.96 L 47.9 25.54 L 42.33 25.72 L 42.23 27.78 L 43.59 27.5 L 42.96 59.15 L 28.31 59.24 Z"}', updated_at = unixepoch() WHERE id = 'unit_6_601';
UPDATE units SET identifier = '503', bedrooms = 3, bathrooms = 4, area_sqm = 116.88, coordinates = '{"x":61.43,"y":42.38,"path":"M 68.2 13.2 L 79.2 13.2 L 80.8 69.5 L 56.5 73.5 L 56.5 58.0 L 51.5 58.0 L 51.5 38.0 L 50.8 38.0 L 50.8 31.2 L 68.5 31.2 Z"}', updated_at = unixepoch() WHERE id = 'unit_6_602';

-- Sótano 1 (Estacionamientos 3 al 12)
INSERT INTO units (id, floor_id, identifier, type, bedrooms, bathrooms, area_sqm, coordinates, state)
VALUES ('unit_S1_3', 'floor_S1', '3', 'STORAGE', NULL, NULL, NULL, '{"x":72.99,"y":44.14,"path":"M 79.2 38.33 L 79.73 49.91 L 66.81 50.19 L 66.23 38.14 Z"}', 'AVAILABLE')
ON CONFLICT(id) DO UPDATE SET coordinates = excluded.coordinates, updated_at = unixepoch();

INSERT INTO units (id, floor_id, identifier, type, bedrooms, bathrooms, area_sqm, coordinates, state)
VALUES ('unit_S1_4', 'floor_S1', '4', 'STORAGE', NULL, NULL, NULL, '{"x":73.3,"y":55.63,"path":"M 80 60.93 L 79.58 50.09 L 66.67 50.28 L 66.93 61.2 Z"}', 'AVAILABLE')
ON CONFLICT(id) DO UPDATE SET coordinates = excluded.coordinates, updated_at = unixepoch();

INSERT INTO units (id, floor_id, identifier, type, bedrooms, bathrooms, area_sqm, coordinates, state)
VALUES ('unit_S1_5', 'floor_S1', '5', 'STORAGE', NULL, NULL, NULL, '{"x":73.54,"y":67.46,"path":"M 67.14 73.52 L 66.67 61.67 L 79.81 61.55 L 80.54 73.09 Z"}', 'AVAILABLE')
ON CONFLICT(id) DO UPDATE SET coordinates = excluded.coordinates, updated_at = unixepoch();

INSERT INTO units (id, floor_id, identifier, type, bedrooms, bathrooms, area_sqm, coordinates, state)
VALUES ('unit_S1_6', 'floor_S1', '6', 'STORAGE', NULL, NULL, NULL, '{"x":73.94,"y":77.77,"path":"M 80.46 73.16 L 67.19 73.67 L 67.39 83.28 L 80.74 80.98 Z"}', 'AVAILABLE')
ON CONFLICT(id) DO UPDATE SET coordinates = excluded.coordinates, updated_at = unixepoch();

INSERT INTO units (id, floor_id, identifier, type, bedrooms, bathrooms, area_sqm, coordinates, state)
VALUES ('unit_S1_7', 'floor_S1', '7', 'STORAGE', NULL, NULL, NULL, '{"x":19.33,"y":85.41,"path":"M 26.46 81.04 L 12.78 80.86 L 12.01 90.83 L 26.06 88.91 Z"}', 'AVAILABLE')
ON CONFLICT(id) DO UPDATE SET coordinates = excluded.coordinates, updated_at = unixepoch();

INSERT INTO units (id, floor_id, identifier, type, bedrooms, bathrooms, area_sqm, coordinates, state)
VALUES ('unit_S1_8', 'floor_S1', '8', 'STORAGE', NULL, NULL, NULL, '{"x":19.67,"y":75.11,"path":"M 26.12 80.2 L 26.53 69.57 L 13.29 69.99 L 12.75 80.68 Z"}', 'AVAILABLE')
ON CONFLICT(id) DO UPDATE SET coordinates = excluded.coordinates, updated_at = unixepoch();

INSERT INTO units (id, floor_id, identifier, type, bedrooms, bathrooms, area_sqm, coordinates, state)
VALUES ('unit_S1_9', 'floor_S1', '9', 'STORAGE', NULL, NULL, NULL, '{"x":20.13,"y":64.89,"path":"M 26.6 69.75 L 26.87 60.03 L 13.8 59.79 L 13.26 69.99 Z"}', 'AVAILABLE')
ON CONFLICT(id) DO UPDATE SET coordinates = excluded.coordinates, updated_at = unixepoch();

INSERT INTO units (id, floor_id, identifier, type, bedrooms, bathrooms, area_sqm, coordinates, state)
VALUES ('unit_S1_10', 'floor_S1', '10', 'STORAGE', NULL, NULL, NULL, '{"x":20.63,"y":54.87,"path":"M 27 59.85 L 27.34 49.88 L 14.37 49.76 L 13.8 59.97 Z"}', 'AVAILABLE')
ON CONFLICT(id) DO UPDATE SET coordinates = excluded.coordinates, updated_at = unixepoch();

INSERT INTO units (id, floor_id, identifier, type, bedrooms, bathrooms, area_sqm, coordinates, state)
VALUES ('unit_S1_11', 'floor_S1', '11', 'STORAGE', NULL, NULL, NULL, '{"x":20.53,"y":41.39,"path":"M 27.41 49.4 L 27.64 38.47 L 19.1 38.47 L 18.79 36.19 L 15.38 36.13 L 14.88 49.7 Z"}', 'AVAILABLE')
ON CONFLICT(id) DO UPDATE SET coordinates = excluded.coordinates, updated_at = unixepoch();

INSERT INTO units (id, floor_id, identifier, type, bedrooms, bathrooms, area_sqm, coordinates, state)
VALUES ('unit_S1_12', 'floor_S1', '12', 'STORAGE', NULL, NULL, NULL, '{"x":22.14,"y":28.07,"path":"M 27.81 33.07 L 28.05 26.64 L 24.87 26.64 L 24.97 22.68 L 16.23 22.74 L 15.82 29.65 L 19.33 30.25 L 20.01 32.89 Z"}', 'AVAILABLE')
ON CONFLICT(id) DO UPDATE SET coordinates = excluded.coordinates, updated_at = unixepoch();
