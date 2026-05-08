# PvP v4 — Matches + Rivals — Design

**Date:** 2026-05-08
**Status:** Approved (design phase). Implementation not yet started.
**Repos affected:** `touch-type-backend/` (migration + RPCs), `touch-type/` (renderer + e2e tests).

## Context

PvP v3 (shipped on `kochie/feat/pvp`) introduced the symmetric "blind game" model: a creator opens a `pvp_games` row, a joiner claims it via invite link, both race the same word set blind, and the result is revealed once both submit. The flow works end-to-end and has e2e coverage, but two design limits surfaced as soon as it was usable:

- **A single race is too short to feel like a match.** People want best-of-3 or best-of-5 sets, not one-and-done.
- **There's no concept of "I want to play that person again."** The round-trip is purely link-driven — once a game is over, the relationship between two players evaporates.

v4 generalizes the v3 row into a **match of N rounds** and surfaces the **rivalry** that emerges from repeated play. It replaces v3 destructively (no production users yet — the feature is on a feature branch).

The other big move: **all PvP mutations now go through SECURITY DEFINER RPCs.** v2 and v3 each tripped the same class of PostgREST footguns (RETURNING-clause filter trap, SELECT-visibility-required-for-UPDATE, RLS policies that have to mirror invariants instead of expressing them). RPCs let us write atomic conditional UPDATEs in plain SQL and only worry about RLS for SELECT.

## Goals

- A "match" can be best-of 1, 3, 5, or 7 rounds. Rounds reveal results immediately; the match completes as soon as one player has the majority of round wins.
- Rivals (people you've played at least one match against) are listed in a dedicated tab with a one-click **Rematch** button that pre-fills settings from the previous match.
- A match always resolves to exactly one winner — ties are not possible (odd best-of + per-round tiebreaker chain).
- All mutations route through SECURITY DEFINER RPCs: the renderer never writes to PvP tables directly.
- E2E coverage exercises the full round-trip including a multi-round match and a rematch.

## Non-goals (deferred)

- Friends/follow system (rivals are derived from match history alone — no explicit friendship object).
- Live keystroke streaming between players.
- Configurable round length / per-round settings change.
- Web fallback for non-app users (links remain `touchtyper://`).
- Match queue or matchmaking (every match is invite-link-only, like v3).
- Direct user-to-user challenges (no user search).
- Spectator mode.

---

## Design

### §1 — Data model

Two tables. The parent `pvp_matches` row holds the match-level state (best-of N, settings, score, winner). Each `pvp_games` row is one **round** within a match, holding the per-round word set and both players' result slots — essentially the v3 row, parented by a match.

Rivals are derived (no third table) from completed matches.

```sql
-- Match: parent row
CREATE TABLE public.pvp_matches (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invite_code     VARCHAR(12) UNIQUE NOT NULL,
  status          VARCHAR(16) NOT NULL DEFAULT 'open'
                  CHECK (status IN ('open','in_progress','completed','cancelled','expired')),
  best_of         SMALLINT NOT NULL CHECK (best_of IN (1,3,5,7)),

  -- Settings locked at match creation; every round inherits them
  keyboard        VARCHAR(50) NOT NULL,
  level           VARCHAR(20) NOT NULL,
  language        VARCHAR(10) NOT NULL,
  capital         BOOLEAN     NOT NULL DEFAULT false,
  punctuation     BOOLEAN     NOT NULL DEFAULT false,
  numbers         BOOLEAN     NOT NULL DEFAULT false,
  message         TEXT,

  creator_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joiner_id       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  joiner_joined_at TIMESTAMPTZ,

  creator_wins    SMALLINT NOT NULL DEFAULT 0,
  joiner_wins     SMALLINT NOT NULL DEFAULT 0,

  winner_id       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  forfeited_by    UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  expires_at      TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- A completed match must have a winner. No ties (odd best_of + tiebreaker chain).
  CHECK (status <> 'completed' OR winner_id IS NOT NULL)
);

-- Round: child row, one per round in the match
CREATE TABLE public.pvp_games (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id        UUID NOT NULL REFERENCES public.pvp_matches(id) ON DELETE CASCADE,
  round_number    SMALLINT NOT NULL CHECK (round_number BETWEEN 1 AND 7),

  word_set        TEXT[] NOT NULL,

  -- Creator slot
  creator_cpm           NUMERIC,
  creator_correct       INTEGER,
  creator_incorrect     INTEGER,
  creator_time          TEXT,
  creator_key_presses   JSONB,
  creator_completed_at  TIMESTAMPTZ,

  -- Joiner slot
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
```

**Round generation strategy:** Eager. When a match is created, the renderer generates `best_of` distinct word sets and passes them as `TEXT[][]` into the `create_match` RPC, which inserts the match row plus all N round rows in a single transaction. Each round's word set is locked at match creation, mirroring v3's "settings are a snapshot" guarantee. A player who races round 1, then settings change in their profile, still sees round 2's pre-locked words.

**Rivals (derived, not stored):**

```sql
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
    COUNT(*)::INTEGER                                       AS matches_played,
    COUNT(*) FILTER (WHERE p.winner_id = (SELECT uid FROM me))::INTEGER AS matches_won,
    COUNT(*) FILTER (WHERE p.winner_id <> (SELECT uid FROM me))::INTEGER AS matches_lost,
    MAX(p.updated_at)                                       AS last_played_at,
    (ARRAY_AGG(p.id ORDER BY p.updated_at DESC))[1]         AS last_match_id
  FROM played p
  GROUP BY p.rival_id
  ORDER BY MAX(p.updated_at) DESC;
$$;
```

Rivals are anyone you've completed at least one match with. Cancelled/expired matches don't count. The `last_match_id` is what the **Rematch** button hydrates from.

---

### §2 — State machine + completion logic

**Match status lifecycle:**

```
open ─(joiner claims)──► open (with joiner)
                              │
       (first race result submitted) ▼
                          in_progress ─(target wins reached)─► completed
                              │
                              ├──(forfeit)──► completed (winner = other side)
                              ├──(creator cancels, no rounds played)──► cancelled
                              └──(expires_at passed)──► expired
```

`open` covers both "no joiner yet" and "joiner has claimed but no one has submitted a round result". `in_progress` only means "at least one round has been raced". This keeps the cancel-by-creator window aligned with §3's UI rule (creator can pull a match back so long as no actual play has happened).

**Round lifecycle (per row in `pvp_games`):**

```
both slots NULL ──► one slot filled ──► both slots filled ──► winner_id + completed_at set
```

A round always resolves to a winner. The tiebreaker chain (applied in order):

1. Higher **cpm** wins.
2. If tied, higher **accuracy** (`correct / (correct + incorrect)`) wins.
3. If still tied, the player with the **earlier `_completed_at` timestamp** wins.

`completed_at` is monotonic (`NOW()` at submit time) and unique to nanosecond precision in practice — the chain is guaranteed to terminate.

**Trigger: `complete_pvp_round()`** (BEFORE UPDATE on `pvp_games`)

```sql
CREATE OR REPLACE FUNCTION public.complete_pvp_round()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  c_acc NUMERIC;
  j_acc NUMERIC;
BEGIN
  IF NEW.creator_completed_at IS NOT NULL
     AND NEW.joiner_completed_at IS NOT NULL
     AND NEW.winner_id IS NULL THEN

    c_acc := CASE WHEN COALESCE(NEW.creator_correct,0) + COALESCE(NEW.creator_incorrect,0) = 0
                  THEN 0 ELSE NEW.creator_correct::NUMERIC / (NEW.creator_correct + NEW.creator_incorrect) END;
    j_acc := CASE WHEN COALESCE(NEW.joiner_correct,0) + COALESCE(NEW.joiner_incorrect,0) = 0
                  THEN 0 ELSE NEW.joiner_correct::NUMERIC / (NEW.joiner_correct + NEW.joiner_incorrect) END;

    NEW.winner_id := CASE
      WHEN NEW.creator_cpm > NEW.joiner_cpm THEN
        (SELECT creator_id FROM public.pvp_matches WHERE id = NEW.match_id)
      WHEN NEW.joiner_cpm > NEW.creator_cpm THEN
        (SELECT joiner_id  FROM public.pvp_matches WHERE id = NEW.match_id)
      WHEN c_acc > j_acc THEN
        (SELECT creator_id FROM public.pvp_matches WHERE id = NEW.match_id)
      WHEN j_acc > c_acc THEN
        (SELECT joiner_id  FROM public.pvp_matches WHERE id = NEW.match_id)
      WHEN NEW.creator_completed_at < NEW.joiner_completed_at THEN
        (SELECT creator_id FROM public.pvp_matches WHERE id = NEW.match_id)
      ELSE
        (SELECT joiner_id  FROM public.pvp_matches WHERE id = NEW.match_id)
    END;
    NEW.completed_at := NOW();
  END IF;
  RETURN NEW;
END;
$$;
```

**Trigger: `advance_pvp_match()`** (AFTER UPDATE on `pvp_games`, when `winner_id` was NULL → NOT NULL)

Increments the match's `creator_wins` or `joiner_wins`. If either side has reached `target_wins = (best_of / 2) + 1` (integer division), flips match status to `completed` and sets `winner_id`.

```sql
CREATE OR REPLACE FUNCTION public.advance_pvp_match()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  m              public.pvp_matches%ROWTYPE;
  target_wins    INTEGER;
  is_creator_win BOOLEAN;
BEGIN
  IF NEW.winner_id IS NULL OR (OLD.winner_id IS NOT NULL) THEN
    RETURN NEW;
  END IF;

  SELECT * INTO m FROM public.pvp_matches WHERE id = NEW.match_id FOR UPDATE;
  is_creator_win := (NEW.winner_id = m.creator_id);
  target_wins    := (m.best_of / 2) + 1;

  UPDATE public.pvp_matches
     SET creator_wins = creator_wins + CASE WHEN is_creator_win THEN 1 ELSE 0 END,
         joiner_wins  = joiner_wins  + CASE WHEN is_creator_win THEN 0 ELSE 1 END,
         status       = CASE
                          WHEN m.status = 'open' THEN 'in_progress'
                          ELSE m.status
                        END
   WHERE id = NEW.match_id;

  -- Re-check after increment for completion
  UPDATE public.pvp_matches
     SET status    = 'completed',
         winner_id = CASE WHEN creator_wins >= target_wins THEN creator_id ELSE joiner_id END
   WHERE id = NEW.match_id
     AND (creator_wins >= target_wins OR joiner_wins >= target_wins);

  RETURN NEW;
END;
$$;
```

Forfeit and expiry are written by RPCs (not triggers), and both set `winner_id` directly to the non-forfeiting side / non-creator side — they bypass round counting.

---

### §3 — UI flow + components

**Routes** (all static + query-param to keep `output: "export"` happy):

- `/pvp` — Hub with five tabs.
- `/pvp/match?id=<uuid>` — Match detail (replaces v3's `/pvp/challenge`).
- `/pvp/invite?code=<invite_code>` — Invite landing.

**Hub tabs:**

| Tab | Contents |
|---|---|
| **Active** | Matches where it's my turn to race the next round, or the joiner just claimed and I'm the creator who hasn't raced round 1 yet. |
| **Awaiting** | Matches where I've raced everything available to me and I'm waiting for the other side. |
| **History** | Completed/cancelled/expired matches. Most recent first. |
| **Rivals** | One row per rival (from `list_my_rivals()`). Shows record (W-L), last played, **Rematch** button. |
| **New** | Create-match form (NewChallengePrompt). |

**Components:**

- `MatchCard` (renamed from `ChallengeCard`): summarizes one match, displays `creator_wins` – `joiner_wins`, current round number, status badge, and the appropriate primary action (Race next round / View result / Copy link / Cancel).
- `NewChallengePrompt`: existing form, plus a **Best-of** segmented control (`1 / 3 / 5 / 7`, default `3`). On submit, the renderer pre-generates `best_of` distinct word sets from the user's chosen language/capital/punctuation/numbers settings and calls `create_match(...)` with the array.
- `RivalsTab` (new): list of rivals from the RPC. Rematch button opens NewChallengePrompt pre-filled from the last match (settings, best-of, message blank), with a `?rivalId=` query param that pre-locks the joiner side: the resulting match still uses an invite link, but with a "Direct rematch with @rival — they'll see your link in their Active tab" hint. (For v4, rematches are still link-driven; auto-binding the rival without a fresh accept is a v5 problem.)
- `Tracker` banner: shows "PvP — Round N of M, score X–Y" instead of v3's plain "PvP mode".

**Cancel-by-creator window (loosened from v3):** the creator may cancel a match while `creator_wins = 0 AND joiner_wins = 0` (i.e., status is `open`, no rounds completed). This lets a creator reclaim a stale rematch the rival never engaged with — the v3 rule of "open and joiner not yet present" was too tight for the rematch flow.

**Forfeit:** during a race, the Tracker's forfeit button calls the `forfeit_match` RPC. The RPC sets match `status = 'completed'`, `forfeited_by = caller`, and `winner_id = the other side`. Already-completed rounds keep their winners; in-progress rounds are left as-is (no special record — the match is over).

**Round reveal cadence:** the Match detail page subscribes to realtime on the match row and its rounds. As soon as a round flips to `winner_id IS NOT NULL`, it's revealed. The next round's "Race now" button enables once both sides have seen the prior round (i.e., the prior round is completed and the match is still `in_progress`).

---

### §4 — RLS, RPCs, testing, migration

**RLS posture:** SELECT-only RLS on tables; all writes go through SECURITY DEFINER RPCs.

```sql
ALTER TABLE public.pvp_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pvp_games   ENABLE ROW LEVEL SECURITY;

-- Match SELECT: participants always; open+unjoined matches visible to everyone
-- (so a joiner's RPC can resolve the row before claiming)
CREATE POLICY "match_select" ON public.pvp_matches
  FOR SELECT TO authenticated
  USING (
    auth.uid() IN (creator_id, joiner_id)
    OR (status = 'open' AND joiner_id IS NULL)
  );

-- Round SELECT: visible if you can see the parent match
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

-- No INSERT/UPDATE/DELETE policies. RPCs do all writes.
```

**RPCs** (all `SECURITY DEFINER`, `SET search_path = public`, granted to `authenticated`):

| RPC | Purpose |
|---|---|
| `create_match(_settings, _best_of, _word_sets TEXT[][], _message)` | Inserts match + N round rows in one tx. Returns the new match. |
| `get_match_by_invite_code(_code)` | Resolves a match for the invite landing page (caller may not yet be a participant). |
| `join_match_by_invite(_code)` | Atomic: claims joiner slot if `joiner_id IS NULL AND auth.uid() <> creator_id`. Sets `joiner_joined_at`. Returns the match. |
| `submit_round_result(_match_id, _round_number, _slot, _cpm, _correct, _incorrect, _time, _key_presses)` | Updates the appropriate slot on the right round, with a CHECK that the caller is the right participant for `_slot`. Trigger handles round winner + match advance. |
| `forfeit_match(_match_id)` | Sets match completed, forfeited_by = caller, winner_id = other side. |
| `cancel_match(_match_id)` | Creator only, status='open' AND no rounds played. |
| `list_my_rivals()` | See §1. |

Each RPC asserts the caller's role inline (not via RLS), raising `RAISE EXCEPTION` on violation. The renderer's `pvp-provider.tsx` becomes a thin wrapper around `supabase.rpc(...)` calls.

**Realtime:** publish `pvp_matches` and `pvp_games`. SELECT RLS gates what each subscriber sees.

**Indexes** (already declared in §1) cover the lookup paths: `invite_code`, `creator_id`, `joiner_id`, `status` on matches; `match_id` on rounds.

**Testing:**

- **pgTAP** (in `touch-type-backend/supabase/tests/pvp_v4.sql`): 
  - Round trigger sets winner correctly across all three tiebreaker tiers.
  - Match advance fires only on round-winner transition (NULL → NOT NULL).
  - Match completes exactly when target_wins is reached.
  - `cancel_match` rejects when `creator_wins + joiner_wins > 0`.
  - `forfeit_match` sets the right winner and forfeited_by.
  - `list_my_rivals()` excludes cancelled/expired and sums wins/losses correctly.
  - `join_match_by_invite` rejects double-join.
- **Playwright** (in `touch-type/e2e/pvp.spec.ts`, replacing v3 cases):
  - **Smoke**: authenticated user navigates to `/pvp`, sees five-tab layout.
  - **Best-of-3 round-trip**: A creates BO3, B joins, both race round 1 (B wins), both race round 2 (A wins), both race round 3 (A wins) → match `completed`, `winner_id = aId`, History tab shows match for both, Rivals tab shows the other player for both.
  - **Forfeit mid-match**: A creates BO5, B joins, round 1 played (A wins), B forfeits round 2 → match completed, `winner_id = aId`, `forfeited_by = bId`.
  - **Cancel while no rounds played**: Creator cancels a BO3 with joiner present but no submitted rounds → status `cancelled`.
  - **Cancel after round played is rejected**: Creator hits cancel after round 1 completes → RPC raises, UI shows error.
  - **Rematch from rivals tab**: After a completed match, A's Rivals tab lists B with W/L; clicking Rematch opens NewChallengePrompt pre-filled with prior settings.
  - **Already-joined invite**: a third user opening a fully-joined invite sees the closed-state copy.

**Migration plan (destructive, no production users):**

The new migration `20260508150000_pvp_v4.sql`:

1. `DROP TABLE public.pvp_games CASCADE;` (drops triggers, policies, functions tied to v3).
2. `DROP FUNCTION IF EXISTS public.complete_pvp_game(); DROP FUNCTION IF EXISTS public.set_pvp_invite_code(); DROP FUNCTION IF EXISTS public.get_game_by_invite_code(VARCHAR);` (anything that survived the CASCADE).
3. `CREATE TABLE public.pvp_matches ...` and `CREATE TABLE public.pvp_games ...` per §1.
4. Re-create `set_pvp_invite_code()` (now firing on `pvp_matches`).
5. Create `complete_pvp_round()`, `advance_pvp_match()`, and the seven RPCs from §4.
6. Re-attach RLS, realtime publication, grants.

A new types regen pass (`supabase gen types typescript --local > ../touch-type/renderer/src/types/supabase.ts`) updates the renderer types in lockstep.

The renderer's `pvp-provider.tsx` is rewritten as a thin RPC wrapper:

```ts
type PvPMatch = Database["public"]["Tables"]["pvp_matches"]["Row"];
type PvPRound = Database["public"]["Tables"]["pvp_games"]["Row"];

async function createMatch(input: CreateMatchInput): Promise<PvPMatch | null> {
  const wordSets = generateRoundWordSets(input.bestOf, input.settings);
  const { data, error } = await supabase.rpc("create_match", {
    _keyboard: input.settings.keyboard,
    _level: input.settings.level,
    _language: input.settings.language,
    _capital: input.settings.capital,
    _punctuation: input.settings.punctuation,
    _numbers: input.settings.numbers,
    _best_of: input.bestOf,
    _word_sets: wordSets,
    _message: input.message ?? null,
  });
  if (error) { console.error("Error creating match:", error); return null; }
  return data;
}
```

All other mutations (`joinMatch`, `submitRoundResult`, `forfeitMatch`, `cancelMatch`) follow the same pattern.

---

## Open questions / future work

- **Auto-bind rematch**: today, even a "rematch" still requires the rival to open the invite link. A future iteration could auto-bind the rival as joiner (since they're the implied counterparty) and notify them via push.
- **Match expiry sweeper**: `expires_at` is set, but nothing flips status to `expired` on a schedule. A pg_cron job (or edge function) should sweep stale matches; for v4 we rely on the renderer to display expired matches as terminal when `expires_at < NOW()` even if the row still says `open`.
- **Round abandonment**: if a player joins, races round 1, then never returns, the match sits in `in_progress` until expiry. v4 accepts this; v5 might add a per-round timer.
- **Streak/elo signal**: rivals could surface a streak indicator ("won last 3") — easy to derive from existing data without schema changes.
