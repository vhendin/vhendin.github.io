# Trash Plan — Feature Plan & Architecture

## Overview

A browser-based, top-down (map-style) planning tool for laying out garbage bin areas. Users define a surface (e.g. a yard, parking area, or enclosure), place bins to scale on it, add doors/openings in the walls, and decorate the outside with trees and bushes. The visual style follows Google Maps' clean, flat aesthetic.

Single-user. No backend. All state in `localStorage`.

---

## File Structure

Follows the same pattern as other apps in the repo:

```
trash-plan.html                      ← app entry point
resources/styles/trash-plan.css      ← all styles
resources/scripts/trash-plan.js      ← all logic
```

---

## Scale System

All real-world measurements are stored in **meters**. A configurable `scale` factor (pixels per meter) controls how the world maps to the canvas. Default: **60 px/m**.

- Surface dimensions: e.g. `10.0 m × 8.0 m`
- Bin dimensions: real-world sizes provided later, e.g. `1.2 m × 0.8 m`
- Door widths: e.g. `1.0 m`
- Scale increases/decreases with zoom

```
canvasPixels = realWorldMeters × scale × zoomLevel
```

The canvas is centered on the surface by default. Pan and zoom let the user navigate.

---

## Features

### 1. Surface / Enclosure

- Rectangular area representing the physical space (e.g. a bin storage area)
- Defined in meters (width × depth)
- Adjustable via:
  - **Drag handles** on the canvas (corners and edge midpoints)
  - **Number inputs** in a modal (precise entry)
- Has a visible **wall/border** rendered as a thick stroke
- Surface fill texture/color (see Textures section)

### 2. Outside Environment

- Everything outside the surface rectangle is the "outside" area
- Has its own texture/color (default: grass)
- Trees and bushes can be placed anywhere on the outside area
- Outside fills the entire canvas background

### 3. Garbage Bins

- Four bin types with real-world dimensions (see Bin Types Config below)
- Rendered as scaled top-down rectangles with a lid indicator line
- Color-coded by type/size
- Operations:
  - **Place**: select bin type from palette, click on surface to place
  - **Move**: drag placed bin to reposition (bins can be moved outside the surface — see warning below)
  - **Rotate**: 90° increments via `R` key or rotate button while selected
  - **Delete**: `Delete`/`Backspace` key or button while selected
- Bins snap to a configurable grid (e.g. 0.1 m increments)
- **Out-of-bounds warning**: if any part of a bin is dragged outside the surface boundary, the bin renders with a red/orange highlight and a small warning indicator. No hard block — the user can still place it there.
- Each placed bin has an assigned **waste type** (see Waste Type Selection below)

### 4. Doors / Openings

- Gaps in the surface wall indicating an entrance or opening
- Placed by clicking on a wall edge; default width 1.2 m (the minimum allowed)
- Defined by: which edge (N/S/E/W), offset along that edge (m), width (m)
- **Minimum door width: 1.2 m** — enforced in both the drag interaction and any numeric input
- Rendered as a break in the wall stroke
- Can be moved along the same edge by dragging
- Width is editable when selected (input or drag on door edge handles)
- Can be deleted when selected

### 5. Surface Textures

Inside surface options:
- **Concrete** — light gray solid fill with subtle noise
- **Asphalt** — dark gray with fine grain
- **Tiles** — light gray with a drawn grid pattern

Outside surface options:
- **Grass** — muted green — default

Future: additional textures can be added easily.

### 6. Waste Type Selection

Each placed bin can be assigned one waste type from a fixed list. The assigned waste type is shown as a small icon rendered on the bin in the canvas.

**Waste types (from source data):**

| Key | Label (Swedish) | Label (English) |
|-----|----------------|-----------------|
| `plastic` | Plastförpackningar | Plastic packaging |
| `paper` | Pappersförpackningar | Paper packaging |
| `cardboard` | Wellpapp | Corrugated cardboard |
| `metal` | Metallförpackningar | Metal packaging |
| `newspaper` | Tidningar | Newspapers |
| `catalogs` | Kataloger | Catalogs |
| `glass` | Glasförpackningar | Glass packaging |
| `general` | Blandat / Övrigt | General / Mixed |

**Interaction:**
- When a bin is selected in Select mode, a small contextual panel appears (attached to the bin, or in the sidebar) showing a grid of waste type icons
- Clicking an icon assigns that waste type to the bin
- The icon is rendered centered in the bin body on the canvas
- A bin with no assigned type shows no icon

**Icon pack: Phosphor Icons**
- CDN: `https://unpkg.com/@phosphor-icons/web`
- License: MIT
- Icons are clean SVGs, each loadable as a standalone file — ideal for preloading as `Image` objects for canvas drawing
- Suggested icon mapping:

| Waste type | Phosphor icon |
|------------|---------------|
| Plastic | `recycle` |
| Paper | `file` |
| Cardboard | `package` |
| Metal | `nut` |
| Newspaper | `newspaper` |
| Catalogs | `books` |
| Glass | `wine` |
| General | `trash` |

**Canvas rendering strategy:**
1. On app init, preload each icon SVG as an `HTMLImageElement` into a map: `iconImages['plastic'] = new Image(); iconImages['plastic'].src = '...'`
2. When drawing a bin with an assigned waste type, call `ctx.drawImage(iconImages[bin.wasteType], x, y, size, size)` centered in the bin rectangle
3. Icon size scales with zoom but is capped at a min/max (e.g. 16–48 px) so it remains legible

### 7. Surface Dimension Labels

- A toggle in the sidebar (or toolbar) labelled **"Show dimensions"**
- When enabled, the four wall edges each display a dimension label:
  - Width labels centered above the north wall and below the south wall
  - Depth labels centered left of the west wall and right of the east wall
  - Format: `10.0 m` (one decimal place)
- Labels are rendered on the canvas as part of the normal draw pass
- Labels are **included** in PNG exports (they are part of the canvas, not a UI overlay)
- Font: clean sans-serif, small, dark gray — consistent with Google Maps label style

### 7. Measurement Tool

- Activated by selecting the **Measure** tool in the toolbar
- **First click**: places point A anywhere on the canvas (inside or outside surface)
- **Second click**: places point B — a line is drawn between A and B with the distance label at its midpoint
  - Distance shown in meters to two decimal places, e.g. `3.45 m`
  - Line styled as a dashed blue line with dot endpoints
- **Third click**: clears the current measurement (starts fresh for a new one)
- Multiple saved measurements are **not** retained — only one active measurement at a time
- Measurements are **not saved** with the plan and **not included** in PNG exports
- Switching away from the Measure tool also clears the current measurement

### 8. Trees & Bushes

- Placed on the outside area only
- Rendered top-down as circles:
  - **Tree**: larger circle (~0.8–1.5 m radius), dark green fill, subtle drop shadow
  - **Bush**: smaller circle (~0.3–0.5 m radius), lighter green
- Placed by selecting the tree or bush tool and clicking on the outside area
- Moveable and deletable like bins

---

## UI Layout

### Views

**1. Load / Welcome Screen** (shown on page open)
- App title
- List of saved plans from `localStorage` (name + last modified date)
- `[+ New Plan]` button
- Click a plan to load it
- Delete button per plan (with confirmation)

**2. Editor View**
- Full-window canvas
- Top toolbar
- Left sidebar (collapsible)

### Top Toolbar (left to right)

```
[≡ Plans]  |  [plan name — click to rename]  |  [Select] [Bin▾] [Door] [Tree] [Bush] [Measure] [Surface]  |  [Save] [Save As] [Export PNG]
```

- **Plan name**: editable inline
- **Tool modes**: Select (also opens waste type picker for selected bin), Place Bin (sub-palette popup), Place Door, Place Tree, Place Bush, Measure, Edit Surface
- **Save**: overwrites current plan in localStorage
- **Save As**: prompts for name, saves as new plan
- **Export PNG**: renders canvas to PNG and triggers download

### Left Sidebar

- **Bins** section — scrollable list of bin type tiles (small top-down preview + label + real dimensions). Click to activate Place Bin mode with that type selected.
- **Foliage** section — Tree / Bush buttons
- **Surface** section — texture swatches: Concrete, Tiles, Asphalt
- **Outside** section — texture swatches: Grass
- **View** section — zoom slider, grid toggle, snap toggle, **show dimensions toggle**
- **Selection panel** — appears below view section when a bin is selected; shows waste type icon grid for assignment

### Modals

**Surface Settings modal** — opened from toolbar "Surface" tool or by double-clicking the surface:
- Width input (meters) — **interior dimension**
- Depth input (meters) — **interior dimension**
- Inside texture selector (radio or swatches)
- Wall thickness input (meters, default 0.10 m)
- Read-only display: "Exterior: {width + 2×wall} m × {depth + 2×wall} m"
- OK / Cancel

**Save As modal**:
- Text input for plan name
- Save / Cancel

**Confirm Delete modal**:
- "Delete plan X? This cannot be undone."
- Delete / Cancel

---

## Canvas Architecture

### Rendering Layers (draw order)

1. Outside background (grass texture/color)
2. Surface fill (concrete / tiles / asphalt)
3. Surface border/walls (thick stroke, interrupted at door positions)
4. Door openings (gap in wall with subtle dashed line across threshold)
5. Bins (on surface)
6. Trees & bushes (on outside area)
7. Resize handles (corners + edge midpoints, only in Surface Edit mode)
8. Selection highlight + handles (for the currently selected object)
9. Grid overlay (subtle dotted lines at snap intervals, toggleable)
10. Scale indicator + zoom level (bottom-right corner, UI overlay — not exported)

### Hit Testing

On each pointer event, test layers in reverse draw order (topmost first):

1. Resize handles (if in Surface Edit mode)
2. Selection handles (rotate/delete button for selected object)
3. Bins
4. Doors
5. Trees & bushes
6. Surface interior (for bin/door placement)
7. Outside area (for tree/bush placement)

### Pan & Zoom

- **Pan**: middle-mouse drag, or Space + left-drag
- **Zoom**: scroll wheel (centered on cursor position)
- Zoom range: 10 px/m – 200 px/m
- Scale indicator updates live (e.g. "1 m = 60 px")

---

## State / Data Model

This is the shape of a saved plan in localStorage, and also what would be used for a future JSON export.

```json
{
  "version": 1,
  "name": "Back Yard Bins",
  "created": "2025-01-01T10:00:00Z",
  "modified": "2025-01-01T12:30:00Z",
  "viewport": {
    "scale": 60,
    "panX": 0,
    "panY": 0
  },
  "surface": {
    "xM": 5.0,
    "yM": 4.0,
    "widthM": 10.0,       // interior width
    "depthM": 8.0,        // interior depth
    "texture": "concrete",
    "wallThicknessM": 0.10  // walls extend outward; exterior = widthM + 2×wall × depthM + 2×wall
  },
  "outside": {
    "texture": "grass"
  },
  "bins": [
    {
      "id": "b1",
      "type": "660L",
      "xM": 6.5,
      "yM": 5.0,
      "rotation": 0
    },
    {
      "id": "b2",
      "type": "240L",
      "xM": 8.2,
      "yM": 5.0,
      "rotation": 90,
      "wasteType": null
    }
  ],
  "doors": [
    {
      "id": "d1",
      "edge": "south",
      "offsetM": 4.0,
      "widthM": 1.2
    }
  ],
  "foliage": [
    { "id": "f1", "type": "tree", "xM": 2.0, "yM": 2.0 },
    { "id": "f2", "type": "bush", "xM": 3.5, "yM": 1.5 }
  ]
}
```

localStorage key: `trashplan_plans` — array of plan objects.
Current plan ID tracked in `trashplan_current`.

---

## Persistence

- Surface position (`xM`, `yM`) refers to the **interior top-left corner**. The wall is drawn outside this rectangle. Bins are placed and constrained relative to the interior bounds.
- Exterior footprint = `(widthM + 2×wallThicknessM)` × `(depthM + 2×wallThicknessM)`

- **Save**: overwrite current plan entry in localStorage, update `modified`
- **Save As**: prompt for name, clone state, push new entry, switch current
- **Auto-save**: debounced ~1 s after any change — overwrites current plan silently
- **Load**: selected from landing screen; loads state into editor
- **Delete**: from landing screen with confirmation modal

---

## Export

- **PNG export**:
  1. Temporarily hide UI overlays (handles, grid, scale indicator)
  2. Call `canvas.toDataURL("image/png")`
  3. Create a temporary `<a>` element, set `href` and `download` attribute to `{planName}.png`, click it
  4. Restore overlays
- **JSON export** (future / nice-to-have): serialize state object, trigger download as `{planName}.json`

---

## Google Maps–Inspired Color Palette

| Element            | Fill        | Stroke / Detail  |
|--------------------|-------------|------------------|
| Grass (outside)    | `#C8E6C9`   | —                |
| Concrete (surface) | `#EEEEEE`   | —                |
| Tiles (surface)    | `#E0E0E0`   | `#BDBDBD` (grid) |
| Asphalt (surface)  | `#757575`   | —                |
| Wall / border      | `#9E9E9E`   | `#616161`        |
| Door gap           | `#C8E6C9`   | `#A5D6A7` dashes |
| Bin (default)      | `#90CAF9`   | `#1565C0`        |
| Tree               | `#388E3C`   | `#1B5E20`        |
| Bush               | `#66BB6A`   | `#2E7D32`        |
| Selection handle   | `#1A73E8`   | `#FFFFFF`        |
| UI chrome / panel  | `#FFFFFF`   | `#E0E0E0`        |
| UI accent          | `#1A73E8`   | —                |

---

## Bin Types Config

Real-world dimensions confirmed. Height is the standing height of the bin — not relevant for the top-down view. Width and depth are the footprint.

```javascript
const BIN_TYPES = {
  // key: { label, widthM, depthM, color, strokeColor, volumeL, suitableFor }
  // Source dimensions in mm converted to meters
  '660L': {
    label: '660 L',
    widthM: 1.255,   // 1255 mm
    depthM: 0.773,   // 773 mm
    color: '#FFCC80',
    strokeColor: '#E65100',
    volumeL: 660,
    suitableFor: ['plastic', 'paper', 'cardboard'],
  },
  '370L': {
    label: '370 L',
    widthM: 0.770,   // 770 mm
    depthM: 0.811,   // 811 mm
    color: '#CE93D8',
    strokeColor: '#6A1B9A',
    volumeL: 370,
    suitableFor: ['metal', 'newspaper', 'catalogs'],
  },
  '370L-glass': {
    label: '370 L Glass',
    widthM: 0.770,   // same footprint as 370L
    depthM: 0.811,
    color: '#80DEEA',
    strokeColor: '#00695C',
    volumeL: 370,
    suitableFor: ['glass'],
    note: 'Requires 3 wheels and flat ground',
  },
  '240L': {
    label: '240 L',
    widthM: 0.580,   // 580 mm
    depthM: 0.724,   // 724 mm
    color: '#A5D6A7',
    strokeColor: '#2E7D32',
    volumeL: 240,
    suitableFor: ['general'],
  },
  '190L': {
    label: '190 L',
    widthM: 0.559,   // 559 mm
    depthM: 0.690,   // 690 mm
    color: '#90CAF9',
    strokeColor: '#1565C0',
    volumeL: 190,
    suitableFor: ['glass'],
    note: 'Standard choice for glass — weight management',
  },
};
```

Each bin is rendered as a rectangle (widthM × depthM at current scale) with:
- A thin line across the top ~15% of the rectangle indicating the lid/handle edge
- The volume label centered in the body
- The assigned waste type icon drawn centered below the label (if set)
- A red/orange outline if the bin is outside the surface boundary

---

## Implementation Order

1. **Scaffolding** — `trash-plan.html`, `trash-plan.css`, `trash-plan.js`; link from `index.html`; add Phosphor Icons CDN link
2. **Landing screen** — load plan list from localStorage, New Plan button, delete with confirm
3. **Canvas setup** — pan, zoom, coordinate system helpers, scale indicator
4. **Outside area rendering** — grass background fill
5. **Surface rendering** — fill + wall border, wall gaps for doors
6. **Surface resize** — drag handles (corners + edge midpoints) + Surface Settings modal
7. **Surface dimension labels** — toggle in sidebar, draw labels on all four edges
8. **Bin type config** — `BIN_TYPES` object, preload Phosphor icon SVGs as `Image` objects on init
9. **Bin rendering** — rect + lid line + label + waste type icon (if set) + out-of-bounds highlight
10. **Bin placement** — click-to-place in Place Bin mode
11. **Bin move / rotate / delete** — Select mode interactions, keyboard shortcuts (R, Del, Esc)
12. **Waste type selection** — selection panel in sidebar, icon grid, assign to selected bin, re-render
13. **Door placement** — click on wall edge to place at minimum 1.2 m width
14. **Door repositioning & width editing** — drag along edge, enforce 1.2 m minimum, select to edit/delete
15. **Tree & bush placement / move / delete**
16. **Measure tool** — two-click line with distance label, third click clears
17. **Texture selection** — surface + outside swatches in sidebar, live re-render
18. **Save / Save As / auto-save**
19. **Load + delete from landing screen**
20. **PNG export** — overlay hide/show (exclude measure line), toDataURL, filename from plan name
21. **Polish** — snap grid toggle, responsive sidebar collapse, final keyboard shortcut pass

---

## Open Questions

- [x] **Bin sizes**: confirmed — see Bin Types Config above
- [x] **Bin constraints**: free movement with out-of-bounds warning (red/orange highlight), no hard block
- [x] **Rotation**: 90° increments only
- [x] **Waste type display**: icon on canvas via Phosphor Icons (no tooltips); assigned via selection panel
- [x] **Wall thickness**: surface dimensions = interior usable space; walls extend outward. Default 0.10 m.
- [ ] **Multi-select**: move/delete multiple objects at once — suggest deferred to later
- [ ] **JSON export**: if added, should it support re-importing a plan from file?