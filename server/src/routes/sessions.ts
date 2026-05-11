import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db';
import { validateBody } from '../middleware/validateBody';

const router = Router();

const sessionSchema = z.object({
  title: z.string().min(1),
  game_phase: z.enum([
    'Attacking',
    'Attacking to Defending Transition',
    'Defending',
    'Defending to Attacking Transition',
    'Other',
  ]),
  overall_objective: z.string().min(1),
  main_principle: z.string().min(1),
  sub_principle_1: z.string().optional().nullable(),
  sub_principle_2: z.string().optional().nullable(),
});

const addActivitySchema = z.object({
  activity_id: z.number().int(),
});

const reorderSchema = z.object({
  order: z.array(z.number().int()),
});

const patchActivitySchema = z.object({
  activity_id: z.number().int(),
});

// ─── List sessions ────────────────────────────────────────────────────────────
router.get('/', async (_req, res, next) => {
  try {
    const result = await db.execute(`
      SELECT sp.*, COUNT(sa.id) as activity_count
      FROM session_plans sp
      LEFT JOIN session_activities sa ON sa.session_id = sp.id
      GROUP BY sp.id
      ORDER BY sp.updated_at DESC
    `);
    res.json(result.rows);
  } catch (err) { next(err); }
});

// ─── Create session ───────────────────────────────────────────────────────────
router.post('/', validateBody(sessionSchema), async (req, res, next) => {
  try {
    const { title, game_phase, overall_objective, main_principle, sub_principle_1, sub_principle_2 } = req.body;
    const ins = await db.execute({
      sql: `INSERT INTO session_plans (title, game_phase, overall_objective, main_principle, sub_principle_1, sub_principle_2)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [title, game_phase, overall_objective, main_principle, sub_principle_1 ?? null, sub_principle_2 ?? null],
    });
    const row = await db.execute({ sql: 'SELECT * FROM session_plans WHERE id = ?', args: [ins.lastInsertRowid!] });
    res.status(201).json(row.rows[0]);
  } catch (err) { next(err); }
});

// ─── Get session detail ───────────────────────────────────────────────────────
router.get('/:id', async (req, res, next) => {
  try {
    const session = await db.execute({ sql: 'SELECT * FROM session_plans WHERE id = ?', args: [req.params.id] });
    if (!session.rows[0]) { res.status(404).json({ error: 'Session not found' }); return; }

    const acts = await db.execute({
      sql: `SELECT sa.id, sa.order_index,
              a.id as act_id, a.title, a.summary, a.description, a.activity_type,
              a.duration_minutes, a.field_setup, a.coaching_points, a.flexibility_notes,
              a.created_at as act_created_at, a.updated_at as act_updated_at
            FROM session_activities sa
            JOIN activities a ON a.id = sa.activity_id
            WHERE sa.session_id = ?
            ORDER BY sa.order_index ASC, sa.id ASC`,
      args: [req.params.id],
    });

    const activities = acts.rows.map((r) => ({
      id: r.id,
      order_index: r.order_index,
      activity: {
        id: r.act_id,
        title: r.title,
        summary: r.summary,
        description: r.description,
        activity_type: r.activity_type,
        duration_minutes: r.duration_minutes,
        field_setup: r.field_setup,
        coaching_points: r.coaching_points,
        flexibility_notes: r.flexibility_notes,
        created_at: r.act_created_at,
        updated_at: r.act_updated_at,
      },
    }));

    res.json({ ...session.rows[0], activities });
  } catch (err) { next(err); }
});

// ─── Update session metadata ──────────────────────────────────────────────────
router.put('/:id', validateBody(sessionSchema), async (req, res, next) => {
  try {
    const existing = await db.execute({ sql: 'SELECT id FROM session_plans WHERE id = ?', args: [req.params.id] });
    if (!existing.rows[0]) { res.status(404).json({ error: 'Session not found' }); return; }
    const { title, game_phase, overall_objective, main_principle, sub_principle_1, sub_principle_2 } = req.body;
    await db.execute({
      sql: `UPDATE session_plans SET title=?, game_phase=?, overall_objective=?, main_principle=?,
            sub_principle_1=?, sub_principle_2=?, updated_at=datetime('now') WHERE id=?`,
      args: [title, game_phase, overall_objective, main_principle, sub_principle_1 ?? null, sub_principle_2 ?? null, req.params.id],
    });
    const row = await db.execute({ sql: 'SELECT * FROM session_plans WHERE id = ?', args: [req.params.id] });
    res.json(row.rows[0]);
  } catch (err) { next(err); }
});

// ─── Delete session ───────────────────────────────────────────────────────────
router.delete('/:id', async (req, res, next) => {
  try {
    const existing = await db.execute({ sql: 'SELECT id FROM session_plans WHERE id = ?', args: [req.params.id] });
    if (!existing.rows[0]) { res.status(404).json({ error: 'Session not found' }); return; }
    await db.execute({ sql: 'DELETE FROM session_plans WHERE id = ?', args: [req.params.id] });
    res.status(204).send();
  } catch (err) { next(err); }
});

// ─── Add activity to session ──────────────────────────────────────────────────
router.post('/:id/activities', validateBody(addActivitySchema), async (req, res, next) => {
  try {
    const sessionExists = await db.execute({ sql: 'SELECT id FROM session_plans WHERE id = ?', args: [req.params.id] });
    if (!sessionExists.rows[0]) { res.status(404).json({ error: 'Session not found' }); return; }

    const count = await db.execute({
      sql: 'SELECT COUNT(*) as cnt FROM session_activities WHERE session_id = ?',
      args: [req.params.id],
    });
    if ((count.rows[0].cnt as number) >= 6) {
      res.status(400).json({ error: 'Session already has the maximum of 6 activities' });
      return;
    }

    const { activity_id } = req.body;
    const maxOrder = await db.execute({
      sql: 'SELECT COALESCE(MAX(order_index), -1) as max_idx FROM session_activities WHERE session_id = ?',
      args: [req.params.id],
    });
    const nextOrder = (maxOrder.rows[0].max_idx as number) + 1;

    const ins = await db.execute({
      sql: 'INSERT INTO session_activities (session_id, activity_id, order_index) VALUES (?, ?, ?)',
      args: [req.params.id, activity_id, nextOrder],
    });

    const row = await db.execute({
      sql: `SELECT sa.id, sa.order_index,
              a.id as act_id, a.title, a.summary, a.description, a.activity_type,
              a.duration_minutes, a.field_setup, a.coaching_points, a.flexibility_notes,
              a.created_at as act_created_at, a.updated_at as act_updated_at
            FROM session_activities sa
            JOIN activities a ON a.id = sa.activity_id
            WHERE sa.id = ?`,
      args: [ins.lastInsertRowid!],
    });

    const r = row.rows[0] as Record<string, unknown>;
    res.status(201).json({
      id: r.id,
      order_index: r.order_index,
      activity: {
        id: r.act_id, title: r.title, summary: r.summary, description: r.description,
        activity_type: r.activity_type, duration_minutes: r.duration_minutes,
        field_setup: r.field_setup, coaching_points: r.coaching_points,
        flexibility_notes: r.flexibility_notes,
        created_at: r.act_created_at, updated_at: r.act_updated_at,
      },
    });
  } catch (err) { next(err); }
});

// ─── Remove activity from session ────────────────────────────────────────────
router.delete('/:id/activities/:saId', async (req, res, next) => {
  try {
    await db.execute({
      sql: 'DELETE FROM session_activities WHERE id = ? AND session_id = ?',
      args: [req.params.saId, req.params.id],
    });
    res.status(204).send();
  } catch (err) { next(err); }
});

// ─── Reorder activities ───────────────────────────────────────────────────────
router.put('/:id/activities/reorder', validateBody(reorderSchema), async (req, res, next) => {
  try {
    const { order } = req.body as { order: number[] };
    for (let i = 0; i < order.length; i++) {
      await db.execute({
        sql: 'UPDATE session_activities SET order_index = ? WHERE id = ? AND session_id = ?',
        args: [i, order[i], req.params.id],
      });
    }
    res.status(204).send();
  } catch (err) { next(err); }
});

// ─── Patch session activity (relink to a different activity) ──────────────────
router.patch('/:id/activities/:saId', validateBody(patchActivitySchema), async (req, res, next) => {
  try {
    const { activity_id } = req.body;
    await db.execute({
      sql: 'UPDATE session_activities SET activity_id = ? WHERE id = ? AND session_id = ?',
      args: [activity_id, req.params.saId, req.params.id],
    });

    const row = await db.execute({
      sql: `SELECT sa.id, sa.order_index,
              a.id as act_id, a.title, a.summary, a.description, a.activity_type,
              a.duration_minutes, a.field_setup, a.coaching_points, a.flexibility_notes,
              a.created_at as act_created_at, a.updated_at as act_updated_at
            FROM session_activities sa
            JOIN activities a ON a.id = sa.activity_id
            WHERE sa.id = ?`,
      args: [req.params.saId],
    });

    const r = row.rows[0] as Record<string, unknown>;
    res.json({
      id: r.id,
      order_index: r.order_index,
      activity: {
        id: r.act_id, title: r.title, summary: r.summary, description: r.description,
        activity_type: r.activity_type, duration_minutes: r.duration_minutes,
        field_setup: r.field_setup, coaching_points: r.coaching_points,
        flexibility_notes: r.flexibility_notes,
        created_at: r.act_created_at, updated_at: r.act_updated_at,
      },
    });
  } catch (err) { next(err); }
});

export default router;
