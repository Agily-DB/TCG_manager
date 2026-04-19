/**
 * Creates an in-memory SQLite database with the full schema applied.
 * Used by repository unit tests to avoid touching the real database file.
 */
import Database from 'better-sqlite3'

const MIGRATIONS = `
CREATE TABLE IF NOT EXISTS collections (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  series      TEXT,
  total       INTEGER,
  release_date TEXT,
  symbol_url  TEXT,
  logo_url    TEXT,
  synced_at   TEXT
);

CREATE TABLE IF NOT EXISTS cards (
  id            TEXT PRIMARY KEY,
  collection_id TEXT NOT NULL REFERENCES collections(id),
  name          TEXT NOT NULL,
  number        TEXT NOT NULL,
  rarity        TEXT,
  types         TEXT,
  image_small   TEXT,
  image_large   TEXT,
  UNIQUE(collection_id, number)
);

CREATE TABLE IF NOT EXISTS purchases (
  id            TEXT PRIMARY KEY,
  product_type  TEXT NOT NULL,
  collection_id TEXT NOT NULL REFERENCES collections(id),
  quantity      INTEGER NOT NULL,
  unit_price    REAL NOT NULL,
  purchased_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS product_units (
  id            TEXT PRIMARY KEY,
  purchase_id   TEXT NOT NULL REFERENCES purchases(id),
  opening_status TEXT NOT NULL DEFAULT 'Pending',
  started_at    TEXT,
  completed_at  TEXT
);

CREATE TABLE IF NOT EXISTS user_collection_entries (
  id            TEXT PRIMARY KEY,
  card_id       TEXT NOT NULL REFERENCES cards(id),
  product_unit_id TEXT REFERENCES product_units(id),
  quantity      INTEGER NOT NULL DEFAULT 1,
  last_price    REAL,
  buy_link      TEXT,
  price_updated_at TEXT,
  registered_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS decks (
  id    TEXT PRIMARY KEY,
  name  TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS deck_cards (
  deck_id TEXT NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
  card_id TEXT NOT NULL REFERENCES cards(id),
  quantity INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (deck_id, card_id)
);

CREATE TABLE IF NOT EXISTS trades (
  id         TEXT PRIMARY KEY,
  traded_at  TEXT NOT NULL,
  notes      TEXT
);

CREATE TABLE IF NOT EXISTS trade_cards (
  id        TEXT PRIMARY KEY,
  trade_id  TEXT NOT NULL REFERENCES trades(id) ON DELETE CASCADE,
  card_id   TEXT REFERENCES cards(id),
  direction TEXT NOT NULL,
  card_name TEXT,
  card_number TEXT,
  collection_name TEXT
);

CREATE TABLE IF NOT EXISTS sync_log (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  type       TEXT NOT NULL,
  status     TEXT NOT NULL,
  last_collection_index INTEGER DEFAULT 0,
  started_at TEXT NOT NULL,
  finished_at TEXT
);
`

export function createTestDb(): Database.Database {
  const db = new Database(':memory:')
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  db.exec(MIGRATIONS)
  return db
}
