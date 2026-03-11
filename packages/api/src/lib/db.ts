import Database from 'better-sqlite3';
import path from 'node:path';
import { runMigrations } from './migrate.js';

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (db) return db;
  const dbPath = process.env.DATABASE_PATH ?? './beastbot.db';
  const resolved = path.resolve(dbPath);
  db = new Database(resolved);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  runMigrations(db);
  return db;
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}
