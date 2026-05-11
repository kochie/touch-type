# AI Analytics Feature — Design Spec

**Date:** 2026-05-11  
**Status:** Approved  
**Scope:** Premium feature — requires `billing_plan = 'premium'`  
**AI provider:** Anthropic Claude (parallel to existing OpenAI integration — `recommendations` function unchanged in this spec)

---

## Overview

A keystroke-level AI analytics dashboard for premium Touch Typer users. Claude analyses each user's raw `key_presses` data weekly and stores structured insights in a new `ai_insights` table. The dashboard reads from that table — page loads are instant. Users can also trigger an on-demand refresh. An optional weekly email delivers either a full digest (active users) or a re-engagement nudge (inactive users).

---

## 1. Data Model

### New table: `ai_insights`

```sql
CREATE TABLE public.ai_insights (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  generated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  week_start       DATE NOT NULL,               -- Monday of the analysed week
  summary          TEXT NOT NULL,               -- natural-language prose from Claude
  insight_cards    JSONB NOT NULL DEFAULT '[]', -- InsightCard[]
  heatmap_data     JSONB NOT NULL DEFAULT '[]', -- HeatmapKey[]
  sessions_count   INTEGER NOT NULL DEFAULT 0,  -- sessions analysed
  model_version    TEXT NOT NULL,               -- e.g. "claude-sonnet-4-6"
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, week_start)
);

ALTER TABLE public.ai_insights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own insights" ON public.ai_insights
  FOR SELECT USING (auth.uid() = user_id);
-- Edge function writes via service role key — no INSERT policy needed for users
```

**JSONB shapes:**

```ts
// insight_cards
interface InsightCard {
  category: 'speed' | 'accuracy' | 'ergonomics' | 'practice' | 'rhythm';
  title: string;
  body: string;
  metric: string;   // e.g. "94 WPM"
  delta: string;    // e.g. "+8% vs last week" | "" if no prior data
}

// heatmap_data
interface HeatmapKey {
  key: string;       // e.g. "e", "shift", "backspace"
  avg_ms: number;    // average ms between this key and previous keypress
  error_rate: number; // 0–1
  count: number;     // total presses this week
}
```

### Settings change

Add `ai_weekly_email BOOLEAN DEFAULT false` column to the existing `public.settings` table (the canonical user-preferences table — already has `analytics`, `theme`, etc.).

---

## 2. Edge Function: `generate-ai-insights`

**Location:** `touch-type-backend/supabase/functions/generate-ai-insights/index.ts`

### Triggers

| Trigger | Mechanism |
|---|---|
| Weekly scheduled run | Supabase pg_cron — Monday 06:00 UTC, processes all premium users with new sessions |
| On-demand refresh | Direct invocation from renderer via `supabase.functions.invoke('generate-ai-insights', { body: { force: true } })` |

### Processing steps

1. Authenticate user (JWT for on-demand; service role for cron)
2. Check premium status via `checkPremium()` — return 403 if not premium
3. For cron: skip users with no new sessions since `generated_at` of their last insight (unless `force: true`)
4. Fetch sessions from the current ISO week (Monday 00:00 UTC → Sunday 23:59 UTC): `results` joined with `key_presses`
5. Aggregate keystroke stats:
   - Per-key: `avg_ms`, `error_rate`, `count`
   - Per-bigram: top 10 slowest pairs
   - Per-finger: load distribution (left/right, per finger)
   - Session-level: avg WPM, accuracy, practice minutes, consistency score
6. Fetch prior week's `ai_insights` row for delta calculations
7. Call Claude — see prompt caching strategy below
8. Parse Claude's structured JSON response
9. Upsert into `ai_insights` on `(user_id, week_start)`
10. If `ai_weekly_email = true`: invoke `send-notifications` with appropriate template

### Claude prompt caching strategy

Four message layers, outermost cached longest:

```
┌─ SYSTEM (cache_control: ephemeral on this block) ──────────────────┐
│  Typing coach persona. Output schema definition. Category           │
│  definitions. Identical for all users — maximum cache reuse.        │
└────────────────────────────────────────────────────────────────────┘
┌─ USER: keystroke schema (cached) ──────────────────────────────────┐
│  Explanation of key_presses JSONB shape, metric definitions,        │
│  how avg_ms and error_rate are computed.                            │
└────────────────────────────────────────────────────────────────────┘
┌─ USER: historical baseline (cached per user, stable week-to-week) ─┐
│  Prior week's aggregated stats for delta comparison.                │
└────────────────────────────────────────────────────────────────────┘
┌─ USER: this week's sessions (NOT cached — changes every call) ─────┐
│  Current week's aggregated keystroke stats.                         │
└────────────────────────────────────────────────────────────────────┘
```

`cache_control: { type: 'ephemeral' }` applied to the system prompt and keystroke schema blocks. The historical baseline block is also marked for caching but is per-user so cache hits occur on refresh, not cross-user.

### Claude output schema (via tool use)

```json
{
  "summary": "2–4 paragraph coaching prose in second person",
  "insight_cards": [
    {
      "category": "speed | accuracy | ergonomics | practice | rhythm",
      "title": "string — one line",
      "body": "string — 2–3 sentences",
      "metric": "string — e.g. '94 WPM'",
      "delta": "string — e.g. '+8% vs last week' or '' if no prior data"
    }
  ],
  "heatmap_data": [
    { "key": "string", "avg_ms": "number", "error_rate": "number", "count": "number" }
  ]
}
```

Claude is called with `tool_use` forcing this schema — no prompt-based JSON extraction.

---

## 3. Email Templates

Two templates in `supabase/templates/`:

### `ai_digest.html` — sent when `sessions_count >= 3`
- Subject: "Your Touch Typer weekly report"
- Contains: insight cards (top 3), summary prose, CTA back to app
- Tone: celebratory / reinforcing

### `ai_nudge.html` — sent when `sessions_count < 3` (or 0)
- Subject: "Time to practice — your coach has a tip"
- Contains: one top tip from the user's most recent stored `ai_insights` row (no Claude call needed), plus a CTA back into the app
- Tone: encouraging / re-engaging

Email dispatch logic lives inside `generate-ai-insights`. For inactive users (fewer than 3 sessions this week), Claude is **not called** — the function reads the most recent existing `ai_insights` row and dispatches the nudge template directly. For active users, Claude runs, `sessions_count` is written, then the digest template is dispatched.

---

## 4. Dashboard UI

**File:** `touch-type/renderer/src/app/assistant/client.tsx` — existing logged-in render path is replaced.

### Layout (top to bottom)

**PageHeader** — existing component, `headerRight` slot contains the Refresh button.

**Zone 1: Insight Cards**
- Responsive grid: 2 columns standard, 1 column narrow
- Up to 5 cards (one per category, omit categories with no insight)
- Each card: category icon + colour (existing palette), title, body, large metric, delta badge
  - Delta badge: green with ↑ for positive, red with ↓ for negative, grey for no prior data

**Zone 2: Natural Language Summary**
- Prose block below cards
- First load: fade-in animation
- After Refresh: typewriter effect (character-by-character reveal)
- Attribution line: "Analysis by Claude · Week of May 6"

**Zone 3: Keyboard Heatmap**
- Visual keyboard layout, each key colour-graded by `avg_ms` (cool blue = fast → warm red = slow)
- `error_rate` shown as a subtle red intensity overlay
- Click a key → popover showing exact avg ms, error rate, session count
- Reuse `HeatmapCanvas` if suitable, otherwise inline SVG keyboard

### Loading & empty states

| State | UI |
|---|---|
| No insights yet (new user) | Prompt card: "Your first analysis will run tonight, or tap Refresh now." |
| Refresh in progress | Cards skeleton + pulsing "Analysing your sessions…" with spinner |
| Not enough data this week | Summary explains low data, encourages a practice session |

### Refresh button

- Lives in `PageHeader` `headerRight`
- Disabled + spinner while running
- Uses Supabase Realtime subscription on `ai_insights` to detect when the upserted row arrives — no polling

### Settings

- New "AI Assistant" section in the existing Settings page
- Single toggle: "Weekly email report" → writes `ai_weekly_email` to settings

---

## 5. Migration path for existing OpenAI integration

The existing `recommendations` edge function currently calls OpenAI for premium users. This feature introduces a parallel Claude-based system — the `recommendations` function is **not changed** as part of this spec. Once `ai_insights` is live and stable, `recommendations` and `goals` can be updated to read from `ai_insights` instead of calling OpenAI on demand. That is out of scope here.

---

## 6. Out of scope

- Changing the existing `recommendations` or `goals` edge functions
- Week-over-week trend charts (can be added once `ai_insights` has multi-week data)
- In-app conversational chat with Claude
- Non-premium users seeing any part of this UI (they see the existing feature showcase)
