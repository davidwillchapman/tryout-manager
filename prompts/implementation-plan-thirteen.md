# Implementation Plan: Roster Depth Chart + Formation Template Editor

## Overview

Adjust the Squad Assist page in three ways:

1. **Collapse Depth Chart tab into Roster tab** — remove the standalone "Depth Chart" tab and add depth-order management directly to the roster as a new column with drag-to-reorder.
2. **Roster reordering** — let the user drag roster rows within a position group to set each player's depth-order rank.
3. **Formation template management** — let the user create and edit formation templates (named slot layouts) that serve as presets when creating new formations.

---

## 1. Task 1 — Depth Chart Column in Roster Tab

### What changes

| File | Action |
|------|--------|
| `client/src/components/squad/SquadTeamDetail.tsx` | Remove `'depth'` tab; trim tabs to `['roster', 'Roster']` + `['formations', 'Formations']` |
| `client/src/components/squad/RosterTab.tsx` | Add "Depth" column; make rows draggable within position groups |
| `client/src/components/squad/DepthChartTab.tsx` | Delete (functionality merged into RosterTab) |

### Roster table redesign

**New column set:** `#` | Drag handle | Name | Primary | Secondary | Depth | Status | Actions

**Grouping:** Group rows by `primary_position`. Render a slim group-header row between position groups (e.g., `GK`, `CB`, `Unassigned`). Use the same `POSITION_COLUMNS` constant already in `DepthChartTab.tsx` for consistent group ordering.

**Depth column:** Display the player's 1-based rank within their position group (computed client-side from sorted `depth_order`). Example: the first GK shows `1`, the second shows `2`.

**Drag-to-reorder:** Use `@dnd-kit/sortable` (already installed). Each row gets a drag handle (`GripVertical`) on the left. Dragging a row within the same position group reorders it. Cross-group drags are ignored (rows snap back). On drop, call `PUT /api/squad/teams/:teamId/players/depth-order` with the updated ranks for that group (same API as the existing depth chart).

**Edit row in the new layout:** The existing `EditRow` inline form stays; it spans all columns via `colSpan`.

**Local state pattern:** Mirror the pattern from `DepthChartTab` — keep `localPlayers` in state, `useEffect` to sync from server, optimistic reorder on drop.

### Deleting DepthChartTab

Once RosterTab covers depth ordering, `DepthChartTab.tsx` is deleted. `SquadTeamDetail.tsx` removes its import and the `depth` branch in tab rendering.

---

## 2. Task 2 — Formation Template Management

### Concept

A **formation template** is a named, reusable slot layout (slot labels + x/y positions on the field) that can be picked when creating a new formation. Today the four hardcoded templates in `formations.ts` play this role. This plan adds:

- A DB-backed `formation_templates` table so users can create and persist custom templates.
- A **Template Editor** UI (inside the Formations tab) where slots can be added, removed, and dragged to new positions.
- When creating a new formation, the user can choose any saved template (built-in or custom).

---

## 3. Database

### New table: `formation_templates`

```sql
CREATE TABLE IF NOT EXISTS formation_templates (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL,
  is_builtin  INTEGER NOT NULL DEFAULT 0,   -- 1 for the 4 seeded defaults
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
```

### New table: `formation_template_slots`

```sql
CREATE TABLE IF NOT EXISTS formation_template_slots (
  id                    INTEGER PRIMARY KEY AUTOINCREMENT,
  formation_template_id INTEGER NOT NULL REFERENCES formation_templates(id) ON DELETE CASCADE,
  slot_label            TEXT NOT NULL,
  role                  TEXT NOT NULL CHECK(role IN ('starter','first_sub')),
  x_pct                 REAL NOT NULL,
  y_pct                 REAL NOT NULL
);
```

### Seed built-in templates

On `initializeDatabase()`, after creating the tables, insert the four built-in templates (`4-3-3`, `4-4-2`, `4-2-3-1`, `3-5-2`) if they don't already exist:

```ts
const existing = db.prepare('SELECT COUNT(*) as n FROM formation_templates').get() as { n: number };
if (existing.n === 0) {
  // insert 4 rows into formation_templates with is_builtin=1
  // insert all slots from FORMATION_TEMPLATES constant into formation_template_slots
}
```

Import `FORMATION_TEMPLATES` from a shared location or duplicate the data server-side for the seed.

---

## 4. Server Routes

### New endpoints in `server/src/routes/squad.ts`

#### Formation Templates

| Method | Path | Description |
|--------|------|-------------|
| GET | `/templates` | List all templates (id, name, is_builtin, slot count) |
| GET | `/templates/:templateId` | Get template with all slots |
| POST | `/templates` | Create custom template (name + array of slots) |
| PUT | `/templates/:templateId` | Update name + replace all slots (not allowed for is_builtin=1) |
| DELETE | `/templates/:templateId` | Delete (reject if is_builtin=1) |

**`POST /templates` body:**
```json
{
  "name": "My 4-3-3 Variant",
  "slots": [
    { "slot_label": "GK", "role": "starter", "x_pct": 50, "y_pct": 88 },
    ...
  ]
}
```

**`PUT /templates/:templateId` body:** same shape; server deletes existing slots and re-inserts.

#### Formation creation update

Update `POST /teams/:teamId/formations` to accept `template_id` instead of `formation_code`:

```json
{ "name": "Main 4-3-3", "template_id": 1 }
```

Server looks up `formation_template_slots` for `template_id` and inserts them as `formation_slots`. Keep backward compatibility: if `formation_code` is sent (legacy string), resolve it to the matching built-in template by name.

#### Slot position update

Add one new endpoint to allow editing slot positions on an existing formation (needed if users drag slots to reposition them in the canvas):

| Method | Path | Description |
|--------|------|-------------|
| PATCH | `/teams/:teamId/formations/:formationId/slot-positions` | Update x_pct/y_pct for one or more slots |

Body: `[{ "slot_id": number, "x_pct": number, "y_pct": number }]`

---

## 5. Client Types (`client/src/types.ts`)

Add:

```ts
export interface FormationTemplate {
  id: number;
  name: string;
  is_builtin: boolean;
  slot_count?: number;
  slots?: FormationTemplateSlot[];
  created_at: string;
  updated_at: string;
}

export interface FormationTemplateSlot {
  id: number;
  formation_template_id: number;
  slot_label: string;
  role: 'starter' | 'first_sub';
  x_pct: number;
  y_pct: number;
}
```

---

## 6. Client API Hooks (`client/src/api/squad.ts`)

New hooks:

```ts
useFormationTemplates()           // GET /api/squad/templates
useFormationTemplate(id)          // GET /api/squad/templates/:id
useCreateFormationTemplate()      // POST /api/squad/templates
useUpdateFormationTemplate()      // PUT /api/squad/templates/:id
useDeleteFormationTemplate()      // DELETE /api/squad/templates/:id
useUpdateSlotPositions(teamId, formationId)  // PATCH .../slot-positions
```

Update `useCreateFormation(teamId)` to send `template_id` (number) instead of `formation_code` (string).

---

## 7. Client Components

### 7a. Updated `RosterTab`

```
┌──────────────────────────────────────────────────────────┐
│ 18 players                              [+ Add Player]   │
├──────────────────────────────────────────────────────────┤
│ ── GK ──────────────────────────────────────────────── │
│ ⣿  1   #12  Jordan Lee   GK  —   1  active  ✎  ✕      │
│ ⣿  2   #18  Sam Park     GK  —   2  active  ✎  ✕      │
│ ── CB ──────────────────────────────────────────────── │
│ ⣿  1   #5   Alex Muñoz   CB  —   1  active  ✎  ✕      │
│ ...                                                      │
└──────────────────────────────────────────────────────────┘
```

- Group header rows (`── GK ──`) are not sortable, just visual separators.
- Each data row has a `GripVertical` drag handle as the first cell.
- `SortableContext` wraps each position group independently.
- Depth column shows 1-based integer rank within the group.
- Drag across groups is disabled (handle is only active within the same `DndContext` per group).

**Implementation note:** Wrap each position group in its own `DndContext` + `SortableContext` (same pattern as the existing `PositionColumn` in `DepthChartTab`). This naturally prevents cross-group drags.

### 7b. `FormationsTab` — Template Manager panel

Add a toggle in the Formations tab header: **Formations** | **Templates**

When "Templates" is selected, replace the formations list + canvas with `FormationTemplateManager`.

**`FormationTemplateManager` layout:**

```
┌──────────────────────────────────────────────────────────┐
│ Templates                              [+ New Template]  │
├─────────────────────────┬────────────────────────────────┤
│ 4-3-3 (built-in)   →   │  [Template Editor Canvas]      │
│ 4-4-2 (built-in)   →   │  (slot nodes draggable to      │
│ 4-2-3-1 (built-in) →   │   reposition on the field)     │
│ 3-5-2 (built-in)   →   │                                │
│ My Custom           → ✕ │  [+ Add Slot] [Save] [Reset]  │
└─────────────────────────┴────────────────────────────────┘
```

- Built-in templates show no delete button; their slots cannot be repositioned (read-only canvas).
- Custom templates have a delete button and an editable canvas.
- "New Template" opens a dialog: template name input + formation code to copy from (optional). If a code is chosen, slots are pre-populated from that template. If left blank, canvas starts empty.

### 7c. `FormationTemplateEditor` component

Reuse the soccer field SVG from `FormationCanvas`. Key differences from `FormationCanvas`:

- No player roster sidebar (this is purely about slot layout, not player assignment).
- Slot nodes are **freely draggable** to any position on the field: dragging a slot updates its `x_pct`/`y_pct` in local state.
- Toolbar: template name (inline-editable), "Add Slot" button (opens a small popover: slot_label + role), "Remove Slot" (click a slot to select it, then delete), "Save" (calls `PUT /api/squad/templates/:id`), "Reset".
- Slot nodes render as labeled circles, same visual style as `FormationCanvas` but always in "empty" state (no player names).
- Drag uses `@dnd-kit/core` with a custom drag overlay to show the slot node while dragging.

**Position calculation:** Convert pointer position during drag to `x_pct`/`y_pct` relative to the SVG bounding box. Use `useDraggable` (not `useSortable`) since slots snap to arbitrary coordinates, not a list order.

### 7d. Updated "New Formation" dialog in `FormationsTab`

Replace the formation-code `<select>` with a template picker:

```
Formation Name: [______________]
Template:       [── select a template ──▼]
                  4-3-3 (built-in)
                  4-4-2 (built-in)
                  ...
                  My Custom
```

On submit, send `{ name, template_id }` to `POST /teams/:teamId/formations`.

### 7e. `FormationCanvas` — "Edit Layout" mode

Add an "Edit Layout" toggle button to the FormationCanvas toolbar (only enabled for formations whose source template is custom, or always enabled if we want full flexibility).

When "Edit Layout" is active:
- Slot nodes become draggable to new positions (same free-drag pattern as `FormationTemplateEditor`).
- Player roster sidebar is hidden.
- "Save Layout" calls `PATCH .../slot-positions`.
- "Assign Players" mode is restored when the toggle is turned off.

This allows one-off position tweaks per formation without touching the template.

---

## 8. Implementation Steps

### Phase 1 — DB & Server
1. Add `formation_templates` and `formation_template_slots` tables to `server/src/db.ts`.
2. Seed the four built-in templates on init.
3. Add template CRUD routes to `server/src/routes/squad.ts`.
4. Add `PATCH .../slot-positions` route.
5. Update `POST /teams/:teamId/formations` to accept `template_id`.

### Phase 2 — Types & Hooks
1. Add `FormationTemplate` and `FormationTemplateSlot` to `client/src/types.ts`.
2. Add new hooks to `client/src/api/squad.ts`.
3. Update `useCreateFormation` to use `template_id`.

### Phase 3 — Roster Depth Column
1. Rewrite `RosterTab.tsx` with position-group sections and drag-to-reorder.
2. Remove `depth` tab from `SquadTeamDetail.tsx`.
3. Delete `DepthChartTab.tsx`.

### Phase 4 — Formation Template Manager
1. Build `FormationTemplateManager` component (list + editor panel toggle in `FormationsTab`).
2. Build `FormationTemplateEditor` with free-drag slot positioning on the SVG canvas.
3. Add "New Template" dialog.
4. Update "New Formation" dialog to use template picker.

### Phase 5 — FormationCanvas Edit Layout Mode
1. Add "Edit Layout" toggle to `FormationCanvas` toolbar.
2. Wire slot-drag to `PATCH .../slot-positions` on save.

### Phase 6 — Polish
1. Read-only canvas for built-in templates (disabled drag handle, no save button).
2. Confirmation before deleting a custom template.
3. Loading states for template list and template editor.
4. Consistent navy/gold styling.

---

## 9. File Change Summary

| File | Action |
|------|--------|
| `server/src/db.ts` | Add 2 new tables + seed |
| `server/src/routes/squad.ts` | Add template CRUD + slot-positions PATCH; update formation create |
| `client/src/types.ts` | Add `FormationTemplate`, `FormationTemplateSlot` |
| `client/src/api/squad.ts` | Add template hooks; update `useCreateFormation` |
| `client/src/components/squad/SquadTeamDetail.tsx` | Remove `depth` tab |
| `client/src/components/squad/RosterTab.tsx` | Add depth column + group drag-to-reorder |
| `client/src/components/squad/DepthChartTab.tsx` | **Delete** |
| `client/src/components/squad/FormationsTab.tsx` | Add Templates toggle + template picker in dialog |
| `client/src/components/squad/FormationCanvas.tsx` | Add "Edit Layout" mode with free-drag slots |
| `client/src/components/squad/FormationTemplateManager.tsx` | **New** — template list + editor panel |
| `client/src/components/squad/FormationTemplateEditor.tsx` | **New** — free-drag slot canvas for template editing |

---

## 10. Key Decisions

- **Depth column shows rank, not raw depth_order integer.** The `depth_order` field values may not be sequential (gaps can appear over time); computing rank client-side from sorted order is more user-friendly.
- **Per-group DndContext** in RosterTab prevents cross-group drags naturally, matching the existing DepthChartTab behavior.
- **Built-in templates are read-only.** Seeded at init with `is_builtin=1`; the server rejects `PUT`/`DELETE` on them. The client hides edit controls.
- **`template_id` replaces `formation_code` in formation creation.** Built-in templates have names matching their former codes (`4-3-3`, etc.) but are now DB rows, giving a uniform API. `formation_code` on the `formations` table is retained (server sets it from `template.name`) for display purposes.
- **Free-drag uses `useDraggable` + pointer events**, converting pointer coordinates to SVG-relative percentages. `@dnd-kit/core` is already installed.
