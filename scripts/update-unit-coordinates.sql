-- Update unit polygon coordinates, bedrooms, bathrooms, area_sqm, and identifiers
-- for Residencial Mar de Java (Floors 1 to 6), and upsert Duplex 203 & Duplex 403.

-- Piso 1
UPDATE units SET identifier = '102', bedrooms = 3, bathrooms = 2.5, area_sqm = 108.06, coordinates = '{"x":33.06,"y":58.65,"path":"M 48.58 85.39 L 21.43 89.68 L 21.95 73.44 L 19.75 73.62 L 21.11 37.3 L 13.55 36.65 L 14.18 26.84 L 43.07 26.66 L 42.91 56.26 L 50.89 56.63 L 50.89 70.54 L 48.42 70.73 Z"}', updated_at = unixepoch() WHERE id = 'unit_1_101';
UPDATE units SET identifier = '101', bedrooms = 3, bathrooms = 2.5, area_sqm = 110.89, coordinates = '{"x":62.3,"y":46.81,"path":"M 65.3 13.0 L 79.2 13.0 L 81.8 81.8 L 58.5 84.3 L 58.3 56.8 L 54.7 56.8 L 54.7 50.2 L 52.5 50.2 L 52.5 31.0 L 65.5 31.0 Z"}', updated_at = unixepoch() WHERE id = 'unit_1_102';
INSERT INTO units (id, floor_id, identifier, type, bedrooms, bathrooms, area_sqm, coordinates, state)
VALUES ('unit_1_1', 'floor_1', '1', 'STORAGE', NULL, NULL, NULL, '{"x":16.99,"y":50.02,"path":"M 20.12 57.94 L 13.24 57.94 L 14.13 41.97 L 20.48 42.25 Z"}', 'AVAILABLE')
ON CONFLICT(id) DO UPDATE SET coordinates = excluded.coordinates, updated_at = unixepoch();
INSERT INTO units (id, floor_id, identifier, type, bedrooms, bathrooms, area_sqm, coordinates, state)
VALUES ('unit_1_2', 'floor_1', '2', 'STORAGE', NULL, NULL, NULL, '{"x":16.34,"y":70.54,"path":"M 20.01 78.48 L 19.96 62.32 L 13.29 62.14 L 12.08 79.23 Z"}', 'AVAILABLE')
ON CONFLICT(id) DO UPDATE SET coordinates = excluded.coordinates, updated_at = unixepoch();

-- Piso 2
UPDATE units SET identifier = '201', bedrooms = 3, bathrooms = 2.5, area_sqm = 116.28, coordinates = '{"x":64.71,"y":44.88,"path":"M 65.3 13.2 L 79.2 13.2 L 81.0 68.0 L 75.3 68.0 L 75.3 70.3 L 64.3 71.2 L 64.0 50.8 L 52.5 50.8 L 52.5 38.0 L 50.8 38.0 L 50.8 28.5 L 65.5 28.5 Z"}', updated_at = unixepoch() WHERE id = 'unit_2_201';
UPDATE units SET identifier = '202', bedrooms = 3, bathrooms = 2.5, area_sqm = 102.1, coordinates = '{"x":34.99,"y":47.01,"path":"M 21.2 13.2 L 50.8 13.2 L 50.8 25.8 L 43.5 25.8 L 43.5 44.8 L 34.5 44.8 L 34.2 76.5 L 25.7 77.3 L 25.5 74.2 L 20.2 74.5 Z"}', updated_at = unixepoch() WHERE id = 'unit_2_202';
INSERT INTO units (id, floor_id, identifier, type, bedrooms, bathrooms, area_sqm, coordinates, state, tour_url, photos_furnished, photos_unfurnished, photos_plans, gallery)
VALUES ('unit_2_203', 'floor_2', '203', 'DUPLEX', 2, 2.5, 114.87, '{"x":47.8,"y":56.26,"path":"M 34.5 44.8 L 43.5 44.8 L 43.5 55.6 L 49.2 55.6 L 49.2 50.8 L 64.0 50.8 L 64.3 71.2 L 34.2 76.5 Z"}', 'AVAILABLE', 'https://kuula.co/share/collection/7dlMd?logo=-1&card=1&info=0&fs=1&vr=1&gyro=0&initload=0&thumbs=1&inst=es', '["plants/details/203.1/furnished.webp"]', '["plants/details/203.1/unfurnished.webp"]', '["plants/details/203.1/plans.webp"]', '["plants/details/203/gallery/1.webp","plants/details/203/gallery/2.webp","plants/details/203/gallery/3.webp","plants/details/203/gallery/4.webp","plants/details/203/gallery/5.webp","plants/details/203/gallery/6.webp","plants/details/203/gallery/7.webp","plants/details/203/gallery/8.webp","plants/details/203/gallery/9.webp","plants/details/203/gallery/10.webp"]')
ON CONFLICT(id) DO UPDATE SET
  floor_id = excluded.floor_id,
  identifier = excluded.identifier,
  type = excluded.type,
  bedrooms = excluded.bedrooms,
  bathrooms = excluded.bathrooms,
  area_sqm = excluded.area_sqm,
  coordinates = excluded.coordinates,
  tour_url = excluded.tour_url,
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
VALUES ('unit_3_303', 'floor_3', '203', 'DUPLEX', 2, 2.5, 114.87, '{"x":47.7,"y":56.11,"path":"M 34.5 44.8 L 43.5 44.8 L 43.5 55.6 L 48.8 55.6 L 48.8 50.2 L 64.0 50.2 L 64.3 71.2 L 34.2 76.5 Z"}', 'AVAILABLE', 'https://kuula.co/share/collection/7dlMd?logo=-1&card=1&info=0&fs=1&vr=1&gyro=0&initload=0&thumbs=1&inst=es', '["plants/details/203.2/furnished.webp"]', '["plants/details/203.2/unfurnished.webp"]', '["plants/details/203.2/plans.webp"]', '["plants/details/203/gallery/1.webp","plants/details/203/gallery/2.webp","plants/details/203/gallery/3.webp","plants/details/203/gallery/4.webp","plants/details/203/gallery/5.webp","plants/details/203/gallery/6.webp","plants/details/203/gallery/7.webp","plants/details/203/gallery/8.webp","plants/details/203/gallery/9.webp","plants/details/203/gallery/10.webp"]')
ON CONFLICT(id) DO UPDATE SET
  floor_id = excluded.floor_id,
  identifier = excluded.identifier,
  type = excluded.type,
  bedrooms = excluded.bedrooms,
  bathrooms = excluded.bathrooms,
  area_sqm = excluded.area_sqm,
  coordinates = excluded.coordinates,
  tour_url = excluded.tour_url,
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
VALUES ('unit_4_403', 'floor_4', '403', 'DUPLEX', 3, 2.5, 104.52, '{"x":47.3,"y":56.94,"path":"M 34.5 44.8 L 43.5 44.8 L 43.5 55.6 L 49.2 55.6 L 49.2 53.5 L 62.0 53.5 L 62.3 71.2 L 34.2 76.5 Z"}', 'AVAILABLE', 'https://kuula.co/share/collection/7dlM3?logo=-1&card=1&info=0&fs=1&vr=1&gyro=0&initload=0&thumbs=1&inst=es', '["plants/details/403.1/furnished.webp"]', '["plants/details/403.1/unfurnished.webp"]', '["plants/details/403.1/plans.webp"]', '["plants/details/403/gallery/1.webp","plants/details/403/gallery/2.webp","plants/details/403/gallery/3.webp","plants/details/403/gallery/4.webp","plants/details/403/gallery/5.webp","plants/details/403/gallery/6.webp","plants/details/403/gallery/7.webp","plants/details/403/gallery/8.webp","plants/details/403/gallery/9.webp","plants/details/403/gallery/10.webp"]')
ON CONFLICT(id) DO UPDATE SET
  floor_id = excluded.floor_id,
  identifier = excluded.identifier,
  type = excluded.type,
  bedrooms = excluded.bedrooms,
  bathrooms = excluded.bathrooms,
  area_sqm = excluded.area_sqm,
  coordinates = excluded.coordinates,
  tour_url = excluded.tour_url,
  photos_furnished = excluded.photos_furnished,
  photos_unfurnished = excluded.photos_unfurnished,
  photos_plans = excluded.photos_plans,
  gallery = excluded.gallery,
  deleted_at = NULL,
  updated_at = unixepoch();

-- Piso 5
UPDATE units SET identifier = '501', bedrooms = 3, bathrooms = 4, area_sqm = 113.98, coordinates = '{"x":36.01,"y":25.43,"path":"M 43.33 47.95 L 39.55 48.04 L 39.23 44.77 L 35.98 44.68 L 36.29 30.58 L 27 30.58 L 26.89 31.61 L 20.69 31.89 L 21.69 14.43 L 50.63 13.87 L 50.68 26.19 L 43.28 25.91 Z"}', updated_at = unixepoch() WHERE id = 'unit_5_501';

INSERT INTO units (id, floor_id, identifier, type, bedrooms, bathrooms, area_sqm, coordinates, state, tour_url, photos_furnished, photos_unfurnished, photos_plans, gallery)
VALUES ('unit_5_403', 'floor_5', '403', 'DUPLEX', 3, 2.5, 104.52, '{"x":27.61,"y":51.13,"path":"M 39.05 55.76 L 39.25 45.17 L 35.69 44.95 L 35.97 30.81 L 27.09 30.74 L 27.01 32.16 L 20.57 31.95 L 18.84 79.89 L 23.48 78.3 L 23.86 74.07 L 26.93 74.52 L 27.48 59.76 L 37.66 59.91 Z"}', 'AVAILABLE', 'https://kuula.co/share/collection/7dlM3?logo=-1&card=1&info=0&fs=1&vr=1&gyro=0&initload=0&thumbs=1&inst=es', '["plants/details/403.2/furnished.webp"]', '["plants/details/403.2/unfurnished.webp"]', '["plants/details/403.2/plans.webp"]', '["plants/details/403/gallery/1.webp","plants/details/403/gallery/2.webp","plants/details/403/gallery/3.webp","plants/details/403/gallery/4.webp","plants/details/403/gallery/5.webp","plants/details/403/gallery/6.webp","plants/details/403/gallery/7.webp","plants/details/403/gallery/8.webp","plants/details/403/gallery/9.webp","plants/details/403/gallery/10.webp"]')
ON CONFLICT(id) DO UPDATE SET
  floor_id = excluded.floor_id,
  identifier = excluded.identifier,
  type = excluded.type,
  bedrooms = excluded.bedrooms,
  bathrooms = excluded.bathrooms,
  area_sqm = excluded.area_sqm,
  coordinates = excluded.coordinates,
  tour_url = excluded.tour_url,
  photos_furnished = excluded.photos_furnished,
  photos_unfurnished = excluded.photos_unfurnished,
  photos_plans = excluded.photos_plans,
  gallery = excluded.gallery,
  deleted_at = NULL,
  updated_at = unixepoch();

INSERT INTO units (id, floor_id, identifier, type, bedrooms, bathrooms, area_sqm, coordinates, state, tour_url, photos_furnished, photos_unfurnished, photos_plans, gallery)
VALUES ('unit_5_502', 'floor_5', '502', 'APARTMENT', 3, 2.5, 116.28, '{"x":68.42,"y":42.55,"path":"M 62.97 13.96 L 79.1 13.96 L 81.35 67.31 L 75.05 67.16 L 75.05 69.32 L 62.42 70.82 L 62.09 58.06 L 62.63 58.06 L 62.51 53.66 L 52.9 53.43 L 52.56 38.14 L 50.67 38.14 L 50.84 28.51 L 65.78 28.74 L 65.34 16.39 Z"}', 'AVAILABLE', 'https://kuula.co/share/collection/7dPKv?logo=-1&card=1&info=0&fs=1&vr=1&zoom=1&sd=1&thumbs=3&inst=es', '["plants/details/x02/furnished.webp"]', '["plants/details/x02/unfurnished.webp"]', '["plants/details/x02/plans.webp"]', '["plants/details/x02/gallery/1.webp","plants/details/x02/gallery/2.webp","plants/details/x02/gallery/3.webp","plants/details/x02/gallery/4.webp","plants/details/x02/gallery/5.webp","plants/details/x02/gallery/6.webp","plants/details/x02/gallery/7.webp","plants/details/x02/gallery/8.webp","plants/details/x02/gallery/9.webp","plants/details/x02/gallery/10.webp"]')
ON CONFLICT(id) DO UPDATE SET
  floor_id = excluded.floor_id,
  identifier = excluded.identifier,
  type = excluded.type,
  bedrooms = excluded.bedrooms,
  bathrooms = excluded.bathrooms,
  area_sqm = excluded.area_sqm,
  coordinates = excluded.coordinates,
  tour_url = excluded.tour_url,
  photos_furnished = excluded.photos_furnished,
  photos_unfurnished = excluded.photos_unfurnished,
  photos_plans = excluded.photos_plans,
  gallery = excluded.gallery,
  deleted_at = NULL,
  updated_at = unixepoch();

INSERT INTO units (id, floor_id, identifier, type, bedrooms, bathrooms, area_sqm, coordinates, state, tour_url, photos_furnished, photos_unfurnished, photos_plans, gallery)
VALUES ('unit_5_503', 'floor_5', '503', 'DUPLEX', 3, 4, 116.88, '{"x":44.56,"y":64.56,"path":"M 48.82 53.89 L 48.71 56.12 L 43.15 55.81 L 43.19 48.52 L 39.36 48.58 L 39.19 55.87 L 37.66 56.06 L 37.62 60.07 L 27.44 59.83 L 27.06 74.72 L 23.86 74.78 L 23.76 78.12 L 35.05 76.26 L 35.12 74.41 L 43.4 73.24 L 48.33 72.99 L 62.1 71.38 L 61.99 57.85 L 62.38 57.91 L 62.38 53.58 Z"}', 'AVAILABLE', 'https://kuula.co/share/collection/7dlT4?logo=-1&card=1&info=0&fs=1&vr=1&gyro=0&initload=0&thumbs=1&inst=es', '["plants/details/502.1/furnished.webp"]', '["plants/details/502.1/unfurnished.webp"]', '["plants/details/502.1/plans.webp"]', '["plants/details/502/gallery/1.webp","plants/details/502/gallery/2.webp","plants/details/502/gallery/3.webp","plants/details/502/gallery/4.webp","plants/details/502/gallery/5.webp","plants/details/502/gallery/6.webp","plants/details/502/gallery/7.webp","plants/details/502/gallery/8.webp","plants/details/502/gallery/9.webp","plants/details/502/gallery/10.webp","plants/details/502/gallery/11.webp","plants/details/502/gallery/12.webp","plants/details/502/gallery/13.webp","plants/details/502/gallery/14.webp","plants/details/502/gallery/15.webp"]')
ON CONFLICT(id) DO UPDATE SET
  floor_id = excluded.floor_id,
  identifier = excluded.identifier,
  type = excluded.type,
  bedrooms = excluded.bedrooms,
  bathrooms = excluded.bathrooms,
  area_sqm = excluded.area_sqm,
  coordinates = excluded.coordinates,
  tour_url = excluded.tour_url,
  photos_furnished = excluded.photos_furnished,
  photos_unfurnished = excluded.photos_unfurnished,
  photos_plans = excluded.photos_plans,
  gallery = excluded.gallery,
  deleted_at = NULL,
  updated_at = unixepoch();

UPDATE tours SET unit_id = 'unit_5_503' WHERE id = 'tour-503';
INSERT OR IGNORE INTO tours (id, title, subtitle, thumbnail_url, type, target_url, unit_id, is_active, "order")
VALUES ('tour-502', 'Unidad 502', 'Flat', 'plants/details/x01/gallery/1.webp', 'unit', 'https://kuula.co/share/collection/7dPKv?logo=-1&card=1&info=0&fs=1&vr=1&zoom=1&sd=1&thumbs=3&inst=es', 'unit_5_502', 1, 12);


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

-- Sótano 2 (Estacionamientos 13 al 22)
INSERT INTO units (id, floor_id, identifier, type, bedrooms, bathrooms, area_sqm, coordinates, state)
VALUES ('unit_S2_13', 'floor_S2', '13', 'STORAGE', NULL, NULL, NULL, '{"x":72.95,"y":44.63,"path":"M 79.54 50.51 L 79.11 38.2 L 66.4 38.87 L 66.73 50.93 Z"}', 'AVAILABLE')
ON CONFLICT(id) DO UPDATE SET coordinates = excluded.coordinates, updated_at = unixepoch();

INSERT INTO units (id, floor_id, identifier, type, bedrooms, bathrooms, area_sqm, coordinates, state)
VALUES ('unit_S2_14', 'floor_S2', '14', 'STORAGE', NULL, NULL, NULL, '{"x":73.33,"y":56.21,"path":"M 79.87 61.88 L 79.68 50.59 L 66.78 50.76 L 66.97 61.63 Z"}', 'AVAILABLE')
ON CONFLICT(id) DO UPDATE SET coordinates = excluded.coordinates, updated_at = unixepoch();

INSERT INTO units (id, floor_id, identifier, type, bedrooms, bathrooms, area_sqm, coordinates, state)
VALUES ('unit_S2_15', 'floor_S2', '15', 'STORAGE', NULL, NULL, NULL, '{"x":73.59,"y":67.53,"path":"M 80.29 73.26 L 80.06 61.71 L 66.88 61.8 L 67.11 73.35 Z"}', 'AVAILABLE')
ON CONFLICT(id) DO UPDATE SET coordinates = excluded.coordinates, updated_at = unixepoch();

INSERT INTO units (id, floor_id, identifier, type, bedrooms, bathrooms, area_sqm, coordinates, state)
VALUES ('unit_S2_16', 'floor_S2', '16', 'STORAGE', NULL, NULL, NULL, '{"x":74.00,"y":79.27,"path":"M 80.86 84.13 L 80.44 73.43 L 67.21 73.6 L 67.49 85.9 Z"}', 'AVAILABLE')
ON CONFLICT(id) DO UPDATE SET coordinates = excluded.coordinates, updated_at = unixepoch();

INSERT INTO units (id, floor_id, identifier, type, bedrooms, bathrooms, area_sqm, coordinates, state)
VALUES ('unit_S2_17', 'floor_S2', '17', 'STORAGE', NULL, NULL, NULL, '{"x":19.27,"y":87.34,"path":"M 25.92 92.06 L 26.3 81.69 L 12.83 81.18 L 12.03 94.42 Z"}', 'AVAILABLE')
ON CONFLICT(id) DO UPDATE SET coordinates = excluded.coordinates, updated_at = unixepoch();

INSERT INTO units (id, floor_id, identifier, type, bedrooms, bathrooms, area_sqm, coordinates, state)
VALUES ('unit_S2_18', 'floor_S2', '18', 'STORAGE', NULL, NULL, NULL, '{"x":19.72,"y":75.46,"path":"M 26.2 80.43 L 26.58 70.31 L 13.26 70.4 L 12.83 80.68 Z"}', 'AVAILABLE')
ON CONFLICT(id) DO UPDATE SET coordinates = excluded.coordinates, updated_at = unixepoch();

INSERT INTO units (id, floor_id, identifier, type, bedrooms, bathrooms, area_sqm, coordinates, state)
VALUES ('unit_S2_19', 'floor_S2', '19', 'STORAGE', NULL, NULL, NULL, '{"x":20.35,"y":65.19,"path":"M 26.77 70.23 L 26.82 60.2 L 14.21 60.37 L 13.59 69.97 Z"}', 'AVAILABLE')
ON CONFLICT(id) DO UPDATE SET coordinates = excluded.coordinates, updated_at = unixepoch();

INSERT INTO units (id, floor_id, identifier, type, bedrooms, bathrooms, area_sqm, coordinates, state)
VALUES ('unit_S2_20', 'floor_S2', '20', 'STORAGE', NULL, NULL, NULL, '{"x":20.74,"y":55.10,"path":"M 27.01 60.11 L 27.29 50.17 L 14.68 50.08 L 13.97 60.03 Z"}', 'AVAILABLE')
ON CONFLICT(id) DO UPDATE SET coordinates = excluded.coordinates, updated_at = unixepoch();

INSERT INTO units (id, floor_id, identifier, type, bedrooms, bathrooms, area_sqm, coordinates, state)
VALUES ('unit_S2_21', 'floor_S2', '21', 'STORAGE', NULL, NULL, NULL, '{"x":21.24,"y":44.31,"path":"M 27.72 38.71 L 15.49 38.96 L 14.59 49.92 L 27.15 49.66 Z"}', 'AVAILABLE')
ON CONFLICT(id) DO UPDATE SET coordinates = excluded.coordinates, updated_at = unixepoch();

INSERT INTO units (id, floor_id, identifier, type, bedrooms, bathrooms, area_sqm, coordinates, state)
VALUES ('unit_S2_22', 'floor_S2', '22', 'STORAGE', NULL, NULL, NULL, '{"x":22.02,"y":28.11,"path":"M 27.96 32.3 L 28.19 23.11 L 16.29 22.95 L 15.63 34.07 Z"}', 'AVAILABLE')
ON CONFLICT(id) DO UPDATE SET coordinates = excluded.coordinates, updated_at = unixepoch();
