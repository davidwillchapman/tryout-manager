import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db';
import { validateBody } from '../middleware/validateBody';
import type { BreakdownResponse } from '../types';

const router = Router();

const teamSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  group_id: z.number().int().positive(),
});

const toMap = (rows: { position: unknown; count: unknown }[]) =>
  Object.fromEntries(rows.map((r) => [r.position as string, Number(r.count)]));

const teamSelect = `
  SELECT t.*, g.name as group_name, COUNT(p.id) as player_count
  FROM teams t
  LEFT JOIN groups g ON g.id = t.group_id
  LEFT JOIN players p ON p.team_id = t.id
`;

router.get('/', async (req, res, next) => {
  try {
    const { group_id } = req.query;
    let sql = `${teamSelect} ${group_id ? 'WHERE t.group_id = ?' : ''} GROUP BY t.id ORDER BY g.name, t.name`;
    const args = group_id ? [group_id as string] : [];
    const result = await db.execute({ sql, args });
    res.json(result.rows);
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const result = await db.execute({ sql: `${teamSelect} WHERE t.id = ? GROUP BY t.id`, args: [req.params.id] });
    if (!result.rows[0]) { res.status(404).json({ error: 'Team not found' }); return; }
    res.json(result.rows[0]);
  } catch (err) { next(err); }
});

router.post('/', validateBody(teamSchema), async (req, res, next) => {
  try {
    const { name, description, group_id } = req.body;
    const grp = await db.execute({ sql: 'SELECT id FROM groups WHERE id = ?', args: [group_id] });
    if (!grp.rows[0]) { res.status(400).json({ error: 'Group not found' }); return; }
    const ins = await db.execute({ sql: 'INSERT INTO teams (name, description, group_id) VALUES (?, ?, ?)', args: [name, description ?? null, group_id] });
    const row = await db.execute({ sql: `${teamSelect} WHERE t.id = ? GROUP BY t.id`, args: [ins.lastInsertRowid!] });
    res.status(201).json(row.rows[0]);
  } catch (err) { next(err); }
});

router.put('/:id', validateBody(teamSchema), async (req, res, next) => {
  try {
    const { name, description, group_id } = req.body;
    const existing = await db.execute({ sql: 'SELECT id FROM teams WHERE id = ?', args: [req.params.id] });
    if (!existing.rows[0]) { res.status(404).json({ error: 'Team not found' }); return; }
    const grp = await db.execute({ sql: 'SELECT id FROM groups WHERE id = ?', args: [group_id] });
    if (!grp.rows[0]) { res.status(400).json({ error: 'Group not found' }); return; }
    await db.execute({ sql: 'UPDATE teams SET name = ?, description = ?, group_id = ? WHERE id = ?', args: [name, description ?? null, group_id, req.params.id] });
    const row = await db.execute({ sql: `${teamSelect} WHERE t.id = ? GROUP BY t.id`, args: [req.params.id] });
    res.json(row.rows[0]);
  } catch (err) { next(err); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const existing = await db.execute({ sql: 'SELECT id FROM teams WHERE id = ?', args: [req.params.id] });
    if (!existing.rows[0]) { res.status(404).json({ error: 'Team not found' }); return; }
    await db.execute({ sql: 'DELETE FROM teams WHERE id = ?', args: [req.params.id] });
    res.status(204).send();
  } catch (err) { next(err); }
});

router.get('/:id/players', async (req, res, next) => {
  try {
    const result = await db.execute({
      sql: `SELECT p.*, t.name as team_name, g.name as group_name
            FROM players p
            LEFT JOIN teams t ON t.id = p.team_id
            LEFT JOIN groups g ON g.id = t.group_id
            WHERE p.team_id = ? ORDER BY p.name`,
      args: [req.params.id],
    });
    res.json(result.rows);
  } catch (err) { next(err); }
});

router.get('/:id/breakdown', async (req, res, next) => {
  try {
    const id = req.params.id;
    const [primary, secondary, combined] = await Promise.all([
      db.execute({ sql: 'SELECT primary_position AS position, COUNT(*) AS count FROM players WHERE team_id = ? GROUP BY primary_position', args: [id] }),
      db.execute({ sql: 'SELECT secondary_position AS position, COUNT(*) AS count FROM players WHERE team_id = ? AND secondary_position IS NOT NULL GROUP BY secondary_position', args: [id] }),
      db.execute({ sql: `SELECT position, COUNT(*) AS count FROM (SELECT primary_position AS position FROM players WHERE team_id = ? UNION ALL SELECT secondary_position AS position FROM players WHERE team_id = ? AND secondary_position IS NOT NULL) GROUP BY position`, args: [id, id] }),
    ]);
    const breakdown: BreakdownResponse = {
      primary: toMap(primary.rows),
      secondary: toMap(secondary.rows),
      combined: toMap(combined.rows),
    };
    res.json(breakdown);
  } catch (err) { next(err); }
});

export default router;
