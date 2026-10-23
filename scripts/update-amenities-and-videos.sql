-- Actualización de multimedia para Mar de Java
-- 1. Video Portada y Video General
UPDATE media SET is_active = 0 WHERE category IN ('VIDEO_SIDEBAR', 'VIDEO_PORTADA');

INSERT INTO media (id, title, url, url_night, type, category, is_active) VALUES
  ('mar-java-video-portada', 'Video Portada', 'videos/video_portada.mp4', NULL, 'video/mp4', 'VIDEO_PORTADA', 1),
  ('mar-java-video-general', 'Video General', 'videos/video_general_87d60c91f80a.mp4', NULL, 'video/mp4', 'VIDEO_SIDEBAR', 1)
ON CONFLICT(id) DO UPDATE SET title = excluded.title, url = excluded.url,
  url_night = excluded.url_night, type = excluded.type, category = excluded.category,
  is_active = excluded.is_active, deleted_at = NULL;

-- 2. 17 Amenidades completas (Fachadas, Lobbies, Áreas Comunes)
UPDATE media SET is_active = 0 WHERE category IN ('AMENITIES_GALLERY', 'amenities');

INSERT INTO media (id, title, url, url_night, type, category, is_active) VALUES
  ('mar-java-amenity-1', 'Fachada Principal', 'amenities/1.webp', NULL, 'image/webp', 'AMENITIES_GALLERY', 1),
  ('mar-java-amenity-2', 'Fachada Nocturna', 'amenities/2.webp', NULL, 'image/webp', 'AMENITIES_GALLERY', 1),
  ('mar-java-amenity-3', 'Fachada Vista Lateral', 'amenities/3.webp', NULL, 'image/webp', 'AMENITIES_GALLERY', 1),
  ('mar-java-amenity-4', 'Fachada Vista Panorámica', 'amenities/4.webp', NULL, 'image/webp', 'AMENITIES_GALLERY', 1),
  ('mar-java-amenity-5', 'Fachada Angular', 'amenities/5.webp', NULL, 'image/webp', 'AMENITIES_GALLERY', 1),
  ('mar-java-amenity-6', 'Fachada Acceso', 'amenities/6.webp', NULL, 'image/webp', 'AMENITIES_GALLERY', 1),
  ('mar-java-amenity-7', 'Lobby de Ingreso', 'amenities/7.webp', NULL, 'image/webp', 'AMENITIES_GALLERY', 1),
  ('mar-java-amenity-8', 'Lobby Recepción', 'amenities/8.webp', NULL, 'image/webp', 'AMENITIES_GALLERY', 1),
  ('mar-java-amenity-9', 'Lobby Sala de Espera', 'amenities/9.webp', NULL, 'image/webp', 'AMENITIES_GALLERY', 1),
  ('mar-java-amenity-10', 'Zona Social / Terraza 1', 'amenities/10.webp', NULL, 'image/webp', 'AMENITIES_GALLERY', 1),
  ('mar-java-amenity-11', 'Zona Social / Terraza 2', 'amenities/11.webp', NULL, 'image/webp', 'AMENITIES_GALLERY', 1),
  ('mar-java-amenity-12', 'Zona Social / Parrilla', 'amenities/12.webp', NULL, 'image/webp', 'AMENITIES_GALLERY', 1),
  ('mar-java-amenity-13', 'Área Común D1', 'amenities/13.webp', NULL, 'image/webp', 'AMENITIES_GALLERY', 1),
  ('mar-java-amenity-14', 'Área Común D2', 'amenities/14.webp', NULL, 'image/webp', 'AMENITIES_GALLERY', 1),
  ('mar-java-amenity-15', 'Sótano 1', 'amenities/15.webp', NULL, 'image/webp', 'AMENITIES_GALLERY', 1),
  ('mar-java-amenity-16', 'Sótano 2', 'amenities/16.webp', NULL, 'image/webp', 'AMENITIES_GALLERY', 1),
  ('mar-java-amenity-17', 'Sótano 3', 'amenities/17.webp', NULL, 'image/webp', 'AMENITIES_GALLERY', 1)
ON CONFLICT(id) DO UPDATE SET title = excluded.title, url = excluded.url,
  url_night = excluded.url_night, type = excluded.type, category = excluded.category,
  is_active = excluded.is_active, deleted_at = NULL;
