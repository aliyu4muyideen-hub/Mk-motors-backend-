const Database = require("better-sqlite3");
const path = require("path");

const db = new Database(path.join(__dirname, "mkmotors.db"));
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS vehicles (
    id TEXT PRIMARY KEY,
    year INTEGER NOT NULL,
    make TEXT NOT NULL,
    model TEXT NOT NULL,
    trim TEXT,
    bodyType TEXT NOT NULL,
    price INTEGER NOT NULL,
    mileage INTEGER NOT NULL,
    engine TEXT,
    transmission TEXT,
    fuelType TEXT,
    exteriorColor TEXT,
    interiorColor TEXT,
    description TEXT,
    createdAt TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS vehicle_images (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    vehicleId TEXT NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    position INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,           -- 'test_drive' | 'trade_in' | 'contact' | 'chat'
    payload TEXT NOT NULL,        -- JSON blob of the submitted form
    createdAt TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS site_settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );

  CREATE TABLE IF NOT EXISTS subscribers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    createdAt TEXT DEFAULT (datetime('now'))
  );
`);

module.exports = db;
