# Implementation Plan Eight — Playmaker: Training Activities

## Overview

Build out the Playmaker feature with a training activities library. Coaches can create, import, edit, clone, and delete activities. Activities support flexible DNA Framework categorization, progression linking, external references, and image upload infrastructure. Training sessions are out of scope and will follow as a standalone feature.

---

## Current State

- `PlaymakerPage.tsx` renders a placeholder "Coming soon." message
- The sidebar already has a "Playmaker" nav entry pointing to `/playmaker`
- `frameworks` and `framework_sections` tables exist and are fully operational — activities will reference them for categorization
- Multer is already installed (used by framework import) — image upload can reuse it
- All API/client patterns follow the frameworks feature (React Query, Zod validation, `apiFetch`, `Dialog`, `Input`, `Textarea`, `Button` components)

---

## Data Model

### New Tables

```sql
CREATE TABLE IF NOT EXISTS activities (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  title            TEXT NOT NULL,
  summary          TEXT NOT NULL,
  description      TEXT NOT NULL,
  activity_type    TEXT,
  duration_minutes INTEGER,
  field_setup      TEXT,
  coaching_points  TEXT,
  flexibility_notes TEXT,
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

-- DNA Framework categorization tags
-- tag_type: 'phase' | 'principle' | 'sub_principle'
CREATE TABLE IF NOT EXISTS activity_framework_tags (
  id                   INTEGER PRIMARY KEY AUTOINCREMENT,
  activity_id          INTEGER NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  framework_id         INTEGER NOT NULL REFERENCES frameworks(id) ON DELETE CASCADE,
  phase_section_id     INTEGER REFERENCES framework_sections(id) ON DELETE SET NULL,
  principle_section_id INTEGER REFERENCES framework_sections(id) ON DELETE SET NULL,
  sub_principle_section_id INTEGER REFERENCES framework_sections(id) ON DELETE SET NULL,
  created_at           TEXT NOT NULL DEFAULT (datetime('now'))
);

-- External http references
CREATE TABLE IF NOT EXISTS activity_references (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  activity_id INTEGER NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  url         TEXT NOT NULL,
  label       TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Progression links: activity → next activity candidate
CREATE TABLE IF NOT EXISTS activity_progressions (
  id                     INTEGER PRIMARY KEY AUTOINCREMENT,
  activity_id            INTEGER NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  progression_activity_id INTEGER NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  created_at             TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(activity_id, progression_activity_id)
);

-- Image storage (infrastructure for future Activity Image feature)
CREATE TABLE IF NOT EXISTS activity_images (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  filename      TEXT NOT NULL,
  original_name TEXT,
  mime_type     TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
```

**Notes:**
- `activity_framework_tags` stores one row per framework-categorization grouping. A single row captures a phase + principle + sub-principle from one framework. Multiple rows allow tagging across multiple frameworks or multiple phases within the same framework.
- `activity_images` stores uploaded images independently of activities. The activity-to-image association is deferred to the future Activity Image feature.
- Images are stored on disk at `data/images/<filename>` and served via a static route.

---

## Activity Type Options

Predefined values (stored as plain text in the `activity_type` column — the UI offers these as a dropdown but also allows free text entry to stay flexible):

```
Warm Up, Possession, Finishing, Scrimmage, Set Piece, Defending, Transition, Technical, Fitness, Other
```

---

## Activity Import Markdown Template

A new template file at `assets/activity-import-template.md` defines the format for bulk activity imports. The parser maps named `##` sections to activity fields.

```markdown
# Activity Title

## Summary
One to two sentence summary of the activity.

## Description
Full description including rules, organization, and flow of the activity.

## Activity Type
Possession

## Duration
20

## Field Setup
Describe the field dimensions, markings, and player setup.

## Coaching Points
- First key coaching point
- Second key coaching point

## Flexibility Notes
Notes on how this activity can be adapted or what makes it flexible across contexts.

## External References
- https://example.com/drill-video
- https://example.com/additional-resource

## DNA Tags
Framework: US Soccer Training Framework
Phase: Attacking
Principle: Create Attacking Shape
Sub-Principle: Provide Width
```

**Parser rules:**
- `# H1` → `title`
- `## Summary` → `summary` (required)
- `## Description` → `description` (required)
- `## Activity Type` → `activity_type` (first non-empty line of content)
- `## Duration` → `duration_minutes` (parsed as integer)
- `## Field Setup` → `field_setup`
- `## Coaching Points` → `coaching_points`
- `## Flexibility Notes` → `flexibility_notes`
- `## External References` → parsed line by line; lines starting with `https?://` become reference URLs; remaining text on the same line (after a space) or on the next line becomes the label
- `## DNA Tags` → parsed as key-value pairs (`Framework:`, `Phase:`, `Principle:`, `Sub-Principle:`); framework section IDs are resolved by name lookup at import time; unmatched names are skipped with a warning
- Multiple `## DNA Tags` blocks are allowed for tagging across multiple frameworks

---

## API Endpoints

### New router: `server/src/routes/activities.ts`

```
GET    /api/activities                  List all activities (with counts)
POST   /api/activities                  Create activity
POST   /api/activities/import           Import activity from markdown file
GET    /api/activities/:id              Get activity with tags, references, progressions
PUT    /api/activities/:id              Update activity fields
DELETE /api/activities/:id              Delete activity
POST   /api/activities/:id/clone        Clone activity (returns new activity)

GET    /api/activities/:id/tags         List framework tags for activity
POST   /api/activities/:id/tags         Add framework tag
DELETE /api/activities/:id/tags/:tagId  Remove framework tag

GET    /api/activities/:id/references          List references
POST   /api/activities/:id/references          Add reference
PUT    /api/activities/:id/references/:refId   Update reference
DELETE /api/activities/:id/references/:refId   Delete reference

GET    /api/activities/:id/progressions               List progressions
POST   /api/activities/:id/progressions               Add progression link
DELETE /api/activities/:id/progressions/:progressionId Remove progression link

POST   /api/images                     Upload image(s); returns { id, filename, url }
GET    /api/images/:filename            Serve image (via static middleware or dedicated route)
```

### Zod schemas

```typescript
const activitySchema = z.object({
  title: z.string().min(1),
  summary: z.string().min(1),
  description: z.string().min(1),
  activity_type: z.string().optional().nullable(),
  duration_minutes: z.number().int().positive().optional().nullable(),
  field_setup: z.string().optional().nullable(),
  coaching_points: z.string().optional().nullable(),
  flexibility_notes: z.string().optional().nullable(),
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
```

---

## Client Types (`client/src/types.ts` additions)

```typescript
export interface Activity {
  id: number;
  title: string;
  summary: string;
  description: string;
  activity_type: string | null;
  duration_minutes: number | null;
  field_setup: string | null;
  coaching_points: string | null;
  flexibility_notes: string | null;
  tag_count?: number;
  created_at: string;
  updated_at: string;
}

export interface ActivityFrameworkTag {
  id: number;
  activity_id: number;
  framework_id: number;
  framework_name: string;
  phase_section_id: number | null;
  phase_title: string | null;
  principle_section_id: number | null;
  principle_title: string | null;
  sub_principle_section_id: number | null;
  sub_principle_title: string | null;
  created_at: string;
}

export interface ActivityReference {
  id: number;
  activity_id: number;
  url: string;
  label: string | null;
  order_index: number;
  created_at: string;
}

export interface ActivityProgression {
  id: number;
  activity_id: number;
  progression_activity_id: number;
  progression_title: string;
  progression_summary: string;
  created_at: string;
}

export interface ActivityDetail extends Activity {
  tags: ActivityFrameworkTag[];
  references: ActivityReference[];
  progressions: ActivityProgression[];
}

export interface ActivityImportResult {
  activity: Activity;
  warnings: string[];
}

export interface UploadedImage {
  id: number;
  filename: string;
  url: string;
}
```

---

## Client API (`client/src/api/activities.ts`)

React Query hooks following the same pattern as `client/src/api/frameworks.ts`:

- `useActivities()` — list
- `useActivity(id)` — detail with tags, references, progressions
- `useCreateActivity()` — mutation
- `useImportActivity()` — multipart form mutation (returns `ActivityImportResult`)
- `useUpdateActivity()` — mutation
- `useDeleteActivity()` — mutation
- `useCloneActivity()` — mutation (returns new Activity)
- `useAddTag()`, `useDeleteTag()` — tag mutations
- `useAddReference()`, `useUpdateReference()`, `useDeleteReference()` — reference mutations
- `useAddProgression()`, `useDeleteProgression()` — progression mutations
- `useUploadImage()` — image upload mutation

---

## UI Layout

The Playmaker page follows the same master-detail pattern as `DNAFrameworksPage`.

```
┌─────────────────────────────────────────────────────────────────┐
│  Left Panel (w-72)             │  Right Panel (flex-1)          │
│  ─────────────────────────     │  ────────────────────────────  │
│  [Playmaker header + actions]  │  Activity detail view          │
│  [Search input]                │                                │
│  [Filter: Activity Type ▼]     │  (empty state: select an       │
│  ─────────────────────────     │   activity or create one)      │
│  Activity list (scrollable)    │                                │
│  ─ ActivityCard rows           │                                │
│    title, type badge, duration │                                │
└─────────────────────────────────────────────────────────────────┘
```

### Activity Detail Panel sections (in order):

1. **Header** — title, activity type badge, duration, edit/clone/delete actions
2. **Summary** — displayed as text
3. **Description** — rendered as markdown
4. **DNA Tags** — list of framework categorizations, each showing: Framework › Phase › Principle › Sub-Principle. "Add Tag" button opens a tag form.
5. **Field Setup** — rendered as markdown (if present)
6. **Coaching Points** — rendered as markdown (if present)
7. **Flexibility Notes** — rendered as markdown (if present)
8. **External References** — list of clickable links with labels
9. **Progressions** — list of linked activities (clickable to navigate to that activity). "Add Progression" button opens a search-by-title selector.

### Modals / Dialogs

- **Create Activity** — full-field form in a large dialog (all required + optional fields, except tags/references/progressions which are added after creation)
- **Edit Activity** — same form, pre-populated
- **Import Activity** — file picker (`.md` / `.txt`) + optional title override; shows warnings from the import result
- **Add Tag** — framework selector (dropdown from `useFrameworks()`), then cascading selectors for Phase, Principle, Sub-Principle (populated from the selected framework's section tree)
- **Add Progression** — searchable activity picker (text input filters activity titles, lists matches, select one to link)
- **Image Upload** — drag-and-drop or file picker; accepts `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`; calls `POST /api/images`

---

## Files to Create

```
server/src/routes/activities.ts         API routes for activities + tags + references + progressions
server/src/lib/activityParser.ts        Markdown import parser for activities
client/src/api/activities.ts            React Query hooks
client/src/pages/PlaymakerPage.tsx      Full Playmaker page (replace stub)
client/src/components/activities/
  ActivityList.tsx                      Left panel with search/filter + activity rows
  ActivityDetail.tsx                    Right panel with all section views
  ActivityForm.tsx                      Create/Edit form (used in Dialog)
  ImportActivityModal.tsx               Import modal with file picker
  TagForm.tsx                           Add DNA tag modal (cascading framework selectors)
  ProgressionPicker.tsx                 Add progression modal (searchable list)
  ImageUploadModal.tsx                  Image upload modal (infrastructure only — not linked to activities yet)
assets/activity-import-template.md     Import format documentation + example
```

## Files to Modify

```
server/src/db.ts          Add 5 new tables; add activityImages static-serve path setup
server/src/index.ts       Register activitiesRouter + static /images route
client/src/types.ts       Add Activity*, ActivityDetail, ActivityImportResult, UploadedImage
```

---

## Implementation Steps

### Step 1 — Database schema (`server/src/db.ts`)

Add the five new tables to `initDb()` using `CREATE TABLE IF NOT EXISTS`. Add `fs.mkdirSync` call to create `data/images/` directory. Use `.catch(() => {})` for any future migration alter statements consistent with the existing pattern.

### Step 2 — Activity parser (`server/src/lib/activityParser.ts`)

Write `parseActivityMarkdown(text: string)` that returns a structured object:

```typescript
interface ParsedActivity {
  title: string;
  summary: string;           // required — throw if missing
  description: string;       // required — throw if missing
  activity_type: string | null;
  duration_minutes: number | null;
  field_setup: string | null;
  coaching_points: string | null;
  flexibility_notes: string | null;
  references: Array<{ url: string; label: string | null }>;
  dnaTags: Array<{
    framework_name: string;
    phase: string | null;
    principle: string | null;
    sub_principle: string | null;
  }>;
  warnings: string[];
}
```

The parser reads the file as plain text, splits on `##` headings, and maps each section by normalized title match.

### Step 3 — Server routes (`server/src/routes/activities.ts`)

Implement all endpoints from the API spec above. The clone endpoint copies all activity fields and inserts fresh rows for tags, references, and progressions (progression links pointing to the same targets). Append ` (copy)` to the cloned activity's title.

The import endpoint:
1. Calls `parseActivityMarkdown`
2. Resolves DNA tag framework/section IDs by name lookups in the DB
3. Inserts the activity + tags + references in a transaction
4. Returns `{ activity, warnings }`

Image upload endpoint:
- Uses multer with `diskStorage` into `data/images/`
- Accepts `image/*` MIME types + `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp` extensions
- Returns `{ id, filename, url: /images/<filename> }`

### Step 4 — Register routes (`server/src/index.ts`)

```typescript
import activitiesRouter from './routes/activities';
// ...
app.use('/api/activities', activitiesRouter);
app.use('/images', express.static(path.resolve(__dirname, '../../data/images')));
```

### Step 5 — Client types (`client/src/types.ts`)

Append all new interfaces from the Client Types section above.

### Step 6 — Client API hooks (`client/src/api/activities.ts`)

Implement all React Query hooks. Use `apiFetch` for JSON endpoints. Use raw `fetch` with `FormData` for the import and image upload mutations (same pattern as `useImportFramework`).

### Step 7 — Activity components

#### `ActivityForm.tsx`
A controlled form component accepting `initialValues` and `onSubmit`. Fields:
- `title` — Input, required
- `summary` — Textarea (3 rows), required
- `description` — Textarea (6 rows), required
- `activity_type` — a `<select>` offering predefined types + "Other" (free-text fallback via Input revealed when "Other" is chosen)
- `duration_minutes` — Input type="number"
- `field_setup` — Textarea (4 rows), markdown hint label
- `coaching_points` — Textarea (4 rows), markdown hint label
- `flexibility_notes` — Textarea (3 rows)

Used inside both Create and Edit dialogs.

#### `TagForm.tsx`
Three cascading selects:
1. Framework (populated from `useFrameworks()`)
2. Phase — top-level sections of selected framework
3. Principle — children of selected Phase
4. Sub-Principle — children of selected Principle (optional)

On submit, calls `useAddTag()`.

#### `ProgressionPicker.tsx`
- Text input to search activities by title (client-side filter over `useActivities()` result, excluding the current activity and any already-linked progressions)
- Results list; click to select
- On select, calls `useAddProgression()`

#### `ActivityDetail.tsx`
Master detail panel showing all fields. Each section uses an in-line "Edit" affordance (opens the relevant dialog/inline form). Renders `description`, `field_setup`, `coaching_points`, `flexibility_notes` as markdown using `ReactMarkdown` (already in the project via DNAFrameworksPage).

#### `ActivityList.tsx`
Left panel:
- Search input (filters by title, debounced)
- Activity type filter dropdown (populated from distinct `activity_type` values in the list)
- Scrollable list of activity rows showing title, type badge (styled like `Badge.tsx`), duration

#### `ImportActivityModal.tsx`
- File picker for `.md`/`.txt`
- On success, shows any `warnings` in a yellow callout before closing
- Navigates to the newly imported activity

#### `ImageUploadModal.tsx`
- File input accepting image types
- Progress indicator
- On success, shows uploaded image preview + filename
- This is infrastructure only in this phase; images are stored but not attached to activities yet

### Step 8 — Playmaker page (`client/src/pages/PlaymakerPage.tsx`)

Replace the stub with the master-detail layout. Manages `selectedActivityId` state. Left panel renders `<ActivityList>`. Right panel renders `<ActivityDetail>` or an empty state.

Header actions:
- "Import" button → `ImportActivityModal`
- "New" button → Create Activity dialog
- "Upload Image" button → `ImageUploadModal`

### Step 9 — Activity import template (`assets/activity-import-template.md`)

Write the template file as documented in the Import Template section above. Follow the same comment-header style as `assets/framework-import-template.md`.

---

## Out of Scope (Future Features)

- **Activity Image** — attaching an uploaded image to a specific activity (image upload infrastructure is built, the association is not)
- **Activity Video** — YouTube/Vimeo/local video embedding
- **Training Sessions** — building sessions from activities
- **Activity reorder** — drag-to-reorder in list or within progressions
- **Bulk operations** — multi-select delete or tag assignment

---

## Open Questions

1. Should Activity Type be a fixed enum (enforced server-side) or free text with UI suggestions? The current plan uses free text stored as-is, with a predefined suggestion list in the UI. Server does no enum validation, keeping the model flexible.
2. For the DNA Tags cascading selector, should selecting only a Phase (without Principle/Sub-Principle) be allowed? Current plan: yes — all three levels are independently optional.
3. Should progression links be directional (A → B means "B is a progression of A") or bidirectional? Current plan: directional. "Progressions" on an activity's detail panel shows activities you've tagged as next steps *from* that activity.
