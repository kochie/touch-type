# AIATSIS Indigenous Language Map — Design Spec

## Goal

Add a dedicated "Languages" tab to Touch Typer's settings that displays the AIATSIS Map of Indigenous Australia, allowing users to select an Aboriginal language group and practice typing in that language.

This feature requires permission from AIATSIS to use the map boundary data. This spec describes the full intended design; implementation is gated on receiving that permission.

---

## Context

Touch Typer is a cross-platform Electron desktop app (Next.js renderer, static export, served offline via `electron-serve`). Settings are managed via a React context/reducer (`SettingsContext`, `DispatchContext` in `renderer/src/lib/settings_hook.tsx`). Language selection already exists via a `Languages` enum; wordsets are plain `.txt` files under `wordsets/`.

The app is offline-capable — all data must be bundled at install time. No runtime network requests to external map APIs.

---

## Design Decisions

### 1. Settings tab placement

A new **"Languages" tab** appears in the settings panel when the user's active language is set to `ABORIGINAL`. It sits alongside the existing General / Keyboard / Account tabs.

- Does not appear for other language selections (not globally visible)
- Tab label: `🗺 Languages`
- Implemented as a new tab in the existing settings tab switcher

### 2. Map scope — full AIATSIS coverage, locked groups

All ~300 AIATSIS language group regions are rendered on the map.

- Groups **with a wordset** are clickable and show a highlighted border on hover
- Groups **without a wordset** are dimmed, still clickable, but show "coming soon" state instead of a practice button
- This approach is chosen over a curated subset because:
  - It shows AIATSIS the full scope of intended use (strongest permission case)
  - It acknowledges every language group rather than implying only some exist
  - It is honest about what data is and isn't available yet

### 3. Map rendering

SVG-based, bundled locally. The AIATSIS GeoJSON boundary data (if permission is granted) will be pre-processed into an optimised SVG file at build time and bundled into the renderer. No runtime map tile fetching.

The SVG is rendered inside a React component (`AustraliaLanguageMap`) with click handlers per region `<path>`. Pan/zoom is out of scope for v1.

### 4. Interaction model — bidirectional

Selecting a language group via **either** the map or the dropdown updates both:

- Clicking a map region → sets the dropdown value + highlights region
- Choosing from the dropdown → highlights the corresponding region on the map

The selected region is highlighted in amber (`#f5a623`, matching the app's accent colour).

### 5. Language group info panel

When a group is selected, a panel to the right of the map shows:

| Field | Source |
|---|---|
| Name (and alternate name) | Language group metadata JSON |
| Region / state | Metadata |
| Approximate speaker count | Metadata |
| Language family | Metadata |
| Word count | Derived from wordset file size |

### 6. Wordset state

**Group with wordset:**
- Shows word count ("380 words available")
- Shows a `Start Practice →` button that sets this group as the active practice language

**Group without wordset:**
- Shows "No word set yet"
- Shows locked badge: `🔒 Word set coming soon`
- No practice button — the user cannot enter a broken practice state

### 7. Attribution

AIATSIS attribution is displayed **below the map in every state**, unconditionally:

> Map data © AIATSIS 2022. [aiatsis.gov.au/explore/map-indigenous-australia](https://aiatsis.gov.au/explore/map-indigenous-australia)

This is non-negotiable — it must appear on every render of the map component, not just on first load.

### 8. Wordset file structure

```
wordsets/
  aboriginal/
    warlpiri.txt
    yolngu-matha.txt
    ...
```

One file per language group, one word per line. Group IDs are lowercase, hyphenated slugs matching the `languageGroupId` field in the metadata JSON.

### 9. Settings state changes

New field added to the settings object:

```ts
aboriginalLanguageGroup: string | null  // e.g. "warlpiri", null if none selected
```

New dispatch action:

```ts
{ type: "CHANGE_ABORIGINAL_LANGUAGE_GROUP"; groupId: string | null }
```

The active wordset for practice is derived from this field when `language === Languages.ABORIGINAL`.

---

## Component Architecture

```
renderer/src/
  app/settings/page.tsx              — add Languages tab (conditional on language)
  components/
    AustraliaLanguageMap/
      index.tsx                      — SVG map + region click handlers
      regions.ts                     — typed region list with metadata + wordset status
    AboriginalLanguagePanel/
      index.tsx                      — right-side info panel (group name, meta, CTA)
    AboriginalLanguageSelect/
      index.tsx                      — dropdown (reuses Listbox pattern from KeyboardSelect)
  lib/
    aboriginal-languages.ts          — language group metadata + wordset availability lookup
  keyboards/
    (no changes — Aboriginal practice uses existing QWERTY layout)
wordsets/
  aboriginal/
    {group-id}.txt                   — one file per available language group
data/
  aiatsis-regions.svg                — pre-processed SVG from AIATSIS GeoJSON (post-permission)
  aboriginal-language-groups.json    — metadata: id, name, altName, state, speakers, family
```

---

## Data dependencies (gated on AIATSIS permission)

1. **`aiatsis-regions.svg`** — derived from the AIATSIS GeoJSON boundary file. Each region becomes a `<path id="region-{groupId}">` element. Processing: simplify/optimise with `mapshaper`, export to SVG.

2. **`aboriginal-language-groups.json`** — metadata compiled from AIATSIS and supplementary sources (Wikipedia, AIATSIS catalogue). Fields: `id`, `name`, `altName`, `state`, `approximateSpeakers`, `languageFamily`, `wordsetFile` (null if no wordset).

3. **Wordset `.txt` files** — to be sourced from AIATSIS, CHIRILA (with permission), or community contribution. Each file: one word per line, UTF-8, lowercase preferred.

---

## Out of scope (v1)

- Map zoom / pan
- Community wordset contribution flow
- Speaker-count or region data editing by users
- Any language group data fetched at runtime
- Languages other than Aboriginal Australian in this tab

---

## Permission request context

The mockup generated during brainstorming (`.superpowers/brainstorm/…/content/full-mockup.html`) shows both UI states (group with wordset, group locked) and includes the technical implementation note for AIATSIS:

> The map boundary data would be stored locally within the app (bundled at install time, not fetched from a server). The data would be credited on every screen where it appears, and no modification to the boundary data would be made. The app would not re-distribute the map data as a standalone file — it is embedded solely to render the interactive region selector.
