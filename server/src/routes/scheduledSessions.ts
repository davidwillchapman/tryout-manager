import { Router } from 'express';
import { z } from 'zod';
import type { InValue } from '@libsql/client';
import { db } from '../db';
import { validateBody } from '../middleware/validateBody';

const router = Router();

const createSchema = z.object({
  source_session_id: z.number().int(),
  date: z.string(),
});

const patchSchema = z.object({
  date: z.string().optional(),
  title: z.string().optional(),
  game_phase: z.enum([
    'Attacking',
    'Attacking to Defending Transition',
    'Defending',
    'Defending to Attacking Transition',
    'Other',
  ]).optional(),
  overall_objective: z.string().optional(),
  main_principle: z.string().nullable().optional(),
  sub_principle_1: z.string().nullable().optional(),
  sub_principle_2: z.string().nullable().optional(),
  evaluation_status: z.enum(['not_started', 'in_progress', 'complete']).optional(),
  overall_rating: z.number().int().min(1).max(10).nullable().optional(),
  evaluation_notes: z.string().nullable().optional(),
});

const patchActivitySchema = z.object({
  rating: z.number().int().min(1).max(10).nullable().optional(),
  notes: z.string().nullable().optional(),
  title: z.string().optional(),
  summary: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  activity_type: z.string().nullable().optional(),
  duration_minutes: z.number().int().nullable().optional(),
  field_setup: z.string().nullable().optional(),
  coaching_points: z.string().nullable().optional(),
  flexibility_notes: z.string().nullable().optional(),
});

const addPlayerSchema = z.object({
  name: z.string().min(1),
});

const patchPlayerSchema = z.object({
  attendance: z.enum(['attended', 'excused', 'unexcused']).nullable().optional(),
  eval_mark: z.enum(['top', 'bottom']).nullable().optional(),
});

// ─── List scheduled sessions for a team ──────────────────────────────────────
router.get('/teams/:teamId', async (req, res, next) => {
  try {
    const result = await db.execute({
      sql: `SELECT id, date, title, game_phase, overall_objective, evaluation_status, created_at, updated_at
            FROM scheduled_sessions WHERE squad_team_id = ? ORDER BY date ASC`,
      args: [req.params.teamId],
    });
    res.json(result.rows);
  } catch (err) { next(err); }
});

// ─── Create scheduled session (deep copy) ────────────────────────────────────
router.post('/teams/:teamId', validateBody(createSchema), async (req, res, next) => {
  try {
    const { source_session_id, date } = req.body;

    const srcResult = await db.execute({
      sql: 'SELECT * FROM session_plans WHERE id = ?',
      args: [source_session_id],
    });
    if (!srcResult.rows[0]) {
      res.status(404).json({ error: 'Source session not found' });
      return;
    }
    const src = srcResult.rows[0] as Record<string, unknown>;

    const ins = await db.execute({
      sql: `INSERT INTO scheduled_sessions
              (squad_team_id, source_session_id, date, title, game_phase, overall_objective,
               main_principle, sub_principle_1, sub_principle_2)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        req.params.teamId,
        source_session_id,
        date,
        src.title as string,
        src.game_phase as string,
        src.overall_objective as string,
        (src.main_principle as string | null) ?? null,
        (src.sub_principle_1 as string | null) ?? null,
        (src.sub_principle_2 as string | null) ?? null,
      ],
    });
    const newSessionId = ins.lastInsertRowid!;

    // Copy activities
    const acts = await db.execute({
      sql: `SELECT sa.order_index, a.id as act_id, a.title, a.summary, a.description,
              a.activity_type, a.duration_minutes, a.field_setup, a.coaching_points,
              a.flexibility_notes, a.image_id, a.video_url, a.video_type
            FROM session_activities sa
            JOIN activities a ON a.id = sa.activity_id
            WHERE sa.session_id = ?
            ORDER BY sa.order_index ASC, sa.id ASC`,
      args: [source_session_id],
    });
    for (const a of acts.rows) {
      const r = a as Record<string, unknown>;
      await db.execute({
        sql: `INSERT INTO scheduled_session_activities
                (scheduled_session_id, source_activity_id, order_index, title, summary, description,
                 activity_type, duration_minutes, field_setup, coaching_points, flexibility_notes,
                 image_id, video_url, video_type)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          newSessionId, r.act_id as number, r.order_index as number,
          r.title as string, (r.summary as string | null) ?? null, (r.description as string | null) ?? null,
          (r.activity_type as string | null) ?? null, (r.duration_minutes as number | null) ?? null,
          (r.field_setup as string | null) ?? null, (r.coaching_points as string | null) ?? null,
          (r.flexibility_notes as string | null) ?? null,
          (r.image_id as number | null) ?? null, (r.video_url as string | null) ?? null,
          (r.video_type as string | null) ?? null,
        ],
      });
    }

    // Default players from roster
    const players = await db.execute({
      sql: 'SELECT id, name FROM squad_players WHERE squad_team_id = ? ORDER BY depth_order ASC, id ASC',
      args: [req.params.teamId],
    });
    for (const p of players.rows) {
      const r = p as Record<string, unknown>;
      await db.execute({
        sql: `INSERT INTO scheduled_session_players (scheduled_session_id, squad_player_id, name, is_guest)
              VALUES (?, ?, ?, 0)`,
        args: [newSessionId, r.id as number, r.name as string],
      });
    }

    const row = await db.execute({
      sql: 'SELECT * FROM scheduled_sessions WHERE id = ?',
      args: [newSessionId],
    });
    res.status(201).json(row.rows[0]);
  } catch (err) { next(err); }
});

// ─── Get scheduled session detail ────────────────────────────────────────────
router.get('/:id', async (req, res, next) => {
  try {
    const session = await db.execute({
      sql: 'SELECT * FROM scheduled_sessions WHERE id = ?',
      args: [req.params.id],
    });
    if (!session.rows[0]) { res.status(404).json({ error: 'Scheduled session not found' }); return; }

    const activities = await db.execute({
      sql: 'SELECT * FROM scheduled_session_activities WHERE scheduled_session_id = ? ORDER BY order_index ASC, id ASC',
      args: [req.params.id],
    });

    const players = await db.execute({
      sql: 'SELECT * FROM scheduled_session_players WHERE scheduled_session_id = ? ORDER BY id ASC',
      args: [req.params.id],
    });

    res.json({
      ...session.rows[0],
      activities: activities.rows,
      players: players.rows,
    });
  } catch (err) { next(err); }
});

// ─── Patch scheduled session ──────────────────────────────────────────────────
router.patch('/:id', validateBody(patchSchema), async (req, res, next) => {
  try {
    const existing = await db.execute({
      sql: 'SELECT id FROM scheduled_sessions WHERE id = ?',
      args: [req.params.id],
    });
    if (!existing.rows[0]) { res.status(404).json({ error: 'Scheduled session not found' }); return; }

    const fields = req.body as Record<string, unknown>;
    const sets: string[] = [];
    const args: InValue[] = [];
    for (const [k, v] of Object.entries(fields)) {
      sets.push(`${k} = ?`);
      args.push((v ?? null) as InValue);
    }
    sets.push(`updated_at = datetime('now')`);
    args.push(req.params.id);

    await db.execute({ sql: `UPDATE scheduled_sessions SET ${sets.join(', ')} WHERE id = ?`, args });

    const row = await db.execute({ sql: 'SELECT * FROM scheduled_sessions WHERE id = ?', args: [req.params.id] });
    res.json(row.rows[0]);
  } catch (err) { next(err); }
});

// ─── Delete scheduled session ─────────────────────────────────────────────────
router.delete('/:id', async (req, res, next) => {
  try {
    await db.execute({ sql: 'DELETE FROM scheduled_sessions WHERE id = ?', args: [req.params.id] });
    res.status(204).send();
  } catch (err) { next(err); }
});

// ─── Patch scheduled session activity ────────────────────────────────────────
router.patch('/:id/activities/:activityId', validateBody(patchActivitySchema), async (req, res, next) => {
  try {
    const fields = req.body as Record<string, unknown>;
    const sets: string[] = [];
    const args: InValue[] = [];
    for (const [k, v] of Object.entries(fields)) {
      sets.push(`${k} = ?`);
      args.push((v ?? null) as InValue);
    }
    if (sets.length === 0) { res.status(400).json({ error: 'No fields provided' }); return; }
    args.push(req.params.activityId, req.params.id);

    await db.execute({
      sql: `UPDATE scheduled_session_activities SET ${sets.join(', ')} WHERE id = ? AND scheduled_session_id = ?`,
      args,
    });

    const row = await db.execute({
      sql: 'SELECT * FROM scheduled_session_activities WHERE id = ? AND scheduled_session_id = ?',
      args: [req.params.activityId, req.params.id],
    });
    res.json(row.rows[0]);
  } catch (err) { next(err); }
});

// ─── Add guest player ─────────────────────────────────────────────────────────
router.post('/:id/players', validateBody(addPlayerSchema), async (req, res, next) => {
  try {
    const sessionExists = await db.execute({
      sql: 'SELECT id FROM scheduled_sessions WHERE id = ?',
      args: [req.params.id],
    });
    if (!sessionExists.rows[0]) { res.status(404).json({ error: 'Scheduled session not found' }); return; }

    const ins = await db.execute({
      sql: `INSERT INTO scheduled_session_players (scheduled_session_id, name, is_guest) VALUES (?, ?, 1)`,
      args: [req.params.id, req.body.name],
    });
    const row = await db.execute({
      sql: 'SELECT * FROM scheduled_session_players WHERE id = ?',
      args: [ins.lastInsertRowid!],
    });
    res.status(201).json(row.rows[0]);
  } catch (err) { next(err); }
});

// ─── Patch scheduled session player ──────────────────────────────────────────
router.patch('/:id/players/:rowId', validateBody(patchPlayerSchema), async (req, res, next) => {
  try {
    const { attendance, eval_mark } = req.body;

    if (eval_mark !== undefined && eval_mark !== null) {
      const mark = eval_mark as 'top' | 'bottom';
      const limit = mark === 'top' ? 3 : 2;
      const count = await db.execute({
        sql: `SELECT COUNT(*) as cnt FROM scheduled_session_players WHERE scheduled_session_id = ? AND eval_mark = ? AND id != ?`,
        args: [req.params.id, mark, req.params.rowId],
      });
      if ((count.rows[0].cnt as number) >= limit) {
        res.status(400).json({ error: `Maximum ${limit} ${mark} marks allowed` });
        return;
      }
    }

    const sets: string[] = [];
    const args: InValue[] = [];
    if (attendance !== undefined) { sets.push('attendance = ?'); args.push(attendance ?? null); }
    if (eval_mark !== undefined) { sets.push('eval_mark = ?'); args.push(eval_mark ?? null); }
    if (sets.length === 0) { res.status(400).json({ error: 'No fields provided' }); return; }
    args.push(req.params.rowId, req.params.id);

    await db.execute({
      sql: `UPDATE scheduled_session_players SET ${sets.join(', ')} WHERE id = ? AND scheduled_session_id = ?`,
      args,
    });

    const row = await db.execute({
      sql: 'SELECT * FROM scheduled_session_players WHERE id = ? AND scheduled_session_id = ?',
      args: [req.params.rowId, req.params.id],
    });
    res.json(row.rows[0]);
  } catch (err) { next(err); }
});

// ─── Remove player ────────────────────────────────────────────────────────────
router.delete('/:id/players/:rowId', async (req, res, next) => {
  try {
    await db.execute({
      sql: 'DELETE FROM scheduled_session_players WHERE id = ? AND scheduled_session_id = ?',
      args: [req.params.rowId, req.params.id],
    });
    res.status(204).send();
  } catch (err) { next(err); }
});

export default router;
