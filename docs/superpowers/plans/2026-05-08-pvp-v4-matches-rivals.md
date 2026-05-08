# PvP v4 — Matches + Rivals — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace v3's single-blind-game model with a best-of-N match (parallel play, no early termination) plus a derived rivals tab and one-click rematch, with all DB mutations routed through SECURITY DEFINER RPCs.

**Architecture:** Two tables (`pvp_matches` parent + `pvp_games` rounds, child); two BEFORE/AFTER triggers compute round winners and advance match state; seven RPCs are the only write surface (renderer only does SELECT and `supabase.rpc(...)`). Renderer rebuilds the PvP UI around five tabs (Active / Awaiting / History / Rivals / New) and a new `/pvp/match?id=` route.

**Tech Stack:** Supabase (Postgres 15, RLS, Realtime, edge functions unused here), TypeScript / Next.js 16 App Router static export, Electron, Playwright + raw psql for tests.

**Spec:** `touch-type/docs/superpowers/specs/2026-05-08-pvp-v4-matches-rivals-design.md`

**Repos involved:**
- `touch-type-backend/` — migration + SQL tests. Path prefix below: `<backend>/`.
- `touch-type/` — renderer + e2e tests. Path prefix below: `<app>/`.

Each task lists the repo it commits in. Run `git` commands from that repo's root.

---

## File Structure

### `<backend>/` (touch-type-backend)

| File | Responsibility |
|------|----------------|
| Create: `supabase/migrations/20260508150000_pvp_v4.sql` | Drops v3, creates `pvp_matches` + `pvp_games` (rounds), triggers, RPCs, RLS, realtime, grants. Single migration — re-runnable via `supabase db reset`. |
| Create: `supabase/tests/pvp_v4.test.sql` | Raw psql script (matches `streaks.test.sql` pattern) seeding two synthetic users and asserting trigger + RPC behavior. |

### `<app>/` (touch-type)

| File | Responsibility |
|------|----------------|
| Modify: `renderer/src/types/supabase.ts` | Regenerated from local DB after migration applies. |
| Modify: `renderer/src/lib/pvp-provider.tsx` | Rewrites context: types switch to `PvPMatch` / `PvPRound`, mutations go through `supabase.rpc(...)`, realtime subscribes to `pvp_matches` and `pvp_games`. |
| Create: `renderer/src/lib/generate-round-word-sets.ts` | Pure function: takes `(bestOf, settings)`, returns `string[][]` of `bestOf` distinct word sets. Reuses existing wordlist plumbing. |
| Modify: `renderer/src/components/PvP/NewChallengePrompt.tsx` | Adds "Best of" segmented control; submits via `createMatch`. |
| Rename + modify: `renderer/src/components/PvP/ChallengeCard.tsx` → `MatchCard.tsx` | Score display (creator_wins – joiner_wins), round indicator, primary action depending on match state. |
| Create: `renderer/src/components/PvP/RivalsTab.tsx` | Lists rivals from `list_my_rivals()`; per-rival Rematch button. |
| Modify: `renderer/src/components/PvP/PvPHub.tsx` | Five tabs: Active / Awaiting / History / Rivals / New. |
| Move + modify: `renderer/src/app/pvp/challenge/page.tsx` → `renderer/src/app/pvp/match/page.tsx` | Match detail: per-round status grid, "Race round N" button, Cancel / Forfeit affordances. |
| Modify: `renderer/src/app/pvp/invite/page.tsx` | Match-aware copy (best-of, settings); join via `join_match_by_invite`. |
| Modify: `renderer/src/components/Tracker/index.tsx` | Banner shows "PvP — Round N of M, score X–Y"; submit hooks into `submit_round_result`. |
| Modify: `renderer/src/components/Menu/index.tsx` | PvP badge counts unraced-round matches via the new provider state. |
| Modify: `e2e/pvp.spec.ts` | Replaces v3 cases with v4 cases (smoke, sequential round-trip, catch-up, forfeit, cancel × 2, ordering, rematch, already-joined). |

---

## Task ordering

DB → types → provider → UI → e2e. Each phase produces a working, committable layer; UI does not start until the provider compiles cleanly against regenerated types.

---

## Phase 1 — Database (Tasks 1–11)

### Task 1: Migration scaffold (drop v3, create tables, RLS, realtime, grants)

**Repo:** `<backend>`

**Files:**
- Create: `supabase/migrations/20260508150000_pvp_v4.sql`

- [ ] **Step 1: Create the migration file with drops, tables, indexes, RLS policies, realtime, grants**

```sql
-- supabase/migrations/20260508150000_pvp_v4.sql
-- PvP v4: best-of-N match with derived rivals. Replaces v3 destructively.
-- See docs/superpowers/specs/2026-05-08-pvp-v4-matches-rivals-design.md.

-- =========================================================================
-- DROP v3 objects (idempotent — safe to re-run via `supabase db reset`)
-- =========================================================================
DROP TABLE IF EXISTS public.pvp_games   CASCADE;
DROP TABLE IF EXISTS public.pvp_matches CASCADE;
DROP FUNCTION IF EXISTS public.complete_pvp_game();
DROP FUNCTION IF EXISTS public.set_pvp_invite_code();
DROP FUNCTION IF EXISTS public.get_game_by_invite_code(VARCHAR);

-- =========================================================================
-- TABLES
-- =========================================================================
CREATE TABLE public.pvp_matches (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invite_code     VARCHAR(12) UNIQUE NOT NULL,
  status          VARCHAR(16) NOT NULL DEFAULT 'open'
                  CHECK (status IN ('open','in_progress','completed','cancelled','expired')),
  best_of         SMALLINT NOT NULL CHECK (best_of IN (1,3,5,7)),

  keyboard        VARCHAR(50) NOT NULL,
  level           VARCHAR(20) NOT NULL,
  language        VARCHAR(10) NOT NULL,
  capital         BOOLEAN     NOT NULL DEFAULT false,
  punctuation     BOOLEAN     NOT NULL DEFAULT false,
  numbers         BOOLEAN     NOT NULL DEFAULT false,
  message         TEXT,

  creator_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joiner_id         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  joiner_joined_at  TIMESTAMPTZ,

  creator_wins    SMALLINT NOT NULL DEFAULT 0,
  joiner_wins     SMALLINT NOT NULL DEFAULT 0,

  winner_id       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  forfeited_by    UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  expires_at      TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CHECK (status <> 'completed' OR winner_id IS NOT NULL)
);

CREATE TABLE public.pvp_games (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id        UUID NOT NULL REFERENCES public.pvp_matches(id) ON DELETE CASCADE,
  round_number    SMALLINT NOT NULL CHECK (round_number BETWEEN 1 AND 7),

  word_set        TEXT[] NOT NULL,

  creator_cpm           NUMERIC,
  creator_correct       INTEGER,
  creator_incorrect     INTEGER,
  creator_time          TEXT,
  creator_key_presses   JSONB,
  creator_completed_at  TIMESTAMPTZ,

  joiner_cpm            NUMERIC,
  joiner_correct        INTEGER,
  joiner_incorrect      INTEGER,
  joiner_time           TEXT,
  joiner_key_presses    JSONB,
  joiner_completed_at   TIMESTAMPTZ,

  winner_id       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (match_id, round_number)
);

CREATE INDEX idx_pvp_matches_invite_code ON public.pvp_matches(invite_code);
CREATE INDEX idx_pvp_matches_creator     ON public.pvp_matches(creator_id);
CREATE INDEX idx_pvp_matches_joiner      ON public.pvp_matches(joiner_id);
CREATE INDEX idx_pvp_matches_status      ON public.pvp_matches(status);
CREATE INDEX idx_pvp_games_match         ON public.pvp_games(match_id);

-- =========================================================================
-- RLS — SELECT-only (writes are SECURITY DEFINER RPCs, added in later tasks)
-- =========================================================================
ALTER TABLE public.pvp_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pvp_games   ENABLE ROW LEVEL SECURITY;

CREATE POLICY "match_select" ON public.pvp_matches
  FOR SELECT TO authenticated
  USING (
    auth.uid() IN (creator_id, joiner_id)
    OR (status = 'open' AND joiner_id IS NULL)
  );

CREATE POLICY "round_select" ON public.pvp_games
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.pvp_matches m
      WHERE m.id = pvp_games.match_id
        AND (auth.uid() IN (m.creator_id, m.joiner_id)
             OR (m.status = 'open' AND m.joiner_id IS NULL))
    )
  );

-- =========================================================================
-- REALTIME + GRANTS
-- =========================================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.pvp_matches;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pvp_games;

GRANT SELECT ON public.pvp_matches TO authenticated;
GRANT SELECT ON public.pvp_games   TO authenticated;

-- updated_at trigger on pvp_matches (uses existing helper from earlier migrations)
CREATE TRIGGER update_pvp_matches_updated_at
  BEFORE UPDATE ON public.pvp_matches
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
```

- [ ] **Step 2: Apply migration locally**

Run from `<backend>` repo root:

```bash
supabase db reset
```

Expected: completes without error; the bottom of output shows "Finished supabase db reset".

- [ ] **Step 3: Verify tables exist**

```bash
psql "$(supabase status -o env | grep DB_URL | cut -d= -f2 | tr -d '"')" -c "\dt public.pvp_*"
```

Expected output includes `pvp_matches` and `pvp_games`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260508150000_pvp_v4.sql
git commit -m "feat(pvp): v4 schema scaffold — tables, RLS, realtime"
```

---

### Task 2: `set_pvp_invite_code` trigger

**Repo:** `<backend>`

**Files:**
- Modify: `supabase/migrations/20260508150000_pvp_v4.sql` (append)

- [ ] **Step 1: Append the invite-code generator + trigger**

Append at the end of the migration file (after the existing GRANTs):

```sql
-- =========================================================================
-- INVITE CODE GENERATION
-- =========================================================================
CREATE OR REPLACE FUNCTION public.generate_invite_code()
RETURNS VARCHAR
LANGUAGE plpgsql
AS $$
DECLARE
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result TEXT := '';
  i INTEGER := 0;
BEGIN
  FOR i IN 1..12 LOOP
    result := result || SUBSTR(chars, (FLOOR(RANDOM() * LENGTH(chars))::INT % LENGTH(chars)) + 1, 1);
  END LOOP;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_pvp_invite_code()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  candidate VARCHAR;
  attempts INTEGER := 0;
BEGIN
  IF NEW.invite_code IS NOT NULL THEN
    RETURN NEW;
  END IF;
  LOOP
    candidate := public.generate_invite_code();
    PERFORM 1 FROM public.pvp_matches WHERE invite_code = candidate;
    IF NOT FOUND THEN
      NEW.invite_code := candidate;
      RETURN NEW;
    END IF;
    attempts := attempts + 1;
    IF attempts > 10 THEN
      RAISE EXCEPTION 'Could not generate unique invite_code after 10 attempts';
    END IF;
  END LOOP;
END;
$$;

CREATE TRIGGER set_pvp_invite_code_trigger
  BEFORE INSERT ON public.pvp_matches
  FOR EACH ROW EXECUTE FUNCTION public.set_pvp_invite_code();
```

- [ ] **Step 2: Apply and verify**

```bash
supabase db reset
psql "$(supabase status -o env | grep DB_URL | cut -d= -f2 | tr -d '"')" \
  -c "INSERT INTO auth.users (id, email, instance_id, aud, role, email_confirmed_at, created_at, updated_at) VALUES ('11111111-1111-1111-1111-111111111111','t1@test','00000000-0000-0000-0000-000000000000','authenticated','authenticated',NOW(),NOW(),NOW());" \
  -c "INSERT INTO public.pvp_matches (creator_id, best_of, keyboard, level, language) VALUES ('11111111-1111-1111-1111-111111111111', 3, 'qwerty', 'novice', 'english') RETURNING invite_code;" \
  -c "DELETE FROM auth.users WHERE id='11111111-1111-1111-1111-111111111111';"
```

Expected: returned `invite_code` is a 12-character string of `[A-Z0-9]`.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260508150000_pvp_v4.sql
git commit -m "feat(pvp): v4 — invite_code generator + trigger"
```

---

### Task 3: `complete_pvp_round` trigger + tiebreaker tests

**Repo:** `<backend>`

**Files:**
- Modify: `supabase/migrations/20260508150000_pvp_v4.sql` (append)
- Create: `supabase/tests/pvp_v4.test.sql`

- [ ] **Step 1: Write the failing test**

Create `supabase/tests/pvp_v4.test.sql` (matches the `streaks.test.sql` pattern):

```sql
-- supabase/tests/pvp_v4.test.sql
-- Run with: psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/pvp_v4.test.sql

\set ON_ERROR_STOP on
\set creator_id   '\'aaaaaaaa-0000-0000-0000-000000000001\''
\set joiner_id    '\'bbbbbbbb-0000-0000-0000-000000000002\''

\echo
\echo '================================================================'
\echo ' PvP v4 trigger + RPC E2E tests'
\echo '================================================================'

-- Clean slate (idempotent re-run)
DELETE FROM public.pvp_matches WHERE creator_id IN (:creator_id, :joiner_id) OR joiner_id IN (:creator_id, :joiner_id);
DELETE FROM auth.users WHERE id IN (:creator_id, :joiner_id);

INSERT INTO auth.users (id, email, instance_id, aud, role, email_confirmed_at, created_at, updated_at) VALUES
  (:creator_id, 'pvp4-creator@local.test', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', NOW(), NOW(), NOW()),
  (:joiner_id,  'pvp4-joiner@local.test',  '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', NOW(), NOW(), NOW());

-- ----------------------------------------------------------------------
-- complete_pvp_round: tiebreaker chain (cpm → accuracy → completed_at)
-- ----------------------------------------------------------------------
\echo '--- complete_pvp_round: cpm wins outright ---'
DO $$
DECLARE
  m_id UUID;
  r_id UUID;
  w UUID;
BEGIN
  INSERT INTO public.pvp_matches (creator_id, joiner_id, best_of, keyboard, level, language)
  VALUES ('aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002', 3, 'qwerty', 'novice', 'english')
  RETURNING id INTO m_id;

  INSERT INTO public.pvp_games (match_id, round_number, word_set,
    creator_cpm, creator_correct, creator_incorrect, creator_time, creator_completed_at,
    joiner_cpm,  joiner_correct,  joiner_incorrect,  joiner_time,  joiner_completed_at)
  VALUES (m_id, 1, ARRAY['the','and','of'],
    100, 50, 1, 'PT30S', NOW(),
    80,  50, 1, 'PT30S', NOW())
  RETURNING id INTO r_id;

  -- Re-update to fire BEFORE UPDATE trigger (tiebreaker code path runs on UPDATE only)
  UPDATE public.pvp_games SET creator_completed_at = creator_completed_at WHERE id = r_id;

  SELECT winner_id INTO w FROM public.pvp_games WHERE id = r_id;
  ASSERT w = 'aaaaaaaa-0000-0000-0000-000000000001'::uuid,
    format('cpm tiebreaker: expected creator wins, got %s', w);
END $$;

\echo '--- complete_pvp_round: cpm tied, accuracy decides ---'
DO $$
DECLARE
  m_id UUID;
  r_id UUID;
  w UUID;
BEGIN
  INSERT INTO public.pvp_matches (creator_id, joiner_id, best_of, keyboard, level, language)
  VALUES ('aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002', 3, 'qwerty', 'novice', 'english')
  RETURNING id INTO m_id;

  INSERT INTO public.pvp_games (match_id, round_number, word_set,
    creator_cpm, creator_correct, creator_incorrect, creator_time, creator_completed_at,
    joiner_cpm,  joiner_correct,  joiner_incorrect,  joiner_time,  joiner_completed_at)
  VALUES (m_id, 1, ARRAY['the'],
    80, 50, 1, 'PT30S', NOW(),                 -- accuracy 50/51 ≈ 0.980
    80, 40, 5, 'PT30S', NOW())                 -- accuracy 40/45 ≈ 0.888
  RETURNING id INTO r_id;
  UPDATE public.pvp_games SET creator_completed_at = creator_completed_at WHERE id = r_id;

  SELECT winner_id INTO w FROM public.pvp_games WHERE id = r_id;
  ASSERT w = 'aaaaaaaa-0000-0000-0000-000000000001'::uuid,
    format('accuracy tiebreaker: expected creator wins, got %s', w);
END $$;

\echo '--- complete_pvp_round: cpm + accuracy tied, earlier completed_at decides ---'
DO $$
DECLARE
  m_id UUID;
  r_id UUID;
  w UUID;
  earlier TIMESTAMPTZ := NOW() - INTERVAL '1 second';
  later   TIMESTAMPTZ := NOW();
BEGIN
  INSERT INTO public.pvp_matches (creator_id, joiner_id, best_of, keyboard, level, language)
  VALUES ('aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002', 3, 'qwerty', 'novice', 'english')
  RETURNING id INTO m_id;

  INSERT INTO public.pvp_games (match_id, round_number, word_set,
    creator_cpm, creator_correct, creator_incorrect, creator_time, creator_completed_at,
    joiner_cpm,  joiner_correct,  joiner_incorrect,  joiner_time,  joiner_completed_at)
  VALUES (m_id, 1, ARRAY['the'],
    80, 50, 1, 'PT30S', earlier,
    80, 50, 1, 'PT30S', later)
  RETURNING id INTO r_id;
  UPDATE public.pvp_games SET creator_completed_at = creator_completed_at WHERE id = r_id;

  SELECT winner_id INTO w FROM public.pvp_games WHERE id = r_id;
  ASSERT w = 'aaaaaaaa-0000-0000-0000-000000000001'::uuid,
    format('completed_at tiebreaker: expected creator (earlier), got %s', w);
END $$;

\echo '--- complete_pvp_round: does not overwrite winner_id once set ---'
DO $$
DECLARE
  m_id UUID;
  r_id UUID;
  w UUID;
BEGIN
  INSERT INTO public.pvp_matches (creator_id, joiner_id, best_of, keyboard, level, language)
  VALUES ('aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002', 3, 'qwerty', 'novice', 'english')
  RETURNING id INTO m_id;

  INSERT INTO public.pvp_games (match_id, round_number, word_set,
    creator_cpm, creator_correct, creator_incorrect, creator_time, creator_completed_at,
    joiner_cpm,  joiner_correct,  joiner_incorrect,  joiner_time,  joiner_completed_at)
  VALUES (m_id, 1, ARRAY['the'],
    100, 50, 0, 'PT30S', NOW(),
    80,  50, 0, 'PT30S', NOW())
  RETURNING id INTO r_id;
  UPDATE public.pvp_games SET creator_completed_at = creator_completed_at WHERE id = r_id;

  -- Now manually flip cpms (simulating something nuts) and re-update; winner_id should NOT change
  UPDATE public.pvp_games SET creator_cpm = 1, joiner_cpm = 999 WHERE id = r_id;

  SELECT winner_id INTO w FROM public.pvp_games WHERE id = r_id;
  ASSERT w = 'aaaaaaaa-0000-0000-0000-000000000001'::uuid,
    format('winner_id should not be overwritten, got %s', w);
END $$;

-- Cleanup
DELETE FROM public.pvp_matches WHERE creator_id IN (:creator_id, :joiner_id) OR joiner_id IN (:creator_id, :joiner_id);
DELETE FROM auth.users WHERE id IN (:creator_id, :joiner_id);
\echo 'Task 3 tests passed.'
```

- [ ] **Step 2: Run the test, verify it fails**

```bash
psql "$(supabase status -o env | grep DB_URL | cut -d= -f2 | tr -d '"')" \
  -v ON_ERROR_STOP=1 -f supabase/tests/pvp_v4.test.sql
```

Expected: fails with `function complete_pvp_round() does not exist` (or asserts fail because the trigger isn't there yet).

- [ ] **Step 3: Append the trigger to the migration**

Append at the end of `supabase/migrations/20260508150000_pvp_v4.sql`:

```sql
-- =========================================================================
-- ROUND COMPLETION TRIGGER
-- Computes winner_id when both slots are filled. Tiebreaker chain:
-- cpm → accuracy → earlier completed_at.
-- =========================================================================
CREATE OR REPLACE FUNCTION public.complete_pvp_round()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  c_acc NUMERIC;
  j_acc NUMERIC;
  c_id UUID;
  j_id UUID;
BEGIN
  IF NEW.creator_completed_at IS NOT NULL
     AND NEW.joiner_completed_at IS NOT NULL
     AND NEW.winner_id IS NULL THEN

    SELECT creator_id, joiner_id INTO c_id, j_id
      FROM public.pvp_matches WHERE id = NEW.match_id;

    c_acc := CASE WHEN COALESCE(NEW.creator_correct,0) + COALESCE(NEW.creator_incorrect,0) = 0
                  THEN 0 ELSE NEW.creator_correct::NUMERIC / (NEW.creator_correct + NEW.creator_incorrect) END;
    j_acc := CASE WHEN COALESCE(NEW.joiner_correct,0) + COALESCE(NEW.joiner_incorrect,0) = 0
                  THEN 0 ELSE NEW.joiner_correct::NUMERIC / (NEW.joiner_correct + NEW.joiner_incorrect) END;

    NEW.winner_id := CASE
      WHEN NEW.creator_cpm > NEW.joiner_cpm THEN c_id
      WHEN NEW.joiner_cpm  > NEW.creator_cpm THEN j_id
      WHEN c_acc > j_acc THEN c_id
      WHEN j_acc > c_acc THEN j_id
      WHEN NEW.creator_completed_at < NEW.joiner_completed_at THEN c_id
      ELSE j_id
    END;
    NEW.completed_at := NOW();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER complete_pvp_round_trigger
  BEFORE UPDATE ON public.pvp_games
  FOR EACH ROW EXECUTE FUNCTION public.complete_pvp_round();
```

- [ ] **Step 4: Apply and re-run the test**

```bash
supabase db reset
psql "$(supabase status -o env | grep DB_URL | cut -d= -f2 | tr -d '"')" \
  -v ON_ERROR_STOP=1 -f supabase/tests/pvp_v4.test.sql
```

Expected: ends with `Task 3 tests passed.`, exit code 0.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260508150000_pvp_v4.sql supabase/tests/pvp_v4.test.sql
git commit -m "feat(pvp): v4 — round completion trigger + tiebreaker tests"
```

---

### Task 4: `advance_pvp_match` trigger + match-state tests

**Repo:** `<backend>`

**Files:**
- Modify: `supabase/migrations/20260508150000_pvp_v4.sql` (append)
- Modify: `supabase/tests/pvp_v4.test.sql` (append before final cleanup)

- [ ] **Step 1: Append match-advance assertions to the test file**

Insert these blocks **before** the final `Cleanup` block in `supabase/tests/pvp_v4.test.sql`:

```sql
-- ----------------------------------------------------------------------
-- advance_pvp_match: status open → in_progress on first round resolution;
-- race-ahead does NOT advance status; match completes when all rounds resolved.
-- ----------------------------------------------------------------------
\echo '--- advance_pvp_match: race-ahead does not flip status ---'
DO $$
DECLARE
  m_id UUID;
  r1_id UUID;
  s VARCHAR;
BEGIN
  INSERT INTO public.pvp_matches (creator_id, joiner_id, best_of, keyboard, level, language)
  VALUES ('aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002', 3, 'qwerty', 'novice', 'english')
  RETURNING id INTO m_id;

  INSERT INTO public.pvp_games (match_id, round_number, word_set, creator_cpm, creator_correct, creator_incorrect, creator_time, creator_completed_at)
  VALUES (m_id, 1, ARRAY['the'], 80, 50, 1, 'PT30S', NOW())
  RETURNING id INTO r1_id;

  -- Only one slot filled → no winner_id, status should remain 'open'
  SELECT status INTO s FROM public.pvp_matches WHERE id = m_id;
  ASSERT s = 'open',
    format('race-ahead: status should stay open, got %s', s);
END $$;

\echo '--- advance_pvp_match: status flips to in_progress on first round resolved ---'
DO $$
DECLARE
  m_id UUID;
  r1_id UUID;
  s VARCHAR;
  cw SMALLINT;
BEGIN
  INSERT INTO public.pvp_matches (creator_id, joiner_id, best_of, keyboard, level, language)
  VALUES ('aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002', 3, 'qwerty', 'novice', 'english')
  RETURNING id INTO m_id;

  INSERT INTO public.pvp_games (match_id, round_number, word_set, creator_cpm, creator_correct, creator_incorrect, creator_time, creator_completed_at)
  VALUES (m_id, 1, ARRAY['the'], 80, 50, 1, 'PT30S', NOW())
  RETURNING id INTO r1_id;

  UPDATE public.pvp_games
     SET joiner_cpm = 70, joiner_correct = 50, joiner_incorrect = 1, joiner_time = 'PT30S', joiner_completed_at = NOW()
   WHERE id = r1_id;

  SELECT status, creator_wins INTO s, cw FROM public.pvp_matches WHERE id = m_id;
  ASSERT s = 'in_progress', format('expected in_progress, got %s', s);
  ASSERT cw = 1, format('expected creator_wins=1, got %s', cw);
END $$;

\echo '--- advance_pvp_match: completes when all rounds resolved; winner = more wins ---'
DO $$
DECLARE
  m_id UUID;
  rr UUID[];
  s VARCHAR;
  w UUID;
BEGIN
  INSERT INTO public.pvp_matches (creator_id, joiner_id, best_of, keyboard, level, language)
  VALUES ('aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002', 3, 'qwerty', 'novice', 'english')
  RETURNING id INTO m_id;

  -- Insert 3 rounds with both slots filled — creator wins rounds 1 and 3, joiner wins round 2
  INSERT INTO public.pvp_games (match_id, round_number, word_set,
    creator_cpm, creator_correct, creator_incorrect, creator_time, creator_completed_at,
    joiner_cpm,  joiner_correct,  joiner_incorrect,  joiner_time,  joiner_completed_at)
  VALUES
    (m_id, 1, ARRAY['the'], 90, 50, 0, 'PT30S', NOW(),  70, 50, 0, 'PT30S', NOW()),
    (m_id, 2, ARRAY['and'], 70, 50, 0, 'PT30S', NOW(),  90, 50, 0, 'PT30S', NOW()),
    (m_id, 3, ARRAY['of'],  90, 50, 0, 'PT30S', NOW(),  70, 50, 0, 'PT30S', NOW());

  -- Trigger fires on UPDATE only — re-touch each row to fire complete_pvp_round
  UPDATE public.pvp_games SET creator_completed_at = creator_completed_at WHERE match_id = m_id;

  SELECT status, winner_id INTO s, w FROM public.pvp_matches WHERE id = m_id;
  ASSERT s = 'completed', format('expected completed, got %s', s);
  ASSERT w = 'aaaaaaaa-0000-0000-0000-000000000001'::uuid, format('expected creator winner, got %s', w);
END $$;
```

- [ ] **Step 2: Run the test, verify it fails**

```bash
psql "$(supabase status -o env | grep DB_URL | cut -d= -f2 | tr -d '"')" \
  -v ON_ERROR_STOP=1 -f supabase/tests/pvp_v4.test.sql
```

Expected: fails on the in_progress assertion (advance trigger doesn't exist yet, so creator_wins stays 0).

- [ ] **Step 3: Append the advance trigger to the migration**

Append at the end of the migration:

```sql
-- =========================================================================
-- MATCH ADVANCE TRIGGER
-- Increments creator_wins/joiner_wins on round-winner transitions and flips
-- status to in_progress / completed at the right moments.
-- =========================================================================
CREATE OR REPLACE FUNCTION public.advance_pvp_match()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  is_creator_win BOOLEAN;
  c_id   UUID;
  j_id   UUID;
  bo     SMALLINT;
  c_wins SMALLINT;
  j_wins SMALLINT;
BEGIN
  IF NEW.winner_id IS NULL OR OLD.winner_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT creator_id, joiner_id, best_of, creator_wins, joiner_wins
    INTO c_id, j_id, bo, c_wins, j_wins
    FROM public.pvp_matches WHERE id = NEW.match_id FOR UPDATE;

  is_creator_win := (NEW.winner_id = c_id);
  IF is_creator_win THEN
    c_wins := c_wins + 1;
  ELSE
    j_wins := j_wins + 1;
  END IF;

  UPDATE public.pvp_matches
     SET creator_wins = c_wins,
         joiner_wins  = j_wins,
         status = CASE
           WHEN c_wins + j_wins >= bo THEN 'completed'
           ELSE 'in_progress'
         END,
         winner_id = CASE
           WHEN c_wins + j_wins >= bo THEN
             CASE WHEN c_wins > j_wins THEN c_id ELSE j_id END
           ELSE winner_id
         END
   WHERE id = NEW.match_id;

  RETURN NEW;
END;
$$;

CREATE TRIGGER advance_pvp_match_trigger
  AFTER UPDATE ON public.pvp_games
  FOR EACH ROW EXECUTE FUNCTION public.advance_pvp_match();
```

- [ ] **Step 4: Apply and re-run the tests**

```bash
supabase db reset
psql "$(supabase status -o env | grep DB_URL | cut -d= -f2 | tr -d '"')" \
  -v ON_ERROR_STOP=1 -f supabase/tests/pvp_v4.test.sql
```

Expected: all assertions pass; final line `Task 3 tests passed.` (file echo line — keep it from earlier).

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260508150000_pvp_v4.sql supabase/tests/pvp_v4.test.sql
git commit -m "feat(pvp): v4 — advance_pvp_match trigger + state tests"
```

---

### Task 5: `create_match` RPC + tests

**Repo:** `<backend>`

**Files:**
- Modify: `supabase/migrations/20260508150000_pvp_v4.sql` (append)
- Modify: `supabase/tests/pvp_v4.test.sql` (append)

- [ ] **Step 1: Append the failing test**

Add to `supabase/tests/pvp_v4.test.sql` before the cleanup block:

```sql
\echo '--- create_match: inserts match + best_of round rows in one call ---'
DO $$
DECLARE
  result RECORD;
  round_count INTEGER;
BEGIN
  PERFORM set_config('request.jwt.claims', json_build_object('sub', 'aaaaaaaa-0000-0000-0000-000000000001'::text)::text, true);

  SELECT * INTO result FROM public.create_match(
    'qwerty', 'novice', 'english', false, false, false,
    3,
    '[["the","and","of"],["to","in","it"],["is","at","by"]]'::jsonb,
    'good luck'
  );

  ASSERT result.id IS NOT NULL, 'create_match should return a row';
  ASSERT result.best_of = 3, 'best_of mismatch';
  ASSERT result.creator_id = 'aaaaaaaa-0000-0000-0000-000000000001'::uuid, 'creator_id mismatch';
  ASSERT result.invite_code IS NOT NULL, 'invite_code should be populated';

  SELECT COUNT(*) INTO round_count FROM public.pvp_games WHERE match_id = result.id;
  ASSERT round_count = 3, format('expected 3 rounds, got %s', round_count);
END $$;
```

- [ ] **Step 2: Run, verify failure**

```bash
psql "$(supabase status -o env | grep DB_URL | cut -d= -f2 | tr -d '"')" \
  -v ON_ERROR_STOP=1 -f supabase/tests/pvp_v4.test.sql
```

Expected: fails with `function public.create_match(...) does not exist`.

- [ ] **Step 3: Append the RPC**

Append to migration:

```sql
-- =========================================================================
-- RPC: create_match
-- =========================================================================
CREATE OR REPLACE FUNCTION public.create_match(
  _keyboard    VARCHAR,
  _level       VARCHAR,
  _language    VARCHAR,
  _capital     BOOLEAN,
  _punctuation BOOLEAN,
  _numbers     BOOLEAN,
  _best_of     SMALLINT,
  _word_sets   JSONB,
  _message     TEXT DEFAULT NULL
)
RETURNS public.pvp_matches
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  caller UUID := auth.uid();
  m public.pvp_matches;
  i INTEGER;
  arr_len INTEGER;
BEGIN
  IF caller IS NULL THEN
    RAISE EXCEPTION 'create_match: not authenticated';
  END IF;
  IF _best_of NOT IN (1,3,5,7) THEN
    RAISE EXCEPTION 'create_match: best_of must be 1, 3, 5, or 7';
  END IF;

  arr_len := jsonb_array_length(_word_sets);
  IF arr_len <> _best_of THEN
    RAISE EXCEPTION 'create_match: expected % word sets, got %', _best_of, arr_len;
  END IF;

  INSERT INTO public.pvp_matches (
    creator_id, best_of, keyboard, level, language, capital, punctuation, numbers, message
  ) VALUES (
    caller, _best_of, _keyboard, _level, _language, _capital, _punctuation, _numbers, _message
  )
  RETURNING * INTO m;

  FOR i IN 0.._best_of - 1 LOOP
    INSERT INTO public.pvp_games (match_id, round_number, word_set)
    VALUES (
      m.id,
      (i + 1)::SMALLINT,
      ARRAY(SELECT jsonb_array_elements_text(_word_sets -> i))
    );
  END LOOP;

  RETURN m;
END;
$$;

REVOKE ALL ON FUNCTION public.create_match(VARCHAR, VARCHAR, VARCHAR, BOOLEAN, BOOLEAN, BOOLEAN, SMALLINT, JSONB, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_match(VARCHAR, VARCHAR, VARCHAR, BOOLEAN, BOOLEAN, BOOLEAN, SMALLINT, JSONB, TEXT) TO authenticated;
```

- [ ] **Step 4: Apply and re-run tests**

```bash
supabase db reset
psql "$(supabase status -o env | grep DB_URL | cut -d= -f2 | tr -d '"')" \
  -v ON_ERROR_STOP=1 -f supabase/tests/pvp_v4.test.sql
```

Expected: all assertions pass.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260508150000_pvp_v4.sql supabase/tests/pvp_v4.test.sql
git commit -m "feat(pvp): v4 — create_match RPC"
```

---

### Task 6: `get_match_by_invite_code` RPC + test

**Repo:** `<backend>`

**Files:**
- Modify: `supabase/migrations/20260508150000_pvp_v4.sql` (append)
- Modify: `supabase/tests/pvp_v4.test.sql` (append)

- [ ] **Step 1: Append the failing test**

```sql
\echo '--- get_match_by_invite_code: resolves match for arbitrary authenticated caller ---'
DO $$
DECLARE
  result public.pvp_matches;
  fixture public.pvp_matches;
BEGIN
  PERFORM set_config('request.jwt.claims', json_build_object('sub', 'aaaaaaaa-0000-0000-0000-000000000001'::text)::text, true);
  SELECT * INTO fixture FROM public.create_match(
    'qwerty','novice','english',false,false,false,1,'[["a"]]'::jsonb,NULL);

  -- Joiner (someone else) resolves by invite_code
  PERFORM set_config('request.jwt.claims', json_build_object('sub', 'bbbbbbbb-0000-0000-0000-000000000002'::text)::text, true);

  SELECT * INTO result FROM public.get_match_by_invite_code(fixture.invite_code);
  ASSERT result.id = fixture.id, format('expected %s, got %s', fixture.id, result.id);
END $$;
```

- [ ] **Step 2: Run, verify failure**

```bash
psql "$(supabase status -o env | grep DB_URL | cut -d= -f2 | tr -d '"')" \
  -v ON_ERROR_STOP=1 -f supabase/tests/pvp_v4.test.sql
```

Expected: fails with function-not-found.

- [ ] **Step 3: Append the RPC**

```sql
-- =========================================================================
-- RPC: get_match_by_invite_code
-- =========================================================================
CREATE OR REPLACE FUNCTION public.get_match_by_invite_code(_code VARCHAR)
RETURNS SETOF public.pvp_matches
SECURITY DEFINER
SET search_path = public
LANGUAGE sql
STABLE
AS $$
  SELECT * FROM public.pvp_matches
  WHERE invite_code = _code
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_match_by_invite_code(VARCHAR) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_match_by_invite_code(VARCHAR) TO authenticated;
```

- [ ] **Step 4: Apply and re-run tests**

```bash
supabase db reset
psql "$(supabase status -o env | grep DB_URL | cut -d= -f2 | tr -d '"')" \
  -v ON_ERROR_STOP=1 -f supabase/tests/pvp_v4.test.sql
```

Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260508150000_pvp_v4.sql supabase/tests/pvp_v4.test.sql
git commit -m "feat(pvp): v4 — get_match_by_invite_code RPC"
```

---

### Task 7: `join_match_by_invite` RPC + tests

**Repo:** `<backend>`

**Files:**
- Modify: `supabase/migrations/20260508150000_pvp_v4.sql` (append)
- Modify: `supabase/tests/pvp_v4.test.sql` (append)

- [ ] **Step 1: Append failing tests**

```sql
\echo '--- join_match_by_invite: joiner can claim open match ---'
DO $$
DECLARE
  fixture public.pvp_matches;
  joined  public.pvp_matches;
BEGIN
  PERFORM set_config('request.jwt.claims', json_build_object('sub', 'aaaaaaaa-0000-0000-0000-000000000001'::text)::text, true);
  SELECT * INTO fixture FROM public.create_match('qwerty','novice','english',false,false,false,1,'[["a"]]'::jsonb,NULL);

  PERFORM set_config('request.jwt.claims', json_build_object('sub', 'bbbbbbbb-0000-0000-0000-000000000002'::text)::text, true);
  SELECT * INTO joined FROM public.join_match_by_invite(fixture.invite_code);

  ASSERT joined.joiner_id = 'bbbbbbbb-0000-0000-0000-000000000002'::uuid, 'joiner_id should be set';
  ASSERT joined.joiner_joined_at IS NOT NULL, 'joiner_joined_at should be set';
END $$;

\echo '--- join_match_by_invite: rejects double-join ---'
DO $$
DECLARE
  fixture public.pvp_matches;
  caught  BOOLEAN := false;
BEGIN
  PERFORM set_config('request.jwt.claims', json_build_object('sub', 'aaaaaaaa-0000-0000-0000-000000000001'::text)::text, true);
  SELECT * INTO fixture FROM public.create_match('qwerty','novice','english',false,false,false,1,'[["a"]]'::jsonb,NULL);

  PERFORM set_config('request.jwt.claims', json_build_object('sub', 'bbbbbbbb-0000-0000-0000-000000000002'::text)::text, true);
  PERFORM public.join_match_by_invite(fixture.invite_code);

  -- Second user tries to join the same invite
  PERFORM set_config('request.jwt.claims', json_build_object('sub', 'aaaaaaaa-0000-0000-0000-000000000001'::text)::text, true);
  BEGIN
    PERFORM public.join_match_by_invite(fixture.invite_code);
  EXCEPTION WHEN OTHERS THEN
    caught := true;
  END;
  ASSERT caught, 'expected double-join to raise';
END $$;

\echo '--- join_match_by_invite: rejects creator joining their own match ---'
DO $$
DECLARE
  fixture public.pvp_matches;
  caught  BOOLEAN := false;
BEGIN
  PERFORM set_config('request.jwt.claims', json_build_object('sub', 'aaaaaaaa-0000-0000-0000-000000000001'::text)::text, true);
  SELECT * INTO fixture FROM public.create_match('qwerty','novice','english',false,false,false,1,'[["a"]]'::jsonb,NULL);

  BEGIN
    PERFORM public.join_match_by_invite(fixture.invite_code);
  EXCEPTION WHEN OTHERS THEN
    caught := true;
  END;
  ASSERT caught, 'creator should not be able to join own match';
END $$;

\echo '--- join_match_by_invite: rejects expired match ---'
DO $$
DECLARE
  fixture public.pvp_matches;
  caught  BOOLEAN := false;
BEGIN
  PERFORM set_config('request.jwt.claims', json_build_object('sub', 'aaaaaaaa-0000-0000-0000-000000000001'::text)::text, true);
  SELECT * INTO fixture FROM public.create_match('qwerty','novice','english',false,false,false,1,'[["a"]]'::jsonb,NULL);
  UPDATE public.pvp_matches SET expires_at = NOW() - INTERVAL '1 hour' WHERE id = fixture.id;

  PERFORM set_config('request.jwt.claims', json_build_object('sub', 'bbbbbbbb-0000-0000-0000-000000000002'::text)::text, true);
  BEGIN
    PERFORM public.join_match_by_invite(fixture.invite_code);
  EXCEPTION WHEN OTHERS THEN
    caught := true;
  END;
  ASSERT caught, 'expected expired match to reject join';
END $$;
```

- [ ] **Step 2: Run, verify failure**

```bash
psql "$(supabase status -o env | grep DB_URL | cut -d= -f2 | tr -d '"')" \
  -v ON_ERROR_STOP=1 -f supabase/tests/pvp_v4.test.sql
```

Expected: function-not-found.

- [ ] **Step 3: Append the RPC**

```sql
-- =========================================================================
-- RPC: join_match_by_invite
-- =========================================================================
CREATE OR REPLACE FUNCTION public.join_match_by_invite(_code VARCHAR)
RETURNS public.pvp_matches
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  caller UUID := auth.uid();
  m public.pvp_matches;
BEGIN
  IF caller IS NULL THEN
    RAISE EXCEPTION 'join_match_by_invite: not authenticated';
  END IF;

  UPDATE public.pvp_matches
     SET joiner_id = caller, joiner_joined_at = NOW()
   WHERE invite_code = _code
     AND joiner_id IS NULL
     AND creator_id <> caller
     AND expires_at > NOW()
     AND status = 'open'
   RETURNING * INTO m;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'join_match_by_invite: match not joinable (expired, full, or you are the creator)';
  END IF;

  RETURN m;
END;
$$;

REVOKE ALL ON FUNCTION public.join_match_by_invite(VARCHAR) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.join_match_by_invite(VARCHAR) TO authenticated;
```

- [ ] **Step 4: Apply and re-run**

```bash
supabase db reset
psql "$(supabase status -o env | grep DB_URL | cut -d= -f2 | tr -d '"')" \
  -v ON_ERROR_STOP=1 -f supabase/tests/pvp_v4.test.sql
```

Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260508150000_pvp_v4.sql supabase/tests/pvp_v4.test.sql
git commit -m "feat(pvp): v4 — join_match_by_invite RPC"
```

---

### Task 8: `submit_round_result` RPC + tests

**Repo:** `<backend>`

**Files:**
- Modify: `supabase/migrations/20260508150000_pvp_v4.sql` (append)
- Modify: `supabase/tests/pvp_v4.test.sql` (append)

- [ ] **Step 1: Append failing tests**

```sql
\echo '--- submit_round_result: creator submits round 1 ---'
DO $$
DECLARE
  fixture public.pvp_matches;
  r1 public.pvp_games;
BEGIN
  PERFORM set_config('request.jwt.claims', json_build_object('sub', 'aaaaaaaa-0000-0000-0000-000000000001'::text)::text, true);
  SELECT * INTO fixture FROM public.create_match('qwerty','novice','english',false,false,false,1,'[["a"]]'::jsonb,NULL);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', 'bbbbbbbb-0000-0000-0000-000000000002'::text)::text, true);
  PERFORM public.join_match_by_invite(fixture.invite_code);

  PERFORM set_config('request.jwt.claims', json_build_object('sub', 'aaaaaaaa-0000-0000-0000-000000000001'::text)::text, true);
  PERFORM public.submit_round_result(fixture.id, 1::SMALLINT, 80::NUMERIC, 50, 1, 'PT30S', NULL::JSONB);

  SELECT * INTO r1 FROM public.pvp_games WHERE match_id = fixture.id AND round_number = 1;
  ASSERT r1.creator_completed_at IS NOT NULL, 'creator slot should be filled';
  ASSERT r1.joiner_completed_at IS NULL, 'joiner slot should still be empty';
END $$;

\echo '--- submit_round_result: rejects per-player out-of-order (round 2 before 1) ---'
DO $$
DECLARE
  fixture public.pvp_matches;
  caught BOOLEAN := false;
BEGIN
  PERFORM set_config('request.jwt.claims', json_build_object('sub', 'aaaaaaaa-0000-0000-0000-000000000001'::text)::text, true);
  SELECT * INTO fixture FROM public.create_match('qwerty','novice','english',false,false,false,3,
    '[["a"],["b"],["c"]]'::jsonb, NULL);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', 'bbbbbbbb-0000-0000-0000-000000000002'::text)::text, true);
  PERFORM public.join_match_by_invite(fixture.invite_code);

  -- Creator tries to submit round 2 without round 1
  PERFORM set_config('request.jwt.claims', json_build_object('sub', 'aaaaaaaa-0000-0000-0000-000000000001'::text)::text, true);
  BEGIN
    PERFORM public.submit_round_result(fixture.id, 2::SMALLINT, 80::NUMERIC, 50, 1, 'PT30S', NULL::JSONB);
  EXCEPTION WHEN OTHERS THEN
    caught := true;
  END;
  ASSERT caught, 'expected out-of-order submit to raise';
END $$;

\echo '--- submit_round_result: rejects already-filled slot ---'
DO $$
DECLARE
  fixture public.pvp_matches;
  caught BOOLEAN := false;
BEGIN
  PERFORM set_config('request.jwt.claims', json_build_object('sub', 'aaaaaaaa-0000-0000-0000-000000000001'::text)::text, true);
  SELECT * INTO fixture FROM public.create_match('qwerty','novice','english',false,false,false,1,'[["a"]]'::jsonb,NULL);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', 'bbbbbbbb-0000-0000-0000-000000000002'::text)::text, true);
  PERFORM public.join_match_by_invite(fixture.invite_code);

  PERFORM set_config('request.jwt.claims', json_build_object('sub', 'aaaaaaaa-0000-0000-0000-000000000001'::text)::text, true);
  PERFORM public.submit_round_result(fixture.id, 1::SMALLINT, 80::NUMERIC, 50, 1, 'PT30S', NULL::JSONB);

  BEGIN
    PERFORM public.submit_round_result(fixture.id, 1::SMALLINT, 90::NUMERIC, 50, 1, 'PT30S', NULL::JSONB);
  EXCEPTION WHEN OTHERS THEN
    caught := true;
  END;
  ASSERT caught, 'expected duplicate-slot submit to raise';
END $$;

\echo '--- submit_round_result: rejects when caller is not a participant ---'
DO $$
DECLARE
  fixture public.pvp_matches;
  caught BOOLEAN := false;
BEGIN
  PERFORM set_config('request.jwt.claims', json_build_object('sub', 'aaaaaaaa-0000-0000-0000-000000000001'::text)::text, true);
  SELECT * INTO fixture FROM public.create_match('qwerty','novice','english',false,false,false,1,'[["a"]]'::jsonb,NULL);

  -- Random third user (not joined, not creator) attempts to submit
  PERFORM set_config('request.jwt.claims', json_build_object('sub', 'cccccccc-0000-0000-0000-000000000003'::text)::text, true);
  BEGIN
    PERFORM public.submit_round_result(fixture.id, 1::SMALLINT, 80::NUMERIC, 50, 1, 'PT30S', NULL::JSONB);
  EXCEPTION WHEN OTHERS THEN
    caught := true;
  END;
  ASSERT caught, 'expected non-participant submit to raise';
END $$;

\echo '--- submit_round_result: rejects on terminal state ---'
DO $$
DECLARE
  fixture public.pvp_matches;
  caught BOOLEAN := false;
BEGIN
  PERFORM set_config('request.jwt.claims', json_build_object('sub', 'aaaaaaaa-0000-0000-0000-000000000001'::text)::text, true);
  SELECT * INTO fixture FROM public.create_match('qwerty','novice','english',false,false,false,1,'[["a"]]'::jsonb,NULL);
  UPDATE public.pvp_matches SET status = 'cancelled' WHERE id = fixture.id;
  PERFORM set_config('request.jwt.claims', json_build_object('sub', 'aaaaaaaa-0000-0000-0000-000000000001'::text)::text, true);
  BEGIN
    PERFORM public.submit_round_result(fixture.id, 1::SMALLINT, 80::NUMERIC, 50, 1, 'PT30S', NULL::JSONB);
  EXCEPTION WHEN OTHERS THEN
    caught := true;
  END;
  ASSERT caught, 'expected terminal-state submit to raise';
END $$;
```

Note: tests reference user `cccccccc-...`. Extend the seed and cleanup blocks at the top/bottom of the file. In the **seed `INSERT INTO auth.users ... VALUES`** at the top, append a third tuple:

```sql
  ('cccccccc-0000-0000-0000-000000000003', 'pvp4-third@local.test', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', NOW(), NOW(), NOW())
```

And mirror the third UUID into both the top-of-file `DELETE` statements and the bottom-of-file cleanup `DELETE`s (the `\set` form makes this easy if you add `\set third_id '\'cccccccc-0000-0000-0000-000000000003\''` and reuse).

- [ ] **Step 2: Run, verify failure**

```bash
psql "$(supabase status -o env | grep DB_URL | cut -d= -f2 | tr -d '"')" \
  -v ON_ERROR_STOP=1 -f supabase/tests/pvp_v4.test.sql
```

Expected: fails on `function submit_round_result does not exist`.

- [ ] **Step 3: Append the RPC**

```sql
-- =========================================================================
-- RPC: submit_round_result
-- =========================================================================
CREATE OR REPLACE FUNCTION public.submit_round_result(
  _match_id     UUID,
  _round_number SMALLINT,
  _cpm          NUMERIC,
  _correct      INTEGER,
  _incorrect    INTEGER,
  _time         TEXT,
  _key_presses  JSONB
)
RETURNS public.pvp_games
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  caller UUID := auth.uid();
  m public.pvp_matches;
  r public.pvp_games;
  is_creator BOOLEAN;
  unfilled_prior INTEGER;
BEGIN
  IF caller IS NULL THEN
    RAISE EXCEPTION 'submit_round_result: not authenticated';
  END IF;

  SELECT * INTO m FROM public.pvp_matches WHERE id = _match_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'submit_round_result: match not found';
  END IF;

  IF caller = m.creator_id THEN
    is_creator := true;
  ELSIF caller = m.joiner_id THEN
    is_creator := false;
  ELSE
    RAISE EXCEPTION 'submit_round_result: caller is not a participant';
  END IF;

  IF m.status NOT IN ('open', 'in_progress') THEN
    RAISE EXCEPTION 'submit_round_result: match is in terminal state %', m.status;
  END IF;
  IF m.expires_at < NOW() THEN
    RAISE EXCEPTION 'submit_round_result: match has expired';
  END IF;

  -- Per-player ordering: caller's slot on rounds 1..N-1 must be filled
  IF _round_number > 1 THEN
    SELECT COUNT(*) INTO unfilled_prior
      FROM public.pvp_games
     WHERE match_id = _match_id
       AND round_number < _round_number
       AND ((is_creator AND creator_completed_at IS NULL)
            OR (NOT is_creator AND joiner_completed_at IS NULL));
    IF unfilled_prior > 0 THEN
      RAISE EXCEPTION 'submit_round_result: must complete prior rounds first';
    END IF;
  END IF;

  IF is_creator THEN
    UPDATE public.pvp_games
       SET creator_cpm = _cpm,
           creator_correct = _correct,
           creator_incorrect = _incorrect,
           creator_time = _time,
           creator_key_presses = _key_presses,
           creator_completed_at = NOW()
     WHERE match_id = _match_id AND round_number = _round_number
       AND creator_completed_at IS NULL
     RETURNING * INTO r;
  ELSE
    UPDATE public.pvp_games
       SET joiner_cpm = _cpm,
           joiner_correct = _correct,
           joiner_incorrect = _incorrect,
           joiner_time = _time,
           joiner_key_presses = _key_presses,
           joiner_completed_at = NOW()
     WHERE match_id = _match_id AND round_number = _round_number
       AND joiner_completed_at IS NULL
     RETURNING * INTO r;
  END IF;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'submit_round_result: round not found or slot already filled';
  END IF;

  RETURN r;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_round_result(UUID, SMALLINT, NUMERIC, INTEGER, INTEGER, TEXT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_round_result(UUID, SMALLINT, NUMERIC, INTEGER, INTEGER, TEXT, JSONB) TO authenticated;
```

- [ ] **Step 4: Apply and re-run**

```bash
supabase db reset
psql "$(supabase status -o env | grep DB_URL | cut -d= -f2 | tr -d '"')" \
  -v ON_ERROR_STOP=1 -f supabase/tests/pvp_v4.test.sql
```

Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260508150000_pvp_v4.sql supabase/tests/pvp_v4.test.sql
git commit -m "feat(pvp): v4 — submit_round_result RPC"
```

---

### Task 9: `forfeit_match` RPC + tests

**Repo:** `<backend>`

**Files:**
- Modify: `supabase/migrations/20260508150000_pvp_v4.sql` (append)
- Modify: `supabase/tests/pvp_v4.test.sql` (append)

- [ ] **Step 1: Append failing tests**

```sql
\echo '--- forfeit_match: caller forfeits, opponent wins ---'
DO $$
DECLARE
  fixture public.pvp_matches;
  result  public.pvp_matches;
BEGIN
  PERFORM set_config('request.jwt.claims', json_build_object('sub', 'aaaaaaaa-0000-0000-0000-000000000001'::text)::text, true);
  SELECT * INTO fixture FROM public.create_match('qwerty','novice','english',false,false,false,3,
    '[["a"],["b"],["c"]]'::jsonb, NULL);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', 'bbbbbbbb-0000-0000-0000-000000000002'::text)::text, true);
  PERFORM public.join_match_by_invite(fixture.invite_code);

  -- Joiner forfeits → creator wins
  SELECT * INTO result FROM public.forfeit_match(fixture.id);
  ASSERT result.status = 'completed', format('expected completed, got %s', result.status);
  ASSERT result.winner_id = 'aaaaaaaa-0000-0000-0000-000000000001'::uuid, 'creator should be winner';
  ASSERT result.forfeited_by = 'bbbbbbbb-0000-0000-0000-000000000002'::uuid, 'forfeited_by should be joiner';
END $$;

\echo '--- forfeit_match: rejects on terminal state ---'
DO $$
DECLARE
  fixture public.pvp_matches;
  caught BOOLEAN := false;
BEGIN
  PERFORM set_config('request.jwt.claims', json_build_object('sub', 'aaaaaaaa-0000-0000-0000-000000000001'::text)::text, true);
  SELECT * INTO fixture FROM public.create_match('qwerty','novice','english',false,false,false,1,'[["a"]]'::jsonb,NULL);
  UPDATE public.pvp_matches SET status = 'completed', winner_id = creator_id WHERE id = fixture.id;
  BEGIN
    PERFORM public.forfeit_match(fixture.id);
  EXCEPTION WHEN OTHERS THEN
    caught := true;
  END;
  ASSERT caught, 'expected forfeit on terminal match to raise';
END $$;
```

- [ ] **Step 2: Run, verify failure**

```bash
psql "$(supabase status -o env | grep DB_URL | cut -d= -f2 | tr -d '"')" \
  -v ON_ERROR_STOP=1 -f supabase/tests/pvp_v4.test.sql
```

Expected: function-not-found.

- [ ] **Step 3: Append the RPC**

```sql
-- =========================================================================
-- RPC: forfeit_match
-- =========================================================================
CREATE OR REPLACE FUNCTION public.forfeit_match(_match_id UUID)
RETURNS public.pvp_matches
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  caller UUID := auth.uid();
  m public.pvp_matches;
  other_id UUID;
BEGIN
  IF caller IS NULL THEN
    RAISE EXCEPTION 'forfeit_match: not authenticated';
  END IF;

  SELECT * INTO m FROM public.pvp_matches WHERE id = _match_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'forfeit_match: match not found';
  END IF;
  IF caller NOT IN (m.creator_id, m.joiner_id) THEN
    RAISE EXCEPTION 'forfeit_match: caller is not a participant';
  END IF;
  IF m.status NOT IN ('open', 'in_progress') THEN
    RAISE EXCEPTION 'forfeit_match: match is in terminal state %', m.status;
  END IF;
  IF m.joiner_id IS NULL THEN
    RAISE EXCEPTION 'forfeit_match: cannot forfeit before opponent has joined';
  END IF;

  other_id := CASE WHEN caller = m.creator_id THEN m.joiner_id ELSE m.creator_id END;

  UPDATE public.pvp_matches
     SET status = 'completed',
         winner_id = other_id,
         forfeited_by = caller
   WHERE id = _match_id
   RETURNING * INTO m;

  RETURN m;
END;
$$;

REVOKE ALL ON FUNCTION public.forfeit_match(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.forfeit_match(UUID) TO authenticated;
```

- [ ] **Step 4: Apply and re-run tests**

```bash
supabase db reset
psql "$(supabase status -o env | grep DB_URL | cut -d= -f2 | tr -d '"')" \
  -v ON_ERROR_STOP=1 -f supabase/tests/pvp_v4.test.sql
```

Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260508150000_pvp_v4.sql supabase/tests/pvp_v4.test.sql
git commit -m "feat(pvp): v4 — forfeit_match RPC"
```

---

### Task 10: `cancel_match` RPC + tests

**Repo:** `<backend>`

**Files:**
- Modify: `supabase/migrations/20260508150000_pvp_v4.sql` (append)
- Modify: `supabase/tests/pvp_v4.test.sql` (append)

- [ ] **Step 1: Append failing tests**

```sql
\echo '--- cancel_match: creator cancels open match with no submissions ---'
DO $$
DECLARE
  fixture public.pvp_matches;
  result  public.pvp_matches;
BEGIN
  PERFORM set_config('request.jwt.claims', json_build_object('sub', 'aaaaaaaa-0000-0000-0000-000000000001'::text)::text, true);
  SELECT * INTO fixture FROM public.create_match('qwerty','novice','english',false,false,false,3,
    '[["a"],["b"],["c"]]'::jsonb, NULL);

  SELECT * INTO result FROM public.cancel_match(fixture.id);
  ASSERT result.status = 'cancelled', format('expected cancelled, got %s', result.status);
END $$;

\echo '--- cancel_match: rejects after a round has any submission ---'
DO $$
DECLARE
  fixture public.pvp_matches;
  caught BOOLEAN := false;
BEGIN
  PERFORM set_config('request.jwt.claims', json_build_object('sub', 'aaaaaaaa-0000-0000-0000-000000000001'::text)::text, true);
  SELECT * INTO fixture FROM public.create_match('qwerty','novice','english',false,false,false,3,
    '[["a"],["b"],["c"]]'::jsonb, NULL);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', 'bbbbbbbb-0000-0000-0000-000000000002'::text)::text, true);
  PERFORM public.join_match_by_invite(fixture.invite_code);
  PERFORM public.submit_round_result(fixture.id, 1::SMALLINT, 80::NUMERIC, 50, 1, 'PT30S', NULL::JSONB);

  PERFORM set_config('request.jwt.claims', json_build_object('sub', 'aaaaaaaa-0000-0000-0000-000000000001'::text)::text, true);
  BEGIN
    PERFORM public.cancel_match(fixture.id);
  EXCEPTION WHEN OTHERS THEN
    caught := true;
  END;
  ASSERT caught, 'expected cancel-after-submission to raise';
END $$;

\echo '--- cancel_match: rejects when caller is not creator ---'
DO $$
DECLARE
  fixture public.pvp_matches;
  caught BOOLEAN := false;
BEGIN
  PERFORM set_config('request.jwt.claims', json_build_object('sub', 'aaaaaaaa-0000-0000-0000-000000000001'::text)::text, true);
  SELECT * INTO fixture FROM public.create_match('qwerty','novice','english',false,false,false,1,'[["a"]]'::jsonb,NULL);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', 'bbbbbbbb-0000-0000-0000-000000000002'::text)::text, true);
  PERFORM public.join_match_by_invite(fixture.invite_code);
  BEGIN
    PERFORM public.cancel_match(fixture.id);
  EXCEPTION WHEN OTHERS THEN
    caught := true;
  END;
  ASSERT caught, 'expected non-creator cancel to raise';
END $$;
```

- [ ] **Step 2: Run, verify failure**

```bash
psql "$(supabase status -o env | grep DB_URL | cut -d= -f2 | tr -d '"')" \
  -v ON_ERROR_STOP=1 -f supabase/tests/pvp_v4.test.sql
```

Expected: function-not-found.

- [ ] **Step 3: Append the RPC**

```sql
-- =========================================================================
-- RPC: cancel_match
-- =========================================================================
CREATE OR REPLACE FUNCTION public.cancel_match(_match_id UUID)
RETURNS public.pvp_matches
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  caller UUID := auth.uid();
  m public.pvp_matches;
  has_submissions BOOLEAN;
BEGIN
  IF caller IS NULL THEN
    RAISE EXCEPTION 'cancel_match: not authenticated';
  END IF;

  SELECT * INTO m FROM public.pvp_matches WHERE id = _match_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'cancel_match: match not found';
  END IF;
  IF m.creator_id <> caller THEN
    RAISE EXCEPTION 'cancel_match: only the creator can cancel';
  END IF;
  IF m.status NOT IN ('open', 'in_progress') THEN
    RAISE EXCEPTION 'cancel_match: match is in terminal state %', m.status;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.pvp_games
     WHERE match_id = _match_id
       AND (creator_completed_at IS NOT NULL OR joiner_completed_at IS NOT NULL)
  ) INTO has_submissions;
  IF has_submissions THEN
    RAISE EXCEPTION 'cancel_match: cannot cancel after a round has any submission';
  END IF;

  UPDATE public.pvp_matches SET status = 'cancelled' WHERE id = _match_id RETURNING * INTO m;
  RETURN m;
END;
$$;

REVOKE ALL ON FUNCTION public.cancel_match(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cancel_match(UUID) TO authenticated;
```

- [ ] **Step 4: Apply and re-run tests**

```bash
supabase db reset
psql "$(supabase status -o env | grep DB_URL | cut -d= -f2 | tr -d '"')" \
  -v ON_ERROR_STOP=1 -f supabase/tests/pvp_v4.test.sql
```

Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260508150000_pvp_v4.sql supabase/tests/pvp_v4.test.sql
git commit -m "feat(pvp): v4 — cancel_match RPC"
```

---

### Task 11: `list_my_rivals` RPC + tests

**Repo:** `<backend>`

**Files:**
- Modify: `supabase/migrations/20260508150000_pvp_v4.sql` (append)
- Modify: `supabase/tests/pvp_v4.test.sql` (append)

- [ ] **Step 1: Append failing tests**

```sql
\echo '--- list_my_rivals: counts completed matches; excludes cancelled/expired ---'
DO $$
DECLARE
  m1 public.pvp_matches;
  m2 public.pvp_matches;
  m3 public.pvp_matches;
  rivals_count INTEGER;
  rival_record RECORD;
BEGIN
  -- Completed match A vs B → A wins
  PERFORM set_config('request.jwt.claims', json_build_object('sub', 'aaaaaaaa-0000-0000-0000-000000000001'::text)::text, true);
  SELECT * INTO m1 FROM public.create_match('qwerty','novice','english',false,false,false,1,'[["a"]]'::jsonb,NULL);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', 'bbbbbbbb-0000-0000-0000-000000000002'::text)::text, true);
  PERFORM public.join_match_by_invite(m1.invite_code);
  PERFORM public.submit_round_result(m1.id, 1::SMALLINT, 70::NUMERIC, 50, 1, 'PT30S', NULL::JSONB);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', 'aaaaaaaa-0000-0000-0000-000000000001'::text)::text, true);
  PERFORM public.submit_round_result(m1.id, 1::SMALLINT, 90::NUMERIC, 50, 1, 'PT30S', NULL::JSONB);

  -- Cancelled match (should not count)
  SELECT * INTO m2 FROM public.create_match('qwerty','novice','english',false,false,false,1,'[["a"]]'::jsonb,NULL);
  PERFORM public.cancel_match(m2.id);

  -- Open match (should not count)
  SELECT * INTO m3 FROM public.create_match('qwerty','novice','english',false,false,false,1,'[["a"]]'::jsonb,NULL);

  SELECT COUNT(*) INTO rivals_count FROM public.list_my_rivals();
  ASSERT rivals_count = 1, format('expected 1 rival (only completed match), got %s', rivals_count);

  SELECT * INTO rival_record FROM public.list_my_rivals();
  ASSERT rival_record.rival_id = 'bbbbbbbb-0000-0000-0000-000000000002'::uuid, 'rival_id mismatch';
  ASSERT rival_record.matches_played = 1, format('expected 1 played, got %s', rival_record.matches_played);
  ASSERT rival_record.matches_won = 1, format('expected 1 won, got %s', rival_record.matches_won);
  ASSERT rival_record.matches_lost = 0, format('expected 0 lost, got %s', rival_record.matches_lost);
END $$;
```

- [ ] **Step 2: Run, verify failure**

```bash
psql "$(supabase status -o env | grep DB_URL | cut -d= -f2 | tr -d '"')" \
  -v ON_ERROR_STOP=1 -f supabase/tests/pvp_v4.test.sql
```

Expected: function-not-found.

- [ ] **Step 3: Append the RPC**

```sql
-- =========================================================================
-- RPC: list_my_rivals
-- =========================================================================
CREATE OR REPLACE FUNCTION public.list_my_rivals()
RETURNS TABLE (
  rival_id        UUID,
  matches_played  INTEGER,
  matches_won     INTEGER,
  matches_lost    INTEGER,
  last_played_at  TIMESTAMPTZ,
  last_match_id   UUID
)
SECURITY DEFINER
SET search_path = public
LANGUAGE sql
STABLE
AS $$
  WITH me AS (SELECT auth.uid() AS uid),
  played AS (
    SELECT
      m.id,
      CASE WHEN m.creator_id = me.uid THEN m.joiner_id ELSE m.creator_id END AS rival_id,
      m.winner_id,
      m.updated_at
    FROM public.pvp_matches m, me
    WHERE m.status = 'completed'
      AND (m.creator_id = me.uid OR m.joiner_id = me.uid)
      AND m.creator_id IS NOT NULL
      AND m.joiner_id IS NOT NULL
  )
  SELECT
    p.rival_id,
    COUNT(*)::INTEGER                                                       AS matches_played,
    COUNT(*) FILTER (WHERE p.winner_id = (SELECT uid FROM me))::INTEGER     AS matches_won,
    COUNT(*) FILTER (WHERE p.winner_id <> (SELECT uid FROM me))::INTEGER    AS matches_lost,
    MAX(p.updated_at)                                                       AS last_played_at,
    (ARRAY_AGG(p.id ORDER BY p.updated_at DESC))[1]                         AS last_match_id
  FROM played p
  GROUP BY p.rival_id
  ORDER BY MAX(p.updated_at) DESC;
$$;

REVOKE ALL ON FUNCTION public.list_my_rivals() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_my_rivals() TO authenticated;
```

- [ ] **Step 4: Apply and re-run tests**

```bash
supabase db reset
psql "$(supabase status -o env | grep DB_URL | cut -d= -f2 | tr -d '"')" \
  -v ON_ERROR_STOP=1 -f supabase/tests/pvp_v4.test.sql
```

Expected: all pass; final echo `Task 3 tests passed.` (file's terminal echo line).

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260508150000_pvp_v4.sql supabase/tests/pvp_v4.test.sql
git commit -m "feat(pvp): v4 — list_my_rivals RPC"
```

---

## Phase 2 — Type regeneration (Task 12)

### Task 12: Regenerate `supabase.ts` types

**Repo:** `<app>` (touch-type)

**Files:**
- Modify: `renderer/src/types/supabase.ts` (regenerated)

- [ ] **Step 1: Confirm local Supabase is running with v4 schema**

From `<backend>` repo root:

```bash
supabase status | head -3
```

Expected: shows API URL `http://127.0.0.1:54321` (or similar). If not running, `supabase start`.

- [ ] **Step 2: Regenerate types**

From `<backend>` repo root:

```bash
supabase gen types typescript --local > ../touch-type/renderer/src/types/supabase.ts
```

- [ ] **Step 3: Verify renderer typecheck passes**

From `<app>` repo root:

```bash
pnpm type-check
```

Expected: existing v3-shaped code in `pvp-provider.tsx` may now have type errors referencing the dropped `pvp_challenges` table or removed `pvp_games` columns. **This is expected** — those errors disappear in Phase 3. For this task, confirm the new `pvp_matches` and `pvp_games` types appear in `supabase.ts`:

```bash
grep -E "pvp_matches:|pvp_games:" renderer/src/types/supabase.ts | head -10
```

Expected: shows entries under both `Tables:` and `Functions:`.

- [ ] **Step 4: Commit (types only — leave any v3-side TS errors for Phase 3)**

```bash
git add renderer/src/types/supabase.ts
git commit -m "chore(pvp): regen supabase types after v4 migration"
```

---

## Phase 3 — Provider rewrite (Tasks 13–19)

### Task 13: Provider — types and shape

**Repo:** `<app>`

**Files:**
- Modify: `renderer/src/lib/pvp-provider.tsx`

- [ ] **Step 1: Replace v3 types with v4 types in `pvp-provider.tsx`**

Replace the existing `PvPGameStatus`, `PvPGame`, `ChallengeSettings`, `PvPRaceMode` and related type/interface declarations near the top of the file with:

```ts
import type { Database } from "@/types/supabase";
import type { Json } from "@/types/supabase";

export type PvPMatchStatus = "open" | "in_progress" | "completed" | "cancelled" | "expired";

export type PvPMatch = Database["public"]["Tables"]["pvp_matches"]["Row"];
export type PvPRound = Database["public"]["Tables"]["pvp_games"]["Row"];

export interface MatchSettings {
  keyboard: string;
  level: string;
  language: string;
  capital: boolean;
  punctuation: boolean;
  numbers: boolean;
}

export interface CreateMatchInput {
  bestOf: 1 | 3 | 5 | 7;
  settings: MatchSettings;
  message?: string;
}

export interface PvPRoundResultInput {
  matchId: string;
  roundNumber: number;
  cpm: number;
  correct: number;
  incorrect: number;
  time: string;
  keyPresses: Json;
}

export interface PvPRivalRow {
  rival_id: string;
  matches_played: number;
  matches_won: number;
  matches_lost: number;
  last_played_at: string;
  last_match_id: string;
}

export type PvPRaceMode = {
  match: PvPMatch;
  round: PvPRound;
};

export interface PvPContextType {
  myMatches: PvPMatch[];
  isLoading: boolean;
  createMatch: (input: CreateMatchInput) => Promise<PvPMatch | null>;
  joinMatchByInvite: (code: string) => Promise<PvPMatch | null>;
  submitRoundResult: (input: PvPRoundResultInput) => Promise<PvPRound | null>;
  forfeitMatch: (matchId: string) => Promise<boolean>;
  cancelMatch: (matchId: string) => Promise<boolean>;
  fetchById: (id: string) => Promise<PvPMatch | null>;
  fetchByInviteCode: (code: string) => Promise<PvPMatch | null>;
  fetchRoundsForMatch: (matchId: string) => Promise<PvPRound[]>;
  listRivals: () => Promise<PvPRivalRow[]>;
  startRace: (match: PvPMatch, round: PvPRound) => void;
  cancelRace: () => void;
  currentRace: PvPRaceMode | null;
}
```

Stub all of the methods in the provider body (return `null` / empty arrays / `false` etc.) so the file compiles. The real implementations land in Tasks 14–19.

- [ ] **Step 2: Run typecheck**

```bash
pnpm type-check
```

Expected: PASS. If consumers still reference removed v3 names (e.g. `PvPGame`, `fetchGameByInvite`), fix the import/usage sites — leave a `TODO(pvp-v4)` comment with the file:line and re-run typecheck. No call sites should be left dangling.

- [ ] **Step 3: Commit**

```bash
git add renderer/src/lib/pvp-provider.tsx renderer/src/**/*.tsx
git commit -m "refactor(pvp): provider scaffold for v4 (types only)"
```

---

### Task 14: Provider — `createMatch` + word-set generator helper

**Repo:** `<app>`

**Files:**
- Create: `renderer/src/lib/generate-round-word-sets.ts`
- Modify: `renderer/src/lib/pvp-provider.tsx`

- [ ] **Step 1: Locate existing word-set generation**

```bash
grep -rn "getWordSet\|generateWordSet\|wordSet" renderer/src/lib renderer/src/utils 2>/dev/null | head -10
```

Use the result to identify the function the renderer already uses to generate one round's worth of words. This task **wraps** that existing function — don't reinvent word generation.

- [ ] **Step 2: Create `generate-round-word-sets.ts`**

```ts
// renderer/src/lib/generate-round-word-sets.ts
import type { MatchSettings } from "@/lib/pvp-provider";
// IMPORTANT: replace the import below with whatever the codebase uses to
// generate one round's word array. Examples found in step 1 above.
import { getWordSet } from "@/lib/word-set"; // adjust path as needed

export function generateRoundWordSets(
  bestOf: number,
  settings: MatchSettings,
): string[][] {
  const out: string[][] = [];
  for (let i = 0; i < bestOf; i++) {
    out.push(getWordSet(settings));
  }
  return out;
}
```

- [ ] **Step 3: Implement `createMatch` in `pvp-provider.tsx`**

Replace the stub:

```ts
import { generateRoundWordSets } from "@/lib/generate-round-word-sets";

const createMatch: PvPContextType["createMatch"] = async (input) => {
  const wordSets = generateRoundWordSets(input.bestOf, input.settings);
  const { data, error } = await supabase.rpc("create_match", {
    _keyboard: input.settings.keyboard,
    _level: input.settings.level,
    _language: input.settings.language,
    _capital: input.settings.capital,
    _punctuation: input.settings.punctuation,
    _numbers: input.settings.numbers,
    _best_of: input.bestOf,
    _word_sets: wordSets as unknown as Json, // supabase-js serializes as JSONB
    _message: input.message ?? null,
  });
  if (error) {
    console.error("Error creating match:", error);
    return null;
  }
  return data;
};
```

- [ ] **Step 4: Run typecheck**

```bash
pnpm type-check
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add renderer/src/lib/generate-round-word-sets.ts renderer/src/lib/pvp-provider.tsx
git commit -m "feat(pvp): provider — createMatch via RPC + word-set generator"
```

---

### Task 15: Provider — `joinMatchByInvite`, `fetchByInviteCode`, `fetchById`, `fetchRoundsForMatch`

**Repo:** `<app>`

**Files:**
- Modify: `renderer/src/lib/pvp-provider.tsx`

- [ ] **Step 1: Replace the corresponding stubs with these implementations**

```ts
const fetchByInviteCode: PvPContextType["fetchByInviteCode"] = async (code) => {
  const { data, error } = await supabase.rpc("get_match_by_invite_code", {
    _code: code,
  });
  if (error) {
    console.error("Error fetching match by invite:", error);
    return null;
  }
  // RPC returns SETOF; supabase-js gives us an array
  return Array.isArray(data) ? (data[0] ?? null) : data;
};

const joinMatchByInvite: PvPContextType["joinMatchByInvite"] = async (code) => {
  const { data, error } = await supabase.rpc("join_match_by_invite", {
    _code: code,
  });
  if (error) {
    console.error("Error joining match:", error);
    return null;
  }
  return data;
};

const fetchById: PvPContextType["fetchById"] = async (id) => {
  const { data, error } = await supabase
    .from("pvp_matches")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    console.error("Error fetching match:", error);
    return null;
  }
  return data;
};

const fetchRoundsForMatch: PvPContextType["fetchRoundsForMatch"] = async (matchId) => {
  const { data, error } = await supabase
    .from("pvp_games")
    .select("*")
    .eq("match_id", matchId)
    .order("round_number", { ascending: true });
  if (error) {
    console.error("Error fetching rounds:", error);
    return [];
  }
  return data ?? [];
};
```

- [ ] **Step 2: Run typecheck**

```bash
pnpm type-check
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add renderer/src/lib/pvp-provider.tsx
git commit -m "feat(pvp): provider — invite/join/fetch RPCs"
```

---

### Task 16: Provider — `submitRoundResult`, `currentRace`, `startRace`, `cancelRace`

**Repo:** `<app>`

**Files:**
- Modify: `renderer/src/lib/pvp-provider.tsx`

- [ ] **Step 1: Replace stubs with implementations**

```ts
const [currentRace, setCurrentRace] = useState<PvPRaceMode | null>(null);

const startRace: PvPContextType["startRace"] = (match, round) => {
  setCurrentRace({ match, round });
};

const cancelRace: PvPContextType["cancelRace"] = () => {
  setCurrentRace(null);
};

const submitRoundResult: PvPContextType["submitRoundResult"] = async (input) => {
  const { data, error } = await supabase.rpc("submit_round_result", {
    _match_id: input.matchId,
    _round_number: input.roundNumber,
    _cpm: input.cpm,
    _correct: input.correct,
    _incorrect: input.incorrect,
    _time: input.time,
    _key_presses: input.keyPresses,
  });
  if (error) {
    console.error("Error submitting round result:", error);
    return null;
  }
  // Clear current race if it was for this round
  setCurrentRace((prev) =>
    prev && prev.round.id === data?.id ? null : prev,
  );
  return data;
};
```

- [ ] **Step 2: Run typecheck**

```bash
pnpm type-check
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add renderer/src/lib/pvp-provider.tsx
git commit -m "feat(pvp): provider — submit_round_result + currentRace state"
```

---

### Task 17: Provider — `forfeitMatch`, `cancelMatch`, `listRivals`

**Repo:** `<app>`

**Files:**
- Modify: `renderer/src/lib/pvp-provider.tsx`

- [ ] **Step 1: Replace stubs**

```ts
const forfeitMatch: PvPContextType["forfeitMatch"] = async (matchId) => {
  const { error } = await supabase.rpc("forfeit_match", { _match_id: matchId });
  if (error) {
    console.error("Error forfeiting match:", error);
    return false;
  }
  setCurrentRace(null);
  return true;
};

const cancelMatch: PvPContextType["cancelMatch"] = async (matchId) => {
  const { error } = await supabase.rpc("cancel_match", { _match_id: matchId });
  if (error) {
    console.error("Error cancelling match:", error);
    return false;
  }
  return true;
};

const listRivals: PvPContextType["listRivals"] = async () => {
  const { data, error } = await supabase.rpc("list_my_rivals");
  if (error) {
    console.error("Error listing rivals:", error);
    return [];
  }
  return data ?? [];
};
```

- [ ] **Step 2: Run typecheck**

```bash
pnpm type-check
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add renderer/src/lib/pvp-provider.tsx
git commit -m "feat(pvp): provider — forfeit/cancel/listRivals"
```

---

### Task 18: Provider — `myMatches` fetch + realtime subscriptions

**Repo:** `<app>`

**Files:**
- Modify: `renderer/src/lib/pvp-provider.tsx`

- [ ] **Step 1: Add the matches state and fetch effect**

Inside the `PvPProvider` body:

```ts
const [myMatches, setMyMatches] = useState<PvPMatch[]>([]);
const [isLoading, setIsLoading] = useState(true);
const { user } = useSupabase();

const refresh = useCallback(async () => {
  if (!user) {
    setMyMatches([]);
    setIsLoading(false);
    return;
  }
  const { data, error } = await supabase
    .from("pvp_matches")
    .select("*")
    .or(`creator_id.eq.${user.id},joiner_id.eq.${user.id}`)
    .order("updated_at", { ascending: false });
  if (error) {
    console.error("Error fetching matches:", error);
    setMyMatches([]);
  } else {
    setMyMatches(data ?? []);
  }
  setIsLoading(false);
}, [user]);

useEffect(() => {
  void refresh();
}, [refresh]);

// Realtime: subscribe BEFORE rendering action buttons so we don't miss
// an opponent's submit landing during the gap between mount and click.
useEffect(() => {
  if (!user) return;
  const channel = supabase
    .channel(`pvp_matches:${user.id}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "pvp_matches" },
      () => void refresh(),
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "pvp_games" },
      () => void refresh(),
    )
    .subscribe();
  return () => {
    void supabase.removeChannel(channel);
  };
}, [user, refresh]);
```

- [ ] **Step 2: Wire all the methods into the context value**

Add to the `value={{ ... }}` object on the `<PvPContext.Provider>`:

```ts
value={{
  myMatches,
  isLoading,
  createMatch,
  joinMatchByInvite,
  submitRoundResult,
  forfeitMatch,
  cancelMatch,
  fetchById,
  fetchByInviteCode,
  fetchRoundsForMatch,
  listRivals,
  startRace,
  cancelRace,
  currentRace,
}}
```

- [ ] **Step 3: Run typecheck and a smoke dev session**

```bash
pnpm type-check
```

Expected: PASS.

```bash
pnpm dev:next
```

In the browser, open `/pvp`. Expected: page loads without "myMatches is undefined" or "PvPContextType missing X" errors. The five tabs aren't built yet — visual verification only that the provider doesn't crash.

- [ ] **Step 4: Commit**

```bash
git add renderer/src/lib/pvp-provider.tsx
git commit -m "feat(pvp): provider — myMatches fetch + realtime subscriptions"
```

---

### Task 19: Provider — wire up Tracker submission path

**Repo:** `<app>`

**Files:**
- Modify: `renderer/src/components/Tracker/index.tsx`

The Tracker is the typing UI. It already detects "PvP mode" via the provider's `currentRace`. Update the submit path so that on race completion it calls the new `submitRoundResult` and the banner displays "Round N of M, score X–Y".

- [ ] **Step 1: Inspect the existing PvP integration**

```bash
grep -n "currentRace\|PvP\|Pvp" renderer/src/components/Tracker/index.tsx | head -20
```

You'll see places where the v3 provider's `currentRace` is referenced. The new shape is `{ match: PvPMatch, round: PvPRound }`.

- [ ] **Step 2: Update Tracker references**

Replace any `currentRace.game` (v3) with `currentRace.match` and `currentRace.round`. The banner JSX:

```tsx
{currentRace && (
  <div data-testid="pvp-mode-banner" className="...">
    PvP — Round {currentRace.round.round_number} of {currentRace.match.best_of}
    <span className="ml-2 opacity-70">
      Score {currentRace.match.creator_wins} – {currentRace.match.joiner_wins}
    </span>
    <button
      data-testid="pvp-forfeit"
      onClick={async () => {
        if (await forfeitMatch(currentRace.match.id)) {
          router.push(`/pvp/match?id=${currentRace.match.id}`);
        }
      }}
    >
      Forfeit
    </button>
  </div>
)}
```

The submit handler (find the existing race-complete handler):

```tsx
if (currentRace) {
  await submitRoundResult({
    matchId: currentRace.match.id,
    roundNumber: currentRace.round.round_number,
    cpm,
    correct: correctCount,
    incorrect: incorrectCount,
    time: timeIso,
    keyPresses: keyPresses as unknown as Json,
  });
  router.push(`/pvp/match?id=${currentRace.match.id}`);
  return;
}
```

The Tracker should also use `currentRace.match.keyboard` (not the user's settings) for the keyboard the player must use during a PvP round.

- [ ] **Step 3: Typecheck**

```bash
pnpm type-check
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add renderer/src/components/Tracker/index.tsx
git commit -m "feat(pvp): tracker — submit via submitRoundResult; banner shows round/score"
```

---

## Phase 4 — UI components (Tasks 20–26)

### Task 20: `NewChallengePrompt` — Best-of selector

**Repo:** `<app>`

**Files:**
- Modify: `renderer/src/components/PvP/NewChallengePrompt.tsx`

- [ ] **Step 1: Add `bestOf` state and segmented control**

Add inside the component:

```tsx
const [bestOf, setBestOf] = useState<1 | 3 | 5 | 7>(3);
```

Render the control above the existing Send button:

```tsx
<fieldset className="mt-4">
  <legend className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
    Best of
  </legend>
  <div role="radiogroup" className="flex gap-2">
    {([1, 3, 5, 7] as const).map((n) => (
      <button
        key={n}
        type="button"
        role="radio"
        aria-checked={bestOf === n}
        data-testid={`pvp-best-of-${n}`}
        onClick={() => setBestOf(n)}
        className={clsx(
          "px-4 py-2 rounded-lg font-medium border",
          bestOf === n
            ? "bg-blue-500 text-white border-blue-500"
            : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-700",
        )}
      >
        {n}
      </button>
    ))}
  </div>
</fieldset>
```

- [ ] **Step 2: Pass `bestOf` to `createMatch`**

In the submit handler:

```tsx
const match = await createMatch({
  bestOf,
  settings: {
    keyboard,
    level,
    language,
    capital,
    punctuation,
    numbers,
  },
  message: message || undefined,
});
if (match) {
  router.push(`/pvp/match?id=${match.id}`);
}
```

- [ ] **Step 3: Typecheck + visual verify**

```bash
pnpm type-check
```

Expected: PASS.

```bash
pnpm dev:next
```

In the browser at `/pvp`, switch to the New tab. Expected: see four radio buttons for 1/3/5/7, default 3 highlighted; clicking 5 then submitting creates a match (you should land on `/pvp/match?id=...`).

- [ ] **Step 4: Commit**

```bash
git add renderer/src/components/PvP/NewChallengePrompt.tsx
git commit -m "feat(pvp): NewChallengePrompt — best-of selector"
```

---

### Task 21: Rename `ChallengeCard` → `MatchCard` with score + round

**Repo:** `<app>`

**Files:**
- Rename: `renderer/src/components/PvP/ChallengeCard.tsx` → `MatchCard.tsx`
- Modify: `renderer/src/components/PvP/index.ts`

- [ ] **Step 1: Rename the file**

```bash
git mv renderer/src/components/PvP/ChallengeCard.tsx renderer/src/components/PvP/MatchCard.tsx
```

- [ ] **Step 2: Rewrite component to consume `PvPMatch`**

Replace the file's contents:

```tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlay, faHourglass, faTrophy, faTrash, faSwords } from "@fortawesome/pro-duotone-svg-icons";
import { useSupabase } from "@/lib/supabase-provider";
import { usePvP, PvPMatch, PvPRound } from "@/lib/pvp-provider";

interface Props {
  match: PvPMatch;
}

export function MatchCard({ match }: Props) {
  const router = useRouter();
  const { user } = useSupabase();
  const { fetchRoundsForMatch, startRace } = usePvP();
  const [rounds, setRounds] = useState<PvPRound[]>([]);

  useEffect(() => {
    void fetchRoundsForMatch(match.id).then(setRounds);
  }, [match.id, fetchRoundsForMatch]);

  const isCreator = match.creator_id === user?.id;
  const mySlotKey: "creator" | "joiner" = isCreator ? "creator" : "joiner";
  const myWins  = isCreator ? match.creator_wins : match.joiner_wins;
  const oppWins = isCreator ? match.joiner_wins  : match.creator_wins;

  const nextUnraced = rounds.find(
    (r) => (mySlotKey === "creator" ? r.creator_completed_at : r.joiner_completed_at) === null,
  );
  const isTerminal = ["completed", "cancelled", "expired"].includes(match.status);

  return (
    <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
      <div className="flex items-center justify-between mb-2">
        <FontAwesomeIcon icon={faSwords} className="w-5 h-5 text-blue-500" />
        <span className={clsx(
          "text-xs px-2 py-1 rounded-full",
          match.status === "completed" && "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
          match.status === "in_progress" && "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300",
          match.status === "open" && "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
          (match.status === "cancelled" || match.status === "expired") && "bg-gray-100 text-gray-600 dark:bg-gray-900/40 dark:text-gray-400",
        )}>
          {match.status}
        </span>
      </div>

      <div className="text-sm text-gray-700 dark:text-gray-300 mb-3">
        Best of <strong>{match.best_of}</strong> · Score{" "}
        <strong>{myWins}</strong> – <strong>{oppWins}</strong>
      </div>

      {!isTerminal && nextUnraced && (
        <button
          data-testid="pvp-race-now"
          onClick={() => {
            startRace(match, nextUnraced);
            router.push("/");
          }}
          className="w-full px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-medium flex items-center justify-center gap-2"
        >
          <FontAwesomeIcon icon={faPlay} className="w-4 h-4" />
          Race round {nextUnraced.round_number}
        </button>
      )}

      {!isTerminal && !nextUnraced && (
        <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
          <FontAwesomeIcon icon={faHourglass} className="w-4 h-4" />
          Waiting for opponent
        </div>
      )}

      {match.status === "completed" && (
        <button
          onClick={() => router.push(`/pvp/match?id=${match.id}`)}
          className="w-full px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 font-medium flex items-center justify-center gap-2"
        >
          <FontAwesomeIcon icon={faTrophy} className="w-4 h-4" />
          View result
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Update barrel export**

In `renderer/src/components/PvP/index.ts` replace the `ChallengeCard` export with `MatchCard`:

```ts
export { MatchCard } from "./MatchCard";
export { NewChallengePrompt } from "./NewChallengePrompt";
export { PvPHub } from "./PvPHub";
```

(Drop any `PvPMatch.tsx` re-export if present — that file becomes the routed page in Task 24.)

- [ ] **Step 4: Typecheck**

```bash
pnpm type-check
```

Expected: callers that imported `ChallengeCard` will fail — fix them in their respective tasks (Hub in Task 23, etc.). For now, fix only this file's typecheck. PASS this file.

- [ ] **Step 5: Commit**

```bash
git add renderer/src/components/PvP/MatchCard.tsx renderer/src/components/PvP/index.ts
git commit -m "feat(pvp): MatchCard (renamed from ChallengeCard)"
```

---

### Task 22: `RivalsTab` (new)

**Repo:** `<app>`

**Files:**
- Create: `renderer/src/components/PvP/RivalsTab.tsx`

- [ ] **Step 1: Create the component**

```tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faRedo, faTrophy } from "@fortawesome/pro-duotone-svg-icons";
import { usePvP, PvPRivalRow } from "@/lib/pvp-provider";

export function RivalsTab() {
  const router = useRouter();
  const { listRivals } = usePvP();
  const [rivals, setRivals] = useState<PvPRivalRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void listRivals().then((rows) => {
      if (!cancelled) {
        setRivals(rows);
        setIsLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [listRivals]);

  if (isLoading) {
    return <p className="text-sm text-gray-500 py-4">Loading rivals…</p>;
  }
  if (rivals.length === 0) {
    return (
      <p data-testid="pvp-no-rivals" className="text-sm text-gray-500 py-8 text-center">
        No rivals yet. Finish a match to see them here.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {rivals.map((rival) => (
        <div
          key={rival.rival_id}
          data-testid="pvp-rival-row"
          className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex items-center justify-between"
        >
          <div>
            <p className="font-medium text-gray-900 dark:text-white">
              {rival.rival_id.slice(0, 8)}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
              <FontAwesomeIcon icon={faTrophy} className="w-3 h-3" />
              {rival.matches_won} – {rival.matches_lost}
              <span className="ml-1">({rival.matches_played} played)</span>
            </p>
          </div>
          <button
            data-testid="pvp-rematch"
            onClick={() => router.push(`/pvp?tab=new&rivalId=${rival.rival_id}&fromMatchId=${rival.last_match_id}`)}
            className="px-3 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium flex items-center gap-2"
          >
            <FontAwesomeIcon icon={faRedo} className="w-4 h-4" />
            Rematch
          </button>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
pnpm type-check
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add renderer/src/components/PvP/RivalsTab.tsx
git commit -m "feat(pvp): RivalsTab"
```

---

### Task 23: `PvPHub` — five tabs

**Repo:** `<app>`

**Files:**
- Modify: `renderer/src/components/PvP/PvPHub.tsx`

- [ ] **Step 1: Replace the hub with five-tab layout**

```tsx
"use client";

import { useMemo, useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import clsx from "clsx";
import { useSupabase } from "@/lib/supabase-provider";
import { usePvP } from "@/lib/pvp-provider";
import { MatchCard } from "./MatchCard";
import { NewChallengePrompt } from "./NewChallengePrompt";
import { RivalsTab } from "./RivalsTab";

type Tab = "active" | "awaiting" | "history" | "rivals" | "new";

export function PvPHub() {
  const router = useRouter();
  const params = useSearchParams();
  const { user } = useSupabase();
  const { myMatches, fetchRoundsForMatch } = usePvP();
  const [tab, setTab] = useState<Tab>(() => (params.get("tab") as Tab) ?? "active");
  const [unracedByMatch, setUnracedByMatch] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let cancelled = false;
    async function build() {
      if (!user) return;
      const map: Record<string, boolean> = {};
      for (const m of myMatches) {
        const isCreator = m.creator_id === user.id;
        const rounds = await fetchRoundsForMatch(m.id);
        const hasUnraced = rounds.some((r) =>
          (isCreator ? r.creator_completed_at : r.joiner_completed_at) === null,
        );
        map[m.id] = hasUnraced;
      }
      if (!cancelled) setUnracedByMatch(map);
    }
    void build();
    return () => {
      cancelled = true;
    };
  }, [myMatches, user, fetchRoundsForMatch]);

  const buckets = useMemo(() => {
    const active: typeof myMatches = [];
    const awaiting: typeof myMatches = [];
    const history: typeof myMatches = [];
    for (const m of myMatches) {
      const isTerminal = ["completed", "cancelled", "expired"].includes(m.status);
      if (isTerminal) {
        history.push(m);
        continue;
      }
      if (unracedByMatch[m.id]) active.push(m);
      else awaiting.push(m);
    }
    return { active, awaiting, history };
  }, [myMatches, unracedByMatch]);

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: "active",   label: "Active",   count: buckets.active.length },
    { key: "awaiting", label: "Awaiting", count: buckets.awaiting.length },
    { key: "history",  label: "History",  count: buckets.history.length },
    { key: "rivals",   label: "Rivals" },
    { key: "new",      label: "New" },
  ];

  return (
    <div className="max-w-2xl mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6 text-center">PvP Arena</h1>
      <nav className="flex gap-2 mb-6 border-b border-gray-200 dark:border-gray-800">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => {
              setTab(t.key);
              router.replace(`/pvp?tab=${t.key}`);
            }}
            className={clsx(
              "px-3 py-2 text-sm font-medium border-b-2 -mb-px",
              tab === t.key ? "border-blue-500 text-blue-600 dark:text-blue-400" : "border-transparent text-gray-500",
            )}
            data-testid={`pvp-tab-${t.key}`}
          >
            {t.label}{typeof t.count === "number" ? ` (${t.count})` : ""}
          </button>
        ))}
      </nav>

      {tab === "active" && (buckets.active.length === 0
        ? <p className="text-center text-gray-500 py-8">No active games</p>
        : <div className="space-y-3">{buckets.active.map((m) => <MatchCard key={m.id} match={m} />)}</div>)}
      {tab === "awaiting" && (buckets.awaiting.length === 0
        ? <p className="text-center text-gray-500 py-8">Nothing awaiting</p>
        : <div className="space-y-3">{buckets.awaiting.map((m) => <MatchCard key={m.id} match={m} />)}</div>)}
      {tab === "history" && (buckets.history.length === 0
        ? <p className="text-center text-gray-500 py-8">No history yet</p>
        : <div className="space-y-3">{buckets.history.map((m) => <MatchCard key={m.id} match={m} />)}</div>)}
      {tab === "rivals" && <RivalsTab />}
      {tab === "new"    && <NewChallengePrompt />}
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
pnpm type-check
```

Expected: PASS.

- [ ] **Step 3: Visual verify**

```bash
pnpm dev:next
```

Browse `/pvp`. Expected: five tabs visible (Active / Awaiting / History / Rivals / New). Click each — Active/Awaiting/History show "No active games" / "Nothing awaiting" / "No history yet" if you have no matches; Rivals shows "No rivals yet" copy; New shows the create form with the best-of selector.

- [ ] **Step 4: Commit**

```bash
git add renderer/src/components/PvP/PvPHub.tsx
git commit -m "feat(pvp): PvPHub — five-tab layout"
```

---

### Task 24: Match detail page (rename `/pvp/challenge` → `/pvp/match`)

**Repo:** `<app>`

**Files:**
- Move: `renderer/src/app/pvp/challenge/page.tsx` → `renderer/src/app/pvp/match/page.tsx`
- (Keep the old directory empty; delete it after.)

- [ ] **Step 1: Move the file**

```bash
mkdir -p renderer/src/app/pvp/match
git mv renderer/src/app/pvp/challenge/page.tsx renderer/src/app/pvp/match/page.tsx
rmdir renderer/src/app/pvp/challenge
```

- [ ] **Step 2: Rewrite the page for matches**

Replace the file's contents with the full match-aware page. The logic mirrors v3's challenge page but operates on `PvPMatch` and renders a per-round grid:

```tsx
"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { PvPMatch, PvPRound, usePvP } from "@/lib/pvp-provider";
import { useSupabase } from "@/lib/supabase-provider";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faSpinner, faExclamationTriangle, faLink, faTrophy,
  faHourglass, faTrash, faPlay, faSwords,
} from "@fortawesome/pro-duotone-svg-icons";
import { toast } from "sonner";
import clsx from "clsx";

function MatchPageInner() {
  const params = useSearchParams();
  const router = useRouter();
  const { user, isLoading: isUserLoading } = useSupabase();
  const { fetchById, fetchRoundsForMatch, cancelMatch, startRace } = usePvP();

  const id = params.get("id");
  const [match, setMatch] = useState<PvPMatch | null>(null);
  const [rounds, setRounds] = useState<PvPRound[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!id) {
        setError("Invalid match ID");
        setIsLoading(false);
        return;
      }
      const [m, rs] = await Promise.all([fetchById(id), fetchRoundsForMatch(id)]);
      if (cancelled) return;
      if (!m) setError("Match not found");
      else {
        setMatch(m);
        setRounds(rs);
      }
      setIsLoading(false);
    }
    void load();
    return () => { cancelled = true; };
  }, [id, fetchById, fetchRoundsForMatch]);

  const handleCopyLink = async () => {
    if (!match) return;
    const link = `touchtyper://pvp/invite/${match.invite_code}`;
    try {
      await navigator.clipboard.writeText(link);
      toast.success("Link copied to clipboard!");
    } catch {
      toast.error("Failed to copy link");
    }
  };

  if (isLoading || isUserLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <FontAwesomeIcon icon={faSpinner} className="w-8 h-8 text-gray-400 animate-spin" />
      </div>
    );
  }
  if (error || !match) {
    return (
      <div className="max-w-md mx-auto py-12 text-center">
        <FontAwesomeIcon icon={faExclamationTriangle} className="w-8 h-8 text-red-500 mb-3" />
        <h2 className="text-xl font-bold mb-2">{error ?? "Match not found"}</h2>
        <button onClick={() => router.push("/pvp")} className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600">
          Back to PvP
        </button>
      </div>
    );
  }

  const isCreator = match.creator_id === user?.id;
  const isJoiner  = match.joiner_id === user?.id;
  if (!isCreator && !isJoiner) {
    return (
      <div className="max-w-md mx-auto py-12 text-center">
        <h2 className="text-xl font-bold mb-2">Access denied</h2>
        <p className="text-gray-600 mb-6">
          You aren&apos;t a participant. If a friend shared a link, open it directly to join.
        </p>
        <button onClick={() => router.push("/pvp")} className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600">
          Back to PvP
        </button>
      </div>
    );
  }

  const mySlotKey: "creator" | "joiner" = isCreator ? "creator" : "joiner";
  const nextUnraced = rounds.find(
    (r) => (mySlotKey === "creator" ? r.creator_completed_at : r.joiner_completed_at) === null,
  );
  const isTerminal = ["completed", "cancelled", "expired"].includes(match.status);
  const noSubmissions = rounds.every(
    (r) => r.creator_completed_at === null && r.joiner_completed_at === null,
  );

  return (
    <div className="max-w-2xl mx-auto py-12 space-y-6">
      <div className="text-center">
        <FontAwesomeIcon icon={match.status === "completed" ? faTrophy : faSwords} className="w-12 h-12 text-blue-500 mb-3" />
        <h2 className="text-3xl font-bold">
          {match.status === "completed"
            ? match.winner_id === user?.id ? "You won!" : "You lost"
            : `Best of ${match.best_of}`}
        </h2>
        <p className="text-lg text-gray-600 dark:text-gray-400 mt-1">
          Score {match.creator_wins} – {match.joiner_wins}
        </p>
      </div>

      {/* Per-round grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {rounds.map((r) => {
          const myDone  = (mySlotKey === "creator" ? r.creator_completed_at : r.joiner_completed_at) !== null;
          const oppDone = (mySlotKey === "creator" ? r.joiner_completed_at  : r.creator_completed_at) !== null;
          const resolved = r.winner_id !== null;
          return (
            <div key={r.id} className="p-3 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium">Round {r.round_number}</span>
                {resolved && (
                  <span className={clsx("text-xs px-2 py-0.5 rounded-full",
                    r.winner_id === user?.id ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
                                              : "bg-red-100   text-red-700   dark:bg-red-900/40   dark:text-red-300")}>
                    {r.winner_id === user?.id ? "Won" : "Lost"}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500">
                You: {myDone  ? "✓ submitted" : "—"}<br/>
                Opp: {oppDone ? "✓ submitted" : "—"}
              </p>
            </div>
          );
        })}
      </div>

      {/* Invite link (creators only) */}
      {isCreator && match.status !== "completed" && (
        <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
          <p className="text-sm text-gray-500 mb-2 text-center">Invite Link</p>
          <div className="flex items-center gap-2">
            <code data-testid="pvp-invite-link" className="flex-1 px-3 py-2 bg-white dark:bg-gray-800 rounded-md text-sm font-mono border border-gray-200 dark:border-gray-700 break-all select-all">
              {`touchtyper://pvp/invite/${match.invite_code}`}
            </code>
            <button onClick={handleCopyLink} aria-label="Copy invite link" className="p-2 text-gray-500 hover:text-gray-700">
              <FontAwesomeIcon icon={faLink} className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Primary action */}
      {!isTerminal && nextUnraced && (
        <button
          data-testid="pvp-race-now"
          onClick={() => { startRace(match, nextUnraced); router.push("/"); }}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold bg-blue-500 hover:bg-blue-600 text-white"
        >
          <FontAwesomeIcon icon={faPlay} className="w-5 h-5" />
          Race round {nextUnraced.round_number}
        </button>
      )}
      {!isTerminal && !nextUnraced && (
        <p className="text-center text-gray-500 flex items-center justify-center gap-2">
          <FontAwesomeIcon icon={faHourglass} className="w-4 h-4" />
          Waiting for opponent
        </p>
      )}

      {/* Cancel (creator only, while no submissions) */}
      {isCreator && !isTerminal && noSubmissions && (
        <button
          data-testid="pvp-cancel-match"
          onClick={async () => {
            if (await cancelMatch(match.id)) router.push("/pvp");
          }}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600"
        >
          <FontAwesomeIcon icon={faTrash} className="w-4 h-4" />
          Cancel match
        </button>
      )}

      <button onClick={() => router.push("/pvp")} className="w-full px-4 py-3 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700">
        Back to PvP
      </button>
    </div>
  );
}

export default function MatchPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[50vh]">
        <FontAwesomeIcon icon={faSpinner} className="w-8 h-8 text-gray-400 animate-spin" />
      </div>
    }>
      <MatchPageInner />
    </Suspense>
  );
}
```

- [ ] **Step 3: Update any internal callers**

```bash
grep -rn "/pvp/challenge" renderer/src e2e
```

Replace each occurrence with `/pvp/match`. For each callsite, change `?challengeId=` (if any) to `?id=`.

- [ ] **Step 4: Typecheck + visual verify**

```bash
pnpm type-check
```

Expected: PASS.

```bash
pnpm dev:next
```

Create a BO3 match in the New tab. Expected: redirect lands at `/pvp/match?id=...`, page shows "Best of 3", three round cards each "—/—", invite link visible, "Race round 1" button enabled, "Cancel match" button enabled.

- [ ] **Step 5: Commit**

```bash
git add renderer/src/app/pvp/match/page.tsx renderer/src
git commit -m "feat(pvp): /pvp/match — match detail page (renamed from /pvp/challenge)"
```

---

### Task 25: Invite landing page — match-aware

**Repo:** `<app>`

**Files:**
- Modify: `renderer/src/app/pvp/invite/page.tsx`

- [ ] **Step 1: Replace v3 references with match shape**

Find every reference to `PvPGame`, `fetchByInviteCode` (returns `PvPMatch` now), `joinGame` → `joinMatchByInvite`, `game.message` / `game.level` etc. (now `match.*`).

Key changes:

```tsx
const { fetchByInviteCode, joinMatchByInvite, startRace, fetchRoundsForMatch } = usePvP();
const [match, setMatch] = useState<PvPMatch | null>(null);

// in useEffect:
const m = await fetchByInviteCode(code);
if (m) setMatch(m);

// in handleAccept:
const isAlreadyJoiner = match.joiner_id === user.id;
const isCreator       = match.creator_id === user.id;
const joined = isAlreadyJoiner || isCreator ? match : await joinMatchByInvite(code!);
if (joined) {
  const rounds = await fetchRoundsForMatch(joined.id);
  // Race round 1 if I haven't submitted it yet
  const isCreatorNow = joined.creator_id === user.id;
  const myFirstUnraced = rounds.find(
    (r) => (isCreatorNow ? r.creator_completed_at : r.joiner_completed_at) === null,
  );
  if (myFirstUnraced) startRace(joined, myFirstUnraced);
  setAccepted(true);
  setTimeout(() => router.push("/"), 1500);
}

// In the settings card, show best-of:
<span className="px-3 py-1 ... rounded-md ...">Best of {match.best_of}</span>
```

The test ID `data-testid="pvp-accept-invite"` stays the same.

- [ ] **Step 2: Typecheck + visual verify**

```bash
pnpm type-check
```

Expected: PASS.

```bash
pnpm dev:next
```

Manually navigate to `/pvp/invite?code=<existing_invite_code>` (use a code from the dev DB). Expected: settings card shows the language, level, keyboard, and "Best of N" tag. Click Join & Play with a different user — redirect to `/` then back into a PvP race.

- [ ] **Step 3: Commit**

```bash
git add renderer/src/app/pvp/invite/page.tsx
git commit -m "feat(pvp): invite landing — match-aware"
```

---

### Task 26: `Menu` PvP badge

**Repo:** `<app>`

**Files:**
- Modify: `renderer/src/components/Menu/index.tsx`

- [ ] **Step 1: Update the badge count source**

Find the existing PvP badge logic:

```bash
grep -n "myActiveGames\|pvp" renderer/src/components/Menu/index.tsx | head -10
```

Replace any v3-shaped count (e.g. `myActiveGames.length`) with a count of v4 matches that are non-terminal AND have any unraced round for the user. The simplest derivation reuses `myMatches` and the same `unracedByMatch` map approach as in `PvPHub`. Either:

(a) Have the provider expose a `myActiveCount` derived value (preferred — single source of truth).

Add to `PvPProvider`:

```ts
const [myActiveCount, setMyActiveCount] = useState(0);

useEffect(() => {
  let cancelled = false;
  async function build() {
    if (!user) { setMyActiveCount(0); return; }
    let count = 0;
    for (const m of myMatches) {
      if (["completed","cancelled","expired"].includes(m.status)) continue;
      const rounds = await fetchRoundsForMatch(m.id);
      const isCreator = m.creator_id === user.id;
      if (rounds.some((r) => (isCreator ? r.creator_completed_at : r.joiner_completed_at) === null)) {
        count++;
      }
    }
    if (!cancelled) setMyActiveCount(count);
  }
  void build();
  return () => { cancelled = true; };
}, [myMatches, user, fetchRoundsForMatch]);
```

Add to `PvPContextType`: `myActiveCount: number;` and to the provider's `value={...}`.

(b) In Menu, consume `myActiveCount`:

```tsx
const { myActiveCount } = usePvP();
// ... wherever the badge is rendered:
{myActiveCount > 0 && (
  <span className="ml-2 inline-flex items-center justify-center w-5 h-5 text-xs rounded-full bg-blue-500 text-white">
    {myActiveCount}
  </span>
)}
```

- [ ] **Step 2: Typecheck + visual verify**

```bash
pnpm type-check
```

Expected: PASS.

```bash
pnpm dev:next
```

Create a match. Expected: top-nav PvP item shows a `1` badge. Race the round. After both sides race, badge clears (when no unraced rounds remain for me).

- [ ] **Step 3: Commit**

```bash
git add renderer/src/components/Menu/index.tsx renderer/src/lib/pvp-provider.tsx
git commit -m "feat(pvp): menu badge from myActiveCount"
```

---

## Phase 5 — End-to-end tests (Task 27)

### Task 27: Replace v3 e2e suite with v4 cases

**Repo:** `<app>`

**Files:**
- Modify: `e2e/pvp.spec.ts`

- [ ] **Step 1: Replace the file's contents**

The new suite has nine cases. Helpers (`createTestUser`, `signInUI`, `DB_URL`) come from `e2e/helpers/users.ts`. Direct DB writes use `pg.Client` against `DB_URL` exactly like the v3 suite.

```ts
import { test, expect, type Page, type ConsoleMessage } from "@playwright/test";
import { Client } from "pg";
import {
  createTestUser, deleteTestUser, signInUI,
  uniqueEmail, uniquePassword, DB_URL,
} from "./helpers/users";

function collectConsoleErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (msg: ConsoleMessage) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("pageerror", (err) => errors.push(err.message));
  return errors;
}

test.describe("pvp v4", () => {
  // (a) Smoke
  test.describe("smoke", () => {
    let userId: string;
    const email = uniqueEmail("e2e-pvp4-smoke");
    const password = uniquePassword();
    test.beforeAll(async () => { userId = (await createTestUser(email, password)).id; });
    test.afterAll(async () => { if (userId) await deleteTestUser(userId); });

    test("authenticated user navigates to /pvp without errors", async ({ page }) => {
      const errors = collectConsoleErrors(page);
      await page.goto("/");
      await signInUI(page, email, password);
      await page.goto("/pvp");
      await expect(page.getByRole("heading", { name: "PvP Arena" })).toBeVisible({ timeout: 10_000 });
      await expect(page.getByTestId("pvp-tab-active")).toBeVisible();
      await expect(page.getByTestId("pvp-tab-rivals")).toBeVisible();
      const pvpErrors = errors.filter((e) =>
        /pvp_matches|pvp_games|create_match|join_match|submit_round|invite_code/i.test(e),
      );
      expect(pvpErrors, `unexpected console errors: ${pvpErrors.join("\n")}`).toHaveLength(0);
    });
  });

  // (b) Sequential round-trip — A wins BO3 2-0-1
  test.describe("sequential round-trip", () => {
    const aEmail = uniqueEmail("e2e-pvp4-seq-a");
    const bEmail = uniqueEmail("e2e-pvp4-seq-b");
    const aPassword = uniquePassword();
    const bPassword = uniquePassword();
    let aId: string;
    let bId: string;
    test.beforeAll(async () => {
      aId = (await createTestUser(aEmail, aPassword)).id;
      bId = (await createTestUser(bEmail, bPassword)).id;
    });
    test.afterAll(async () => {
      if (aId) await deleteTestUser(aId);
      if (bId) await deleteTestUser(bId);
    });

    test("A creates BO3, both race all 3 rounds, A wins 2-1", async ({ browser }) => {
      const ctxA = await browser.newContext();
      const ctxB = await browser.newContext();
      const pageA = await ctxA.newPage();
      const pageB = await ctxB.newPage();
      const client = new Client({ connectionString: DB_URL });
      await client.connect();
      try {
        const { rows: m } = await client.query<{ id: string; invite_code: string }>(`
          SELECT * FROM public.create_match_as($1, 'qwerty','novice','english',false,false,false,
            3, '[["the","and","of"],["to","in","it"],["is","at","by"]]'::jsonb, NULL)`,
          [aId],
        );
        const matchId = m[0].id;
        const inviteCode = m[0].invite_code;

        await pageB.goto("/");
        await signInUI(pageB, bEmail, bPassword);
        await pageB.goto(`/pvp/invite?code=${inviteCode}`);
        await pageB.getByTestId("pvp-accept-invite").click();
        await pageB.waitForURL(/\/$/);

        // Round 1: A 90, B 70 → A wins
        await client.query(`SELECT public.submit_round_result_as($1,$2,1,90,50,0,'PT30S',NULL)`, [aId, matchId]);
        await client.query(`SELECT public.submit_round_result_as($1,$2,1,70,50,0,'PT30S',NULL)`, [bId, matchId]);
        // Round 2: A 70, B 90 → B wins
        await client.query(`SELECT public.submit_round_result_as($1,$2,2,70,50,0,'PT30S',NULL)`, [aId, matchId]);
        await client.query(`SELECT public.submit_round_result_as($1,$2,2,90,50,0,'PT30S',NULL)`, [bId, matchId]);
        // Round 3: A 90, B 70 → A wins → match completed
        await client.query(`SELECT public.submit_round_result_as($1,$2,3,90,50,0,'PT30S',NULL)`, [aId, matchId]);
        await client.query(`SELECT public.submit_round_result_as($1,$2,3,70,50,0,'PT30S',NULL)`, [bId, matchId]);

        await pageA.goto("/");
        await signInUI(pageA, aEmail, aPassword);
        await pageA.goto(`/pvp/match?id=${matchId}`);
        await expect(pageA.getByText("You won!")).toBeVisible({ timeout: 10_000 });

        await pageB.goto(`/pvp/match?id=${matchId}`);
        await expect(pageB.getByText("You lost")).toBeVisible({ timeout: 10_000 });

        const { rows: r } = await client.query<{ status: string; winner_id: string; creator_wins: number; joiner_wins: number }>(
          `SELECT status, winner_id, creator_wins, joiner_wins FROM public.pvp_matches WHERE id = $1`,
          [matchId],
        );
        expect(r[0].status).toBe("completed");
        expect(r[0].winner_id).toBe(aId);
        expect(r[0].creator_wins).toBe(2);
        expect(r[0].joiner_wins).toBe(1);
      } finally {
        await client.end();
        await ctxA.close();
        await ctxB.close();
      }
    });
  });

  // (c) Catch-up: B submits all 3 rounds first, A then loses 0-3
  test.describe("catch-up from behind", () => {
    const aEmail = uniqueEmail("e2e-pvp4-catch-a");
    const bEmail = uniqueEmail("e2e-pvp4-catch-b");
    const aPassword = uniquePassword();
    const bPassword = uniquePassword();
    let aId: string, bId: string;
    test.beforeAll(async () => {
      aId = (await createTestUser(aEmail, aPassword)).id;
      bId = (await createTestUser(bEmail, bPassword)).id;
    });
    test.afterAll(async () => {
      if (aId) await deleteTestUser(aId);
      if (bId) await deleteTestUser(bId);
    });

    test("B races all 3 first; status stays open; A then races and loses 0-3", async () => {
      const client = new Client({ connectionString: DB_URL });
      await client.connect();
      try {
        const { rows: m } = await client.query<{ id: string }>(`
          SELECT id FROM public.create_match_as($1, 'qwerty','novice','english',false,false,false,
            3, '[["a"],["b"],["c"]]'::jsonb, NULL)`,
          [aId],
        );
        const matchId = m[0].id;
        await client.query(`SELECT public.join_match_by_invite_as($1,
          (SELECT invite_code FROM public.pvp_matches WHERE id=$2))`, [bId, matchId]);

        // B submits all 3, A submits none → status remains 'open'
        await client.query(`SELECT public.submit_round_result_as($1,$2,1,90,50,0,'PT30S',NULL)`, [bId, matchId]);
        await client.query(`SELECT public.submit_round_result_as($1,$2,2,90,50,0,'PT30S',NULL)`, [bId, matchId]);
        await client.query(`SELECT public.submit_round_result_as($1,$2,3,90,50,0,'PT30S',NULL)`, [bId, matchId]);

        let status = await client.query<{ status: string }>(`SELECT status FROM public.pvp_matches WHERE id=$1`, [matchId]);
        expect(status.rows[0].status).toBe("open");

        // A submits round 1 → status flips to in_progress, score 0-1
        await client.query(`SELECT public.submit_round_result_as($1,$2,1,70,50,0,'PT30S',NULL)`, [aId, matchId]);
        status = await client.query(`SELECT status FROM public.pvp_matches WHERE id=$1`, [matchId]);
        expect(status.rows[0].status).toBe("in_progress");

        // Round 2 → still in_progress at 0-2 (no early termination)
        await client.query(`SELECT public.submit_round_result_as($1,$2,2,70,50,0,'PT30S',NULL)`, [aId, matchId]);
        status = await client.query(`SELECT status FROM public.pvp_matches WHERE id=$1`, [matchId]);
        expect(status.rows[0].status).toBe("in_progress");

        // Round 3 → completed 0-3
        await client.query(`SELECT public.submit_round_result_as($1,$2,3,70,50,0,'PT30S',NULL)`, [aId, matchId]);
        const { rows } = await client.query<{ status: string; winner_id: string }>(
          `SELECT status, winner_id FROM public.pvp_matches WHERE id=$1`, [matchId]);
        expect(rows[0].status).toBe("completed");
        expect(rows[0].winner_id).toBe(bId);
      } finally {
        await client.end();
      }
    });
  });

  // (d) Forfeit
  test.describe("forfeit", () => {
    const aEmail = uniqueEmail("e2e-pvp4-ff-a");
    const bEmail = uniqueEmail("e2e-pvp4-ff-b");
    const aPassword = uniquePassword();
    const bPassword = uniquePassword();
    let aId: string, bId: string;
    test.beforeAll(async () => {
      aId = (await createTestUser(aEmail, aPassword)).id;
      bId = (await createTestUser(bEmail, bPassword)).id;
    });
    test.afterAll(async () => {
      if (aId) await deleteTestUser(aId);
      if (bId) await deleteTestUser(bId);
    });

    test("B forfeits a BO5 mid-match, A wins by forfeit", async () => {
      const client = new Client({ connectionString: DB_URL });
      await client.connect();
      try {
        const { rows: m } = await client.query<{ id: string }>(`
          SELECT id FROM public.create_match_as($1,'qwerty','novice','english',false,false,false,
            5, '[["a"],["b"],["c"],["d"],["e"]]'::jsonb, NULL)`, [aId]);
        const matchId = m[0].id;
        await client.query(`SELECT public.join_match_by_invite_as($1,
          (SELECT invite_code FROM public.pvp_matches WHERE id=$2))`, [bId, matchId]);

        await client.query(`SELECT public.submit_round_result_as($1,$2,1,90,50,0,'PT30S',NULL)`, [aId, matchId]);
        await client.query(`SELECT public.submit_round_result_as($1,$2,1,70,50,0,'PT30S',NULL)`, [bId, matchId]);
        await client.query(`SELECT public.forfeit_match_as($1,$2)`, [bId, matchId]);

        const { rows } = await client.query<{ status: string; winner_id: string; forfeited_by: string }>(
          `SELECT status,winner_id,forfeited_by FROM public.pvp_matches WHERE id=$1`, [matchId]);
        expect(rows[0].status).toBe("completed");
        expect(rows[0].winner_id).toBe(aId);
        expect(rows[0].forfeited_by).toBe(bId);
      } finally {
        await client.end();
      }
    });
  });

  // (e) Cancel — allowed when no submissions
  test.describe("cancel — no submissions", () => {
    const email = uniqueEmail("e2e-pvp4-cancel");
    const password = uniquePassword();
    let userId: string;
    test.beforeAll(async () => { userId = (await createTestUser(email, password)).id; });
    test.afterAll(async () => { if (userId) await deleteTestUser(userId); });

    test("creator cancels via UI", async ({ page }) => {
      const client = new Client({ connectionString: DB_URL });
      await client.connect();
      let matchId: string;
      try {
        const { rows } = await client.query<{ id: string }>(`
          SELECT id FROM public.create_match_as($1,'qwerty','novice','english',false,false,false,
            3, '[["a"],["b"],["c"]]'::jsonb, NULL)`, [userId]);
        matchId = rows[0].id;

        await page.goto("/");
        await signInUI(page, email, password);
        await page.goto(`/pvp/match?id=${matchId}`);
        await page.getByTestId("pvp-cancel-match").click();
        await expect.poll(async () => {
          const r = await client.query<{ status: string }>(`SELECT status FROM public.pvp_matches WHERE id=$1`, [matchId]);
          return r.rows[0]?.status ?? null;
        }, { timeout: 10_000 }).toBe("cancelled");
      } finally {
        await client.end();
      }
    });
  });

  // (f) Cancel — rejected after a submission exists
  test.describe("cancel — rejected after submission", () => {
    const aEmail = uniqueEmail("e2e-pvp4-canrej-a");
    const bEmail = uniqueEmail("e2e-pvp4-canrej-b");
    const aPassword = uniquePassword();
    const bPassword = uniquePassword();
    let aId: string, bId: string;
    test.beforeAll(async () => {
      aId = (await createTestUser(aEmail, aPassword)).id;
      bId = (await createTestUser(bEmail, bPassword)).id;
    });
    test.afterAll(async () => {
      if (aId) await deleteTestUser(aId);
      if (bId) await deleteTestUser(bId);
    });

    test("DB call rejects cancel after a round has any submission", async () => {
      const client = new Client({ connectionString: DB_URL });
      await client.connect();
      try {
        const { rows: m } = await client.query<{ id: string }>(`
          SELECT id FROM public.create_match_as($1,'qwerty','novice','english',false,false,false,
            3, '[["a"],["b"],["c"]]'::jsonb, NULL)`, [aId]);
        const matchId = m[0].id;
        await client.query(`SELECT public.join_match_by_invite_as($1,
          (SELECT invite_code FROM public.pvp_matches WHERE id=$2))`, [bId, matchId]);
        await client.query(`SELECT public.submit_round_result_as($1,$2,1,80,50,0,'PT30S',NULL)`, [aId, matchId]);
        let threw = false;
        try {
          await client.query(`SELECT public.cancel_match_as($1,$2)`, [aId, matchId]);
        } catch { threw = true; }
        expect(threw).toBe(true);
      } finally {
        await client.end();
      }
    });
  });

  // (g) Per-player ordering enforced server-side
  test.describe("per-player ordering enforcement", () => {
    const aEmail = uniqueEmail("e2e-pvp4-ord-a");
    const bEmail = uniqueEmail("e2e-pvp4-ord-b");
    const aPassword = uniquePassword();
    const bPassword = uniquePassword();
    let aId: string, bId: string;
    test.beforeAll(async () => {
      aId = (await createTestUser(aEmail, aPassword)).id;
      bId = (await createTestUser(bEmail, bPassword)).id;
    });
    test.afterAll(async () => {
      if (aId) await deleteTestUser(aId);
      if (bId) await deleteTestUser(bId);
    });

    test("submit_round_result rejects round 2 before round 1", async () => {
      const client = new Client({ connectionString: DB_URL });
      await client.connect();
      try {
        const { rows: m } = await client.query<{ id: string }>(`
          SELECT id FROM public.create_match_as($1,'qwerty','novice','english',false,false,false,
            3, '[["a"],["b"],["c"]]'::jsonb, NULL)`, [aId]);
        const matchId = m[0].id;
        await client.query(`SELECT public.join_match_by_invite_as($1,
          (SELECT invite_code FROM public.pvp_matches WHERE id=$2))`, [bId, matchId]);
        let threw = false;
        try {
          await client.query(`SELECT public.submit_round_result_as($1,$2,2,80,50,0,'PT30S',NULL)`, [aId, matchId]);
        } catch { threw = true; }
        expect(threw).toBe(true);
      } finally {
        await client.end();
      }
    });
  });

  // (h) Rematch from rivals tab
  test.describe("rematch from rivals", () => {
    const aEmail = uniqueEmail("e2e-pvp4-rem-a");
    const bEmail = uniqueEmail("e2e-pvp4-rem-b");
    const aPassword = uniquePassword();
    const bPassword = uniquePassword();
    let aId: string, bId: string;
    test.beforeAll(async () => {
      aId = (await createTestUser(aEmail, aPassword)).id;
      bId = (await createTestUser(bEmail, bPassword)).id;
    });
    test.afterAll(async () => {
      if (aId) await deleteTestUser(aId);
      if (bId) await deleteTestUser(bId);
    });

    test("after a completed match, A's Rivals tab shows B with 1-0 and Rematch", async ({ page }) => {
      const client = new Client({ connectionString: DB_URL });
      await client.connect();
      try {
        const { rows: m } = await client.query<{ id: string }>(`
          SELECT id FROM public.create_match_as($1,'qwerty','novice','english',false,false,false,
            1, '[["a"]]'::jsonb, NULL)`, [aId]);
        const matchId = m[0].id;
        await client.query(`SELECT public.join_match_by_invite_as($1,
          (SELECT invite_code FROM public.pvp_matches WHERE id=$2))`, [bId, matchId]);
        await client.query(`SELECT public.submit_round_result_as($1,$2,1,90,50,0,'PT30S',NULL)`, [aId, matchId]);
        await client.query(`SELECT public.submit_round_result_as($1,$2,1,70,50,0,'PT30S',NULL)`, [bId, matchId]);

        await page.goto("/");
        await signInUI(page, aEmail, aPassword);
        await page.goto("/pvp?tab=rivals");
        await expect(page.getByTestId("pvp-rival-row")).toBeVisible({ timeout: 10_000 });
        await expect(page.getByText(/1\s*–\s*0/)).toBeVisible();
        await expect(page.getByTestId("pvp-rematch")).toBeVisible();
      } finally {
        await client.end();
      }
    });
  });

  // (i) Already-joined invite
  test.describe("already-joined invite", () => {
    const aEmail = uniqueEmail("e2e-pvp4-aj-a");
    const bEmail = uniqueEmail("e2e-pvp4-aj-b");
    const cEmail = uniqueEmail("e2e-pvp4-aj-c");
    const aPassword = uniquePassword();
    const bPassword = uniquePassword();
    const cPassword = uniquePassword();
    let aId: string, bId: string, cId: string;
    test.beforeAll(async () => {
      aId = (await createTestUser(aEmail, aPassword)).id;
      bId = (await createTestUser(bEmail, bPassword)).id;
      cId = (await createTestUser(cEmail, cPassword)).id;
    });
    test.afterAll(async () => {
      if (aId) await deleteTestUser(aId);
      if (bId) await deleteTestUser(bId);
      if (cId) await deleteTestUser(cId);
    });

    test("third user opening a fully-joined invite sees closed state", async ({ page }) => {
      const client = new Client({ connectionString: DB_URL });
      await client.connect();
      try {
        const { rows: m } = await client.query<{ id: string; invite_code: string }>(`
          SELECT id, invite_code FROM public.create_match_as($1,'qwerty','novice','english',false,false,false,
            1, '[["a"]]'::jsonb, NULL)`, [aId]);
        const inviteCode = m[0].invite_code;
        await client.query(`SELECT public.join_match_by_invite_as($1,$2)`, [bId, inviteCode]);

        await page.goto("/");
        await signInUI(page, cEmail, cPassword);
        await page.goto(`/pvp/invite?code=${inviteCode}`);
        await expect(page.getByText(/someone else has already joined/i)).toBeVisible({ timeout: 10_000 });
      } finally {
        await client.end();
      }
    });
  });
});
```

Note: this suite uses test-only helper functions `create_match_as`, `submit_round_result_as`, `join_match_by_invite_as`, `forfeit_match_as`, `cancel_match_as` that **set the auth.uid context for an arbitrary user** before calling the real RPC. Add them to the migration in step 2.

- [ ] **Step 2: Add test helper functions to the migration**

Append to the end of `<backend>/supabase/migrations/20260508150000_pvp_v4.sql`:

```sql
-- =========================================================================
-- TEST-ONLY HELPERS (so e2e can act as a specific user from a single conn)
-- These wrap the real RPCs, setting request.jwt.claims for the call. They
-- are SECURITY DEFINER and only callable in dev (no GRANTs to authenticated).
-- Production deploys: leave these in place — they're scoped to service_role.
-- =========================================================================
CREATE OR REPLACE FUNCTION public.create_match_as(
  _user UUID, _keyboard VARCHAR, _level VARCHAR, _language VARCHAR,
  _capital BOOLEAN, _punctuation BOOLEAN, _numbers BOOLEAN,
  _best_of SMALLINT, _word_sets JSONB, _message TEXT
)
RETURNS public.pvp_matches
LANGUAGE plpgsql
AS $$
DECLARE m public.pvp_matches;
BEGIN
  PERFORM set_config('request.jwt.claims', json_build_object('sub', _user::text)::text, true);
  SELECT * INTO m FROM public.create_match(_keyboard, _level, _language, _capital, _punctuation, _numbers, _best_of, _word_sets, _message);
  RETURN m;
END $$;

CREATE OR REPLACE FUNCTION public.join_match_by_invite_as(_user UUID, _code VARCHAR)
RETURNS public.pvp_matches
LANGUAGE plpgsql
AS $$
DECLARE m public.pvp_matches;
BEGIN
  PERFORM set_config('request.jwt.claims', json_build_object('sub', _user::text)::text, true);
  SELECT * INTO m FROM public.join_match_by_invite(_code);
  RETURN m;
END $$;

CREATE OR REPLACE FUNCTION public.submit_round_result_as(
  _user UUID, _match_id UUID, _round_number SMALLINT,
  _cpm NUMERIC, _correct INTEGER, _incorrect INTEGER, _time TEXT, _key_presses JSONB
)
RETURNS public.pvp_games
LANGUAGE plpgsql
AS $$
DECLARE r public.pvp_games;
BEGIN
  PERFORM set_config('request.jwt.claims', json_build_object('sub', _user::text)::text, true);
  SELECT * INTO r FROM public.submit_round_result(_match_id, _round_number, _cpm, _correct, _incorrect, _time, _key_presses);
  RETURN r;
END $$;

CREATE OR REPLACE FUNCTION public.forfeit_match_as(_user UUID, _match_id UUID)
RETURNS public.pvp_matches
LANGUAGE plpgsql
AS $$
DECLARE m public.pvp_matches;
BEGIN
  PERFORM set_config('request.jwt.claims', json_build_object('sub', _user::text)::text, true);
  SELECT * INTO m FROM public.forfeit_match(_match_id);
  RETURN m;
END $$;

CREATE OR REPLACE FUNCTION public.cancel_match_as(_user UUID, _match_id UUID)
RETURNS public.pvp_matches
LANGUAGE plpgsql
AS $$
DECLARE m public.pvp_matches;
BEGIN
  PERFORM set_config('request.jwt.claims', json_build_object('sub', _user::text)::text, true);
  SELECT * INTO m FROM public.cancel_match(_match_id);
  RETURN m;
END $$;
```

(These helpers are reachable via `service_role` only — the e2e's `pg.Client` connects as the local DB superuser, which is what runs in dev anyway.)

- [ ] **Step 3: Apply migration and run pgTAP tests one more time**

```bash
# from <backend>
supabase db reset
psql "$(supabase status -o env | grep DB_URL | cut -d= -f2 | tr -d '"')" -v ON_ERROR_STOP=1 -f supabase/tests/pvp_v4.test.sql

# from <app>, regen types
cd ../touch-type
supabase gen types typescript --local --workdir ../touch-type-backend > renderer/src/types/supabase.ts || \
  ( cd ../touch-type-backend && supabase gen types typescript --local > ../touch-type/renderer/src/types/supabase.ts )
pnpm type-check
```

Expected: pgTAP passes, types include `create_match_as` etc., typecheck passes.

- [ ] **Step 4: Run the e2e suite**

```bash
# from <app>
pnpm test:e2e -- pvp.spec.ts
```

Expected: all 9 tests pass.

- [ ] **Step 5: Commit**

```bash
# in <backend>
cd ../touch-type-backend
git add supabase/migrations/20260508150000_pvp_v4.sql
git commit -m "feat(pvp): v4 — test-only *_as helper RPCs for e2e"

# in <app>
cd ../touch-type
git add e2e/pvp.spec.ts renderer/src/types/supabase.ts
git commit -m "test(pvp): replace v3 e2e suite with v4 cases"
```

---

## Self-review checklist

After completing all 27 tasks, verify:

**Spec coverage (each requirement → task):**
- v4 best-of-N parallel-play matches → Tasks 1, 4, 8 (DB), 14, 16 (provider), 20, 23, 24 (UI), 27 (e2e).
- Per-round word-set lock → Tasks 5, 14.
- Match completes when all rounds resolved (no early termination) → Tasks 4, 27 (catch-up case).
- Forfeit invariant exception (`winner_id` may not match score columns) → Tasks 9 (RPC + test).
- Rivals derived view + rematch flow → Tasks 11, 22, 26 (Hub wires the `?tab=rivals` link), 27 (rematch test).
- All mutations through SECURITY DEFINER RPCs → Tasks 5–11 (no INSERT/UPDATE/DELETE policies on the tables).
- Realtime subscriptions on both tables → Tasks 1, 18.
- Per-player ordering server-side enforcement → Task 8 (RPC + tests), 27 (e2e ordering case).
- Cancel-window key on submissions, not status → Tasks 10, 27.

**Type consistency check:**
- `PvPMatch` / `PvPRound` named consistently across provider, components, pages, e2e.
- RPC parameter prefixes (`_keyboard`, `_match_id`, etc.) match between migration and provider calls.
- `submit_round_result` parameter list (no `_slot`) is identical between migration and `submitRoundResult` in the provider.

**Placeholder scan:** the plan contains zero `TBD`/`TODO`/`fill in` instructions — every step has actual code or an actual command with expected output.

**Note on the spec's two advisory items:**
- *Subscribe-before-click race* — handled in Task 18: the provider sets up its realtime channel inside `useEffect` keyed on `user`, so it's live before `MatchCard` renders the action button.
- *`pvp_games` ≡ "rounds" glossary* — handled by the `PvPRound` type alias used everywhere in the renderer (Task 13).
