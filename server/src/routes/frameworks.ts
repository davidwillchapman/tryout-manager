import { Router } from 'express';
import { z } from 'zod';
import multer from 'multer';
import { db } from '../db';
import { validateBody } from '../middleware/validateBody';
import { parseFile, flattenSections } from '../lib/frameworkParser';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

const frameworkSchema = z.object({
  name: z.string().min(1),
  source: z.string().optional().nullable(),
  version: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
});

const sectionSchema = z.object({
  title: z.string().min(1),
  content: z.string().optional().nullable(),
  parent_id: z.number().optional().nullable(),
  order_index: z.number().optional(),
});

// Build nested section tree from flat rows
function buildTree(rows: Record<string, unknown>[]): Record<string, unknown>[] {
  const map = new Map<number, Record<string, unknown>>();
  const roots: Record<string, unknown>[] = [];

  for (const row of rows) {
    map.set(row.id as number, { ...row, children: [] });
  }
  for (const [, node] of map) {
    if (node.parent_id == null) {
      roots.push(node);
    } else {
      const parent = map.get(node.parent_id as number);
      if (parent) {
        (parent.children as Record<string, unknown>[]).push(node);
      } else {
        roots.push(node);
      }
    }
  }
  return roots;
}

// GET /api/frameworks
router.get('/', async (_req, res, next) => {
  try {
    const result = await db.execute(`
      SELECT f.*, COUNT(fs.id) as section_count
      FROM frameworks f
      LEFT JOIN framework_sections fs ON fs.framework_id = f.id
      GROUP BY f.id ORDER BY f.name
    `);
    res.json(result.rows);
  } catch (err) { next(err); }
});

// POST /api/frameworks
router.post('/', validateBody(frameworkSchema), async (req, res, next) => {
  try {
    const { name, source, version, description } = req.body;
    const ins = await db.execute({
      sql: 'INSERT INTO frameworks (name, source, version, description) VALUES (?, ?, ?, ?)',
      args: [name, source ?? null, version ?? null, description ?? null],
    });
    const row = await db.execute({ sql: 'SELECT * FROM frameworks WHERE id = ?', args: [ins.lastInsertRowid!] });
    res.status(201).json(row.rows[0]);
  } catch (err) { next(err); }
});

// POST /api/frameworks/import
router.post('/import', upload.single('file'), async (req, res, next) => {
  try {
    const { name, source, version, description } = req.body as Record<string, string>;
    if (!name) { res.status(400).json({ error: 'name is required' }); return; }

    const ins = await db.execute({
      sql: 'INSERT INTO frameworks (name, source, version, description) VALUES (?, ?, ?, ?)',
      args: [name, source ?? null, version ?? null, description ?? null],
    });
    const frameworkId = ins.lastInsertRowid!;

    if (req.file) {
      const allowed = ['text/markdown', 'text/plain'];
      const ext = req.file.originalname.split('.').pop()?.toLowerCase();
      if (!allowed.includes(req.file.mimetype) && !['md', 'txt'].includes(ext ?? '')) {
        res.status(400).json({ error: 'Only .md and .txt files are accepted' });
        return;
      }

      const sections = await parseFile(req.file.buffer, req.file.mimetype, req.file.originalname);
      const flat = flattenSections(sections);

      // Insert sections sequentially so we can resolve parent IDs
      const insertedIds: number[] = [];
      for (const s of flat) {
        const parentDbId = s.parentIndex !== null ? insertedIds[s.parentIndex] : null;
        const sec = await db.execute({
          sql: 'INSERT INTO framework_sections (framework_id, parent_id, title, content, order_index) VALUES (?, ?, ?, ?, ?)',
          args: [frameworkId, parentDbId ?? null, s.title, s.content || null, s.order_index],
        });
        insertedIds.push(Number(sec.lastInsertRowid!));
      }
    }

    const fw = await db.execute({ sql: 'SELECT * FROM frameworks WHERE id = ?', args: [frameworkId] });
    res.status(201).json(fw.rows[0]);
  } catch (err) { next(err); }
});

// GET /api/frameworks/:id
router.get('/:id', async (req, res, next) => {
  try {
    const fw = await db.execute({ sql: 'SELECT * FROM frameworks WHERE id = ?', args: [req.params.id] });
    if (!fw.rows[0]) { res.status(404).json({ error: 'Framework not found' }); return; }
    const sections = await db.execute({
      sql: 'SELECT * FROM framework_sections WHERE framework_id = ? ORDER BY order_index ASC, id ASC',
      args: [req.params.id],
    });
    res.json({ ...fw.rows[0], sections: buildTree(sections.rows as Record<string, unknown>[]) });
  } catch (err) { next(err); }
});

// PUT /api/frameworks/:id
router.put('/:id', validateBody(frameworkSchema), async (req, res, next) => {
  try {
    const existing = await db.execute({ sql: 'SELECT id FROM frameworks WHERE id = ?', args: [req.params.id] });
    if (!existing.rows[0]) { res.status(404).json({ error: 'Framework not found' }); return; }
    const { name, source, version, description } = req.body;
    await db.execute({
      sql: 'UPDATE frameworks SET name = ?, source = ?, version = ?, description = ?, updated_at = datetime(\'now\') WHERE id = ?',
      args: [name, source ?? null, version ?? null, description ?? null, req.params.id],
    });
    const row = await db.execute({ sql: 'SELECT * FROM frameworks WHERE id = ?', args: [req.params.id] });
    res.json(row.rows[0]);
  } catch (err) { next(err); }
});

// DELETE /api/frameworks/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const existing = await db.execute({ sql: 'SELECT id FROM frameworks WHERE id = ?', args: [req.params.id] });
    if (!existing.rows[0]) { res.status(404).json({ error: 'Framework not found' }); return; }
    await db.execute({ sql: 'DELETE FROM frameworks WHERE id = ?', args: [req.params.id] });
    res.status(204).send();
  } catch (err) { next(err); }
});

// GET /api/frameworks/:id/sections
router.get('/:id/sections', async (req, res, next) => {
  try {
    const result = await db.execute({
      sql: 'SELECT * FROM framework_sections WHERE framework_id = ? ORDER BY order_index ASC, id ASC',
      args: [req.params.id],
    });
    res.json(result.rows);
  } catch (err) { next(err); }
});

// POST /api/frameworks/:id/sections
router.post('/:id/sections', validateBody(sectionSchema), async (req, res, next) => {
  try {
    const { title, content, parent_id, order_index } = req.body;
    const ins = await db.execute({
      sql: 'INSERT INTO framework_sections (framework_id, parent_id, title, content, order_index) VALUES (?, ?, ?, ?, ?)',
      args: [req.params.id, parent_id ?? null, title, content ?? null, order_index ?? 0],
    });
    const row = await db.execute({ sql: 'SELECT * FROM framework_sections WHERE id = ?', args: [ins.lastInsertRowid!] });
    res.status(201).json(row.rows[0]);
  } catch (err) { next(err); }
});

// PUT /api/frameworks/:id/sections/:sectionId
router.put('/:id/sections/:sectionId', validateBody(sectionSchema), async (req, res, next) => {
  try {
    const existing = await db.execute({
      sql: 'SELECT id FROM framework_sections WHERE id = ? AND framework_id = ?',
      args: [req.params.sectionId, req.params.id],
    });
    if (!existing.rows[0]) { res.status(404).json({ error: 'Section not found' }); return; }
    const { title, content, parent_id, order_index } = req.body;
    await db.execute({
      sql: 'UPDATE framework_sections SET title = ?, content = ?, parent_id = ?, order_index = ?, updated_at = datetime(\'now\') WHERE id = ?',
      args: [title, content ?? null, parent_id ?? null, order_index ?? 0, req.params.sectionId],
    });
    const row = await db.execute({ sql: 'SELECT * FROM framework_sections WHERE id = ?', args: [req.params.sectionId] });
    res.json(row.rows[0]);
  } catch (err) { next(err); }
});

// DELETE /api/frameworks/:id/sections/:sectionId
router.delete('/:id/sections/:sectionId', async (req, res, next) => {
  try {
    const existing = await db.execute({
      sql: 'SELECT id FROM framework_sections WHERE id = ? AND framework_id = ?',
      args: [req.params.sectionId, req.params.id],
    });
    if (!existing.rows[0]) { res.status(404).json({ error: 'Section not found' }); return; }
    await db.execute({ sql: 'DELETE FROM framework_sections WHERE id = ?', args: [req.params.sectionId] });
    res.status(204).send();
  } catch (err) { next(err); }
});

export default router;
