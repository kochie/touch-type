# Languages & Keyboard Layouts Expansion — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Italian, Portuguese (BR), and Dutch word sets, five new keyboard layouts (Colemak-DH, UK QWERTY, Nordic SE, ABNT2, IT QWERTY), a shared `languages.ts` module with preferred-keyboard metadata, and a dismissible suggestion banner in Settings.

**Architecture:** Tasks 1–6 are pure data additions (enum values, layout files, level regexes, word-provider mappings). Task 7 consolidates the languages display array into a shared module and wires up preferred-keyboard metadata. Task 8 registers new layouts in the selector UI. Task 9 adds the suggestion state and banner. Each task is independent except Task 7 (requires Tasks 1–6 complete) and Tasks 8–9 (require Task 7 complete).

**Tech Stack:** TypeScript, Next.js App Router (static export), Tailwind CSS v4, React context/reducer, `clsx`

---

## File Map

| Action | File | What changes |
|---|---|---|
| Create | `wordsets/it.txt` | Italian frequency word list |
| Create | `wordsets/pt-br.txt` | Brazilian Portuguese frequency word list |
| Create | `wordsets/nl.txt` | Dutch frequency word list |
| Modify | `renderer/src/lib/settings_hook.tsx` | Add ITALIAN, PORTUGUESE_BR, DUTCH to Languages enum; add dismissedKeyboardSuggestions state + actions |
| Create | `renderer/src/keyboards/COLEMAK_DH.ts` | Colemak-DH layout |
| Create | `renderer/src/keyboards/GB_QWERTY.ts` | UK ISO QWERTY layout |
| Create | `renderer/src/keyboards/SE_NORDIC.ts` | Swedish Nordic layout |
| Create | `renderer/src/keyboards/BR_ABNT2.ts` | Brazilian ABNT2 layout |
| Create | `renderer/src/keyboards/IT_QWERTY.ts` | Italian QWERTY layout |
| Modify | `renderer/src/keyboards/index.ts` | Add 5 new enum values, imports, lookupKeyboard cases |
| Modify | `renderer/src/lib/levels.ts` | Add 6 level regexes per new layout (30 total new regexes) |
| Modify | `renderer/src/lib/word-provider.tsx` | Add 5 new keyboard entries to regExpMap |
| Create | `renderer/src/lib/languages.ts` | LanguageEntry interface + LANGUAGES array with preferredKeyboards |
| Modify | `renderer/src/components/settings/settings.tsx` | Import LANGUAGES; add suggestion banner to PracticeSettingsPanel |
| Modify | `renderer/src/components/Menu/index.tsx` | Import LANGUAGES from languages.ts |
| Modify | `renderer/src/components/KeyboardSelect/index.tsx` | Add 5 new entries to keyboards array |
| Modify | `renderer/src/components/KeyboardHeatmapSelect/index.tsx` | Add 5 new entries to keyboards array |

---

## Task 1: Language Enum Entries + Wordset Files

**Files:**
- Modify: `renderer/src/lib/settings_hook.tsx:41-47`
- Create: `wordsets/it.txt`
- Create: `wordsets/pt-br.txt`
- Create: `wordsets/nl.txt`

- [ ] **Step 1: Add three new values to the Languages enum**

In `renderer/src/lib/settings_hook.tsx`, replace the Languages enum (lines 41–47):

```ts
export enum Languages {
  ENGLISH = "en",
  FRENCH = "fr",
  GERMAN = "de",
  SPANISH = "es",
  MAORI = "mi",
  ITALIAN = "it",
  PORTUGUESE_BR = "pt-br",
  DUTCH = "nl",
}
```

- [ ] **Step 2: Download and process the Italian word list**

```bash
curl -sL "https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/it/it_50k.txt" \
  | awk '{print $1}' \
  | grep -E '^[a-zA-ZàáâãèéêìíîïòóôùúûäöüÀÁÂÃÈÉÊÌÍÎÏÒÓÔÙÚÛÄÖÜ]+$' \
  > /Users/kochie/projects/touch-typer/touch-type/wordsets/it.txt
wc -l /Users/kochie/projects/touch-typer/touch-type/wordsets/it.txt
```

Expected: 40,000–50,000 lines.

- [ ] **Step 3: Download and process the Brazilian Portuguese word list**

```bash
curl -sL "https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/pt_br/pt_br_50k.txt" \
  | awk '{print $1}' \
  | grep -E '^[a-zA-ZàáâãçèéêìíîïòóôùúûäöüÀÁÂÃÇÈÉÊÌÍÎÏÒÓÔÙÚÛÄÖÜ]+$' \
  > /Users/kochie/projects/touch-typer/touch-type/wordsets/pt-br.txt
wc -l /Users/kochie/projects/touch-typer/touch-type/wordsets/pt-br.txt
```

Expected: 40,000–50,000 lines.

- [ ] **Step 4: Download and process the Dutch word list**

```bash
curl -sL "https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/nl/nl_50k.txt" \
  | awk '{print $1}' \
  | grep -E '^[a-zA-ZàáâãèéêìíîïòóôùúûäöüÀÁÂÃÈÉÊÌÍÎÏÒÓÔÙÚÛÄÖÜ]+$' \
  > /Users/kochie/projects/touch-typer/touch-type/wordsets/nl.txt
wc -l /Users/kochie/projects/touch-typer/touch-type/wordsets/nl.txt
```

Expected: 40,000–50,000 lines.

- [ ] **Step 5: Type-check**

```bash
cd /Users/kochie/projects/touch-typer/touch-type && pnpm type-check
```

Expected: no new errors (pre-existing errors in pvp-provider.tsx and result-provider.tsx are unrelated).

- [ ] **Step 6: Commit**

```bash
cd /Users/kochie/projects/touch-typer/touch-type && \
  git add renderer/src/lib/settings_hook.tsx wordsets/it.txt wordsets/pt-br.txt wordsets/nl.txt && \
  git commit -m "feat(i18n): add Italian, Portuguese BR, Dutch languages and wordsets"
```

---

## Task 2: Colemak-DH Keyboard Layout

Colemak-DH moves D and H out of the centre columns to more ergonomic positions. Changes from standard Colemak: top row pos 5 G→B; home row pos 5 D→G, pos 6 H→M; bottom row pos 4 V→D, pos 5 B→V, pos 7 M→H.

**Files:**
- Create: `renderer/src/keyboards/COLEMAK_DH.ts`
- Modify: `renderer/src/keyboards/index.ts`
- Modify: `renderer/src/lib/levels.ts`
- Modify: `renderer/src/lib/word-provider.tsx`

- [ ] **Step 1: Create the Colemak-DH layout file**

Create `renderer/src/keyboards/COLEMAK_DH.ts`:

```ts
import { Key } from "@/keyboards/key";
import { KeyboardLayout } from ".";

export const MACOS_US_COLEMAK_DH: KeyboardLayout = [
  [
    new Key("`", { secondaryKey: "~" }),
    new Key("1", { secondaryKey: "!" }),
    new Key("2", { secondaryKey: "@" }),
    new Key("3", { secondaryKey: "#" }),
    new Key("4", { secondaryKey: "$" }),
    new Key("5", { secondaryKey: "%" }),
    new Key("6", { secondaryKey: "^" }),
    new Key("7", { secondaryKey: "&" }),
    new Key("8", { secondaryKey: "*" }),
    new Key("9", { secondaryKey: "(" }),
    new Key("0", { secondaryKey: ")" }),
    new Key("-", { secondaryKey: "_" }),
    new Key("=", { secondaryKey: "+" }),
    new Key("Backspace", { position: ["bottom", "right"], width: 120, inert: true }, "delete"),
  ],
  [
    new Key("Tab", { position: ["bottom", "left"], width: 120, inert: true }, "tab"),
    new Key("q", {}, "Q"),
    new Key("w", {}, "W"),
    new Key("f", {}, "F"),
    new Key("p", {}, "P"),
    new Key("b", {}, "B"),
    new Key("j", {}, "J"),
    new Key("l", {}, "L"),
    new Key("u", {}, "U"),
    new Key("y", {}, "Y"),
    new Key(";", { secondaryKey: ":" }, ";"),
    new Key("[", { secondaryKey: "{" }),
    new Key("]", { secondaryKey: "}" }),
    new Key("\\", { secondaryKey: "|" }),
  ],
  [
    new Key("Caps Lock", { position: ["bottom", "left"], width: 142.5, inert: true }, "caps lock"),
    new Key("a", {}, "A"),
    new Key("r", {}, "R"),
    new Key("s", {}, "S"),
    new Key("t", {}, "T"),
    new Key("g", {}, "G"),
    new Key("m", {}, "M"),
    new Key("n", {}, "N"),
    new Key("e", {}, "E"),
    new Key("i", {}, "I"),
    new Key("o", {}, "O"),
    new Key("'", { secondaryKey: '"' }),
    new Key("Enter", { position: ["bottom", "right"], width: 142.5, inert: true }, "return"),
  ],
  [
    new Key("Shift", { position: ["bottom", "left"], width: 185, inert: true }, "shift"),
    new Key("z", {}, "Z"),
    new Key("x", {}, "X"),
    new Key("c", {}, "C"),
    new Key("d", {}, "D"),
    new Key("v", {}, "V"),
    new Key("k", {}, "K"),
    new Key("h", {}, "H"),
    new Key(",", { secondaryKey: "<" }),
    new Key(".", { secondaryKey: ">" }),
    new Key("/", { secondaryKey: "?" }),
    new Key("Shift", { position: ["bottom", "right"], width: 185, inert: true }, "shift"),
  ],
  [
    new Key("fn", { position: ["bottom", "left"], inert: true }, "fn"),
    new Key("Control", { position: ["bottom", "center"], inert: true, icon: "" }, "control"),
    new Key("Alt", { position: ["bottom", "center"], inert: true, icon: "" }, "option"),
    new Key("Meta", { position: ["bottom", "center"], width: 100, inert: true, icon: "" }, "command"),
    new Key(" ", { width: 420 }),
    new Key("Meta", { position: ["bottom", "center"], width: 100, inert: true, icon: "" }, "command"),
    new Key("Alt", { position: ["bottom", "center"], inert: true, icon: "" }, "option"),
    new Key("Control", { position: ["bottom", "center"], inert: true, icon: "" }, "control"),
    new Key("fn", { position: ["bottom", "right"], inert: true }, "fn"),
  ],
];
```

- [ ] **Step 2: Register in keyboards/index.ts**

In `renderer/src/keyboards/index.ts`, add:

```ts
// Add import at top:
import { MACOS_US_COLEMAK_DH } from "./COLEMAK_DH";

// Add to enum:
export enum KeyboardLayoutNames {
  MACOS_US_QWERTY = "MACOS_US_QWERTY",
  MACOS_US_DVORAK = "MACOS_US_DVORAK",
  MACOS_US_COLEMAK = "MACOS_US_COLEMAK",
  MACOS_US_COLEMAK_DH = "MACOS_US_COLEMAK_DH",   // new
  MACOS_FR_AZERTY = "MACOS_FR_AZERTY",
  MACOS_DE_QWERTZ = "MACOS_DE_QWERTZ",
  MACOS_ES_QWERTY = "MACOS_ES_QWERTY",
  MACOS_NZ_QWERTY = "MACOS_NZ_QWERTY",
}

// Add to exports:
export { MACOS_US_COLEMAK_DH };

// Add case in lookupKeyboard():
case KeyboardLayoutNames.MACOS_US_COLEMAK_DH:
  return MACOS_US_COLEMAK_DH;
```

- [ ] **Step 3: Add level regexes to levels.ts**

Colemak-DH has the same character set as standard Colemak — only key positions differ. Append to `renderer/src/lib/levels.ts`:

```ts
export const LEVEL_1_COLEMAK_DH = /^[rsei]+$/u;
export const LEVEL_2_COLEMAK_DH = /^[rsei atno]+$/u;
export const LEVEL_3_COLEMAK_DH = /^[rsei atno wfuy]+$/u;
export const LEVEL_4_COLEMAK_DH = /^[rsei atno wfuy qpjy]+$/u;
export const LEVEL_5_COLEMAK_DH = /^[rsei atno wfuy qpjy xcm]+$/u;
export const LEVEL_6_COLEMAK_DH = /^[rsei atno wfuy qpjy xcm zvbdhgk]+$/u;
```

- [ ] **Step 4: Add to regExpMap in word-provider.tsx**

In `renderer/src/lib/word-provider.tsx`, add to the `regExpMap` object after the `MACOS_US_COLEMAK` entry:

```ts
[KeyboardLayoutNames.MACOS_US_COLEMAK_DH]: {
  [Levels.LEVEL_1]: regexp.LEVEL_1_COLEMAK_DH,
  [Levels.LEVEL_2]: regexp.LEVEL_2_COLEMAK_DH,
  [Levels.LEVEL_3]: regexp.LEVEL_3_COLEMAK_DH,
  [Levels.LEVEL_4]: regexp.LEVEL_4_COLEMAK_DH,
  [Levels.LEVEL_5]: regexp.LEVEL_5_COLEMAK_DH,
  [Levels.LEVEL_6]: regexp.LEVEL_6_COLEMAK_DH,
},
```

- [ ] **Step 5: Type-check**

```bash
cd /Users/kochie/projects/touch-typer/touch-type && pnpm type-check
```

Expected: no new errors.

- [ ] **Step 6: Commit**

```bash
cd /Users/kochie/projects/touch-typer/touch-type && \
  git add renderer/src/keyboards/COLEMAK_DH.ts renderer/src/keyboards/index.ts \
          renderer/src/lib/levels.ts renderer/src/lib/word-provider.tsx && \
  git commit -m "feat(keyboard): add Colemak-DH layout"
```

---

## Task 3: UK QWERTY Keyboard Layout

UK ISO QWERTY adds an extra key between left Shift and Z (`\`/`|`), moves `#` to the key after `'` on the home row, and swaps `@`/`"` on the `2` key versus the US layout.

**Files:**
- Create: `renderer/src/keyboards/GB_QWERTY.ts`
- Modify: `renderer/src/keyboards/index.ts`
- Modify: `renderer/src/lib/levels.ts`
- Modify: `renderer/src/lib/word-provider.tsx`

- [ ] **Step 1: Create the UK QWERTY layout file**

Create `renderer/src/keyboards/GB_QWERTY.ts`:

```ts
import { Key } from "@/keyboards/key";
import { KeyboardLayout } from ".";

export const MACOS_GB_QWERTY: KeyboardLayout = [
  [
    new Key("`", { secondaryKey: "¬" }),
    new Key("1", { secondaryKey: "!" }),
    new Key("2", { secondaryKey: '"' }),
    new Key("3", { secondaryKey: "£" }),
    new Key("4", { secondaryKey: "$" }),
    new Key("5", { secondaryKey: "%" }),
    new Key("6", { secondaryKey: "^" }),
    new Key("7", { secondaryKey: "&" }),
    new Key("8", { secondaryKey: "*" }),
    new Key("9", { secondaryKey: "(" }),
    new Key("0", { secondaryKey: ")" }),
    new Key("-", { secondaryKey: "_" }),
    new Key("=", { secondaryKey: "+" }),
    new Key("Backspace", { position: ["bottom", "right"], width: 120, inert: true }, "delete"),
  ],
  [
    new Key("Tab", { position: ["bottom", "left"], width: 120, inert: true }, "tab"),
    new Key("q", {}, "Q"),
    new Key("w", {}, "W"),
    new Key("e", {}, "E"),
    new Key("r", {}, "R"),
    new Key("t", {}, "T"),
    new Key("y", {}, "Y"),
    new Key("u", {}, "U"),
    new Key("i", {}, "I"),
    new Key("o", {}, "O"),
    new Key("p", {}, "P"),
    new Key("[", { secondaryKey: "{" }),
    new Key("]", { secondaryKey: "}" }),
    new Key("#", { secondaryKey: "~" }),
  ],
  [
    new Key("Caps Lock", { position: ["bottom", "left"], width: 142.5, inert: true }, "caps lock"),
    new Key("a", {}, "A"),
    new Key("s", {}, "S"),
    new Key("d", {}, "D"),
    new Key("f", {}, "F"),
    new Key("g", {}, "G"),
    new Key("h", {}, "H"),
    new Key("j", {}, "J"),
    new Key("k", {}, "K"),
    new Key("l", {}, "L"),
    new Key(";", { secondaryKey: ":" }),
    new Key("'", { secondaryKey: "@" }),
    new Key("Enter", { position: ["bottom", "right"], width: 142.5, inert: true }, "return"),
  ],
  [
    new Key("Shift", { position: ["bottom", "left"], width: 140, inert: true }, "shift"),
    new Key("\\", { secondaryKey: "|" }),
    new Key("z", {}, "Z"),
    new Key("x", {}, "X"),
    new Key("c", {}, "C"),
    new Key("v", {}, "V"),
    new Key("b", {}, "B"),
    new Key("n", {}, "N"),
    new Key("m", {}, "M"),
    new Key(",", { secondaryKey: "<" }),
    new Key(".", { secondaryKey: ">" }),
    new Key("/", { secondaryKey: "?" }),
    new Key("Shift", { position: ["bottom", "right"], width: 185, inert: true }, "shift"),
  ],
  [
    new Key("fn", { position: ["bottom", "left"], inert: true }, "fn"),
    new Key("Control", { position: ["bottom", "center"], inert: true, icon: "" }, "control"),
    new Key("Alt", { position: ["bottom", "center"], inert: true, icon: "" }, "option"),
    new Key("Meta", { position: ["bottom", "center"], width: 100, inert: true, icon: "" }, "command"),
    new Key(" ", { width: 420 }),
    new Key("Meta", { position: ["bottom", "center"], width: 100, inert: true, icon: "" }, "command"),
    new Key("Alt", { position: ["bottom", "center"], inert: true, icon: "" }, "option"),
    new Key("Control", { position: ["bottom", "center"], inert: true, icon: "" }, "control"),
    new Key("fn", { position: ["bottom", "right"], inert: true }, "fn"),
  ],
];
```

- [ ] **Step 2: Register in keyboards/index.ts**

Add to `renderer/src/keyboards/index.ts`:

```ts
// Import:
import { MACOS_GB_QWERTY } from "./GB_QWERTY";

// Enum (add after MACOS_US_COLEMAK_DH):
MACOS_GB_QWERTY = "MACOS_GB_QWERTY",

// Export:
export { MACOS_GB_QWERTY };

// lookupKeyboard case:
case KeyboardLayoutNames.MACOS_GB_QWERTY:
  return MACOS_GB_QWERTY;
```

- [ ] **Step 3: Add level regexes to levels.ts**

UK QWERTY has the same alphabetic character set as US QWERTY. Append to `renderer/src/lib/levels.ts`:

```ts
export const LEVEL_1_GB_QWERTY = /^[sdklaei]+$/u;
export const LEVEL_2_GB_QWERTY = /^[sdklaei fjg]+$/u;
export const LEVEL_3_GB_QWERTY = /^[sdklaei fjg hwo]+$/u;
export const LEVEL_4_GB_QWERTY = /^[sdklaei fjg hwo ru]+$/u;
export const LEVEL_5_GB_QWERTY = /^[sdklaei fjg hwo ru zxcm]+$/u;
export const LEVEL_6_GB_QWERTY = /^[sdklaei fjg hwo ru zxcm qtybvpn]+$/u;
```

- [ ] **Step 4: Add to regExpMap in word-provider.tsx**

```ts
[KeyboardLayoutNames.MACOS_GB_QWERTY]: {
  [Levels.LEVEL_1]: regexp.LEVEL_1_GB_QWERTY,
  [Levels.LEVEL_2]: regexp.LEVEL_2_GB_QWERTY,
  [Levels.LEVEL_3]: regexp.LEVEL_3_GB_QWERTY,
  [Levels.LEVEL_4]: regexp.LEVEL_4_GB_QWERTY,
  [Levels.LEVEL_5]: regexp.LEVEL_5_GB_QWERTY,
  [Levels.LEVEL_6]: regexp.LEVEL_6_GB_QWERTY,
},
```

- [ ] **Step 5: Type-check**

```bash
cd /Users/kochie/projects/touch-typer/touch-type && pnpm type-check
```

Expected: no new errors.

- [ ] **Step 6: Commit**

```bash
cd /Users/kochie/projects/touch-typer/touch-type && \
  git add renderer/src/keyboards/GB_QWERTY.ts renderer/src/keyboards/index.ts \
          renderer/src/lib/levels.ts renderer/src/lib/word-provider.tsx && \
  git commit -m "feat(keyboard): add UK QWERTY (GB ISO) layout"
```

---

## Task 4: Nordic SE Keyboard Layout

Swedish keyboard adds Å (right of P), Ö (right of L), Ä (right of Ö) and an ISO extra key. Nordic accent characters unlock progressively at levels 4–6.

**Files:**
- Create: `renderer/src/keyboards/SE_NORDIC.ts`
- Modify: `renderer/src/keyboards/index.ts`
- Modify: `renderer/src/lib/levels.ts`
- Modify: `renderer/src/lib/word-provider.tsx`

- [ ] **Step 1: Create the Nordic SE layout file**

Create `renderer/src/keyboards/SE_NORDIC.ts`:

```ts
import { Key } from "@/keyboards/key";
import { KeyboardLayout } from ".";

export const MACOS_SE_NORDIC: KeyboardLayout = [
  [
    new Key("§", { secondaryKey: "½" }),
    new Key("1", { secondaryKey: "!" }),
    new Key("2", { secondaryKey: '"' }),
    new Key("3", { secondaryKey: "#" }),
    new Key("4", { secondaryKey: "¤" }),
    new Key("5", { secondaryKey: "%" }),
    new Key("6", { secondaryKey: "&" }),
    new Key("7", { secondaryKey: "/" }),
    new Key("8", { secondaryKey: "(" }),
    new Key("9", { secondaryKey: ")" }),
    new Key("0", { secondaryKey: "=" }),
    new Key("+", { secondaryKey: "?" }),
    new Key("´", { secondaryKey: "`" }),
    new Key("Backspace", { position: ["bottom", "right"], width: 120, inert: true }, "delete"),
  ],
  [
    new Key("Tab", { position: ["bottom", "left"], width: 120, inert: true }, "tab"),
    new Key("q", {}, "Q"),
    new Key("w", {}, "W"),
    new Key("e", {}, "E"),
    new Key("r", {}, "R"),
    new Key("t", {}, "T"),
    new Key("y", {}, "Y"),
    new Key("u", {}, "U"),
    new Key("i", {}, "I"),
    new Key("o", {}, "O"),
    new Key("p", {}, "P"),
    new Key("å", { secondaryKey: "Å" }, "å"),
    new Key("¨", { secondaryKey: "^" }),
    new Key("Enter", { position: ["bottom", "right"], width: 142.5, inert: true }, "return"),
  ],
  [
    new Key("Caps Lock", { position: ["bottom", "left"], width: 142.5, inert: true }, "caps lock"),
    new Key("a", {}, "A"),
    new Key("s", {}, "S"),
    new Key("d", {}, "D"),
    new Key("f", {}, "F"),
    new Key("g", {}, "G"),
    new Key("h", {}, "H"),
    new Key("j", {}, "J"),
    new Key("k", {}, "K"),
    new Key("l", {}, "L"),
    new Key("ö", { secondaryKey: "Ö" }, "ö"),
    new Key("ä", { secondaryKey: "Ä" }, "ä"),
    new Key("'", { secondaryKey: "*" }),
  ],
  [
    new Key("Shift", { position: ["bottom", "left"], width: 140, inert: true }, "shift"),
    new Key("<", { secondaryKey: ">" }),
    new Key("z", {}, "Z"),
    new Key("x", {}, "X"),
    new Key("c", {}, "C"),
    new Key("v", {}, "V"),
    new Key("b", {}, "B"),
    new Key("n", {}, "N"),
    new Key("m", {}, "M"),
    new Key(",", { secondaryKey: ";" }),
    new Key(".", { secondaryKey: ":" }),
    new Key("-", { secondaryKey: "_" }),
    new Key("Shift", { position: ["bottom", "right"], width: 185, inert: true }, "shift"),
  ],
  [
    new Key("fn", { position: ["bottom", "left"], inert: true }, "fn"),
    new Key("Control", { position: ["bottom", "center"], inert: true, icon: "" }, "control"),
    new Key("Alt", { position: ["bottom", "center"], inert: true, icon: "" }, "option"),
    new Key("Meta", { position: ["bottom", "center"], width: 100, inert: true, icon: "" }, "command"),
    new Key(" ", { width: 420 }),
    new Key("Meta", { position: ["bottom", "center"], width: 100, inert: true, icon: "" }, "command"),
    new Key("Alt", { position: ["bottom", "center"], inert: true, icon: "" }, "option"),
    new Key("Control", { position: ["bottom", "center"], inert: true, icon: "" }, "control"),
    new Key("fn", { position: ["bottom", "right"], inert: true }, "fn"),
  ],
];
```

- [ ] **Step 2: Register in keyboards/index.ts**

```ts
// Import:
import { MACOS_SE_NORDIC } from "./SE_NORDIC";

// Enum:
MACOS_SE_NORDIC = "MACOS_SE_NORDIC",

// Export:
export { MACOS_SE_NORDIC };

// lookupKeyboard case:
case KeyboardLayoutNames.MACOS_SE_NORDIC:
  return MACOS_SE_NORDIC;
```

- [ ] **Step 3: Add level regexes to levels.ts**

Levels 1–3 are identical to QWERTY. Levels 4–6 progressively add Å, Ä, Ö. Append to `renderer/src/lib/levels.ts`:

```ts
export const LEVEL_1_NORDIC = /^[sdklaei]+$/u;
export const LEVEL_2_NORDIC = /^[sdklaei fjg]+$/u;
export const LEVEL_3_NORDIC = /^[sdklaei fjg hwo]+$/u;
export const LEVEL_4_NORDIC = /^[sdklaei fjg hwo ru å]+$/u;
export const LEVEL_5_NORDIC = /^[sdklaei fjg hwo ru å zxcm ä]+$/u;
export const LEVEL_6_NORDIC = /^[sdklaei fjg hwo ru å zxcm ä qtybvpn ö]+$/u;
```

- [ ] **Step 4: Add to regExpMap in word-provider.tsx**

```ts
[KeyboardLayoutNames.MACOS_SE_NORDIC]: {
  [Levels.LEVEL_1]: regexp.LEVEL_1_NORDIC,
  [Levels.LEVEL_2]: regexp.LEVEL_2_NORDIC,
  [Levels.LEVEL_3]: regexp.LEVEL_3_NORDIC,
  [Levels.LEVEL_4]: regexp.LEVEL_4_NORDIC,
  [Levels.LEVEL_5]: regexp.LEVEL_5_NORDIC,
  [Levels.LEVEL_6]: regexp.LEVEL_6_NORDIC,
},
```

- [ ] **Step 5: Type-check**

```bash
cd /Users/kochie/projects/touch-typer/touch-type && pnpm type-check
```

- [ ] **Step 6: Commit**

```bash
cd /Users/kochie/projects/touch-typer/touch-type && \
  git add renderer/src/keyboards/SE_NORDIC.ts renderer/src/keyboards/index.ts \
          renderer/src/lib/levels.ts renderer/src/lib/word-provider.tsx && \
  git commit -m "feat(keyboard): add Nordic SE layout"
```

---

## Task 5: Brazilian ABNT2 Keyboard Layout

ABNT2 places Ç where `;` is, uses dead accent keys, and adds an extra key near right Shift. Levels 4–6 progressively introduce the Portuguese accent characters.

**Files:**
- Create: `renderer/src/keyboards/BR_ABNT2.ts`
- Modify: `renderer/src/keyboards/index.ts`
- Modify: `renderer/src/lib/levels.ts`
- Modify: `renderer/src/lib/word-provider.tsx`

- [ ] **Step 1: Create the ABNT2 layout file**

Create `renderer/src/keyboards/BR_ABNT2.ts`:

```ts
import { Key } from "@/keyboards/key";
import { KeyboardLayout } from ".";

export const MACOS_BR_ABNT2: KeyboardLayout = [
  [
    new Key("'", { secondaryKey: '"' }),
    new Key("1", { secondaryKey: "!" }),
    new Key("2", { secondaryKey: "@" }),
    new Key("3", { secondaryKey: "#" }),
    new Key("4", { secondaryKey: "$" }),
    new Key("5", { secondaryKey: "%" }),
    new Key("6", { secondaryKey: "¨" }),
    new Key("7", { secondaryKey: "&" }),
    new Key("8", { secondaryKey: "*" }),
    new Key("9", { secondaryKey: "(" }),
    new Key("0", { secondaryKey: ")" }),
    new Key("-", { secondaryKey: "_" }),
    new Key("=", { secondaryKey: "+" }),
    new Key("Backspace", { position: ["bottom", "right"], width: 120, inert: true }, "delete"),
  ],
  [
    new Key("Tab", { position: ["bottom", "left"], width: 120, inert: true }, "tab"),
    new Key("q", {}, "Q"),
    new Key("w", {}, "W"),
    new Key("e", {}, "E"),
    new Key("r", {}, "R"),
    new Key("t", {}, "T"),
    new Key("y", {}, "Y"),
    new Key("u", {}, "U"),
    new Key("i", {}, "I"),
    new Key("o", {}, "O"),
    new Key("p", {}, "P"),
    new Key("´", { secondaryKey: "`" }),
    new Key("[", { secondaryKey: "{" }),
    new Key("Enter", { position: ["bottom", "right"], width: 142.5, inert: true }, "return"),
  ],
  [
    new Key("Caps Lock", { position: ["bottom", "left"], width: 142.5, inert: true }, "caps lock"),
    new Key("a", {}, "A"),
    new Key("s", {}, "S"),
    new Key("d", {}, "D"),
    new Key("f", {}, "F"),
    new Key("g", {}, "G"),
    new Key("h", {}, "H"),
    new Key("j", {}, "J"),
    new Key("k", {}, "K"),
    new Key("l", {}, "L"),
    new Key("ç", { secondaryKey: "Ç" }, "ç"),
    new Key("~", { secondaryKey: "^" }),
    new Key("]", { secondaryKey: "}" }),
  ],
  [
    new Key("Shift", { position: ["bottom", "left"], width: 140, inert: true }, "shift"),
    new Key("\\", { secondaryKey: "|" }),
    new Key("z", {}, "Z"),
    new Key("x", {}, "X"),
    new Key("c", {}, "C"),
    new Key("v", {}, "V"),
    new Key("b", {}, "B"),
    new Key("n", {}, "N"),
    new Key("m", {}, "M"),
    new Key(",", { secondaryKey: "<" }),
    new Key(".", { secondaryKey: ">" }),
    new Key(";", { secondaryKey: ":" }),
    new Key("/", { secondaryKey: "?" }),
    new Key("Shift", { position: ["bottom", "right"], width: 140, inert: true }, "shift"),
  ],
  [
    new Key("fn", { position: ["bottom", "left"], inert: true }, "fn"),
    new Key("Control", { position: ["bottom", "center"], inert: true, icon: "" }, "control"),
    new Key("Alt", { position: ["bottom", "center"], inert: true, icon: "" }, "option"),
    new Key("Meta", { position: ["bottom", "center"], width: 100, inert: true, icon: "" }, "command"),
    new Key(" ", { width: 420 }),
    new Key("Meta", { position: ["bottom", "center"], width: 100, inert: true, icon: "" }, "command"),
    new Key("Alt", { position: ["bottom", "center"], inert: true, icon: "" }, "option"),
    new Key("Control", { position: ["bottom", "center"], inert: true, icon: "" }, "control"),
    new Key("fn", { position: ["bottom", "right"], inert: true }, "fn"),
  ],
];
```

- [ ] **Step 2: Register in keyboards/index.ts**

```ts
// Import:
import { MACOS_BR_ABNT2 } from "./BR_ABNT2";

// Enum:
MACOS_BR_ABNT2 = "MACOS_BR_ABNT2",

// Export:
export { MACOS_BR_ABNT2 };

// lookupKeyboard case:
case KeyboardLayoutNames.MACOS_BR_ABNT2:
  return MACOS_BR_ABNT2;
```

- [ ] **Step 3: Add level regexes to levels.ts**

Levels 1–3 are QWERTY-based. Level 4 introduces Ç. Levels 5–6 add the remaining Portuguese accented vowels. Append to `renderer/src/lib/levels.ts`:

```ts
export const LEVEL_1_ABNT2 = /^[sdklaei]+$/u;
export const LEVEL_2_ABNT2 = /^[sdklaei fjg]+$/u;
export const LEVEL_3_ABNT2 = /^[sdklaei fjg hwo]+$/u;
export const LEVEL_4_ABNT2 = /^[sdklaei fjg hwo ru ç]+$/u;
export const LEVEL_5_ABNT2 = /^[sdklaei fjg hwo ru ç zxcm áâãéêíóôõ]+$/u;
export const LEVEL_6_ABNT2 = /^[sdklaei fjg hwo ru ç zxcm áâãéêíóôõ qtybvpn úü]+$/u;
```

- [ ] **Step 4: Add to regExpMap in word-provider.tsx**

```ts
[KeyboardLayoutNames.MACOS_BR_ABNT2]: {
  [Levels.LEVEL_1]: regexp.LEVEL_1_ABNT2,
  [Levels.LEVEL_2]: regexp.LEVEL_2_ABNT2,
  [Levels.LEVEL_3]: regexp.LEVEL_3_ABNT2,
  [Levels.LEVEL_4]: regexp.LEVEL_4_ABNT2,
  [Levels.LEVEL_5]: regexp.LEVEL_5_ABNT2,
  [Levels.LEVEL_6]: regexp.LEVEL_6_ABNT2,
},
```

- [ ] **Step 5: Type-check**

```bash
cd /Users/kochie/projects/touch-typer/touch-type && pnpm type-check
```

- [ ] **Step 6: Commit**

```bash
cd /Users/kochie/projects/touch-typer/touch-type && \
  git add renderer/src/keyboards/BR_ABNT2.ts renderer/src/keyboards/index.ts \
          renderer/src/lib/levels.ts renderer/src/lib/word-provider.tsx && \
  git commit -m "feat(keyboard): add Brazilian ABNT2 layout"
```

---

## Task 6: Italian QWERTY Keyboard Layout

The modern Italian Mac keyboard places accent vowels (è, é, à, ò, ù, ì) as dedicated keys on the right side. Levels 4–6 introduce these progressively.

**Files:**
- Create: `renderer/src/keyboards/IT_QWERTY.ts`
- Modify: `renderer/src/keyboards/index.ts`
- Modify: `renderer/src/lib/levels.ts`
- Modify: `renderer/src/lib/word-provider.tsx`

- [ ] **Step 1: Create the Italian QWERTY layout file**

Create `renderer/src/keyboards/IT_QWERTY.ts`:

```ts
import { Key } from "@/keyboards/key";
import { KeyboardLayout } from ".";

export const MACOS_IT_QWERTY: KeyboardLayout = [
  [
    new Key("\\", { secondaryKey: "|" }),
    new Key("1", { secondaryKey: "!" }),
    new Key("2", { secondaryKey: '"' }),
    new Key("3", { secondaryKey: "£" }),
    new Key("4", { secondaryKey: "$" }),
    new Key("5", { secondaryKey: "%" }),
    new Key("6", { secondaryKey: "&" }),
    new Key("7", { secondaryKey: "/" }),
    new Key("8", { secondaryKey: "(" }),
    new Key("9", { secondaryKey: ")" }),
    new Key("0", { secondaryKey: "=" }),
    new Key("'", { secondaryKey: "?" }),
    new Key("ì", { secondaryKey: "^" }, "ì"),
    new Key("Backspace", { position: ["bottom", "right"], width: 120, inert: true }, "delete"),
  ],
  [
    new Key("Tab", { position: ["bottom", "left"], width: 120, inert: true }, "tab"),
    new Key("q", {}, "Q"),
    new Key("w", {}, "W"),
    new Key("e", {}, "E"),
    new Key("r", {}, "R"),
    new Key("t", {}, "T"),
    new Key("y", {}, "Y"),
    new Key("u", {}, "U"),
    new Key("i", {}, "I"),
    new Key("o", {}, "O"),
    new Key("p", {}, "P"),
    new Key("è", { secondaryKey: "é" }, "è"),
    new Key("+", { secondaryKey: "*" }),
    new Key("Enter", { position: ["bottom", "right"], width: 142.5, inert: true }, "return"),
  ],
  [
    new Key("Caps Lock", { position: ["bottom", "left"], width: 142.5, inert: true }, "caps lock"),
    new Key("a", {}, "A"),
    new Key("s", {}, "S"),
    new Key("d", {}, "D"),
    new Key("f", {}, "F"),
    new Key("g", {}, "G"),
    new Key("h", {}, "H"),
    new Key("j", {}, "J"),
    new Key("k", {}, "K"),
    new Key("l", {}, "L"),
    new Key("ò", { secondaryKey: "ç" }, "ò"),
    new Key("à", { secondaryKey: "°" }, "à"),
    new Key("ù", { secondaryKey: "§" }, "ù"),
  ],
  [
    new Key("Shift", { position: ["bottom", "left"], width: 140, inert: true }, "shift"),
    new Key("<", { secondaryKey: ">" }),
    new Key("z", {}, "Z"),
    new Key("x", {}, "X"),
    new Key("c", {}, "C"),
    new Key("v", {}, "V"),
    new Key("b", {}, "B"),
    new Key("n", {}, "N"),
    new Key("m", {}, "M"),
    new Key(",", { secondaryKey: ";" }),
    new Key(".", { secondaryKey: ":" }),
    new Key("-", { secondaryKey: "_" }),
    new Key("Shift", { position: ["bottom", "right"], width: 185, inert: true }, "shift"),
  ],
  [
    new Key("fn", { position: ["bottom", "left"], inert: true }, "fn"),
    new Key("Control", { position: ["bottom", "center"], inert: true, icon: "" }, "control"),
    new Key("Alt", { position: ["bottom", "center"], inert: true, icon: "" }, "option"),
    new Key("Meta", { position: ["bottom", "center"], width: 100, inert: true, icon: "" }, "command"),
    new Key(" ", { width: 420 }),
    new Key("Meta", { position: ["bottom", "center"], width: 100, inert: true, icon: "" }, "command"),
    new Key("Alt", { position: ["bottom", "center"], inert: true, icon: "" }, "option"),
    new Key("Control", { position: ["bottom", "center"], inert: true, icon: "" }, "control"),
    new Key("fn", { position: ["bottom", "right"], inert: true }, "fn"),
  ],
];
```

- [ ] **Step 2: Register in keyboards/index.ts**

```ts
// Import:
import { MACOS_IT_QWERTY } from "./IT_QWERTY";

// Enum:
MACOS_IT_QWERTY = "MACOS_IT_QWERTY",

// Export:
export { MACOS_IT_QWERTY };

// lookupKeyboard case:
case KeyboardLayoutNames.MACOS_IT_QWERTY:
  return MACOS_IT_QWERTY;
```

- [ ] **Step 3: Add level regexes to levels.ts**

Levels 1–3 are QWERTY-based. Levels 4–6 progressively add Italian accent vowels. Append to `renderer/src/lib/levels.ts`:

```ts
export const LEVEL_1_IT_QWERTY = /^[sdklaei]+$/u;
export const LEVEL_2_IT_QWERTY = /^[sdklaei fjg]+$/u;
export const LEVEL_3_IT_QWERTY = /^[sdklaei fjg hwo]+$/u;
export const LEVEL_4_IT_QWERTY = /^[sdklaei fjg hwo ru à]+$/u;
export const LEVEL_5_IT_QWERTY = /^[sdklaei fjg hwo ru à zxcm èì]+$/u;
export const LEVEL_6_IT_QWERTY = /^[sdklaei fjg hwo ru à zxcm èì qtybvpn òù]+$/u;
```

- [ ] **Step 4: Add to regExpMap in word-provider.tsx**

```ts
[KeyboardLayoutNames.MACOS_IT_QWERTY]: {
  [Levels.LEVEL_1]: regexp.LEVEL_1_IT_QWERTY,
  [Levels.LEVEL_2]: regexp.LEVEL_2_IT_QWERTY,
  [Levels.LEVEL_3]: regexp.LEVEL_3_IT_QWERTY,
  [Levels.LEVEL_4]: regexp.LEVEL_4_IT_QWERTY,
  [Levels.LEVEL_5]: regexp.LEVEL_5_IT_QWERTY,
  [Levels.LEVEL_6]: regexp.LEVEL_6_IT_QWERTY,
},
```

- [ ] **Step 5: Type-check**

```bash
cd /Users/kochie/projects/touch-typer/touch-type && pnpm type-check
```

- [ ] **Step 6: Commit**

```bash
cd /Users/kochie/projects/touch-typer/touch-type && \
  git add renderer/src/keyboards/IT_QWERTY.ts renderer/src/keyboards/index.ts \
          renderer/src/lib/levels.ts renderer/src/lib/word-provider.tsx && \
  git commit -m "feat(keyboard): add Italian QWERTY layout"
```

---

## Task 7: Shared languages.ts Module

Consolidates the inline `languages` array from `settings.tsx` and `Menu/index.tsx` into a shared module that adds `preferredKeyboards` metadata. Must run after Tasks 1–6 (needs all new enum values defined).

**Files:**
- Create: `renderer/src/lib/languages.ts`
- Modify: `renderer/src/components/settings/settings.tsx`
- Modify: `renderer/src/components/Menu/index.tsx`

- [ ] **Step 1: Create languages.ts**

Create `renderer/src/lib/languages.ts`:

```ts
import { KeyboardLayoutNames } from "@/keyboards";
import { Languages } from "@/lib/settings_hook";

export interface LanguageEntry {
  value: Languages;
  label: string;
  preferredKeyboards: KeyboardLayoutNames[];
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

- [ ] **Step 2: Update settings.tsx to import LANGUAGES**

In `renderer/src/components/settings/settings.tsx`:

1. Remove the inline `languages` array (the `export const languages = [...]` block near the top).

2. Add this import:
   ```ts
   import { LANGUAGES } from "@/lib/languages";
   ```

3. In `KeyboardSettingsPanel` (the function that has the language `<Select>`), replace the reference to `languages.map(...)` with `LANGUAGES.map(...)`:
   ```tsx
   {LANGUAGES.map((language) => (
     <option key={language.value} value={language.value}>
       {language.label}
     </option>
   ))}
   ```

- [ ] **Step 3: Update Menu/index.tsx to import LANGUAGES**

In `renderer/src/components/Menu/index.tsx`:

1. Remove this import:
   ```ts
   import { languages } from "../settings/settings";
   ```

2. Add:
   ```ts
   import { LANGUAGES } from "@/lib/languages";
   ```

3. Find the usage of `languages.find(...)` in the center context section (the part that shows the current language label in the nav bar). Replace it with `LANGUAGES.find(...)`:
   ```tsx
   {LANGUAGES.find(
     (l) => l.value === hydratedSettings.language
   )?.label ?? hydratedSettings.language}
   ```

- [ ] **Step 4: Type-check**

```bash
cd /Users/kochie/projects/touch-typer/touch-type && pnpm type-check
```

Expected: no new errors. The removed `export const languages` was only consumed by two files, both now updated.

- [ ] **Step 5: Commit**

```bash
cd /Users/kochie/projects/touch-typer/touch-type && \
  git add renderer/src/lib/languages.ts renderer/src/components/settings/settings.tsx \
          renderer/src/components/Menu/index.tsx && \
  git commit -m "feat(i18n): add languages.ts with preferredKeyboards metadata"
```

---

## Task 8: Register New Keyboards in Selector UI

Adds the 5 new layouts to both `KeyboardSelect/index.tsx` (used in Settings) and `KeyboardHeatmapSelect/index.tsx` (used in Stats and Heatmap filter dropdowns). Stats/Heatmap dropdowns will pick up the new entries automatically once the arrays are updated.

**Files:**
- Modify: `renderer/src/components/KeyboardSelect/index.tsx`
- Modify: `renderer/src/components/KeyboardHeatmapSelect/index.tsx`

- [ ] **Step 1: Add 5 entries to KeyboardSelect/index.tsx**

In `renderer/src/components/KeyboardSelect/index.tsx`, append to the `keyboards` array (after the last existing entry):

```ts
{
  name: "MAC COLEMAK-DH",
  layout: KeyboardLayoutNames.MACOS_US_COLEMAK_DH,
  country: "🇺🇸",
},
{
  name: "MAC QWERTY (British)",
  layout: KeyboardLayoutNames.MACOS_GB_QWERTY,
  country: "🇬🇧",
},
{
  name: "MAC NORDIC (Swedish)",
  layout: KeyboardLayoutNames.MACOS_SE_NORDIC,
  country: "🇸🇪",
},
{
  name: "MAC ABNT2 (Portuguese)",
  layout: KeyboardLayoutNames.MACOS_BR_ABNT2,
  country: "🇧🇷",
},
{
  name: "MAC QWERTY (Italian)",
  layout: KeyboardLayoutNames.MACOS_IT_QWERTY,
  country: "🇮🇹",
},
```

- [ ] **Step 2: Add the same 5 entries to KeyboardHeatmapSelect/index.tsx**

In `renderer/src/components/KeyboardHeatmapSelect/index.tsx`, append the same 5 entries to the `keyboards` array:

```ts
{
  name: "MAC COLEMAK-DH",
  layout: KeyboardLayoutNames.MACOS_US_COLEMAK_DH,
  country: "🇺🇸",
},
{
  name: "MAC QWERTY (British)",
  layout: KeyboardLayoutNames.MACOS_GB_QWERTY,
  country: "🇬🇧",
},
{
  name: "MAC NORDIC (Swedish)",
  layout: KeyboardLayoutNames.MACOS_SE_NORDIC,
  country: "🇸🇪",
},
{
  name: "MAC ABNT2 (Portuguese)",
  layout: KeyboardLayoutNames.MACOS_BR_ABNT2,
  country: "🇧🇷",
},
{
  name: "MAC QWERTY (Italian)",
  layout: KeyboardLayoutNames.MACOS_IT_QWERTY,
  country: "🇮🇹",
},
```

- [ ] **Step 3: Type-check**

```bash
cd /Users/kochie/projects/touch-typer/touch-type && pnpm type-check
```

- [ ] **Step 4: Commit**

```bash
cd /Users/kochie/projects/touch-typer/touch-type && \
  git add renderer/src/components/KeyboardSelect/index.tsx \
          renderer/src/components/KeyboardHeatmapSelect/index.tsx && \
  git commit -m "feat(ui): register 5 new keyboard layouts in selector dropdowns"
```

---

## Task 9: Preferred-Keyboard Suggestion

Adds `dismissedKeyboardSuggestions` state to settings, a `DISMISS_KEYBOARD_SUGGESTION` action, a `CLEAR_KEYBOARD_SUGGESTION_DISMISSAL` action, and a dismissible suggestion banner in `PracticeSettingsPanel`. Must run after Task 7 (needs `LANGUAGES` from `languages.ts`).

**Files:**
- Modify: `renderer/src/lib/settings_hook.tsx`
- Modify: `renderer/src/components/settings/settings.tsx`

- [ ] **Step 1: Add dismissedKeyboardSuggestions to defaultSettings**

In `renderer/src/lib/settings_hook.tsx`, add to `defaultSettings` (after `tabWidth`):

```ts
dismissedKeyboardSuggestions: [] as Languages[],
```

Also add the same field to `SettingsContext` createContext call default value:
```ts
dismissedKeyboardSuggestions: [] as Languages[],
```

- [ ] **Step 2: Add two new dispatch action types**

In `renderer/src/lib/settings_hook.tsx`, add to the `ChangeSettingsAction` union type (after the last `SET_TAB_WIDTH` entry):

```ts
| {
    type: "DISMISS_KEYBOARD_SUGGESTION";
    language: Languages;
  }
| {
    type: "CLEAR_KEYBOARD_SUGGESTION_DISMISSAL";
    language: Languages;
  }
```

- [ ] **Step 3: Add reducer cases for the two new actions**

In the `reducer` function in `renderer/src/lib/settings_hook.tsx`, add after the `SET_TAB_WIDTH` case:

```ts
case "DISMISS_KEYBOARD_SUGGESTION":
  return {
    ...state,
    dismissedKeyboardSuggestions: [
      ...state.dismissedKeyboardSuggestions.filter(
        (l) => l !== action.language,
      ),
      action.language,
    ],
  };

case "CLEAR_KEYBOARD_SUGGESTION_DISMISSAL":
  return {
    ...state,
    dismissedKeyboardSuggestions: state.dismissedKeyboardSuggestions.filter(
      (l) => l !== action.language,
    ),
  };
```

- [ ] **Step 4: Add the suggestion banner to PracticeSettingsPanel in settings.tsx**

In `renderer/src/components/settings/settings.tsx`:

1. Add this import at the top of the file:
   ```ts
   import { LANGUAGES } from "@/lib/languages";
   import { useRef, useEffect } from "react";
   ```
   (Note: `useState` is already imported; check if `useRef` and `useEffect` are too — add only what is missing.)

2. Find `function PracticeSettingsPanel()` and replace its body with the following (the level/punctuation/numbers/capital/CodeSettings content is unchanged — only the language section and suggestion banner are added):

```tsx
function PracticeSettingsPanel() {
  const settings = useSettings();
  const dispatchSettings = useSettingsDispatch();

  // When the keyboard changes to a preferred layout for the current language,
  // clear the dismissal so the hint can reappear if they switch away again.
  const prevKeyboard = useRef(settings.keyboardName);
  useEffect(() => {
    if (prevKeyboard.current !== settings.keyboardName) {
      const langEntry = LANGUAGES.find((l) => l.value === settings.language);
      if (langEntry?.preferredKeyboards.includes(settings.keyboardName)) {
        dispatchSettings({
          type: "CLEAR_KEYBOARD_SUGGESTION_DISMISSAL",
          language: settings.language,
        });
      }
      prevKeyboard.current = settings.keyboardName;
    }
  }, [settings.keyboardName, settings.language, dispatchSettings]);

  const langEntry = LANGUAGES.find((l) => l.value === settings.language);
  const showSuggestion =
    langEntry !== undefined &&
    langEntry.preferredKeyboards.length > 0 &&
    !langEntry.preferredKeyboards.includes(settings.keyboardName) &&
    !settings.dismissedKeyboardSuggestions.includes(settings.language);

  const primaryKeyboard = langEntry?.preferredKeyboards[0];
  const primaryKeyboardName = primaryKeyboard
    ? (keyboards.find((k) => k.layout === primaryKeyboard)?.name ??
       primaryKeyboard)
    : "";

  return (
    <div className="flex flex-col gap-6">
      {/* Language selector */}
      <form className="flex flex-col gap-6">
        <Field as="div" className="flex items-center justify-between">
          <span className="flex flex-grow flex-col">
            <Label>Language</Label>
            <Description as="span" className="text-sm text-gray-500">
              Choose the language of the words to type.
            </Description>
          </span>
          <Select
            className={clsx(
              "block w-44 appearance-none rounded-lg border-none bg-white/5 py-1.5 px-3 text-sm/6 text-white",
              "focus:outline-none data-[focus]:outline-2 data-[focus]:-outline-offset-2 data-[focus]:outline-white/25",
              "*:text-black",
            )}
            value={settings.language}
            onChange={(e) => {
              dispatchSettings({
                type: "CHANGE_LANGUAGE",
                language: e.target.value as Languages,
              });
            }}
          >
            {LANGUAGES.map((language) => (
              <option key={language.value} value={language.value}>
                {language.label}
              </option>
            ))}
          </Select>
        </Field>
      </form>

      {/* Keyboard suggestion banner */}
      {showSuggestion && primaryKeyboard && (
        <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-lg bg-sky-400/[0.08] border border-sky-400/20 text-sm">
          <span className="text-slate-700 dark:text-slate-300">
            {langEntry?.label} types best with the{" "}
            <span className="font-semibold">{primaryKeyboardName}</span> keyboard.
          </span>
          <div className="flex items-center gap-3 flex-shrink-0">
            <button
              type="button"
              onClick={() => {
                dispatchSettings({ type: "CHANGE_KEYBOARD", keyboardName: primaryKeyboard });
                dispatchSettings({ type: "DISMISS_KEYBOARD_SUGGESTION", language: settings.language });
              }}
              className="text-sky-400 font-semibold hover:text-sky-300 transition-colors"
            >
              Switch
            </button>
            <button
              type="button"
              onClick={() =>
                dispatchSettings({
                  type: "DISMISS_KEYBOARD_SUGGESTION",
                  language: settings.language,
                })
              }
              className="text-slate-400 hover:text-slate-300 transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Level + practice toggles (unchanged from existing code) */}
      <form className="flex flex-col gap-6">
        <Field as="div" className="flex items-center justify-between">
          <span className="flex flex-grow flex-col">
            <Label className="my-auto sm:col-span-2">Level</Label>
            <Description as="span" className="text-sm text-gray-500 mr-3">
              Choose the level of difficulty of the words to type.
            </Description>
          </span>
          <Select
            className={clsx(
              "block w-28 appearance-none rounded-lg border-none bg-white/5 py-1.5 px-3 text-sm/6 text-white",
              "focus:outline-none data-[focus]:outline-2 data-[focus]:-outline-offset-2 data-[focus]:outline-white/25",
              "*:text-black",
            )}
            value={settings.levelName}
            onChange={(e) => {
              dispatchSettings({
                type: "CHANGE_LEVEL",
                levelName: e.target.value as Levels,
              });
            }}
          >
            {levels.map((level) => (
              <option key={level.value} value={level.value}>
                {level.label}
              </option>
            ))}
          </Select>
        </Field>

        <SettingsSwitch
          enabled={settings.punctuation}
          setEnabled={(enabled) =>
            dispatchSettings({ type: "SET_PUNCTUATION", punctuation: enabled })
          }
          label="Punctuation"
          description="Include punctuation in the words to type."
        />
        <SettingsSwitch
          enabled={settings.numbers}
          setEnabled={(enabled) =>
            dispatchSettings({ type: "SET_NUMBERS", numbers: enabled })
          }
          label="Numbers"
          description="Include numbers in the words to type."
        />
        <SettingsSwitch
          enabled={settings.capital}
          setEnabled={(enabled) =>
            dispatchSettings({ type: "SET_CAPITAL", capital: enabled })
          }
          label="Capital Letters"
          description="Include capital letters in the words to type."
        />
      </form>

      <CodeSettings />
    </div>
  );
}
```

Note: `keyboards` array is imported from `../KeyboardSelect` — check if it is already imported at the top of `settings.tsx`. If not, add:
```ts
import { keyboards } from "../KeyboardSelect";
```

- [ ] **Step 5: Type-check**

```bash
cd /Users/kochie/projects/touch-typer/touch-type && pnpm type-check
```

Fix any new errors in the modified files. Do NOT fix pre-existing errors.

- [ ] **Step 6: Commit**

```bash
cd /Users/kochie/projects/touch-typer/touch-type && \
  git add renderer/src/lib/settings_hook.tsx renderer/src/components/settings/settings.tsx && \
  git commit -m "feat(settings): add preferred-keyboard suggestion banner"
```
