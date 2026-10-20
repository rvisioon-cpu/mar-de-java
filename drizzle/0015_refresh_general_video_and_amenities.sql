-- Publish the October 2026 general video and add the three basement images.
-- Preserve existing gallery entries and unit availability.
UPDATE media SET is_active = 0 WHERE category = 'VIDEO_SIDEBAR';

INSERT INTO media (id, title, url, url_night, type, category, is_active) VALUES
  ('mar-java-video-general', 'Video General', 'videos/video_general_b830a6611c68.mp4', NULL, 'video/mp4', 'VIDEO_SIDEBAR', 1)
ON CONFLICT(id) DO UPDATE SET title = excluded.title, url = excluded.url,
  url_night = excluded.url_night, type = excluded.type, category = excluded.category,
  is_active = excluded.is_active, deleted_at = NULL;


INSERT INTO media (id, title, url, url_night, type, category, is_active) VALUES
  ('mar-java-amenity-15', 'Sótano 1', 'amenities/15.webp', NULL, 'image/webp', 'AMENITIES_GALLERY', 1),
  ('mar-java-amenity-16', 'Sótano 2', 'amenities/16.webp', NULL, 'image/webp', 'AMENITIES_GALLERY', 1),
  ('mar-java-amenity-17', 'Sótano 3', 'amenities/17.webp', NULL, 'image/webp', 'AMENITIES_GALLERY', 1)
ON CONFLICT(id) DO UPDATE SET title = excluded.title, url = excluded.url,
  url_night = excluded.url_night, type = excluded.type, category = excluded.category,
  is_active = excluded.is_active, deleted_at = NULL;
