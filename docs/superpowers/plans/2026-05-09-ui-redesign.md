# UI/UX Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the approved UI/UX redesign: shared design token system, Code as a first-class nav route, and Template B/C page headers applied to all secondary pages.

**Architecture:** The redesign is entirely within `touch-type/renderer/src/`. It introduces a shared `PageHeader` component used by all secondary pages, a dedicated `/code` route that forces code mode via a `mode` prop on `Tracker`, and updates all remaining pages to use sky-400 tokens and the approved header pattern. No backend, Electron main, or auth changes.

**Tech Stack:** Next.js App Router (static export), Tailwind CSS v4, FontAwesome Pro, TypeScript, clsx

---

## File Map

| Action | File | What changes |
|--------|------|-------------|
| Modify | `renderer/src/components/Menu/index.tsx` | Add Code nav item between Practice and AI |
| Modify | `renderer/src/lib/code-provider.tsx` | Load snippets when on `/code` route even if `settings.codeMode` is false |
| Modify | `renderer/src/components/Tracker/index.tsx` | Accept `mode?: 'practice' \| 'code'` prop to override settings |
| Create | `renderer/src/components/PageHeader/index.tsx` | Shared page header (icon + title + subtitle) for Templates B and C |
| Create | `renderer/src/app/code/page.tsx` | New Code route: language selector + Tracker forced to code mode |
| Modify | `renderer/src/app/stats/page.tsx` | Template B: PageHeader + time range filter |
| Modify | `renderer/src/app/heatmap/page.tsx` | Template B: PageHeader + time range filter |
| Modify | `renderer/src/components/PvP/PvPHub.tsx` | Template C: PageHeader |
| Modify | `renderer/src/app/assistant/client.tsx` | Template C: PageHeader |
| Modify | `renderer/src/app/streak/page.tsx` | Template C: full streak page redesign |
| Modify | `renderer/src/components/settings/settings.tsx` | Template C: PageHeader + left category nav |

---

## Task 1: Add Code Nav Item

**Files:**
- Modify: `renderer/src/components/Menu/index.tsx`

- [ ] **Step 1: Add the Code icon import**

At the top of `renderer/src/components/Menu/index.tsx`, add `faCode` to the pro-regular import:

```tsx
import {
  faChartRadar,
  faMicrochipAi,
  faCode,
} from "@fortawesome/pro-regular-svg-icons";
```

- [ ] **Step 2: Insert the Code NavItem between Practice and AI**

In the `<div className="flex items-center gap-1">` nav section, add the Code item between the Practice and AI items:

```tsx
<NavItem
  href="/"
  icon={faKeyboard}
  label="Practice"
  isActive={pathname === "/"}
/>
<NavItem
  href="/code"
  icon={faCode}
  label="Code"
  isActive={pathname === "/code"}
/>
<NavItem
  href="/assistant"
  icon={faMicrochipAi}
  label="AI"
  isActive={pathname === "/assistant"}
  hidden={isMas && !premium}
/>
```

- [ ] **Step 3: Type-check**

```bash
cd /Users/kochie/projects/touch-typer/touch-type && pnpm type-check
```

Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
cd /Users/kochie/projects/touch-typer/touch-type && git add renderer/src/components/Menu/index.tsx && git commit -m "feat(nav): add Code nav item between Practice and AI"
```

---

## Task 2: Enable Code Mode on `/code` Route

The `CodeProvider` currently guards snippet loading behind `settings.codeMode`. The `/code` page must load snippets regardless of that setting, without persisting a change to user settings.

**Files:**
- Modify: `renderer/src/lib/code-provider.tsx`
- Modify: `renderer/src/components/Tracker/index.tsx`

- [ ] **Step 1: Import `usePathname` in `code-provider.tsx`**

In `renderer/src/lib/code-provider.tsx`, add this import after the existing imports:

```tsx
import { usePathname } from "next/navigation";
```

- [ ] **Step 2: Read pathname and expand the snippet-loading guard**

Inside `CodeProvider`, directly after `const settings = useSettings();`, add:

```tsx
const pathname = usePathname();
const isCodePage = pathname === "/code";
```

Then find the `useEffect` that starts with:

```tsx
useEffect(() => {
  if (!settings.codeMode) {
    return;
  }
```

Change it to:

```tsx
useEffect(() => {
  if (!settings.codeMode && !isCodePage) {
    return;
  }
```

And add `isCodePage` to the dependency array at the end of that effect:

```tsx
}, [
  settings.codeMode,
  isCodePage,
  settings.codeSnippetSource,
  settings.codeLang,
  settings.customCodePath,
  loadBundledSnippets,
  loadGeneratedSnippets,
  loadFileSnippets,
]);
```

- [ ] **Step 3: Add `mode` prop to `Tracker`**

In `renderer/src/components/Tracker/index.tsx`, change the component signature. Find:

```tsx
export default function Tracker() {
```

Replace with:

```tsx
export default function Tracker({ mode }: { mode?: "practice" | "code" }) {
```

- [ ] **Step 4: Replace `settings.codeMode` with `effectiveCodeMode` in Tracker**

Directly after the line `const settings = useSettings();` inside the Tracker function body, add:

```tsx
const effectiveCodeMode = mode === "code" || settings.codeMode;
```

Then replace every occurrence of `settings.codeMode` in Tracker's function body with `effectiveCodeMode`. There are approximately 8 occurrences — confirm each one with:

```bash
grep -n "settings\.codeMode" /Users/kochie/projects/touch-typer/touch-type/renderer/src/components/Tracker/index.tsx
```

Use your editor to replace all 8 occurrences. Do NOT replace occurrences in import statements or type declarations — only in the component's runtime logic.

- [ ] **Step 5: Type-check**

```bash
cd /Users/kochie/projects/touch-typer/touch-type && pnpm type-check
```

Expected: no new errors.

- [ ] **Step 6: Commit**

```bash
cd /Users/kochie/projects/touch-typer/touch-type && git add renderer/src/lib/code-provider.tsx renderer/src/components/Tracker/index.tsx && git commit -m "feat(code): load snippets on /code route; add mode prop to Tracker"
```

---

## Task 3: Create Shared `PageHeader` Component

Used by all Template B and Template C pages.

**Files:**
- Create: `renderer/src/components/PageHeader/index.tsx`

- [ ] **Step 1: Create the component**

Create `renderer/src/components/PageHeader/index.tsx` with this content:

```tsx
import { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import clsx from "clsx";

interface PageHeaderProps {
  icon: IconDefinition;
  title: string;
  subtitle: string;
  iconBg: string;   // e.g. "bg-sky-400/10"
  iconColor: string; // e.g. "text-sky-400"
  children?: React.ReactNode; // filter bar, action buttons, etc.
}

export default function PageHeader({
  icon,
  title,
  subtitle,
  iconBg,
  iconColor,
  children,
}: PageHeaderProps) {
  return (
    <div className="px-6 pt-6 pb-4">
      <div className="flex items-start gap-4 mb-4">
        <div
          className={clsx(
            "w-13 h-13 rounded-2xl flex items-center justify-center flex-shrink-0",
            iconBg
          )}
        >
          <FontAwesomeIcon icon={icon} className={clsx("w-6 h-6", iconColor)} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 leading-tight">
            {title}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {subtitle}
          </p>
        </div>
      </div>
      {children}
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
cd /Users/kochie/projects/touch-typer/touch-type && pnpm type-check
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd /Users/kochie/projects/touch-typer/touch-type && git add renderer/src/components/PageHeader/index.tsx && git commit -m "feat(ui): add shared PageHeader component for Template B/C pages"
```

---

## Task 4: Create `/code` Page

**Files:**
- Create: `renderer/src/app/code/page.tsx`

- [ ] **Step 1: Create the page**

Create `renderer/src/app/code/page.tsx`:

```tsx
"use client";

import { Suspense } from "react";
import Tracker from "@/components/Tracker";
import {
  CodeLanguages,
  SnippetSource,
  useSettings,
  useSettingsDispatch,
} from "@/lib/settings_hook";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCode } from "@fortawesome/pro-regular-svg-icons";
import clsx from "clsx";

const CODE_LANGUAGES: { value: CodeLanguages; label: string }[] = [
  { value: CodeLanguages.C, label: "C" },
  { value: CodeLanguages.GO, label: "Go" },
  { value: CodeLanguages.PYTHON, label: "Python" },
  { value: CodeLanguages.JAVASCRIPT, label: "JavaScript" },
  { value: CodeLanguages.JAVA, label: "Java" },
  { value: CodeLanguages.KOTLIN, label: "Kotlin" },
  { value: CodeLanguages.SWIFT, label: "Swift" },
];

function CodePageInner() {
  const settings = useSettings();
  const dispatch = useSettingsDispatch();

  return (
    <div className="w-full">
      {/* Header */}
      <div className="px-6 pt-5 pb-2">
        <div className="flex items-start gap-4 mb-4">
          <div className="w-13 h-13 rounded-2xl flex items-center justify-center flex-shrink-0 bg-sky-400/10">
            <FontAwesomeIcon icon={faCode} className="w-6 h-6 text-sky-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 leading-tight">
              Code
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Practice real code snippets with proper indentation and syntax
            </p>
          </div>
        </div>

        {/* Language selector bar */}
        <div className="flex items-center gap-2 flex-wrap">
          {CODE_LANGUAGES.map((lang) => (
            <button
              key={lang.value}
              onClick={() =>
                dispatch({ type: "SET_CODE_LANG", codeLang: lang.value })
              }
              className={clsx(
                "px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors duration-150",
                settings.codeLang === lang.value
                  ? "bg-sky-400/10 text-sky-400 border border-sky-400/30"
                  : "bg-slate-100 dark:bg-white/[0.04] text-slate-500 dark:text-slate-400 border border-transparent hover:bg-slate-200 dark:hover:bg-white/[0.07] hover:text-slate-700 dark:hover:text-slate-200"
              )}
            >
              {lang.label}
            </button>
          ))}

          <div className="ml-auto flex gap-2">
            {([SnippetSource.BUNDLED, SnippetSource.GENERATED] as const).map(
              (src) => (
                <button
                  key={src}
                  onClick={() =>
                    dispatch({ type: "SET_CODE_SNIPPET_SOURCE", source: src })
                  }
                  className={clsx(
                    "px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors duration-150 capitalize",
                    settings.codeSnippetSource === src
                      ? "bg-slate-900/10 dark:bg-white/[0.08] text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-white/10"
                      : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
                  )}
                >
                  {src}
                </button>
              )
            )}
          </div>
        </div>
      </div>

      {/* Tracker in code mode */}
      <Tracker mode="code" />
    </div>
  );
}

export default function CodePage() {
  return (
    <Suspense>
      <CodePageInner />
    </Suspense>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
cd /Users/kochie/projects/touch-typer/touch-type && pnpm type-check
```

Expected: no errors.

- [ ] **Step 3: Start the renderer and verify the Code page loads**

```bash
cd /Users/kochie/projects/touch-typer/touch-type && pnpm dev:next
```

Navigate to `http://localhost:3000/code`. Verify:
- Code nav item in the topbar is highlighted
- Language buttons appear at the top
- Editor chrome (traffic light dots + language badge) renders below
- Typing in the editor works (keys register, cursor moves)

- [ ] **Step 4: Commit**

```bash
cd /Users/kochie/projects/touch-typer/touch-type && git add renderer/src/app/code/page.tsx && git commit -m "feat: add /code route as first-class navigation page"
```

---

## Task 5: Update Stats Page — Template B Header

**Files:**
- Modify: `renderer/src/app/stats/page.tsx`

- [ ] **Step 1: Rewrite stats page**

Replace the entire contents of `renderer/src/app/stats/page.tsx` with:

```tsx
"use client";

import { Barline, BestForEachLevel } from "@/components/Charts";
import KeyboardSelect from "@/components/KeyboardHeatmapSelect";
import { KeyboardLayoutNames } from "@/keyboards";
import PageHeader from "@/components/PageHeader";
import { faChartColumn } from "@fortawesome/free-solid-svg-icons";
import React, { useState } from "react";
import clsx from "clsx";

type TimeRange = "7d" | "30d" | "all";

const TIME_RANGES: { value: TimeRange; label: string }[] = [
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "all", label: "All time" },
];

const StatsPage = () => {
  const [keyboard, setKeyboard] = useState(KeyboardLayoutNames.MACOS_US_QWERTY);
  const [timeRange, setTimeRange] = useState<TimeRange>("30d");

  return (
    <div>
      <PageHeader
        icon={faChartColumn}
        title="Stats"
        subtitle="Your typing performance over time"
        iconBg="bg-sky-400/10"
        iconColor="text-sky-400"
      >
        <div className="flex items-center gap-3 mt-3 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <KeyboardSelect
              selectedKeyboardName={keyboard}
              setSelectedKeyboard={setKeyboard}
              label="Keyboard Layout"
              description="Show statistics for a specific keyboard layout"
            />
          </div>
          <div className="flex gap-1.5">
            {TIME_RANGES.map((range) => (
              <button
                key={range.value}
                onClick={() => setTimeRange(range.value)}
                className={clsx(
                  "px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors duration-150",
                  timeRange === range.value
                    ? "bg-sky-400/10 text-sky-400 border border-sky-400/30"
                    : "bg-slate-100 dark:bg-white/[0.04] text-slate-500 dark:text-slate-400 border border-transparent hover:text-slate-700 dark:hover:text-slate-200"
                )}
              >
                {range.label}
              </button>
            ))}
          </div>
        </div>
      </PageHeader>

      <div className="px-6">
        <div className="py-6">
          <BestForEachLevel keyboard={keyboard} />
        </div>
        <Barline keyboard={keyboard} />
      </div>
    </div>
  );
};

export default StatsPage;
```

Note: the `timeRange` state is wired to the UI but not yet plumbed into `BestForEachLevel` or `Barline` — those components will need their own prop updates in a future task. The filter renders and state works; chart integration is out of scope for this redesign.

- [ ] **Step 2: Type-check**

```bash
cd /Users/kochie/projects/touch-typer/touch-type && pnpm type-check
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd /Users/kochie/projects/touch-typer/touch-type && git add renderer/src/app/stats/page.tsx && git commit -m "feat(stats): apply Template B header with time range filter"
```

---

## Task 6: Update Heatmap Page — Template B Header

**Files:**
- Modify: `renderer/src/app/heatmap/page.tsx`

- [ ] **Step 1: Rewrite heatmap page**

Replace the entire contents of `renderer/src/app/heatmap/page.tsx` with:

```tsx
"use client";

import { HeatmapCanvas } from "@/components/HeatmapCanvas";
import KeyboardSelect from "@/components/KeyboardHeatmapSelect";
import { KeyboardLayoutNames } from "@/keyboards";
import PageHeader from "@/components/PageHeader";
import { faChartRadar } from "@fortawesome/pro-regular-svg-icons";
import { useState } from "react";
import clsx from "clsx";

type TimeRange = "7d" | "30d" | "all";

const TIME_RANGES: { value: TimeRange; label: string }[] = [
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "all", label: "All time" },
];

export default function HeatmapPage() {
  const [keyboard, setKeyboard] = useState(KeyboardLayoutNames.MACOS_US_QWERTY);
  const [timeRange, setTimeRange] = useState<TimeRange>("30d");

  return (
    <div>
      <PageHeader
        icon={faChartRadar}
        title="Key Map"
        subtitle="See which keys you miss most"
        iconBg="bg-rose-400/10"
        iconColor="text-rose-400"
      >
        <div className="flex items-center gap-3 mt-3 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <KeyboardSelect
              selectedKeyboardName={keyboard}
              setSelectedKeyboard={setKeyboard}
              label="Keyboard Layout"
              description="Select a keyboard layout to display the heatmap of incorrect key taps."
            />
          </div>
          <div className="flex gap-1.5">
            {TIME_RANGES.map((range) => (
              <button
                key={range.value}
                onClick={() => setTimeRange(range.value)}
                className={clsx(
                  "px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors duration-150",
                  timeRange === range.value
                    ? "bg-rose-400/10 text-rose-400 border border-rose-400/30"
                    : "bg-slate-100 dark:bg-white/[0.04] text-slate-500 dark:text-slate-400 border border-transparent hover:text-slate-700 dark:hover:text-slate-200"
                )}
              >
                {range.label}
              </button>
            ))}
          </div>
        </div>
      </PageHeader>

      <div className="px-6">
        <HeatmapCanvas keyboardName={keyboard} />
      </div>
    </div>
  );
}
```

Note: `timeRange` state renders correctly; wiring to `HeatmapCanvas` is out of scope for this redesign.

- [ ] **Step 2: Type-check**

```bash
cd /Users/kochie/projects/touch-typer/touch-type && pnpm type-check
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd /Users/kochie/projects/touch-typer/touch-type && git add renderer/src/app/heatmap/page.tsx && git commit -m "feat(heatmap): apply Template B header with time range filter"
```

---

## Task 7: Update Arena (PvP) Page — Template C Header

**Files:**
- Modify: `renderer/src/components/PvP/PvPHub.tsx`

- [ ] **Step 1: Add PageHeader import**

At the top of `renderer/src/components/PvP/PvPHub.tsx`, add:

```tsx
import PageHeader from "@/components/PageHeader";
```

- [ ] **Step 2: Insert PageHeader at the top of the component's return**

In the return statement of `PvPHub`, wrap the existing content. Find the outermost `<div>` in the return and insert `PageHeader` as the first child:

```tsx
return (
  <div>
    <PageHeader
      icon={faSwords}
      title="Arena"
      subtitle="Challenge friends and climb the leaderboard"
      iconBg="bg-amber-400/10"
      iconColor="text-amber-400"
    />
    {/* existing content starts here */}
    ...
  </div>
);
```

The `faSwords` icon is already imported in the file from `@fortawesome/pro-duotone-svg-icons`.

- [ ] **Step 3: Type-check**

```bash
cd /Users/kochie/projects/touch-typer/touch-type && pnpm type-check
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
cd /Users/kochie/projects/touch-typer/touch-type && git add renderer/src/components/PvP/PvPHub.tsx && git commit -m "feat(pvp): apply Template C header to Arena page"
```

---

## Task 8: Update AI Assistant — Template C Header

**Files:**
- Modify: `renderer/src/app/assistant/client.tsx`

- [ ] **Step 1: Add imports**

In `renderer/src/app/assistant/client.tsx`, add these imports:

```tsx
import PageHeader from "@/components/PageHeader";
import { faMicrochipAi } from "@fortawesome/pro-regular-svg-icons";
```

- [ ] **Step 2: Insert PageHeader**

In the return statement of `ClientAssistant` (the main exported component in this file), wrap the existing outermost `<div>` and insert `PageHeader` as the first child:

```tsx
return (
  <div>
    <PageHeader
      icon={faMicrochipAi}
      title="AI Assistant"
      subtitle="Personalized coaching based on your sessions"
      iconBg="bg-violet-400/10"
      iconColor="text-violet-400"
    />
    {/* existing component content */}
    ...
  </div>
);
```

- [ ] **Step 3: Type-check**

```bash
cd /Users/kochie/projects/touch-typer/touch-type && pnpm type-check
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
cd /Users/kochie/projects/touch-typer/touch-type && git add renderer/src/app/assistant/client.tsx && git commit -m "feat(ai): apply Template C header to AI Assistant page"
```

---

## Task 9: Redesign Streak Page — Template C

**Files:**
- Modify: `renderer/src/app/streak/page.tsx`

- [ ] **Step 1: Rewrite streak page**

Replace the entire contents of `renderer/src/app/streak/page.tsx` with:

```tsx
"use client";

import { Suspense } from "react";
import PageHeader from "@/components/PageHeader";
import { faFire } from "@fortawesome/pro-duotone-svg-icons";
import { faSnowflake } from "@fortawesome/pro-regular-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useStreak } from "@/lib/streak_hook";
import { usePlan } from "@/lib/plan_hook";
import ActivityCalendar from "@/components/ActivityCalendar";
import clsx from "clsx";
import Link from "next/link";

const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

function StreakPageInner() {
  const {
    currentStreak,
    longestStreak,
    isAtRisk,
    freezesAvailable,
    isPremium,
    isLoading,
  } = useStreak();
  const plan = usePlan();

  // Build a week indicator: which days this week are "done"
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 = Sunday
  // Map Sunday=0 to index 6, Monday=1 to index 0, etc.
  const todayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

  if (isLoading) {
    return (
      <div className="px-6 animate-pulse space-y-4">
        <div className="h-40 bg-slate-100 dark:bg-white/5 rounded-xl" />
        <div className="h-24 bg-slate-100 dark:bg-white/5 rounded-xl" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        icon={faFire}
        title="Streak"
        subtitle="Keep the fire alive — practice every day"
        iconBg="bg-orange-400/10"
        iconColor="text-orange-400"
      />

      <div className="px-6 grid grid-cols-2 gap-4 max-w-3xl">
        {/* Streak hero */}
        <div className="bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.06] rounded-xl p-6 flex flex-col items-center text-center">
          <FontAwesomeIcon
            icon={faFire}
            className={clsx(
              "w-10 h-10 mb-2",
              isAtRisk ? "text-orange-500 animate-pulse" : "text-orange-400"
            )}
          />
          <div className="text-5xl font-extrabold text-orange-400 leading-none">
            {currentStreak}
          </div>
          <div className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mt-1">
            day streak
          </div>

          {/* Week dots */}
          <div className="flex gap-2 mt-4">
            {DAY_LABELS.map((label, i) => (
              <div
                key={i}
                className={clsx(
                  "w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold uppercase",
                  i === todayIndex
                    ? "bg-orange-400 text-white"
                    : i < todayIndex
                    ? "bg-orange-400/20 text-orange-400"
                    : "bg-slate-100 dark:bg-white/[0.04] text-slate-400 dark:text-slate-600 border border-slate-200 dark:border-white/[0.06]"
                )}
              >
                {label}
              </div>
            ))}
          </div>

          {isAtRisk && (
            <p className="text-xs text-orange-500 mt-3">
              Practice today to keep your streak!
            </p>
          )}
        </div>

        {/* Streak freezes */}
        <div className="bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.06] rounded-xl p-5">
          <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2">
            Streak Freezes
          </div>
          <div className="text-3xl font-extrabold text-sky-400 leading-none mb-1">
            {freezesAvailable}
          </div>
          <div className="text-xs text-slate-400 dark:text-slate-500 mb-4">available</div>

          <div className="flex gap-2 flex-wrap mb-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className={clsx(
                  "w-8 h-8 rounded-lg flex items-center justify-center text-sm",
                  i < (freezesAvailable ?? 0)
                    ? "bg-sky-400/15 border border-sky-400/30 text-sky-400"
                    : "bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.06] text-slate-300 dark:text-slate-700 opacity-50"
                )}
              >
                <FontAwesomeIcon icon={faSnowflake} className="w-3.5 h-3.5" />
              </div>
            ))}
          </div>

          {isPremium ? (
            <Link
              href="/settings"
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg border-dashed border-2 border-slate-200 dark:border-white/[0.08] text-xs font-semibold text-slate-400 dark:text-slate-500 hover:border-sky-400/40 hover:text-sky-400 transition-colors duration-150"
            >
              <span>+</span>
              <span>Get more freezes</span>
            </Link>
          ) : (
            <Link
              href="/settings"
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-sky-400/10 border border-sky-400/30 text-xs font-semibold text-sky-400 hover:bg-sky-400/15 transition-colors duration-150"
            >
              Upgrade for freezes
            </Link>
          )}
        </div>

        {/* Longest streak */}
        <div className="bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.06] rounded-xl p-5">
          <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2">
            Best Streak
          </div>
          <div className="text-4xl font-extrabold text-orange-400 leading-none">
            {longestStreak}
          </div>
          <div className="text-xs text-slate-400 dark:text-slate-500 mt-1">days — all time best</div>
        </div>

        {/* Activity calendar */}
        <div className="bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.06] rounded-xl p-5">
          <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3">
            Activity
          </div>
          <ActivityCalendar />
        </div>
      </div>
    </div>
  );
}

export default function StreakPage() {
  return (
    <Suspense>
      <StreakPageInner />
    </Suspense>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
cd /Users/kochie/projects/touch-typer/touch-type && pnpm type-check
```

If there are type errors related to `ActivityCalendar` props, check the component signature at `renderer/src/components/ActivityCalendar/index.tsx` and adjust the usage accordingly.

- [ ] **Step 3: Commit**

```bash
cd /Users/kochie/projects/touch-typer/touch-type && git add renderer/src/app/streak/page.tsx && git commit -m "feat(streak): redesign streak page with Template C header and freeze display"
```

---

## Task 10: Update Settings Page — Template C Header + Left Nav

**Files:**
- Modify: `renderer/src/components/settings/settings.tsx`

The existing `settings.tsx` has no left nav — it's one long scrollable page. This task adds a `PageHeader` and a left category nav that controls which section is visible.

- [ ] **Step 1: Add imports to settings.tsx**

At the top of `renderer/src/components/settings/settings.tsx`, add:

```tsx
import PageHeader from "@/components/PageHeader";
import { faGear } from "@fortawesome/free-solid-svg-icons";
import { useState } from "react"; // if not already imported
```

Note: `useState` may already be imported. Check and avoid duplicating the import.

- [ ] **Step 2: Define the settings categories**

Inside the `Settings` component (before the return statement), add:

```tsx
type SettingsCategory =
  | "appearance"
  | "keyboard"
  | "practice"
  | "notifications"
  | "account"
  | "about";

const SETTINGS_CATEGORIES: { id: SettingsCategory; label: string }[] = [
  { id: "appearance", label: "Appearance" },
  { id: "keyboard", label: "Keyboard" },
  { id: "practice", label: "Practice & Code" },
  { id: "notifications", label: "Notifications" },
  { id: "account", label: "Account" },
  { id: "about", label: "About" },
];

const [activeCategory, setActiveCategory] =
  useState<SettingsCategory>("appearance");
```

- [ ] **Step 3: Replace the return statement**

The existing return in `settings.tsx` is a long scrollable form. Replace it entirely with the following. The existing sub-components (`NotificationSettings`, `CalendarSettings`, `StartupSettings`, `DebugSettings`, `CodeSettings`) are reused within the category panels — map each to its category as shown:

```tsx
return (
  <div>
    <PageHeader
      icon={faGear}
      title="Settings"
      subtitle="Customize your Touch Typer experience"
      iconBg="bg-slate-400/10"
      iconColor="text-slate-400 dark:text-slate-300"
    />

    <div className="px-6 pb-8 flex gap-6 max-w-5xl">
      {/* Left category nav */}
      <nav className="w-44 flex-shrink-0 flex flex-col gap-0.5 pt-1">
        {SETTINGS_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={clsx(
              "text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-150",
              activeCategory === cat.id
                ? "bg-sky-400/10 text-sky-400"
                : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.04] hover:text-slate-700 dark:hover:text-slate-200"
            )}
          >
            {cat.label}
          </button>
        ))}
      </nav>

      {/* Right panel */}
      <div className="flex-1 min-w-0">
        {activeCategory === "appearance" && <AppearanceSettings />}
        {activeCategory === "keyboard" && <KeyboardSettingsPanel />}
        {activeCategory === "practice" && <PracticeSettingsPanel />}
        {activeCategory === "notifications" && <NotificationSettings />}
        {activeCategory === "account" && <AccountPanel />}
        {activeCategory === "about" && <AboutPanel />}
      </div>
    </div>
  </div>
);
```

- [ ] **Step 4: Extract the existing settings sections into panel components**

The current `settings.tsx` return block has these sections (in order):
- **Form 1** (grid column 1): `KeyboardSelect`, Level `<Select>`, Language `<Select>`, Punctuation `<SettingsSwitch>`, Numbers `<SettingsSwitch>`, Capital `<SettingsSwitch>`
- **Form 2** (grid column 2): Analytics `<SettingsSwitch>`, WhatsNew `<SettingsSwitch>`, Theme `<Select>`, PublishToLeaderboard `<SettingsSwitch>`, Blinker `<SettingsSwitch>`
- **Code section**: `<CodeSettings />`
- **Scheduling section**: `<NotificationSettings />`, `<CalendarSettings />`
- **Startup section**: `<StartupSettings />`
- **Debug section**: `<DebugSettings />`

Map these to category panels as follows. Define each as a local function component directly inside `settings.tsx` (after the `Settings` component), calling `useSettings()` and `useSettingsDispatch()` inside each:

```tsx
function AppearanceSettings() {
  const settings = useSettings();
  const dispatchSettings = useSettingsDispatch();
  return (
    <div className="space-y-6">
      {/* Theme */}
      <Field as="div" className="flex items-center justify-between">
        <span className="flex flex-grow flex-col">
          <Label>Theme</Label>
          <Description as="span" className="text-sm text-gray-500">Choose the color scheme of the app.</Description>
        </span>
        <Select
          className={clsx("block w-28 appearance-none rounded-lg border-none bg-white/5 py-1.5 px-3 text-sm/6 text-white focus:outline-none *:text-black")}
          value={settings.theme}
          onChange={(e) => dispatchSettings({ type: "CHANGE_COLOR_SCHEME", colorScheme: e.target.value as ColorScheme })}
        >
          <option value={ColorScheme.DARK}>Dark</option>
          <option value={ColorScheme.LIGHT}>Light</option>
          <option value={ColorScheme.SYSTEM}>System</option>
        </Select>
      </Field>
      <SettingsSwitch
        enabled={settings.analytics}
        setEnabled={(enabled) => {
          enabled ? Fathom.enableTrackingForMe() : Fathom.blockTrackingForMe();
          dispatchSettings({ type: "SET_ANALYTICS", analytics: enabled });
        }}
        label="Analytics"
        description="Send telemetry data about usage back to developers."
      />
      <SettingsSwitch
        enabled={settings.whatsNewOnStartup}
        setEnabled={(enabled) => dispatchSettings({ type: "SET_WHATS_NEW", whatsnew: enabled })}
        label="Show What's New on Startup"
        description="Show the What's New message when the app starts."
      />
      <SettingsSwitch
        enabled={settings.publishToLeaderboard}
        setEnabled={(enabled) => dispatchSettings({ type: "SET_PUBLISH_TO_LEADERBOARD", publishToLeaderboard: enabled })}
        label="Publish to Leaderboard"
        description="Publish results to the public leaderboard."
      />
      <SettingsSwitch
        enabled={settings.blinker}
        setEnabled={(enabled) => dispatchSettings({ type: "SET_BLINKER", blinker: enabled })}
        label="Blinker"
        description="Blink the key being typed."
      />
    </div>
  );
}

function KeyboardSettingsPanel() {
  const settings = useSettings();
  const dispatchSettings = useSettingsDispatch();
  return (
    <div className="space-y-6">
      <KeyboardSelect />
      <Field as="div" className="flex items-center justify-between">
        <span className="flex flex-grow flex-col">
          <Label>Language</Label>
          <Description as="span" className="text-sm text-gray-500">Choose the keyboard of the words to type.</Description>
        </span>
        <Select
          className={clsx("block w-28 appearance-none rounded-lg border-none bg-white/5 py-1.5 px-3 text-sm/6 text-white focus:outline-none *:text-black")}
          value={settings.language}
          onChange={(e) => dispatchSettings({ type: "CHANGE_LANGUAGE", language: e.target.value as Languages })}
        >
          {languages.map((language) => (
            <option key={language.value} value={language.value}>{language.label}</option>
          ))}
        </Select>
      </Field>
    </div>
  );
}

function PracticeSettingsPanel() {
  const settings = useSettings();
  const dispatchSettings = useSettingsDispatch();
  return (
    <div className="space-y-6">
      <Field as="div" className="flex items-center justify-between">
        <span className="flex flex-grow flex-col">
          <Label>Level</Label>
          <Description as="span" className="text-sm text-gray-500 mr-3">Choose the level of difficulty of the words to type.</Description>
        </span>
        <Select
          className={clsx("block w-28 appearance-none rounded-lg border-none bg-white/5 py-1.5 px-3 text-sm/6 text-white focus:outline-none *:text-black")}
          value={settings.levelName}
          onChange={(e) => dispatchSettings({ type: "CHANGE_LEVEL", levelName: e.target.value as Levels })}
        >
          {levels.map((level) => (
            <option key={level.value} value={level.value}>{level.label}</option>
          ))}
        </Select>
      </Field>
      <SettingsSwitch
        enabled={settings.punctuation}
        setEnabled={(enabled) => dispatchSettings({ type: "SET_PUNCTUATION", punctuation: enabled })}
        label="Punctuation"
        description="Include punctuation in the words to type."
      />
      <SettingsSwitch
        enabled={settings.numbers}
        setEnabled={(enabled) => dispatchSettings({ type: "SET_NUMBERS", numbers: enabled })}
        label="Numbers"
        description="Include numbers in the words to type."
      />
      <SettingsSwitch
        enabled={settings.capital}
        setEnabled={(enabled) => dispatchSettings({ type: "SET_CAPITAL", capital: enabled })}
        label="Capital"
        description="Include capital letters in the words to type."
      />
      <hr className="border-slate-200 dark:border-white/10" />
      <CodeSettings />
    </div>
  );
}

function AccountPanel() {
  return (
    <div className="space-y-6">
      <CalendarSettings />
      <StartupSettings />
    </div>
  );
}

function AboutPanel() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500 dark:text-slate-400">Touch Typer — debug and diagnostic options.</p>
      <DebugSettings />
    </div>
  );
}
```

The `NotificationSettings` component is already imported and used directly (`activeCategory === "notifications" && <NotificationSettings />`), so no wrapper is needed for that category.

- [ ] **Step 5: Type-check**

```bash
cd /Users/kochie/projects/touch-typer/touch-type && pnpm type-check
```

Fix any type errors before continuing. Common issues: missing imports, `useSettings`/`useSettingsDispatch` not in scope inside local components (pass them as props if needed, or call the hooks directly inside each panel component — hooks are valid in local function components inside a file).

- [ ] **Step 6: Visual check — start renderer**

```bash
cd /Users/kochie/projects/touch-typer/touch-type && pnpm dev:next
```

Navigate to `/settings`. Verify:
- PageHeader with gear icon appears at top
- Left nav shows six category buttons
- Clicking each category switches the right panel content
- Existing settings controls (keyboard select, language, notification toggles) still render and function

- [ ] **Step 7: Commit**

```bash
cd /Users/kochie/projects/touch-typer/touch-type && git add renderer/src/components/settings/settings.tsx && git commit -m "feat(settings): apply Template C header and left category navigation"
```

---

## Final Verification

- [ ] **Run type-check one last time**

```bash
cd /Users/kochie/projects/touch-typer/touch-type && pnpm type-check
```

Expected: zero errors.

- [ ] **Start full Electron dev build and walk all routes**

```bash
cd /Users/kochie/projects/touch-typer/touch-type && pnpm dev
```

Walk through every nav item and confirm:
- Stats (`/stats`): PageHeader visible, keyboard + time range filter rendered
- Map (`/heatmap`): PageHeader visible, keyboard + time range filter rendered
- Practice (`/`): unchanged, no code editor visible
- Code (`/code`): Code PageHeader + language pills + editor chrome
- AI (`/assistant`): PageHeader visible
- Arena (`/pvp`): PageHeader visible
- Streak (`/streak`): flame hero + freeze pills + activity calendar
- Settings (`/settings`): left nav + 6 categories functional

- [ ] **Final commit**

```bash
cd /Users/kochie/projects/touch-typer/touch-type && git add -p && git commit -m "chore: final verification pass — UI/UX redesign complete"
```
