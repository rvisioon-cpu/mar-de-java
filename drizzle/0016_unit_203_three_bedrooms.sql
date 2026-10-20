-- Unit 203 is a duplex spanning floors 2 and 3; keep both floor records in sync.
UPDATE units SET bedrooms = 3, updated_at = unixepoch() WHERE id IN ('unit_2_203', 'unit_3_303');
