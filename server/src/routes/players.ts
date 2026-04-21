import { Router, text } from 'express';
import { z } from 'zod';
import { db } from '../db';
import { validateBody } from '../middleware/validateBody';
import { parseCsv } from '../lib/csv';

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
    const { search, position, group_id, team_id } = req.query;
    const conditions: string[] = [];
    const args: unknown[] = [];

    if (search) { conditions.push('p.name LIKE ?'); args.push(`%${search}%`); }
    if (position) {
      conditions.push('(p.primary_position = ? OR p.secondary_position = ?)');
      args.push(position, position);
    }
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

// Bulk import via CSV. Accepts text/csv (raw text body). Header row is required.
// Recognized columns (case-insensitive, any subset; extras ignored):
//   name*, primary_position*, secondary_position, prior_team, prior_team_division, notes,
//   group_id | group_name | group, team_id | team_name | team
// Group/team can be referenced by numeric id or by name; names are matched case-insensitively.
router.post('/import', text({ type: ['text/csv', 'text/plain'], limit: '5mb' }), async (req, res, next) => {
  try {
    const body = typeof req.body === 'string' ? req.body : '';
    if (!body.trim()) { res.status(400).json({ error: 'Empty CSV body' }); return; }

    const rows = parseCsv(body);
    if (rows.length < 2) {
      res.status(400).json({ error: 'CSV must have a header row and at least one data row' });
      return;
    }

    const header = rows[0].map((h) => h.trim().toLowerCase());
    const idx = (names: string[]) => {
      for (const n of names) {
        const i = header.indexOf(n);
        if (i !== -1) return i;
      }
      return -1;
    };
    const col = {
      name: idx(['name']),
      primary_position: idx(['primary_position', 'position']),
      secondary_position: idx(['secondary_position']),
      prior_team: idx(['prior_team']),
      prior_team_division: idx(['prior_team_division']),
      notes: idx(['notes']),
      group_id: idx(['group_id']),
      group_name: idx(['group_name', 'group']),
      team_id: idx(['team_id']),
      team_name: idx(['team_name', 'team']),
    };

    if (col.name === -1 || col.primary_position === -1) {
      res.status(400).json({ error: 'CSV must include "name" and "primary_position" columns' });
      return;
    }

    // Load existing groups/teams to resolve names.
    const groupRows = await db.execute('SELECT id, name FROM groups');
    const teamRows = await db.execute('SELECT id, name, group_id FROM teams');
    const groupByName = new Map<string, number>();
    for (const g of groupRows.rows) groupByName.set(String(g.name).toLowerCase(), Number(g.id));
    const groupIds = new Set<number>(Array.from(groupByName.values()));
    const teamByName = new Map<string, { id: number; group_id: number }>();
    const teamIds = new Set<number>();
    for (const t of teamRows.rows) {
      teamByName.set(String(t.name).toLowerCase(), { id: Number(t.id), group_id: Number(t.group_id) });
      teamIds.add(Number(t.id));
    }

    const get = (row: string[], i: number): string => (i === -1 ? '' : (row[i] ?? '').trim());
    const nonEmpty = (s: string): string | null => (s.length > 0 ? s : null);

    const errors: Array<{ row: number; message: string }> = [];
    const imported: unknown[] = [];

    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      const rowNum = r + 1; // human-friendly (1-indexed, header = line 1)

      const name = get(row, col.name);
      const primary_position = get(row, col.primary_position);
      if (!name) { errors.push({ row: rowNum, message: 'Missing name' }); continue; }
      if (!primary_position) { errors.push({ row: rowNum, message: 'Missing primary_position' }); continue; }

      // Resolve group: explicit group_id wins, otherwise group_name.
      let group_id: number | null = null;
      const rawGroupId = get(row, col.group_id);
      const rawGroupName = get(row, col.group_name);
      if (rawGroupId) {
        const n = Number(rawGroupId);
        if (!Number.isInteger(n) || !groupIds.has(n)) {
          errors.push({ row: rowNum, message: `Unknown group_id "${rawGroupId}"` });
          continue;
        }
        group_id = n;
      } else if (rawGroupName) {
        const found = groupByName.get(rawGroupName.toLowerCase());
        if (!found) {
          errors.push({ row: rowNum, message: `Unknown group "${rawGroupName}"` });
          continue;
        }
        group_id = found;
      }

      // Resolve team: explicit team_id wins, otherwise team_name.
      let team_id: number | null = null;
      const rawTeamId = get(row, col.team_id);
      const rawTeamName = get(row, col.team_name);
      if (rawTeamId) {
        const n = Number(rawTeamId);
        if (!Number.isInteger(n) || !teamIds.has(n)) {
          errors.push({ row: rowNum, message: `Unknown team_id "${rawTeamId}"` });
          continue;
        }
        team_id = n;
      } else if (rawTeamName) {
        const found = teamByName.get(rawTeamName.toLowerCase());
        if (!found) {
          errors.push({ row: rowNum, message: `Unknown team "${rawTeamName}"` });
          continue;
        }
        team_id = found.id;
      }

      // Cross-check: if both supplied, team must belong to group.
      if (team_id != null && group_id != null) {
        const teamRec = Array.from(teamByName.values()).find((t) => t.id === team_id);
        if (teamRec && teamRec.group_id !== group_id) {
          errors.push({ row: rowNum, message: 'Team does not belong to the specified group' });
          continue;
        }
      }

      try {
        const ins = await db.execute({
          sql: 'INSERT INTO players (name, primary_position, secondary_position, prior_team, prior_team_division, notes, group_id, team_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          args: [
            name,
            primary_position,
            nonEmpty(get(row, col.secondary_position)),
            nonEmpty(get(row, col.prior_team)),
            nonEmpty(get(row, col.prior_team_division)),
            nonEmpty(get(row, col.notes)),
            group_id,
            team_id,
          ],
        });
        const created = await db.execute({ sql: `${baseSelect} WHERE p.id = ?`, args: [ins.lastInsertRowid!] });
        imported.push(created.rows[0]);
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Insert failed';
        errors.push({ row: rowNum, message: msg });
      }
    }

    res.status(200).json({ imported: imported.length, errors, players: imported });
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
