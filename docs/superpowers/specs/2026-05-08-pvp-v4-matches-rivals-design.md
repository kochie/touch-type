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

- A "match" can be best-of 1, 3, 5, or 7 rounds. Each player races their own rounds at their own pace — neither has to wait for the other. Each round resolves the moment both players have submitted for it; the match completes once **all** rounds have been resolved, and the player with more round wins takes the match.
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
              (first round completes) ▼
                          in_progress ─(all best_of rounds resolved)─► completed
                              │
                              ├──(forfeit)──► completed (winner = other side)
                              ├──(creator cancels, no submissions yet)──► cancelled
                              └──(expires_at passed)──► expired
```

`open` covers both "no joiner yet" and "joiner has claimed but no round has resolved". `in_progress` is set by the round-advance trigger when the first round flips to a winner. **There is no early termination**: even when the running win count makes the eventual winner mathematically certain (e.g., 2-0 in BO3), the match remains `in_progress` until the final round resolves. This lets a trailing player still race every round — the catch-up is the point of the parallel-play model. The cancel-by-creator window is *not* gated on status — see "Cancel" below for the precise check.

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

Increments the match's `creator_wins` or `joiner_wins`, flips status to `in_progress` on the first round resolution, and to `completed` once `creator_wins + joiner_wins = best_of` (i.e., every round has resolved). Match `winner_id` is the side with the higher win count — guaranteed unique because `best_of` is odd, so a tied count at completion is impossible.

```sql
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
```

**Concurrency:** Rounds resolve independently — two rounds could resolve in close succession (e.g., creator submits the last needed slot on rounds 2 and 3 back-to-back). The `FOR UPDATE` on the match row serializes the increments and completion check, so the running totals stay accurate even under concurrent round-resolution writes.

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
| **Active** | Matches that aren't terminal *and* I still have unraced rounds. The primary action card surfaces "Race round N" where N is my next un-submitted round. |
| **Awaiting** | Matches where I've submitted all `best_of` rounds and the match isn't completed yet — i.e., the opponent still has rounds to race. The card shows my running tally and which rounds the opponent has yet to submit. |
| **History** | Completed/cancelled/expired matches. Most recent first. |
| **Rivals** | One row per rival (from `list_my_rivals()`). Shows record (W-L), last played, **Rematch** button. |
| **New** | Create-match form (NewChallengePrompt). |

**Components:**

- `MatchCard` (renamed from `ChallengeCard`): summarizes one match, displays `creator_wins` – `joiner_wins`, current round number, status badge, and the appropriate primary action (Race next round / View result / Copy link / Cancel).
- `NewChallengePrompt`: existing form, plus a **Best-of** segmented control (`1 / 3 / 5 / 7`, default `3`). On submit, the renderer pre-generates `best_of` distinct word sets from the user's chosen language/capital/punctuation/numbers settings and calls `create_match(...)` with the array.
- `RivalsTab` (new): list of rivals from the RPC. Rematch opens NewChallengePrompt pre-filled from the last match (settings, best-of; message blank). The `?rivalId=` query param is **UI-only** — it has no DB column and writes nothing to `pvp_matches`. Its sole purpose is to seed the form and render a "Rematch with @rival — share the link with them" hint above the create button. The created match is a normal invite-link match; the rival opens the link to claim the joiner slot. Auto-binding the rival without a fresh accept is a v5 problem.
- `Tracker` banner: shows "PvP — Round N of M, score X–Y" instead of v3's plain "PvP mode".

**Cancel-by-creator window (loosened from v3):** the creator may cancel a match while no round has *any* submission. Concretely, the `cancel_match` RPC checks `NOT EXISTS (SELECT 1 FROM pvp_games WHERE match_id = $1 AND (creator_completed_at IS NOT NULL OR joiner_completed_at IS NOT NULL))`. This is independent of match status — `open` (no joiner) and `open` (joiner present but nobody has raced) both cancel cleanly; once a single race has been submitted, cancel is rejected. v3's rule of "open and joiner not yet present" was too tight for the rematch flow.

**Forfeit:** during a race, the Tracker's forfeit button calls the `forfeit_match` RPC. The RPC sets match `status = 'completed'`, `forfeited_by = caller`, and `winner_id = the other side`. Already-completed rounds keep their winners; in-progress rounds are left as-is (no special record — the match is over). The History UI derives "forfeited at round N" from the first round whose `winner_id` is NULL.

**Round reveal cadence:** the Match detail page subscribes to realtime on the match row and its rounds. A round is revealed (its winner shown) the moment both players have submitted for that round and `winner_id` is non-NULL — independent of any other round's state. So a player who races ahead simply sees "Round 2 — you submitted CPM X, waiting for opponent" until the opponent catches up; rounds then resolve in cascade as the opponent submits each one.

**Per-player round ordering:** each player races their own rounds in order (1 → 2 → 3 → …) on their own time. The "Race round N" button is enabled when N is the player's lowest-numbered round with their slot still empty, and the match is not in a terminal state. There is **no cross-player gating**: opponent's progress on any round does not affect the player's ability to race their next one. Server-side, `submit_round_result` for round N is rejected if the caller's slot on any round 1..N-1 is still NULL (defense-in-depth on the per-player ordering).

**Round 1 start:** there is no auto-start. After creating a match, the creator lands on the match detail page and clicks "Race now" themselves to play round 1. The joiner does the same after claiming via the invite link. Either side may race round 1 (or any subsequent round) without waiting for the other — per-round results are revealed as each round resolves.

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
| `create_match(_keyboard, _level, _language, _capital, _punctuation, _numbers, _best_of, _word_sets JSONB, _message)` | Inserts match + N round rows in one tx. `_word_sets` is a JSONB array of `_best_of` arrays — JSONB sidesteps Postgres's uniform-shape requirement on `TEXT[][]`. The RPC unpacks via `jsonb_array_elements` and inserts each round with its own `TEXT[]`. Returns the new match. |
| `get_match_by_invite_code(_code)` | Resolves a match for the invite landing page (caller may not yet be a participant). |
| `join_match_by_invite(_code)` | Atomic: claims joiner slot if `joiner_id IS NULL AND auth.uid() <> creator_id` AND `expires_at > NOW()`. Sets `joiner_joined_at`. Returns the match. |
| `submit_round_result(_match_id, _round_number, _cpm, _correct, _incorrect, _time, _key_presses)` | Determines the slot (`creator` or `joiner`) by comparing `auth.uid()` against the parent match's `creator_id`/`joiner_id`. Rejects when (a) caller is neither participant, (b) caller's slot on this round is already filled, (c) the caller's slot on any round 1..N-1 is still NULL (per-player ordering), (d) match is in a terminal state, or (e) `expires_at < NOW()`. Note: the opponent's progress is **not** checked — a player can race ahead. Trigger handles round winner + match advance. |
| `forfeit_match(_match_id)` | Caller must be a participant, match must not be in a terminal state. Sets match completed, forfeited_by = caller, winner_id = other side. |
| `cancel_match(_match_id)` | Creator only, no round has any submitted result, match not in a terminal state. |
| `list_my_rivals()` | See §1. |

Each RPC asserts the caller's role inline (not via RLS), raising `RAISE EXCEPTION` on violation. The renderer's `pvp-provider.tsx` becomes a thin wrapper around `supabase.rpc(...)` calls. The slot is never trusted from the client — `submit_round_result` infers it.

**Realtime:** publish `pvp_matches` and `pvp_games`. SELECT RLS gates what each subscriber sees.

**Indexes** (already declared in §1) cover the lookup paths: `invite_code`, `creator_id`, `joiner_id`, `status` on matches; `match_id` on rounds.

**Testing:**

- **pgTAP** (in `touch-type-backend/supabase/tests/pvp_v4.sql`): 
  - Round trigger sets winner correctly across all three tiebreaker tiers (cpm > accuracy > earlier completed_at).
  - Round trigger does not overwrite `winner_id` once set (re-UPDATE on completed round is a no-op).
  - Match advance fires only on round-winner transition (NULL → NOT NULL).
  - Match status flips `open → in_progress` on first round resolution.
  - Match completes exactly when `creator_wins + joiner_wins = best_of` (all rounds resolved), with `winner_id` set to the side with more wins. No early termination.
  - **Catch-up scenario:** in BO3, creator submits all 3 rounds first, joiner submits round 1 (creator wins it), match is `in_progress` 1-0; joiner then submits rounds 2 and 3 winning both → match completes with joiner_id as winner (1-2). Verifies that submitting after a 1-0 lead is permitted and that the match doesn't terminate prematurely.
  - **Race-ahead permitted:** creator submits rounds 1, 2, 3 in succession with no joiner submissions in between — none rejected; no rounds resolved yet.
  - `cancel_match` rejects once any round has a submission; succeeds when none do.
  - `forfeit_match` sets the right winner and forfeited_by; rejects on terminal-state matches.
  - `submit_round_result` rejects round N when caller has not submitted rounds 1..N-1 (per-player ordering).
  - `submit_round_result` rejects on already-filled slot.
  - `submit_round_result` and `join_match_by_invite` reject when `expires_at < NOW()`.
  - `submit_round_result` rejects on terminal-state matches (completed/cancelled/expired).
  - `list_my_rivals()` excludes cancelled/expired and sums wins/losses correctly.
  - `join_match_by_invite` rejects double-join (joiner already set).
- **Playwright** (in `touch-type/e2e/pvp.spec.ts`, replacing v3 cases):
  - **Smoke**: authenticated user navigates to `/pvp`, sees five-tab layout.
  - **Best-of-3 round-trip (sequential)**: A creates BO3, B joins, both race round 1 (B wins), both race round 2 (A wins), both race round 3 (A wins) → match `completed`, `winner_id = aId`, History tab shows match for both, Rivals tab shows the other player for both.
  - **Catch-up from behind (parallel play)**: A creates BO3, B joins. B races and submits all 3 rounds before A submits any. The match remains `in_progress` (no rounds resolved yet — only B has submitted). Then A races round 1 (loses to B), match status becomes `in_progress` and score is 0-1; A races round 2 (loses to B), score 0-2 — match still `in_progress` (no early termination); A races round 3 (loses), score 0-3 → match `completed`, `winner_id = bId`. Verifies (a) race-ahead is permitted, (b) no early termination after the lead is mathematically locked, (c) trailing player can play every round.
  - **Forfeit mid-match**: A creates BO5, B joins, round 1 played (A wins), B forfeits → match completed, `winner_id = aId`, `forfeited_by = bId`.
  - **Cancel while no rounds played**: Creator cancels a BO3 with joiner present but no submitted rounds → status `cancelled`.
  - **Cancel after round played is rejected**: Creator hits cancel after round 1 has any submission → RPC raises, UI shows error.
  - **Per-player ordering enforced**: Direct DB call attempts to submit round 2 for player A before A has submitted round 1 → RPC raises.
  - **Rematch from rivals tab**: After a completed match, A's Rivals tab lists B with W/L; clicking Rematch opens NewChallengePrompt pre-filled with prior settings.
  - **Already-joined invite**: a third user opening a fully-joined invite sees the closed-state copy.

**Migration plan (destructive, no production users):**

The new migration `20260508150000_pvp_v4.sql` is written idempotently so a local `supabase db reset` can be re-run during development:

1. `DROP TABLE IF EXISTS public.pvp_games CASCADE;` and `DROP TABLE IF EXISTS public.pvp_matches CASCADE;` (drops dependent triggers, policies, functions tied to v3 — order matters, but `IF EXISTS` + `CASCADE` makes it safe in either direction).
2. `DROP FUNCTION IF EXISTS public.complete_pvp_game(); DROP FUNCTION IF EXISTS public.set_pvp_invite_code(); DROP FUNCTION IF EXISTS public.get_game_by_invite_code(VARCHAR);` (anything that survived the CASCADE).
3. `CREATE TABLE public.pvp_matches ...` and `CREATE TABLE public.pvp_games ...` per §1.
4. Re-create `set_pvp_invite_code()` (now firing on `pvp_matches`).
5. Create `complete_pvp_round()`, `advance_pvp_match()`, and the RPCs from §4.
6. Re-attach RLS, realtime publication, grants.

A new types regen pass (`supabase gen types typescript --local > ../touch-type/renderer/src/types/supabase.ts`) updates the renderer types in lockstep.

The renderer's `pvp-provider.tsx` is rewritten as a thin RPC wrapper:

```ts
type PvPMatch = Database["public"]["Tables"]["pvp_matches"]["Row"];
type PvPRound = Database["public"]["Tables"]["pvp_games"]["Row"];

async function createMatch(input: CreateMatchInput): Promise<PvPMatch | null> {
  const wordSets = generateRoundWordSets(input.bestOf, input.settings); // string[][]
  const { data, error } = await supabase.rpc("create_match", {
    _keyboard: input.settings.keyboard,
    _level: input.settings.level,
    _language: input.settings.language,
    _capital: input.settings.capital,
    _punctuation: input.settings.punctuation,
    _numbers: input.settings.numbers,
    _best_of: input.bestOf,
    _word_sets: wordSets, // serialized as JSONB by supabase-js
    _message: input.message ?? null,
  });
  if (error) { console.error("Error creating match:", error); return null; }
  return data;
}
```

All other mutations (`joinMatch`, `submitRoundResult`, `forfeitMatch`, `cancelMatch`) follow the same pattern. The provider does not call `_slot` — `submit_round_result` infers the caller's role.

---

## Open questions / future work

- **Auto-bind rematch**: today, even a "rematch" still requires the rival to open the invite link. A future iteration could auto-bind the rival as joiner (since they're the implied counterparty) and notify them via push.
- **Match expiry sweeper**: `expires_at` is set and the RPCs reject submit/join past it, but nothing flips status to `expired` on a schedule. A pg_cron job (or edge function) should sweep stale matches; for v4 the renderer treats matches with `expires_at < NOW()` as terminal in display, and the RPC-level rejection prevents writes from leaking through.
- **Round abandonment**: if a player joins, races round 1, then never returns, the match sits in `in_progress` until expiry. v4 accepts this; v5 might add a per-round timer.
- **Streak/elo signal**: rivals could surface a streak indicator ("won last 3") — easy to derive from existing data without schema changes.
