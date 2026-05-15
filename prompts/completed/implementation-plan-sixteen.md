# Implementation Plan — Sixteen: Smart Overlay Positioning

## Overview

The "Send to team" overlay in `GroupCard.tsx` always opens downward from the arrow button (`top = arrowRef.bottom + 4px`). When the arrow is near the bottom of the viewport, the overlay is clipped. The fix: after the overlay mounts and its height is known, check whether it fits below the trigger. If not, anchor the overlay's bottom edge to the top of the arrow instead.

## Affected File

- `client/src/components/groups/GroupCard.tsx` — `DraggablePlayer` component, specifically the `openSendTo` function and the overlay `div`.

## Current Behaviour

```
openSendTo = (e) => {
  const rect = arrowRef.current.getBoundingClientRect();
  setOverlayPos({ top: rect.bottom + 4, left: rect.left });
  setSendToOpen(true);
};
```

Overlay style: `style={{ top: overlayPos.top, left: overlayPos.left }}`

The overlay is always placed below the button. No check is made against `window.innerHeight`.

## Proposed Solution

### 1. Extend overlay position state

Add a `bottom` property (or a `direction` flag) to the position state so the overlay can be rendered anchored to the bottom when needed.

Use a separate `overlayRef` (`useRef<HTMLDivElement>(null)`) attached to the overlay `div`.

### 2. Two-pass positioning with `useEffect`

The overlay height is not known until it is in the DOM. Use a `useEffect` that fires whenever `sendToOpen` becomes `true`:

```
useEffect(() => {
  if (!sendToOpen || !overlayRef.current || !triggerRect) return;

  const overlayHeight = overlayRef.current.offsetHeight;
  const spaceBelow = window.innerHeight - triggerRect.bottom - 4;

  if (overlayHeight > spaceBelow) {
    // Anchor bottom of overlay to top of arrow
    setOverlayPos({
      bottom: window.innerHeight - triggerRect.top + 4,
      top: undefined,
      left: triggerRect.left,
    });
  }
}, [sendToOpen]);
```

Store `triggerRect` in state alongside `overlayPos` so the effect can reference it without a stale closure. Alternatively, store it in a ref.

### 3. Update `openSendTo`

```
openSendTo = (e) => {
  e.stopPropagation();
  const rect = arrowRef.current.getBoundingClientRect();
  triggerRectRef.current = rect;
  // Default: open below
  setOverlayPos({ top: rect.bottom + 4, bottom: undefined, left: rect.left });
  setSendToOpen(true);
};
```

### 4. Update overlay position state type

```ts
const [overlayPos, setOverlayPos] = useState<{
  top?: number;
  bottom?: number;
  left: number;
}>({ top: 0, left: 0 });
```

### 5. Apply style to overlay div

```tsx
<div
  ref={overlayRef}
  style={{
    top: overlayPos.top,
    bottom: overlayPos.bottom,
    left: overlayPos.left,
  }}
  className="fixed z-50 bg-navy-800 border border-navy-600 rounded shadow-lg py-1 min-w-36"
>
```

Using `top`/`bottom` via `style` rather than Tailwind utilities keeps the values dynamic. When `top` is `undefined` and `bottom` is set, CSS treats `top` as `auto` and the element is anchored to the bottom reference point — standard fixed-position behaviour.

### 6. Handle horizontal clipping (optional / low priority)

If the overlay's right edge overflows the viewport width, clamp `left` so the overlay stays on screen:

```ts
const overlayWidth = overlayRef.current.offsetWidth;
const clampedLeft = Math.min(triggerRect.left, window.innerWidth - overlayWidth - 8);
```

Include this in the same `useEffect` pass.

## Step-by-Step Implementation

1. Add `overlayRef = useRef<HTMLDivElement>(null)` near the other refs in `DraggablePlayer`.
2. Add `triggerRectRef = useRef<DOMRect | null>(null)`.
3. Update `overlayPos` state type to accept `top?: number` and `bottom?: number`.
4. Update `openSendTo` to store the rect in `triggerRectRef` and reset `bottom: undefined` in the initial position.
5. Add a `useEffect` depending on `[sendToOpen]` that runs the two-pass position correction using `overlayRef.current.offsetHeight`.
6. Attach `ref={overlayRef}` to the overlay `div`.
7. Update the overlay's `style` prop to spread both `top` and `bottom`.
8. Optionally clamp `left` to prevent horizontal overflow.

## Testing

- Open the player list with enough teams that the overlay is tall.
- Click the arrow on a player near the bottom of the viewport — the overlay should flip upward.
- Click the arrow on a player near the top — the overlay should open downward as before.
- Verify selecting a team still works correctly in both orientations.
- Verify clicking the backdrop still closes the overlay.
