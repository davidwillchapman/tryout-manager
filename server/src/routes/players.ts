import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db';
import { validateBody } from '../middleware/validateBody';

const router = Router();

const playerSchema = z.object({
  name: z.string().min(1),
  primary_position: z.string().min(1),
  secondary_position: z.string().optional().nullable(),
  prior_team: z.string().optional().nullable(),
  prior_team_division: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  group_id: z.number().int().positive().optional().nullable(),
  team_id: z.number().int().positive().optional().nullable(),
});

// group_name now comes directly from player's own group_id, not through team
const baseSelect = `
  SELECT p.*, g.name as group_name, t.name as team_name
  FROM players p
  LEFT JOIN groups g ON g.id = p.group_id
  LEFT JOIN teams t ON t.id = p.team_id
`;

router.get('/', async (req, res, next) => {
  try {
    const { search, primary_position, group_id, team_id } = req.query;
    const conditions: string[] = [];
    const args: unknown[] = [];

    if (search) { conditions.push('p.name LIKE ?'); args.push(`%${search}%`); }
    if (primary_position) { conditions.push('p.primary_position = ?'); args.push(primary_position); }
    if (group_id === 'unassigned') {
      conditions.push('p.group_id IS NULL');
    } else if (group_id) {
      conditions.push('p.group_id = ?'); args.push(group_id);
    }
    if (team_id === 'unassigned') {
      conditions.push('p.team_id IS NULL');
    } else if (team_id) {
      conditions.push('p.team_id = ?'); args.push(team_id);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await db.execute({ sql: `${baseSelect} ${where} ORDER BY p.name`, args });
    res.json(result.rows);
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const result = await db.execute({ sql: `${baseSelect} WHERE p.id = ?`, args: [req.params.id] });
    if (!result.rows[0]) { res.status(404).json({ error: 'Player not found' }); return; }
    res.json(result.rows[0]);
  } catch (err) { next(err); }
});

router.post('/', validateBody(playerSchema), async (req, res, next) => {
  try {
    const { name, primary_position, secondary_position, prior_team, prior_team_division, notes, group_id, team_id } = req.body;
    if (group_id) {
      const g = await db.execute({ sql: 'SELECT id FROM groups WHERE id = ?', args: [group_id] });
      if (!g.rows[0]) { res.status(400).json({ error: 'Group not found' }); return; }
    }
    if (team_id) {
      const t = await db.execute({ sql: 'SELECT id FROM teams WHERE id = ?', args: [team_id] });
      if (!t.rows[0]) { res.status(400).json({ error: 'Team not found' }); return; }
    }
    const ins = await db.execute({
      sql: 'INSERT INTO players (name, primary_position, secondary_position, prior_team, prior_team_division, notes, group_id, team_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      args: [name, primary_position, secondary_position ?? null, prior_team ?? null, prior_team_division ?? null, notes ?? null, group_id ?? null, team_id ?? null],
    });
    const row = await db.execute({ sql: `${baseSelect} WHERE p.id = ?`, args: [ins.lastInsertRowid!] });
    res.status(201).json(row.rows[0]);
  } catch (err) { next(err); }
});

router.put('/:id', validateBody(playerSchema), async (req, res, next) => {
  try {
    const existing = await db.execute({ sql: 'SELECT id FROM players WHERE id = ?', args: [req.params.id] });
    if (!existing.rows[0]) { res.status(404).json({ error: 'Player not found' }); return; }
    const { name, primary_position, secondary_position, prior_team, prior_team_division, notes, group_id, team_id } = req.body;
    if (group_id) {
      const g = await db.execute({ sql: 'SELECT id FROM groups WHERE id = ?', args: [group_id] });
      if (!g.rows[0]) { res.status(400).json({ error: 'Group not found' }); return; }
    }
    if (team_id) {
      const t = await db.execute({ sql: 'SELECT id FROM teams WHERE id = ?', args: [team_id] });
      if (!t.rows[0]) { res.status(400).json({ error: 'Team not found' }); return; }
    }
    await db.execute({
      sql: 'UPDATE players SET name = ?, primary_position = ?, secondary_position = ?, prior_team = ?, prior_team_division = ?, notes = ?, group_id = ?, team_id = ? WHERE id = ?',
      args: [name, primary_position, secondary_position ?? null, prior_team ?? null, prior_team_division ?? null, notes ?? null, group_id ?? null, team_id ?? null, req.params.id],
    });
    const row = await db.execute({ sql: `${baseSelect} WHERE p.id = ?`, args: [req.params.id] });
    res.json(row.rows[0]);
  } catch (err) { next(err); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const existing = await db.execute({ sql: 'SELECT id FROM players WHERE id = ?', args: [req.params.id] });
    if (!existing.rows[0]) { res.status(404).json({ error: 'Player not found' }); return; }
    await db.execute({ sql: 'DELETE FROM players WHERE id = ?', args: [req.params.id] });
    res.status(204).send();
  } catch (err) { next(err); }
});

router.patch('/:id/group', async (req, res, next) => {
  try {
    const existing = await db.execute({ sql: 'SELECT id FROM players WHERE id = ?', args: [req.params.id] });
    if (!existing.rows[0]) { res.status(404).json({ error: 'Player not found' }); return; }
    const { group_id } = req.body;
    if (group_id != null) {
      const g = await db.execute({ sql: 'SELECT id FROM groups WHERE id = ?', args: [group_id] });
      if (!g.rows[0]) { res.status(400).json({ error: 'Group not found' }); return; }
    }
    // Clearing the group also clears the team assignment
    const clearTeam = group_id == null;
    await db.execute({
      sql: `UPDATE players SET group_id = ?${clearTeam ? ', team_id = NULL' : ''} WHERE id = ?`,
      args: [group_id ?? null, req.params.id],
    });
    const row = await db.execute({ sql: `${baseSelect} WHERE p.id = ?`, args: [req.params.id] });
    res.json(row.rows[0]);
  } catch (err) { next(err); }
});

router.patch('/:id/team', async (req, res, next) => {
  try {
    const existing = await db.execute({ sql: 'SELECT id FROM players WHERE id = ?', args: [req.params.id] });
    if (!existing.rows[0]) { res.status(404).json({ error: 'Player not found' }); return; }
    const { team_id } = req.body;
    if (team_id != null) {
      const t = await db.execute({ sql: 'SELECT id FROM teams WHERE id = ?', args: [team_id] });
      if (!t.rows[0]) { res.status(400).json({ error: 'Team not found' }); return; }
    }
    await db.execute({ sql: 'UPDATE players SET team_id = ? WHERE id = ?', args: [team_id ?? null, req.params.id] });
    const row = await db.execute({ sql: `${baseSelect} WHERE p.id = ?`, args: [req.params.id] });
    res.json(row.rows[0]);
  } catch (err) { next(err); }
});

export default router;
