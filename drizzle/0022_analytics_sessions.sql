-- Sessions and page opens are separate: old page views cannot identify people.
-- Keep historical events for page/unit reports without inventing past sessions.
CREATE TABLE analytics_sessions (
  id text PRIMARY KEY NOT NULL,
  device_type text NOT NULL,
  created_at integer NOT NULL,
  last_seen_at integer NOT NULL
);
CREATE INDEX analytics_sessions_created_at_idx ON analytics_sessions(created_at);
ALTER TABLE page_views ADD COLUMN session_id text REFERENCES analytics_sessions(id);
