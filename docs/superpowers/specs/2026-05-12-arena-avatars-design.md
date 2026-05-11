# Arena Avatars Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a gamified custom avatar system to the Arena — illustrated SVG faces paired with collectible hats, displayed in game rows and a profile view, selectable via an inline picker.

**Architecture:** All avatar artwork lives as inline SVG React components in the renderer. Two columns (`equipped_face`, `equipped_hat`) are added to `profiles`. Unlock availability is computed client-side from existing PvP game stats — no new tables or edge functions required.

**Tech Stack:** React SVG components · Supabase (profiles table) · Next.js App Router · Tailwind CSS · TypeScript

---

## Decisions Log

| Question | Answer |
|---|---|
| Art style | Custom illustrated SVG faces + collectible hats |
| Display locations | Arena game rows + `/pvp/profile` page |
| Art source | Inline SVG React components designed in code |
| Avatar picker entry point | Click your own row in the Arena hub |
| Schema approach | Two columns on `profiles`; definitions in TypeScript config |

---

## Face Catalogue (11 faces — all free)

| Slug | Description |
|---|---|
| `classic` | Yellow round face, neutral smile |
| `cool` | Blue face with sunglasses |
| `fierce` | Red face with angry brows and frown |
| `chill` | Purple face with half-closed eyes |
| `nerd` | Green face with round glasses |
| `robot` | Grey square head with LED eyes |
| `alien` | Wide forehead tapering to narrow chin, big almond eyes, antenna |
| `zombie` | Square grey-green head, X eyes, bolt-on-sides, teeth showing |
| `ghost` | Tall white ghost body with wavy skirt, round eyes |
| `dog` | Orange round head, floppy ears, snout, tongue |
| `cat` | Amber face with pointed ears, slit pupils, whiskers, triangular nose |

Default face: `classic`.

---

## Hat Catalogue (13 hats across 3 tiers)

### Free (4)

| Slug | Name | Unlock |
|---|---|---|
| `none` | No Hat | Always available |
| `beanie` | Beanie | Always available |
| `cap` | Baseball Cap | Always available |
| `headband` | Headband | Always available |

### Earned (4)

| Slug | Name | Unlock condition |
|---|---|---|
| `cowboy` | Cowboy | 10 games completed |
| `laurels` | Laurels | 5 wins |
| `crown` | Crown | 20 wins |
| `ninja` | Ninja | 50 games completed |

### Premium (5)

| Slug | Name | Notes |
|---|---|---|
| `tophat` | Top Hat | Premium subscription required |
| `wizard` | Wizard | Premium subscription required |
| `viking` | Viking | Premium subscription required |
| `halo` | Halo | Premium subscription required · rare |
| `samurai` | Samurai | Premium subscription required · rare |

Default hat: `none`.

---

## File Structure

```
touch-type/renderer/src/
  components/avatars/
    AvatarComposite.tsx        # face + hat layered SVG, accepts size prop
    AvatarPicker.tsx           # inline picker panel (face grid + hat tiers)
    faces/
      ClassicFace.tsx
      CoolFace.tsx
      FierceFace.tsx
      ChillFace.tsx
      NerdFace.tsx
      RobotFace.tsx
      AlienFace.tsx
      ZombieFace.tsx
      GhostFace.tsx
      DogFace.tsx
      CatFace.tsx
    hats/
      BeanieHat.tsx
      CapHat.tsx
      HeadbandHat.tsx
      CowboyHat.tsx
      LaurelsHat.tsx
      CrownHat.tsx
      NinjaHat.tsx
      TopHat.tsx
      WizardHat.tsx
      VikingHat.tsx
      HaloHat.tsx
      SamuraiHat.tsx
  lib/
    avatars.ts                 # catalogue definitions + unlock helpers

touch-type-backend/supabase/migrations/
  20260512200000_add_avatar_columns.sql

touch-type/renderer/src/app/pvp/profile/
  page.tsx                     # /pvp/profile — own avatar + stats
```

---

## Data Model

### Migration (`20260512200000_add_avatar_columns.sql`)

```sql
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS equipped_face TEXT NOT NULL DEFAULT 'classic',
  ADD COLUMN IF NOT EXISTS equipped_hat  TEXT;
```

No new tables. No RLS changes (existing profile policies already cover SELECT/UPDATE for own row).

### TypeScript catalogue (`lib/avatars.ts`)

```typescript
export type HatTier = 'free' | 'earned' | 'premium';

export interface UnlockCondition {
  type: 'games_played' | 'wins';
  count: number;
}

export interface FaceDef {
  slug: string;
  name: string;
  component: React.FC<{ size: number }>;
}

export interface HatDef {
  slug: string;
  name: string;
  tier: HatTier;
  unlockCondition?: UnlockCondition;  // earned tier only
  component: React.FC<{ size: number }> | null;  // null = "no hat"
}

export const FACES: FaceDef[] = [ /* all 11 */ ];
export const HATS: HatDef[]   = [ /* all 13 */ ];

export function getFace(slug: string): FaceDef {
  return FACES.find(f => f.slug === slug) ?? FACES[0];
}

export function getHat(slug: string | null): HatDef {
  return HATS.find(h => h.slug === slug) ?? HATS[0]; // null → "none"
}

export function isHatUnlocked(
  hat: HatDef,
  stats: { gamesPlayed: number; wins: number },
  isPremium: boolean,
): boolean {
  if (hat.tier === 'free') return true;
  if (hat.tier === 'premium') return isPremium;
  if (!hat.unlockCondition) return false;
  const { type, count } = hat.unlockCondition;
  return type === 'wins' ? stats.wins >= count : stats.gamesPlayed >= count;
}
```

---

## Component Design

### `AvatarComposite`

Renders face SVG with hat SVG layered on top. Both components receive a `size` prop so they share the same coordinate space.

```typescript
interface AvatarCompositeProps {
  face: string;   // slug
  hat: string | null;  // slug or null
  size?: number;  // default 40
}
```

The viewBox is `0 0 64 64`. Hat components position themselves at the top of the face circle; face components fill the circle from roughly y=16 to y=60. Hat SVG paths are designed to sit above y=24 (the forehead line) so they layer cleanly over any face.

### `AvatarPicker`

Receives the user's current selections, their game stats, and whether they are premium (`isPremium` prop, sourced from `usePlan()` in the parent `PvPHub` — `plan?.billing_plan === 'premium'`). Renders:

1. **Preview** — large `AvatarComposite` (72px) showing current face + hat
2. **Face grid** — all 11 faces as 44px buttons, active face highlighted violet
3. **Hat list** — grouped by tier (Free → Earned → Premium), 44px buttons, locked hats dimmed with a 🔒 badge and tooltip showing progress (`3 / 5 wins`)

On selection, immediately calls `onFaceChange(slug)` or `onHatChange(slug)` — the parent saves to Supabase and updates optimistically.

### `PvPHub` changes

- Extend the profile batch query to also fetch `equipped_face` and `equipped_hat`
- Replace the colour-hash initials circle in `ArenaGameRow` with `<AvatarComposite face={...} hat={...} size={40} />`
- Your own row shows your current avatar; clicking it toggles the picker panel as a right sidebar (same pattern as the mockup)
- Picker panel width: 280px, slides in alongside the game list

### `/pvp/profile` page

Static route (no dynamic segments — uses `useSearchParams` wrapped in `<Suspense>` to read `?id=`). Shows:

- Large avatar (96px)
- Display name
- Stats pulled from existing PvP data: games played, wins, win rate, best CPM
- "Back to Arena" link

Linked from your own row in the Arena hub ("View Profile" secondary action). Can also be linked from opponent rows in a future iteration.

---

## Unlock Progress Display

In `AvatarPicker`, fetch stats once on open:

```typescript
// games completed (as either creator or joiner)
supabase.from('pvp_games')
  .select('id', { count: 'exact', head: true })
  .or(`creator_id.eq.${userId},joiner_id.eq.${userId}`)
  .eq('status', 'completed')

// wins
supabase.from('pvp_games')
  .select('id', { count: 'exact', head: true })
  .eq('winner_id', userId)
  .eq('status', 'completed')
```

Locked earned hats show: `"3 / 5 wins"` or `"7 / 10 games"`.
Locked premium hats show: `"Premium only"` with a link to upgrade.

---

## Save / Equip Flow

1. User selects a face or hat in the picker
2. Optimistic update: local state changes immediately (avatar preview + game row update)
3. `supabase.from('profiles').update({ equipped_face, equipped_hat }).eq('id', userId)` — direct client call, no edge function
4. On error: revert to previous selection, show toast

---

## Error Handling

- If profile fetch fails: fall back to `classic` face, `none` hat (no crash)
- If a face/hat slug stored in DB doesn't match any catalogue entry: fall back to defaults
- Picker stats query failure: show all earned hats as locked with "—" progress

---

## Regenerated Types

After applying the migration, regenerate Supabase types:

```bash
cd touch-type-backend
supabase gen types typescript --local > ../touch-type/renderer/src/types/supabase.ts
```

---

## Out of Scope

- Avatar display on the marketing website (`touch-typer.kochie.io`)
- Clicking opponent avatars to view their profile (future — URL would be `/pvp/profile?id=opponentId`)
- Animated avatars
- Custom colour picker for faces
- Notification when a new hat is unlocked
