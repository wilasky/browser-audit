-- Browser Audit Backend — SQLite schema
-- WAL mode enabled in db.js

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- Malicious domains from URLhaus and PhishTank
CREATE TABLE IF NOT EXISTS domains (
  hash        TEXT PRIMARY KEY,   -- SHA256(domain) — never store raw domain
  source      TEXT NOT NULL,      -- 'urlhaus' | 'phishtank'
  severity    TEXT NOT NULL,      -- 'critical' | 'high' | 'medium'
  tags        TEXT,               -- JSON array of tags
  first_seen  INTEGER NOT NULL,
  last_seen   INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_domains_source ON domains(source);
CREATE INDEX IF NOT EXISTS idx_domains_last_seen ON domains(last_seen);

-- Malicious script hashes from MalwareBazaar
CREATE TABLE IF NOT EXISTS scripts (
  hash        TEXT PRIMARY KEY,   -- SHA256(script_content)
  source      TEXT NOT NULL,      -- 'malwarebazaar'
  malware_family TEXT,
  tags        TEXT,               -- JSON array
  first_seen  INTEGER NOT NULL,
  last_seen   INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_scripts_source ON scripts(source);

-- Known tracker domains from DisconnectMe
CREATE TABLE IF NOT EXISTS trackers (
  domain      TEXT PRIMARY KEY,
  category    TEXT NOT NULL,      -- 'Advertising' | 'Analytics' | 'Social' | 'Content'
  owner       TEXT,
  updated_at  INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_trackers_category ON trackers(category);

-- Known malicious extension IDs
CREATE TABLE IF NOT EXISTS extensions_blacklist (
  id          TEXT PRIMARY KEY,   -- Chrome extension ID
  name        TEXT,
  reason      TEXT,
  severity    TEXT NOT NULL,
  source      TEXT NOT NULL,
  removed_at  TEXT,
  updated_at  INTEGER NOT NULL
);

-- Sync state: tracks last successful sync per source
CREATE TABLE IF NOT EXISTS sync_state (
  source      TEXT PRIMARY KEY,
  last_sync   INTEGER NOT NULL,
  record_count INTEGER DEFAULT 0,
  error       TEXT
);
