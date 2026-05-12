# AI Analytics Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a keystroke-level AI analytics dashboard for premium users — Claude analyses per-keypress timing data weekly, stores structured insights, and the app renders insight cards, a natural-language summary, and a keyboard heatmap.

**Architecture:** A new `generate-ai-insights` Supabase edge function aggregates raw `key_presses` JSONB data, calls Claude with prompt caching, and upserts results into a new `ai_insights` table. The renderer reads that table via a Supabase Realtime subscription and renders three zones: insight cards, a typewriter summary, and a keyboard heatmap. The heatmap is built on a shared `KeyboardCanvas` component — a purely presentational canvas renderer that takes `keyboardName` + a `colorMap` — used by both the new `InsightHeatmap` and the existing `HeatmapCanvas`. A settings toggle controls the optional weekly digest email.

**Tech Stack:** Deno edge functions, Anthropic SDK (`npm:@anthropic-ai/sdk`), Supabase Postgres + Realtime, Next.js App Router, Tailwind v4, FontAwesome Pro, Headless UI.

---

## File Map

### Backend (`touch-type-backend/`)
| File | Action | Responsibility |
|---|---|---|
| `supabase/migrations/20260511100000_add_ai_insights.sql` | Create | `ai_insights` table + `ai_weekly_email` column on `settings` |
| `supabase/functions/_shared/anthropic.ts` | Create | Anthropic client singleton, `generateAiInsights()`, shared types |
| `supabase/functions/_shared/aggregate-keystrokes.ts` | Create | Pure function: raw `key_presses` JSONB → `KeystrokeStats` |
| `supabase/functions/generate-ai-insights/index.ts` | Create | Edge function: auth, premium check, aggregate, call Claude, upsert, email |
| `supabase/templates/ai_digest.html` | Create | Weekly digest email (active users) |
| `supabase/templates/ai_nudge.html` | Create | Re-engagement nudge email (inactive users) |

### Frontend (`touch-type/renderer/src/`)
| File | Action | Responsibility |
|---|---|---|
| `types/ai-insights.ts` | Create | Shared TS types: `InsightCard`, `HeatmapKey`, `AiInsight` |
| `transactions/getAiInsights.ts` | Create | Fetch most recent `ai_insights` row from DB |
| `transactions/refreshAiInsights.ts` | Create | Invoke edge function + wait for Realtime update |
| `components/AiAssistant/InsightCard.tsx` | Create | Single insight card (icon, title, body, metric, delta badge) |
| `components/AiAssistant/InsightSummary.tsx` | Create | Prose block with typewriter animation on refresh |
| `components/KeyboardCanvas/index.tsx` | Create | Shared presentational canvas: `keyboardName` + `colorMap` → coloured keyboard |
| `components/HeatmapCanvas/index.tsx` | Modify | Refactor to use `KeyboardCanvas` for rendering; keep data logic |
| `components/AiAssistant/InsightHeatmap.tsx` | Create | Computes `colorMap` from `avg_ms`, reads keyboard from settings, renders via `KeyboardCanvas` |
| `app/assistant/client.tsx` | Modify | Replace logged-in render path with new dashboard |
| `lib/settings_hook.tsx` | Modify | Add `aiWeeklyEmail` to settings state, action, reducer, DB sync |
| `components/settings/AiAssistantSettings.tsx` | Create | "AI Assistant" settings panel with email toggle |
| `components/settings/settings.tsx` | Modify | Add "ai" category + `AiAssistantSettings` panel |

---

## Task 1: Database Migration

**Files:**
- Create: `touch-type-backend/supabase/migrations/20260511100000_add_ai_insights.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- touch-type-backend/supabase/migrations/20260511100000_add_ai_insights.sql

-- ── ai_insights table ──────────────────────────────────────────────────────
CREATE TABLE public.ai_insights (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  generated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  week_start       DATE NOT NULL,
  summary          TEXT NOT NULL DEFAULT '',
  insight_cards    JSONB NOT NULL DEFAULT '[]'::jsonb,
  heatmap_data     JSONB NOT NULL DEFAULT '[]'::jsonb,
  sessions_count   INTEGER NOT NULL DEFAULT 0,
  model_version    TEXT NOT NULL DEFAULT '',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ai_insights_user_week_unique UNIQUE (user_id, week_start)
);

ALTER TABLE public.ai_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own ai_insights"
  ON public.ai_insights FOR SELECT
  USING (auth.uid() = user_id);

-- Edge function writes via service role — no INSERT/UPDATE policy needed for users.

-- Enable Realtime so the renderer can subscribe for refresh completion
ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_insights;

-- ── ai_weekly_email on settings ────────────────────────────────────────────
ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS ai_weekly_email BOOLEAN NOT NULL DEFAULT false;
```

- [ ] **Step 2: Apply migration to local Supabase**

```bash
cd touch-type-backend && supabase db reset
```

Expected: migration applies without errors, `ai_insights` table visible in Studio at http://localhost:54323.

- [ ] **Step 3: Verify table exists**

```bash
psql postgresql://postgres:postgres@localhost:54322/postgres \
  -c "\d public.ai_insights"
```

Expected: shows all 10 columns including `week_start`, `insight_cards`, `heatmap_data`.

- [ ] **Step 4: Commit**

```bash
cd touch-type-backend
git add supabase/migrations/20260511100000_add_ai_insights.sql
git commit -m "feat: add ai_insights table and ai_weekly_email setting"
```

---

## Task 2: Shared Types (`types/ai-insights.ts`)

**Files:**
- Create: `touch-type/renderer/src/types/ai-insights.ts`

- [ ] **Step 1: Create the types file**

```typescript
// touch-type/renderer/src/types/ai-insights.ts

export type InsightCategory =
  | 'speed'
  | 'accuracy'
  | 'ergonomics'
  | 'practice'
  | 'rhythm';

export interface InsightCard {
  category: InsightCategory;
  title: string;
  body: string;
  metric: string;   // e.g. "94 WPM"
  delta: string;    // e.g. "+8% vs last week" or "" if no prior data
}

export interface HeatmapKey {
  key: string;        // e.g. "e", "shift", "backspace"
  avg_ms: number;     // average ms to this key from previous keypress
  error_rate: number; // 0–1
  count: number;      // total presses this week
}

export interface AiInsight {
  id: string;
  user_id: string;
  generated_at: string;
  week_start: string;   // ISO date string "YYYY-MM-DD"
  summary: string;
  insight_cards: InsightCard[];
  heatmap_data: HeatmapKey[];
  sessions_count: number;
  model_version: string;
  created_at: string;
}
```

- [ ] **Step 2: Type-check**

```bash
cd touch-type && pnpm type-check
```

Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
cd touch-type
git add renderer/src/types/ai-insights.ts
git commit -m "feat: add AiInsight shared types"
```

---

## Task 3: Keystroke Aggregation Helper

**Files:**
- Create: `touch-type-backend/supabase/functions/_shared/aggregate-keystrokes.ts`

- [ ] **Step 1: Create the aggregation helper**

```typescript
// touch-type-backend/supabase/functions/_shared/aggregate-keystrokes.ts

export interface RawKeyPress {
  key: string;
  correct: boolean;
  timestamp?: number; // ms since epoch or ms into session
}

export interface KeyStat {
  key: string;
  avg_ms: number;
  error_rate: number;
  count: number;
}

export interface BigramStat {
  bigram: string;
  avg_ms: number;
  count: number;
}

export interface KeystrokeStats {
  per_key: KeyStat[];
  slowest_bigrams: BigramStat[];   // top 10 slowest by avg_ms
  session_count: number;
  avg_wpm: number;
  avg_accuracy: number;
  total_practice_minutes: number;
}

interface RawResult {
  cpm: number;
  correct: number;
  incorrect: number;
  time: string;        // ISO 8601 duration e.g. "PT2M30S"
  key_presses: RawKeyPress[];
}

function parseIsoDurationToMinutes(iso: string): number {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:([\d.]+)S)?/);
  if (!match) return 0;
  const h = parseFloat(match[1] || '0');
  const m = parseFloat(match[2] || '0');
  const s = parseFloat(match[3] || '0');
  return h * 60 + m + s / 60;
}

export function aggregateKeystrokes(results: RawResult[]): KeystrokeStats {
  if (results.length === 0) {
    return {
      per_key: [],
      slowest_bigrams: [],
      session_count: 0,
      avg_wpm: 0,
      avg_accuracy: 0,
      total_practice_minutes: 0,
    };
  }

  // Per-key stats
  const keyMap = new Map<string, { totalMs: number; errors: number; count: number }>();

  for (const result of results) {
    const presses = result.key_presses ?? [];
    for (let i = 1; i < presses.length; i++) {
      const prev = presses[i - 1];
      const curr = presses[i];
      const key = curr.key.toLowerCase();

      if (!keyMap.has(key)) keyMap.set(key, { totalMs: 0, errors: 0, count: 0 });
      const stat = keyMap.get(key)!;

      // Use timestamp delta if available
      if (curr.timestamp !== undefined && prev.timestamp !== undefined) {
        const delta = curr.timestamp - prev.timestamp;
        if (delta > 0 && delta < 5000) { // ignore outliers > 5s
          stat.totalMs += delta;
        }
      }
      stat.count += 1;
      if (!curr.correct) stat.errors += 1;
    }
  }

  const per_key: KeyStat[] = Array.from(keyMap.entries())
    .map(([key, s]) => ({
      key,
      avg_ms: s.count > 0 ? Math.round(s.totalMs / s.count) : 0,
      error_rate: s.count > 0 ? s.errors / s.count : 0,
      count: s.count,
    }))
    .sort((a, b) => b.avg_ms - a.avg_ms);

  // Bigram stats (consecutive key pairs)
  const bigramMap = new Map<string, { totalMs: number; count: number }>();

  for (const result of results) {
    const presses = result.key_presses ?? [];
    for (let i = 1; i < presses.length; i++) {
      const prev = presses[i - 1];
      const curr = presses[i];
      if (curr.timestamp === undefined || prev.timestamp === undefined) continue;
      const delta = curr.timestamp - prev.timestamp;
      if (delta <= 0 || delta >= 5000) continue;

      const bigram = `${prev.key.toLowerCase()}→${curr.key.toLowerCase()}`;
      if (!bigramMap.has(bigram)) bigramMap.set(bigram, { totalMs: 0, count: 0 });
      const bs = bigramMap.get(bigram)!;
      bs.totalMs += delta;
      bs.count += 1;
    }
  }

  const slowest_bigrams: BigramStat[] = Array.from(bigramMap.entries())
    .filter(([, s]) => s.count >= 3) // only bigrams with enough data
    .map(([bigram, s]) => ({
      bigram,
      avg_ms: Math.round(s.totalMs / s.count),
      count: s.count,
    }))
    .sort((a, b) => b.avg_ms - a.avg_ms)
    .slice(0, 10);

  const avg_wpm = results.reduce((sum, r) => sum + r.cpm, 0) / results.length;
  const avg_accuracy =
    results.reduce((sum, r) => {
      const total = r.correct + r.incorrect;
      return sum + (total > 0 ? r.correct / total : 1);
    }, 0) / results.length;
  const total_practice_minutes = results.reduce(
    (sum, r) => sum + parseIsoDurationToMinutes(r.time),
    0,
  );

  return {
    per_key,
    slowest_bigrams,
    session_count: results.length,
    avg_wpm: Math.round(avg_wpm),
    avg_accuracy: Math.round(avg_accuracy * 100) / 100,
    total_practice_minutes: Math.round(total_practice_minutes),
  };
}
```

- [ ] **Step 2: Commit**

```bash
cd touch-type-backend
git add supabase/functions/_shared/aggregate-keystrokes.ts
git commit -m "feat: add keystroke aggregation helper"
```

---

## Task 4: Anthropic Shared Helper

**Files:**
- Create: `touch-type-backend/supabase/functions/_shared/anthropic.ts`

- [ ] **Step 1: Create the Anthropic helper**

```typescript
// touch-type-backend/supabase/functions/_shared/anthropic.ts
import Anthropic from 'npm:@anthropic-ai/sdk@0.39.0';
import type { KeystrokeStats } from './aggregate-keystrokes.ts';

export interface InsightCard {
  category: 'speed' | 'accuracy' | 'ergonomics' | 'practice' | 'rhythm';
  title: string;
  body: string;
  metric: string;
  delta: string;
}

export interface HeatmapKey {
  key: string;
  avg_ms: number;
  error_rate: number;
  count: number;
}

export interface AiInsightsResponse {
  summary: string;
  insight_cards: InsightCard[];
  heatmap_data: HeatmapKey[];
}

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) {
    const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set');
    client = new Anthropic({ apiKey });
  }
  return client;
}

const SYSTEM_PROMPT = `You are an expert typing coach analysing a user's typing data. You have access to per-key timing and error data from their recent sessions. Your job is to call the generate_insights tool with structured, actionable insights.

Guidelines:
- summary: 2-4 paragraphs in second person, specific to their data, encouraging but honest
- insight_cards: one card per category that has meaningful data (omit categories with no data)
- heatmap_data: include all keys that appear in the per_key stats
- delta: use "+N%" or "-N%" format vs last week, or "" if no prior data
- metric: pick the most meaningful single number for the category (e.g. "94 WPM" for speed, "96.2%" for accuracy)`;

const SCHEMA_EXPLANATION = `The keystroke data has this shape:
- per_key: array of { key, avg_ms (average ms to reach this key from previous), error_rate (0-1), count }
- slowest_bigrams: top 10 slowest consecutive key pairs { bigram "a→s", avg_ms, count }
- avg_wpm: average words per minute across all sessions
- avg_accuracy: average accuracy ratio (0-1) across all sessions
- total_practice_minutes: total minutes practised this week
- session_count: number of sessions this week`;

const TOOL = {
  name: 'generate_insights',
  description: 'Generate structured typing analytics insights from keystroke data',
  input_schema: {
    type: 'object' as const,
    properties: {
      summary: {
        type: 'string',
        description: '2-4 paragraphs of personalised coaching prose in second person',
      },
      insight_cards: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            category: { type: 'string', enum: ['speed', 'accuracy', 'ergonomics', 'practice', 'rhythm'] },
            title: { type: 'string' },
            body: { type: 'string' },
            metric: { type: 'string' },
            delta: { type: 'string' },
          },
          required: ['category', 'title', 'body', 'metric', 'delta'],
        },
      },
      heatmap_data: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            key: { type: 'string' },
            avg_ms: { type: 'number' },
            error_rate: { type: 'number' },
            count: { type: 'number' },
          },
          required: ['key', 'avg_ms', 'error_rate', 'count'],
        },
      },
    },
    required: ['summary', 'insight_cards', 'heatmap_data'],
  },
};

export async function generateAiInsights(
  currentStats: KeystrokeStats,
  priorStats: KeystrokeStats | null,
): Promise<AiInsightsResponse> {
  const anthropic = getClient();

  const priorText = priorStats
    ? `Prior week stats for delta comparison:\n${JSON.stringify(priorStats, null, 2)}`
    : 'No prior week data available — omit delta values.';

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    tools: [TOOL],
    tool_choice: { type: 'tool', name: 'generate_insights' },
    system: [
      {
        type: 'text',
        text: SYSTEM_PROMPT,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: SCHEMA_EXPLANATION,
            cache_control: { type: 'ephemeral' },
          },
          {
            type: 'text',
            text: priorText,
            cache_control: { type: 'ephemeral' },
          },
          {
            type: 'text',
            text: `This week's keystroke stats:\n${JSON.stringify(currentStats, null, 2)}`,
          },
        ],
      },
    ],
  });

  const toolUse = response.content.find((b) => b.type === 'tool_use');
  if (!toolUse || toolUse.type !== 'tool_use') {
    throw new Error('Claude did not call generate_insights tool');
  }

  return toolUse.input as AiInsightsResponse;
}
```

- [ ] **Step 2: Add `ANTHROPIC_API_KEY` to local secrets**

```bash
cd touch-type-backend
echo "ANTHROPIC_API_KEY=your_key_here" >> supabase/functions/.env
```

(Replace `your_key_here` with the actual key from the Anthropic console.)

- [ ] **Step 3: Commit**

```bash
cd touch-type-backend
git add supabase/functions/_shared/anthropic.ts
git commit -m "feat: add Anthropic Claude helper with prompt caching"
```

---

## Task 5: `generate-ai-insights` Edge Function

**Files:**
- Create: `touch-type-backend/supabase/functions/generate-ai-insights/index.ts`

- [ ] **Step 1: Create the edge function**

```typescript
// touch-type-backend/supabase/functions/generate-ai-insights/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { createSupabaseClient } from '../_shared/supabase.ts';
import { checkPremium } from '../_shared/premium.ts';
import { aggregateKeystrokes } from '../_shared/aggregate-keystrokes.ts';
import { generateAiInsights } from '../_shared/anthropic.ts';

function getWeekStart(date: Date = new Date()): string {
  const d = new Date(date);
  const day = d.getUTCDay(); // 0=Sun, 1=Mon
  const diff = day === 0 ? -6 : 1 - day; // roll to Monday
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().slice(0, 10); // "YYYY-MM-DD"
}

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const supabase = createSupabaseClient(req);

    // Auth — cron passes a service-role JWT; on-demand uses user JWT
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const isPremium = await checkPremium(supabase, user.id);
    if (!isPremium) {
      return new Response(JSON.stringify({ error: 'Premium required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json().catch(() => ({}));
    const force = !!body.force;

    const weekStart = getWeekStart();

    // For non-forced calls: skip if no new sessions since last insight
    if (!force) {
      const { data: lastInsight } = await supabase
        .from('ai_insights')
        .select('generated_at, sessions_count')
        .eq('user_id', user.id)
        .order('week_start', { ascending: false })
        .limit(1)
        .single();

      const { count: newSessionCount } = await supabase
        .from('results')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gt('datetime', lastInsight?.generated_at ?? '1970-01-01');

      // Check weekly email preference for inactive users
      const { data: settings } = await supabase
        .from('settings')
        .select('ai_weekly_email')
        .eq('user_id', user.id)
        .single();

      if ((newSessionCount ?? 0) < 3) {
        // Send nudge email if opted in and we have a prior insight
        if (settings?.ai_weekly_email && lastInsight) {
          const { data: priorInsight } = await supabase
            .from('ai_insights')
            .select('insight_cards, summary')
            .eq('user_id', user.id)
            .order('week_start', { ascending: false })
            .limit(1)
            .single();

          if (priorInsight && priorInsight.insight_cards.length > 0) {
            await supabase.functions.invoke('send-notifications', {
              body: {
                user_id: user.id,
                template: 'ai_nudge',
                data: { top_card: priorInsight.insight_cards[0] },
              },
            });
          }
        }
        return new Response(JSON.stringify({ skipped: true, reason: 'insufficient_sessions' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Fetch this week's sessions with key_presses
    const weekStartDate = new Date(weekStart + 'T00:00:00Z');
    const weekEndDate = new Date(weekStart + 'T00:00:00Z');
    weekEndDate.setUTCDate(weekEndDate.getUTCDate() + 7);

    const { data: results, error: resultsError } = await supabase
      .from('results')
      .select('cpm, correct, incorrect, time, key_presses')
      .eq('user_id', user.id)
      .gte('datetime', weekStartDate.toISOString())
      .lt('datetime', weekEndDate.toISOString())
      .order('datetime', { ascending: false });

    if (resultsError) throw resultsError;

    const currentStats = aggregateKeystrokes(results ?? []);

    // Fetch prior week stats for delta comparison
    const priorWeekStart = new Date(weekStartDate);
    priorWeekStart.setUTCDate(priorWeekStart.getUTCDate() - 7);

    const { data: priorResults } = await supabase
      .from('results')
      .select('cpm, correct, incorrect, time, key_presses')
      .eq('user_id', user.id)
      .gte('datetime', priorWeekStart.toISOString())
      .lt('datetime', weekStartDate.toISOString());

    const priorStats = priorResults && priorResults.length > 0
      ? aggregateKeystrokes(priorResults)
      : null;

    // Call Claude
    const aiResponse = await generateAiInsights(currentStats, priorStats);

    // Upsert into ai_insights
    const { error: upsertError } = await supabase
      .from('ai_insights')
      .upsert(
        {
          user_id: user.id,
          week_start: weekStart,
          generated_at: new Date().toISOString(),
          summary: aiResponse.summary,
          insight_cards: aiResponse.insight_cards,
          heatmap_data: aiResponse.heatmap_data,
          sessions_count: currentStats.session_count,
          model_version: 'claude-sonnet-4-6',
        },
        { onConflict: 'user_id,week_start' },
      );

    if (upsertError) throw upsertError;

    // Send digest email if opted in
    const { data: settings } = await supabase
      .from('settings')
      .select('ai_weekly_email')
      .eq('user_id', user.id)
      .single();

    if (settings?.ai_weekly_email) {
      await supabase.functions.invoke('send-notifications', {
        body: {
          user_id: user.id,
          template: 'ai_digest',
          data: {
            insight_cards: aiResponse.insight_cards.slice(0, 3),
            summary: aiResponse.summary,
            week_start: weekStart,
          },
        },
      });
    }

    return new Response(JSON.stringify({ success: true, week_start: weekStart }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('generate-ai-insights error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
```

- [ ] **Step 2: Serve the function locally**

```bash
cd touch-type-backend && supabase functions serve generate-ai-insights --env-file supabase/functions/.env
```

Expected: "Serving functions on http://localhost:54321/functions/v1/"

- [ ] **Step 3: Smoke-test with curl (must be logged in — use a valid JWT from the app)**

```bash
curl -X POST http://localhost:54321/functions/v1/generate-ai-insights \
  -H "Authorization: Bearer <user_jwt>" \
  -H "Content-Type: application/json" \
  -d '{"force": true}'
```

Expected: `{"success":true,"week_start":"2026-05-11"}` (or `{"skipped":true,...}` if no sessions).

- [ ] **Step 4: Verify row in DB**

```bash
psql postgresql://postgres:postgres@localhost:54322/postgres \
  -c "SELECT user_id, week_start, sessions_count, model_version FROM public.ai_insights;"
```

- [ ] **Step 5: Commit**

```bash
cd touch-type-backend
git add supabase/functions/generate-ai-insights/
git commit -m "feat: add generate-ai-insights edge function with Claude + prompt caching"
```

---

## Task 6: Email Templates

**Files:**
- Create: `touch-type-backend/supabase/templates/ai_digest.html`
- Create: `touch-type-backend/supabase/templates/ai_nudge.html`

- [ ] **Step 1: Create digest template**

```html
<!-- touch-type-backend/supabase/templates/ai_digest.html -->
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Your Touch Typer weekly report</title>
</head>
<body style="background:#f4f4f5;margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1);">
        <tr>
          <td style="background:#1e1e2e;padding:28px 32px;text-align:center;">
            <p style="margin:0;font-size:20px;font-weight:700;color:#fff;letter-spacing:.05em;">TOUCH TYPER</p>
            <p style="margin:8px 0 0;font-size:13px;color:#a5b4fc;">Your weekly coaching report</p>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 32px 8px;">
            <h1 style="margin:0 0 4px;font-size:18px;font-weight:700;color:#111827;">This week's highlights</h1>
            <p style="margin:0 0 20px;font-size:13px;color:#6b7280;">Week of {{ .WeekStart }}</p>
            {{ range .InsightCards }}
            <div style="border:1px solid #e5e7eb;border-radius:8px;padding:14px 16px;margin-bottom:12px;">
              <p style="margin:0 0 2px;font-size:11px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:.06em;">{{ .Category }}</p>
              <p style="margin:0 0 4px;font-size:14px;font-weight:700;color:#111827;">{{ .Title }}</p>
              <p style="margin:0 0 8px;font-size:13px;color:#374151;line-height:1.5;">{{ .Body }}</p>
              <span style="font-size:20px;font-weight:700;color:#111827;">{{ .Metric }}</span>
              {{ if .Delta }}<span style="font-size:12px;color:#6b7280;margin-left:8px;">{{ .Delta }}</span>{{ end }}
            </div>
            {{ end }}
          </td>
        </tr>
        <tr>
          <td style="padding:8px 32px 24px;">
            <p style="font-size:13px;color:#374151;line-height:1.6;border-left:3px solid #818cf8;padding-left:12px;margin:0 0 20px;">{{ .Summary }}</p>
            <div style="text-align:center;">
              <a href="{{ .AppLink }}" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#22d3ee);color:#fff;font-size:14px;font-weight:600;padding:12px 28px;border-radius:8px;text-decoration:none;">Open Touch Typer</a>
            </div>
          </td>
        </tr>
        <tr>
          <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:16px 32px;text-align:center;">
            <p style="margin:0;font-size:12px;color:#9ca3af;">&copy; Touch Typer. <a href="{{ .UnsubscribeLink }}" style="color:#9ca3af;">Unsubscribe</a></p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
```

- [ ] **Step 2: Create nudge template**

```html
<!-- touch-type-backend/supabase/templates/ai_nudge.html -->
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Time to practice — your coach has a tip</title>
</head>
<body style="background:#f4f4f5;margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1);">
        <tr>
          <td style="background:#1e1e2e;padding:28px 32px;text-align:center;">
            <p style="margin:0;font-size:20px;font-weight:700;color:#fff;letter-spacing:.05em;">TOUCH TYPER</p>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 32px 24px;">
            <h1 style="margin:0 0 8px;font-size:18px;font-weight:700;color:#111827;">Your coach has a tip for you</h1>
            <p style="margin:0 0 20px;font-size:13px;color:#6b7280;">You haven't practised much this week — here's a quick reminder from your last analysis.</p>
            <div style="background:#f5f3ff;border:1px solid #ddd6fe;border-radius:8px;padding:16px;margin-bottom:20px;">
              <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#4f46e5;">{{ .TopCard.Title }}</p>
              <p style="margin:0;font-size:13px;color:#374151;line-height:1.5;">{{ .TopCard.Body }}</p>
            </div>
            <div style="text-align:center;">
              <a href="{{ .AppLink }}" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#22d3ee);color:#fff;font-size:14px;font-weight:600;padding:12px 28px;border-radius:8px;text-decoration:none;">Start practising now</a>
            </div>
          </td>
        </tr>
        <tr>
          <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:16px 32px;text-align:center;">
            <p style="margin:0;font-size:12px;color:#9ca3af;">&copy; Touch Typer. <a href="{{ .UnsubscribeLink }}" style="color:#9ca3af;">Unsubscribe</a></p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
```

- [ ] **Step 3: Commit**

```bash
cd touch-type-backend
git add supabase/templates/ai_digest.html supabase/templates/ai_nudge.html
git commit -m "feat: add ai digest and nudge email templates"
```

---

## Task 7: Frontend Transactions

**Files:**
- Create: `touch-type/renderer/src/transactions/getAiInsights.ts`
- Create: `touch-type/renderer/src/transactions/refreshAiInsights.ts`

- [ ] **Step 1: Create `getAiInsights.ts`**

```typescript
// touch-type/renderer/src/transactions/getAiInsights.ts
import { getSupabaseClient } from '@/lib/supabase-client';
import type { AiInsight } from '@/types/ai-insights';

export async function getAiInsights(): Promise<AiInsight | null> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('ai_insights')
    .select('*')
    .order('week_start', { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
  return (data as AiInsight) ?? null;
}
```

- [ ] **Step 2: Create `refreshAiInsights.ts`**

```typescript
// touch-type/renderer/src/transactions/refreshAiInsights.ts
import { getSupabaseClient } from '@/lib/supabase-client';
import type { AiInsight } from '@/types/ai-insights';

export async function refreshAiInsights(): Promise<AiInsight> {
  const supabase = getSupabaseClient();

  // Invoke the edge function
  const { error: fnError } = await supabase.functions.invoke(
    'generate-ai-insights',
    { body: { force: true } },
  );
  if (fnError) throw fnError;

  // Wait for Realtime to notify us of the upserted row (max 60s)
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      channel.unsubscribe();
      reject(new Error('Refresh timed out after 60s'));
    }, 60_000);

    const channel = supabase
      .channel('ai_insights_refresh')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ai_insights' },
        (payload) => {
          clearTimeout(timeout);
          channel.unsubscribe();
          resolve(payload.new as AiInsight);
        },
      )
      .subscribe();
  });
}
```

- [ ] **Step 3: Type-check**

```bash
cd touch-type && pnpm type-check
```

Expected: exits 0.

- [ ] **Step 4: Commit**

```bash
cd touch-type
git add renderer/src/transactions/getAiInsights.ts renderer/src/transactions/refreshAiInsights.ts
git commit -m "feat: add getAiInsights and refreshAiInsights transactions"
```

---

## Task 8: InsightCard Component

**Files:**
- Create: `touch-type/renderer/src/components/AiAssistant/InsightCard.tsx`

- [ ] **Step 1: Create the component**

```tsx
// touch-type/renderer/src/components/AiAssistant/InsightCard.tsx
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBoltLightning,
  faBullseye,
  faCoffee,
  faKeyboard,
  faMusicNote,
} from '@fortawesome/pro-duotone-svg-icons';
import type { InsightCard as InsightCardType } from '@/types/ai-insights';

const CATEGORY_META = {
  speed:      { icon: faBoltLightning, iconColor: 'text-yellow-400', iconBg: 'bg-yellow-400/10' },
  accuracy:   { icon: faBullseye,      iconColor: 'text-red-400',    iconBg: 'bg-red-400/10'    },
  ergonomics: { icon: faCoffee,        iconColor: 'text-orange-400', iconBg: 'bg-orange-400/10' },
  practice:   { icon: faKeyboard,      iconColor: 'text-blue-400',   iconBg: 'bg-blue-400/10'   },
  rhythm:     { icon: faMusicNote,     iconColor: 'text-violet-400', iconBg: 'bg-violet-400/10' },
} as const;

function DeltaBadge({ delta }: { delta: string }) {
  if (!delta) return null;
  const isPositive = delta.startsWith('+');
  const isNegative = delta.startsWith('-');
  return (
    <span
      className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${
        isPositive
          ? 'bg-green-400/10 text-green-400'
          : isNegative
          ? 'bg-red-400/10 text-red-400'
          : 'bg-slate-400/10 text-slate-400'
      }`}
    >
      {delta}
    </span>
  );
}

export function InsightCard({ card }: { card: InsightCardType }) {
  const meta = CATEGORY_META[card.category];

  return (
    <div className="rounded-xl bg-slate-800/50 border border-slate-700/50 p-4 flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${meta.iconBg}`}>
          <FontAwesomeIcon icon={meta.icon} className={`w-4 h-4 ${meta.iconColor}`} />
        </div>
        <span className="text-xs font-semibold uppercase tracking-widest text-slate-500">
          {card.category}
        </span>
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-100 mb-1">{card.title}</p>
        <p className="text-xs text-slate-400 leading-relaxed">{card.body}</p>
      </div>
      <div className="flex items-baseline gap-2 mt-auto">
        <span className="text-2xl font-bold text-slate-100">{card.metric}</span>
        <DeltaBadge delta={card.delta} />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
cd touch-type && pnpm type-check
```

Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
cd touch-type
git add renderer/src/components/AiAssistant/InsightCard.tsx
git commit -m "feat: add InsightCard component"
```

---

## Task 9: InsightSummary Component

**Files:**
- Create: `touch-type/renderer/src/components/AiAssistant/InsightSummary.tsx`

- [ ] **Step 1: Create the component**

```tsx
// touch-type/renderer/src/components/AiAssistant/InsightSummary.tsx
'use client';

import { useEffect, useRef, useState } from 'react';

interface InsightSummaryProps {
  summary: string;
  weekStart: string;    // "YYYY-MM-DD"
  animate: boolean;     // true = typewriter, false = fade-in
}

export function InsightSummary({ summary, weekStart, animate }: InsightSummaryProps) {
  const [displayed, setDisplayed] = useState(animate ? '' : summary);
  const indexRef = useRef(0);

  useEffect(() => {
    if (!animate) {
      setDisplayed(summary);
      return;
    }
    setDisplayed('');
    indexRef.current = 0;

    const interval = setInterval(() => {
      indexRef.current += 1;
      setDisplayed(summary.slice(0, indexRef.current));
      if (indexRef.current >= summary.length) clearInterval(interval);
    }, 12); // ~80 chars/second

    return () => clearInterval(interval);
  }, [summary, animate]);

  const weekLabel = new Date(weekStart + 'T12:00:00Z').toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div
      className={`rounded-xl bg-slate-800/30 border border-slate-700/40 px-5 py-4 transition-opacity duration-500 ${
        !animate ? 'opacity-100' : ''
      }`}
    >
      <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
        {displayed}
        {animate && displayed.length < summary.length && (
          <span className="animate-pulse text-violet-400">|</span>
        )}
      </p>
      <p className="mt-3 text-xs text-slate-500">
        Analysis by Claude · Week of {weekLabel}
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
cd touch-type && pnpm type-check
```

Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
cd touch-type
git add renderer/src/components/AiAssistant/InsightSummary.tsx
git commit -m "feat: add InsightSummary component with typewriter animation"
```

---

## Task 10: Shared `KeyboardCanvas` Component

The existing `HeatmapCanvas` is a D3 canvas renderer tightly coupled to error-count data from `useResults()`. Rather than duplicating canvas logic, extract a purely presentational `KeyboardCanvas` component that accepts any `colorMap`. Both `HeatmapCanvas` and the new `InsightHeatmap` use it.

**Files:**
- Create: `touch-type/renderer/src/components/KeyboardCanvas/index.tsx`
- Modify: `touch-type/renderer/src/components/HeatmapCanvas/index.tsx`

- [ ] **Step 1: Create `KeyboardCanvas`**

```tsx
// touch-type/renderer/src/components/KeyboardCanvas/index.tsx
'use client';

import {
  useCallback,
  useLayoutEffect,
  useReducer,
  useRef,
  useState,
} from 'react';
import { KeyboardLayoutNames, lookupKeyboard } from '@/keyboards';
import { Keyboard } from '@/keyboards/key';

// @ts-ignore
import RobotoMono from '@/assets/RobotoMono-Regular.ttf';
// @ts-ignore
import FontAwesomeRegular from '@/assets/fontawesome-pro-6.1.2-web/webfonts/fa-regular-400.ttf';
// @ts-ignore
import FontAwesomeSolid from '@/assets/fontawesome-pro-6.1.2-web/webfonts/fa-solid-900.ttf';

interface ResizerState { width: number; height: number; pr: number }
type ResizerAction = { type: 'RESIZE' } | { type: 'PR' };

const marginWidth = 120;
const marginHeight = 350;

function resizer(state: ResizerState, action: ResizerAction): ResizerState {
  switch (action.type) {
    case 'RESIZE':
      return { ...state, width: window.innerWidth - marginWidth, height: window.innerHeight - marginHeight };
    case 'PR':
      return { ...state, pr: window.devicePixelRatio };
    default:
      return state;
  }
}

export interface KeyboardCanvasProps {
  keyboardName: KeyboardLayoutNames;
  /**
   * Maps Key.key string (e.g. "e", "shift") to a CSS colour string.
   * Keys absent from the map are drawn in the default base colour.
   */
  colorMap: Map<string, string>;
  onKeyClick?: (key: string) => void;
}

const BASE_COLOR = 'rgba(0,0,0,0.5)';

export function KeyboardCanvas({ keyboardName, colorMap, onKeyClick }: KeyboardCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fontLoaded, setFontLoaded] = useState(false);
  const [{ width, height, pr }, dispatch] = useReducer(resizer, { width: 0, height: 0, pr: 1 });

  const keyboardLayout = lookupKeyboard(keyboardName);
  const keyboard = new Keyboard(keyboardLayout, 0.9);

  // Load fonts once
  useLayoutEffect(() => {
    Promise.all([
      new FontFace('Roboto Mono', `url(${RobotoMono})`).load(),
      new FontFace('FontAwesome', `url(${FontAwesomeSolid})`, { weight: '900' }).load(),
      new FontFace('FontAwesome', `url(${FontAwesomeRegular})`, { weight: '400' }).load(),
    ]).then((fonts) => {
      fonts.forEach((f) => document.fonts.add(f));
      setFontLoaded(true);
    });
  }, []);

  // Resize listener
  useLayoutEffect(() => {
    const onResize = () => dispatch({ type: 'RESIZE' });
    window.addEventListener('resize', onResize);
    onResize();

    const updatePr = () => {
      dispatch({ type: 'PR' });
      matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`).addEventListener('change', updatePr, { once: true });
    };
    updatePr();

    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Draw
  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || width === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    canvas.width = width * pr;
    canvas.height = height * pr;

    // Draw base keyboard
    keyboard.drawKeyboard(ctx);

    // Overlay coloured keys
    keyboard.rows.forEach((row, i) => {
      row.forEach((cell, j) => {
        const keys = Array.isArray(cell) ? cell : [cell];
        keys.forEach((key) => {
          const color = colorMap.get(key.key) ?? colorMap.get(key.secondaryKey ?? '') ?? null;
          if (color) keyboard.drawKey(ctx, i, j, cell, color);
        });
      });
    });

    return () => ctx.clearRect(0, 0, canvas.width, canvas.height);
  }, [width, height, pr, fontLoaded, keyboardName, colorMap]);

  // Click hit-testing: find which Key.key was clicked based on canvas position
  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!onKeyClick || !canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left) * pr;
      const y = (e.clientY - rect.top) * pr;

      // Walk rows to find the key at (x, y) — mirror of drawKey's coordinate logic
      const w = 80 * 0.9;
      const h = 80 * 0.9;
      const gap = 5 * 0.9;

      for (let i = 0; i < keyboard.rows.length; i++) {
        const row = keyboard.rows[i];
        const rowWidth = keyboard.getRowWidth(0);
        const OFFSETS = [0, 15, 30, 45, 0, 0]; // mirror canvas_utils OFFSETS
        const offsetX = (window.innerWidth - marginWidth - rowWidth) / 2 + OFFSETS[i];
        let cx = offsetX * 0.9 * pr;
        const cy = (i * (80 + 5) * 0.9) * pr;

        for (let j = 0; j < row.length; j++) {
          const cell = row[j];
          const key = Array.isArray(cell) ? cell[0] : cell;
          const kw = (key.width || 80) * 0.9 * pr;
          const kh = (key.height || 80) * 0.9 * pr;
          if (x >= cx && x <= cx + kw && y >= cy && y <= cy + kh) {
            onKeyClick(key.key);
            return;
          }
          cx += kw + gap * pr;
        }
      }
    },
    [onKeyClick, keyboard, pr],
  );

  return (
    <canvas
      ref={canvasRef}
      className="mx-auto cursor-pointer"
      onClick={handleClick}
    />
  );
}
```

- [ ] **Step 2: Refactor `HeatmapCanvas` to use `KeyboardCanvas`**

Replace the `return (...)` block and the `generateHeatmap` / `loadAndSetFonts` / canvas setup code in `HeatmapCanvas/index.tsx`, keeping only the data computation:

```tsx
// touch-type/renderer/src/components/HeatmapCanvas/index.tsx
'use client';

import { useCallback, useMemo } from 'react';
import { KeyboardLayoutNames } from '@/keyboards';
import { interpolateRgb, scaleSequential, max } from 'd3';
import { useResults } from '@/lib/result-provider';
import { KeyboardCanvas } from '@/components/KeyboardCanvas';

type TimeRange = '7d' | '30d' | 'all';

interface HeatmapCanvasProps {
  keyboardName: KeyboardLayoutNames;
  timeRange: TimeRange;
}

function getDateCutoff(timeRange: TimeRange): Date | null {
  if (timeRange === 'all') return null;
  const days = timeRange === '7d' ? 7 : 30;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return cutoff;
}

export function HeatmapCanvas({ keyboardName, timeRange }: HeatmapCanvasProps) {
  const { results } = useResults();

  const colorMap = useMemo(() => {
    const cutoff = getDateCutoff(timeRange);
    const keyResults = results
      .filter((res) => {
        if (res.keyboard !== keyboardName) return false;
        if (cutoff && new Date(res.datetime) < cutoff) return false;
        return true;
      })
      .reduce((acc, result) => {
        result.keyPresses?.forEach((kp) => {
          if (!acc.has(kp.key)) acc.set(kp.key, { correct: 0, incorrect: 0 });
          const k = acc.get(kp.key)!;
          kp.correct ? (k.correct += 1) : (k.incorrect += 1);
        });
        return acc;
      }, new Map<string, { correct: number; incorrect: number }>());

    const maxIncorrect = max(Array.from(keyResults.values()).map((v) => v.incorrect)) ?? 1;
    const colorScale = scaleSequential()
      .interpolator(interpolateRgb('rgba(0,0,0,0.5)', 'rgba(255,0,0,1)'))
      .domain([0, maxIncorrect]);

    const map = new Map<string, string>();
    keyResults.forEach((value, key) => {
      map.set(key, colorScale(value.incorrect));
    });
    return map;
  }, [results, keyboardName, timeRange]);

  return <KeyboardCanvas keyboardName={keyboardName} colorMap={colorMap} />;
}
```

- [ ] **Step 3: Type-check**

```bash
cd touch-type && pnpm type-check
```

Expected: exits 0.

- [ ] **Step 4: Verify the Heatmap page still renders**

```bash
cd touch-type && pnpm dev:next
```

Open http://localhost:3000/heatmap. The keyboard heatmap should render identically to before.

- [ ] **Step 5: Commit**

```bash
cd touch-type
git add renderer/src/components/KeyboardCanvas/index.tsx \
        renderer/src/components/HeatmapCanvas/index.tsx
git commit -m "refactor: extract KeyboardCanvas shared component from HeatmapCanvas"
```

---

## Task 11: InsightHeatmap Component

Uses `KeyboardCanvas` directly, reading the user's active keyboard from settings.

**Files:**
- Create: `touch-type/renderer/src/components/AiAssistant/InsightHeatmap.tsx`

- [ ] **Step 1: Create the component**

```tsx
// touch-type/renderer/src/components/AiAssistant/InsightHeatmap.tsx
'use client';

import { useMemo, useState } from 'react';
import type { HeatmapKey } from '@/types/ai-insights';
import { KeyboardCanvas } from '@/components/KeyboardCanvas';
import { useSettings } from '@/lib/settings_hook';

interface PopoverInfo {
  key: string;
  avg_ms: number;
  error_rate: number;
  count: number;
}

interface InsightHeatmapProps {
  heatmapData: HeatmapKey[];
}

export function InsightHeatmap({ heatmapData }: InsightHeatmapProps) {
  const { keyboardName } = useSettings();
  const [popover, setPopover] = useState<PopoverInfo | null>(null);

  const { colorMap, keyDataMap } = useMemo(() => {
    if (heatmapData.length === 0) return { colorMap: new Map<string, string>(), keyDataMap: new Map<string, HeatmapKey>() };

    const maxMs = Math.max(...heatmapData.map((k) => k.avg_ms));
    const minMs = Math.min(...heatmapData.map((k) => k.avg_ms));
    const range = maxMs - minMs || 1;

    const colorMap = new Map<string, string>();
    const keyDataMap = new Map<string, HeatmapKey>();

    for (const k of heatmapData) {
      const t = (k.avg_ms - minMs) / range; // 0 = fast (blue), 1 = slow (red)
      const r = Math.round(59 + t * (239 - 59));
      const g = Math.round(130 + t * (68 - 130));
      const b = Math.round(246 + t * (68 - 246));
      // Blend in error rate as red overlay
      const errR = Math.round(r + k.error_rate * (239 - r));
      colorMap.set(k.key, `rgb(${errR},${g},${b})`);
      keyDataMap.set(k.key, k);
    }

    return { colorMap, keyDataMap };
  }, [heatmapData]);

  const handleKeyClick = (key: string) => {
    const data = keyDataMap.get(key);
    if (!data) { setPopover(null); return; }
    setPopover(popover?.key === key ? null : { key, avg_ms: data.avg_ms, error_rate: data.error_rate, count: data.count });
  };

  return (
    <div className="relative" onClick={(e) => { if (e.target === e.currentTarget) setPopover(null); }}>
      <KeyboardCanvas
        keyboardName={keyboardName}
        colorMap={colorMap}
        onKeyClick={handleKeyClick}
      />

      {/* Legend */}
      <div className="flex items-center gap-2 justify-center mt-4">
        <span className="text-xs text-slate-500">Fast</span>
        <div className="w-24 h-2 rounded-full" style={{ background: 'linear-gradient(to right, rgb(59,130,246), rgb(239,68,68))' }} />
        <span className="text-xs text-slate-500">Slow</span>
      </div>

      {/* Popover */}
      {popover && (
        <div className="mt-3 mx-auto max-w-xs rounded-lg bg-slate-900 border border-slate-700 px-4 py-3 text-xs text-slate-200">
          <p className="font-bold uppercase mb-1 text-slate-100">{popover.key}</p>
          <p>Avg timing: <span className="font-semibold">{popover.avg_ms}ms</span></p>
          <p>Error rate: <span className="font-semibold">{(popover.error_rate * 100).toFixed(1)}%</span></p>
          <p>Total presses: <span className="font-semibold">{popover.count.toLocaleString()}</span></p>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
cd touch-type && pnpm type-check
```

Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
cd touch-type
git add renderer/src/components/AiAssistant/InsightHeatmap.tsx
git commit -m "feat: add InsightHeatmap using KeyboardCanvas with user keyboard setting"
```

---

## Task 11: Rewire Dashboard

**Files:**
- Modify: `touch-type/renderer/src/app/assistant/client.tsx`

- [ ] **Step 1: Replace the logged-in render path in `client.tsx`**

Replace the entire file with:

```tsx
// touch-type/renderer/src/app/assistant/client.tsx
'use client';

import { useEffect, useState } from 'react';
import PageHeader from '@/components/PageHeader';
import Button from '@/components/Button';
import { ModalType, useModal } from '@/lib/modal-provider';
import { useSupabase } from '@/lib/supabase-provider';
import { usePlan } from '@/lib/plan_hook';
import { InsightCard } from '@/components/AiAssistant/InsightCard';
import { InsightSummary } from '@/components/AiAssistant/InsightSummary';
import { InsightHeatmap } from '@/components/AiAssistant/InsightHeatmap';
import { getAiInsights } from '@/transactions/getAiInsights';
import { refreshAiInsights } from '@/transactions/refreshAiInsights';
import { Skeleton } from '@/components/Skeleton';
import type { AiInsight } from '@/types/ai-insights';
import {
  faBoltLightning,
  faBullseye,
  faCoffee,
  faKeyboard,
  faMusicNote,
  faSpinnerThird,
} from '@fortawesome/pro-duotone-svg-icons';
import { faArrowsRotate, faMicrochipAi } from '@fortawesome/pro-regular-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

const features = [
  { icon: faBoltLightning, iconColor: 'text-yellow-400', iconBg: 'bg-yellow-400/10', title: 'Speed Coaching', description: 'Identify your slowest keys and bigrams. Get targeted drills to push past your WPM ceiling.' },
  { icon: faBullseye,      iconColor: 'text-red-400',    iconBg: 'bg-red-400/10',    title: 'Accuracy Analysis', description: 'Pinpoint error-prone letter pairs and finger stretches before bad habits take hold.' },
  { icon: faCoffee,        iconColor: 'text-orange-400', iconBg: 'bg-orange-400/10', title: 'Ergonomic Insights', description: 'Understand hand balance and movement patterns to keep your typing comfortable long-term.' },
  { icon: faKeyboard,      iconColor: 'text-blue-400',   iconBg: 'bg-blue-400/10',   title: 'Practice Plans', description: 'Personalised exercises generated from your recent sessions — not generic word lists.' },
  { icon: faMusicNote,     iconColor: 'text-violet-400', iconBg: 'bg-violet-400/10', title: 'Rhythm Training', description: 'Even out keystroke timing to build a smooth, consistent cadence across every finger.' },
];

function UnauthenticatedView() {
  const { setModal } = useModal();
  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <PageHeader icon={faMicrochipAi} title="AI Assistant" subtitle="Personalized coaching based on your sessions" iconBg="bg-violet-400/10" iconColor="text-violet-400" />
      <div className="px-6 pb-6 flex flex-col gap-8">
        <div className="rounded-2xl bg-violet-500/10 border border-violet-500/20 px-6 py-5">
          <p className="text-base font-semibold text-slate-100 mb-1">Your personal typing coach, powered by AI</p>
          <p className="text-sm text-slate-400">Sign in to unlock personalised feedback across speed, accuracy, ergonomics, practice, and rhythm — tailored to your actual sessions.</p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="rounded-xl bg-slate-800/50 border border-slate-700/50 p-4 flex gap-4 items-start">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${f.iconBg}`}>
                <FontAwesomeIcon icon={f.icon} className={`w-5 h-5 ${f.iconColor}`} />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-100 mb-0.5">{f.title}</p>
                <p className="text-xs text-slate-400 leading-relaxed">{f.description}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="flex flex-col items-center gap-3">
          <p className="text-sm text-slate-400">Free to get started — premium unlocks the full assistant.</p>
          <div className="flex gap-4 w-72">
            <Button onClick={() => setModal(ModalType.SIGN_IN)}>Sign In</Button>
            <Button onClick={() => setModal(ModalType.SIGN_UP)}>Sign Up</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <div className="w-full flex justify-center h-full">
      <div className="text-3xl font-semibold my-20 text-slate-300">
        <FontAwesomeIcon icon={faSpinnerThird} spin className="mx-5" />
      </div>
    </div>
  );
}

function InsightsDashboard({ insight, onRefresh, refreshing, animateSummary }: {
  insight: AiInsight;
  onRefresh: () => void;
  refreshing: boolean;
  animateSummary: boolean;
}) {
  return (
    <div className="flex flex-col overflow-y-auto">
      <PageHeader
        icon={faMicrochipAi}
        title="AI Assistant"
        subtitle="Personalized coaching based on your sessions"
        iconBg="bg-violet-400/10"
        iconColor="text-violet-400"
        headerRight={
          <button
            onClick={onRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 disabled:opacity-50 transition-colors px-3 py-1.5 rounded-lg hover:bg-slate-700/50"
          >
            <FontAwesomeIcon icon={faArrowsRotate} className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Analysing…' : 'Refresh'}
          </button>
        }
      />
      <div className="px-6 pb-8 flex flex-col gap-6">
        {/* Zone 1: Insight Cards */}
        {insight.insight_cards.length > 0 && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {insight.insight_cards.map((card) => (
              <InsightCard key={card.category} card={card} />
            ))}
          </div>
        )}

        {/* Zone 2: Natural Language Summary */}
        {insight.summary && (
          <InsightSummary
            summary={insight.summary}
            weekStart={insight.week_start}
            animate={animateSummary}
          />
        )}

        {/* Zone 3: Keyboard Heatmap */}
        {insight.heatmap_data.length > 0 && (
          <div className="rounded-xl bg-slate-800/30 border border-slate-700/40 px-5 py-6">
            <p className="text-sm font-semibold text-slate-300 mb-4">Key timing heatmap</p>
            <InsightHeatmap heatmapData={insight.heatmap_data} />
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState({ onRefresh, refreshing }: { onRefresh: () => void; refreshing: boolean }) {
  return (
    <div className="flex flex-col overflow-y-auto">
      <PageHeader icon={faMicrochipAi} title="AI Assistant" subtitle="Personalized coaching based on your sessions" iconBg="bg-violet-400/10" iconColor="text-violet-400" />
      <div className="px-6 py-8 flex flex-col items-center gap-4 text-center">
        {refreshing ? (
          <>
            <FontAwesomeIcon icon={faSpinnerThird} spin className="w-8 h-8 text-violet-400" />
            <p className="text-sm text-slate-400">Analysing your sessions…</p>
            <div className="w-full max-w-md flex flex-col gap-2">
              <Skeleton className="h-24 w-full rounded-xl" />
              <Skeleton className="h-24 w-full rounded-xl" />
              <Skeleton className="h-16 w-full rounded-xl" />
            </div>
          </>
        ) : (
          <>
            <p className="text-slate-300 font-semibold">No analysis yet</p>
            <p className="text-sm text-slate-500 max-w-xs">Your first analysis will run tonight, or tap Refresh to generate it now.</p>
            <button
              onClick={onRefresh}
              className="flex items-center gap-2 text-sm font-semibold text-violet-400 hover:text-violet-300 transition-colors"
            >
              <FontAwesomeIcon icon={faArrowsRotate} className="w-4 h-4" />
              Refresh now
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export function ClientAssistant() {
  const { setModal } = useModal();
  const { user, isLoading: userLoading } = useSupabase();
  const plan = usePlan();

  const [insight, setInsight] = useState<AiInsight | null>(null);
  const [insightLoading, setInsightLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [animateSummary, setAnimateSummary] = useState(false);

  useEffect(() => {
    if (!user || !plan || plan.billing_plan === 'free') return;
    getAiInsights()
      .then(setInsight)
      .catch(console.error)
      .finally(() => setInsightLoading(false));
  }, [user, plan]);

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      setAnimateSummary(true);
      const fresh = await refreshAiInsights();
      setInsight(fresh);
    } catch (err) {
      console.error('Refresh failed:', err);
    } finally {
      setRefreshing(false);
    }
  };

  if (userLoading) return <Spinner />;

  if (!user) return <UnauthenticatedView />;

  if (!plan) return <Spinner />;

  if (plan.billing_plan === 'free') {
    return (
      <div className="flex flex-col mx-auto justify-center items-center h-full mt-10 gap-6">
        <span className="text-lg font-semibold">Upgrade to premium to access the assistant</span>
        <div className="flex gap-6 w-96">
          <Button onClick={() => window.open(process.env['NEXT_PUBLIC_ACCOUNT_LINK'], '_blank')}>
            Account Settings
          </Button>
        </div>
      </div>
    );
  }

  if (insightLoading) return <Spinner />;

  if (!insight) {
    return <EmptyState onRefresh={handleRefresh} refreshing={refreshing} />;
  }

  return (
    <InsightsDashboard
      insight={insight}
      onRefresh={handleRefresh}
      refreshing={refreshing}
      animateSummary={animateSummary}
    />
  );
}
```

- [ ] **Step 2: Type-check**

```bash
cd touch-type && pnpm type-check
```

Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
cd touch-type
git add renderer/src/app/assistant/client.tsx
git commit -m "feat: rewire assistant dashboard to use ai_insights"
```

---

## Task 12: Settings — `ai_weekly_email` Toggle

**Files:**
- Modify: `touch-type/renderer/src/lib/settings_hook.tsx`
- Create: `touch-type/renderer/src/components/settings/AiAssistantSettings.tsx`
- Modify: `touch-type/renderer/src/components/settings/settings.tsx`

- [ ] **Step 1: Add `aiWeeklyEmail` to `settings_hook.tsx`**

In `settings_hook.tsx`, make four additions:

**a) Add to `SettingsContext` default value** (after `autoDetectAppLanguage: true,`):
```typescript
  aiWeeklyEmail: false,
```

**b) Add to `defaultSettings`** (after `autoDetectAppLanguage: true,`):
```typescript
  aiWeeklyEmail: false,
```

**c) Add to `ChangeSettingsAction` union type** (after the last `|` entry):
```typescript
  | {
      type: 'SET_AI_WEEKLY_EMAIL';
      aiWeeklyEmail: boolean;
    }
```

**d) Add reducer case** (inside the `switch` statement, before `default`):
```typescript
    case 'SET_AI_WEEKLY_EMAIL':
      return { ...state, aiWeeklyEmail: action.aiWeeklyEmail };
```

**e) Add to `fetchSettings` DB→state mapping** (inside `if (data) { const dbSettings = {` block, after `appLanguage`):
```typescript
          aiWeeklyEmail: data.ai_weekly_email ?? false,
```

**f) Add to `saveSettings` state→DB mapping** (inside `const dbSettings = {` block, after `app_language`):
```typescript
        ai_weekly_email: safeSettings.aiWeeklyEmail,
```

- [ ] **Step 2: Create `AiAssistantSettings.tsx`**

```tsx
// touch-type/renderer/src/components/settings/AiAssistantSettings.tsx
'use client';

import { useSettings, useSettingsDispatch } from '@/lib/settings_hook';
import { Field, Label, Description, Switch } from '@headlessui/react';
import clsx from 'clsx';
import { platform } from 'os';

export function AiAssistantSettings() {
  const settings = useSettings();
  const dispatch = useSettingsDispatch();

  return (
    <form className="flex flex-col gap-6">
      <Field as="div" className="flex items-center justify-between">
        <span className="flex flex-grow flex-col">
          <Label
            as="span"
            className={clsx('text-sm font-medium leading-6', platform() === 'darwin' ? 'text-white' : '')}
            passive
          >
            Weekly email report
          </Label>
          <Description as="span" className="text-sm text-gray-500">
            Receive a weekly AI coaching digest. Active weeks get a full report; quieter weeks get a top tip.
          </Description>
        </span>
        <Switch
          checked={settings.aiWeeklyEmail}
          onChange={(enabled) => dispatch({ type: 'SET_AI_WEEKLY_EMAIL', aiWeeklyEmail: enabled })}
          className={clsx(
            settings.aiWeeklyEmail ? 'bg-sky-500' : 'bg-slate-200 dark:bg-slate-700',
            'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:ring-offset-2 focus:ring-offset-transparent',
          )}
        >
          <span
            aria-hidden="true"
            className={clsx(
              settings.aiWeeklyEmail ? 'translate-x-5' : 'translate-x-0',
              'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
            )}
          />
        </Switch>
      </Field>
    </form>
  );
}
```

- [ ] **Step 3: Wire into `settings.tsx`**

**a) Add import** at the top of `settings.tsx`:
```typescript
import { AiAssistantSettings } from './AiAssistantSettings';
```

**b) Add category** to `SettingsCategoryId` type:
```typescript
type SettingsCategoryId =
  | 'appearance'
  | 'keyboard'
  | 'practice'
  | 'notifications'
  | 'ai'         // ← add this
  | 'account'
  | 'about';
```

**c) Add to `SETTINGS_CATEGORIES` array** (before `'account'`):
```typescript
  'ai',
```

**d) Add panel render** in the right panel section (before `{activeCategory === 'account' ...}`):
```tsx
          {activeCategory === 'ai' && <AiAssistantSettings />}
```

**e) Add i18n label** — the settings nav uses `t(\`settings.categories.${cat}\`)`. Add a fallback by also updating the translation key or, simpler, ensure the `t()` call gracefully falls back. Add to your i18n file or, if that's complex, temporarily render "AI Assistant" directly by adding a display map inside `settings.tsx`:

```typescript
const CATEGORY_LABELS: Record<SettingsCategoryId, string> = {
  appearance: t('settings.categories.appearance'),
  keyboard: t('settings.categories.keyboard'),
  practice: t('settings.categories.practice'),
  notifications: t('settings.categories.notifications'),
  ai: 'AI Assistant',
  account: t('settings.categories.account'),
  about: t('settings.categories.about'),
};
```

Then replace `{t(\`settings.categories.${cat}\`)}` in the nav with `{CATEGORY_LABELS[cat]}`.

- [ ] **Step 4: Type-check**

```bash
cd touch-type && pnpm type-check
```

Expected: exits 0.

- [ ] **Step 5: Commit**

```bash
cd touch-type
git add renderer/src/lib/settings_hook.tsx \
        renderer/src/components/settings/AiAssistantSettings.tsx \
        renderer/src/components/settings/settings.tsx
git commit -m "feat: add AI Assistant settings panel with weekly email toggle"
```

---

## Task 13: Weekly Cron Schedule

This task configures the weekly automated run in production. It does not affect local development.

- [ ] **Step 1: In the Supabase dashboard (production project), navigate to:**
  `Database → Extensions` → ensure `pg_cron` and `pg_net` are enabled.

- [ ] **Step 2: In `Database → SQL Editor`, run:**

```sql
-- Schedule generate-ai-insights to run every Monday at 06:00 UTC
SELECT cron.schedule(
  'ai-insights-weekly',
  '0 6 * * 1',
  $$
  SELECT net.http_post(
    url := 'https://<project-ref>.supabase.co/functions/v1/generate-ai-insights',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := '{"cron":true}'::text
  );
  $$
);
```

Replace `<project-ref>` with the Supabase project ref and configure `app.settings.service_role_key` via `ALTER DATABASE postgres SET app.settings.service_role_key = '...'`.

- [ ] **Step 3: Verify cron is registered**

```sql
SELECT jobname, schedule, command FROM cron.job WHERE jobname = 'ai-insights-weekly';
```

Expected: one row with schedule `0 6 * * 1`.

---

## Task 14: Deploy to Production

- [ ] **Step 1: Deploy the migration**

```bash
cd touch-type-backend
supabase db push
```

Expected: migration `20260511100000_add_ai_insights` applied.

- [ ] **Step 2: Deploy the edge function**

```bash
supabase functions deploy generate-ai-insights
```

Expected: "Deployed Function generate-ai-insights"

- [ ] **Step 3: Set the Anthropic API key secret in production**

```bash
supabase secrets set ANTHROPIC_API_KEY=your_key_here
```

- [ ] **Step 4: Deploy the renderer**

```bash
cd touch-type && pnpm build
```

Then package for distribution per the normal release flow (`pnpm package:mac-unsigned` for ad-hoc, `pnpm build+release` for signed).

- [ ] **Step 5: End-to-end smoke test**

1. Sign in with a premium account that has recent sessions
2. Navigate to AI Assistant
3. Tap Refresh
4. Verify insight cards, summary, and heatmap appear within ~30s
5. Toggle the weekly email setting — confirm it persists after sign-out/sign-in
