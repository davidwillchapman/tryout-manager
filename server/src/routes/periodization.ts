import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db';
import { validateBody } from '../middleware/validateBody';

const router = Router();

const updateSchema = z.object({
  content: z.string(),
});

// ─── Get periodization plan for a team ───────────────────────────────────────
router.get('/teams/:teamId', async (req, res, next) => {
  try {
    const result = await db.execute({
      sql: 'SELECT * FROM periodization_plans WHERE squad_team_id = ?',
      args: [req.params.teamId],
    });
    if (result.rows[0]) {
      res.json(result.rows[0]);
    } else {
      res.json({ squad_team_id: Number(req.params.teamId), content: '' });
    }
  } catch (err) { next(err); }
});

// ─── Upsert periodization plan ────────────────────────────────────────────────
router.put('/teams/:teamId', validateBody(updateSchema), async (req, res, next) => {
  try {
    const { content } = req.body;
    const existing = await db.execute({
      sql: 'SELECT id FROM periodization_plans WHERE squad_team_id = ?',
      args: [req.params.teamId],
    });
    if (existing.rows[0]) {
      await db.execute({
        sql: `UPDATE periodization_plans SET content = ?, updated_at = datetime('now') WHERE squad_team_id = ?`,
        args: [content, req.params.teamId],
      });
    } else {
      await db.execute({
        sql: 'INSERT INTO periodization_plans (squad_team_id, content) VALUES (?, ?)',
        args: [req.params.teamId, content],
      });
    }
    const row = await db.execute({
      sql: 'SELECT * FROM periodization_plans WHERE squad_team_id = ?',
      args: [req.params.teamId],
    });
    res.json(row.rows[0]);
  } catch (err) { next(err); }
});

export default router;
