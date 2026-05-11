# Implementation Plan Nine — DNA Tagging Hierarchy Fix

## Overview

The Playmaker's DNA Tagging dropdowns are showing the wrong content at each level. This plan diagnoses the root cause (a mismatch between the US Soccer Framework's markdown structure and the parser's assumptions) and specifies the changes needed to make Phase → Principle → Sub-Principle map correctly to the framework's actual coaching concepts.

---

## Root Cause Analysis

### What the user expects

| Dropdown | Should show |
|---|---|
| Phase | Game moment — Attacking, Defending, etc. |
| Principle | Main principle within that phase — Create Attacking Shape, etc. |
| Sub-Principle | Sub-items of the selected principle |

### What is actually showing

| Dropdown | Actually shows |
|---|---|
| Phase | "U15-U16 Progression Phase II" (the H1 framework title) |
| Principle | "The Game Moments", "Attacking", "Defending", etc. (H2 sections) |
| Sub-Principle | "Team Tactical Principles", "Player Actions", "Field Phase Summary" (H3 category headers) |

### Why it is broken — two separate issues

**Issue 1: The parser creates a section for H1**

`frameworkParser.ts` treats every markdown heading (H1–H6) as a navigable section. The US Soccer Framework file begins with:

```
# U.S. Soccer Federation Technical Plan — U15-U16 Progression Phase II
```

This H1 heading becomes a root section (`parent_id = null`) in the database. The TagForm's Phase dropdown uses `getTopLevel()` — sections where `parent_id = null` — so the framework title appears as the only selectable Phase.

The framework name is already captured separately in the `frameworks` table when the user imports a file. The H1 heading is redundant and should not become a data section.

**Issue 2: The US Soccer Framework markdown has an extra structural level**

Even after fixing Issue 1, the hierarchy is:

```
H2: Attacking                        → would be Phase (correct)
  H3: Team Tactical Principles       → would be Principle (wrong — this is a category header)
    H4: Create Attacking Shape       → would be Sub-Principle (wrong — this is the actual principle)
  H3: Player Actions                 → would be Principle (wrong — another category header)
  H3: Field Phase Summary            → would be Principle (wrong — a summary table)
H2: The Game Moments                 → would be a Phase (wrong — this is an intro section)
```

The framework markdown has a 4-level content structure (Phase → Category → Principle → Sub-Principle) but the DNA tagging system supports only 3 meaningful levels. The H3 sections are organizational headers, not coaching principles — they do not belong at the Principle level.

---

## Solution

Two coordinated changes: fix the parser, then restructure and re-import the framework.

---

## Change 1 — `frameworkParser.ts`: Skip H1 Sections

**File:** `server/src/lib/frameworkParser.ts`

Modify `parseMarkdownText` to ignore headings at level 1. H1 in a framework document is always the document title, which is already stored in the `frameworks.name` column. By skipping H1, all subsequent levels shift up one position:

- H2 → root sections (Phase level, `parent_id = null`)
- H3 → children of Phase (Principle level)
- H4 → children of Principle (Sub-Principle level)

**Implementation:** In the `for (const line of lines)` loop inside `parseMarkdownText`, when a heading match is found, skip it if `level === 1`:

```typescript
if (headingMatch) {
  flushContent();
  const level = headingMatch[1].length;
  if (level === 1) continue;   // ← add this line
  const title = headingMatch[2].trim();
  // ...rest unchanged
}
```

No other files change. The `flattenSections` export, the DB insert loop in `frameworks.ts`, and the `TagForm` client logic are all unaffected — they already operate on whatever the parser produces.

---

## Change 2 — Restructure the US Soccer Framework Markdown

**File:** `assets/US Soccer Training Framework - U16.md`

The current markdown has an extra organizational layer (H3 category headers) between the game moment phases and the actual coaching principles. That layer must be removed so the file matches the 3-level Phase/Principle/Sub-Principle model.

### Restructuring rules

| Current | Action | Result |
|---|---|---|
| `# U.S. Soccer…` (H1) | Keep as-is — now skipped by parser | (not imported) |
| `## The Game Moments` (intro section) | Remove — it is an introductory list, not a phase | (not imported) |
| `## Attacking` (H2 game moment) | Keep as-is | Phase |
| `### Team Tactical Principles` (H3 category) | Remove the heading, keep content inline or as a note | (not imported) |
| `#### Create Attacking Shape` (H4 principle) | Promote to H3 | Principle |
| Bullet points under H3 principle | Keep as markdown content on the Principle section | (content, not a separate section) |
| `### Player Actions` (H3 category) | Decision — see below | |
| `#### With the Ball` / `#### Spacial...` (H4) | Promote to H3 if kept | Principle |
| `##### Controlling`, `##### Scanning`, etc. (H5) | Promote to H4 | Sub-Principle |
| `### Field Phase Summary` (H3 table) | Remove entirely — this is a reference table, not a principle | (not imported) |

### Decision on Player Actions

Player Actions describe technical skills (Controlling, Dribbling, Shooting, etc.), not coaching principles in the tactical sense. Two valid approaches:

**Option A (Recommended) — Include as a parallel principle group:**
Keep Player Actions as a set of Principles alongside Team Tactical Principles. Promote H4 actions (With the Ball, Spatial & Positional Awareness) to H3 Principles, and H5 skills (Controlling, Dribbling, etc.) to H4 Sub-Principles.

**Option B — Exclude from the imported framework:**
Remove the Player Actions section entirely from the import file and keep only Team Tactical Principles as Principles. Player Actions can remain in the PDF reference but not be part of DNA tagging.

The implementation plan uses Option A. Either is acceptable — the markdown file is the source of truth and can be edited again before re-import.

### Resulting structure after restructure

```
# U.S. Soccer Federation Technical Plan — U15-U16 Progression Phase II
  (skipped by parser)

## Attacking
  ### Create Attacking Shape          ← Principle
  ### Provide Options to Play Forward ← Principle
  ### Break Lines to Advance Attack   ← Principle
  ### Take Countermeasures            ← Principle
  ### Finish the Attack               ← Principle
  ### With the Ball                   ← Principle (Player Actions group)
    #### Controlling                  ← Sub-Principle
    #### Protecting                   ← Sub-Principle
    #### Driving                      ← Sub-Principle
    #### Dribbling                    ← Sub-Principle
    #### Passing                      ← Sub-Principle
    #### Shooting                     ← Sub-Principle
  ### Scanning                        ← Principle
  ### Supporting (Positioning)        ← Principle
  ### Adapting Body Shape             ← Principle

## Attacking to Defending Transition
  ### Apply Immediate Pressure on the Ball  ← Principle
  ...

## Defending
  ...

## Defending to Attacking Transition
  ...
```

---

## Change 3 — Delete and Re-import the Framework

After restructuring the markdown file, the existing US Soccer Framework in the database needs to be deleted and re-imported to pick up the new section structure.

**Steps (manual in the UI):**
1. Navigate to DNA Frameworks
2. Delete "US Soccer Training Framework" (this also cascades to any existing framework sections and any activity tags referencing those section IDs)
3. Import the restructured markdown file using the same framework name

**Important:** Existing activity DNA tags that referenced this framework will be deleted by the cascade. Activities themselves are unaffected. Tags will need to be reapplied after re-import. If existing tags must be preserved, a migration script that maps old section IDs to new ones by title match is an option, but is complex and only needed if there are many tagged activities.

---

## Change 4 — (Optional) DNAFrameworksPage: Show Section Depth

To prevent future confusion about framework structure before importing, the DNA Frameworks detail tree view could display each section's depth level (e.g., a small "Phase", "Principle", "Sub-Principle" badge or indentation label). This is a UI-only enhancement and does not affect the data model.

This is low priority and can be skipped if the parser fix + markdown restructure fully resolves the confusion.

---

## Files to Change

| File | Change |
|---|---|
| `server/src/lib/frameworkParser.ts` | Skip level-1 headings in `parseMarkdownText` |
| `assets/US Soccer Training Framework - U16.md` | Remove H3 category headers, promote H4→H3, H5→H4, remove The Game Moments and Field Phase Summary sections |

## Files Not Changing

| File | Reason |
|---|---|
| `server/src/routes/frameworks.ts` | No change needed — uses parser output unchanged |
| `server/src/db.ts` | No schema changes — `framework_sections` is already generic |
| `client/src/components/activities/TagForm.tsx` | Logic is correct — `getTopLevel` and `getChildren` will work correctly once parser output is fixed |
| `client/src/types.ts` | No type changes |
| `client/src/api/frameworks.ts` | No changes |
| `client/src/api/activities.ts` | No changes |

---

## Implementation Steps

### Step 1 — Parser fix

In `server/src/lib/frameworkParser.ts`, inside `parseMarkdownText`, add `if (level === 1) continue;` immediately after extracting the heading level. Rebuild and verify with a test import.

### Step 2 — Restructure markdown

Edit `assets/US Soccer Training Framework - U16.md`:
- Remove the `## The Game Moments` section and its bullet list
- Remove `### Team Tactical Principles`, `### Player Actions`, `### Field Phase Summary` headings (keep their body content attached to the next heading or discard as appropriate)
- Promote `#### Principle Name` → `### Principle Name` throughout
- Promote `##### Skill Name` → `#### Skill Name` throughout
- Remove the `| Field Phase | ... |` summary table under Field Phase Summary

### Step 3 — Re-import

Delete the existing US Soccer Framework via the UI and re-import the restructured markdown file.

### Step 4 — Verify

In Playmaker, open Add DNA Tag for any activity:
- Select the US Soccer Framework
- Confirm Phase dropdown shows: Attacking, Attacking to Defending Transition, Defending, Defending to Attacking Transition
- Select Attacking; confirm Principle dropdown shows: Create Attacking Shape, Provide Options to Play Forward, Break Lines to Advance Attack, Take Countermeasures, Finish the Attack, With the Ball, Scanning, Supporting (Positioning), Adapting Body Shape
- Select Create Attacking Shape; confirm Sub-Principle dropdown is empty (no sub-sections) or shows sub-items if any were created at H4

---

## Out of Scope

- **4-level framework support** — adding a Category level between Phase and Principle is a schema change. The current 3-level model (Phase/Principle/Sub-Principle) covers the US Soccer Framework after restructuring and is sufficient for now.
- **Migration script** — mapping old section IDs to new ones during re-import. Only worth building if many activities already have tags that need preserving.
- **Other framework re-imports** — this plan only addresses the US Soccer Framework. Any other imported frameworks with H1 headings will also benefit from the parser fix automatically on next import.
