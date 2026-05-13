import { createClient, type Client } from '@libsql/client';
import path from 'path';
import fs from 'fs';

const DB_PATH = path.resolve(__dirname, '../../data/tryout.db');
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
fs.mkdirSync(path.resolve(__dirname, '../../data/images'), { recursive: true });
fs.mkdirSync(path.resolve(__dirname, '../../data/videos'), { recursive: true });

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

  await db.execute(
    'ALTER TABLE activities ADD COLUMN image_id INTEGER REFERENCES activity_images(id) ON DELETE SET NULL'
  ).catch(() => {});
  await db.execute(
    'ALTER TABLE activities ADD COLUMN video_url TEXT'
  ).catch(() => {});
  await db.execute(
    'ALTER TABLE activities ADD COLUMN video_type TEXT'
  ).catch(() => {});

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

    CREATE TABLE IF NOT EXISTS squad_teams (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      name           TEXT NOT NULL,
      description    TEXT,
      source_team_id INTEGER REFERENCES teams(id) ON DELETE SET NULL,
      is_active      INTEGER NOT NULL DEFAULT 1,
      season_label   TEXT,
      created_at     TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at     TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS squad_players (
      id                 INTEGER PRIMARY KEY AUTOINCREMENT,
      squad_team_id      INTEGER NOT NULL REFERENCES squad_teams(id) ON DELETE CASCADE,
      source_player_id   INTEGER REFERENCES players(id) ON DELETE SET NULL,
      name               TEXT NOT NULL,
      primary_position   TEXT,
      secondary_position TEXT,
      jersey_number      TEXT,
      depth_order        INTEGER NOT NULL DEFAULT 0,
      status             TEXT NOT NULL DEFAULT 'active',
      created_at         TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at         TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS formations (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      squad_team_id  INTEGER NOT NULL REFERENCES squad_teams(id) ON DELETE CASCADE,
      name           TEXT NOT NULL,
      formation_code TEXT NOT NULL,
      is_default     INTEGER NOT NULL DEFAULT 0,
      created_at     TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at     TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS formation_slots (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      formation_id    INTEGER NOT NULL REFERENCES formations(id) ON DELETE CASCADE,
      squad_player_id INTEGER REFERENCES squad_players(id) ON DELETE SET NULL,
      slot_label      TEXT NOT NULL,
      role            TEXT NOT NULL,
      x_pct           REAL NOT NULL,
      y_pct           REAL NOT NULL,
      created_at      TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS formation_templates (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT NOT NULL,
      is_builtin INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS formation_template_slots (
      id                    INTEGER PRIMARY KEY AUTOINCREMENT,
      formation_template_id INTEGER NOT NULL REFERENCES formation_templates(id) ON DELETE CASCADE,
      slot_label            TEXT NOT NULL,
      role                  TEXT NOT NULL CHECK(role IN ('starter','first_sub')),
      x_pct                 REAL NOT NULL,
      y_pct                 REAL NOT NULL
    );
  `);

  // Seed built-in formation templates if none exist
  const templateCount = await db.execute('SELECT COUNT(*) as n FROM formation_templates');
  const n = (templateCount.rows[0] as Record<string, unknown>).n as number;
  if (n === 0) {
    const builtins: Array<{ name: string; slots: Array<{ slot_label: string; role: string; x_pct: number; y_pct: number }> }> = [
      {
        name: '4-3-3',
        slots: [
          { slot_label: 'GK',   role: 'starter', x_pct: 50, y_pct: 88 },
          { slot_label: 'LB',   role: 'starter', x_pct: 15, y_pct: 72 },
          { slot_label: 'CB_L', role: 'starter', x_pct: 35, y_pct: 72 },
          { slot_label: 'CB_R', role: 'starter', x_pct: 65, y_pct: 72 },
          { slot_label: 'RB',   role: 'starter', x_pct: 85, y_pct: 72 },
          { slot_label: 'CM_L', role: 'starter', x_pct: 25, y_pct: 50 },
          { slot_label: 'CM',   role: 'starter', x_pct: 50, y_pct: 50 },
          { slot_label: 'CM_R', role: 'starter', x_pct: 75, y_pct: 50 },
          { slot_label: 'LW',   role: 'starter', x_pct: 15, y_pct: 20 },
          { slot_label: 'STR',  role: 'starter', x_pct: 50, y_pct: 15 },
          { slot_label: 'RW',   role: 'starter', x_pct: 85, y_pct: 20 },
          { slot_label: 'SUB1', role: 'first_sub', x_pct: 10, y_pct: 100 },
          { slot_label: 'SUB2', role: 'first_sub', x_pct: 27, y_pct: 100 },
          { slot_label: 'SUB3', role: 'first_sub', x_pct: 44, y_pct: 100 },
          { slot_label: 'SUB4', role: 'first_sub', x_pct: 61, y_pct: 100 },
          { slot_label: 'SUB5', role: 'first_sub', x_pct: 78, y_pct: 100 },
        ],
      },
      {
        name: '4-4-2',
        slots: [
          { slot_label: 'GK',   role: 'starter', x_pct: 50, y_pct: 88 },
          { slot_label: 'LB',   role: 'starter', x_pct: 15, y_pct: 72 },
          { slot_label: 'CB_L', role: 'starter', x_pct: 35, y_pct: 72 },
          { slot_label: 'CB_R', role: 'starter', x_pct: 65, y_pct: 72 },
          { slot_label: 'RB',   role: 'starter', x_pct: 85, y_pct: 72 },
          { slot_label: 'LM',   role: 'starter', x_pct: 15, y_pct: 50 },
          { slot_label: 'CM_L', role: 'starter', x_pct: 37, y_pct: 50 },
          { slot_label: 'CM_R', role: 'starter', x_pct: 63, y_pct: 50 },
          { slot_label: 'RM',   role: 'starter', x_pct: 85, y_pct: 50 },
          { slot_label: 'ST_L', role: 'starter', x_pct: 35, y_pct: 18 },
          { slot_label: 'ST_R', role: 'starter', x_pct: 65, y_pct: 18 },
          { slot_label: 'SUB1', role: 'first_sub', x_pct: 10, y_pct: 100 },
          { slot_label: 'SUB2', role: 'first_sub', x_pct: 27, y_pct: 100 },
          { slot_label: 'SUB3', role: 'first_sub', x_pct: 44, y_pct: 100 },
          { slot_label: 'SUB4', role: 'first_sub', x_pct: 61, y_pct: 100 },
          { slot_label: 'SUB5', role: 'first_sub', x_pct: 78, y_pct: 100 },
        ],
      },
      {
        name: '4-2-3-1',
        slots: [
          { slot_label: 'GK',   role: 'starter', x_pct: 50, y_pct: 88 },
          { slot_label: 'LB',   role: 'starter', x_pct: 15, y_pct: 72 },
          { slot_label: 'CB_L', role: 'starter', x_pct: 35, y_pct: 72 },
          { slot_label: 'CB_R', role: 'starter', x_pct: 65, y_pct: 72 },
          { slot_label: 'RB',   role: 'starter', x_pct: 85, y_pct: 72 },
          { slot_label: 'DM_L', role: 'starter', x_pct: 35, y_pct: 58 },
          { slot_label: 'DM_R', role: 'starter', x_pct: 65, y_pct: 58 },
          { slot_label: 'LAM',  role: 'starter', x_pct: 18, y_pct: 38 },
          { slot_label: 'CAM',  role: 'starter', x_pct: 50, y_pct: 38 },
          { slot_label: 'RAM',  role: 'starter', x_pct: 82, y_pct: 38 },
          { slot_label: 'STR',  role: 'starter', x_pct: 50, y_pct: 15 },
          { slot_label: 'SUB1', role: 'first_sub', x_pct: 10, y_pct: 100 },
          { slot_label: 'SUB2', role: 'first_sub', x_pct: 27, y_pct: 100 },
          { slot_label: 'SUB3', role: 'first_sub', x_pct: 44, y_pct: 100 },
          { slot_label: 'SUB4', role: 'first_sub', x_pct: 61, y_pct: 100 },
          { slot_label: 'SUB5', role: 'first_sub', x_pct: 78, y_pct: 100 },
        ],
      },
      {
        name: '3-5-2',
        slots: [
          { slot_label: 'GK',   role: 'starter', x_pct: 50, y_pct: 88 },
          { slot_label: 'CB_L', role: 'starter', x_pct: 25, y_pct: 72 },
          { slot_label: 'CB',   role: 'starter', x_pct: 50, y_pct: 72 },
          { slot_label: 'CB_R', role: 'starter', x_pct: 75, y_pct: 72 },
          { slot_label: 'LWB',  role: 'starter', x_pct: 10, y_pct: 52 },
          { slot_label: 'CM_L', role: 'starter', x_pct: 30, y_pct: 50 },
          { slot_label: 'CM',   role: 'starter', x_pct: 50, y_pct: 50 },
          { slot_label: 'CM_R', role: 'starter', x_pct: 70, y_pct: 50 },
          { slot_label: 'RWB',  role: 'starter', x_pct: 90, y_pct: 52 },
          { slot_label: 'ST_L', role: 'starter', x_pct: 35, y_pct: 18 },
          { slot_label: 'ST_R', role: 'starter', x_pct: 65, y_pct: 18 },
          { slot_label: 'SUB1', role: 'first_sub', x_pct: 10, y_pct: 100 },
          { slot_label: 'SUB2', role: 'first_sub', x_pct: 27, y_pct: 100 },
          { slot_label: 'SUB3', role: 'first_sub', x_pct: 44, y_pct: 100 },
          { slot_label: 'SUB4', role: 'first_sub', x_pct: 61, y_pct: 100 },
          { slot_label: 'SUB5', role: 'first_sub', x_pct: 78, y_pct: 100 },
        ],
      },
    ];

    for (const tmpl of builtins) {
      const ins = await db.execute({
        sql: "INSERT INTO formation_templates (name, is_builtin) VALUES (?, 1)",
        args: [tmpl.name],
      });
      const tmplId = ins.lastInsertRowid!;
      for (const slot of tmpl.slots) {
        await db.execute({
          sql: 'INSERT INTO formation_template_slots (formation_template_id, slot_label, role, x_pct, y_pct) VALUES (?, ?, ?, ?, ?)',
          args: [tmplId, slot.slot_label, slot.role, slot.x_pct, slot.y_pct],
        });
      }
    }
  }
}
