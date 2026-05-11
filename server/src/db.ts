import { createClient, type Client } from '@libsql/client';
import path from 'path';
import fs from 'fs';

const DB_PATH = path.resolve(__dirname, '../../data/tryout.db');
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
fs.mkdirSync(path.resolve(__dirname, '../../data/images'), { recursive: true });

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
  ).catch(() => {});

  // Migration: add team_order for ranking players within a team
  await db.execute(
    'ALTER TABLE players ADD COLUMN team_order INTEGER'
  ).catch(() => {});

  await db.executeMultiple(`
    CREATE TABLE IF NOT EXISTS league_seasons (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT NOT NULL,
      year        INTEGER NOT NULL,
      description TEXT,
      source_url  TEXT,
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS league_divisions (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      season_id   INTEGER NOT NULL REFERENCES league_seasons(id) ON DELETE CASCADE,
      name        TEXT NOT NULL,
      age_group   TEXT,
      gender      TEXT,
      division    TEXT,
      source_url  TEXT,
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS league_standings (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      division_id   INTEGER NOT NULL REFERENCES league_divisions(id) ON DELETE CASCADE,
      team_name     TEXT NOT NULL,
      points        INTEGER DEFAULT 0,
      games_played  INTEGER DEFAULT 0,
      wins          INTEGER DEFAULT 0,
      losses        INTEGER DEFAULT 0,
      ties          INTEGER DEFAULT 0,
      goals_for     INTEGER DEFAULT 0,
      goals_against INTEGER DEFAULT 0,
      finish_place  INTEGER,
      created_at    TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS frameworks (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT NOT NULL,
      source      TEXT,
      version     TEXT,
      description TEXT,
      created_at  TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS framework_sections (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      framework_id INTEGER NOT NULL REFERENCES frameworks(id) ON DELETE CASCADE,
      parent_id    INTEGER REFERENCES framework_sections(id) ON DELETE CASCADE,
      title        TEXT NOT NULL,
      content      TEXT,
      order_index  INTEGER NOT NULL DEFAULT 0,
      created_at   TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS activities (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      title             TEXT NOT NULL,
      summary           TEXT NOT NULL,
      description       TEXT NOT NULL,
      activity_type     TEXT,
      duration_minutes  INTEGER,
      field_setup       TEXT,
      coaching_points   TEXT,
      flexibility_notes TEXT,
      created_at        TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS activity_framework_tags (
      id                       INTEGER PRIMARY KEY AUTOINCREMENT,
      activity_id              INTEGER NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
      framework_id             INTEGER NOT NULL REFERENCES frameworks(id) ON DELETE CASCADE,
      phase_section_id         INTEGER REFERENCES framework_sections(id) ON DELETE SET NULL,
      principle_section_id     INTEGER REFERENCES framework_sections(id) ON DELETE SET NULL,
      sub_principle_section_id INTEGER REFERENCES framework_sections(id) ON DELETE SET NULL,
      created_at               TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS activity_references (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      activity_id INTEGER NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
      url         TEXT NOT NULL,
      label       TEXT,
      order_index INTEGER NOT NULL DEFAULT 0,
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS activity_progressions (
      id                      INTEGER PRIMARY KEY AUTOINCREMENT,
      activity_id             INTEGER NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
      progression_activity_id INTEGER NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
      created_at              TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(activity_id, progression_activity_id)
    );

    CREATE TABLE IF NOT EXISTS activity_images (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      filename      TEXT NOT NULL,
      original_name TEXT,
      mime_type     TEXT,
      created_at    TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  await db.executeMultiple(`
    CREATE TABLE IF NOT EXISTS session_plans (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      title             TEXT NOT NULL,
      game_phase        TEXT NOT NULL,
      overall_objective TEXT NOT NULL,
      main_principle    TEXT NOT NULL,
      sub_principle_1   TEXT,
      sub_principle_2   TEXT,
      created_at        TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS session_activities (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id   INTEGER NOT NULL REFERENCES session_plans(id) ON DELETE CASCADE,
      activity_id  INTEGER NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
      order_index  INTEGER NOT NULL DEFAULT 0,
      created_at   TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}
