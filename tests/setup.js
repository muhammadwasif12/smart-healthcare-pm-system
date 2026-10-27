/**
 * Test Setup — tests/setup.js
 *
 * Shared helpers for all test files.
 * Creates a fresh database for each test run using the real schema + seed.
 */

const path = require('path');
const fs   = require('fs');

const SCHEMA_PATH = path.join(__dirname, '..', 'database', 'schema.sql');
const SEED_PATH   = path.join(__dirname, '..', 'database', 'seed.sql');

const SERVER_NODE_MODULES = path.join(__dirname, '..', 'server', 'node_modules');

/**
 * Create a fresh in-memory database with schema and seed data.
 * Uses better-sqlite3 directly (not the connection module) so tests
 * don't interfere with the running server's DB file.
 */
async function createTestDb() {
  let Database;
  try {
    Database = require(path.join(SERVER_NODE_MODULES, 'better-sqlite3'));
  } catch {
    // Fall back to sql.js for environments without native compilation
    const initSqlJs = require(path.join(SERVER_NODE_MODULES, 'sql.js'));
    const SQL = await initSqlJs();
    return createSqlJsTestDb(SQL);
  }

  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');

  const schema = fs.readFileSync(SCHEMA_PATH, 'utf-8');
  db.exec(schema);

  const seed = fs.readFileSync(SEED_PATH, 'utf-8');
  db.exec(seed);

  // Return a wrapper matching the connection.js API
  return {
    engine: 'better-sqlite3',
    prepare(sql) {
      const stmt = db.prepare(sql);
      return {
        all(...p) { return stmt.all(...p); },
        get(...p) { return stmt.get(...p); },
        run(...p) { return stmt.run(...p); },
      };
    },
    exec(sql) { db.exec(sql); },
    pragma(name, value) {
      if (value !== undefined) return db.pragma(`${name} = ${value}`);
      return db.pragma(name);
    },
    transaction(fn) {
      const trx = db.transaction(fn);
      return (...args) => trx(...args);
    },
    close() { db.close(); },
    get raw() { return db; },
  };
}

/** sql.js fallback for test DB */
function createSqlJsTestDb(SQL) {
  const db = new SQL.Database();
  db.run('PRAGMA foreign_keys = ON');

  const schema = fs.readFileSync(SCHEMA_PATH, 'utf-8');
  db.exec(schema);

  const seed = fs.readFileSync(SEED_PATH, 'utf-8');
  db.exec(seed);

  return {
    engine: 'sql.js',
    prepare(sql) {
      return {
        all(...params) {
          try {
            const stmt = db.prepare(sql);
            const p = params.length === 1 && typeof params[0] === 'object' && !Array.isArray(params[0]) ? params[0] : params;
            if (Array.isArray(p) && p.length) stmt.bind(p);
            else if (typeof p === 'object' && !Array.isArray(p)) stmt.bind(p);
            const rows = [];
            const cols = stmt.getColumnNames();
            while (stmt.step()) {
              const vals = stmt.get();
              const row = {};
              cols.forEach((c, i) => { row[c] = vals[i]; });
              rows.push(row);
            }
            stmt.free();
            return rows;
          } catch(e) { throw e; }
        },
        get(...params) {
          const rows = this.all(...params);
          return rows[0] || undefined;
        },
        run(...params) {
          const p = params.length === 1 && typeof params[0] === 'object' && !Array.isArray(params[0]) ? params[0] : params;
          if (Array.isArray(p) && p.length) db.run(sql, p);
          else if (typeof p === 'object' && !Array.isArray(p)) db.run(sql, p);
          else db.run(sql);
          const info = db.getRowsModified();
          let lastId = 0;
          try { const r = db.exec('SELECT last_insert_rowid() as id'); if (r.length) lastId = r[0].values[0][0]; } catch(_) {}
          return { changes: info, lastInsertRowid: lastId };
        },
      };
    },
    exec(sql) { db.exec(sql); },
    pragma(name, value) {
      if (value !== undefined) db.run(`PRAGMA ${name} = ${value}`);
      else { const r = db.exec(`PRAGMA ${name}`); return r.length ? r[0].values[0][0] : null; }
    },
    transaction(fn) {
      return (...args) => {
        db.run('BEGIN');
        try { const result = fn(...args); db.run('COMMIT'); return result; }
        catch (e) { db.run('ROLLBACK'); throw e; }
      };
    },
    close() { db.close(); },
    get raw() { return db; },
  };
}

module.exports = { createTestDb };
