# Implementation Plan — Fourteen: UI Navigation Polish

## Overview

Convert Playmaker and Squad Assist from single-page views with internal toggles into multi-route sections with proper sidebar suboptions. Reorder Tryout Manager suboptions. These changes unify the navigation pattern across all top-level sections.

---

## Current State

**Sidebar nav structure (`Sidebar.tsx`):**
- Playmaker → `/playmaker` (no children)
- Squad Assist → `/squad-assist` (no children)
- Tryout Manager → `/tryout-manager` (children: Players, Groups, Teams)
- League Results → `/league-results` (children: Standings)
- DNA Frameworks → `/dna-frameworks` (no children)

**PlaymakerPage:** Single page with an internal tab toggle (`mode: 'activities' | 'sessions'`).

**SquadAssistPage:** Single page showing squad team list + detail. Formation templates surface inside `SquadTeamDetail` as a tab.

---

## Tasks

### 1. Sidebar — `client/src/components/layout/Sidebar.tsx`

Update `navItems` array:

**Playmaker** — add children array and update `to` to point to first child:
```ts
{
  key: 'playmaker',
  label: 'Playmaker',
  to: '/playmaker/activities',
  children: [
    { label: 'Activities',           to: '/playmaker/activities' },
    { label: 'Sessions',             to: '/playmaker/sessions' },
    { label: 'Images',               to: '/playmaker/images' },
  ],
},
```

**Squad Assist** — add children array and update `to` to point to first child:
```ts
{
  key: 'squad-assist',
  label: 'Squad Assist',
  to: '/squad-assist/squads',
  children: [
    { label: 'Squads',               to: '/squad-assist/squads' },
    { label: 'Formation Templates',  to: '/squad-assist/formation-templates' },
  ],
},
```

**Tryout Manager** — reorder children (Groups → Teams → Players):
```ts
children: [
  { label: 'Groups',  to: '/groups' },
  { label: 'Teams',   to: '/teams' },
  { label: 'Players', to: '/players' },
],
```

Also update the `activeInSubtree` logic so that `/playmaker/activities`, `/playmaker/sessions`, etc., correctly highlight the Playmaker parent. The existing `childPaths.some(p => location.pathname.startsWith(p))` check already handles this — no change needed as long as child `to` values are properly set.

---

### 2. Routing — `client/src/App.tsx`

Add new routes and redirects:

```tsx
// Playmaker subroutes
<Route path="/playmaker"            element={<Navigate to="/playmaker/activities" replace />} />
<Route path="/playmaker/activities" element={<PlaymakerPage defaultMode="activities" />} />
<Route path="/playmaker/sessions"   element={<PlaymakerPage defaultMode="sessions" />} />
<Route path="/playmaker/images"     element={<PlaymakerImagesPage />} />

// Squad Assist subroutes
<Route path="/squad-assist"                      element={<Navigate to="/squad-assist/squads" replace />} />
<Route path="/squad-assist/squads"               element={<SquadAssistPage />} />
<Route path="/squad-assist/formation-templates"  element={<FormationTemplatesPage />} />
```

Import `Navigate` from `react-router-dom` and the two new page components.

---

### 3. PlaymakerPage — `client/src/pages/PlaymakerPage.tsx`

- Add a `defaultMode` prop (`'activities' | 'sessions'`).
- Initialize `useState` with the prop value: `const [mode, setMode] = useState<Mode>(defaultMode)`.
- Remove the internal mode toggle buttons (the `Activities` / `Sessions` tab strip) since navigation is now handled by the sidebar suboptions.
- Keep all other logic (selected IDs, dialogs, list/detail panels) unchanged.

The page renders either the activities or sessions panel based on `defaultMode` passed in from the route, with no in-page switching needed.

---

### 4. New page: PlaymakerImagesPage — `client/src/pages/PlaymakerImagesPage.tsx`

Skeleton placeholder — no functionality yet:

```tsx
export function PlaymakerImagesPage() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8">
      <h2 className="text-white font-semibold mb-1">Images</h2>
      <p className="text-muted text-sm">Coming soon — activity image library.</p>
    </div>
  );
}
```

---

### 5. New page: FormationTemplatesPage — `client/src/pages/FormationTemplatesPage.tsx`

- Read `client/src/components/squad/FormationTemplateManager.tsx` to understand its props and requirements.
- Create a page that renders `FormationTemplateManager` as a standalone view (not nested inside a team detail).
- If `FormationTemplateManager` requires a `teamId` or similar context prop, assess whether it can be adapted for a global template view or whether a simplified read-only list is more appropriate for this placeholder.

---

### 6. TryoutManagerPage — `client/src/pages/TryoutManagerPage.tsx`

Reorder the links to match the new sidebar suboption order (Groups, Teams, Players):

```tsx
<Link to="/groups"  ...>Groups</Link>
<Link to="/teams"   ...>Teams</Link>
<Link to="/players" ...>Players</Link>
```

---

## File Change Summary

| File | Change |
|------|--------|
| `client/src/components/layout/Sidebar.tsx` | Add children to Playmaker and Squad Assist; reorder Tryout Manager children |
| `client/src/App.tsx` | Add subroutes for Playmaker and Squad Assist; add Navigate redirects |
| `client/src/pages/PlaymakerPage.tsx` | Add `defaultMode` prop; remove internal mode toggle |
| `client/src/pages/PlaymakerImagesPage.tsx` | New — skeleton placeholder |
| `client/src/pages/FormationTemplatesPage.tsx` | New — wraps FormationTemplateManager |
| `client/src/pages/TryoutManagerPage.tsx` | Reorder links |

---

## Notes

- The sidebar `handleItemClick` already navigates to `item.to` when a parent is clicked. Since we're updating `to` for Playmaker and Squad Assist to point to their first child, clicking the parent label in the sidebar will navigate to the correct subroute automatically.
- The internal mode toggle in PlaymakerPage becomes redundant once navigation is sidebar-driven. Removing it keeps the left panel header clean and consistent with SquadAssistPage's simpler header.
- Formation Templates inside `SquadTeamDetail` (team-specific formations tab) is separate from the global `FormationTemplatesPage`. Both can coexist — investigate the component before deciding if any adaptation is needed.
