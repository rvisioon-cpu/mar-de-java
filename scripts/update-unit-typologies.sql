-- Unit typologies ("5. TIPOLOGÍAS COMPLETO" delivery).
-- NOTE: these values now live in src/data/floors.ts and ship in the generated
-- seed, so this script is only for patching a database in place — it updates
-- the unit rows without the wipe that seeding does.
-- photos_* hold the three views the unit page switches between (amoblado /
-- sin amoblar / plano) and gallery holds the interior renders. The path also
-- tells the unit page which folder to read the transition videos from, so the
-- flats that share a typology (201-301-401, 202-302-402) share one folder.

UPDATE units SET
  photos_furnished = '["plants/details/101/furnished.webp"]',
  photos_unfurnished = '["plants/details/101/unfurnished.webp"]',
  photos_plans = '["plants/details/101/plans.webp"]',
  gallery = '["plants/details/101/gallery/1.webp","plants/details/101/gallery/2.webp","plants/details/101/gallery/3.webp","plants/details/101/gallery/4.webp","plants/details/101/gallery/5.webp","plants/details/101/gallery/6.webp","plants/details/101/gallery/7.webp","plants/details/101/gallery/8.webp","plants/details/101/gallery/9.webp","plants/details/101/gallery/10.webp","plants/details/101/gallery/11.webp"]',
  updated_at = unixepoch()
WHERE id = 'unit_1_101';

UPDATE units SET
  photos_furnished = '["plants/details/102/furnished.webp"]',
  photos_unfurnished = '["plants/details/102/unfurnished.webp"]',
  photos_plans = '["plants/details/102/plans.webp"]',
  gallery = '["plants/details/102/gallery/1.webp","plants/details/102/gallery/2.webp","plants/details/102/gallery/3.webp","plants/details/102/gallery/4.webp","plants/details/102/gallery/5.webp","plants/details/102/gallery/6.webp","plants/details/102/gallery/7.webp","plants/details/102/gallery/8.webp","plants/details/102/gallery/9.webp","plants/details/102/gallery/10.webp","plants/details/102/gallery/11.webp","plants/details/102/gallery/12.webp"]',
  updated_at = unixepoch()
WHERE id = 'unit_1_102';

UPDATE units SET
  photos_furnished = '["plants/details/x01/furnished.webp"]',
  photos_unfurnished = '["plants/details/x01/unfurnished.webp"]',
  photos_plans = '["plants/details/x01/plans.webp"]',
  gallery = '["plants/details/x01/gallery/1.webp","plants/details/x01/gallery/2.webp","plants/details/x01/gallery/3.webp","plants/details/x01/gallery/4.webp","plants/details/x01/gallery/5.webp","plants/details/x01/gallery/6.webp","plants/details/x01/gallery/7.webp","plants/details/x01/gallery/8.webp","plants/details/x01/gallery/9.webp"]',
  updated_at = unixepoch()
WHERE id = 'unit_2_201';

UPDATE units SET
  photos_furnished = '["plants/details/x01/furnished.webp"]',
  photos_unfurnished = '["plants/details/x01/unfurnished.webp"]',
  photos_plans = '["plants/details/x01/plans.webp"]',
  gallery = '["plants/details/x01/gallery/1.webp","plants/details/x01/gallery/2.webp","plants/details/x01/gallery/3.webp","plants/details/x01/gallery/4.webp","plants/details/x01/gallery/5.webp","plants/details/x01/gallery/6.webp","plants/details/x01/gallery/7.webp","plants/details/x01/gallery/8.webp","plants/details/x01/gallery/9.webp"]',
  updated_at = unixepoch()
WHERE id = 'unit_3_301';

UPDATE units SET
  photos_furnished = '["plants/details/x01/furnished.webp"]',
  photos_unfurnished = '["plants/details/x01/unfurnished.webp"]',
  photos_plans = '["plants/details/x01/plans.webp"]',
  gallery = '["plants/details/x01/gallery/1.webp","plants/details/x01/gallery/2.webp","plants/details/x01/gallery/3.webp","plants/details/x01/gallery/4.webp","plants/details/x01/gallery/5.webp","plants/details/x01/gallery/6.webp","plants/details/x01/gallery/7.webp","plants/details/x01/gallery/8.webp","plants/details/x01/gallery/9.webp"]',
  updated_at = unixepoch()
WHERE id = 'unit_4_401';

UPDATE units SET
  photos_furnished = '["plants/details/x02/furnished.webp"]',
  photos_unfurnished = '["plants/details/x02/unfurnished.webp"]',
  photos_plans = '["plants/details/x02/plans.webp"]',
  gallery = '["plants/details/x02/gallery/1.webp","plants/details/x02/gallery/2.webp","plants/details/x02/gallery/3.webp","plants/details/x02/gallery/4.webp","plants/details/x02/gallery/5.webp","plants/details/x02/gallery/6.webp","plants/details/x02/gallery/7.webp","plants/details/x02/gallery/8.webp","plants/details/x02/gallery/9.webp","plants/details/x02/gallery/10.webp"]',
  updated_at = unixepoch()
WHERE id = 'unit_2_202';

UPDATE units SET
  photos_furnished = '["plants/details/x02/furnished.webp"]',
  photos_unfurnished = '["plants/details/x02/unfurnished.webp"]',
  photos_plans = '["plants/details/x02/plans.webp"]',
  gallery = '["plants/details/x02/gallery/1.webp","plants/details/x02/gallery/2.webp","plants/details/x02/gallery/3.webp","plants/details/x02/gallery/4.webp","plants/details/x02/gallery/5.webp","plants/details/x02/gallery/6.webp","plants/details/x02/gallery/7.webp","plants/details/x02/gallery/8.webp","plants/details/x02/gallery/9.webp","plants/details/x02/gallery/10.webp"]',
  updated_at = unixepoch()
WHERE id = 'unit_3_302';

UPDATE units SET
  photos_furnished = '["plants/details/x02/furnished.webp"]',
  photos_unfurnished = '["plants/details/x02/unfurnished.webp"]',
  photos_plans = '["plants/details/x02/plans.webp"]',
  gallery = '["plants/details/x02/gallery/1.webp","plants/details/x02/gallery/2.webp","plants/details/x02/gallery/3.webp","plants/details/x02/gallery/4.webp","plants/details/x02/gallery/5.webp","plants/details/x02/gallery/6.webp","plants/details/x02/gallery/7.webp","plants/details/x02/gallery/8.webp","plants/details/x02/gallery/9.webp","plants/details/x02/gallery/10.webp"]',
  updated_at = unixepoch()
WHERE id = 'unit_4_402';

UPDATE units SET
  photos_furnished = '["plants/details/501.1/furnished.webp"]',
  photos_unfurnished = '["plants/details/501.1/unfurnished.webp"]',
  photos_plans = '["plants/details/501.1/plans.webp"]',
  gallery = '["plants/details/501/gallery/1.webp","plants/details/501/gallery/2.webp","plants/details/501/gallery/3.webp","plants/details/501/gallery/4.webp","plants/details/501/gallery/5.webp","plants/details/501/gallery/6.webp","plants/details/501/gallery/7.webp","plants/details/501/gallery/8.webp","plants/details/501/gallery/9.webp","plants/details/501/gallery/10.webp","plants/details/501/gallery/11.webp","plants/details/501/gallery/12.webp","plants/details/501/gallery/13.webp","plants/details/501/gallery/14.webp","plants/details/501/gallery/15.webp"]',
  updated_at = unixepoch()
WHERE id = 'unit_5_501';

UPDATE units SET
  photos_furnished = '["plants/details/501.2/furnished.webp"]',
  photos_unfurnished = '["plants/details/501.2/unfurnished.webp"]',
  photos_plans = '["plants/details/501.2/plans.webp"]',
  gallery = '["plants/details/501/gallery/1.webp","plants/details/501/gallery/2.webp","plants/details/501/gallery/3.webp","plants/details/501/gallery/4.webp","plants/details/501/gallery/5.webp","plants/details/501/gallery/6.webp","plants/details/501/gallery/7.webp","plants/details/501/gallery/8.webp","plants/details/501/gallery/9.webp","plants/details/501/gallery/10.webp","plants/details/501/gallery/11.webp","plants/details/501/gallery/12.webp","plants/details/501/gallery/13.webp","plants/details/501/gallery/14.webp","plants/details/501/gallery/15.webp"]',
  updated_at = unixepoch()
WHERE id = 'unit_6_601';

UPDATE units SET
  photos_furnished = '["plants/details/502.1/furnished.webp"]',
  photos_unfurnished = '["plants/details/502.1/unfurnished.webp"]',
  photos_plans = '["plants/details/502.1/plans.webp"]',
  gallery = '["plants/details/502/gallery/1.webp","plants/details/502/gallery/2.webp","plants/details/502/gallery/3.webp","plants/details/502/gallery/4.webp","plants/details/502/gallery/5.webp","plants/details/502/gallery/6.webp","plants/details/502/gallery/7.webp","plants/details/502/gallery/8.webp","plants/details/502/gallery/9.webp","plants/details/502/gallery/10.webp","plants/details/502/gallery/11.webp","plants/details/502/gallery/12.webp","plants/details/502/gallery/13.webp","plants/details/502/gallery/14.webp","plants/details/502/gallery/15.webp"]',
  updated_at = unixepoch()
WHERE id = 'unit_5_502';

UPDATE units SET
  photos_furnished = '["plants/details/502.2/furnished.webp"]',
  photos_unfurnished = '["plants/details/502.2/unfurnished.webp"]',
  photos_plans = '["plants/details/502.2/plans.webp"]',
  gallery = '["plants/details/502/gallery/1.webp","plants/details/502/gallery/2.webp","plants/details/502/gallery/3.webp","plants/details/502/gallery/4.webp","plants/details/502/gallery/5.webp","plants/details/502/gallery/6.webp","plants/details/502/gallery/7.webp","plants/details/502/gallery/8.webp","plants/details/502/gallery/9.webp","plants/details/502/gallery/10.webp","plants/details/502/gallery/11.webp","plants/details/502/gallery/12.webp","plants/details/502/gallery/13.webp","plants/details/502/gallery/14.webp","plants/details/502/gallery/15.webp"]',
  updated_at = unixepoch()
WHERE id = 'unit_6_602';

-- Both duplexes span floors 5 and 6, so each level is its own unit row. Marking
-- the type is what makes the unit page offer the level selector between them.
UPDATE units SET type = 'DUPLEX', updated_at = unixepoch()
WHERE id IN ('unit_5_501', 'unit_5_502', 'unit_6_601', 'unit_6_602');
