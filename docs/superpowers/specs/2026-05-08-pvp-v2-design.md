# PvP v2 — Design

**Date:** 2026-05-08
**Status:** Approved (design phase). Implementation not yet started.
**Repos affected:** `touch-type-backend/` (migration), `touch-type/` (renderer + e2e tests).

## Context

The first PvP implementation (`2fc99ac implements pvp`) shipped with several structural problems that have proven hard to patch:

- Two tables (`pvp_challenges` and `pvp_challenge_invites`) coupled by a foreign key, with separate RLS policies that have to stay in lockstep.
- Two competing "codes" — `challenge_code` (8-char, on the challenge row) and `invite_code` (12-char, on the invites row) — used inconsistently across the lookup path. `getChallengeByCode` queried by `challenge_code` while `acceptChallengeByInvite` queried by `invite_code`, so any link generated could only resolve one half of the round-trip cleanly.
- A state machine with too many states (`pending`, `accepted`, `in_progress`, `completed`, `expired`, `declined`) that mixed concerns of "challenger committed" and "opponent committed" without a clear ordering.
- Multiple flows compressed into one UI surface: direct user-to-user challenges (search → pick → invite), shareable invite links (open challenge), and async/sync racing — none of which worked end-to-end.
- The challenger had no UI to find their own pending invite link after creating it (the bug that triggered this redesign).

This document specifies a redesign that strips PvP down to a single coherent flow — async 1v1 race-first via shareable invite link — and rebuilds the data model and UI to match.

## Goals

- One reliable end-to-end flow: challenger races, gets a link, shares it; opponent claims via the link, races the same word set, sees the result.
- A data model where every column reflects a user-facing concept, and every state transition is an atomic conditional UPDATE.
- A challenger UI surface where a created challenge is always discoverable and shareable.
- E2E test coverage that exercises the full round-trip in CI.

## Non-goals (deferred to post-MVP)

- Direct user-to-user challenges (search, pick, send).
- Real-time live progress bars (each player sees the other's keystrokes as they type).
- 1-vs-many leaderboard challenges.
- Web fallback for non-app users (the link is `touchtyper://...` only).
- Configurable per-challenge settings (the challenge uses the challenger's current settings).
- Optional challenger message (could be added later without schema change — `challenger_message` column is reserved for it).
- Auto-revert of stale `claimed` challenges (claim is permanent until completion or expiry).

## Design

### §1 — Data model

A single `pvp_challenges` table replaces the current two. The table inlines challenger and opponent results (instead of foreign-keying to `results`) so a PvP record is a true snapshot — settings, word set, and both results locked in one row.

```sql
CREATE TABLE public.pvp_challenges (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invite_code     VARCHAR(12) UNIQUE NOT NULL,
  status          VARCHAR(16) NOT NULL DEFAULT 'open'
                  CHECK (status IN ('open','claimed','completed','expired','cancelled')),

  -- Challenge settings, locked at creation
  keyboard        VARCHAR(50)  NOT NULL,
  level           VARCHAR(20)  NOT NULL,
  language        VARCHAR(10)  NOT NULL,
  capital         BOOLEAN      NOT NULL DEFAULT false,
  punctuation     BOOLEAN      NOT NULL DEFAULT false,
  numbers         BOOLEAN      NOT NULL DEFAULT false,
  word_set        TEXT[]       NOT NULL,

  -- Challenger (always present — race-first)
  challenger_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  challenger_cpm          NUMERIC NOT NULL,
  challenger_correct      INTEGER NOT NULL,
  challenger_incorrect    INTEGER NOT NULL,
  challenger_time         TEXT    NOT NULL,
  challenger_key_presses  JSONB,
  challenger_completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  challenger_message      TEXT,

  -- Opponent (filled in on claim + race)
  opponent_id             UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  opponent_cpm            NUMERIC,
  opponent_correct        INTEGER,
  opponent_incorrect      INTEGER,
  opponent_time           TEXT,
  opponent_key_presses    JSONB,
  opponent_claimed_at     TIMESTAMPTZ,
  opponent_completed_at   TIMESTAMPTZ,

  -- Outcome (computed at completion)
  winner_id       UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  expires_at      TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_pvp_challenges_invite_code ON public.pvp_challenges(invite_code);
CREATE INDEX idx_pvp_challenges_challenger ON public.pvp_challenges(challenger_id);
CREATE INDEX idx_pvp_challenges_opponent ON public.pvp_challenges(opponent_id);
CREATE INDEX idx_pvp_challenges_status ON public.pvp_challenges(status);
```

#### Removed vs current schema

| Element | Reason for removal |
|---|---|
| `pvp_challenge_invites` table | The `invite_code` column moves onto the challenge itself. No more two-table RLS to keep in sync. |
| `challenge_code` column (8-char) | Vestigial — only `invite_code` is used in the v2 link/lookup path. |
| `pvp_challenges_view` view | Inlined results obviate the JOIN. Lookups are single-row reads. |
| `challenger_result_id`, `opponent_result_id` foreign keys | Results are inlined for snapshot semantics. The user's `results` history is independent. |
| `pending`, `accepted`, `declined` statuses | Replaced by `open` / `claimed` / `completed` (see §2). |

#### RLS

- **`SELECT`** — authenticated users can read challenges where they are challenger or opponent (`auth.uid() IN (challenger_id, opponent_id)`). Authenticated users can also read by `invite_code` for the invite landing page (`true` predicate scoped to a `WHERE invite_code = $1` query — practically, the renderer always supplies the code). Unauthenticated visitors see nothing; the invite page redirects to sign-in.
- **`INSERT`** — authenticated users can insert with `auth.uid() = challenger_id`.
- **`UPDATE`** — three scoped policies:
  - Challenger can `UPDATE` to set `status='cancelled'` (predicate: `challenger_id = auth.uid() AND status = 'open'`).
  - Opponent can `UPDATE` to claim (predicate: `auth.uid() != challenger_id AND status = 'open'`; the row update sets `opponent_id`, `opponent_claimed_at`, `status = 'claimed'`).
  - Opponent can `UPDATE` to submit results (predicate: `opponent_id = auth.uid() AND status = 'claimed'`).

The atomic `WHERE`-status predicates are what makes concurrent claims and double-submits safe — they reduce to "0 rows updated" rather than corrupting state.

#### Realtime

`pvp_challenges` stays in the `supabase_realtime` publication. The MVP doesn't subscribe to it — async play doesn't need live updates — but it's available for a future "your opponent finished" toast.

### §2 — State machine

```
                    [INSERT by challenger]
                            │
                            ▼
                    ┌─────────────┐
       cancel ─────►│    open     │◄──── (no claim before expires_at)
       (challenger) │             │              │
                    └─────┬───────┘              │
                          │ claim                │
                          │ (opponent)           ▼
                          ▼                  ┌────────────┐
                    ┌─────────────┐          │  expired   │  (terminal)
                    │   claimed   │─────────►│            │
                    │             │ expire   └────────────┘
                    └─────┬───────┘
                          │ submit result
                          │ (opponent)
                          ▼
                    ┌─────────────┐
                    │  completed  │  (terminal)
                    └─────────────┘

                    ┌─────────────┐
                    │  cancelled  │  (terminal — only reachable from open)
                    └─────────────┘
```

| From → To | Actor | SQL contract |
|---|---|---|
| (none) → `open` | challenger | `INSERT` with `challenger_id = auth.uid()`. Trigger fills `invite_code`. |
| `open` → `claimed` | opponent | `UPDATE … SET opponent_id = auth.uid(), opponent_claimed_at = NOW(), status = 'claimed' WHERE id = $1 AND status = 'open' AND auth.uid() != challenger_id` — 0 rows = "already claimed" or "you can't claim your own". |
| `claimed` → `completed` | opponent | `UPDATE … SET opponent_cpm = …, opponent_completed_at = NOW(), status = 'completed' WHERE id = $1 AND status = 'claimed' AND opponent_id = auth.uid()` — `winner_id` set by `BEFORE UPDATE` trigger. |
| `open` → `cancelled` | challenger | `UPDATE … SET status = 'cancelled' WHERE id = $1 AND status = 'open' AND challenger_id = auth.uid()` — 0 rows = someone has already claimed. |

#### Not in the state machine (deferred)

- **`open` → `expired`** is not an explicit transition. Reads handle expiry lazily by checking `status = 'open' AND expires_at < NOW()` and rendering as expired. A backfill job can populate `status = 'expired'` later if/when realtime watchers care.
- **`claimed` → `open` revert after idle** — out of scope. If an opponent claims and never finishes, the slot is theirs until `expires_at`. The challenger can cancel-and-recreate if it matters.

#### Winner determination

A `BEFORE UPDATE` trigger fires when status flips to `'completed'`:

```sql
NEW.winner_id := CASE
  WHEN NEW.challenger_cpm > NEW.opponent_cpm THEN NEW.challenger_id
  WHEN NEW.opponent_cpm > NEW.challenger_cpm THEN NEW.opponent_id
  ELSE NULL  -- tie
END;
```

Computing in the trigger means the writer can't lie about the result.

#### Race conditions handled

| Scenario | Resolution |
|---|---|
| Two opponents click Accept simultaneously | Both UPDATE with `WHERE status = 'open'`; only one matches. The loser sees "already claimed" and can refetch to see the winner's name. |
| Opponent submits twice | Second submit hits `WHERE status = 'claimed'`, gets 0 rows, treated as a no-op. |
| Challenger cancels while opponent is mid-race | Challenger's cancel succeeds (status was `'open'`); opponent's submit fails the `WHERE status = 'claimed'` predicate; opponent sees "challenge cancelled". |
| Opponent races during expiry | Submit still works (`WHERE status = 'claimed'` doesn't check `expires_at`). The challenger gets a "completed (after expiry)" indicator. Better than punishing someone who finished. |

### §3 — UI flow + components

#### Routes (renderer)

```
/pvp                              — PvPHub (tabs)
/pvp/race                         — typing UI
  ?new=1                            challenger creating fresh; INSERT on submit
  ?id={challengeId}                 opponent racing claimed challenge; UPDATE on submit
/pvp/invite?code={inviteCode}     — invite landing page
/pvp/challenge?id={challengeId}   — challenge detail (link, status, results)
```

All static routes per `output: "export"`; query params for runtime IDs.

#### Tabs in `PvPHub`

| Tab | Content | Status filter |
|---|---|---|
| **Active** | claimed challenges I'm a participant in | `status = 'claimed' AND auth.uid() IN (challenger_id, opponent_id)` |
| **Outgoing** | open challenges I created | `status = 'open' AND challenger_id = auth.uid()` |
| **History** | terminal challenges I was in | `status IN ('completed','cancelled','expired') AND auth.uid() IN (challenger_id, opponent_id)` |
| **New** | confirmation card → race → create | n/a |

The current "Incoming" tab is removed (no direct user-to-user challenges in MVP).

#### Challenger flow (race-first)

```
PvPHub /pvp                   PvP "New" tab                /pvp/race?new=1                   /pvp/challenge?id={id}
─────────────────────         ───────────────────          ─────────────────────             ──────────────────────────
Click "New" tab        ───►   Confirmation card:    ─►    Typing UI w/ fresh         ─►    "Challenge Created!"
                              "Race with [settings].       15-word set               INSERT  - Your CPM
                               15 words. Ready?"           User types,                       - Invite link block
                              [Start Race] button          submits                            with copy button
                                                                                              [Done] → back to /pvp
```

The success view (`/pvp/challenge?id={id}`) is bookmarkable and reachable via the Outgoing tab. The challenger can come back to grab the link any time before the opponent claims.

#### Opponent flow

```
External shared link     /pvp/invite?code={code}             /pvp/race?id={id}              /pvp/challenge?id={id}
─────────────────────    ──────────────────────────────      ─────────────────────          ─────────────────────────
touchtyper://pvp/    ─►  - Challenger username     ─claim─►  Typing UI w/ same        ─►   "Challenge Complete"
invite/ABCD…             - Their CPM (target)      UPDATE   word set; user types     UPDATE - Both CPMs side-by-side
                         - Settings preview                  & submits                       - Winner highlighted
                         - "Accept & Race" button
                         - "Decline" → /pvp
                         (server enforces single-acceptor)
```

If the opponent closes the app between Accept and racing, the challenge sits in their Active tab (`status='claimed'`, `opponent_id = me`); they can come back and click "Continue Race" to land on `/pvp/race?id={id}`.

#### Components

| Component | Purpose | Used in |
|---|---|---|
| `PvPHub` | Tab orchestrator | `/pvp` |
| `NewChallengePrompt` | Settings preview + "Ready to Race?" CTA | New tab |
| `PvPRacePage` | Typing UI; reads query param to know if creating or racing-as-opponent | `/pvp/race` |
| `PvPInvitePage` | Fetch by `invite_code`, show challenger's stats, accept/decline | `/pvp/invite` |
| `PvPChallengePage` | State-dependent detail view (link / waiting / results) | `/pvp/challenge` |
| `ChallengeCard` | Row used in tab lists | tab content |
| `InviteLinkBlock` | Visible link + copy button (already built) | success states |
| `pvp-provider` | Context + mutation methods | global |

#### `pvp-provider` interface

```ts
{
  // Derived state
  myOpenChallenges: PvPChallenge[];        // I created, awaiting an acceptor
  myActiveChallenges: PvPChallenge[];      // I'm a participant, status='claimed'
  myCompletedChallenges: PvPChallenge[];   // I'm a participant, terminal status
  isLoading: boolean;

  // Mutations — return Row | null; null is non-fatal (race lost, invalid input).
  // Schema-unavailable cases are silenced via isPvPSchemaUnavailable.
  createChallenge: (result: ChallengerResult, message?: string) => Promise<PvPChallenge | null>;
  claimChallenge: (inviteCode: string) => Promise<PvPChallenge | null>;
  submitOpponentResult: (challengeId: string, result: OpponentResult) => Promise<PvPChallenge | null>;
  cancelChallenge: (challengeId: string) => Promise<boolean>;

  // Lookups
  fetchByInviteCode: (inviteCode: string) => Promise<PvPChallenge | null>;
  fetchById: (id: string) => Promise<PvPChallenge | null>;

  // Refresh (called on /pvp mount + auth changes)
  refreshChallenges: () => Promise<void>;
}
```

#### Components / functions removed

- `search-users` edge function — no user search in MVP
- `pvp-challenges` edge function — replaced by direct supabase-js calls with atomic UPDATEs
- `acceptChallengeByInvite` and `getChallengeByCode` (the two functions that disagreed about which code to look up) — merged into `fetchByInviteCode` + `claimChallenge`
- `pvp_challenges_view` — the table is the view
- `PvPMatch` (current) — renamed to `PvPRacePage`, simplified (no live updates, no opponent-status polling)
- `UserSearch` component — no user search
- `CreateChallenge` form (the multi-field form with checkbox) — replaced by `NewChallengePrompt` confirmation card

### §4 — Edge functions, error handling, testing, migration

#### Edge functions — none

Every CRUD operation maps to a single supabase-js call against `pvp_challenges`, gated by RLS:

| Operation | Client call | Race safety |
|---|---|---|
| Create | `INSERT` | n/a — challenger's first action |
| Claim | `UPDATE` with `WHERE status='open' AND auth.uid() != challenger_id` | atomic — concurrent claims fail |
| Submit | `UPDATE` with `WHERE status='claimed' AND opponent_id = auth.uid()` | atomic — double-submits fail |
| Cancel | `UPDATE` with `WHERE status='open' AND challenger_id = auth.uid()` | atomic — can't cancel after claim |
| Fetch by code | `SELECT … WHERE invite_code = $1` | n/a |
| Fetch list | `SELECT … WHERE challenger_id = auth.uid() OR opponent_id = auth.uid()` | n/a |

Both existing edge functions (`pvp-challenges`, `search-users`) are deleted.

#### Error handling

Reuses existing patterns from this codebase:

- `isPvPSchemaUnavailable(err)` continues to gate `refreshChallenges`. Migration-missing environments render an empty hub instead of crashing.
- Mutations return `Promise<Row | null>`. On `null`, callers show a toast.
- Conditional updates that match 0 rows return `PGRST116`, treated as a *predictable* race-loss (toast-only, no `console.error`). Other Postgres / PGRST codes are logged with structured fields and surfaced via toast with the actual `message`.
- Specific user-facing messages:
  - "Already claimed by another player" — claim's `WHERE status='open'` returned 0 rows
  - "You can't claim your own challenge" — re-fetch shows `challenger_id = auth.uid()`
  - "This challenge has expired" — `expires_at < NOW()`
  - "Challenge cancelled" — claim or submit fails because status was cancelled

#### Testing — `e2e/pvp.spec.ts`

Drop:
- ❌ Decline-by-opponent (no incoming-direct-challenge flow exists)
- ❌ Search-users related setup

Keep / rewrite:

| Spec | Verifies |
|---|---|
| **Smoke** | Authenticated user opens `/pvp`, sees the hub, no console errors. |
| **Round-trip (happy path)** | Two contexts. A clicks New → confirms → races → submits. DB lookup for `invite_code`. B opens `/pvp/invite?code={c}`, accepts, races, submits. Both see `/pvp/challenge?id={id}` with completed status, opponent_cpm populated, winner_id set. |
| **Cancel** | A creates → goes to Outgoing tab → clicks Cancel → DB shows `status='cancelled'`. |
| **Already-claimed** | A creates, B claims (DB-direct UPDATE for setup speed), C opens `/pvp/invite?code={c}` and sees "Already claimed" message. |

A unit test for the winner-determination trigger is added — pure SQL via `supabase test db`.

#### Migration plan

The schema is incompatible (single-table replaces two), so this is a **destructive migration**. Existing `pvp_challenges` and `pvp_challenge_invites` rows are dropped. The feature has never worked end-to-end and all current rows are local test data, so this is acceptable.

**Migration file** in `touch-type-backend/supabase/migrations/<timestamp>_pvp_v2.sql`:

```sql
-- v2 redesign: collapse pvp_challenge_invites into pvp_challenges,
-- replace dual-code system with single invite_code, simplify state machine.
DROP VIEW  IF EXISTS public.pvp_challenges_view;
DROP TABLE IF EXISTS public.pvp_challenge_invites;
DROP TABLE IF EXISTS public.pvp_challenges;
DROP FUNCTION IF EXISTS public.generate_challenge_code(INTEGER);
DROP FUNCTION IF EXISTS public.generate_invite_code();
DROP FUNCTION IF EXISTS public.set_challenge_code();
DROP FUNCTION IF EXISTS public.determine_pvp_winner();

-- (CREATE TABLE statement from §1)
-- (CREATE FUNCTION generate_invite_code, BEFORE INSERT trigger to set invite_code)
-- (CREATE FUNCTION determine_pvp_winner, BEFORE UPDATE trigger)
-- (RLS policies from §1)
-- (GRANTs to anon, authenticated)
-- (Realtime publication)
```

**Apply order:**

1. Write the migration in `touch-type-backend/`.
2. `supabase db reset` locally to wipe + reapply the full migration history (faster than chasing drift).
3. Regenerate types: `supabase gen types typescript --local > ../touch-type/renderer/src/types/supabase.ts`.
4. Rewrite renderer code per §3.
5. `pnpm test:e2e` to verify the round-trip.
6. Commit migration + renderer changes across both repos.

Production rollout is gated until explicit approval. The existing `supabase-deploy.yml` GH Actions workflow handles deployment when `touch-type-backend/main` is pushed.

## Open questions / risks

- **Production data**: this design assumes no production `pvp_challenges` rows exist that a destructive migration would lose. The feature has never shipped end-to-end, so this should hold; verify before applying to production.
- **Auth-required invite landing**: unauthenticated users clicking a link see "sign in to view this challenge" rather than challenge details. If we later want a frictionless preview, we can add a public-read policy on a column-restricted view without touching the rest of the design.
- **Stale `claimed` rows**: if an opponent claims and never finishes, the row sits at `claimed` until `expires_at` (default 7 days). Acceptable for MVP; revisit if the rate of abandoned claims becomes a problem.

## Out-of-scope follow-ups

These are *not* part of this design but are easy adjacent improvements once the v2 base lands:

- Realtime subscriptions for "your opponent just finished" toast notifications.
- Web fallback (`touch-typer.kochie.io/pvp/invite/{code}`) for recipients who don't have the desktop app installed.
- Optional message field surfaced during creation (column already reserved).
- Direct user-to-user challenges (re-introduce a `search-users` flow) if the use case justifies it.
- Auto-expiry of stale `claimed` rows after a shorter window than `expires_at`.
