-- Run this once on your Aiven PostgreSQL instance

CREATE TABLE IF NOT EXISTS repos (
  id           SERIAL PRIMARY KEY,
  repo_name    TEXT NOT NULL,
  cf_pages_url TEXT NOT NULL,
  video_count  INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS videos (
  id         SERIAL PRIMARY KEY,
  cf_url     TEXT NOT NULL,
  name       TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_videos_name ON videos(name);
