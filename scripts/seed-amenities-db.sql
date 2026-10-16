-- Amenities shown on /galeria (Mar de Java).
-- getGalleryImages() retrieves active items with category 'AMENITIES_GALLERY' or 'amenities'.
DELETE FROM media WHERE category = 'AMENITIES_GALLERY' OR category = 'amenities';

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
  ('mar-java-amenity-14', 'Área Común D2', 'amenities/14.webp', NULL, 'image/webp', 'AMENITIES_GALLERY', 1);
