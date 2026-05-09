# Touch Typer UI/UX Redesign — Design Spec

**Date:** 2026-05-09  
**Status:** Approved — ready for implementation

---

## Overview

A comprehensive UI/UX redesign of the Touch Typer Electron desktop app. The goal is a unified design system that makes all features feel cohesive, fixes light mode, resolves cross-platform color inconsistencies, and elevates the keyboard + text as the heroes of the experience.

---

## 1. Design Tokens

All color values live as CSS custom properties in `renderer/src/styles/globals.css` under `:root` (light) and `.dark` (dark). No raw hex values in component files — always reference tokens.

### Dark mode
```css
--tt-bg: #0d0f14
--tt-surface: #13161e
--tt-elevated: #1a1f2e
--tt-border: #242b3d
--tt-text: #e2e8f0
--tt-text-muted: #64748b
--tt-accent: #38bdf8          /* sky-400 */
--tt-accent-glow: rgba(56,189,248,0.12)
```

### Light mode
```css
--tt-bg: #f7f8fc
--tt-surface: #ffffff
--tt-elevated: #eef0f8
--tt-border: #dde1ed
--tt-text: #0f172a
--tt-text-muted: #64748b
--tt-accent: #0ea5e9          /* sky-500 */
--tt-accent-glow: rgba(14,165,233,0.15)
```

Single accent throughout: sky blue. No purple, no indigo, no multi-accent UI.

---

## 2. Navigation

**Topbar only.** No sidebar. The nav bar sits below the titlebar.

### Structure
- Height: 54px
- Background: `--tt-surface` with `border-bottom: 1px solid --tt-border`
- Scroll-triggered `backdrop-blur-md` + subtle border when page scrolls

### Nav items
Each item: icon (16×16) stacked above a 9px uppercase label. Tap target: `px-3 py-1.5`, `rounded-lg`.

| Slot | Icon | Label | Route |
|------|------|-------|-------|
| 1 | bar-chart | Stats | `/stats` |
| 2 | grid/heatmap | Map | `/heatmap` |
| 3 | keyboard | Practice | `/` |
| 4 | code brackets | Code | `/code` |
| 5 | AI/orbit | AI | `/assistant` |
| 6 | star/arena | Arena | `/pvp` |
| — | spacer flex-1 | — | — |
| 7 | gear | Settings | `/settings` |

**Active state:** `text-sky-400 bg-sky-400/10 rounded-lg`  
**Inactive state:** `text-slate-500 dark:text-slate-400` with `hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.04]`  
**Badge:** absolute dot `bg-sky-400` top-right of icon for Arena unread challenges.

No `hover:animate-pulse`. No colored icons for inactive items.

---

## 3. Layout Templates

Three templates cover all pages.

### Template A — Typing (Practice + Code)

Used by: `/` (Practice), `/code`

```
┌─ titlebar (28px) ───────────────────────────┐
├─ nav (54px) ────────────────────────────────┤
├─ stats row (max-w-[660px], mx-auto) ────────┤  ← CPM / accuracy / timer / level
├─ word/code display area ────────────────────┤  ← HERO: keyboard + text
├─ keyboard visualization ────────────────────┤
└─────────────────────────────────────────────┘
```

Stats row is fluid up to 660px. No fixed pixel width.

**Practice page** — minimal changes from current. Word display: `text-slate-400 dark:text-slate-500` (correct), `bg-red-500/20 text-red-400` (error), `bg-amber-400 text-slate-900` (cursor).

**Code page** — same layout but the text area becomes an editor chrome:
- macOS traffic-light dots (decorative, no function)
- Language badge top-right (e.g. `TypeScript`)
- Line numbers column (monospace, muted)
- Tab / Enter hint in the gutter when waiting to start
- Language + difficulty selector bar sits between stats row and editor

### Template B — Analytics (Stats + Heatmap)

Used by: `/stats`, `/heatmap`

```
┌─ titlebar ──────────────────────────────────┐
├─ nav ───────────────────────────────────────┤
├─ page header: large icon + title + subtitle ┤
├─ filter bar: layout selector + time range ──┤
├─ content cards (responsive grid) ───────────┤
└─────────────────────────────────────────────┘
```

Page icon: 52×52px, `rounded-[14px]`, colored bg at 12% opacity.  
Filter bar: keyboard layout pills + 7d / 30d / All time buttons.  
Content cards: `bg-[--tt-surface] border border-[--tt-border] rounded-xl`.

**Stats page content:** top-line stat cards (Best CPM, Avg Accuracy, Sessions) → CPM bar chart → best-per-level grid.  
**Heatmap page content:** most-missed key stat cards → colour-coded keyboard heatmap (red = many errors, amber = some, green = improving) → legend.

### Template C — Feature (Arena, AI, Streak, Settings)

Used by: `/pvp`, `/assistant`, `/streak` (sub-page of Arena nav), `/settings`

Same header pattern as Template B (icon + title + subtitle), then page-specific content below.

---

## 4. Individual Pages

### 4a. Practice (`/`)
- No structural change. Apply token colors only.
- Stats row: max-w-[660px], fluid.
- PvP active banner: sky accent instead of yellow.
- Remove code mode indicator pill (code is now its own nav page).

### 4b. Code (`/code`)
- New dedicated route. Previously a settings toggle on the Practice page.
- Editor chrome: decorative dots, language badge, line numbers, monospace font.
- Language selector: TypeScript / JavaScript / Python / Go / Rust / more.
- Difficulty: Beginner / Intermediate / Advanced.
- Tab/Enter hint shown when not yet started.

### 4c. Stats (`/stats`)
- Template B. Keyboard layout filter + time range filter.
- Top stat cards, CPM chart, per-level breakdown.

### 4d. Heatmap (`/heatmap`)
- Template B. Same filter bar.
- Key error cards, keyboard heatmap visualization, legend.

### 4e. Arena (`/pvp`)
- Template C with emoji page icon ⚔️ and amber accent.
- Tabs: Challenges / Leaderboard / History.
- Challenge rows: avatar, name, word-count/mode/difficulty meta, status badge.
- Status badges: `pending` (amber), `active` (sky), `complete` (muted).
- Win record card + best CPM card in a sidebar column.
- "New Challenge" dashed-border button.

### 4f. AI Assistant (`/assistant`)
- Template C with emoji page icon 🤖 and purple accent bg.
- Two-column layout: chat area (flex-column, messages + input) | sidebar (insight cards + recommendations).
- Chat bubbles: AI = `--tt-elevated` background; user = `sky-400/15` background.
- Sidebar: "This Week" stat, "Focus Keys" badges (color-coded by error severity), recommendation list.

### 4g. Streak (sub-page under Arena nav, `/streak`)
- Template C with emoji page icon 🔥 and orange accent.
- Arena nav item stays active when on `/streak` (it is a sub-destination of Arena).
- Streak hero: flame emoji + large count + day-of-week dots.
- Freeze card: count, ice pill indicators (active = sky, used = muted), "Get more freezes" dashed button.
- Goals list: icon + name + progress bar + percentage.
- Monthly activity mini-grid.

### 4h. Settings (`/settings`)
- Template C with emoji page icon ⚙️.
- Left category nav: Appearance, Keyboard, Practice, Notifications, Account, About.
- Right content panel: grouped rows with `settings-group-title` separators.
- Toggles: sky accent when on (`bg-sky-500`), `bg-slate-200 dark:bg-slate-700` when off.
- Selects: `--tt-elevated` background, `--tt-border` border.
- Accent color is sky blue throughout (single accent per Section 1). The color swatch row in the mockup is a placeholder layout — dynamic accent switching is out of scope for this redesign.

---

## 5. Component Patterns

### Stat cards
```
bg-[--tt-surface] border border-[--tt-border] rounded-xl p-4
```
Large number (font-size 28–52px, font-weight 800), muted label below.

### Toggle
```
width: 38px, height: 22px, border-radius: 11px
on:  bg-sky-500
off: bg-slate-200 dark:bg-slate-700
thumb: white circle, left: 3px (off) / 19px (on), transition 150ms
```

### Dashed action buttons
```
border: 1.5px dashed --tt-border
hover: border-sky-400/40, text-sky-400, bg-sky-400/4
```
Used for "New Challenge", "Get more freezes", etc.

### Status badges
Small pill, `rounded-md`, text 10px uppercase bold:
- pending: `bg-amber-400/15 text-amber-400`
- active: `bg-sky-400/15 text-sky-400`
- complete / muted: `bg-slate-500/12 text-slate-500`

---

## 6. Cross-cutting Concerns

### Light mode
`renderer/src/app/layout.tsx`: non-Mac background must use `bg-slate-100` (light) and `bg-[#0d0f14]` (dark) — not `bg-zinc-300`.

### Icons
FontAwesome Pro only. No inline SVGs in production components. No emoji in nav items.

### Fonts
`system-ui` / `-apple-system` chain for body. Monospace (`font-mono`) for code editor only.

### Animations
No `hover:animate-pulse`. Hover transitions max 150ms. Page-load stagger via `animation-delay` if desired, not required for v1.

### Supabase singleton
No changes to auth plumbing. All existing `getSupabaseClient()` calls unchanged.

### Static export compatibility
`/code` route must be a static page (no dynamic params). Any query-param-driven behaviour wraps inner component in `<Suspense>`.

---

## 7. Files to Create / Modify

| Action | File |
|--------|------|
| Modify | `renderer/src/styles/globals.css` — design tokens (already done in prototype) |
| Modify | `renderer/src/app/layout.tsx` — light mode background fix (already done) |
| Modify | `renderer/src/components/Menu/index.tsx` — nav rewrite (already done) |
| Modify | `renderer/src/components/Tracker/index.tsx` — token colors, stats width, editor chrome, accuracy bug fix (already done) |
| **Create** | `renderer/src/app/code/page.tsx` — new Code route |
| Modify | `renderer/src/app/stats/page.tsx` — Template B header + filter bar |
| Modify | `renderer/src/app/heatmap/page.tsx` — Template B header + filter bar |
| Modify | `renderer/src/components/PvP/PvPHub.tsx` — Template C header, sky tabs (already done) |
| Modify | `renderer/src/app/assistant/page.tsx` — Template C header, dark mode fix (already done) |
| Modify | `renderer/src/app/pvp/streak/page.tsx` (or create) — Streak page with Template C |
| Modify | `renderer/src/components/settings/settings.tsx` — token colors, sky toggles (already done) |

---

## 8. Out of Scope

- New features (new game modes, new languages, new leaderboard logic)
- Backend / edge function changes
- Electron main process changes
- Marketing website (`touch-typer.kochie.io`)
- Notification system changes
- IAP / Stripe flow changes
