# Languages & Keyboard Layouts Expansion — Design Spec

**Date:** 2026-05-11
**Status:** Approved — ready for implementation

---

## Overview

Add 3 new word-set languages (Italian, Portuguese BR, Dutch), 5 new keyboard layouts (Colemak-DH, UK QWERTY, Nordic SE, ABNT2, Italian QWERTY), and a preferred-keyboard suggestion system that nudges users to switch layouts when they change language.

Japanese, Korean, and Arabic are explicitly out of scope for this spec (romaji/RTL complexity deferred to a future spec).

---

## 1. New Languages

Three new entries added to the `Languages` enum in `renderer/src/lib/settings_hook.tsx` and the `languages` display array (moving to the new shared module — see Section 3):

| Enum key | Value | Wordset file | Notes |
|---|---|---|---|
| `ITALIAN` | `"it"` | `wordsets/it.txt` | Frequency-based Italian word list |
| `PORTUGUESE_BR` | `"pt-br"` | `wordsets/pt-br.txt` | Brazilian Portuguese; European PT is a future add |
| `DUTCH` | `"nl"` | `wordsets/nl.txt` | Covers Netherlands + Belgium (Flemish) |

Wordset files follow the existing convention: one word per line, filename = enum value + `.txt`. The Electron main-process `handleWordSet` handler reads `wordsets/${language}.txt` — no changes required to the IPC handler.

---

## 2. New Keyboard Layouts

Five new entries added to `KeyboardLayoutNames` enum in `renderer/src/keyboards/index.ts`, with a corresponding layout file, level regexes, and word-provider mapping each.

| Enum key | Layout file | Levels strategy |
|---|---|---|
| `MACOS_US_COLEMAK_DH` | `renderer/src/keyboards/COLEMAK_DH.ts` | Adapts existing Colemak levels — D/H positions differ from centre column |
| `MACOS_GB_QWERTY` | `renderer/src/keyboards/GB_QWERTY.ts` | Reuses QWERTY level regexes; extra ISO key (\\|) introduced at level 3 |
| `MACOS_SE_NORDIC` | `renderer/src/keyboards/SE_NORDIC.ts` | QWERTY base; Å/Ä/Ö unlocked at level 4+ |
| `MACOS_BR_ABNT2` | `renderer/src/keyboards/BR_ABNT2.ts` | QWERTY base; Ç and dead-accent chars unlocked at level 4+ |
| `MACOS_IT_QWERTY` | `renderer/src/keyboards/IT_QWERTY.ts` | QWERTY base; à/è/ì/ò/ù unlocked at level 4+ |

### Layout file format

Each file exports a `KeyboardLayout` (2D array of `Key` objects) following the pattern of existing layout files such as `EN_QWERTY.ts`. Special/accent keys use the `Key` class's secondary-character slot.

### Level regexes

Six level regexes defined per layout in `renderer/src/lib/levels.ts` (`LEVEL_1_<NAME>` … `LEVEL_6_<NAME>`). Added to the `regExpMap` in `renderer/src/lib/word-provider.tsx`:

- **Colemak-DH**: same character set as Colemak, different key positions — reuse Colemak character regexes verbatim, keyed under the new enum value.
- **UK QWERTY**: same character set as US QWERTY — reuse QWERTY regexes.
- **Nordic SE**: levels 1–3 identical to QWERTY; levels 4–6 progressively add Å, then Ä, then Ö.
- **ABNT2**: levels 1–3 identical to QWERTY; level 4 adds Ç; levels 5–6 add remaining accented vowels (á, â, ã, é, ê, í, ó, ô, õ, ú, ü).
- **IT QWERTY**: levels 1–3 identical to QWERTY; levels 4–6 add à, è, ì, ò, ù progressively.

### KeyboardSelect registration

Both `renderer/src/components/KeyboardSelect/index.tsx` and `renderer/src/components/KeyboardHeatmapSelect/index.tsx` maintain a `keyboards` display array. The shared `languages.ts` module (Section 3) also exports this array so there is a single source of truth. Each new entry:

```ts
{ name: "MAC COLEMAK-DH",          layout: KeyboardLayoutNames.MACOS_US_COLEMAK_DH, country: "🇺🇸" },
{ name: "MAC QWERTY (British)",     layout: KeyboardLayoutNames.MACOS_GB_QWERTY,     country: "🇬🇧" },
{ name: "MAC NORDIC (Swedish)",     layout: KeyboardLayoutNames.MACOS_SE_NORDIC,     country: "🇸🇪" },
{ name: "MAC ABNT2 (Portuguese)",   layout: KeyboardLayoutNames.MACOS_BR_ABNT2,      country: "🇧🇷" },
{ name: "MAC QWERTY (Italian)",     layout: KeyboardLayoutNames.MACOS_IT_QWERTY,     country: "🇮🇹" },
```

Stats and heatmap keyboard filter dropdowns iterate over this array and will pick up the new entries automatically.

Note: the keyboards display array stays in `KeyboardSelect/index.tsx` (and `KeyboardHeatmapSelect` imports from there). It does NOT move to `languages.ts` — doing so would create a circular import chain (`languages.ts` → `keyboards/index.ts` → `settings_hook.tsx`).

---

## 3. Shared `languages.ts` Module

Currently the `languages` display array is defined inline in `renderer/src/components/settings/settings.tsx` and referenced in `renderer/src/components/Menu/index.tsx`. This spec consolidates it into a new shared module so the suggestion logic can import it without circular dependencies.

**New file:** `renderer/src/lib/languages.ts`

```ts
import { KeyboardLayoutNames } from "@/keyboards";
import { Languages } from "@/lib/settings_hook";

export interface LanguageEntry {
  value: Languages;
  label: string;
  preferredKeyboards: KeyboardLayoutNames[]; // first entry = primary recommendation
}

export const LANGUAGES: LanguageEntry[] = [
  {
    value: Languages.ENGLISH,
    label: "English",
    preferredKeyboards: [
      KeyboardLayoutNames.MACOS_US_QWERTY,
      KeyboardLayoutNames.MACOS_GB_QWERTY,
      KeyboardLayoutNames.MACOS_US_COLEMAK,
      KeyboardLayoutNames.MACOS_US_COLEMAK_DH,
      KeyboardLayoutNames.MACOS_US_DVORAK,
    ],
  },
  {
    value: Languages.FRENCH,
    label: "French",
    preferredKeyboards: [KeyboardLayoutNames.MACOS_FR_AZERTY],
  },
  {
    value: Languages.GERMAN,
    label: "German",
    preferredKeyboards: [KeyboardLayoutNames.MACOS_DE_QWERTZ],
  },
  {
    value: Languages.SPANISH,
    label: "Spanish",
    preferredKeyboards: [KeyboardLayoutNames.MACOS_ES_QWERTY],
  },
  {
    value: Languages.MAORI,
    label: "Māori",
    preferredKeyboards: [KeyboardLayoutNames.MACOS_NZ_QWERTY],
  },
  {
    value: Languages.ITALIAN,
    label: "Italian",
    preferredKeyboards: [KeyboardLayoutNames.MACOS_IT_QWERTY],
  },
  {
    value: Languages.PORTUGUESE_BR,
    label: "Portuguese (Brazil)",
    preferredKeyboards: [KeyboardLayoutNames.MACOS_BR_ABNT2],
  },
  {
    value: Languages.DUTCH,
    label: "Dutch",
    preferredKeyboards: [
      KeyboardLayoutNames.MACOS_US_QWERTY,
      KeyboardLayoutNames.MACOS_GB_QWERTY,
    ],
  },
];
```

Existing consumers of the inline `languages` array in `settings.tsx` and `Menu/index.tsx` are updated to import `LANGUAGES` from this module instead.

---

## 4. Preferred-Keyboard Suggestion

### Settings state addition

One new field in the settings reducer (`renderer/src/lib/settings_hook.tsx`):

```ts
dismissedKeyboardSuggestions: Languages[] // languages for which the suggestion has been dismissed
```

Default: `[]`. Persisted to `localStorage` and the Supabase `settings` table (new column: `dismissed_keyboard_suggestions jsonb default '[]'`).

New dispatch action:
- `DISMISS_KEYBOARD_SUGGESTION: { language: Languages }` — adds language to the dismissed list

When the user accepts the suggestion, the UI dispatches two existing/new actions in sequence: first `CHANGE_KEYBOARD` (already exists), then `DISMISS_KEYBOARD_SUGGESTION`. No combined action needed.

### Suggestion logic

The suggestion is shown in the Settings panel (Practice & Code category, next to the language selector) when **all** of the following are true:

1. The current `settings.language` has a non-empty `preferredKeyboards` list
2. `settings.keyboardName` is not in that list
3. `settings.language` is not in `dismissedKeyboardSuggestions`

When the user changes language via `CHANGE_LANGUAGE`, the dismissed state for the **previous** language is left untouched. The suggestion evaluates against the new language immediately.

If the user later manually switches to a preferred keyboard for a previously dismissed language, the language is removed from `dismissedKeyboardSuggestions` (so the hint can reappear if they switch away again).

### Suggestion UI

A slim banner rendered inside the Practice & Code settings panel, directly below the language selector:

```
┌─────────────────────────────────────────────────────────────┐
│ Italian types best with the Italian keyboard.               │
│    [Switch to IT QWERTY]          [Dismiss]                 │
└─────────────────────────────────────────────────────────────┘
```

- Background: `bg-sky-400/8 border border-sky-400/20 rounded-lg`
- "Switch" button: `text-sky-400 font-semibold` — dispatches `ACCEPT_KEYBOARD_SUGGESTION`
- "Dismiss" button: `text-slate-400` — dispatches `DISMISS_KEYBOARD_SUGGESTION`
- The suggestion is not shown outside of the Settings panel (no global toast, no mid-session interruption)

---

## 5. Files to Create / Modify

| Action | File | What changes |
|---|---|---|
| Create | `wordsets/it.txt` | Italian word list |
| Create | `wordsets/pt-br.txt` | Brazilian Portuguese word list |
| Create | `wordsets/nl.txt` | Dutch word list |
| Create | `renderer/src/keyboards/COLEMAK_DH.ts` | Colemak-DH layout definition |
| Create | `renderer/src/keyboards/GB_QWERTY.ts` | UK QWERTY layout definition |
| Create | `renderer/src/keyboards/SE_NORDIC.ts` | Swedish Nordic layout definition |
| Create | `renderer/src/keyboards/BR_ABNT2.ts` | Brazilian ABNT2 layout definition |
| Create | `renderer/src/keyboards/IT_QWERTY.ts` | Italian QWERTY layout definition |
| Create | `renderer/src/lib/languages.ts` | Shared language metadata with preferredKeyboards |
| Modify | `renderer/src/keyboards/index.ts` | Add 5 new enum values, imports, lookupKeyboard cases |
| Modify | `renderer/src/lib/settings_hook.tsx` | Add 3 new Languages enum values, new settings field, 2 new dispatch actions |
| Modify | `renderer/src/lib/levels.ts` | Add level regexes for 5 new layouts |
| Modify | `renderer/src/lib/word-provider.tsx` | Add 5 new keyboard entries to regExpMap |
| Modify | `renderer/src/components/KeyboardSelect/index.tsx` | Add 5 new keyboards to display array; import from languages.ts |
| Modify | `renderer/src/components/KeyboardHeatmapSelect/index.tsx` | Add 5 new keyboards to display array |
| Modify | `renderer/src/components/settings/settings.tsx` | Import LANGUAGES from languages.ts; add suggestion banner to Practice & Code panel |
| Modify | `renderer/src/components/Menu/index.tsx` | Import LANGUAGES from languages.ts instead of inline array |

---

## 6. Out of Scope

- Japanese romaji mode
- Korean romaji mode
- Arabic (RTL rendering)
- European Portuguese (separate wordset from Brazilian)
- Norwegian / Danish layout variants (future Nordic additions)
- Supabase migration for `dismissed_keyboard_suggestions` column (settings sync for the new field can be added in a follow-up; localStorage persistence is sufficient for v1)
