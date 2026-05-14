# Application Language (UI i18n) — Design Spec

**Date:** 2026-05-11  
**Status:** Approved  

---

## Overview

Add an "Application Language" setting that translates the Touch Typer UI into the 8 languages already supported for typing practice (English, French, German, Spanish, Māori, Italian, Portuguese BR, Dutch). A companion "Auto-detect Language" toggle uses the system locale on first launch to pick the best match automatically.

---

## 1. Settings model

### New fields in `defaultSettings` (`renderer/src/lib/settings_hook.tsx`)

| Field | Type | Default | Persisted |
|---|---|---|---|
| `appLanguage` | `Languages` | `Languages.ENGLISH` | Supabase + localStorage |
| `autoDetectAppLanguage` | `boolean` | `true` | localStorage only (machine-specific) |

### Reducer actions

```ts
| { type: "SET_APP_LANGUAGE"; appLanguage: Languages }
| { type: "SET_AUTO_DETECT_APP_LANGUAGE"; enabled: boolean }
```

### No internal rename of existing `language` field

The existing `language` field (typing practice word set) is **not renamed internally**. Only its UI label changes from "Language" to "Practice Language" in `settings.tsx`. Renaming the internal key would require a DB migration and break localStorage serialisation.

---

## 2. i18next integration

### Dependencies

```
i18next
react-i18next
```

### Initialisation — `renderer/src/lib/i18n.ts`

- Configured before the React tree mounts (imported in `renderer/src/app/layout.tsx`)
- `fallbackLng: 'en'` — any missing key silently falls back to English
- All 8 translation namespaces bundled at build time (no lazy loading — Electron desktop, bundle size is not a constraint)
- Single namespace: `common`

### Language switching

`SettingsProvider` in `settings_hook.tsx` adds a `useEffect` watching `settings.appLanguage`:

```ts
useEffect(() => {
  i18n.changeLanguage(settings.appLanguage);
}, [settings.appLanguage]);
```

No page reload required — `react-i18next` triggers a full re-render of all `useTranslation()` consumers.

### Translation file layout

```
renderer/src/locales/
  en/common.json
  fr/common.json
  de/common.json
  es/common.json
  mi/common.json
  it/common.json
  pt-br/common.json
  nl/common.json
```

Strings are namespaced by feature area, e.g.:
```json
{
  "settings": {
    "title": "Settings",
    "appearance": "Appearance",
    "theme": "Theme",
    "appLanguage": "Application Language",
    "autoDetect": "Auto-detect Language",
    ...
  },
  "nav": { ... },
  "practice": { ... }
}
```

---

## 3. System locale detection

### New Electron bridge method

`electron-src/preload.ts` exposes `getSystemLocale(): string` which calls `app.getLocale()` from the main process via IPC.

### Detection helper — `renderer/src/lib/locale-detect.ts`

```ts
// Maps BCP 47 locale strings → Languages enum
// "fr", "fr-FR", "fr-CA" → Languages.FRENCH
// Unmatched locales → Languages.ENGLISH
export function detectAppLanguage(): Languages
```

Uses `window.electronAPI?.getSystemLocale?.()` with `navigator.language` as fallback (for `pnpm dev:next` renderer-only mode).

### Detection trigger

In `SettingsProvider`, after loading settings from localStorage:

```
if (autoDetectAppLanguage && no explicit appLanguage saved) {
  appLanguage = detectAppLanguage()
}
```

When `autoDetectAppLanguage` is toggled back on, `detectAppLanguage()` is called immediately and `appLanguage` is updated.

---

## 4. Settings UI (`renderer/src/components/settings/settings.tsx`)

### Change 1 — Rename label in `KeyboardSettingsPanel`

```diff
- <Label>Language</Label>
- <Description>Choose the language of the words to type.</Description>
+ <Label>Practice Language</Label>
+ <Description>Choose the language of the words to type.</Description>
```

### Change 2 — New controls in `AppearanceSettings`

Below the Theme dropdown, add (in order):

```
Application Language     [ English ▼ ]
  Choose the language of the app interface.
  (dropdown disabled + dimmed when auto-detect is on)

Auto-detect Language     [toggle]
  Automatically set the app language from your system locale.
```

Uses the identical `<Field>` + `<Select>` / `<Switch>` pattern already present in `AppearanceSettings`. When `autoDetectAppLanguage` is `true`, the dropdown receives `disabled` and opacity styling.

---

## 5. Database schema

### Migration (`touch-type-backend/supabase/migrations/<timestamp>_add_app_language.sql`)

```sql
ALTER TABLE settings
  ADD COLUMN app_language text DEFAULT 'en';
```

`auto_detect_app_language` is **not added to the DB** (machine-specific, lives in localStorage only, same treatment as `launchAtStartup`).

### `settings_hook.tsx` sync updates

**`fetchSettings`:**
```ts
appLanguage: (data.app_language as Languages) ?? Languages.ENGLISH,
```

**`saveSettings`:**
```ts
app_language: safeSettings.appLanguage,
```

After migration, regenerate types:
```bash
cd touch-type-backend
supabase gen types typescript --local > ../touch-type/renderer/src/types/supabase.ts
```

---

## 6. Files to create / modify

| File | Action |
|---|---|
| `touch-type-backend/supabase/migrations/<ts>_add_app_language.sql` | Create |
| `touch-type/renderer/src/lib/i18n.ts` | Create |
| `touch-type/renderer/src/lib/locale-detect.ts` | Create |
| `touch-type/renderer/src/locales/{en,fr,de,es,mi,it,pt-br,nl}/common.json` | Create (8 files) |
| `touch-type/renderer/src/lib/settings_hook.tsx` | Modify |
| `touch-type/renderer/src/components/settings/settings.tsx` | Modify |
| `touch-type/renderer/src/app/layout.tsx` | Modify (import i18n) |
| `touch-type/electron-src/preload.ts` | Modify (add `getSystemLocale`) |
| `touch-type/renderer/src/types/supabase.ts` | Regenerate |
| `touch-type/package.json` | Add i18next + react-i18next |

---

## 7. Out of scope

- Translating the marketing website (`touch-typer.kochie.io/`) — separate project
- Translating error messages from Supabase edge functions
- Right-to-left (RTL) language support
- Crowdsourced / user-contributed translations
- Lazy-loading translation bundles per locale
