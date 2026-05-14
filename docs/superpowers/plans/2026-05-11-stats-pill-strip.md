# Stats Pill Strip Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the three tall vertical stat cards with a single unified horizontal pill strip that saves vertical space and makes icons the primary identifier.

**Architecture:** Pure JSX/CSS swap inside `Tracker/index.tsx` — no logic changes, no new files. The existing `showChange`, `effectiveCodeMode`, and diff variables are all preserved; only the rendering markup changes. The delta row is always rendered but `invisible` when `showChange` is false, so the pill height never jumps between states.

**Tech Stack:** React, Tailwind CSS v4, FontAwesome Pro, clsx

---

### Task 1: Replace the stats row markup

**Files:**
- Modify: `renderer/src/components/Tracker/index.tsx:476-548`

This is a visual-only change. No logic, no new components.

- [ ] **Step 1: Open the file and locate the stats row**

The block to replace runs from line 476 to line 548 (the closing `</div>` of the outer stats wrapper). It currently reads:

```tsx
      {/* Stats row */}
      <div className="flex gap-3 justify-center pt-6 font-mono mx-auto min-w-[760px] max-w-[860px] px-4">
        {/* Typos card */}
        <div className="flex-1 flex flex-col items-center gap-1 py-4 px-3 rounded-xl bg-slate-100 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.05]">
          ...three separate vertical cards...
        </div>
      </div>
```

- [ ] **Step 2: Replace the entire stats row block with the pill strip**

Replace lines 475–548 with:

```tsx
      {/* Stats pill strip */}
      <div className="flex justify-center pt-6 font-mono">
        <div className="flex w-[620px] rounded-2xl overflow-hidden bg-white/[0.03] border border-white/[0.07]">

          {/* Typos */}
          <div className="flex flex-1 items-center justify-center gap-3 py-3 px-5">
            <FontAwesomeIcon
              icon={effectiveCodeMode ? faCode : faDungeon}
              className="text-slate-600 dark:text-slate-600 text-lg flex-shrink-0"
            />
            <span className="text-3xl font-bold tabular-nums text-slate-100">
              {incorrect}
            </span>
            <div className="flex flex-col gap-0.5">
              <span
                className={clsx(
                  "text-[11px] font-semibold tabular-nums leading-none",
                  showChange && !currentRace
                    ? typoDiff <= 0
                      ? "text-green-400"
                      : "text-red-400"
                    : "invisible",
                )}
              >
                {sign(typoDiff)}{typoDiff}
              </span>
              <span className="text-[9px] uppercase tracking-widest text-gray-800 font-semibold leading-none">
                typos
              </span>
            </div>
          </div>

          {/* Speed */}
          <div className="flex flex-1 items-center justify-center gap-3 py-3 px-5 border-x border-white/[0.07]">
            <FontAwesomeIcon
              icon={faPersonRunning}
              className="text-slate-600 dark:text-slate-600 text-lg flex-shrink-0"
            />
            <span className="text-3xl font-bold tabular-nums text-slate-100">
              {Number.isFinite(cpm) ? cpm.toFixed(0) : 0}
            </span>
            <div className="flex flex-col gap-0.5">
              <span
                className={clsx(
                  "text-[11px] font-semibold tabular-nums leading-none",
                  showChange && !currentRace
                    ? cpmDiff >= 0
                      ? "text-green-400"
                      : "text-red-400"
                    : "invisible",
                )}
              >
                {sign(cpmDiff)}{cpmDiff.toFixed(0)}
              </span>
              <span className="text-[9px] uppercase tracking-widest text-gray-800 font-semibold leading-none">
                char/min
              </span>
            </div>
          </div>

          {/* Accuracy */}
          <div className="flex flex-1 items-center justify-center gap-3 py-3 px-5">
            <FontAwesomeIcon
              icon={faPercentage}
              className="text-slate-600 dark:text-slate-600 text-lg flex-shrink-0"
            />
            <span className="text-3xl font-bold tabular-nums text-slate-100">
              {Number.isFinite(p) ? p.toFixed(0) : 0}
            </span>
            <div className="flex flex-col gap-0.5">
              <span
                className={clsx(
                  "text-[11px] font-semibold tabular-nums leading-none",
                  showChange && !currentRace
                    ? accuracyDiff >= 0
                      ? "text-green-400"
                      : "text-red-400"
                    : "invisible",
                )}
              >
                {sign(accuracyDiff)}{(accuracyDiff * 100).toFixed(1)}%
              </span>
              <span className="text-[9px] uppercase tracking-widest text-gray-800 font-semibold leading-none">
                accuracy
              </span>
            </div>
          </div>

        </div>
      </div>
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd /Users/kochie/projects/touch-typer/touch-type
pnpm type-check
```

Expected: no errors.

- [ ] **Step 4: Start the renderer and visually verify**

```bash
pnpm dev:next
```

Open `http://localhost:3000` in a browser (renderer-only mode). Check:
- Pill strip is visible, centered, 620px wide
- Three equal sections with dividers between Speed and the others
- Delta row is invisible on load
- Complete a round — delta values appear with correct colours (red for typos increase, green for speed increase)
- Code mode: dungeon icon swaps to code icon

- [ ] **Step 5: Commit**

```bash
cd /Users/kochie/projects/touch-typer/touch-type
git add renderer/src/components/Tracker/index.tsx
git commit -m "feat: replace stats cards with unified pill strip"
```
