import { createClient, type Client } from '@libsql/client';
import path from 'path';
import fs from 'fs';

const DB_PATH = path.resolve(__dirname, '../../data/tryout.db');
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

export const db: Client = createClient({
  url: `file:${DB_PATH}`,
});

export async function initDb(): Promise<void> {
  await db.execute('PRAGMA journal_mode = WAL');
  await db.execute('PRAGMA foreign_keys = ON');
  await db.executeMultiple(`
    CREATE TABLE IF NOT EXISTS groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS teams (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS players (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      primary_position TEXT NOT NULL,
      secondary_position TEXT,
      prior_team TEXT,
      prior_team_division TEXT,
      notes TEXT,
      group_id INTEGER REFERENCES groups(id) ON DELETE SET NULL,
      team_id INTEGER REFERENCES teams(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Migration: add group_id to players if the DB already existed without it
  await db.execute(
    'ALTER TABLE players ADD COLUMN group_id INTEGER REFERENCES groups(id) ON DELETE SET NULL'
  ).catch(() => {}); // ignore "duplicate column name" if already present
}
