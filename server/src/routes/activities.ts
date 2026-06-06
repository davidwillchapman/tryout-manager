import { Router } from 'express';
import { z } from 'zod';
import multer from 'multer';
import path from 'path';
import type { InValue } from '@libsql/client';
import { db } from '../db';
import { validateBody } from '../middleware/validateBody';
import { parseActivityMarkdown } from '../lib/activityParser';

const router = Router();

// ─── Multer: text files (for import) ─────────────────────────────────────────
const textUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

// ─── Multer: image files (disk storage) ──────────────────────────────────────
const imageStorage = multer.diskStorage({
  destination: path.resolve(__dirname, '../../../data/images'),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const name = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
    cb(null, name);
  },
});
const allowedImageMimes = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);
const allowedImageExts = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp']);
const imageUpload = multer({
  storage: imageStorage,
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedImageMimes.has(file.mimetype) || allowedImageExts.has(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are accepted'));
    }
  },
  limits: { fileSize: 20 * 1024 * 1024 },
});

// ─── Multer: video files (disk storage) ──────────────────────────────────────
const videoStorage = multer.diskStorage({
  destination: path.resolve(__dirname, '../../../data/videos'),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const name = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
    cb(null, name);
  },
});
const allowedVideoMimes = new Set(['video/mp4', 'video/quicktime', 'video/webm', 'video/ogg']);
const allowedVideoExts = new Set(['.mp4', '.mov', '.webm', '.ogv']);
const videoUpload = multer({
  storage: videoStorage,
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedVideoMimes.has(file.mimetype) || allowedVideoExts.has(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only video files (mp4, mov, webm, ogv) are accepted'));
    }
  },
  limits: { fileSize: 200 * 1024 * 1024 },
});

// ─── Zod schemas ──────────────────────────────────────────────────────────────
const activitySchema = z.object({
  title: z.string().min(1),
  summary: z.string().min(1),
  description: z.string().min(1),
  activity_type: z.string().optional().nullable(),
  duration_minutes: z.number().int().positive().optional().nullable(),
  field_setup: z.string().optional().nullable(),
  coaching_points: z.string().optional().nullable(),
  flexibility_notes: z.string().optional().nullable(),
  image_id: z.number().int().optional().nullable(),
  video_url: z.string().optional().nullable(),
  video_type: z.enum(['youtube', 'vimeo', 'upload']).optional().nullable(),
});

const tagSchema = z.object({
  framework_id: z.number().int(),
  phase_section_id: z.number().int().optional().nullable(),
  principle_section_id: z.number().int().optional().nullable(),
  sub_principle_section_id: z.number().int().optional().nullable(),
});

const referenceSchema = z.object({
  url: z.string().url(),
  label: z.string().optional().nullable(),
  order_index: z.number().int().optional(),
});

const progressionSchema = z.object({
  progression_activity_id: z.number().int(),
});

// ─── Activity list ────────────────────────────────────────────────────────────
router.get('/', async (_req, res, next) => {
  try {
    const result = await db.execute(`
      SELECT a.*, COUNT(aft.id) as tag_count,
             ai.filename AS image_filename
      FROM activities a
      LEFT JOIN activity_framework_tags aft ON aft.activity_id = a.id
      LEFT JOIN activity_images ai ON ai.id = a.image_id
      GROUP BY a.id ORDER BY a.title ASC
    `);
    const rows = result.rows.map((r) => {
      const row = r as Record<string, unknown>;
      const { image_filename, ...rest } = row;
      return { ...rest, image_url: image_filename ? `/images/${image_filename}` : null };
    });
    res.json(rows);
  } catch (err) { next(err); }
});

// ─── Create activity ──────────────────────────────────────────────────────────
router.post('/', validateBody(activitySchema), async (req, res, next) => {
  try {
    const { title, summary, description, activity_type, duration_minutes, field_setup, coaching_points, flexibility_notes, image_id, video_url, video_type } = req.body;
    const ins = await db.execute({
      sql: 'INSERT INTO activities (title, summary, description, activity_type, duration_minutes, field_setup, coaching_points, flexibility_notes, image_id, video_url, video_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      args: [title, summary, description, activity_type ?? null, duration_minutes ?? null, field_setup ?? null, coaching_points ?? null, flexibility_notes ?? null, image_id ?? null, video_url ?? null, video_type ?? null],
    });
    const row = await db.execute({ sql: 'SELECT * FROM activities WHERE id = ?', args: [ins.lastInsertRowid!] });
    res.status(201).json(row.rows[0]);
  } catch (err) { next(err); }
});

// ─── Import activity from markdown ───────────────────────────────────────────
router.post('/import', textUpload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) { res.status(400).json({ error: 'file is required' }); return; }

    const text = req.file.buffer.toString('utf-8');
    let parsed;
    try {
      parsed = parseActivityMarkdown(text);
    } catch (e) {
      res.status(400).json({ error: (e as Error).message });
      return;
    }

    const warnings = [...parsed.warnings];

    // Insert activity
    const ins = await db.execute({
      sql: 'INSERT INTO activities (title, summary, description, activity_type, duration_minutes, field_setup, coaching_points, flexibility_notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      args: [parsed.title, parsed.summary, parsed.description, parsed.activity_type, parsed.duration_minutes, parsed.field_setup, parsed.coaching_points, parsed.flexibility_notes],
    });
    const activityId = ins.lastInsertRowid!;

    // Resolve and insert DNA tags
    for (const tag of parsed.dnaTags) {
      const fwResult = await db.execute({
        sql: 'SELECT id FROM frameworks WHERE LOWER(name) = LOWER(?)',
        args: [tag.framework_name],
      });
      if (!fwResult.rows[0]) {
        warnings.push(`Framework not found: "${tag.framework_name}" — tag skipped`);
        continue;
      }
      const frameworkId = fwResult.rows[0].id as number;

      let phaseId: number | null = null;
      let principleId: number | null = null;
      let subPrincipleId: number | null = null;

      if (tag.phase) {
        const r = await db.execute({
          sql: 'SELECT id FROM framework_sections WHERE framework_id = ? AND parent_id IS NULL AND LOWER(title) = LOWER(?)',
          args: [frameworkId, tag.phase],
        });
        if (r.rows[0]) phaseId = r.rows[0].id as number;
        else warnings.push(`Phase not found: "${tag.phase}" in "${tag.framework_name}"`);
      }

      if (tag.principle && phaseId !== null) {
        const r = await db.execute({
          sql: 'SELECT id FROM framework_sections WHERE framework_id = ? AND parent_id = ? AND LOWER(title) = LOWER(?)',
          args: [frameworkId, phaseId, tag.principle],
        });
        if (r.rows[0]) principleId = r.rows[0].id as number;
        else warnings.push(`Principle not found: "${tag.principle}" under "${tag.phase}"`);
      }

      if (tag.sub_principle && principleId !== null) {
        const r = await db.execute({
          sql: 'SELECT id FROM framework_sections WHERE framework_id = ? AND parent_id = ? AND LOWER(title) = LOWER(?)',
          args: [frameworkId, principleId, tag.sub_principle],
        });
        if (r.rows[0]) subPrincipleId = r.rows[0].id as number;
        else warnings.push(`Sub-Principle not found: "${tag.sub_principle}" under "${tag.principle}"`);
      }

      await db.execute({
        sql: 'INSERT INTO activity_framework_tags (activity_id, framework_id, phase_section_id, principle_section_id, sub_principle_section_id) VALUES (?, ?, ?, ?, ?)',
        args: [activityId, frameworkId, phaseId, principleId, subPrincipleId],
      });
    }

    // Insert references
    for (let i = 0; i < parsed.references.length; i++) {
      const ref = parsed.references[i];
      await db.execute({
        sql: 'INSERT INTO activity_references (activity_id, url, label, order_index) VALUES (?, ?, ?, ?)',
        args: [activityId, ref.url, ref.label, i],
      });
    }

    const activity = await db.execute({ sql: 'SELECT * FROM activities WHERE id = ?', args: [activityId] });
    res.status(201).json({ activity: activity.rows[0], warnings });
  } catch (err) { next(err); }
});

// ─── Export all activities as JSON ───────────────────────────────────────────
router.get('/export', async (_req, res, next) => {
  try {
    const activitiesResult = await db.execute('SELECT * FROM activities ORDER BY title ASC');
    const rows = activitiesResult.rows as Record<string, unknown>[];

    const exported = [];
    for (const a of rows) {
      const id = a.id as InValue;

      const tagsResult = await db.execute({
        sql: `SELECT f.name as framework_name, phase.title as phase_title,
                prin.title as principle_title, sub.title as sub_principle_title
              FROM activity_framework_tags aft
              JOIN frameworks f ON f.id = aft.framework_id
              LEFT JOIN framework_sections phase ON phase.id = aft.phase_section_id
              LEFT JOIN framework_sections prin ON prin.id = aft.principle_section_id
              LEFT JOIN framework_sections sub ON sub.id = aft.sub_principle_section_id
              WHERE aft.activity_id = ? ORDER BY aft.id ASC`,
        args: [id],
      });

      const refsResult = await db.execute({
        sql: 'SELECT url, label FROM activity_references WHERE activity_id = ? ORDER BY order_index ASC, id ASC',
        args: [id],
      });

      const progsResult = await db.execute({
        sql: `SELECT a2.title FROM activity_progressions ap
              JOIN activities a2 ON a2.id = ap.progression_activity_id
              WHERE ap.activity_id = ? ORDER BY ap.id ASC`,
        args: [id],
      });

      exported.push({
        title: a.title,
        summary: a.summary,
        description: a.description,
        activity_type: a.activity_type,
        duration_minutes: a.duration_minutes,
        field_setup: a.field_setup,
        coaching_points: a.coaching_points,
        flexibility_notes: a.flexibility_notes,
        video_url: a.video_url,
        video_type: a.video_type,
        tags: tagsResult.rows.map((t) => {
          const r = t as Record<string, unknown>;
          return { framework_name: r.framework_name, phase_title: r.phase_title, principle_title: r.principle_title, sub_principle_title: r.sub_principle_title };
        }),
        references: refsResult.rows.map((r) => {
          const ref = r as Record<string, unknown>;
          return { url: ref.url, label: ref.label };
        }),
        progression_titles: progsResult.rows.map((p) => (p as Record<string, unknown>).title),
      });
    }

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="activities.json"');
    res.json({ version: 1, exported_at: new Date().toISOString(), activities: exported });
  } catch (err) { next(err); }
});

// ─── Bulk import from JSON export ─────────────────────────────────────────────
router.post('/import-bulk', async (req, res, next) => {
  try {
    const body = req.body;
    let incoming: Record<string, unknown>[];
    if (Array.isArray(body)) {
      incoming = body as Record<string, unknown>[];
    } else if (body && Array.isArray((body as Record<string, unknown>).activities)) {
      incoming = (body as Record<string, unknown>).activities as Record<string, unknown>[];
    } else {
      res.status(400).json({ error: 'Invalid format: expected an array or { activities: [...] }' });
      return;
    }
    const errors: Array<{ title: string; message: string }> = [];
    const tagWarnings: string[] = [];

    // First pass: insert all activity rows, build title → new id map.
    const titleToId = new Map<string, number>();
    const inserted: Array<{
      id: number;
      tags: Record<string, unknown>[];
      references: Record<string, unknown>[];
      progression_titles: string[];
    }> = [];

    for (const a of incoming) {
      const title = String(a.title ?? '').trim();
      if (!title || !a.summary || !a.description) {
        errors.push({ title: title || '(no title)', message: 'Missing required fields (title, summary, description)' });
        continue;
      }
      try {
        const ins = await db.execute({
          sql: 'INSERT INTO activities (title, summary, description, activity_type, duration_minutes, field_setup, coaching_points, flexibility_notes, video_url, video_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          args: [title, a.summary as InValue, a.description as InValue, (a.activity_type ?? null) as InValue, (a.duration_minutes ?? null) as InValue, (a.field_setup ?? null) as InValue, (a.coaching_points ?? null) as InValue, (a.flexibility_notes ?? null) as InValue, (a.video_url ?? null) as InValue, (a.video_type ?? null) as InValue],
        });
        const newId = Number(ins.lastInsertRowid!);
        titleToId.set(title, newId);
        inserted.push({
          id: newId,
          tags: Array.isArray(a.tags) ? (a.tags as Record<string, unknown>[]) : [],
          references: Array.isArray(a.references) ? (a.references as Record<string, unknown>[]) : [],
          progression_titles: Array.isArray(a.progression_titles) ? (a.progression_titles as string[]) : [],
        });
      } catch (e) {
        errors.push({ title, message: e instanceof Error ? e.message : 'Insert failed' });
      }
    }

    // Second pass: tags, references, progressions.
    for (const { id, tags, references, progression_titles } of inserted) {
      for (const tag of tags) {
        const fwResult = await db.execute({
          sql: 'SELECT id FROM frameworks WHERE LOWER(name) = LOWER(?)',
          args: [String(tag.framework_name ?? '')],
        });
        if (!fwResult.rows[0]) {
          tagWarnings.push(`Framework not found: "${tag.framework_name}" — tag skipped`);
          continue;
        }
        const frameworkId = fwResult.rows[0].id as number;

        let phaseId: number | null = null;
        let principleId: number | null = null;
        let subId: number | null = null;

        if (tag.phase_title) {
          const r = await db.execute({
            sql: 'SELECT id FROM framework_sections WHERE framework_id = ? AND parent_id IS NULL AND LOWER(title) = LOWER(?)',
            args: [frameworkId, String(tag.phase_title)],
          });
          if (r.rows[0]) phaseId = r.rows[0].id as number;
        }
        if (tag.principle_title && phaseId !== null) {
          const r = await db.execute({
            sql: 'SELECT id FROM framework_sections WHERE framework_id = ? AND parent_id = ? AND LOWER(title) = LOWER(?)',
            args: [frameworkId, phaseId, String(tag.principle_title)],
          });
          if (r.rows[0]) principleId = r.rows[0].id as number;
        }
        if (tag.sub_principle_title && principleId !== null) {
          const r = await db.execute({
            sql: 'SELECT id FROM framework_sections WHERE framework_id = ? AND parent_id = ? AND LOWER(title) = LOWER(?)',
            args: [frameworkId, principleId, String(tag.sub_principle_title)],
          });
          if (r.rows[0]) subId = r.rows[0].id as number;
        }

        await db.execute({
          sql: 'INSERT INTO activity_framework_tags (activity_id, framework_id, phase_section_id, principle_section_id, sub_principle_section_id) VALUES (?, ?, ?, ?, ?)',
          args: [id, frameworkId, phaseId, principleId, subId],
        });
      }

      for (let i = 0; i < references.length; i++) {
        const ref = references[i];
        await db.execute({
          sql: 'INSERT INTO activity_references (activity_id, url, label, order_index) VALUES (?, ?, ?, ?)',
          args: [id, String(ref.url ?? ''), (ref.label ?? null) as InValue, i],
        });
      }

      for (const ptitle of progression_titles) {
        const targetId = titleToId.get(String(ptitle));
        if (targetId) {
          await db.execute({
            sql: 'INSERT OR IGNORE INTO activity_progressions (activity_id, progression_activity_id) VALUES (?, ?)',
            args: [id, targetId],
          }).catch(() => {});
        }
      }
    }

    res.json({ imported: inserted.length, errors, tag_warnings: tagWarnings });
  } catch (err) { next(err); }
});

// ─── Get activity detail ──────────────────────────────────────────────────────
router.get('/:id', async (req, res, next) => {
  try {
    const act = await db.execute({
      sql: `SELECT a.*, ai.filename AS image_filename
            FROM activities a
            LEFT JOIN activity_images ai ON ai.id = a.image_id
            WHERE a.id = ?`,
      args: [req.params.id],
    });
    if (!act.rows[0]) { res.status(404).json({ error: 'Activity not found' }); return; }
    const actRow = act.rows[0] as Record<string, unknown>;
    const { image_filename, ...actData } = actRow;
    const activityWithImage = { ...actData, image_url: image_filename ? `/images/${image_filename}` : null };

    const tags = await db.execute({
      sql: `SELECT aft.*,
              f.name as framework_name,
              phase.title as phase_title,
              prin.title as principle_title,
              sub.title as sub_principle_title
            FROM activity_framework_tags aft
            JOIN frameworks f ON f.id = aft.framework_id
            LEFT JOIN framework_sections phase ON phase.id = aft.phase_section_id
            LEFT JOIN framework_sections prin ON prin.id = aft.principle_section_id
            LEFT JOIN framework_sections sub ON sub.id = aft.sub_principle_section_id
            WHERE aft.activity_id = ?
            ORDER BY aft.id ASC`,
      args: [req.params.id],
    });

    const refs = await db.execute({
      sql: 'SELECT * FROM activity_references WHERE activity_id = ? ORDER BY order_index ASC, id ASC',
      args: [req.params.id],
    });

    const progs = await db.execute({
      sql: `SELECT ap.*, a.title as progression_title, a.summary as progression_summary
            FROM activity_progressions ap
            JOIN activities a ON a.id = ap.progression_activity_id
            WHERE ap.activity_id = ?
            ORDER BY ap.id ASC`,
      args: [req.params.id],
    });

    res.json({ ...activityWithImage, tags: tags.rows, references: refs.rows, progressions: progs.rows });
  } catch (err) { next(err); }
});

// ─── Update activity ──────────────────────────────────────────────────────────
router.put('/:id', validateBody(activitySchema), async (req, res, next) => {
  try {
    const existing = await db.execute({ sql: 'SELECT id FROM activities WHERE id = ?', args: [req.params.id] });
    if (!existing.rows[0]) { res.status(404).json({ error: 'Activity not found' }); return; }
    const { title, summary, description, activity_type, duration_minutes, field_setup, coaching_points, flexibility_notes, image_id, video_url, video_type } = req.body;
    await db.execute({
      sql: `UPDATE activities SET title=?, summary=?, description=?, activity_type=?, duration_minutes=?,
            field_setup=?, coaching_points=?, flexibility_notes=?, image_id=?, video_url=?, video_type=?,
            updated_at=datetime('now') WHERE id=?`,
      args: [title, summary, description, activity_type ?? null, duration_minutes ?? null, field_setup ?? null, coaching_points ?? null, flexibility_notes ?? null, image_id ?? null, video_url ?? null, video_type ?? null, req.params.id],
    });
    const row = await db.execute({ sql: 'SELECT * FROM activities WHERE id = ?', args: [req.params.id] });
    res.json(row.rows[0]);
  } catch (err) { next(err); }
});

// ─── Delete activity ──────────────────────────────────────────────────────────
router.delete('/:id', async (req, res, next) => {
  try {
    const existing = await db.execute({ sql: 'SELECT id FROM activities WHERE id = ?', args: [req.params.id] });
    if (!existing.rows[0]) { res.status(404).json({ error: 'Activity not found' }); return; }
    await db.execute({ sql: 'DELETE FROM activities WHERE id = ?', args: [req.params.id] });
    res.status(204).send();
  } catch (err) { next(err); }
});

// ─── Clone activity ───────────────────────────────────────────────────────────
router.post('/:id/clone', async (req, res, next) => {
  try {
    const src = await db.execute({ sql: 'SELECT * FROM activities WHERE id = ?', args: [req.params.id] });
    if (!src.rows[0]) { res.status(404).json({ error: 'Activity not found' }); return; }
    const s = src.rows[0] as Record<string, unknown>;

    const ins = await db.execute({
      sql: 'INSERT INTO activities (title, summary, description, activity_type, duration_minutes, field_setup, coaching_points, flexibility_notes, image_id, video_url, video_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      args: [`${String(s.title ?? '')} (copy)`, s.summary as InValue, s.description as InValue, s.activity_type as InValue, s.duration_minutes as InValue, s.field_setup as InValue, s.coaching_points as InValue, s.flexibility_notes as InValue, s.image_id as InValue, s.video_url as InValue, s.video_type as InValue],
    });
    const newId = ins.lastInsertRowid!;

    const tags = await db.execute({ sql: 'SELECT * FROM activity_framework_tags WHERE activity_id = ?', args: [req.params.id] });
    for (const t of tags.rows as Record<string, unknown>[]) {
      await db.execute({
        sql: 'INSERT INTO activity_framework_tags (activity_id, framework_id, phase_section_id, principle_section_id, sub_principle_section_id) VALUES (?, ?, ?, ?, ?)',
        args: [newId, t.framework_id as InValue, t.phase_section_id as InValue, t.principle_section_id as InValue, t.sub_principle_section_id as InValue],
      });
    }

    const refs = await db.execute({ sql: 'SELECT * FROM activity_references WHERE activity_id = ? ORDER BY order_index ASC', args: [req.params.id] });
    for (const r of refs.rows as Record<string, unknown>[]) {
      await db.execute({
        sql: 'INSERT INTO activity_references (activity_id, url, label, order_index) VALUES (?, ?, ?, ?)',
        args: [newId, r.url as InValue, r.label as InValue, r.order_index as InValue],
      });
    }

    const progs = await db.execute({ sql: 'SELECT * FROM activity_progressions WHERE activity_id = ?', args: [req.params.id] });
    for (const p of progs.rows as Record<string, unknown>[]) {
      await db.execute({
        sql: 'INSERT INTO activity_progressions (activity_id, progression_activity_id) VALUES (?, ?)',
        args: [newId, p.progression_activity_id as InValue],
      }).catch(() => {}); // ignore unique constraint
    }

    const row = await db.execute({ sql: 'SELECT * FROM activities WHERE id = ?', args: [newId] });
    res.status(201).json(row.rows[0]);
  } catch (err) { next(err); }
});

// ─── Tags ─────────────────────────────────────────────────────────────────────
router.get('/:id/tags', async (req, res, next) => {
  try {
    const result = await db.execute({
      sql: `SELECT aft.*,
              f.name as framework_name,
              phase.title as phase_title,
              prin.title as principle_title,
              sub.title as sub_principle_title
            FROM activity_framework_tags aft
            JOIN frameworks f ON f.id = aft.framework_id
            LEFT JOIN framework_sections phase ON phase.id = aft.phase_section_id
            LEFT JOIN framework_sections prin ON prin.id = aft.principle_section_id
            LEFT JOIN framework_sections sub ON sub.id = aft.sub_principle_section_id
            WHERE aft.activity_id = ? ORDER BY aft.id ASC`,
      args: [req.params.id],
    });
    res.json(result.rows);
  } catch (err) { next(err); }
});

router.post('/:id/tags', validateBody(tagSchema), async (req, res, next) => {
  try {
    const { framework_id, phase_section_id, principle_section_id, sub_principle_section_id } = req.body;
    const ins = await db.execute({
      sql: 'INSERT INTO activity_framework_tags (activity_id, framework_id, phase_section_id, principle_section_id, sub_principle_section_id) VALUES (?, ?, ?, ?, ?)',
      args: [req.params.id, framework_id, phase_section_id ?? null, principle_section_id ?? null, sub_principle_section_id ?? null],
    });
    const row = await db.execute({
      sql: `SELECT aft.*, f.name as framework_name,
              phase.title as phase_title, prin.title as principle_title, sub.title as sub_principle_title
            FROM activity_framework_tags aft
            JOIN frameworks f ON f.id = aft.framework_id
            LEFT JOIN framework_sections phase ON phase.id = aft.phase_section_id
            LEFT JOIN framework_sections prin ON prin.id = aft.principle_section_id
            LEFT JOIN framework_sections sub ON sub.id = aft.sub_principle_section_id
            WHERE aft.id = ?`,
      args: [ins.lastInsertRowid!],
    });
    res.status(201).json(row.rows[0]);
  } catch (err) { next(err); }
});

router.delete('/:id/tags/:tagId', async (req, res, next) => {
  try {
    await db.execute({ sql: 'DELETE FROM activity_framework_tags WHERE id = ? AND activity_id = ?', args: [req.params.tagId, req.params.id] });
    res.status(204).send();
  } catch (err) { next(err); }
});

// ─── References ───────────────────────────────────────────────────────────────
router.get('/:id/references', async (req, res, next) => {
  try {
    const result = await db.execute({
      sql: 'SELECT * FROM activity_references WHERE activity_id = ? ORDER BY order_index ASC, id ASC',
      args: [req.params.id],
    });
    res.json(result.rows);
  } catch (err) { next(err); }
});

router.post('/:id/references', validateBody(referenceSchema), async (req, res, next) => {
  try {
    const { url, label, order_index } = req.body;
    const ins = await db.execute({
      sql: 'INSERT INTO activity_references (activity_id, url, label, order_index) VALUES (?, ?, ?, ?)',
      args: [req.params.id, url, label ?? null, order_index ?? 0],
    });
    const row = await db.execute({ sql: 'SELECT * FROM activity_references WHERE id = ?', args: [ins.lastInsertRowid!] });
    res.status(201).json(row.rows[0]);
  } catch (err) { next(err); }
});

router.put('/:id/references/:refId', validateBody(referenceSchema), async (req, res, next) => {
  try {
    const { url, label, order_index } = req.body;
    await db.execute({
      sql: 'UPDATE activity_references SET url=?, label=?, order_index=? WHERE id=? AND activity_id=?',
      args: [url, label ?? null, order_index ?? 0, req.params.refId, req.params.id],
    });
    const row = await db.execute({ sql: 'SELECT * FROM activity_references WHERE id = ?', args: [req.params.refId] });
    res.json(row.rows[0]);
  } catch (err) { next(err); }
});

router.delete('/:id/references/:refId', async (req, res, next) => {
  try {
    await db.execute({ sql: 'DELETE FROM activity_references WHERE id = ? AND activity_id = ?', args: [req.params.refId, req.params.id] });
    res.status(204).send();
  } catch (err) { next(err); }
});

// ─── Progressions ─────────────────────────────────────────────────────────────
router.get('/:id/progressions', async (req, res, next) => {
  try {
    const result = await db.execute({
      sql: `SELECT ap.*, a.title as progression_title, a.summary as progression_summary
            FROM activity_progressions ap
            JOIN activities a ON a.id = ap.progression_activity_id
            WHERE ap.activity_id = ? ORDER BY ap.id ASC`,
      args: [req.params.id],
    });
    res.json(result.rows);
  } catch (err) { next(err); }
});

router.post('/:id/progressions', validateBody(progressionSchema), async (req, res, next) => {
  try {
    const { progression_activity_id } = req.body;
    const ins = await db.execute({
      sql: 'INSERT INTO activity_progressions (activity_id, progression_activity_id) VALUES (?, ?)',
      args: [req.params.id, progression_activity_id],
    });
    const row = await db.execute({
      sql: `SELECT ap.*, a.title as progression_title, a.summary as progression_summary
            FROM activity_progressions ap
            JOIN activities a ON a.id = ap.progression_activity_id
            WHERE ap.id = ?`,
      args: [ins.lastInsertRowid!],
    });
    res.status(201).json(row.rows[0]);
  } catch (err) { next(err); }
});

router.delete('/:id/progressions/:progressionId', async (req, res, next) => {
  try {
    await db.execute({ sql: 'DELETE FROM activity_progressions WHERE id = ? AND activity_id = ?', args: [req.params.progressionId, req.params.id] });
    res.status(204).send();
  } catch (err) { next(err); }
});

// ─── Video upload ─────────────────────────────────────────────────────────────
router.post('/videos', videoUpload.single('video'), async (req, res, next) => {
  try {
    const file = req.file;
    if (!file) { res.status(400).json({ error: 'No video provided' }); return; }
    res.status(201).json({ filename: file.filename, url: `/videos/${file.filename}` });
  } catch (err) { next(err); }
});

// ─── Image upload ─────────────────────────────────────────────────────────────
router.post('/images', imageUpload.array('images'), async (req, res, next) => {
  try {
    const files = (req.files as Express.Multer.File[]) ?? [];
    if (!files.length) { res.status(400).json({ error: 'No images provided' }); return; }

    const results = [];
    for (const file of files) {
      const ins = await db.execute({
        sql: 'INSERT INTO activity_images (filename, original_name, mime_type) VALUES (?, ?, ?)',
        args: [file.filename, file.originalname, file.mimetype],
      });
      results.push({ id: Number(ins.lastInsertRowid!), filename: file.filename, url: `/images/${file.filename}` });
    }

    res.status(201).json(results.length === 1 ? results[0] : results);
  } catch (err) { next(err); }
});

export default router;
