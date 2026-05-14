# Stats Row Redesign — Pill Strip

**Date:** 2026-05-11
**Status:** Approved

## Problem

The current stats row (Typos / Char/Min / Accuracy) uses three tall vertical cards stacked side-by-side. This causes three issues:

1. **Multilingual app** — text labels ("TYPOS", "CHAR/MIN", "ACCURACY") are language-specific and carry disproportionate visual weight. Icons should be the primary identifier.
2. **Readability** — the vertical stacking (icon → number → label → delta) spreads information over too much height and creates a weak visual hierarchy.
3. **Vertical space** — the tall cards consume significant vertical real estate above the keyboard, contributing to the window feeling cramped.

## Design

Replace the three separate cards with a single unified **pill strip** — one connected bar with a shared background and thin dividers between sections.

### Layout

```
┌────────────────────────────────────────────────────┐
│  ⚔   3   +3        🏃  214  +83       ％  94  −2.7% │
│       typos              char/min          accuracy │
└────────────────────────────────────────────────────┘
```

- **Width:** Fixed `620px`, centered independently of the text area.
- **Height:** Compact — ~52px total (12px vertical padding each side).
- **Sections:** Three equal thirds (`flex: 1`), separated by `1px` dividers at `rgba(255,255,255,0.07)`.
- **Section layout:** Icon + number side-by-side, with a small right column stacking delta above unit label.

### Per-section anatomy

| Element | Size | Color |
|---|---|---|
| Icon (FontAwesome) | `text-lg` (18px) | `text-slate-600` |
| Number | `text-3xl` bold, monospace | `text-slate-100` |
| Delta | `text-[11px]` bold | green (`#4ade80`) / red (`#f87171`) |
| Unit label | `text-[9px]` uppercase, tracked | `text-gray-800` (very low contrast) |

### Two states

**Resting** (between rounds): delta text is rendered but `invisible` so the pill height never shifts when the delta appears.

**Post-round** (`showChange === true`): delta becomes visible and colour-coded — red for typos increase or accuracy drop, green for speed increase or typos decrease. This matches the existing `showChange` logic already in `Tracker/index.tsx`.

### Behaviour preserved

- PvP banner still renders above the pill when `currentRace` is active.
- Code mode replaces the dungeon icon with the code icon (existing `effectiveCodeMode` switch).
- No changes to delta calculation logic — only the presentation layer changes.

## Files to change

| File | Change |
|---|---|
| `renderer/src/components/Tracker/index.tsx` | Replace the stats `<div>` (lines ~476–548) with the pill strip JSX |

No new components needed — the pill strip is simple enough to live inline in `Tracker`.
