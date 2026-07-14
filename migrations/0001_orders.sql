-- Digital-economy orders (see DIGITAL_ECONOMY.md).
-- Apply locally:  npx wrangler d1 migrations apply camboverse --local
-- Apply remote:   npx wrangler d1 migrations apply camboverse --remote
CREATE TABLE IF NOT EXISTS orders (
  id          TEXT PRIMARY KEY,
  market_id   TEXT NOT NULL,
  country     TEXT NOT NULL,
  items       TEXT NOT NULL,      -- JSON [{productId, qty}]
  total_cents INTEGER NOT NULL,
  created_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_orders_country ON orders (country);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders (created_at);
