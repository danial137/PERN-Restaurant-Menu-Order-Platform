# Figma handoff — editable import-ready assets

The project includes **design/persian-food-figma-import.svg**: vector-based desktop, mobile and QR artboards which can be **imported into Figma** as SVG. Figma imports SVG as editable vector layers; this is not a native `.fig` file and does not automatically instantiate Figma Auto Layout or component variants.

1. Open a new Figma design file.
2. Drag and drop the SVG from `/design` onto the canvas.
3. Ungroup artboards as needed. Create native Figma frames and auto-layout based on these dimensions.
4. Use `design/tokens.json` for palette, typography, spacing and border radii.
5. The six illustrations under `apps/web/public/illustrations` are original editable SVGs; drag into Figma separately.

## Artboard checklist

- Desktop landing + product grid (1440 × 900 conceptual composition)
- Mobile menu (390 × 844)
- Restaurant table QR sticker (360 × 520)
- Black/white/off-white palette, hand-drawn strokes, manga halftone textures
- Typography: Vazirmatn RTL and DM Sans Latin; use fallback if unavailable
- Touch targets at least 44px recommended

**No direct edit was made in a Figma account.** Integration was unavailable in this environment. The SVG and design tokens are intended as portable handoff source.
