import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db';
import { validateBody } from '../middleware/validateBody';

const router = Router();

// ─── Formation slot templates ─────────────────────────────────────────────────
type SlotTemplate = { slot_label: string; role: 'starter' | 'first_sub'; x_pct: number; y_pct: number };

const FORMATION_TEMPLATES: Record<string, SlotTemplate[]> = {
  '4-3-3': [
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
  '4-4-2': [
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
  '4-2-3-1': [
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
  '3-5-2': [
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
};

// ─── Zod schemas ──────────────────────────────────────────────────────────────
const squadTeamSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  season_label: z.string().optional().nullable(),
});

const squadPlayerSchema = z.object({
  name: z.string().min(1),
  primary_position: z.string().optional().nullable(),
  secondary_position: z.string().optional().nullable(),
  jersey_number: z.string().optional().nullable(),
  depth_order: z.number().int().optional(),
  status: z.enum(['active', 'inactive', 'injured']).optional(),
});

const depthOrderSchema = z.array(z.object({
  id: z.number().int(),
  depth_order: z.number().int(),
}));

const formationSchema = z.object({
  name: z.string().min(1),
  template_id: z.number().int().optional(),
  formation_code: z.string().optional(),
});

const templateSlotSchema = z.object({
  slot_label: z.string().min(1),
  role: z.enum(['starter', 'first_sub']),
  x_pct: z.number(),
  y_pct: z.number(),
});

const templateCreateSchema = z.object({
  name: z.string().min(1),
  slots: z.array(templateSlotSchema).min(1),
});

const slotPositionsSchema = z.array(z.object({
  slot_id: z.number().int(),
  x_pct: z.number(),
  y_pct: z.number(),
}));

const slotAssignmentsSchema = z.array(z.object({
  slot_id: z.number().int(),
  squad_player_id: z.number().int().nullable(),
}));

// ─── Squad Teams ──────────────────────────────────────────────────────────────
router.get('/teams', async (_req, res, next) => {
  try {
    const result = await db.execute(`
      SELECT st.*, COUNT(sp.id) as player_count
      FROM squad_teams st
      LEFT JOIN squad_players sp ON sp.squad_team_id = st.id
      GROUP BY st.id ORDER BY st.created_at DESC
    `);
    res.json(result.rows.map(r => ({ ...r, is_active: Boolean((r as Record<string, unknown>).is_active) })));
  } catch (err) { next(err); }
});

router.get('/teams/:id', async (req, res, next) => {
  try {
    const result = await db.execute({ sql: 'SELECT * FROM squad_teams WHERE id = ?', args: [req.params.id] });
    if (!result.rows[0]) { res.status(404).json({ error: 'Squad team not found' }); return; }
    const row = result.rows[0] as Record<string, unknown>;
    res.json({ ...row, is_active: Boolean(row.is_active) });
  } catch (err) { next(err); }
});

router.post('/teams', validateBody(squadTeamSchema), async (req, res, next) => {
  try {
    const { name, description, season_label } = req.body;
    const ins = await db.execute({
      sql: 'INSERT INTO squad_teams (name, description, season_label) VALUES (?, ?, ?)',
      args: [name, description ?? null, season_label ?? null],
    });
    const row = await db.execute({ sql: 'SELECT * FROM squad_teams WHERE id = ?', args: [ins.lastInsertRowid!] });
    const r = row.rows[0] as Record<string, unknown>;
    res.status(201).json({ ...r, is_active: Boolean(r.is_active) });
  } catch (err) { next(err); }
});

router.post('/teams/import/:sourceTeamId', async (req, res, next) => {
  try {
    const { sourceTeamId } = req.params;
    const seasonLabel = typeof req.body?.season_label === 'string' ? req.body.season_label : null;

    const srcTeam = await db.execute({ sql: 'SELECT * FROM teams WHERE id = ?', args: [sourceTeamId] });
    if (!srcTeam.rows[0]) { res.status(404).json({ error: 'Source team not found' }); return; }
    const src = srcTeam.rows[0] as Record<string, unknown>;

    const ins = await db.execute({
      sql: 'INSERT INTO squad_teams (name, source_team_id, season_label) VALUES (?, ?, ?)',
      args: [src.name as string, sourceTeamId, seasonLabel],
    });
    const squadTeamId = ins.lastInsertRowid!;

    const players = await db.execute({ sql: 'SELECT * FROM players WHERE team_id = ?', args: [sourceTeamId] });
    for (const p of players.rows as Record<string, unknown>[]) {
      await db.execute({
        sql: 'INSERT INTO squad_players (squad_team_id, source_player_id, name, primary_position, secondary_position, depth_order) VALUES (?, ?, ?, ?, ?, ?)',
        args: [squadTeamId, p.id as number, p.name as string, p.primary_position as string ?? null, p.secondary_position as string ?? null, (p.team_order as number) ?? 0],
      });
    }

    const row = await db.execute({ sql: 'SELECT * FROM squad_teams WHERE id = ?', args: [squadTeamId] });
    const r = row.rows[0] as Record<string, unknown>;
    res.status(201).json({ ...r, is_active: Boolean(r.is_active) });
  } catch (err) { next(err); }
});

router.put('/teams/:id', validateBody(squadTeamSchema), async (req, res, next) => {
  try {
    const existing = await db.execute({ sql: 'SELECT id FROM squad_teams WHERE id = ?', args: [req.params.id] });
    if (!existing.rows[0]) { res.status(404).json({ error: 'Squad team not found' }); return; }
    const { name, description, season_label } = req.body;
    await db.execute({
      sql: "UPDATE squad_teams SET name=?, description=?, season_label=?, updated_at=datetime('now') WHERE id=?",
      args: [name, description ?? null, season_label ?? null, req.params.id],
    });
    const row = await db.execute({ sql: 'SELECT * FROM squad_teams WHERE id = ?', args: [req.params.id] });
    const r = row.rows[0] as Record<string, unknown>;
    res.json({ ...r, is_active: Boolean(r.is_active) });
  } catch (err) { next(err); }
});

router.patch('/teams/:id/status', async (req, res, next) => {
  try {
    const existing = await db.execute({ sql: 'SELECT id, is_active FROM squad_teams WHERE id = ?', args: [req.params.id] });
    if (!existing.rows[0]) { res.status(404).json({ error: 'Squad team not found' }); return; }
    const current = (existing.rows[0] as Record<string, unknown>).is_active;
    const newVal = current ? 0 : 1;
    await db.execute({
      sql: "UPDATE squad_teams SET is_active=?, updated_at=datetime('now') WHERE id=?",
      args: [newVal, req.params.id],
    });
    const row = await db.execute({ sql: 'SELECT * FROM squad_teams WHERE id = ?', args: [req.params.id] });
    const r = row.rows[0] as Record<string, unknown>;
    res.json({ ...r, is_active: Boolean(r.is_active) });
  } catch (err) { next(err); }
});

router.delete('/teams/:id', async (req, res, next) => {
  try {
    const existing = await db.execute({ sql: 'SELECT id FROM squad_teams WHERE id = ?', args: [req.params.id] });
    if (!existing.rows[0]) { res.status(404).json({ error: 'Squad team not found' }); return; }
    await db.execute({ sql: 'DELETE FROM squad_teams WHERE id = ?', args: [req.params.id] });
    res.status(204).send();
  } catch (err) { next(err); }
});

// ─── Squad Players ────────────────────────────────────────────────────────────
router.get('/teams/:teamId/players', async (req, res, next) => {
  try {
    const result = await db.execute({
      sql: 'SELECT * FROM squad_players WHERE squad_team_id = ? ORDER BY depth_order ASC, id ASC',
      args: [req.params.teamId],
    });
    res.json(result.rows);
  } catch (err) { next(err); }
});

router.post('/teams/:teamId/players', validateBody(squadPlayerSchema), async (req, res, next) => {
  try {
    const { name, primary_position, secondary_position, jersey_number, depth_order, status } = req.body;
    const ins = await db.execute({
      sql: 'INSERT INTO squad_players (squad_team_id, name, primary_position, secondary_position, jersey_number, depth_order, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
      args: [req.params.teamId, name, primary_position ?? null, secondary_position ?? null, jersey_number ?? null, depth_order ?? 0, status ?? 'active'],
    });
    const row = await db.execute({ sql: 'SELECT * FROM squad_players WHERE id = ?', args: [ins.lastInsertRowid!] });
    res.status(201).json(row.rows[0]);
  } catch (err) { next(err); }
});

// Must come before /:playerId to avoid route conflict
router.put('/teams/:teamId/players/depth-order', async (req, res, next) => {
  try {
    const parsed = depthOrderSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: 'Invalid body' }); return; }
    for (const { id, depth_order } of parsed.data) {
      await db.execute({
        sql: "UPDATE squad_players SET depth_order=?, updated_at=datetime('now') WHERE id=? AND squad_team_id=?",
        args: [depth_order, id, req.params.teamId],
      });
    }
    res.status(204).send();
  } catch (err) { next(err); }
});

router.put('/teams/:teamId/players/:playerId', validateBody(squadPlayerSchema), async (req, res, next) => {
  try {
    const existing = await db.execute({ sql: 'SELECT id FROM squad_players WHERE id = ? AND squad_team_id = ?', args: [req.params.playerId, req.params.teamId] });
    if (!existing.rows[0]) { res.status(404).json({ error: 'Player not found' }); return; }
    const { name, primary_position, secondary_position, jersey_number, depth_order, status } = req.body;
    await db.execute({
      sql: "UPDATE squad_players SET name=?, primary_position=?, secondary_position=?, jersey_number=?, depth_order=?, status=?, updated_at=datetime('now') WHERE id=? AND squad_team_id=?",
      args: [name, primary_position ?? null, secondary_position ?? null, jersey_number ?? null, depth_order ?? 0, status ?? 'active', req.params.playerId, req.params.teamId],
    });
    const row = await db.execute({ sql: 'SELECT * FROM squad_players WHERE id = ?', args: [req.params.playerId] });
    res.json(row.rows[0]);
  } catch (err) { next(err); }
});

router.patch('/teams/:teamId/players/:playerId/status', async (req, res, next) => {
  try {
    const statusSchema = z.object({ status: z.enum(['active', 'inactive', 'injured']) });
    const parsed = statusSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: 'Invalid status' }); return; }
    const existing = await db.execute({ sql: 'SELECT id FROM squad_players WHERE id = ? AND squad_team_id = ?', args: [req.params.playerId, req.params.teamId] });
    if (!existing.rows[0]) { res.status(404).json({ error: 'Player not found' }); return; }
    await db.execute({
      sql: "UPDATE squad_players SET status=?, updated_at=datetime('now') WHERE id=? AND squad_team_id=?",
      args: [parsed.data.status, req.params.playerId, req.params.teamId],
    });
    const row = await db.execute({ sql: 'SELECT * FROM squad_players WHERE id = ?', args: [req.params.playerId] });
    res.json(row.rows[0]);
  } catch (err) { next(err); }
});

router.delete('/teams/:teamId/players/:playerId', async (req, res, next) => {
  try {
    await db.execute({ sql: 'DELETE FROM squad_players WHERE id = ? AND squad_team_id = ?', args: [req.params.playerId, req.params.teamId] });
    res.status(204).send();
  } catch (err) { next(err); }
});

// ─── Formations ───────────────────────────────────────────────────────────────
router.get('/teams/:teamId/formations', async (req, res, next) => {
  try {
    const result = await db.execute({
      sql: 'SELECT * FROM formations WHERE squad_team_id = ? ORDER BY is_default DESC, created_at ASC',
      args: [req.params.teamId],
    });
    res.json(result.rows.map(r => ({ ...r, is_default: Boolean((r as Record<string, unknown>).is_default) })));
  } catch (err) { next(err); }
});

router.get('/teams/:teamId/formations/:formationId', async (req, res, next) => {
  try {
    const fResult = await db.execute({ sql: 'SELECT * FROM formations WHERE id = ? AND squad_team_id = ?', args: [req.params.formationId, req.params.teamId] });
    if (!fResult.rows[0]) { res.status(404).json({ error: 'Formation not found' }); return; }
    const formation = fResult.rows[0] as Record<string, unknown>;

    const slotsResult = await db.execute({
      sql: `SELECT fs.*, sp.name as player_name, sp.jersey_number, sp.primary_position, sp.status as player_status
            FROM formation_slots fs
            LEFT JOIN squad_players sp ON sp.id = fs.squad_player_id
            WHERE fs.formation_id = ?
            ORDER BY fs.role ASC, fs.y_pct ASC`,
      args: [req.params.formationId],
    });

    res.json({
      ...formation,
      is_default: Boolean(formation.is_default),
      slots: slotsResult.rows,
    });
  } catch (err) { next(err); }
});

router.post('/teams/:teamId/formations', validateBody(formationSchema), async (req, res, next) => {
  try {
    const { name, template_id, formation_code } = req.body;

    let slots: SlotTemplate[] = [];
    let resolvedCode = formation_code ?? '';

    if (template_id != null) {
      const tmplRow = await db.execute({ sql: 'SELECT * FROM formation_templates WHERE id = ?', args: [template_id] });
      if (!tmplRow.rows[0]) { res.status(400).json({ error: 'Unknown template' }); return; }
      resolvedCode = (tmplRow.rows[0] as Record<string, unknown>).name as string;
      const slotsResult = await db.execute({ sql: 'SELECT * FROM formation_template_slots WHERE formation_template_id = ?', args: [template_id] });
      slots = slotsResult.rows as unknown as SlotTemplate[];
    } else if (formation_code) {
      const builtin = FORMATION_TEMPLATES[formation_code];
      if (!builtin) { res.status(400).json({ error: 'Unknown formation code' }); return; }
      slots = builtin;
    } else {
      res.status(400).json({ error: 'template_id or formation_code required' }); return;
    }

    const ins = await db.execute({
      sql: 'INSERT INTO formations (squad_team_id, name, formation_code) VALUES (?, ?, ?)',
      args: [req.params.teamId, name, resolvedCode],
    });
    const formationId = ins.lastInsertRowid!;

    for (const slot of slots) {
      await db.execute({
        sql: 'INSERT INTO formation_slots (formation_id, slot_label, role, x_pct, y_pct) VALUES (?, ?, ?, ?, ?)',
        args: [formationId, slot.slot_label, slot.role, slot.x_pct, slot.y_pct],
      });
    }

    const row = await db.execute({ sql: 'SELECT * FROM formations WHERE id = ?', args: [formationId] });
    const r = row.rows[0] as Record<string, unknown>;
    res.status(201).json({ ...r, is_default: Boolean(r.is_default) });
  } catch (err) { next(err); }
});

router.put('/teams/:teamId/formations/:formationId', validateBody(formationSchema), async (req, res, next) => {
  try {
    const existing = await db.execute({ sql: 'SELECT * FROM formations WHERE id = ? AND squad_team_id = ?', args: [req.params.formationId, req.params.teamId] });
    if (!existing.rows[0]) { res.status(404).json({ error: 'Formation not found' }); return; }
    const { name, formation_code } = req.body;
    const current = existing.rows[0] as Record<string, unknown>;

    await db.execute({
      sql: "UPDATE formations SET name=?, formation_code=?, updated_at=datetime('now') WHERE id=?",
      args: [name, formation_code, req.params.formationId],
    });

    // If formation_code changed, regenerate slots
    if (current.formation_code !== formation_code) {
      const template = FORMATION_TEMPLATES[formation_code];
      if (template) {
        await db.execute({ sql: 'DELETE FROM formation_slots WHERE formation_id = ?', args: [req.params.formationId] });
        for (const slot of template) {
          await db.execute({
            sql: 'INSERT INTO formation_slots (formation_id, slot_label, role, x_pct, y_pct) VALUES (?, ?, ?, ?, ?)',
            args: [req.params.formationId, slot.slot_label, slot.role, slot.x_pct, slot.y_pct],
          });
        }
      }
    }

    const row = await db.execute({ sql: 'SELECT * FROM formations WHERE id = ?', args: [req.params.formationId] });
    const r = row.rows[0] as Record<string, unknown>;
    res.json({ ...r, is_default: Boolean(r.is_default) });
  } catch (err) { next(err); }
});

router.patch('/teams/:teamId/formations/:formationId/default', async (req, res, next) => {
  try {
    const existing = await db.execute({ sql: 'SELECT id FROM formations WHERE id = ? AND squad_team_id = ?', args: [req.params.formationId, req.params.teamId] });
    if (!existing.rows[0]) { res.status(404).json({ error: 'Formation not found' }); return; }
    await db.execute({ sql: 'UPDATE formations SET is_default=0 WHERE squad_team_id=?', args: [req.params.teamId] });
    await db.execute({
      sql: "UPDATE formations SET is_default=1, updated_at=datetime('now') WHERE id=?",
      args: [req.params.formationId],
    });
    const row = await db.execute({ sql: 'SELECT * FROM formations WHERE id = ?', args: [req.params.formationId] });
    const r = row.rows[0] as Record<string, unknown>;
    res.json({ ...r, is_default: Boolean(r.is_default) });
  } catch (err) { next(err); }
});

router.delete('/teams/:teamId/formations/:formationId', async (req, res, next) => {
  try {
    await db.execute({ sql: 'DELETE FROM formations WHERE id = ? AND squad_team_id = ?', args: [req.params.formationId, req.params.teamId] });
    res.status(204).send();
  } catch (err) { next(err); }
});

router.put('/teams/:teamId/formations/:formationId/slots', async (req, res, next) => {
  try {
    const parsed = slotAssignmentsSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: 'Invalid body' }); return; }
    for (const { slot_id, squad_player_id } of parsed.data) {
      await db.execute({
        sql: "UPDATE formation_slots SET squad_player_id=?, updated_at=datetime('now') WHERE id=? AND formation_id=?",
        args: [squad_player_id, slot_id, req.params.formationId],
      });
    }
    res.status(204).send();
  } catch (err) { next(err); }
});

router.patch('/teams/:teamId/formations/:formationId/slot-positions', async (req, res, next) => {
  try {
    const parsed = slotPositionsSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: 'Invalid body' }); return; }
    for (const { slot_id, x_pct, y_pct } of parsed.data) {
      await db.execute({
        sql: "UPDATE formation_slots SET x_pct=?, y_pct=?, updated_at=datetime('now') WHERE id=? AND formation_id=?",
        args: [x_pct, y_pct, slot_id, req.params.formationId],
      });
    }
    res.status(204).send();
  } catch (err) { next(err); }
});

// ─── Formation Templates ──────────────────────────────────────────────────────
router.get('/templates', async (_req, res, next) => {
  try {
    const result = await db.execute(`
      SELECT ft.*, COUNT(fts.id) as slot_count
      FROM formation_templates ft
      LEFT JOIN formation_template_slots fts ON fts.formation_template_id = ft.id
      GROUP BY ft.id ORDER BY ft.is_builtin DESC, ft.created_at ASC
    `);
    res.json(result.rows.map(r => ({ ...r, is_builtin: Boolean((r as Record<string, unknown>).is_builtin) })));
  } catch (err) { next(err); }
});

router.get('/templates/:templateId', async (req, res, next) => {
  try {
    const tmplResult = await db.execute({ sql: 'SELECT * FROM formation_templates WHERE id = ?', args: [req.params.templateId] });
    if (!tmplResult.rows[0]) { res.status(404).json({ error: 'Template not found' }); return; }
    const tmpl = tmplResult.rows[0] as Record<string, unknown>;
    const slotsResult = await db.execute({ sql: 'SELECT * FROM formation_template_slots WHERE formation_template_id = ? ORDER BY id ASC', args: [req.params.templateId] });
    res.json({ ...tmpl, is_builtin: Boolean(tmpl.is_builtin), slots: slotsResult.rows });
  } catch (err) { next(err); }
});

router.post('/templates', validateBody(templateCreateSchema), async (req, res, next) => {
  try {
    const { name, slots } = req.body;
    const ins = await db.execute({
      sql: "INSERT INTO formation_templates (name, is_builtin) VALUES (?, 0)",
      args: [name],
    });
    const tmplId = ins.lastInsertRowid!;
    for (const slot of slots) {
      await db.execute({
        sql: 'INSERT INTO formation_template_slots (formation_template_id, slot_label, role, x_pct, y_pct) VALUES (?, ?, ?, ?, ?)',
        args: [tmplId, slot.slot_label, slot.role, slot.x_pct, slot.y_pct],
      });
    }
    const row = await db.execute({ sql: 'SELECT * FROM formation_templates WHERE id = ?', args: [tmplId] });
    const r = row.rows[0] as Record<string, unknown>;
    const slotsResult = await db.execute({ sql: 'SELECT * FROM formation_template_slots WHERE formation_template_id = ? ORDER BY id ASC', args: [tmplId] });
    res.status(201).json({ ...r, is_builtin: Boolean(r.is_builtin), slots: slotsResult.rows });
  } catch (err) { next(err); }
});

router.put('/templates/:templateId', validateBody(templateCreateSchema), async (req, res, next) => {
  try {
    const tmplResult = await db.execute({ sql: 'SELECT * FROM formation_templates WHERE id = ?', args: [req.params.templateId] });
    if (!tmplResult.rows[0]) { res.status(404).json({ error: 'Template not found' }); return; }
    const tmpl = tmplResult.rows[0] as Record<string, unknown>;
    if (tmpl.is_builtin) { res.status(403).json({ error: 'Cannot modify built-in templates' }); return; }

    const { name, slots } = req.body;
    await db.execute({
      sql: "UPDATE formation_templates SET name=?, updated_at=datetime('now') WHERE id=?",
      args: [name, req.params.templateId],
    });
    await db.execute({ sql: 'DELETE FROM formation_template_slots WHERE formation_template_id = ?', args: [req.params.templateId] });
    for (const slot of slots) {
      await db.execute({
        sql: 'INSERT INTO formation_template_slots (formation_template_id, slot_label, role, x_pct, y_pct) VALUES (?, ?, ?, ?, ?)',
        args: [req.params.templateId, slot.slot_label, slot.role, slot.x_pct, slot.y_pct],
      });
    }
    const row = await db.execute({ sql: 'SELECT * FROM formation_templates WHERE id = ?', args: [req.params.templateId] });
    const r = row.rows[0] as Record<string, unknown>;
    const slotsResult = await db.execute({ sql: 'SELECT * FROM formation_template_slots WHERE formation_template_id = ? ORDER BY id ASC', args: [req.params.templateId] });
    res.json({ ...r, is_builtin: Boolean(r.is_builtin), slots: slotsResult.rows });
  } catch (err) { next(err); }
});

router.delete('/templates/:templateId', async (req, res, next) => {
  try {
    const tmplResult = await db.execute({ sql: 'SELECT * FROM formation_templates WHERE id = ?', args: [req.params.templateId] });
    if (!tmplResult.rows[0]) { res.status(404).json({ error: 'Template not found' }); return; }
    const tmpl = tmplResult.rows[0] as Record<string, unknown>;
    if (tmpl.is_builtin) { res.status(403).json({ error: 'Cannot delete built-in templates' }); return; }
    await db.execute({ sql: 'DELETE FROM formation_templates WHERE id = ?', args: [req.params.templateId] });
    res.status(204).send();
  } catch (err) { next(err); }
});

export default router;
