import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db';
import { validateBody } from '../middleware/validateBody';
import type { BreakdownResponse } from '../types';

const router = Router();

const groupSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().nullable(),
});

router.get('/', async (_req, res, next) => {
  try {
    const result = await db.execute(`
      SELECT g.*, COUNT(t.id) as team_count
      FROM groups g
      LEFT JOIN teams t ON t.group_id = g.id
      GROUP BY g.id ORDER BY g.name
    `);
    res.json(result.rows);
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const result = await db.execute({ sql: 'SELECT * FROM groups WHERE id = ?', args: [req.params.id] });
    if (!result.rows[0]) { res.status(404).json({ error: 'Group not found' }); return; }
    res.json(result.rows[0]);
  } catch (err) { next(err); }
});

router.post('/', validateBody(groupSchema), async (req, res, next) => {
  try {
    const { name, description } = req.body;
    const ins = await db.execute({ sql: 'INSERT INTO groups (name, description) VALUES (?, ?)', args: [name, description ?? null] });
    const row = await db.execute({ sql: 'SELECT * FROM groups WHERE id = ?', args: [ins.lastInsertRowid!] });
    res.status(201).json(row.rows[0]);
  } catch (err) { next(err); }
});

router.put('/:id', validateBody(groupSchema), async (req, res, next) => {
  try {
    const { name, description } = req.body;
    const existing = await db.execute({ sql: 'SELECT id FROM groups WHERE id = ?', args: [req.params.id] });
    if (!existing.rows[0]) { res.status(404).json({ error: 'Group not found' }); return; }
    await db.execute({ sql: 'UPDATE groups SET name = ?, description = ? WHERE id = ?', args: [name, description ?? null, req.params.id] });
    const row = await db.execute({ sql: 'SELECT * FROM groups WHERE id = ?', args: [req.params.id] });
    res.json(row.rows[0]);
  } catch (err) { next(err); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const existing = await db.execute({ sql: 'SELECT id FROM groups WHERE id = ?', args: [req.params.id] });
    if (!existing.rows[0]) { res.status(404).json({ error: 'Group not found' }); return; }
    await db.execute({ sql: 'DELETE FROM groups WHERE id = ?', args: [req.params.id] });
    res.status(204).send();
  } catch (err) { next(err); }
});

router.get('/:id/teams', async (req, res, next) => {
  try {
    const result = await db.execute({ sql: 'SELECT * FROM teams WHERE group_id = ? ORDER BY name', args: [req.params.id] });
    res.json(result.rows);
  } catch (err) { next(err); }
});

router.get('/:id/players', async (req, res, next) => {
  try {
    const result = await db.execute({
      sql: `SELECT p.*, g.name as group_name, t.name as team_name
            FROM players p
            LEFT JOIN groups g ON g.id = p.group_id
            LEFT JOIN teams t ON t.id = p.team_id
            WHERE p.group_id = ? ORDER BY p.name`,
      args: [req.params.id],
    });
    res.json(result.rows);
  } catch (err) { next(err); }
});

router.get('/:id/breakdown', async (req, res, next) => {
  try {
    const id = req.params.id;
    // Breakdown counts ALL players in the group (by group_id), including those without a team
    const inGroup = 'WHERE group_id = ?';

    const toMap = (rows: { position: unknown; count: unknown }[]) =>
      Object.fromEntries(rows.map((r) => [r.position as string, Number(r.count)]));

    const [primary, secondary, combined] = await Promise.all([
      db.execute({ sql: `SELECT primary_position AS position, COUNT(*) AS count FROM players ${inGroup} GROUP BY primary_position`, args: [id] }),
      db.execute({ sql: `SELECT secondary_position AS position, COUNT(*) AS count FROM players ${inGroup} AND secondary_position IS NOT NULL GROUP BY secondary_position`, args: [id] }),
      db.execute({ sql: `SELECT position, COUNT(*) AS count FROM (SELECT primary_position AS position FROM players ${inGroup} UNION ALL SELECT secondary_position AS position FROM players ${inGroup} AND secondary_position IS NOT NULL) GROUP BY position`, args: [id, id, id] }),
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
