const db = require('./database');

async function get(sql, ...params) {
  const result = await db.execute({ sql, args: params });
  return result.rows[0] ?? null;
}

async function all(sql, ...params) {
  const result = await db.execute({ sql, args: params });
  return result.rows;
}

async function run(sql, ...params) {
  const result = await db.execute({ sql, args: params });
  return {
    changes:         result.rowsAffected,
    lastInsertRowid: Number(result.lastInsertRowid ?? 0),
  };
}

async function batch(queries) {
  const result = await db.batch(
    queries.map(q => ({ sql: q.sql, args: q.args ?? [] })),
    'write'
  );
  return result;
}

module.exports = { get, all, run, batch };