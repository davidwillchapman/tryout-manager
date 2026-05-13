# Implementation Plan Ten — Session Plans

## Overview

Add a Session Plans feature to Playmaker. Users will be able to create structured training session plans composed of existing activities. Playmaker will gain a tab toggle to switch between Activities and Sessions views. Sessions are exported to markdown and live-link to their constituent activities so that edits made elsewhere are always reflected.

---

## Data Model

### New Table: `session_plans`

```sql
CREATE TABLE IF NOT EXISTS session_plans (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  title             TEXT NOT NULL,
  game_phase        TEXT NOT NULL,
  overall_objective TEXT NOT NULL,
  main_principle    TEXT NOT NULL,
  sub_principle_1   TEXT,
  sub_principle_2   TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
);
```

`game_phase` is a constrained value. Enforced in the application layer (not a SQL CHECK so it can be extended later):

- `Attacking`
- `Attacking to Defending Transition`
- `Defending`
- `Defending to Attacking Transition`
- `Other`

### New Table: `session_activities`

```sql
CREATE TABLE IF NOT EXISTS session_activities (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id   INTEGER NOT NULL REFERENCES session_plans(id) ON DELETE CASCADE,
  activity_id  INTEGER NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  order_index  INTEGER NOT NULL DEFAULT 0,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);
```

Sessions store a direct foreign key to `activities.id`. Activity data is always fetched live — changes to the activity outside the session automatically reflect here. The 1–6 activity limit is enforced in the application layer.

---

## Server Changes

### File: `server/src/db.ts`

Add both new tables in `initDb` via `executeMultiple`, appended after the existing block:

```typescript
await db.executeMultiple(`
  CREATE TABLE IF NOT EXISTS session_plans (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    title             TEXT NOT NULL,
    game_phase        TEXT NOT NULL,
    overall_objective TEXT NOT NULL,
    main_principle    TEXT NOT NULL,
    sub_principle_1   TEXT,
    sub_principle_2   TEXT,
    created_at        TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS session_activities (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id   INTEGER NOT NULL REFERENCES session_plans(id) ON DELETE CASCADE,
    activity_id  INTEGER NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    order_index  INTEGER NOT NULL DEFAULT 0,
    created_at   TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);
```

### New File: `server/src/routes/sessions.ts`

Endpoints:

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/sessions` | List all sessions with `activity_count` |
| `POST` | `/api/sessions` | Create a session |
| `GET` | `/api/sessions/:id` | Session detail with full activity rows |
| `PUT` | `/api/sessions/:id` | Update session metadata |
| `DELETE` | `/api/sessions/:id` | Delete session (cascades `session_activities`) |
| `POST` | `/api/sessions/:id/activities` | Add activity to session (enforces 1–6 limit) |
| `DELETE` | `/api/sessions/:id/activities/:saId` | Remove activity from session |
| `PUT` | `/api/sessions/:id/activities/reorder` | Update `order_index` for all activities |

**Zod schema for session body:**

```typescript
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
```

**GET /:id detail query** — join `session_activities` to the full activity detail. Return:

```json
{
  "id": 1,
  "title": "...",
  "game_phase": "Attacking",
  "overall_objective": "...",
  "main_principle": "...",
  "sub_principle_1": null,
  "sub_principle_2": null,
  "activities": [
    {
      "id": 3,           // session_activities.id
      "order_index": 0,
      "activity": { /* full Activity row (no tags/refs/progs needed here) */ }
    }
  ]
}
```

**POST /:id/activities** — body `{ activity_id: number }`. Before inserting, count existing `session_activities` for this session; reject with 400 if count ≥ 6.

**PUT /:id/activities/reorder** — body `{ order: number[] }` where each element is a `session_activities.id`. Update each row's `order_index` in a loop.

### File: `server/src/index.ts`

Import and mount the new router:

```typescript
import sessionsRouter from './routes/sessions';
// ...
app.use('/api/sessions', sessionsRouter);
```

---

## Client Changes

### New Types: `client/src/types.ts`

Append:

```typescript
export type GamePhase =
  | 'Attacking'
  | 'Attacking to Defending Transition'
  | 'Defending'
  | 'Defending to Attacking Transition'
  | 'Other';

export interface SessionPlan {
  id: number;
  title: string;
  game_phase: GamePhase;
  overall_objective: string;
  main_principle: string;
  sub_principle_1: string | null;
  sub_principle_2: string | null;
  activity_count?: number;
  created_at: string;
  updated_at: string;
}

export interface SessionActivity {
  id: number;          // session_activities.id
  order_index: number;
  activity: Activity;
}

export interface SessionPlanDetail extends SessionPlan {
  activities: SessionActivity[];
}
```

### New File: `client/src/api/sessions.ts`

Mirror the pattern of `client/src/api/activities.ts`. Provide:

- `useSessions()` — `useQuery` list
- `useSession(id)` — `useQuery` single detail
- `useCreateSession()` — mutation
- `useUpdateSession()` — mutation
- `useDeleteSession()` — mutation
- `useAddActivityToSession()` — mutation
- `useRemoveActivityFromSession()` — mutation
- `useReorderSessionActivities()` — mutation

### New Component: `client/src/components/sessions/SessionList.tsx`

Flat list of sessions in the left panel. Each row shows:
- Session title
- Game phase badge (colored by phase)
- Activity count pill

Same selection pattern as `ActivityList` — calls `onSelect(id)`.

### New Component: `client/src/components/sessions/SessionForm.tsx`

Form for creating/editing session metadata. Fields:

| Field | UI element |
|---|---|
| Game Phase | `Select` with the 5 phase options |
| Session Title | `Input` |
| Overall Objective | `Textarea` |
| Main Principle | `Input` |
| Sub Principle 1 | `Input` (optional) |
| Sub Principle 2 | `Input` (optional, only shown once Sub Principle 1 is non-empty) |

### New Component: `client/src/components/sessions/SessionDetail.tsx`

Right panel for a selected session. Sections:

**Header row** — phase badge, session title, edit button (opens edit form in dialog), delete button, export button.

**Metadata block** — Objective, Main Principle, Sub Principles displayed as read-only labeled fields.

**Activities section** — headed "Activities (n/6)". Each activity row is a collapsible card:

- **Collapsed** (default): activity title, type badge, duration. A chevron toggles expansion.
- **Expanded**: full activity fields (summary, description, field setup, coaching points, flexibility notes) rendered read-only. An "Edit" button opens the edit flow.

**Edit flow within session:**

1. "Edit" opens `ActivityForm` pre-filled with current activity values in a dialog.
2. On submit, before saving, show a **"Save As" dialog** with two choices:
   - **Update "[Activity Title]"** — PUT `/api/activities/:id`, session still links to same `activity_id`
   - **Save as New Copy** — POST `/api/activities/:id/clone`, then PUT `/api/sessions/:sessionId/activities/:saId` to point to the new clone's id (needs a PATCH endpoint or use delete + re-add)
3. The save-as dialog explains: "Updating will affect this activity everywhere it is used."

**Add Activity button** — Opens `AddActivityToSessionModal`.

**Export to Markdown button** — Generates and triggers download of a `.md` file (see Export Format below).

### New Component: `client/src/components/sessions/AddActivityToSessionModal.tsx`

A searchable list of all activities (reuse the activities API). Already-added activities are grayed out. Selecting one calls `useAddActivityToSession`. Closes on success.

### Save-As Dialog

Inline within `SessionDetail` — a small `Dialog` that appears after the user submits an edit in the activity form. Two buttons: "Update [title]" and "Save as New Copy". Cancel returns to the activity form.

**Clone-then-relink flow:** The API does not have a dedicated "relink" endpoint. Implement as: POST `/api/activities/:id/clone` → get new id → DELETE `/api/sessions/:sessionId/activities/:saId` → POST `/api/sessions/:sessionId/activities` `{ activity_id: newId }`. This keeps order; insert the new one at the same order position via a reorder call immediately after.

Alternatively, add a `PATCH /api/sessions/:id/activities/:saId` endpoint that accepts `{ activity_id: number }` to update the foreign key in place. This is simpler and should be added to the server.

Use the simpler PATCH approach: add `PATCH /api/sessions/:id/activities/:saId` to `sessions.ts`.

### Updated Component: `client/src/pages/PlaymakerPage.tsx`

Add a mode toggle at the top of the left panel header:

```
[ Activities ] [ Sessions ]
```

Use two small buttons styled like tabs (underline active, muted inactive). Store the active mode in `useState<'activities' | 'sessions'>`.

- `activities` mode: existing `ActivityList` and `ActivityDetail` remain unchanged
- `sessions` mode: `SessionList` in the left panel, `SessionDetail` in the right panel

No routing changes — both views live under `/playmaker`.

---

## Export Format

When the user clicks "Export to Markdown", generate a blob and trigger a download of `[session-title-slugified].md`.

```markdown
# [Session Title]

**Phase:** Attacking
**Objective:** ...
**Main Principle:** ...
**Sub Principles:** ..., ...

---

## Activities

### 1. [Activity Title]
**Type:** Technical | **Duration:** 20 min

[Summary]

**Description**
[description text]

**Field Setup**
[field_setup]

**Coaching Points**
[coaching_points]

**Flexibility Notes**
[flexibility_notes]

---

### 2. [Activity Title]
...
```

Export is client-side only — no server endpoint needed. Use `URL.createObjectURL(new Blob([markdown], { type: 'text/markdown' }))`.

---

## Files to Change

| File | Change |
|---|---|
| `server/src/db.ts` | Add `session_plans` and `session_activities` table creation |
| `server/src/index.ts` | Mount `/api/sessions` router |
| `client/src/types.ts` | Add `GamePhase`, `SessionPlan`, `SessionActivity`, `SessionPlanDetail` |
| `client/src/pages/PlaymakerPage.tsx` | Add Activities/Sessions tab toggle |

## New Files

| File | Purpose |
|---|---|
| `server/src/routes/sessions.ts` | All session CRUD and activity management endpoints |
| `client/src/api/sessions.ts` | React Query hooks for session API |
| `client/src/components/sessions/SessionList.tsx` | Left panel session list |
| `client/src/components/sessions/SessionForm.tsx` | Create/edit session metadata form |
| `client/src/components/sessions/SessionDetail.tsx` | Right panel session detail with collapsible activities |
| `client/src/components/sessions/AddActivityToSessionModal.tsx` | Picker modal to add activities to a session |

---

## Implementation Steps

### Step 1 — Database

Add `session_plans` and `session_activities` tables to `initDb`. Run the server once to apply the migration to the existing SQLite file.

### Step 2 — Server routes

Create `sessions.ts` with all endpoints. Add the `PATCH /:id/activities/:saId` endpoint to support the clone-then-relink flow. Register in `index.ts`.

### Step 3 — Types and API client

Add types to `client/src/types.ts`. Create `client/src/api/sessions.ts` with all React Query hooks.

### Step 4 — Session components

Build in order:
1. `SessionForm` (form only, no data fetching)
2. `SessionList` (read-only list)
3. `AddActivityToSessionModal`
4. `SessionDetail` (collapsible activity rows, edit flow, export)

### Step 5 — PlaymakerPage integration

Add the tab toggle. Wire `sessions` mode to `SessionList` + `SessionDetail`. Confirm `activities` mode is unaffected.

### Step 6 — Verify

- Create a session with all metadata fields
- Add 1–6 activities, confirm 7th is rejected
- Collapse/expand activity rows
- Edit an activity, choose "Update" — verify the change appears in the activity list elsewhere
- Edit an activity, choose "Save as New Copy" — verify a cloned activity appears in the activity list and the session now links to the clone
- Edit the original activity (not via session) — verify the change reflects in any session still linked to it
- Export to markdown — verify the file downloads with correct content

---

## Out of Scope

- **Drag-and-drop reordering** — reorder is supported via API but the UI will use up/down arrow buttons for now
- **Session tags / DNA tagging** — sessions are not tagged to the framework; principles are free text
- **Session templates** — duplicating sessions is not in scope
- **Multi-session views** — no calendar or schedule grid; sessions are a flat list
