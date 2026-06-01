# Implementation Plan 17 — Squad Assist: Periodization Plan & Training Schedule

> **Authoring note:** Written after reading the codebase end-to-end. All identifiers below (tables, columns, hooks, routes) are verified against the actual source.

## Stack facts (confirmed — build to these, not to generic assumptions)

- **DB:** libsql / Turso via `@libsql/client`. All access is `await db.execute({ sql, args })` with `import { db } from '../db'`. Schema DDL lives in **`server/src/db.ts`** (there is no `schema.sql`). Use `?` placeholders, `datetime('now')` for timestamps, `ins.lastInsertRowid!` after inserts.
- **Server routes:** `server/src/routes/*.ts`, Express `Router()`, zod validation via `validateBody(schema)` from `../middleware/validateBody`. Routes are registered in **`server/src/index.ts`**.
- **Client types:** a single file **`client/src/types.ts`** (imported as `../types`).
- **Client API:** per-domain files in `client/src/api/*.ts` using `@tanstack/react-query` hooks wrapping `apiFetch<T>(path, { method, body: JSON.stringify(...) })` from `./client`. Each file exports a `xxxKeys` query-key object and `useXxx` hooks with `qc.invalidateQueries`.
- **UI primitives** (`client/src/components/ui/`): `Button`, `Dialog` + `DialogContent` (this is the modal — there is **no** `Modal`), `Input`, `Select`, `Textarea`, `Badge`. There is **no** `Tabs` primitive — tabs are done inline.
- **Squad Assist is TEAM-scoped.** `SquadAssistPage` tracks `selectedTeamId`; the right panel is `client/src/components/squad/SquadTeamDetail.tsx`, which hosts the existing tabs **Roster** (`RosterTab.tsx`) and **Formations** (`FormationsTab.tsx`), both taking a `{ teamId }` prop. API: `client/src/api/squad.ts` (mounted at `/api/squad`, routes like `/squad/teams/:teamId/...`); server: `server/src/routes/squad.ts`. → This resolves the prompt's "for a team": scope the new features to a **squad team id** (`squad_teams.id`).
- **Roster source = `squad_players`** (NOT the global `players` table). The roster for a team is `SELECT * FROM squad_players WHERE squad_team_id = ? ORDER BY depth_order ASC, id ASC` (see `squad.ts` `GET /teams/:teamId/players`, client hook `useSquadPlayers(teamId)` → `SquadPlayer[]`). `SquadPlayer` has `id, name, primary_position, secondary_position, jersey_number, depth_order, status`.
- **`react-markdown` is already a dependency** (used in `SessionDetail.tsx`: `import ReactMarkdown from 'react-markdown'`, rendered inside a `prose prose-invert` wrapper). Reuse it for the periodization preview — no new dependency needed.
- **No DB transactions in this codebase.** Existing multi-row writes (e.g. `squad.ts` team-import, `activities.ts` `/:id/clone`) just `await db.execute(...)` sequentially. Follow that pattern.
- **Sessions ("Playmaker"):** table **`session_plans`** + link table **`session_activities`** `(session_id, activity_id, order_index)` (capped at 6 activities). `session_plans` columns: `title`, `game_phase` (enum), `overall_objective`, `main_principle`, `sub_principle_1`, `sub_principle_2`, `created_at`, `updated_at`. Client types: `SessionPlan`, `SessionPlanDetail`, `SessionActivity`. Components live in `client/src/components/sessions/` (`SessionList`, `SessionDetail`, `SessionForm`).
- **`game_phase` enum values:** `Attacking`, `Attacking to Defending Transition`, `Defending`, `Defending to Attacking Transition`, `Other`.
- **Activities:** `activities` columns to copy: `title`, `summary`, `description`, `activity_type`, `duration_minutes`, `field_setup`, `coaching_points`, `flexibility_notes`, `image_id`, `video_url`, `video_type`.

Final tab order in `SquadTeamDetail`: `Roster · Formations · Periodization Plan · Training Schedule`.

---

## Decisions (resolved)

1. **Scope = `team_id`** for both features (matches Squad Assist's team-based model; satisfies "for a team").
2. **Periodization plan = one markdown doc per team**, GET/PUT (upsert) — not a list.
3. **Scheduled sessions are deep copies** of a `session_plans` row + its `session_activities`-joined activity details, so later edits never touch the Playmaker template.
4. **Guest players are session-local**: stored on the scheduled session's player list with `is_guest=1` + free-text name; never written to the global players table.
5. **Top/bottom markers**: one nullable `eval_mark` (`top` | `bottom`) per scheduled-session player; UI enforces max 3 `top` / 2 `bottom`, with a light server guard.

---

## Data model — add to `server/src/db.ts`

Add a new `await db.executeMultiple(\`...\`)` block inside `initDb()` in `server/src/db.ts` (after the existing squad/formation tables), mirroring the established style: `INTEGER PRIMARY KEY AUTOINCREMENT`, `created_at TEXT NOT NULL DEFAULT (datetime('now'))`, FKs with `ON DELETE CASCADE`. Tables are created on startup via `IF NOT EXISTS` — no migration runner. The squad-team table is **`squad_teams`** and its roster table is **`squad_players`** (FK `squad_team_id`).

### `periodization_plans`
- `id` PK
- `squad_team_id` INTEGER NOT NULL UNIQUE REFERENCES squad_teams(id) ON DELETE CASCADE
- `content` TEXT NOT NULL DEFAULT ''
- `created_at`, `updated_at`

### `scheduled_sessions`
- `id` PK
- `squad_team_id` INTEGER NOT NULL REFERENCES squad_teams(id) ON DELETE CASCADE
- `source_session_id` INTEGER REFERENCES session_plans(id) ON DELETE SET NULL  *(provenance only)*
- `date` TEXT NOT NULL  *(ISO yyyy-mm-dd)*
- `title` TEXT NOT NULL
- `game_phase` TEXT NOT NULL  *(copied; editable)*
- `overall_objective` TEXT NOT NULL  *(this is the card's "Objective")*
- `main_principle` TEXT, `sub_principle_1` TEXT, `sub_principle_2` TEXT  *(copied from session_plans)*
- `evaluation_status` TEXT NOT NULL DEFAULT 'not_started'  *(`not_started` | `in_progress` | `complete`)*
- `overall_rating` INTEGER  *(1–10, session-level)*
- `evaluation_notes` TEXT
- `created_at`, `updated_at`

### `scheduled_session_activities`
- `id` PK
- `scheduled_session_id` INTEGER NOT NULL REFERENCES scheduled_sessions(id) ON DELETE CASCADE
- `source_activity_id` INTEGER REFERENCES activities(id) ON DELETE SET NULL
- `order_index` INTEGER NOT NULL
- copied activity columns: `title`, `summary`, `description`, `activity_type`, `duration_minutes`, `field_setup`, `coaching_points`, `flexibility_notes`, `image_id`, `video_url`, `video_type`
- `rating` INTEGER  *(1–10, activity-level)*
- `notes` TEXT

### `scheduled_session_players`
- `id` PK
- `scheduled_session_id` INTEGER NOT NULL REFERENCES scheduled_sessions(id) ON DELETE CASCADE
- `squad_player_id` INTEGER REFERENCES squad_players(id) ON DELETE SET NULL  *(null for guests; references the team roster, not global `players`)*
- `name` TEXT NOT NULL  *(snapshot the player/guest name so the row is self-contained even if the roster entry changes/deletes — mirrors how `squad_players` snapshots from `players`)*
- `is_guest` INTEGER NOT NULL DEFAULT 0
- `attendance` TEXT  *(`attended` | `excused` | `unexcused`; null = unset)*
- `eval_mark` TEXT  *(`top` | `bottom`; null)*
- `created_at`

---

## Backend — `server/src/routes/`

Create **`periodization.ts`** and **`scheduledSessions.ts`**; register both in `server/src/index.ts` next to the existing `app.use('/api/...', router)` lines. Mirror the handler style in `sessions.ts` (try/catch → `next(err)`, 404 guards, `validateBody(zodSchema)`, `res.status(201).json(...)`).

**Mounting:** add `app.use('/api/periodization', periodizationRouter)` and `app.use('/api/scheduled-sessions', scheduledSessionsRouter)` in `index.ts`. Team-scoped collection routes live on the scheduled-sessions router (e.g. `/api/scheduled-sessions/teams/:teamId`) OR add the team-scoped list/create onto the existing `squad.ts` router — pick one and keep paths consistent with the client `apiFetch` calls below.

### Periodization (router mounted at `/api/periodization`)
- `GET  /teams/:teamId` → return the row, or `{ squad_team_id, content: '' }` default if none.
- `PUT  /teams/:teamId` → `validateBody(z.object({ content: z.string() }))`; upsert (check-then-insert/update, since there's no transaction helper), bump `updated_at`. (`squad_team_id` is `UNIQUE`.)

### Scheduled sessions (router mounted at `/api/scheduled-sessions`)
- `GET  /teams/:teamId` → card list: `id, date, game_phase, overall_objective, evaluation_status`, `ORDER BY date`.
- `POST /teams/:teamId` → `validateBody(z.object({ source_session_id: z.number().int(), date: z.string() }))`. **Deep copy:**
  1. Load `session_plans` row (404 if missing) + its activities via the joined `SELECT` in `sessions.ts` `GET /:id` (joins `session_activities` → `activities`).
  2. Insert `scheduled_sessions` copying `title, game_phase, overall_objective, main_principle, sub_principle_1, sub_principle_2`, plus `source_session_id`, `squad_team_id`, `date`.
  3. For each source activity insert a `scheduled_session_activities` row (preserve `order_index`, copy the activity columns).
  4. **Default players from the team roster:** `SELECT * FROM squad_players WHERE squad_team_id = ?`; insert one `scheduled_session_players` row per player (`squad_player_id` = its id, `name` = its name, `is_guest=0`, `attendance` null).
  5. Sequential `await db.execute(...)` (no transaction). Return the new row.
- `GET    /:id` → full detail: scheduled session + ordered activities + players (rows are self-contained via the snapshot `name`; optionally LEFT JOIN `squad_players` for live status).
- `PATCH  /:id` → update `date, title, game_phase, overall_objective, main/sub principles, evaluation_status, overall_rating, evaluation_notes` (+ `updated_at`).
- `DELETE /:id` → cascade.
- `PATCH  /:id/activities/:activityId` → edit copied fields + `rating` + `notes`.
- `POST   /:id/players` → add guest `{ name }` (sets `is_guest=1`).
- `PATCH  /:id/players/:rowId` → set `attendance` and/or `eval_mark` (optional server guard: reject a `top` when 3 exist / `bottom` when 2 exist for that session).
- `DELETE /:id/players/:rowId`.

---

## Frontend — `client/src/api/` + `client/src/types.ts`

Add to **`client/src/types.ts`**: `PeriodizationPlan`, `ScheduledSession`, `ScheduledSessionSummary` (card shape), `ScheduledSessionActivity`, `ScheduledSessionPlayer`, and unions `AttendanceStatus = 'attended'|'excused'|'unexcused'`, `EvaluationStatus = 'not_started'|'in_progress'|'complete'`, `EvalMark = 'top'|'bottom'`. Match the existing interface style (snake_case fields mirroring DB columns, as `SessionPlan`/`Activity` do).

Create **`client/src/api/periodization.ts`** and **`client/src/api/scheduledSessions.ts`** following `sessions.ts` exactly (query-key object + `useQuery`/`useMutation` + `apiFetch` + invalidations):
- periodization: `usePeriodizationPlan(teamId)`, `useUpdatePeriodizationPlan(teamId)`.
- scheduled: `useScheduledSessions(teamId)`, `useCreateScheduledSession(teamId)`, `useScheduledSession(id)`, `useUpdateScheduledSession()`, `useDeleteScheduledSession()`, `useUpdateScheduledActivity()`, `useAddScheduledPlayer()`, `useUpdateScheduledPlayer()`, `useRemoveScheduledPlayer()`.

---

## Frontend — components (`client/src/components/squad/`)

### Tab wiring — `SquadTeamDetail.tsx`
Concrete change: widen the local tab type and array. Currently:
```ts
type Tab = 'roster' | 'formations';
const [activeTab, setActiveTab] = useState<Tab>('roster');
// ...([['roster','Roster'],['formations','Formations']] as [Tab,string][]).map(...)
```
Extend to `type Tab = 'roster' | 'formations' | 'periodization' | 'schedule'`, add `['periodization','Periodization Plan']` and `['schedule','Training Schedule']` to the array, and in the tab-content block add `{activeTab === 'periodization' && <PeriodizationPlanTab teamId={teamId} />}` and `{activeTab === 'schedule' && <TrainingScheduleTab teamId={teamId} />}`. Tabs are plain buttons styled with the active class `text-white border-b-2 border-gold` — no UI primitive.

### `PeriodizationPlanTab.tsx`
- `usePeriodizationPlan(teamId)` → editable `<Textarea>` (reuse `ui/Textarea`) with an **Edit / Preview** toggle; Save via `useUpdatePeriodizationPlan`.
- Preview uses the already-installed `react-markdown` (`import ReactMarkdown from 'react-markdown'`) inside a `prose prose-invert prose-sm max-w-none` wrapper, exactly like `SessionDetail.tsx`'s `ExpandedField`.

### `TrainingScheduleTab.tsx`
- `useScheduledSessions(teamId)` → vertical list of `ScheduledSessionCard`.
- "**Add Scheduled Session**" → `Dialog`/`DialogContent` (mirror the New-Session dialog in `PlaymakerPage`/`SessionForm`): pick an existing `SessionPlan` (`useSessions()`) + a date `Input[type=date]`, call `useCreateScheduledSession`, then open the detail.
- Empty state mirroring `FormationsTab`'s "none yet" block.

### `ScheduledSessionCard.tsx`
Shows **Date**, **Game Phase**, **Objective** (`overall_objective`), and an **Evaluation Status icon** (map `evaluation_status`: not_started → grey outline, in_progress → amber, complete → green check; use `lucide-react` icons already in the project). Click → open detail; include a confirm-delete affordance like `FormationsTab`.

### `ScheduledSessionDetail.tsx`
Opened in the right area (mirror `SessionDetail`). Three inline tabs (same switch pattern as `SquadTeamDetail`):
- **Session Details** — render copied details + activities (adapt `SessionDetail` rendering); edits write via `useUpdateScheduledSession` / `useUpdateScheduledActivity` (instance-only). Surface editable `date`, `game_phase` (`Select` with the 5 enum values), `overall_objective`.
- **Players** — list defaulted roster + guests; "Add guest" (text → `useAddScheduledPlayer`), guest rows tagged (`is_guest`) + removable; per-row attendance control (Attended/Excused/Unexcused) → `useUpdateScheduledPlayer`. Reuse the table/row styling from `RosterTab.tsx`.
- **Evaluation** — session-level rating 1–10 + notes + `evaluation_status`; per-activity rating 1–10 + notes; Top 3 / Bottom 2 marking over the player list with the max-3/max-2 limits enforced in the UI. Build a small reusable 1–10 rating control.

> Keep these flat in `client/src/components/squad/` to match the existing flat layout (RosterTab, FormationsTab, etc.).

---

## Implementation order
1. Add the 4 tables to `server/src/db.ts`; restart server to create them.
2. `periodization.ts` route + register in `index.ts`.
3. `scheduledSessions.ts` route (list → create-deep-copy → detail → patch/delete → players → activities); register.
4. Manual smoke test: create from a real `session_plans` id; verify activities + roster copied and that editing the copy leaves the original `session_plans`/`session_activities` untouched.
5. Client `types.ts` + `api/periodization.ts` + `api/scheduledSessions.ts`.
6. `PeriodizationPlanTab` + wire into `SquadTeamDetail`.
7. `TrainingScheduleTab` + `ScheduledSessionCard` + add-dialog.
8. `ScheduledSessionDetail` with the 3 tabs.
9. Polish: status icon, top/bottom limits, guest tags, empty states.

## Verification checklist
- [ ] New tabs appear (in order) inside a selected team's detail panel.
- [ ] Periodization markdown persists across reload; preview renders.
- [ ] Creating a scheduled session copies session details + all activities + defaults the team roster as players.
- [ ] Editing the scheduled session/activities does **not** change the original Playmaker session.
- [ ] Guest persists only to that session; not in global players or other sessions.
- [ ] Attendance (Attended/Excused/Unexcused) persists.
- [ ] Session- and activity-level ratings (1–10) + notes persist.
- [ ] Top ≤ 3, Bottom ≤ 2 enforced; marks persist.
- [ ] Card shows Date, Game Phase, Objective, correct status icon.
- [ ] Delete cascades (activities + players removed).
- [ ] Client + server `tsc`/build pass.

## Files
**Create:** `server/src/routes/periodization.ts`, `server/src/routes/scheduledSessions.ts`, `client/src/api/periodization.ts`, `client/src/api/scheduledSessions.ts`, `client/src/components/squad/PeriodizationPlanTab.tsx`, `client/src/components/squad/TrainingScheduleTab.tsx`, `client/src/components/squad/ScheduledSessionCard.tsx`, `client/src/components/squad/ScheduledSessionDetail.tsx`.
**Modify:** `server/src/db.ts` (4 tables in a new `executeMultiple` block), `server/src/index.ts` (register 2 routers), `client/src/types.ts` (types/enums), `client/src/components/squad/SquadTeamDetail.tsx` (extend `Tab` + 2 tab entries). No `package.json` change needed (`react-markdown` already present).
