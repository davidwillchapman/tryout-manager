# Implementation Plan — Fifteen: Bulk Delete Players

## Overview

Add a bulk delete feature to the Players page, allowing users to select multiple players via checkboxes and delete them in a single action with confirmation.

---

## Backend

### New Endpoint: `DELETE /api/players/bulk`

**File:** `server/src/routes/players.ts`

Add a new route before the `/:id` routes to avoid path conflict:

```
DELETE /api/players/bulk
Body: { ids: number[] }
```

- Validate `ids` is a non-empty array of numbers.
- Execute a single `DELETE FROM players WHERE id IN (?, ?, ...)` using the provided IDs.
- Return `204 No Content` on success.
- Return `400` if `ids` is missing, empty, or not an array.

---

## Frontend

### 1. New API Hook — `useBulkDeletePlayers`

**File:** `client/src/api/players.ts`

Add a mutation hook alongside the existing `useDeletePlayer`:

```typescript
export function useBulkDeletePlayers() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids: number[]) =>
      apiFetch<void>('/players/bulk', { method: 'DELETE', body: JSON.stringify({ ids }) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: playerKeys.all });
      qc.invalidateQueries({ queryKey: ['teams'] });
      qc.invalidateQueries({ queryKey: ['groups'] });
    },
  });
}
```

---

### 2. Selection State — `PlayersPage.tsx`

**File:** `client/src/pages/PlayersPage.tsx`

Add state to track selected player IDs:

```typescript
const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
```

Add a derived flag for "select all" checkbox state:
- **Checked:** all visible players are selected.
- **Indeterminate:** some but not all are selected.
- **Unchecked:** none are selected.

Reset `selectedIds` whenever filters change or after a successful bulk delete.

Add handlers:
- `handleTogglePlayer(id)` — add/remove a single ID from the set.
- `handleToggleAll()` — select all visible players or clear selection.
- `handleBulkDelete()` — call `bulkDeletePlayers.mutate([...selectedIds])`, then clear selection and close confirmation dialog.

---

### 3. Table Header — Checkbox Column

**File:** `client/src/pages/PlayersPage.tsx`

Add a new `<th>` as the first column in the table header containing a checkbox:

- Renders a checkbox that reflects the select-all state (checked / indeterminate / unchecked).
- Clicking it calls `handleToggleAll()`.

---

### 4. Bulk Action Bar

**File:** `client/src/pages/PlayersPage.tsx`

When `selectedIds.size > 0`, show a bar (or inline button near the top-right of the table) with:

```
[X] Delete Selected (N)
```

- The count `N` reflects `selectedIds.size`.
- Clicking opens the confirmation dialog.
- The `[X]` button clears the selection.

---

### 5. Confirmation Dialog

**File:** `client/src/pages/PlayersPage.tsx`

Reuse the existing `AlertDialog` pattern (already used in `PlayerRow.tsx`) to confirm bulk deletion:

```
Title: "Delete {N} player{s}?"
Description: "This will permanently delete the selected players. This cannot be undone."
Cancel | Delete
```

The Delete button shows a loading state while the mutation is pending.

---

### 6. `PlayerRow.tsx` — Add Checkbox Column

**File:** `client/src/components/players/PlayerRow.tsx`

Add props:
```typescript
isSelected: boolean;
onToggle: (id: number) => void;
```

Add a `<td>` as the first cell containing a checkbox bound to `isSelected`/`onToggle`.

---

## Summary of File Changes

| File | Change |
|---|---|
| `server/src/routes/players.ts` | Add `DELETE /players/bulk` endpoint |
| `client/src/api/players.ts` | Add `useBulkDeletePlayers` hook |
| `client/src/pages/PlayersPage.tsx` | Selection state, select-all checkbox, bulk action bar, confirmation dialog |
| `client/src/components/players/PlayerRow.tsx` | Add checkbox column with `isSelected` / `onToggle` props |

---

## Behavior Notes

- Filtering while players are selected clears the selection to avoid accidental deletion of hidden players.
- The select-all checkbox only selects players currently visible (matching active filters), not all players in the database.
- Bulk delete invalidates `players`, `teams`, and `groups` query caches (same as single delete, plus groups since group assignment counts may change).
