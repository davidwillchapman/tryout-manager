# League Results Feature — Implementation Plan

## Goal

Add a **League Results** section to the app that lets you browse and reference past years of soccer league standings, organized by season → age group/division → team standings.

Data mirrors the structure at sites like OYSA SportsAffinity:
- A league season (e.g. "2026 OYSA Winter League")
- Divided into divisions by age group and competitive level (e.g. "BU15 SCL Premier")
- Each division has a standings table: team name, points, GP, W/L/T, GF, GA

The primary data entry method is **URL scraping**: provide the league's home page URL and the server automatically discovers and imports all divisions and standings on its own.

---

## Database Schema (3 new tables)

```sql
CREATE TABLE league_seasons (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL,           -- "2026 OYSA Winter League"
  year        INTEGER NOT NULL,        -- 2026
  description TEXT,
  source_url  TEXT,                    -- league home page URL (used for scraping)
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE league_divisions (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  season_id    INTEGER NOT NULL REFERENCES league_seasons(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,          -- "BU15 SCL Premier"
  age_group    TEXT,                   -- "BU15"
  gender       TEXT,                   -- "Boys" | "Girls"
  division     TEXT,                   -- "SCL Premier"
  source_url   TEXT,                   -- standings page URL (captured during scrape)
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE league_standings (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  division_id    INTEGER NOT NULL REFERENCES league_divisions(id) ON DELETE CASCADE,
  team_name      TEXT NOT NULL,
  points         INTEGER DEFAULT 0,
  games_played   INTEGER DEFAULT 0,
  wins           INTEGER DEFAULT 0,
  losses         INTEGER DEFAULT 0,
  ties           INTEGER DEFAULT 0,
  goals_for      INTEGER DEFAULT 0,
  goals_against  INTEGER DEFAULT 0,
  finish_place   INTEGER,              -- final rank (1 = champion)
  created_at     DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

Migration file: `server/src/db/migrations/003_league_results.ts`

---

## Backend API Endpoints

All under `/api/league-results`:

### Seasons
| Method | Path | Description |
|--------|------|-------------|
| GET    | `/api/league-results/seasons` | List all seasons (sorted by year desc) |
| POST   | `/api/league-results/seasons` | Create a season (name, year, description, source_url) |
| PUT    | `/api/league-results/seasons/:id` | Update a season |
| DELETE | `/api/league-results/seasons/:id` | Delete a season (cascades) |

### Scrape Import
| Method | Path | Description |
|--------|------|-------------|
| POST   | `/api/league-results/seasons/:id/import` | Scrape the season's home page URL and populate all divisions + standings |

This is the core import action. It uses the `source_url` already stored on the season record. If a `source_url` override is provided in the request body it uses that instead (and updates the season record).

**Server-side scrape logic:**
1. Fetch the league home page (e.g. `accepted_list.asp?tournamentguid=XXX`)
2. Parse the HTML to find all division links — each link contains a `flightguid` query param and a display name (e.g. "BU15 SCL Premier")
3. Infer `gender` ("Boys" / "Girls") and `age_group` (e.g. "BU15") from the division name
4. For each division link, fetch the standings page (`schedule_standings.asp?flightguid=YYY&tournamentguid=XXX`)
5. Parse the standings table: team name, points, GP, W, L, T, GF, GA
6. Upsert a `league_divisions` row (match on season_id + name to avoid duplicates on re-import)
7. Delete and re-insert `league_standings` rows for that division
8. Return a summary: divisions found, teams imported, any parse errors

Library: `node-html-parser` (lightweight, no browser needed)

### Divisions
| Method | Path | Description |
|--------|------|-------------|
| GET    | `/api/league-results/seasons/:seasonId/divisions` | List divisions in a season |
| POST   | `/api/league-results/seasons/:seasonId/divisions` | Manually create a division |
| PUT    | `/api/league-results/divisions/:id` | Update a division |
| DELETE | `/api/league-results/divisions/:id` | Delete a division (cascades) |

### Standings
| Method | Path | Description |
|--------|------|-------------|
| GET    | `/api/league-results/divisions/:divisionId/standings` | Get standings (sorted by points desc, then GD) |
| POST   | `/api/league-results/divisions/:divisionId/standings` | Manually add a team entry |
| PUT    | `/api/league-results/standings/:id` | Update a team entry |
| DELETE | `/api/league-results/standings/:id` | Delete a team entry |

Server file: `server/src/routes/leagueResults.ts`

---

## Frontend Routes & Pages

Three new client routes added to `client/src/App.tsx`:

```
/league-results                           → LeagueResultsPage (season list)
/league-results/:seasonId                 → LeagueDivisionsPage (divisions for a season)
/league-results/:seasonId/:divisionId     → LeagueStandingsPage (standings table)
```

### Page 1: `/league-results` — Season List
- Card grid matching the existing Groups/Teams page layout
- Each card: season name, year, division count
- "Add Season" modal with fields: name, year, description, league home page URL
- After creating a season, if a URL was provided, automatically trigger the scrape import and show a loading/progress state on the card
- "Re-import" action on each card to re-scrape and refresh data
- Clicking a card navigates to `/league-results/:seasonId`

### Page 2: `/league-results/:seasonId` — Divisions
- Header showing season name + year
- Divisions grouped by gender tab (Boys / Girls) then sorted by age group
- Each division shown as a card: division name, team count, external link icon to source_url
- "Add Division" modal for manual entry (name, age_group, gender, division)
- Clicking a division card navigates to the standings page

### Page 3: `/league-results/:seasonId/:divisionId` — Standings
- Breadcrumb: Season → Division
- Standings table with columns: Rank, Team, Pts, GP, W, L, T, GF, GA, GD (goal diff)
- Sorted by points descending; ties broken by GD
- "Add Team" button for manual row entry
- Edit/delete inline per row (same pattern as Players page)

---

## Data Entry

### Primary: URL Scrape (via "Add Season" or "Re-import")
1. User creates a season and pastes the league home page URL (e.g. `accepted_list.asp?tournamentguid=...`)
2. Server fetches the home page, finds all division links (by `flightguid` param), then fetches each division's standings page in sequence
3. All divisions and standings are created automatically — no manual data entry needed
4. Re-import at any time to refresh data; existing divisions are upserted and standings are replaced

### Fallback: Manual Entry
Use the Add Division and Add Team forms to enter data by hand if a URL is unavailable or the scraper fails for a specific division.

---

## Scraper Implementation Detail

The home page (`accepted_list.asp`) lists divisions as anchor tags whose `href` contains `flightguid=`. The scraper:

```
home page HTML
  → find all <a> tags where href contains "schedule_standings.asp"
  → extract: display text (division name), flightguid query param
  → determine gender from surrounding section heading ("Boys" / "Girls")
  → for each division, fetch schedule_standings.asp?flightguid=X&tournamentguid=Y
    → parse standings table rows
    → columns: team name, points, GP, W, L, T, GF, GA
    → assign finish_place by row order (1-indexed)
```

Age group is parsed from the division name prefix (e.g. "BU15" from "BU15 SCL Premier", "GU14" from "GU14 RCL North 1"). Gender can be inferred from the prefix (`B` = Boys, `G` = Girls) as a fallback if section headings are ambiguous.

---

## File Structure

```
server/src/
  routes/
    leagueResults.ts         ← all API handlers
  lib/
    leagueScraper.ts         ← scrape logic (fetch home page → parse divisions → fetch + parse each standings page)
  db/
    migrations/
      003_league_results.ts  ← schema migration

client/src/
  pages/
    LeagueResultsPage.tsx    ← season list
    LeagueDivisionsPage.tsx  ← divisions within a season
    LeagueStandingsPage.tsx  ← standings table
  components/
    league/
      SeasonCard.tsx
      DivisionCard.tsx
      StandingsTable.tsx
      AddSeasonModal.tsx
      AddDivisionModal.tsx
      AddStandingEntryModal.tsx
  lib/
    queryKeys/leagueKeys.ts  ← React Query keys
```

---

## UI/UX Notes

- Match the existing dark navy theme (`navy-950`, `navy-900`, `navy-800`)
- Add "League Results" to the sidebar navigation (`AppShell`) with a Trophy or Archive icon (Lucide)
- Standings table: highlight the champion row (1st place) with a subtle gold/amber accent
- Gender tab switcher on the divisions page (Boys/Girls) matches the SportsAffinity tab pattern
- After triggering a scrape, show an inline loading indicator on the season card with a summary on completion ("12 divisions, 94 teams imported")
- If any division fails to parse, show a warning badge on the season card with a list of failed divisions

---

## Implementation Order

1. **DB migration** — create the 3 tables, wire into server startup
2. **`leagueScraper.ts`** — implement home page fetch → division discovery → standings fetch/parse
3. **Server routes** — seasons CRUD + `/import` endpoint, then divisions and standings CRUD
4. **React Query keys + API client functions** — leagueKeys, fetch/mutation hooks
5. **LeagueResultsPage** — season cards + Add Season modal (with URL field + auto-import on create)
6. **LeagueDivisionsPage** — division cards grouped by gender tabs
7. **LeagueStandingsPage** — standings table + Add/Edit/Delete row
8. **Sidebar nav entry**
