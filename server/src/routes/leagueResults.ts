import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db';
import { validateBody } from '../middleware/validateBody';
import { scrapeLeague } from '../lib/leagueScraper';

const router = Router();

// ─── Schemas ──────────────────────────────────────────────────────────────────

const seasonSchema = z.object({
  name: z.string().min(1),
  year: z.number().int().min(1900).max(2100),
  description: z.string().optional().nullable(),
  source_url: z.string().optional().nullable(),
});

const divisionSchema = z.object({
  name: z.string().min(1),
  age_group: z.string().optional().nullable(),
  gender: z.string().optional().nullable(),
  division: z.string().optional().nullable(),
  source_url: z.string().optional().nullable(),
});

const standingSchema = z.object({
  team_name: z.string().min(1),
  points: z.number().int().default(0),
  games_played: z.number().int().default(0),
  wins: z.number().int().default(0),
  losses: z.number().int().default(0),
  ties: z.number().int().default(0),
  goals_for: z.number().int().default(0),
  goals_against: z.number().int().default(0),
  finish_place: z.number().int().optional().nullable(),
});

const importBodySchema = z.object({
  source_url: z.string().optional().nullable(),
});

// ─── Seasons ──────────────────────────────────────────────────────────────────

router.get('/seasons', async (_req, res, next) => {
  try {
    const result = await db.execute(`
      SELECT s.*, COUNT(d.id) AS division_count
      FROM league_seasons s
      LEFT JOIN league_divisions d ON d.season_id = s.id
      GROUP BY s.id
      ORDER BY s.year DESC, s.name
    `);
    res.json(result.rows);
  } catch (err) { next(err); }
});

router.get('/seasons/:id', async (req, res, next) => {
  try {
    const result = await db.execute({
      sql: 'SELECT * FROM league_seasons WHERE id = ?',
      args: [req.params.id],
    });
    if (!result.rows[0]) { res.status(404).json({ error: 'Season not found' }); return; }
    res.json(result.rows[0]);
  } catch (err) { next(err); }
});

router.post('/seasons', validateBody(seasonSchema), async (req, res, next) => {
  try {
    const { name, year, description, source_url } = req.body;
    const ins = await db.execute({
      sql: 'INSERT INTO league_seasons (name, year, description, source_url) VALUES (?, ?, ?, ?)',
      args: [name, year, description ?? null, source_url ?? null],
    });
    const row = await db.execute({
      sql: 'SELECT * FROM league_seasons WHERE id = ?',
      args: [ins.lastInsertRowid!],
    });
    res.status(201).json(row.rows[0]);
  } catch (err) { next(err); }
});

router.put('/seasons/:id', validateBody(seasonSchema), async (req, res, next) => {
  try {
    const { name, year, description, source_url } = req.body;
    const existing = await db.execute({ sql: 'SELECT id FROM league_seasons WHERE id = ?', args: [req.params.id] });
    if (!existing.rows[0]) { res.status(404).json({ error: 'Season not found' }); return; }
    await db.execute({
      sql: 'UPDATE league_seasons SET name = ?, year = ?, description = ?, source_url = ? WHERE id = ?',
      args: [name, year, description ?? null, source_url ?? null, req.params.id],
    });
    const row = await db.execute({ sql: 'SELECT * FROM league_seasons WHERE id = ?', args: [req.params.id] });
    res.json(row.rows[0]);
  } catch (err) { next(err); }
});

router.delete('/seasons/:id', async (req, res, next) => {
  try {
    const existing = await db.execute({ sql: 'SELECT id FROM league_seasons WHERE id = ?', args: [req.params.id] });
    if (!existing.rows[0]) { res.status(404).json({ error: 'Season not found' }); return; }
    await db.execute({ sql: 'DELETE FROM league_seasons WHERE id = ?', args: [req.params.id] });
    res.status(204).send();
  } catch (err) { next(err); }
});

// ─── Import (scrape) ──────────────────────────────────────────────────────────

router.post('/seasons/:id/import', validateBody(importBodySchema), async (req, res, next) => {
  try {
    const seasonRow = await db.execute({ sql: 'SELECT * FROM league_seasons WHERE id = ?', args: [req.params.id] });
    if (!seasonRow.rows[0]) { res.status(404).json({ error: 'Season not found' }); return; }

    const season = seasonRow.rows[0] as unknown as { id: number; source_url: string | null };
    const overrideUrl: string | null = req.body.source_url ?? null;
    const urlToUse = overrideUrl ?? season.source_url;

    if (!urlToUse) {
      res.status(400).json({ error: 'No source_url provided and none stored on season.' });
      return;
    }

    if (overrideUrl && overrideUrl !== season.source_url) {
      await db.execute({
        sql: 'UPDATE league_seasons SET source_url = ? WHERE id = ?',
        args: [overrideUrl, req.params.id],
      });
    }

    const summary = await scrapeLeague(Number(req.params.id), urlToUse);
    res.json(summary);
  } catch (err) { next(err); }
});

// ─── Divisions ────────────────────────────────────────────────────────────────

router.get('/seasons/:seasonId/divisions', async (req, res, next) => {
  try {
    const result = await db.execute({
      sql: `SELECT d.*, COUNT(s.id) AS team_count
            FROM league_divisions d
            LEFT JOIN league_standings s ON s.division_id = d.id
            WHERE d.season_id = ?
            GROUP BY d.id
            ORDER BY d.gender, d.age_group, d.name`,
      args: [req.params.seasonId],
    });
    res.json(result.rows);
  } catch (err) { next(err); }
});

router.get('/divisions/:id', async (req, res, next) => {
  try {
    const result = await db.execute({ sql: 'SELECT * FROM league_divisions WHERE id = ?', args: [req.params.id] });
    if (!result.rows[0]) { res.status(404).json({ error: 'Division not found' }); return; }
    res.json(result.rows[0]);
  } catch (err) { next(err); }
});

router.post('/seasons/:seasonId/divisions', validateBody(divisionSchema), async (req, res, next) => {
  try {
    const { name, age_group, gender, division, source_url } = req.body;
    const ins = await db.execute({
      sql: 'INSERT INTO league_divisions (season_id, name, age_group, gender, division, source_url) VALUES (?, ?, ?, ?, ?, ?)',
      args: [req.params.seasonId, name, age_group ?? null, gender ?? null, division ?? null, source_url ?? null],
    });
    const row = await db.execute({ sql: 'SELECT * FROM league_divisions WHERE id = ?', args: [ins.lastInsertRowid!] });
    res.status(201).json(row.rows[0]);
  } catch (err) { next(err); }
});

router.put('/divisions/:id', validateBody(divisionSchema), async (req, res, next) => {
  try {
    const { name, age_group, gender, division, source_url } = req.body;
    const existing = await db.execute({ sql: 'SELECT id FROM league_divisions WHERE id = ?', args: [req.params.id] });
    if (!existing.rows[0]) { res.status(404).json({ error: 'Division not found' }); return; }
    await db.execute({
      sql: 'UPDATE league_divisions SET name = ?, age_group = ?, gender = ?, division = ?, source_url = ? WHERE id = ?',
      args: [name, age_group ?? null, gender ?? null, division ?? null, source_url ?? null, req.params.id],
    });
    const row = await db.execute({ sql: 'SELECT * FROM league_divisions WHERE id = ?', args: [req.params.id] });
    res.json(row.rows[0]);
  } catch (err) { next(err); }
});

router.delete('/divisions/:id', async (req, res, next) => {
  try {
    const existing = await db.execute({ sql: 'SELECT id FROM league_divisions WHERE id = ?', args: [req.params.id] });
    if (!existing.rows[0]) { res.status(404).json({ error: 'Division not found' }); return; }
    await db.execute({ sql: 'DELETE FROM league_divisions WHERE id = ?', args: [req.params.id] });
    res.status(204).send();
  } catch (err) { next(err); }
});

// ─── Standings ────────────────────────────────────────────────────────────────

router.get('/divisions/:divisionId/standings', async (req, res, next) => {
  try {
    const result = await db.execute({
      sql: `SELECT * FROM league_standings
            WHERE division_id = ?
            ORDER BY points DESC, (goals_for - goals_against) DESC, wins DESC`,
      args: [req.params.divisionId],
    });
    res.json(result.rows);
  } catch (err) { next(err); }
});

router.post('/divisions/:divisionId/standings', validateBody(standingSchema), async (req, res, next) => {
  try {
    const { team_name, points, games_played, wins, losses, ties, goals_for, goals_against, finish_place } = req.body;
    const ins = await db.execute({
      sql: `INSERT INTO league_standings
              (division_id, team_name, points, games_played, wins, losses, ties, goals_for, goals_against, finish_place)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [req.params.divisionId, team_name, points, games_played, wins, losses, ties, goals_for, goals_against, finish_place ?? null],
    });
    const row = await db.execute({ sql: 'SELECT * FROM league_standings WHERE id = ?', args: [ins.lastInsertRowid!] });
    res.status(201).json(row.rows[0]);
  } catch (err) { next(err); }
});

router.put('/standings/:id', validateBody(standingSchema), async (req, res, next) => {
  try {
    const { team_name, points, games_played, wins, losses, ties, goals_for, goals_against, finish_place } = req.body;
    const existing = await db.execute({ sql: 'SELECT id FROM league_standings WHERE id = ?', args: [req.params.id] });
    if (!existing.rows[0]) { res.status(404).json({ error: 'Standing not found' }); return; }
    await db.execute({
      sql: `UPDATE league_standings
            SET team_name = ?, points = ?, games_played = ?, wins = ?, losses = ?, ties = ?,
                goals_for = ?, goals_against = ?, finish_place = ?
            WHERE id = ?`,
      args: [team_name, points, games_played, wins, losses, ties, goals_for, goals_against, finish_place ?? null, req.params.id],
    });
    const row = await db.execute({ sql: 'SELECT * FROM league_standings WHERE id = ?', args: [req.params.id] });
    res.json(row.rows[0]);
  } catch (err) { next(err); }
});

router.delete('/standings/:id', async (req, res, next) => {
  try {
    const existing = await db.execute({ sql: 'SELECT id FROM league_standings WHERE id = ?', args: [req.params.id] });
    if (!existing.rows[0]) { res.status(404).json({ error: 'Standing not found' }); return; }
    await db.execute({ sql: 'DELETE FROM league_standings WHERE id = ?', args: [req.params.id] });
    res.status(204).send();
  } catch (err) { next(err); }
});

export default router;
