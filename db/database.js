const { createClient } = require('@libsql/client');
const fs   = require('fs');
const path = require('path');
require('dotenv').config();

// Client Turso (remote) ou SQLite local en dev
const db = createClient(
  process.env.TURSO_URL
    ? {
        url:       process.env.TURSO_URL,
        authToken: process.env.TURSO_TOKEN,
      }
    : {
        // Fallback SQLite local pour développement
        url: `file:${path.join(process.cwd(), 'data', 'ccbot.db')}`,
      }
);

// Migrations
async function migrate() {
  const schema = fs.readFileSync(
    path.join(__dirname, 'schema.sql'), 'utf-8'
  );

  // Exécuter chaque statement séparément
  const statements = schema
    .split(';')
    .map(s => s.trim())
    .filter(Boolean);

  for (const stmt of statements) {
    await db.execute(stmt);
  }

  console.log('[DB] Migrations appliquées ✓');
}

migrate().catch(console.error);

module.exports = db;