const Database = require('better-sqlite3');
const path     = require('path');
const fs       = require('fs');

const DB_DIR  = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DB_DIR, 'gacha.db');

if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });

const db = new Database(DB_PATH);

// Performances
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.pragma('synchronous = NORMAL');

// Migrations
const schema = fs.readFileSync(
  path.join(__dirname, 'schema.sql'), 'utf-8'
);
db.exec(schema);

module.exports = db;