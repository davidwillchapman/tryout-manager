# Implementation Plan Four — Replace Text Logo with Image Logo

## Goal
Replace the text-based brand label ("Sideline Sidekick") in the sidebar with the logo image from `client/src/assets/logo.png`.

---

## Analysis: Current Logo File

**File:** `client/src/assets/logo.png`
- Format: PNG, 1408×768, RGBA color mode
- Background transparency: **None** — all 1,081,344 pixels have alpha=255 (fully opaque)
- Background color: off-white / light gray (~RGB 240–247)
- Logo mark: "SIDELINE KICK" in dark navy text (~#1a2a40 range)

**Problem:** The sidebar background is `navy-900` (very dark). The logo's dark navy text on a transparent background would be nearly invisible. We need a **white-text version** for use on dark backgrounds.

---

## Steps

### Step 1 — Create a transparent-background PNG with white text

Run a Python script to:
1. Load `logo.png`
2. Remove the off-white background by making near-white pixels (alpha < threshold) transparent
3. Invert the dark navy text to white so it's visible on the dark sidebar
4. Save as `client/src/assets/logo-white.png`

Script outline:
```python
from PIL import Image
import numpy as np

img = Image.open("client/src/assets/logo.png").convert("RGBA")
arr = np.array(img)

# Identify background: pixels where R,G,B are all > 200
bg_mask = (arr[:,:,0] > 200) & (arr[:,:,1] > 200) & (arr[:,:,2] > 200)

# Make background transparent
arr[bg_mask, 3] = 0

# Invert remaining (logo) pixels to white
logo_mask = ~bg_mask
arr[logo_mask, 0] = 255
arr[logo_mask, 1] = 255
arr[logo_mask, 2] = 255

Image.fromarray(arr).save("client/src/assets/logo-white.png")
```

### Step 2 — Create an SVG version

Trace the key design elements from the logo into an SVG file at `client/src/assets/logo.svg`. The SVG should:
- Use `fill="white"` for all letterforms and the diagonal slash mark
- Have `background="transparent"` (no background rectangle)
- Be sized with a `viewBox` that matches the logo proportions (~16:9 ratio based on 1408×768 source)

This gives a resolution-independent version suitable for any size.

### Step 3 — Update Sidebar.tsx

**File:** `client/src/components/layout/Sidebar.tsx`
**Location:** Lines 61–63 — the current brand header section

**Current code:**
```tsx
<div className="px-5 py-5 border-b border-navy-600">
  <span className="text-gold font-bold text-lg tracking-tight">Sideline Sidekick</span>
</div>
```

**Replace with:**
```tsx
<div className="px-5 py-4 border-b border-navy-600">
  <img
    src={logo}
    alt="Sideline Kick"
    className="h-8 w-auto object-contain"
  />
</div>
```

Add import at top of file:
```tsx
import logo from '../../assets/logo-white.png';
```

Or if using the SVG:
```tsx
import logo from '../../assets/logo.svg';
```

---

## File Changes Summary

| Action | File |
|--------|------|
| Generate (script) | `client/src/assets/logo-white.png` |
| Generate (manual/script) | `client/src/assets/logo.svg` |
| Modify | `client/src/components/layout/Sidebar.tsx` |

---

## Preferred Approach

Use the **SVG** if the logo can be cleanly traced (crisp geometric letterforms). Otherwise use **logo-white.png** as it is a direct pixel-accurate derivation of the provided asset with background removed and text inverted for the dark sidebar. The PNG approach is safer given the source is already pixel-based.
