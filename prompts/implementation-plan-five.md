# Implementation Plan: DNA Frameworks

## Overview

Add a **DNA Frameworks** page that allows users to import, parse, view, and edit soccer development frameworks (e.g., US Soccer Training Framework, club DNA documents). Frameworks are stored in SQLite, parsed into navigable sections, and made available for reference elsewhere in the app.

---

## Database Schema

### New table: `frameworks`

```sql
CREATE TABLE frameworks (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  name      TEXT NOT NULL,
  source    TEXT,              -- e.g., "US Soccer Federation", "FC Barcelona"
  version   TEXT,              -- e.g., "2.0", "2023 Edition"
  description TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

### New table: `framework_sections`

```sql
CREATE TABLE framework_sections (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  framework_id INTEGER NOT NULL REFERENCES frameworks(id) ON DELETE CASCADE,
  parent_id    INTEGER REFERENCES framework_sections(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  content      TEXT,            -- markdown/plain text body
  order_index  INTEGER NOT NULL DEFAULT 0,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
);
```

Sections are hierarchical (parent_id allows chapters → sub-sections → items). This lets structured frameworks be navigated like a document outline.

---

## Backend

### 1. Database migration (`server/src/db.ts`)

Add `CREATE TABLE IF NOT EXISTS` statements for both tables in the existing `initDb()` function, matching the pattern already used for groups/teams/players.

### 2. Parsing utilities (`server/src/lib/frameworkParser.ts`)

A module that accepts raw file content and returns a structured array of sections.

**Supported input types:**

| Type | Strategy |
|------|----------|
| `.md` / `.txt` | Split on `#` / `##` / `###` markdown headings; body is everything until the next heading at the same or higher level |
| `.pdf` | Use `pdf-parse` npm package to extract text, then apply the markdown-heading splitter on the extracted text |
| Manual (no file) | Framework is created empty; sections are added via the UI |

Parser output shape:
```ts
interface ParsedSection {
  title: string;
  content: string;
  level: number;       // 1 = top-level chapter, 2 = sub-section, etc.
  children: ParsedSection[];
}
```

The server flattens this tree into rows for `framework_sections`, computing `parent_id` and `order_index` during insert.

### 3. API routes (`server/src/routes/frameworks.ts`)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/frameworks` | List all frameworks (id, name, source, version, description, section count) |
| `POST` | `/api/frameworks` | Create framework manually (body: name, source, version, description) |
| `POST` | `/api/frameworks/import` | Upload a file (multipart/form-data: file + name + source + version). Backend parses and inserts. |
| `GET` | `/api/frameworks/:id` | Get one framework with all sections as a nested tree |
| `PUT` | `/api/frameworks/:id` | Update framework metadata |
| `DELETE` | `/api/frameworks/:id` | Delete framework and all sections (CASCADE) |
| `GET` | `/api/frameworks/:id/sections` | Get flat list of all sections for a framework |
| `POST` | `/api/frameworks/:id/sections` | Add a new section manually |
| `PUT` | `/api/frameworks/:id/sections/:sectionId` | Update section title/content/order |
| `DELETE` | `/api/frameworks/:id/sections/:sectionId` | Delete a section (and its children via CASCADE) |

Register the router in `server/src/index.ts` alongside existing route imports.

**File upload middleware:** Use `multer` (in-memory storage, 20 MB limit) for the `/import` endpoint. Only `.pdf`, `.md`, and `.txt` files are accepted.

---

## Frontend

### 1. API hooks (`client/src/api/frameworks.ts`)

Using the same TanStack React Query pattern as `players.ts` and `groups.ts`:

- `useFrameworks()` — `useQuery` for GET /api/frameworks
- `useFramework(id)` — `useQuery` for GET /api/frameworks/:id (includes sections)
- `useCreateFramework()` — `useMutation` for POST /api/frameworks
- `useImportFramework()` — `useMutation` for POST /api/frameworks/import (FormData)
- `useUpdateFramework()` — `useMutation` for PUT /api/frameworks/:id
- `useDeleteFramework()` — `useMutation` for DELETE /api/frameworks/:id
- `useAddSection()` — `useMutation` for POST /api/frameworks/:id/sections
- `useUpdateSection()` — `useMutation` for PUT /api/frameworks/:id/sections/:sectionId
- `useDeleteSection()` — `useMutation` for DELETE /api/frameworks/:id/sections/:sectionId

Invalidate `['frameworks']` and `['frameworks', id]` on mutations.

### 2. DNA Frameworks page (`client/src/pages/DNAFrameworksPage.tsx`)

**Layout (two-panel):**

```
┌─────────────────────┬──────────────────────────────────────┐
│  Frameworks List    │  Framework Detail / Editor            │
│                     │                                        │
│  [+ Import]         │  (select a framework to view)          │
│  [+ New]            │                                        │
│  ─────────────────  │  Title  ·  Source  ·  Version          │
│  US Soccer TF       │  ─────────────────────────────────── │
│  FC Barcelona DNA   │  [Section outline / tree]              │
│  Club XYZ DNA       │                                        │
│                     │  [Selected section content editor]     │
└─────────────────────┴──────────────────────────────────────┘
```

**Left panel — framework list:**
- Each card shows name, source, version, section count
- Active framework is highlighted
- Delete icon on hover (with confirmation dialog)

**Right panel — framework detail:**
- Header: editable framework name / source / version (inline edit or Edit button → modal)
- Section outline: collapsible tree of sections (using recursive component)
- Click a section to view its content in a text area below the outline
- Edit button on each section to open a slide-over or inline editor for title + content (markdown textarea)
- Add Section button opens a dialog: title, parent section (dropdown), content
- Reorder sections via up/down arrow buttons (updates `order_index`)

**Import modal (triggered by "+ Import" button):**
```
┌──────────────────────────────────┐
│  Import Framework                │
│                                  │
│  Name *         [___________]   │
│  Source         [___________]   │
│  Version        [___________]   │
│  File (.pdf/.md/.txt)            │
│  [Choose file]  filename.pdf     │
│                                  │
│          [Cancel]  [Import]      │
└──────────────────────────────────┘
```

After import, the new framework is selected and its parsed sections are immediately visible.

**New (manual) modal:**
Same as Import minus the file field. Creates an empty framework the user populates section by section.

### 3. Section content display

Render section content as formatted markdown using a lightweight markdown renderer (e.g., `react-markdown` if not already present, or plain `<pre>` with whitespace-pre-wrap if keeping dependencies minimal). In edit mode, switch to a plain `<textarea>`.

### 4. Routing (`client/src/App.tsx`)

Add:
```tsx
<Route path="/dna-frameworks" element={<DNAFrameworksPage />} />
```

### 5. Navigation (`client/src/components/AppShell.tsx` or equivalent)

Add a nav link **"DNA Frameworks"** with an appropriate Lucide icon (e.g., `BookOpen` or `ClipboardList`) in the sidebar/nav alongside the existing pages.

---

## Dependencies to Add

| Package | Side | Purpose |
|---------|------|---------|
| `multer` | server | Multipart file upload handling |
| `@types/multer` | server (dev) | TypeScript types |
| `pdf-parse` | server | Extract text from PDF files |
| `react-markdown` | client | Render section content as formatted markdown (optional — can use plain textarea display first) |

---

## Implementation Order

1. **DB migration** — Add tables to `db.ts`
2. **Parser utility** — `frameworkParser.ts` (text/markdown first, PDF second)
3. **Server routes** — `frameworks.ts`, register in `index.ts`
4. **Client API hooks** — `frameworks.ts`
5. **DNAFrameworksPage** — list panel, then detail panel, then import modal
6. **Routing & navigation** — wire up the new page

---

## Out of Scope (Future)

- Full-text search across all frameworks
- Tagging sections by age group, topic, or competency pillar
- Cross-referencing framework sections from other pages (e.g., Playmaker, Squad Assist)
- AI-assisted framework summarization
- Export framework back to PDF/markdown
