# Implementation Plan Three — Sideline Sidekick Pivot

## Overview

This plan covers three waves of work: app rename, new homepage, and a full sidebar/navigation refactor. All changes are frontend-only except for the HTML title update.

---

## 1. App Rename: "Tryout Manager" → "Sideline Sidekick"

### Files to update

| File | Change |
|------|--------|
| `client/index.html` | `<title>` tag: `Tryout Manager` → `Sideline Sidekick` |
| `client/src/components/layout/Sidebar.tsx` | Branding text in the header section |
| `README.md` | Title, description, and feature list |

### Notes
- Do **not** rename the npm package or directory — that would break local paths and is unnecessary cosmetic churn.
- Keep all existing color scheme (navy/gold) as-is; the rename is text-only.

---

## 2. New Homepage

### New file
`client/src/pages/HomePage.tsx`

### Route change
In `client/src/App.tsx`, change the index redirect from `/players` to `/` rendering `<HomePage />`.

### Layout
- Centered card or hero section on a navy background.
- Display the app logo (placeholder SVG or text-based logo until a real asset exists).
- One-line tagline beneath the logo (e.g., "Your all-in-one coaching companion.").
- No navigation links — the sidebar handles that.
- Keep it visually clean and minimal; no feature cards yet.

### Logo
Create a simple SVG text-based logo at `client/src/assets/logo.svg` (or inline in the component) using the existing gold (`#FCCF09`) and navy (`#021C2F`) palette. A later iteration can swap in a real graphic asset.

---

## 3. Sidebar Refactor

### 3a. New Navigation Structure

Replace the current flat 4-item list with 4 expandable top-level items:

```
Playmaker              (no subpages initially — landing page only)
Squad Assist           (no subpages initially — landing page only)
Tryout Manager
  ├── Players          → /tryout-manager/players
  ├── Groups           → /tryout-manager/groups
  └── Teams            → /tryout-manager/teams
League Results
  └── Standings        → /league-results  (existing page)
```

> **Route note:** The existing `/players`, `/groups`, `/teams`, and `/league-results` routes can stay as-is or be renamed to match the new hierarchy. Recommend keeping existing route strings for now to avoid breaking deep-links and minimize diff; the sidebar just needs to point to the right paths.

### 3b. Sidebar Component State

Add local state to `Sidebar.tsx` for tracking which top-level items are expanded:

```ts
const [expanded, setExpanded] = useState<Record<string, boolean>>({});
```

- **Default:** all `false` (closed on load / homepage).
- **Toggle behavior:** clicking the arrow icon toggles `expanded[key]` without navigating.
- **On navigation:** when the user clicks a nav item name (not the arrow), navigate to that page, then collapse all top-level items *except* the one whose subtree contains the active route.

### 3c. Per-Item Behavior Rules

| Action | Result |
|--------|--------|
| Click item name (no subpages) | Navigate to landing page; collapse all subpages |
| Click item name (has subpages) | Navigate to landing page; expand that item's subpages, collapse others |
| Click arrow (expand/collapse toggle) | Toggle open/closed; do **not** navigate |
| Multiple arrows clicked | Both/all expanded simultaneously — no accordion enforcement |
| Visit homepage (`/`) | All expand states reset to closed |

### 3d. Hover Indication

Add a hover state to every top-level nav item row and every subpage link:

```
hover:bg-navy-800 hover:text-white cursor-pointer transition-colors duration-150
```

This is already partially in place; audit and ensure it applies uniformly to the entire row (not just the icon or text).

### 3e. Arrow Icon

Use `ChevronRight` from `lucide-react`, rotated 90° when expanded:

```tsx
<ChevronRight
  className={cn("h-4 w-4 transition-transform duration-200", expanded[key] && "rotate-90")}
/>
```

Arrow click handler must call `e.stopPropagation()` so it doesn't trigger the row's navigation handler.

### 3f. Landing Pages for New Sections

Create stub landing pages for the two new sections that have no existing pages:

- `client/src/pages/PlaymakerPage.tsx` — route `/playmaker`
- `client/src/pages/SquadAssistPage.tsx` — route `/squad-assist`

Each stub shows the section title and a brief "Coming soon" line. No elaborate layout needed.

Also create a `TryoutManagerPage.tsx` at `/tryout-manager` that serves as the landing page for that section (brief description + links to subpages).

And a `LeagueResultsLandingPage.tsx` at `/league-results-home` (or reuse the existing `/league-results` route) that lists seasons — this may already be handled by the existing `LeagueResultsPage.tsx`.

> **Simplification option:** If `LeagueResultsPage.tsx` already acts as a landing page for that section, just point the sidebar's "League Results" name to `/league-results` and list "Standings" as the only child, pointing to the same route. No new file needed.

### 3g. Route Updates in App.tsx

```tsx
// New routes to add
<Route path="/" element={<HomePage />} />
<Route path="/playmaker" element={<PlaymakerPage />} />
<Route path="/squad-assist" element={<SquadAssistPage />} />
<Route path="/tryout-manager" element={<TryoutManagerPage />} />
// Existing routes — keep as-is or alias under /tryout-manager/*
<Route path="/players" element={<PlayersPage />} />
<Route path="/groups" element={<GroupsPage />} />
<Route path="/teams" element={<TeamsPage />} />
<Route path="/league-results" element={<LeagueResultsPage />} />
<Route path="/league-results/:seasonId" element={<LeagueDivisionsPage />} />
<Route path="/league-results/:seasonId/:divisionId" element={<LeagueStandingsPage />} />
```

---

## 4. README Update

Rewrite `README.md` to reflect:
- New name: **Sideline Sidekick**
- Updated description: coaching companion app for tryout management, team building, and league tracking.
- Updated feature list matching the new nav structure (Tryout Manager, League Results, Playmaker placeholder, Squad Assist placeholder).
- Tech stack section (React, Vite, TypeScript, Express, SQLite, TailwindCSS).
- Brief local dev instructions (already implied by existing monorepo setup).

---

## Implementation Order

1. **App rename** (title, sidebar branding) — 5 min, zero risk.
2. **Homepage** (new page + route redirect) — creates the `HomePage.tsx` stub and logo asset.
3. **Stub landing pages** for Playmaker, Squad Assist, Tryout Manager landing.
4. **Sidebar refactor** — update `Sidebar.tsx` with new nav config, expand/collapse state, arrow icon, hover styles.
5. **Route wiring** — update `App.tsx` with all new routes.
6. **README update** — last, after all structural changes are confirmed.

---

## Files Created / Modified Summary

| File | Action |
|------|--------|
| `client/index.html` | Modify — update `<title>` |
| `client/src/components/layout/Sidebar.tsx` | Modify — new nav structure, expand/collapse state, arrow icon |
| `client/src/App.tsx` | Modify — new routes, homepage redirect |
| `client/src/pages/HomePage.tsx` | Create |
| `client/src/pages/PlaymakerPage.tsx` | Create |
| `client/src/pages/SquadAssistPage.tsx` | Create |
| `client/src/pages/TryoutManagerPage.tsx` | Create |
| `client/src/assets/logo.svg` (or inline) | Create |
| `README.md` | Modify — full rewrite |
