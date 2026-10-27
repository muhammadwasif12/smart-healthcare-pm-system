/**
 * Database Initialization Module
 * 
 * Reads schema.sql and seed.sql from /database, runs them on first start.
 * Provides a resetDatabase() function for the "Reset Demo Data" feature.
 */

const fs   = require('fs');
const path = require('path');
const { getDb, deleteDbFile } = require('./connection');

const SCHEMA_PATH = path.join(__dirname, '..', '..', 'database', 'schema.sql');
const SEED_PATH   = path.join(__dirname, '..', '..', 'database', 'seed.sql');

/**
 * Initialize the database: run schema, then seed if tables are empty.
 * Safe to call on every server start — uses IF NOT EXISTS in schema
 * and checks for existing data before seeding.
 */
async function initDatabase() {
  const db = await getDb();

  // Run schema (all CREATE TABLE IF NOT EXISTS, idempotent)
  const schemaSql = fs.readFileSync(SCHEMA_PATH, 'utf-8');
  db.exec(schemaSql);
  console.log('✅ Database schema applied');

  // Check if data already exists (look for team_members as indicator)
  const row = db.prepare('SELECT COUNT(*) as cnt FROM team_members').get();
  if (row && row.cnt > 0) {
    await seedMissingProgressLog(db);
    console.log('ℹ️  Database already seeded (found existing data)');
    return db;
  }

  // Run seed data
  const seedSql = fs.readFileSync(SEED_PATH, 'utf-8');
  db.exec(seedSql);
  console.log('🌱 Database seeded with demo data');

  return db;
}

/**
 * Backfill dated progress history when upgrading a database created before
 * progress_log was introduced. The seed statement is kept in seed.sql so the
 * migration uses the same realistic history as a clean reset.
 */
async function seedMissingProgressLog(db) {
  const row = db.prepare('SELECT COUNT(*) as cnt FROM progress_log').get();
  if (row.cnt > 0) return;

  const seedSql = fs.readFileSync(SEED_PATH, 'utf-8');
  const match = seedSql.match(/INSERT INTO progress_log[\s\S]*?;/);
  if (!match) {
    throw new Error('Progress-log seed data is missing from database/seed.sql');
  }
  db.exec(match[0]);
  console.log('🌱 Backfilled progress-log history');
}

/**
 * Reset the database: delete the file, recreate schema, and re-seed.
 * Used by the "Reset Demo Data" button and tests.
 */
async function resetDatabase() {
  console.log('🔄 Resetting database...');
  deleteDbFile();
  const db = await initDatabase();
  console.log('✅ Database reset complete');
  return db;
}

module.exports = { initDatabase, resetDatabase };
