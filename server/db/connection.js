/**
 * Database Connection Module
 * 
 * Tries better-sqlite3 first (fast, native). Falls back to sql.js
 * (pure JS, works everywhere) if the native module fails to load.
 * 
 * Exports a thin wrapper with a consistent API:
 *   db.prepare(sql).all(params)    → rows[]
 *   db.prepare(sql).get(params)    → row | undefined
 *   db.prepare(sql).run(params)    → { changes, lastInsertRowid }
 *   db.exec(sql)                   → run raw SQL (used for schema/seed)
 *   db.pragma(name, value?)        → set/get pragma
 *   db.transaction(fn)             → wrap fn in a transaction
 *   db.close()                     → close the connection
 */

const path = require('path');
const fs   = require('fs');

// Database file lives at project root / server / db / healthcare_pm.db
const DB_PATH = path.join(__dirname, 'healthcare_pm.db');

let db = null;     // singleton connection
let engine = null; // 'better-sqlite3' or 'sql.js'

// ---------- better-sqlite3 adapter (native, synchronous) ----------

function initBetterSqlite3() {
  const Database = require('better-sqlite3');
  const _db = new Database(DB_PATH);
  _db.pragma('journal_mode = WAL');
  _db.pragma('foreign_keys = ON');

  return {
    engine: 'better-sqlite3',

    prepare(sql) {
      const stmt = _db.prepare(sql);
      return {
        all(...params)  { return stmt.all(...params); },
        get(...params)  { return stmt.get(...params); },
        run(...params)  { return stmt.run(...params); },
      };
    },

    exec(sql) { _db.exec(sql); },

    pragma(name, value) {
      if (value !== undefined) return _db.pragma(`${name} = ${value}`);
      return _db.pragma(name);
    },

    transaction(fn) {
      const trx = _db.transaction(fn);
      return (...args) => trx(...args);
    },

    close() { _db.close(); },

    get raw() { return _db; },
  };
}

// ---------- sql.js adapter (pure JS, Emscripten-compiled SQLite) ----------

function initSqlJs() {
  const initSqlJsLib = require('sql.js');
  // sql.js init is async, but we handle this in getDb()
  return initSqlJsLib;
}

function createSqlJsWrapper(SQL) {
  let buffer = null;
  if (fs.existsSync(DB_PATH)) {
    buffer = fs.readFileSync(DB_PATH);
  }
  const _db = buffer ? new SQL.Database(buffer) : new SQL.Database();

  // Auto-save helper: writes the in-memory DB to disk
  function save() {
    const data = _db.export();
    const buf  = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buf);
  }

  _db.run('PRAGMA journal_mode = WAL');
  _db.run('PRAGMA foreign_keys = ON');

  return {
    engine: 'sql.js',

    prepare(sql) {
      return {
        all(...params) {
          const p = params.length === 1 && typeof params[0] === 'object' && !Array.isArray(params[0])
            ? params[0] : params;
          try {
            const stmt = _db.prepare(sql);
            if (typeof p === 'object' && !Array.isArray(p)) stmt.bind(p);
            else if (Array.isArray(p) && p.length) stmt.bind(p);
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
          } catch (e) {
            throw e;
          }
        },
        get(...params) {
          const rows = this.all(...params);
          return rows[0] || undefined;
        },
        run(...params) {
          const p = params.length === 1 && typeof params[0] === 'object' && !Array.isArray(params[0])
            ? params[0] : params;
          try {
            if (typeof p === 'object' && !Array.isArray(p)) {
              _db.run(sql, p);
            } else if (Array.isArray(p) && p.length) {
              _db.run(sql, p);
            } else {
              _db.run(sql);
            }
            save();
            const info = _db.getRowsModified();
            // sql.js doesn't give lastInsertRowid directly after run
            let lastId = 0;
            try {
              const r = _db.exec('SELECT last_insert_rowid() as id');
              if (r.length && r[0].values.length) lastId = r[0].values[0][0];
            } catch (_) {}
            return { changes: info, lastInsertRowid: lastId };
          } catch (e) {
            throw e;
          }
        },
      };
    },

    exec(sql) {
      _db.exec(sql);
      save();
    },

    pragma(name, value) {
      if (value !== undefined) {
        _db.run(`PRAGMA ${name} = ${value}`);
        save();
      } else {
        const r = _db.exec(`PRAGMA ${name}`);
        return r.length ? r[0].values[0][0] : null;
      }
    },

    transaction(fn) {
      return (...args) => {
        _db.run('BEGIN');
        try {
          const result = fn(...args);
          _db.run('COMMIT');
          save();
          return result;
        } catch (e) {
          _db.run('ROLLBACK');
          throw e;
        }
      };
    },

    close() {
      save();
      _db.close();
    },

    get raw() { return _db; },
  };
}

// ---------- public API ----------

/**
 * Get (or create) the database singleton.
 * First call may be async if using sql.js (needs WASM init).
 */
async function getDb() {
  if (db) return db;

  // Try better-sqlite3 first
  try {
    db = initBetterSqlite3();
    engine = 'better-sqlite3';
    console.log('📦 Database engine: better-sqlite3 (native)');
    return db;
  } catch (err) {
    console.log('⚠️  better-sqlite3 not available, falling back to sql.js...');
  }

  // Fall back to sql.js
  try {
    const initFn = initSqlJs();
    const SQL    = await initFn();
    db = createSqlJsWrapper(SQL);
    engine = 'sql.js';
    console.log('📦 Database engine: sql.js (pure JS)');
    return db;
  } catch (err) {
    console.error('❌ Failed to initialize any database engine:', err);
    throw err;
  }
}

/**
 * Close the database connection and reset the singleton.
 */
function closeDb() {
  if (db) {
    db.close();
    db = null;
    engine = null;
  }
}

/**
 * Delete the database file (used by reset endpoint and tests).
 */
function deleteDbFile() {
  closeDb();
  if (fs.existsSync(DB_PATH)) {
    fs.unlinkSync(DB_PATH);
  }
}

module.exports = { getDb, closeDb, deleteDbFile, DB_PATH };
