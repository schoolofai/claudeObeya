/**
 * Database Reset Utility
 *
 * Clears all data from the SQLite database while preserving schema and indexes.
 * Use this for clean-state testing.
 *
 * Usage: npm run db:reset
 */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, '..', 'obeya.db');

function resetDatabase(): void {
  console.log(`Resetting database at: ${DB_PATH}`);

  const db = new Database(DB_PATH);

  // Disable foreign key checks temporarily
  db.pragma('foreign_keys = OFF');

  // Clear tables in dependency order (children first to respect foreign keys)
  const tables = ['events', 'tasks', 'plans', 'sessions', 'projects'];

  for (const table of tables) {
    const result = db.prepare(`DELETE FROM ${table}`).run();
    console.log(`  Cleared ${table}: ${result.changes} rows deleted`);
  }

  // Reset autoincrement counters
  const sequenceResult = db
    .prepare(
      `DELETE FROM sqlite_sequence WHERE name IN ('projects', 'sessions', 'plans', 'tasks', 'events')`
    )
    .run();
  console.log(`  Reset autoincrement counters: ${sequenceResult.changes} entries`);

  // Re-enable foreign keys
  db.pragma('foreign_keys = ON');

  // Reclaim disk space
  db.exec('VACUUM');
  console.log('  Vacuumed database to reclaim space');

  db.close();
  console.log('\nDatabase reset complete ✓');
}

resetDatabase();
