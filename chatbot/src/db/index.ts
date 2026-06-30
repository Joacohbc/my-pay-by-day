import { DatabaseSync } from 'node:sqlite';
import { config } from '../config.js';
import { runMigrations } from './migrations.js';

let database: DatabaseSync | null = null;

export function db(): DatabaseSync {
  if (database) return database;
  database = new DatabaseSync(config.database.path);
  database.exec('PRAGMA journal_mode = WAL;');
  database.exec('PRAGMA foreign_keys = ON;');
  runMigrations(database);
  return database;
}

export function nowIso(): string {
  return new Date().toISOString();
}
