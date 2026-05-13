# Implementation Plan: Team Depth Chart (Squad Assist Page)

## Overview

Build out the Squad Assist page to support season-long squad management. Users can migrate a team from the tryout manager, manage a roster, view a position-based depth chart, and build visual formations on a drag-and-drop soccer field canvas. Teams can be marked active or inactive.

The current `SquadAssistPage` is a placeholder. This plan replaces it with a fully functional squad management tool.

---

## 1. Database Schema

### New Tables

**`squad_teams`** — a season squad (may be imported from a tryout manager team)
```sql
CREATE TABLE IF NOT EXISTS squad_teams (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  source_team_id INTEGER REFERENCES teams(id) ON DELETE SET NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  season_label TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

**`squad_players`** — players on a squad team (imported or manually added)
```sql
CREATE TABLE IF NOT EXISTS squad_players (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  squad_team_id INTEGER NOT NULL REFERENCES squad_teams(id) ON DELETE CASCADE,
  source_player_id INTEGER REFERENCES players(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  primary_position TEXT,
  secondary_position TEXT,
  jersey_number TEXT,
  depth_order INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',  -- 'active' | 'inactive' | 'injured'
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

**`formations`** — saved formation configs for a squad team
```sql
CREATE TABLE IF NOT EXISTS formations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  squad_team_id INTEGER NOT NULL REFERENCES squad_teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  formation_code TEXT NOT NULL,  -- e.g. '4-3-3', '4-4-2', '4-2-3-1'
  is_default INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

**`formation_slots`** — position slots on the canvas (role + coordinates + optional player assignment)
```sql
CREATE TABLE IF NOT EXISTS formation_slots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  formation_id INTEGER NOT NULL REFERENCES formations(id) ON DELETE CASCADE,
  squad_player_id INTEGER REFERENCES squad_players(id) ON DELETE SET NULL,
  slot_label TEXT NOT NULL,   -- e.g. 'GK', 'CB_L', 'CM', 'ST'
  role TEXT NOT NULL,          -- 'starter' | 'first_sub'
  x_pct REAL NOT NULL,         -- 0–100, left-to-right % of field width
  y_pct REAL NOT NULL,         -- 0–100, top-to-bottom % of field height
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

---

## 2. Server-Side

### Route File: `server/src/routes/squad.ts`

Mount at `/api/squad` in `server/src/index.ts`.

#### Squad Teams

| Method | Path | Description |
|--------|------|-------------|
| GET | `/teams` | List all squad teams with player count and is_active |
| GET | `/teams/:id` | Get squad team detail |
| POST | `/teams` | Create squad team manually |
| POST | `/teams/import/:sourceTeamId` | Import from tryout manager team |
| PUT | `/teams/:id` | Update name, description, season_label |
| PATCH | `/teams/:id/status` | Toggle is_active (1 ↔ 0) |
| DELETE | `/teams/:id` | Delete squad team and cascade |

**Import logic** (`POST /teams/import/:sourceTeamId`):
1. Fetch the source team from `teams` and its players via `SELECT * FROM players WHERE team_id = ?`.
2. Insert a `squad_teams` row with `source_team_id` set.
3. For each source player, insert a `squad_players` row copying `name`, `primary_position`, `secondary_position`, and setting `source_player_id`.

#### Squad Players

| Method | Path | Description |
|--------|------|-------------|
| GET | `/teams/:teamId/players` | List players (ordered by depth_order) |
| POST | `/teams/:teamId/players` | Add player manually |
| PUT | `/teams/:teamId/players/:playerId` | Update jersey, position, status, depth_order |
| PATCH | `/teams/:teamId/players/:playerId/status` | Toggle player status |
| PUT | `/teams/:teamId/players/depth-order` | Bulk-update depth_order (array of {id, depth_order}) |
| DELETE | `/teams/:teamId/players/:playerId` | Remove from squad |

#### Formations

| Method | Path | Description |
|--------|------|-------------|
| GET | `/teams/:teamId/formations` | List formations for team |
| GET | `/teams/:teamId/formations/:formationId` | Get formation with all slots populated |
| POST | `/teams/:teamId/formations` | Create formation (auto-generates slots from template) |
| PUT | `/teams/:teamId/formations/:formationId` | Rename or change formation_code |
| PATCH | `/teams/:teamId/formations/:formationId/default` | Set as default (clears other defaults first) |
| DELETE | `/teams/:teamId/formations/:formationId` | Delete formation and slots |
| PUT | `/teams/:teamId/formations/:formationId/slots` | Bulk-save slot assignments |

**Formation creation**: When `POST /formations` receives a `formation_code`, the server looks up the slot template for that code (a shared constant matching the client lib) and inserts all `formation_slots` rows with pre-defined `slot_label`, `role`, `x_pct`, `y_pct`. `squad_player_id` starts as `NULL`.

**Slot assignment save** (`PUT .../slots`): Accept `[{ slot_id, squad_player_id | null }]`. For each, `UPDATE formation_slots SET squad_player_id = ?, updated_at = datetime('now') WHERE id = ?`.

### Register in `server/src/index.ts`

```ts
import squadRouter from './routes/squad';
app.use('/api/squad', squadRouter);
```

### DB Migrations in `server/src/db.ts`

Add `CREATE TABLE IF NOT EXISTS` for all four new tables in `initializeDatabase()`, after the existing session tables.

---

## 3. Client-Side Types (`client/src/types.ts`)

```ts
export interface SquadTeam {
  id: number;
  name: string;
  description?: string;
  source_team_id?: number;
  is_active: boolean;
  season_label?: string;
  player_count?: number;
  created_at: string;
  updated_at: string;
}

export interface SquadPlayer {
  id: number;
  squad_team_id: number;
  source_player_id?: number;
  name: string;
  primary_position?: string;
  secondary_position?: string;
  jersey_number?: string;
  depth_order: number;
  status: 'active' | 'inactive' | 'injured';
  created_at: string;
  updated_at: string;
}

export interface Formation {
  id: number;
  squad_team_id: number;
  name: string;
  formation_code: string;
  is_default: boolean;
  slots?: FormationSlot[];
  created_at: string;
  updated_at: string;
}

export interface FormationSlot {
  id: number;
  formation_id: number;
  squad_player_id?: number;
  slot_label: string;
  role: 'starter' | 'first_sub';
  x_pct: number;
  y_pct: number;
  player?: SquadPlayer;
}
```

---

## 4. Client-Side API Hooks (`client/src/api/squad.ts`)

New file with React Query hooks:

- `useSquadTeams()` — GET `/api/squad/teams`
- `useSquadTeam(id)` — GET `/api/squad/teams/:id`
- `useCreateSquadTeam()` — POST
- `useImportSquadTeam()` — POST `/api/squad/teams/import/:sourceTeamId`
- `useUpdateSquadTeam(id)` — PUT
- `useToggleSquadTeamStatus(id)` — PATCH status
- `useDeleteSquadTeam(id)` — DELETE
- `useSquadPlayers(teamId)` — GET players
- `useAddSquadPlayer(teamId)` — POST
- `useUpdateSquadPlayer(teamId, playerId)` — PUT
- `useUpdateDepthOrder(teamId)` — PUT bulk depth-order
- `useDeleteSquadPlayer(teamId, playerId)` — DELETE
- `useFormations(teamId)` — GET formations list
- `useFormation(teamId, formationId)` — GET with slots
- `useCreateFormation(teamId)` — POST
- `useUpdateFormation(teamId, formationId)` — PUT
- `useSetDefaultFormation(teamId, formationId)` — PATCH default
- `useDeleteFormation(teamId, formationId)` — DELETE
- `useSaveFormationSlots(teamId, formationId)` — PUT slots

---

## 5. Formation Templates (`client/src/lib/formations.ts`)

Define slot templates for the four supported formations. Each slot is `{ slot_label, role, x_pct, y_pct }`.

Field orientation: GK at `y_pct = 90` (bottom), forwards at `y_pct = 10` (top). `x_pct = 50` is center.

**Supported formation codes:** `'4-3-3'`, `'4-4-2'`, `'4-2-3-1'`, `'3-5-2'`

Each has 11 starter slots and 5 first-sub slots (16 total). First-sub slots are positioned in a strip at `y_pct = 100` (below the field, rendered in a separate "bench" row).

Example (4-3-3 starters):
```ts
{ slot_label: 'GK',   role: 'starter', x_pct: 50, y_pct: 88 },
{ slot_label: 'LB',   role: 'starter', x_pct: 15, y_pct: 72 },
{ slot_label: 'CB_L', role: 'starter', x_pct: 35, y_pct: 72 },
{ slot_label: 'CB_R', role: 'starter', x_pct: 65, y_pct: 72 },
{ slot_label: 'RB',   role: 'starter', x_pct: 85, y_pct: 72 },
{ slot_label: 'CM_L', role: 'starter', x_pct: 25, y_pct: 50 },
{ slot_label: 'CM',   role: 'starter', x_pct: 50, y_pct: 50 },
{ slot_label: 'CM_R', role: 'starter', x_pct: 75, y_pct: 50 },
{ slot_label: 'LW',   role: 'starter', x_pct: 15, y_pct: 20 },
{ slot_label: 'ST',   role: 'starter', x_pct: 50, y_pct: 15 },
{ slot_label: 'RW',   role: 'starter', x_pct: 85, y_pct: 20 },
```

---

## 6. Client-Side Components

### Page: `client/src/pages/SquadAssistPage.tsx`

Replace the placeholder with a two-panel layout matching PlaymakerPage:

- **Left panel (280px):** Header with "SQUAD ASSIST" + "Import Team" + "New Team" buttons. Filter toggle: All / Active / Inactive. `SquadTeamList` below.
- **Right panel:** `SquadTeamDetail` when a team is selected, or an empty state.

### Component: `SquadTeamList`

Scrollable list of squad teams. Each row: team name, season label (if set), player count badge, Active/Inactive chip. Selecting a row sets it as the active team in page state.

### Component: `SquadTeamDetail`

Header: team name + season label, edit button (opens edit form), active/inactive toggle button, delete button.

Three tabs: **Roster** | **Depth Chart** | **Formations**

### Roster Tab

Table of squad players. Columns: `#` (jersey), Name, Primary Position, Secondary Position, Status.

- Status displayed as a colored chip (`active` = green, `inactive` = gray, `injured` = amber).
- "Add Player" button opens `AddSquadPlayerModal`.
- Click a row to open an inline edit panel (or modal) for jersey, position, status.
- Remove button (×) per row with confirmation.

### Depth Chart Tab — `DepthChartView`

A position-group grid showing all active squad players organized by role:

```
GK  |  CB  |  FB  |  DM  |  CM  |  AM  |  W  |  ST
────|──────|──────|──────|──────|──────|─────|────
 1  |  1   |  1   |  1   |  1   |  1   |  1  |  1
 2  |  2   |  2   |  2   |  2   |  2   |  2  |  2
```

Each column is a position group. Player cards within a column are draggable to reorder (depth_order). Players not assigned to any position group appear in an "Unassigned" column at the right.

Drag-to-reorder uses `@dnd-kit/sortable`. On drop, call `PUT .../players/depth-order` with the new order.

### Formations Tab — `FormationManager`

List of saved formations. Each row: formation name, code badge (e.g., "4-3-3"), default star, delete button. "New Formation" button opens a small form: name + formation_code dropdown.

Clicking a formation row opens `FormationCanvas` in the right area.

### Component: `FormationCanvas`

The main visual drag-and-drop feature.

**Layout (horizontal split):**
- **Left sidebar (~200px):** `PlayerRoster` — scrollable list of squad players not currently assigned any starter slot in this formation. Shows name + position.
- **Right area:** Soccer field SVG with slot nodes rendered at `(x_pct, y_pct)`.

**Soccer field SVG:**
- Simple green rectangle with center circle, halfway line, penalty areas — minimal, clean.
- Aspect ratio 2:3 (portrait, scaled to fit the panel).
- Slot nodes are `<circle>` + `<text>` elements positioned via `cx={x_pct%}` / `cy={y_pct%}`.

**Slot node states:**
- Empty: dashed border circle with `slot_label`.
- Assigned: filled circle with player name (truncated) + jersey number.
- First-sub slots: rendered in a horizontal strip labeled "First Subs" below the field SVG (not on the pitch itself).

**Drag-and-drop (`@dnd-kit/core`):**
- Drag from `PlayerRoster` → drop on empty slot: assigns player.
- Drag from filled slot → drop on empty slot: moves assignment.
- Drag from slot → drop on another filled slot: swaps assignments.
- Drag from slot → drop back on `PlayerRoster`: unassigns player.

**Toolbar (above canvas):**
- Inline-editable formation name.
- Formation code label.
- "Save" button — calls `PUT .../slots` with current state.
- "Reset" — reverts to last saved state.

### Modal: `ImportTeamModal`

Two-step dialog:

1. **Step 1:** Fetch all groups (`GET /api/groups`). Show a list; user selects one.
2. **Step 2:** Fetch teams in selected group (`GET /api/groups/:id/teams`). Show list; user selects one.
3. **Footer:** Season label text input (optional). "Import" button calls `POST /api/squad/teams/import/:sourceTeamId`.

### Modal: `AddSquadPlayerModal`

Simple form: name (required), primary position, secondary position, jersey number, status. Used for manually adding players not in the tryout manager.

---

## 7. Implementation Steps

### Phase 1 — Database & Server
1. Add four `CREATE TABLE IF NOT EXISTS` blocks to `server/src/db.ts`.
2. Create `server/src/routes/squad.ts`:
   - Squad team CRUD + import endpoint.
   - Squad player CRUD + depth-order bulk update.
   - Formation CRUD + default toggle + slot save.
3. Register `/api/squad` in `server/src/index.ts`.
4. Test all endpoints manually.

### Phase 2 — Types & API Hooks
1. Add four new interfaces to `client/src/types.ts`.
2. Create `client/src/api/squad.ts` with all React Query hooks.
3. Create `client/src/lib/formations.ts` with slot templates for all four formation codes.

### Phase 3 — Squad Team List & Import
1. Replace `SquadAssistPage.tsx` placeholder with the two-panel layout.
2. Implement `SquadTeamList` with filter toggle and selection.
3. Implement `SquadTeamDetail` shell with tabs (content as placeholders).
4. Implement `ImportTeamModal` (group picker → team picker → season label).
5. Implement inline team edit, active/inactive toggle, and delete with confirmation.

### Phase 4 — Roster Tab
1. Build player table with jersey, name, positions, status chip.
2. Implement `AddSquadPlayerModal`.
3. Implement player edit (slide-over or modal).
4. Implement status toggle and player removal.

### Phase 5 — Depth Chart Tab
1. Build `DepthChartView` position-group grid layout.
2. Install `@dnd-kit/sortable` if not already present.
3. Wire drag-to-reorder within position columns.
4. Call `PUT .../players/depth-order` on drop to persist order.
5. Add unassigned player bucket.

### Phase 6 — Formations & Canvas
1. Implement `FormationManager` list (create, delete, set default).
2. Build the soccer field SVG background.
3. Render slot nodes at `(x_pct, y_pct)` with empty/assigned states.
4. Implement `PlayerRoster` sidebar.
5. Wire `@dnd-kit/core` drag-and-drop (roster → slot, slot swap, slot → roster).
6. Implement Save and Reset toolbar actions.

### Phase 7 — Polish
1. Loading skeletons for team list, player list, formation canvas.
2. Empty states with actionable CTAs (no teams, no formations, no players).
3. Confirmation dialogs for destructive actions.
4. Consistent navy/gold styling with existing design system.
5. Responsive canvas sizing (scales within available panel height).

---

## 8. Dependencies

- `@dnd-kit/core` + `@dnd-kit/sortable` — drag-and-drop for formation canvas and depth chart. Add to `client/package.json`.
- All other dependencies (React Query, Radix UI, Tailwind, libsql, zod) are already present.

---

## 9. Data Flow Summary

```
Tryout Manager (teams / players tables)
         │
         │  POST /api/squad/teams/import/:sourceTeamId
         ▼
    squad_teams ──────────► squad_players
                                  │
                         assigned via squad_player_id
                                  │
    formations ──► formation_slots (slot_label, x_pct, y_pct, role)
```

The depth chart is derived from `squad_players` ordered by `depth_order`, grouped by `primary_position`. Formations are independent configurations that reference the same `squad_players` pool via `formation_slots.squad_player_id`.
