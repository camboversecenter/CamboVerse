-- CamboVerse rails (Stage 2): identity, asset registry, entitlements,
-- learning credentials, and D2D providers. See ARCHITECTURE.md §7.
-- The Worker also creates these on first use (self-healing), so applying this
-- migration is optional; it exists for explicit/versioned schema management.
--   npx wrangler d1 migrations apply camboverse [--local|--remote]

CREATE TABLE IF NOT EXISTS identities (
  id              TEXT PRIMARY KEY,
  handle          TEXT UNIQUE,
  display_name    TEXT,
  khmer_name      TEXT,
  avatar_asset_id TEXT,
  wallet          TEXT,            -- Web3 seam (null in Web2)
  created_at      TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token       TEXT PRIMARY KEY,
  identity_id TEXT NOT NULL,
  created_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS assets (
  id             TEXT PRIMARY KEY,
  type           TEXT NOT NULL,
  name           TEXT NOT NULL,
  description    TEXT,
  image          TEXT,
  media          TEXT,            -- JSON [{role,uri,format}]
  attributes     TEXT,            -- JSON [{trait_type,value}]
  external_url   TEXT,
  license        TEXT NOT NULL,   -- SPDX id (CC0/CC-BY)
  provenance     TEXT NOT NULL,   -- JSON {contributor,capturedAt,method}
  consent        TEXT NOT NULL,   -- JSON {steward,consentRef}
  token_binding  TEXT,            -- Web3 seam {chain,contract,tokenId} (null)
  created_at     TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_assets_type ON assets (type);

CREATE TABLE IF NOT EXISTS entitlements (
  id          TEXT PRIMARY KEY,
  asset_id    TEXT NOT NULL,
  subject_id  TEXT NOT NULL,
  right       TEXT NOT NULL,      -- own | view | use | rent
  granted_by  TEXT,
  expires_at  TEXT,               -- rentals carry an expiry
  source      TEXT NOT NULL,      -- db (today) | chain (later)
  created_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_ent_subject ON entitlements (subject_id);
CREATE INDEX IF NOT EXISTS idx_ent_asset ON entitlements (asset_id);

CREATE TABLE IF NOT EXISTS credentials (
  id          TEXT PRIMARY KEY,
  issuer      TEXT NOT NULL,
  subject_id  TEXT NOT NULL,
  achievement TEXT NOT NULL,
  evidence    TEXT,
  issued_at   TEXT NOT NULL,
  proof       TEXT
);
CREATE INDEX IF NOT EXISTS idx_cred_subject ON credentials (subject_id);

CREATE TABLE IF NOT EXISTS providers (
  id          TEXT PRIMARY KEY,
  type        TEXT NOT NULL,      -- delivery | booking | ticket | purchase
  region      TEXT NOT NULL,
  name        TEXT NOT NULL,
  pay_methods TEXT,
  handoff     TEXT
);
