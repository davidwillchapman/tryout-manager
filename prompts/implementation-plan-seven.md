# Implementation Plan Seven — Logo Redesign

## Overview

Redesign the Sideline Sidekick logo to clearly communicate "SIDELINE SIDEKICK" as two distinct words rather than "SIDE LINE KICK". The new design is a 2-color layout: a primary color for "SIDELINE" across the top, and a shadowed/muted color for "SIDEKICK" angled below it to simulate a morning shadow cast by a sun positioned to the upper-left of the logo. Three skew variants will be produced.

---

## Current State

- Logo is stored as PNG files in `client/src/assets/`:
  - `logo-gap.png` — primary color version (dark background implied)
  - `logo-gap-white.png` — white version (used in sidebar)
  - `logo.png` — no-gap version
  - `logo-white.png` — white no-gap version
- `Sidebar.tsx` imports `logo-gap-white.png` and renders it at `h-16`

---

## Problem

The current design places a large "SIDE" next to half-height "LINE" and "KICK" stacked vertically. The horizontal gap in "SIDE" (intended to mirror the gap between "LINE" and "KICK") causes the eye to read the three words separately as "SIDE LINE KICK" rather than grouping them as "SIDELINE SIDEKICK".

---

## Solution

Replace the existing logo assets with SVG files that implement the new 2-line design. SVG is preferred over PNG because it scales cleanly at any size, is easy to version-control, and does not require external design tools to adjust.

### Design Concept

```
  SIDELINE          ← primary color, uniform weight, no gap
    SIDEKICK        ← shadowed color, same font, skewed as if cast by upper-left sun
```

- **Top row**: "SIDELINE" — full word, no gap, "SIDE" shrunk vertically to match "LINE" height so they form one unified word at equal cap-height.
- **Bottom row**: "SIDEKICK" — same typeface, muted/shadowed color (e.g. semi-transparent or darker variant of primary), skewed horizontally to simulate a shadow. Positioned slightly below and to the right of "SIDELINE".

### Shadow Geometry

Sun is positioned upper-left, at 8–10am. As the sun rises and moves right:
- **8am** — sun is lower on the horizon (upper-left but low). Shadow falls far to the lower-right at a shallow angle. Text has heavy rightward skew (`skewX` large).
- **9am** — sun is mid-height upper-left. Shadow falls at a moderate diagonal. Medium skew.
- **10am** — sun is higher upper-left. Shadow falls more steeply downward with less horizontal spread. Mild rightward skew.

Shadow skew values (SVG `skewX` transform, degrees):
| Version | Time | skewX | Rationale |
|---------|------|-------|-----------|
| A | ~8am | -35° | Sun low-left → long, nearly horizontal shadow to the right |
| B | ~9am | -22° | Sun mid-left → moderate diagonal |
| C | ~10am | -12° | Sun higher-left → shadow falls more vertically |

> Negative skewX tilts the top of the text leftward (matching a shadow cast from upper-left to lower-right).

### Colors

- **Primary** (`#ffffff` white or app gold `#C9A84C`) — used for "SIDELINE"
- **Shadow** — semi-transparent version of primary or a darker muted tone, e.g. `rgba(255,255,255,0.35)` for white-on-dark backgrounds

Two color sets will be produced (matching existing pattern):
- White variant (for dark sidebar background)
- Gold/primary variant (for light backgrounds if needed)

---

## Files to Create

```
client/src/assets/
  logo-v7a.svg        ← 8am shadow skew (~-35°)
  logo-v7b.svg        ← 9am shadow skew (~-22°)
  logo-v7c.svg        ← 10am shadow skew (~-12°)
```

Each SVG will:
- Use a `viewBox` of approximately `0 0 220 80` to fit two rows
- Render "SIDELINE" in a bold sans-serif at the top (y ≈ 36)
- Render "SIDEKICK" below (y ≈ 70), skewed via `transform="skewX(angle)"`, slightly offset right
- Both words use the same font size so cap-heights match
- No gap or split in either word

---

## Implementation Steps

### Step 1 — Create the three SVG files

Create `logo-v7a.svg`, `logo-v7b.svg`, `logo-v7c.svg` in `client/src/assets/`.

Each file follows this structure (skewX value differs per version):

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 80">
  <!-- SIDELINE: primary color, top row -->
  <text x="8" y="38"
    font-family="'Arial Black', Arial, sans-serif"
    font-weight="900"
    font-size="36"
    fill="#ffffff"
    letter-spacing="1">SIDELINE</text>

  <!-- SIDEKICK: shadow color, skewed -->
  <text x="16" y="72"
    font-family="'Arial Black', Arial, sans-serif"
    font-weight="900"
    font-size="36"
    fill="rgba(255,255,255,0.38)"
    letter-spacing="1"
    transform="skewX(-35)">SIDEKICK</text>
</svg>
```

> `x` offset for SIDEKICK may need slight tuning per skew to keep it visually aligned under SIDELINE.

### Step 2 — Review all three variants in the browser

Open each SVG in the browser or reference them from a test page. Evaluate:
- Does each shadow angle read as morning light from upper-left?
- Are the two words legible and clearly distinct?
- Does font-size produce matching cap-heights for "SIDELINE" and "SIDEKICK"?

Pick one version as the primary, or surface all three to the user for selection.

### Step 3 — Update Sidebar.tsx

Replace the current logo import with the chosen SVG:

```tsx
// Before
import logo from '../../assets/logo-gap-white.png';

// After
import logo from '../../assets/logo-v7b.svg';  // or chosen version
```

The `<img>` tag in `Sidebar.tsx` remains unchanged — SVG loads fine via the same `src` pattern.

### Step 4 — Verify in app

- Run the dev server (`npm run dev` or `cd client && npm run dev`)
- Confirm the logo renders correctly in the sidebar at `h-16`
- Check at sidebar collapsed and expanded states
- Confirm legibility on the dark navy sidebar background

---

## Out of Scope

- No changes to typography or font loading (uses system fonts via CSS font stack)
- No changes to nav items, routing, or any other component
- The old PNG assets (`logo-gap.png`, `logo-gap-white.png`, etc.) are kept in place until the user confirms which SVG version to adopt

---

## Open Questions for User

1. Which of the 3 shadow skew versions (A/8am, B/9am, C/10am) do you prefer?
2. Should the shadow "SIDEKICK" text be white-transparent, or a specific color (e.g. gold-tinted shadow)?
3. Should we also export a PNG version for any contexts that can't use SVG?
