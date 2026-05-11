# Arena Avatars Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add illustrated SVG face + collectible hat avatars to the Arena — displayed in game rows and a profile page, selectable via an inline picker that opens when you click your own row.

**Architecture:** 11 face components + 12 hat components as inline SVG `<g>` elements; composed by `AvatarComposite`; metadata + unlock logic in `lib/avatars.ts`; two columns (`equipped_face`, `equipped_hat`) added to the `profiles` table; no new tables or edge functions.

**Tech Stack:** React 19 · Next.js App Router (static export) · Tailwind CSS · TypeScript · Supabase JS client · `sonner` for toasts

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `touch-type-backend/supabase/migrations/20260512200000_add_avatar_columns.sql` | Create | DB migration |
| `renderer/src/types/supabase.ts` | Regenerate | Pick up new columns |
| `renderer/src/components/avatars/faces/ClassicFace.tsx` | Create | Yellow smiley |
| `renderer/src/components/avatars/faces/CoolFace.tsx` | Create | Blue sunglasses |
| `renderer/src/components/avatars/faces/FierceFace.tsx` | Create | Red angry brows |
| `renderer/src/components/avatars/faces/ChillFace.tsx` | Create | Purple half-lidded |
| `renderer/src/components/avatars/faces/NerdFace.tsx` | Create | Green glasses |
| `renderer/src/components/avatars/faces/RobotFace.tsx` | Create | Grey square head |
| `renderer/src/components/avatars/faces/AlienFace.tsx` | Create | Wide-head alien |
| `renderer/src/components/avatars/faces/ZombieFace.tsx` | Create | Square zombie |
| `renderer/src/components/avatars/faces/GhostFace.tsx` | Create | Tall ghost |
| `renderer/src/components/avatars/faces/DogFace.tsx` | Create | Floppy-eared dog |
| `renderer/src/components/avatars/faces/CatFace.tsx` | Create | Pointed-ear cat |
| `renderer/src/components/avatars/hats/BeanieHat.tsx` | Create | Knit beanie |
| `renderer/src/components/avatars/hats/CapHat.tsx` | Create | Baseball cap |
| `renderer/src/components/avatars/hats/HeadbandHat.tsx` | Create | Headband |
| `renderer/src/components/avatars/hats/CowboyHat.tsx` | Create | Cowboy hat |
| `renderer/src/components/avatars/hats/LaurelsHat.tsx` | Create | Laurel wreath |
| `renderer/src/components/avatars/hats/CrownHat.tsx` | Create | Jewelled crown |
| `renderer/src/components/avatars/hats/NinjaHat.tsx` | Create | Ninja headband |
| `renderer/src/components/avatars/hats/TopHat.tsx` | Create | Top hat |
| `renderer/src/components/avatars/hats/WizardHat.tsx` | Create | Wizard hat |
| `renderer/src/components/avatars/hats/VikingHat.tsx` | Create | Viking helmet |
| `renderer/src/components/avatars/hats/HaloHat.tsx` | Create | Golden halo |
| `renderer/src/components/avatars/hats/SamuraiHat.tsx` | Create | Samurai kabuto |
| `renderer/src/lib/avatars.ts` | Create | Catalogue + unlock helpers |
| `renderer/src/components/avatars/AvatarComposite.tsx` | Create | Layered face+hat SVG |
| `renderer/src/components/avatars/AvatarPicker.tsx` | Create | Inline picker panel |
| `renderer/src/components/PvP/PvPHub.tsx` | Modify | Wire avatars + picker |
| `renderer/src/app/pvp/profile/page.tsx` | Create | Profile stats page |

---

## Task 1: DB migration + type regeneration

**Files:**
- Create: `touch-type-backend/supabase/migrations/20260512200000_add_avatar_columns.sql`
- Regenerate: `touch-type/renderer/src/types/supabase.ts`

- [ ] **Step 1: Create migration file**

```sql
-- touch-type-backend/supabase/migrations/20260512200000_add_avatar_columns.sql
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS equipped_face TEXT NOT NULL DEFAULT 'classic',
  ADD COLUMN IF NOT EXISTS equipped_hat  TEXT;
```

- [ ] **Step 2: Apply migration locally**

Run from `touch-type-backend/`:
```bash
supabase db reset
```
Expected: migration applies without error. (Or `supabase migration up` if you don't want to reset.)

- [ ] **Step 3: Regenerate TypeScript types**

Run from `touch-type-backend/`:
```bash
supabase gen types typescript --local > ../touch-type/renderer/src/types/supabase.ts
```
Expected: `renderer/src/types/supabase.ts` updated; `profiles` Row now includes `equipped_face: string` and `equipped_hat: string | null`.

- [ ] **Step 4: Type-check**

Run from `touch-type/`:
```bash
pnpm type-check
```
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git -C touch-type-backend add supabase/migrations/20260512200000_add_avatar_columns.sql
git -C touch-type-backend commit -m "feat: add equipped_face and equipped_hat columns to profiles"
git -C touch-type add renderer/src/types/supabase.ts
git -C touch-type commit -m "chore: regenerate supabase types with avatar columns"
```

---

## Task 2: Face SVG components

**Files:** Create all 11 in `renderer/src/components/avatars/faces/`

All face components export a named function that returns a `<g>` element. The parent `AvatarComposite` provides the outer `<svg viewBox="0 0 64 64">`. Faces are designed in a 64×64 coordinate space with the main shape centred around (32, 38).

- [ ] **Step 1: Create `ClassicFace.tsx`**

```tsx
// renderer/src/components/avatars/faces/ClassicFace.tsx
export function ClassicFace() {
  return (
    <g>
      <circle cx="32" cy="38" r="22" fill="#FBBF24" />
      <circle cx="24" cy="36" r="4" fill="#1e293b" />
      <circle cx="40" cy="36" r="4" fill="#1e293b" />
      <circle cx="25.5" cy="34.5" r="1.5" fill="white" />
      <circle cx="41.5" cy="34.5" r="1.5" fill="white" />
      <path d="M25 44 Q32 49 39 44" stroke="#1e293b" strokeWidth="2.5" strokeLinecap="round" fill="none" />
    </g>
  );
}
```

- [ ] **Step 2: Create `CoolFace.tsx`**

```tsx
// renderer/src/components/avatars/faces/CoolFace.tsx
export function CoolFace() {
  return (
    <g>
      <circle cx="32" cy="38" r="22" fill="#60A5FA" />
      <rect x="18" y="32" width="11" height="8" rx="4" fill="#1e293b" />
      <rect x="33" y="32" width="11" height="8" rx="4" fill="#1e293b" />
      <line x1="29" y1="36" x2="33" y2="36" stroke="#1e293b" strokeWidth="2" />
      <path d="M26 45 Q32 48 38 45" stroke="#1e293b" strokeWidth="2.5" strokeLinecap="round" fill="none" />
    </g>
  );
}
```

- [ ] **Step 3: Create `FierceFace.tsx`**

```tsx
// renderer/src/components/avatars/faces/FierceFace.tsx
export function FierceFace() {
  return (
    <g>
      <circle cx="32" cy="38" r="22" fill="#F87171" />
      <circle cx="24" cy="36" r="4" fill="#1e293b" />
      <circle cx="40" cy="36" r="4" fill="#1e293b" />
      <circle cx="25.5" cy="34.5" r="1.5" fill="white" />
      <circle cx="41.5" cy="34.5" r="1.5" fill="white" />
      <line x1="20" y1="30" x2="28" y2="33" stroke="#1e293b" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="36" y1="33" x2="44" y2="30" stroke="#1e293b" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M26 46 Q32 43 38 46" stroke="#1e293b" strokeWidth="2.5" strokeLinecap="round" fill="none" />
    </g>
  );
}
```

- [ ] **Step 4: Create `ChillFace.tsx`**

```tsx
// renderer/src/components/avatars/faces/ChillFace.tsx
export function ChillFace() {
  return (
    <g>
      <circle cx="32" cy="38" r="22" fill="#A78BFA" />
      <path d="M20 36 Q24 32 28 36" stroke="#1e293b" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <path d="M36 36 Q40 32 44 36" stroke="#1e293b" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <path d="M25 44 Q32 50 39 44" stroke="#1e293b" strokeWidth="2.5" strokeLinecap="round" fill="none" />
    </g>
  );
}
```

- [ ] **Step 5: Create `NerdFace.tsx`**

```tsx
// renderer/src/components/avatars/faces/NerdFace.tsx
export function NerdFace() {
  return (
    <g>
      <circle cx="32" cy="38" r="22" fill="#34D399" />
      <circle cx="24" cy="35" r="5.5" fill="none" stroke="#1e293b" strokeWidth="2" />
      <circle cx="40" cy="35" r="5.5" fill="none" stroke="#1e293b" strokeWidth="2" />
      <circle cx="24" cy="35" r="3" fill="#1e293b" opacity="0.7" />
      <circle cx="40" cy="35" r="3" fill="#1e293b" opacity="0.7" />
      <line x1="29.5" y1="35" x2="34.5" y2="35" stroke="#1e293b" strokeWidth="2" />
      <line x1="18" y1="33" x2="18.5" y2="35" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" />
      <line x1="46" y1="33" x2="45.5" y2="35" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" />
      <path d="M26 45 Q32 49 38 45" stroke="#1e293b" strokeWidth="2.5" strokeLinecap="round" fill="none" />
    </g>
  );
}
```

- [ ] **Step 6: Create `RobotFace.tsx`**

```tsx
// renderer/src/components/avatars/faces/RobotFace.tsx
export function RobotFace() {
  return (
    <g>
      <rect x="12" y="22" width="40" height="36" rx="6" fill="#475569" />
      <rect x="16" y="26" width="32" height="28" rx="4" fill="#334155" />
      <rect x="20" y="30" width="10" height="8" rx="2" fill="#38BDF8" />
      <rect x="34" y="30" width="10" height="8" rx="2" fill="#38BDF8" />
      <rect x="22" y="44" width="20" height="5" rx="2.5" fill="#94a3b8" />
      <rect x="30" y="16" width="4" height="8" rx="2" fill="#94a3b8" />
      <circle cx="32" cy="14" r="3" fill="#38BDF8" />
    </g>
  );
}
```

- [ ] **Step 7: Create `AlienFace.tsx`**

```tsx
// renderer/src/components/avatars/faces/AlienFace.tsx
export function AlienFace() {
  return (
    <g>
      {/* Wide forehead tapering to narrow chin */}
      <path d="M 6,28 Q 6,10 32,10 Q 58,10 58,28 Q 56,50 32,58 Q 8,50 6,28 Z" fill="#4ADE80" />
      <ellipse cx="22" cy="30" rx="7" ry="5" fill="#1e293b" />
      <ellipse cx="42" cy="30" rx="7" ry="5" fill="#1e293b" />
      <ellipse cx="23.5" cy="28.5" rx="2.5" ry="2" fill="#86efac" />
      <ellipse cx="43.5" cy="28.5" rx="2.5" ry="2" fill="#86efac" />
      <path d="M 27,47 Q 32,52 37,47" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" fill="none" />
      <line x1="32" y1="10" x2="32" y2="4" stroke="#4ADE80" strokeWidth="2.5" />
      <circle cx="32" cy="3" r="3" fill="#86efac" />
    </g>
  );
}
```

- [ ] **Step 8: Create `ZombieFace.tsx`**

```tsx
// renderer/src/components/avatars/faces/ZombieFace.tsx
export function ZombieFace() {
  return (
    <g>
      <rect x="10" y="14" width="44" height="44" rx="10" fill="#86A888" />
      <line x1="19" y1="28" x2="27" y2="36" stroke="#1e293b" strokeWidth="3" strokeLinecap="round" />
      <line x1="27" y1="28" x2="19" y2="36" stroke="#1e293b" strokeWidth="3" strokeLinecap="round" />
      <line x1="37" y1="28" x2="45" y2="36" stroke="#1e293b" strokeWidth="3" strokeLinecap="round" />
      <line x1="45" y1="28" x2="37" y2="36" stroke="#1e293b" strokeWidth="3" strokeLinecap="round" />
      <rect x="20" y="43" width="24" height="10" rx="3" fill="#1e293b" />
      <rect x="22" y="43" width="5" height="6" rx="1" fill="white" />
      <rect x="29" y="43" width="5" height="6" rx="1" fill="white" />
      <rect x="36" y="43" width="5" height="6" rx="1" fill="white" />
      <rect x="8" y="28" width="4" height="8" rx="1" fill="#64748b" />
      <rect x="52" y="28" width="4" height="8" rx="1" fill="#64748b" />
    </g>
  );
}
```

- [ ] **Step 9: Create `GhostFace.tsx`**

```tsx
// renderer/src/components/avatars/faces/GhostFace.tsx
export function GhostFace() {
  return (
    <g>
      <path d="M 14,44 Q 14,10 32,10 Q 50,10 50,44 L 50,60 L 44,54 L 38,60 L 32,54 L 26,60 L 20,54 L 14,60 Z" fill="#E2E8F0" />
      <circle cx="24" cy="32" r="4.5" fill="#1e293b" />
      <circle cx="40" cy="32" r="4.5" fill="#1e293b" />
      <circle cx="25.5" cy="30.5" r="1.5" fill="white" />
      <circle cx="41.5" cy="30.5" r="1.5" fill="white" />
      <circle cx="32" cy="42" r="3.5" fill="#1e293b" />
    </g>
  );
}
```

- [ ] **Step 10: Create `DogFace.tsx`**

```tsx
// renderer/src/components/avatars/faces/DogFace.tsx
export function DogFace() {
  return (
    <g>
      <circle cx="32" cy="36" r="20" fill="#D97706" />
      {/* Floppy hanging ears */}
      <ellipse cx="14" cy="40" rx="8" ry="12" fill="#b45309" />
      <ellipse cx="50" cy="40" rx="8" ry="12" fill="#b45309" />
      <ellipse cx="14" cy="40" rx="5" ry="9" fill="#d97706" />
      <ellipse cx="50" cy="40" rx="5" ry="9" fill="#d97706" />
      <ellipse cx="32" cy="43" rx="9" ry="6" fill="#fbbf24" />
      <circle cx="25" cy="33" r="4" fill="#1e293b" />
      <circle cx="39" cy="33" r="4" fill="#1e293b" />
      <circle cx="26.5" cy="31.5" r="1.5" fill="white" />
      <circle cx="40.5" cy="31.5" r="1.5" fill="white" />
      <ellipse cx="32" cy="40" rx="3.5" ry="2.5" fill="#1e293b" />
      <path d="M 28,47 Q 32,52 36,47" stroke="#f87171" strokeWidth="3" strokeLinecap="round" fill="none" />
    </g>
  );
}
```

- [ ] **Step 11: Create `CatFace.tsx`**

```tsx
// renderer/src/components/avatars/faces/CatFace.tsx
export function CatFace() {
  return (
    <g>
      <circle cx="32" cy="38" r="20" fill="#F59E0B" />
      {/* Pointed ears */}
      <polygon points="14,24 10,8 24,20" fill="#F59E0B" />
      <polygon points="50,24 54,8 40,20" fill="#F59E0B" />
      <polygon points="16,22 12,10 22,20" fill="#fcd34d" />
      <polygon points="48,22 52,10 42,20" fill="#fcd34d" />
      <ellipse cx="24" cy="35" rx="5" ry="4" fill="#1e293b" />
      <ellipse cx="40" cy="35" rx="5" ry="4" fill="#1e293b" />
      <circle cx="25.5" cy="33.5" r="1.5" fill="white" />
      <circle cx="41.5" cy="33.5" r="1.5" fill="white" />
      <polygon points="32,42 29,46 35,46" fill="#f87171" />
      <line x1="12" y1="42" x2="25" y2="44" stroke="#1e293b" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="12" y1="46" x2="25" y2="46" stroke="#1e293b" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="39" y1="44" x2="52" y2="42" stroke="#1e293b" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="39" y1="46" x2="52" y2="46" stroke="#1e293b" strokeWidth="1.2" strokeLinecap="round" />
    </g>
  );
}
```

- [ ] **Step 12: Type-check**

```bash
pnpm type-check
```
Expected: no errors.

- [ ] **Step 13: Commit**

```bash
git -C touch-type add renderer/src/components/avatars/faces/
git -C touch-type commit -m "feat: add 11 illustrated face SVG components"
```

---

## Task 3: Hat SVG components

**Files:** Create all 12 in `renderer/src/components/avatars/hats/`

Hat components also export a named function returning a `<g>`. Hats occupy roughly y=2–36 in the 64×64 viewBox, sitting above the face circle (which starts at y≈16 for most faces).

- [ ] **Step 1: Create `BeanieHat.tsx`**

```tsx
// renderer/src/components/avatars/hats/BeanieHat.tsx
export function BeanieHat() {
  return (
    <g>
      <path d="M10,34 Q10,8 32,8 Q54,8 54,34 Z" fill="#3B82F6" />
      <rect x="10" y="32" width="44" height="7" rx="3.5" fill="#2563EB" />
      <line x1="20" y1="12" x2="18" y2="32" stroke="#60A5FA" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="28" y1="9" x2="27" y2="32" stroke="#60A5FA" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="36" y1="9" x2="37" y2="32" stroke="#60A5FA" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="44" y1="12" x2="46" y2="32" stroke="#60A5FA" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="32" cy="6" r="5" fill="#93C5FD" />
    </g>
  );
}
```

- [ ] **Step 2: Create `CapHat.tsx`**

```tsx
// renderer/src/components/avatars/hats/CapHat.tsx
export function CapHat() {
  return (
    <g>
      <path d="M10,34 Q10,14 32,14 Q54,14 54,34 Z" fill="#EF4444" />
      <rect x="10" y="31" width="44" height="6" rx="3" fill="#DC2626" />
      {/* Brim */}
      <path d="M10,35 Q4,35 2,38 Q4,42 14,41 L10,35 Z" fill="#DC2626" />
      <circle cx="32" cy="13" r="3" fill="#DC2626" />
    </g>
  );
}
```

- [ ] **Step 3: Create `HeadbandHat.tsx`**

```tsx
// renderer/src/components/avatars/hats/HeadbandHat.tsx
export function HeadbandHat() {
  return (
    <g>
      <path d="M10,32 Q10,28 32,28 Q54,28 54,32 L54,38 Q54,42 32,42 Q10,42 10,38 Z" fill="#8B5CF6" />
      <polygon points="32,25 28,29 36,29" fill="#7C3AED" />
      <circle cx="32" cy="24" r="3" fill="#A78BFA" />
    </g>
  );
}
```

- [ ] **Step 4: Create `CowboyHat.tsx`**

```tsx
// renderer/src/components/avatars/hats/CowboyHat.tsx
export function CowboyHat() {
  return (
    <g>
      <ellipse cx="32" cy="34" rx="28" ry="5" fill="#92400E" />
      <path d="M14,34 Q14,12 32,12 Q50,12 50,34 Z" fill="#B45309" />
      <path d="M22,34 Q22,18 32,16 Q42,18 42,34" fill="#92400E" />
      <rect x="14" y="30" width="36" height="5" rx="2" fill="#78350F" />
      <circle cx="32" cy="32" r="2.5" fill="#FCD34D" />
    </g>
  );
}
```

- [ ] **Step 5: Create `LaurelsHat.tsx`**

```tsx
// renderer/src/components/avatars/hats/LaurelsHat.tsx
export function LaurelsHat() {
  return (
    <g>
      <ellipse cx="13" cy="30" rx="5" ry="3" fill="#16A34A" transform="rotate(-40 13 30)" />
      <ellipse cx="11" cy="36" rx="5" ry="3" fill="#16A34A" transform="rotate(-20 11 36)" />
      <ellipse cx="12" cy="42" rx="5" ry="3" fill="#16A34A" transform="rotate(10 12 42)" />
      <ellipse cx="51" cy="30" rx="5" ry="3" fill="#16A34A" transform="rotate(40 51 30)" />
      <ellipse cx="53" cy="36" rx="5" ry="3" fill="#16A34A" transform="rotate(20 53 36)" />
      <ellipse cx="52" cy="42" rx="5" ry="3" fill="#16A34A" transform="rotate(-10 52 42)" />
      <ellipse cx="20" cy="26" rx="5" ry="3" fill="#22C55E" transform="rotate(-55 20 26)" />
      <ellipse cx="32" cy="24" rx="5" ry="3" fill="#22C55E" />
      <ellipse cx="44" cy="26" rx="5" ry="3" fill="#22C55E" transform="rotate(55 44 26)" />
      <ellipse cx="32" cy="24" rx="4" ry="2.5" fill="#CA8A04" />
    </g>
  );
}
```

- [ ] **Step 6: Create `CrownHat.tsx`**

```tsx
// renderer/src/components/avatars/hats/CrownHat.tsx
export function CrownHat() {
  return (
    <g>
      <path d="M12,34 L12,22 L20,30 L32,16 L44,30 L52,22 L52,34 Z" fill="#F59E0B" />
      <rect x="12" y="32" width="40" height="6" rx="2" fill="#D97706" />
      <circle cx="32" cy="19" r="3" fill="#EF4444" />
      <circle cx="20" cy="30" r="2.5" fill="#3B82F6" />
      <circle cx="44" cy="30" r="2.5" fill="#22C55E" />
      <circle cx="12" cy="33" r="2" fill="#A855F7" />
      <circle cx="52" cy="33" r="2" fill="#A855F7" />
    </g>
  );
}
```

- [ ] **Step 7: Create `NinjaHat.tsx`**

```tsx
// renderer/src/components/avatars/hats/NinjaHat.tsx
export function NinjaHat() {
  return (
    <g>
      <rect x="10" y="28" width="44" height="9" rx="4" fill="#1e293b" />
      {/* Trailing knot on right */}
      <path d="M52,30 L60,26 L58,34 Z" fill="#1e293b" />
      <path d="M52,36 L62,38 L58,34 Z" fill="#374151" />
      <text x="28" y="36" fontSize="8" fill="#EF4444" fontWeight="bold" fontFamily="monospace">忍</text>
    </g>
  );
}
```

- [ ] **Step 8: Create `TopHat.tsx`**

```tsx
// renderer/src/components/avatars/hats/TopHat.tsx
export function TopHat() {
  return (
    <g>
      <ellipse cx="32" cy="34" rx="24" ry="4" fill="#1e293b" />
      <rect x="20" y="6" width="24" height="30" rx="3" fill="#111827" />
      <rect x="20" y="30" width="24" height="5" rx="1" fill="#374151" />
      <rect x="22" y="9" width="4" height="16" rx="2" fill="#1F2937" opacity="0.6" />
    </g>
  );
}
```

- [ ] **Step 9: Create `WizardHat.tsx`**

```tsx
// renderer/src/components/avatars/hats/WizardHat.tsx
export function WizardHat() {
  return (
    <g>
      <ellipse cx="32" cy="34" rx="26" ry="5" fill="#4C1D95" />
      <path d="M32,2 L14,34 L50,34 Z" fill="#5B21B6" />
      <text x="24" y="24" fontSize="7" fill="#FCD34D">★</text>
      <text x="33" y="16" fontSize="5" fill="#FCD34D">★</text>
      <text x="37" y="28" fontSize="6" fill="#A78BFA">✦</text>
      <rect x="14" y="30" width="36" height="5" rx="2" fill="#3B0764" />
      <circle cx="32" cy="32.5" r="3" fill="#FCD34D" />
    </g>
  );
}
```

- [ ] **Step 10: Create `VikingHat.tsx`**

```tsx
// renderer/src/components/avatars/hats/VikingHat.tsx
export function VikingHat() {
  return (
    <g>
      <path d="M10,36 Q10,10 32,10 Q54,10 54,36 Z" fill="#6B7280" />
      <rect x="29" y="28" width="6" height="16" rx="3" fill="#9CA3AF" />
      {/* Horns */}
      <path d="M10,28 Q2,18 8,10 Q14,16 14,28 Z" fill="#D1D5DB" />
      <path d="M54,28 Q62,18 56,10 Q50,16 50,28 Z" fill="#D1D5DB" />
      <rect x="10" y="33" width="44" height="5" rx="2" fill="#4B5563" />
      <circle cx="18" cy="35.5" r="2" fill="#9CA3AF" />
      <circle cx="32" cy="35.5" r="2" fill="#9CA3AF" />
      <circle cx="46" cy="35.5" r="2" fill="#9CA3AF" />
    </g>
  );
}
```

- [ ] **Step 11: Create `HaloHat.tsx`**

```tsx
// renderer/src/components/avatars/hats/HaloHat.tsx
export function HaloHat() {
  return (
    <g>
      <ellipse cx="32" cy="18" rx="18" ry="5" fill="none" stroke="#FCD34D" strokeWidth="5" opacity="0.3" />
      <ellipse cx="32" cy="18" rx="18" ry="5" fill="none" stroke="#FBBF24" strokeWidth="3" />
      <path d="M18,16 Q20,12 26,14" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.8" />
    </g>
  );
}
```

- [ ] **Step 12: Create `SamuraiHat.tsx`**

```tsx
// renderer/src/components/avatars/hats/SamuraiHat.tsx
export function SamuraiHat() {
  return (
    <g>
      <path d="M10,36 Q10,12 32,10 Q54,12 54,36 Z" fill="#1e293b" />
      <rect x="10" y="32" width="44" height="6" rx="2" fill="#111827" />
      {/* Crest */}
      <path d="M26,10 Q32,2 38,10" stroke="#EF4444" strokeWidth="4" strokeLinecap="round" fill="none" />
      <circle cx="32" cy="8" r="3" fill="#EF4444" />
      {/* Side guards */}
      <path d="M10,36 L6,44 Q8,48 12,46 L14,36" fill="#374151" />
      <path d="M54,36 L58,44 Q56,48 52,46 L50,36" fill="#374151" />
      <line x1="32" y1="10" x2="32" y2="34" stroke="#374151" strokeWidth="1.5" />
      <line x1="20" y1="14" x2="22" y2="34" stroke="#374151" strokeWidth="1" />
      <line x1="44" y1="14" x2="42" y2="34" stroke="#374151" strokeWidth="1" />
    </g>
  );
}
```

- [ ] **Step 13: Type-check**

```bash
pnpm type-check
```
Expected: no errors.

- [ ] **Step 14: Commit**

```bash
git -C touch-type add renderer/src/components/avatars/hats/
git -C touch-type commit -m "feat: add 12 hat SVG components"
```

---

## Task 4: Avatar catalogue (`lib/avatars.ts`)

**Files:**
- Create: `renderer/src/lib/avatars.ts`

This file imports all face and hat components and exports the catalogue arrays plus three pure helper functions. The helper functions have no side effects and are easy to reason about.

- [ ] **Step 1: Create `avatars.ts`**

```typescript
// renderer/src/lib/avatars.ts
import type { FC } from "react";

import { ClassicFace } from "@/components/avatars/faces/ClassicFace";
import { CoolFace } from "@/components/avatars/faces/CoolFace";
import { FierceFace } from "@/components/avatars/faces/FierceFace";
import { ChillFace } from "@/components/avatars/faces/ChillFace";
import { NerdFace } from "@/components/avatars/faces/NerdFace";
import { RobotFace } from "@/components/avatars/faces/RobotFace";
import { AlienFace } from "@/components/avatars/faces/AlienFace";
import { ZombieFace } from "@/components/avatars/faces/ZombieFace";
import { GhostFace } from "@/components/avatars/faces/GhostFace";
import { DogFace } from "@/components/avatars/faces/DogFace";
import { CatFace } from "@/components/avatars/faces/CatFace";

import { BeanieHat } from "@/components/avatars/hats/BeanieHat";
import { CapHat } from "@/components/avatars/hats/CapHat";
import { HeadbandHat } from "@/components/avatars/hats/HeadbandHat";
import { CowboyHat } from "@/components/avatars/hats/CowboyHat";
import { LaurelsHat } from "@/components/avatars/hats/LaurelsHat";
import { CrownHat } from "@/components/avatars/hats/CrownHat";
import { NinjaHat } from "@/components/avatars/hats/NinjaHat";
import { TopHat } from "@/components/avatars/hats/TopHat";
import { WizardHat } from "@/components/avatars/hats/WizardHat";
import { VikingHat } from "@/components/avatars/hats/VikingHat";
import { HaloHat } from "@/components/avatars/hats/HaloHat";
import { SamuraiHat } from "@/components/avatars/hats/SamuraiHat";

export type HatTier = "free" | "earned" | "premium";

export interface UnlockCondition {
  type: "games_played" | "wins";
  count: number;
}

export interface FaceDef {
  slug: string;
  name: string;
  Component: FC;
}

export interface HatDef {
  slug: string;
  name: string;
  tier: HatTier;
  unlockCondition?: UnlockCondition;
  Component: FC | null; // null = "no hat"
}

export const FACES: FaceDef[] = [
  { slug: "classic", name: "Classic", Component: ClassicFace },
  { slug: "cool",    name: "Cool",    Component: CoolFace },
  { slug: "fierce",  name: "Fierce",  Component: FierceFace },
  { slug: "chill",   name: "Chill",   Component: ChillFace },
  { slug: "nerd",    name: "Nerd",    Component: NerdFace },
  { slug: "robot",   name: "Robot",   Component: RobotFace },
  { slug: "alien",   name: "Alien",   Component: AlienFace },
  { slug: "zombie",  name: "Zombie",  Component: ZombieFace },
  { slug: "ghost",   name: "Ghost",   Component: GhostFace },
  { slug: "dog",     name: "Dog",     Component: DogFace },
  { slug: "cat",     name: "Cat",     Component: CatFace },
];

export const HATS: HatDef[] = [
  { slug: "none",     name: "None",         tier: "free",    Component: null },
  { slug: "beanie",   name: "Beanie",       tier: "free",    Component: BeanieHat },
  { slug: "cap",      name: "Baseball Cap", tier: "free",    Component: CapHat },
  { slug: "headband", name: "Headband",     tier: "free",    Component: HeadbandHat },
  { slug: "cowboy",   name: "Cowboy",       tier: "earned",  Component: CowboyHat,  unlockCondition: { type: "games_played", count: 10 } },
  { slug: "laurels",  name: "Laurels",      tier: "earned",  Component: LaurelsHat, unlockCondition: { type: "wins", count: 5 } },
  { slug: "crown",    name: "Crown",        tier: "earned",  Component: CrownHat,   unlockCondition: { type: "wins", count: 20 } },
  { slug: "ninja",    name: "Ninja",        tier: "earned",  Component: NinjaHat,   unlockCondition: { type: "games_played", count: 50 } },
  { slug: "tophat",   name: "Top Hat",      tier: "premium", Component: TopHat },
  { slug: "wizard",   name: "Wizard",       tier: "premium", Component: WizardHat },
  { slug: "viking",   name: "Viking",       tier: "premium", Component: VikingHat },
  { slug: "halo",     name: "Halo",         tier: "premium", Component: HaloHat },
  { slug: "samurai",  name: "Samurai",      tier: "premium", Component: SamuraiHat },
];

export function getFace(slug: string): FaceDef {
  return FACES.find((f) => f.slug === slug) ?? FACES[0];
}

export function getHat(slug: string | null | undefined): HatDef {
  return HATS.find((h) => h.slug === slug) ?? HATS[0]; // fallback to "none"
}

export function isHatUnlocked(
  hat: HatDef,
  stats: { gamesPlayed: number; wins: number },
  isPremium: boolean,
): boolean {
  if (hat.tier === "free") return true;
  if (hat.tier === "premium") return isPremium;
  if (!hat.unlockCondition) return false;
  const { type, count } = hat.unlockCondition;
  return type === "wins" ? stats.wins >= count : stats.gamesPlayed >= count;
}
```

- [ ] **Step 2: Type-check**

```bash
pnpm type-check
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git -C touch-type add renderer/src/lib/avatars.ts
git -C touch-type commit -m "feat: add avatar catalogue with unlock helpers"
```

---

## Task 5: `AvatarComposite`

**Files:**
- Create: `renderer/src/components/avatars/AvatarComposite.tsx`

Renders a face `<g>` and (optionally) a hat `<g>` inside a single `<svg>`. The SVG scales to `size` pixels via width/height; the shared `viewBox="0 0 64 64"` means both layers use the same coordinate space.

- [ ] **Step 1: Create `AvatarComposite.tsx`**

```tsx
// renderer/src/components/avatars/AvatarComposite.tsx
import { getFace, getHat } from "@/lib/avatars";

interface AvatarCompositeProps {
  face: string;
  hat?: string | null;
  size?: number;
}

export function AvatarComposite({ face, hat = null, size = 40 }: AvatarCompositeProps) {
  const faceDef = getFace(face);
  const hatDef = getHat(hat);
  const FaceComp = faceDef.Component;
  const HatComp = hatDef.Component;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      xmlns="http://www.w3.org/2000/svg"
      aria-label={`${faceDef.name} face${hatDef.slug !== "none" ? ` with ${hatDef.name} hat` : ""}`}
    >
      <FaceComp />
      {HatComp && <HatComp />}
    </svg>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
pnpm type-check
```
Expected: no errors.

- [ ] **Step 3: Verify visually**

Run `pnpm dev:next`, open `http://localhost:3000`. Navigate to the Arena page — you'll add the composite to the game rows in Task 7. For now, temporarily add `<AvatarComposite face="alien" hat="wizard" size={64} />` to any page to confirm the SVG renders correctly, then remove it.

- [ ] **Step 4: Commit**

```bash
git -C touch-type add renderer/src/components/avatars/AvatarComposite.tsx
git -C touch-type commit -m "feat: add AvatarComposite layered SVG component"
```

---

## Task 6: `AvatarPicker`

**Files:**
- Create: `renderer/src/components/avatars/AvatarPicker.tsx`

The picker is a self-contained panel. The parent passes current selections, a save callback, and the user's premium status. The picker fetches its own game stats (wins + games played) on mount.

- [ ] **Step 1: Create `AvatarPicker.tsx`**

```tsx
// renderer/src/components/avatars/AvatarPicker.tsx
"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { FACES, HATS, isHatUnlocked, type HatDef } from "@/lib/avatars";
import { AvatarComposite } from "./AvatarComposite";
import { useSupabaseClient } from "@/lib/supabase-provider";

interface AvatarPickerProps {
  userId: string;
  currentFace: string;
  currentHat: string | null;
  isPremium: boolean;
  onFaceChange: (slug: string) => void;
  onHatChange: (slug: string | null) => void;
}

interface GameStats {
  gamesPlayed: number;
  wins: number;
}

function unlockLabel(hat: HatDef, stats: GameStats): string {
  if (!hat.unlockCondition) return "";
  const { type, count } = hat.unlockCondition;
  const current = type === "wins" ? stats.wins : stats.gamesPlayed;
  const unit = type === "wins" ? "wins" : "games";
  return `${current} / ${count} ${unit}`;
}

export function AvatarPicker({
  userId,
  currentFace,
  currentHat,
  isPremium,
  onFaceChange,
  onHatChange,
}: AvatarPickerProps) {
  const supabase = useSupabaseClient();
  const [stats, setStats] = useState<GameStats>({ gamesPlayed: 0, wins: 0 });

  useEffect(() => {
    async function fetchStats() {
      const [gamesRes, winsRes] = await Promise.all([
        supabase
          .from("pvp_games")
          .select("id", { count: "exact", head: true })
          .or(`creator_id.eq.${userId},joiner_id.eq.${userId}`)
          .eq("status", "completed"),
        supabase
          .from("pvp_games")
          .select("id", { count: "exact", head: true })
          .eq("winner_id", userId)
          .eq("status", "completed"),
      ]);
      setStats({
        gamesPlayed: gamesRes.count ?? 0,
        wins: winsRes.count ?? 0,
      });
    }
    fetchStats().catch(() => {
      // leave stats at zero — all earned hats show as locked
    });
  }, [userId, supabase]);

  const freeTier = HATS.filter((h) => h.tier === "free");
  const earnedTier = HATS.filter((h) => h.tier === "earned");
  const premiumTier = HATS.filter((h) => h.tier === "premium");

  const tierLabel = (label: string, badgeClass: string) => (
    <div className="flex items-center gap-2 mb-2 mt-3 first:mt-0">
      <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${badgeClass}`}>
        {label}
      </span>
    </div>
  );

  const hatButton = (hat: HatDef) => {
    const unlocked = isHatUnlocked(hat, stats, isPremium);
    const active = (currentHat ?? "none") === hat.slug;
    const progress = !unlocked && hat.tier === "earned" ? unlockLabel(hat, stats) : null;
    const premiumLocked = !unlocked && hat.tier === "premium";

    return (
      <button
        key={hat.slug}
        title={
          premiumLocked
            ? "Premium only"
            : progress
            ? `${hat.name} — ${progress}`
            : hat.name
        }
        disabled={!unlocked}
        onClick={() => onHatChange(hat.slug === "none" ? null : hat.slug)}
        className={[
          "relative w-11 h-11 rounded-xl border-[1.5px] flex items-center justify-center transition-all duration-100",
          active
            ? "border-amber-400 bg-amber-400/10"
            : unlocked
            ? "border-slate-700 bg-slate-800 hover:border-violet-500/60"
            : "border-slate-800 bg-slate-900 opacity-40 cursor-not-allowed",
        ].join(" ")}
      >
        <svg width="36" height="36" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
          {/* Show hat on a neutral grey circle so it's identifiable */}
          <circle cx="32" cy="38" r="22" fill="#334155" />
          {hat.Component && <hat.Component />}
        </svg>
        {!unlocked && (
          <span className="absolute bottom-0.5 right-0.5 text-[9px] leading-none">🔒</span>
        )}
        {progress && (
          <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[8px] text-slate-500 whitespace-nowrap">
            {progress}
          </span>
        )}
      </button>
    );
  };

  return (
    <div className="flex flex-col gap-3 p-4 w-72 bg-slate-950 border-l border-slate-800">
      {/* Preview */}
      <div className="flex flex-col items-center gap-2 p-3 bg-slate-900 rounded-xl">
        <AvatarComposite face={currentFace} hat={currentHat} size={72} />
        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
          Preview
        </p>
      </div>

      {/* Face grid */}
      <div>
        <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-2">Face</p>
        <div className="flex flex-wrap gap-1.5">
          {FACES.map((face) => (
            <button
              key={face.slug}
              title={face.name}
              onClick={() => onFaceChange(face.slug)}
              className={[
                "w-11 h-11 rounded-xl border-[1.5px] flex items-center justify-center transition-all duration-100",
                currentFace === face.slug
                  ? "border-violet-500 bg-violet-500/15"
                  : "border-slate-700 bg-slate-800 hover:border-violet-500/60",
              ].join(" ")}
            >
              <svg width="36" height="36" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
                <face.Component />
              </svg>
            </button>
          ))}
        </div>
      </div>

      {/* Hat tiers */}
      <div>
        <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-2">Hat</p>
        <div className="max-h-52 overflow-y-auto pr-1 flex flex-col gap-5">
          <div>
            {tierLabel("Free", "bg-slate-700/60 text-slate-400 border border-slate-600/40")}
            <div className="flex flex-wrap gap-1.5">{freeTier.map(hatButton)}</div>
          </div>
          <div>
            {tierLabel("Earned", "bg-amber-500/15 text-amber-400 border border-amber-500/25")}
            <div className="flex flex-wrap gap-2">{earnedTier.map(hatButton)}</div>
          </div>
          <div>
            {tierLabel("Premium", "bg-violet-500/15 text-violet-400 border border-violet-500/25")}
            <div className="flex flex-wrap gap-1.5">{premiumTier.map(hatButton)}</div>
            {!isPremium && (
              <p className="text-[10px] text-slate-600 mt-2">
                Upgrade to premium to unlock these hats.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
pnpm type-check
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git -C touch-type add renderer/src/components/avatars/AvatarPicker.tsx
git -C touch-type commit -m "feat: add AvatarPicker inline panel with unlock progress"
```

---

## Task 7: Wire avatars into `PvPHub`

**Files:**
- Modify: `renderer/src/components/PvP/PvPHub.tsx`

Changes:
1. Extend the `usernameMap` batch query to also return `equipped_face` + `equipped_hat`
2. Store face/hat per opponent in a new `avatarMap` state
3. Replace the colour-hash `<div>` circle in `ArenaGameRow` with `<AvatarComposite>`
4. Add a "your own row" at the top of the challenge list that shows your avatar and opens the picker
5. Save avatar changes to `profiles` with an optimistic update

- [ ] **Step 1: Add avatar state + profile query**

At the top of `PvPHub`, import what's needed and add state:

```tsx
// Add to existing imports at top of PvPHub.tsx
import { useState, useMemo, useEffect, useCallback } from "react";
import { usePlan } from "@/lib/plan_hook";
import { toast } from "sonner";
import { AvatarComposite } from "@/components/avatars/AvatarComposite";
import { AvatarPicker } from "@/components/avatars/AvatarPicker";
```

Inside `PvPHub`, after existing state declarations, add:

```tsx
const plan = usePlan();
const isPremium = plan?.billing_plan === "premium";

const [avatarMap, setAvatarMap] = useState<Record<string, { face: string; hat: string | null }>>({});
const [pickerOpen, setPickerOpen] = useState(false);
const [myFace, setMyFace] = useState("classic");
const [myHat, setMyHat] = useState<string | null>(null);
```

- [ ] **Step 2: Fetch own avatar on mount**

Add this effect after the existing `useEffect` that batch-fetches opponent usernames:

```tsx
// Fetch own avatar
useEffect(() => {
  if (!user) return;
  supabase
    .from("profiles")
    .select("equipped_face, equipped_hat")
    .eq("id", user.id)
    .single()
    .then(({ data }) => {
      if (!data) return;
      setMyFace(data.equipped_face ?? "classic");
      setMyHat(data.equipped_hat ?? null);
    });
}, [user, supabase]);
```

- [ ] **Step 3: Extend the opponent profile batch query**

Replace the existing batch-fetch `useEffect` (which selects `id, preferred_username, name`) with:

```tsx
useEffect(() => {
  if (!user || allGames.length === 0) return;
  const ids = [...new Set(
    allGames.flatMap((g) =>
      [g.creator_id, g.joiner_id].filter((id): id is string => !!id && id !== user.id)
    )
  )];
  if (ids.length === 0) return;
  supabase
    .from("profiles")
    .select("id, preferred_username, name, equipped_face, equipped_hat")
    .in("id", ids)
    .then(({ data }) => {
      if (!data) return;
      const names: Record<string, string> = {};
      const avatars: Record<string, { face: string; hat: string | null }> = {};
      for (const p of data) {
        names[p.id] = p.preferred_username || p.name || p.id.slice(0, 8);
        avatars[p.id] = {
          face: p.equipped_face ?? "classic",
          hat: p.equipped_hat ?? null,
        };
      }
      setUsernameMap(names);
      setAvatarMap(avatars);
    });
}, [allGames, user, supabase]);
```

- [ ] **Step 4: Save avatar changes**

Add the save callback inside `PvPHub` (after the avatar state declarations):

```tsx
const saveAvatar = useCallback(
  async (face: string, hat: string | null) => {
    if (!user) return;
    const { error } = await supabase
      .from("profiles")
      .update({ equipped_face: face, equipped_hat: hat })
      .eq("id", user.id);
    if (error) {
      toast.error("Failed to save avatar");
    }
  },
  [user, supabase],
);

const handleFaceChange = useCallback(
  (slug: string) => {
    setMyFace(slug);
    saveAvatar(slug, myHat);
  },
  [myHat, saveAvatar],
);

const handleHatChange = useCallback(
  (slug: string | null) => {
    setMyHat(slug);
    saveAvatar(myFace, slug);
  },
  [myFace, saveAvatar],
);
```

- [ ] **Step 5: Update `ArenaGameRow` to use `AvatarComposite`**

`ArenaGameRow` currently renders a `<div>` with initials. Update its props interface and rendering:

Delete the local `Avatar` function (lines 48–57 in the current file) — it is fully replaced by `AvatarComposite`.

Update `ArenaGameRowProps` and `ArenaGameRow` as follows:

```tsx
interface ArenaGameRowProps {
  game: PvPGame;
  userId: string;
  usernameMap: Record<string, string>;
  avatarMap: Record<string, { face: string; hat: string | null }>;
}

function ArenaGameRow({ game, userId, usernameMap, avatarMap }: ArenaGameRowProps) {
  const router = useRouter();
  const { startRace } = usePvP();

  const isCreator = game.creator_id === userId;
  const opponentId = isCreator ? (game.joiner_id ?? "") : game.creator_id;
  const opponentName = usernameMap[opponentId] ?? (opponentId ? opponentId.slice(0, 8) : "Open");
  const opponentAvatar = avatarMap[opponentId] ?? { face: "classic", hat: null };

  const myCompleted = isCreator ? game.creator_completed_at : game.joiner_completed_at;
  const myCpm = isCreator ? game.creator_cpm : game.joiner_cpm;
  const isWinner = game.winner_id === userId;

  let statusLabel: string;
  let statusClass: string;
  if (game.status === "completed") {
    const cpmStr = myCpm != null ? ` · ${myCpm.toFixed(0)} CPM` : "";
    statusLabel = isWinner ? `WON${cpmStr}` : `LOST${cpmStr}`;
    statusClass = isWinner
      ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25"
      : "bg-slate-700/60 text-slate-400 border border-slate-600/40";
  } else if (game.status === "open" && myCompleted === null) {
    statusLabel = "IN PROGRESS";
    statusClass = "bg-sky-500/15 text-sky-400 border border-sky-500/25";
  } else {
    statusLabel = "WAITING";
    statusClass = "bg-amber-500/15 text-amber-400 border border-amber-500/25";
  }

  const wordCount = game.word_set.length;
  const langLabel = game.language.charAt(0).toUpperCase() + game.language.slice(1);
  const levelLabel = `Level ${game.level}`;

  const handleClick = () => {
    if (game.status === "open" && myCompleted === null) {
      startRace(game);
      router.push("/");
    } else {
      router.push(`/pvp/challenge?id=${game.id}`);
    }
  };

  return (
    <button
      onClick={handleClick}
      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700/50 hover:bg-slate-700/50 hover:border-slate-600/50 transition-all duration-150 text-left"
    >
      <AvatarComposite face={opponentAvatar.face} hat={opponentAvatar.hat} size={40} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-100 truncate">{opponentName}</p>
        <p className="text-xs text-slate-500">{wordCount} words · {langLabel} · {levelLabel}</p>
      </div>
      <span className={clsx("flex-shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-full", statusClass)}>
        {statusLabel}
      </span>
    </button>
  );
}
```

- [ ] **Step 6: Add the "Your avatar" row + picker panel**

In the Challenges tab JSX, inside the `<div className="flex flex-col gap-2 flex-1 min-w-0">`, add the your-row at the top (before the `showNewChallenge ? ...` block):

```tsx
{/* Your avatar row */}
{user && !showNewChallenge && (
  <button
    onClick={() => setPickerOpen((o) => !o)}
    className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl bg-violet-500/10 border border-dashed border-violet-500/30 hover:bg-violet-500/12 hover:border-violet-500/50 transition-all duration-150 text-left"
  >
    <AvatarComposite face={myFace} hat={myHat} size={40} />
    <div className="flex-1 min-w-0">
      <p className="text-sm font-semibold text-violet-300">You</p>
      <p className="text-xs text-violet-400/60">Tap to customise avatar</p>
    </div>
    <span className="text-[11px] font-bold text-violet-400 bg-violet-500/15 border border-violet-500/25 rounded-full px-2.5 py-0.5">
      {pickerOpen ? "✕ Close" : "✎ Edit"}
    </span>
  </button>
)}
```

In the outer challenges layout (`<div className="flex gap-5 items-start">`), add the picker panel after the game list div and before the stat cards div:

```tsx
{pickerOpen && user && (
  <AvatarPicker
    userId={user.id}
    currentFace={myFace}
    currentHat={myHat}
    isPremium={isPremium}
    onFaceChange={handleFaceChange}
    onHatChange={handleHatChange}
  />
)}
```

Also pass `avatarMap` to every `ArenaGameRow` call (there are two — one in challenges, one in history):

```tsx
<ArenaGameRow key={g.id} game={g} userId={user!.id} usernameMap={usernameMap} avatarMap={avatarMap} />
```

- [ ] **Step 7: Type-check**

```bash
pnpm type-check
```
Expected: no errors.

- [ ] **Step 8: Verify visually**

Run `pnpm dev:next`, navigate to `/pvp`. Confirm:
- Your own violet row appears at top of Challenges tab with your avatar
- Clicking it opens the picker on the right
- Selecting a face updates the preview and your row immediately
- Selecting an available hat shows it on the preview
- Locked earned hats show the lock badge and progress text
- Locked premium hats show "Premium only" if you're not premium
- Opponent rows show their avatars (defaulting to classic face / no hat)

- [ ] **Step 9: Commit**

```bash
git -C touch-type add renderer/src/components/PvP/PvPHub.tsx
git -C touch-type commit -m "feat: wire avatar composite + picker into Arena hub"
```

---

## Task 8: `/pvp/profile` page

**Files:**
- Create: `renderer/src/app/pvp/profile/page.tsx`

A static Next.js route that reads `?id=` from the URL. When no `id` is provided (or `id` equals the current user), shows the current user's own profile. Stats are fetched directly from `pvp_games`.

- [ ] **Step 1: Create `renderer/src/app/pvp/profile/page.tsx`**

```tsx
// renderer/src/app/pvp/profile/page.tsx
"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSwords, faArrowLeft } from "@fortawesome/pro-regular-svg-icons";
import { AvatarComposite } from "@/components/avatars/AvatarComposite";
import { useSupabase } from "@/lib/supabase-provider";

interface ProfileData {
  displayName: string;
  face: string;
  hat: string | null;
  gamesPlayed: number;
  wins: number;
  bestCpm: number | null;
}

function ProfileContent() {
  const searchParams = useSearchParams();
  const { user, supabase } = useSupabase();
  const targetId = searchParams.get("id") ?? user?.id ?? null;

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!targetId) { setLoading(false); return; }

    async function load() {
      const [profileRes, gamesPlayedRes, winsRes, cpmRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("preferred_username, name, equipped_face, equipped_hat")
          .eq("id", targetId!)
          .single(),
        supabase
          .from("pvp_games")
          .select("id", { count: "exact", head: true })
          .or(`creator_id.eq.${targetId},joiner_id.eq.${targetId}`)
          .eq("status", "completed"),
        supabase
          .from("pvp_games")
          .select("id", { count: "exact", head: true })
          .eq("winner_id", targetId!)
          .eq("status", "completed"),
        supabase
          .from("pvp_games")
          .select("creator_id, creator_cpm, joiner_cpm")
          .or(`creator_id.eq.${targetId},joiner_id.eq.${targetId}`)
          .eq("status", "completed"),
      ]);

      const p = profileRes.data;
      let bestCpm: number | null = null;
      for (const g of cpmRes.data ?? []) {
        const cpm = g.creator_id === targetId ? g.creator_cpm : g.joiner_cpm;
        if (cpm != null && (bestCpm === null || cpm > bestCpm)) bestCpm = cpm;
      }

      setProfile({
        displayName: p?.preferred_username || p?.name || targetId!.slice(0, 8),
        face: p?.equipped_face ?? "classic",
        hat: p?.equipped_hat ?? null,
        gamesPlayed: gamesPlayedRes.count ?? 0,
        wins: winsRes.count ?? 0,
        bestCpm,
      });
      setLoading(false);
    }

    load().catch(() => setLoading(false));
  }, [targetId, supabase]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return <p className="text-sm text-slate-500 text-center py-16">Profile not found.</p>;
  }

  const winRate = profile.gamesPlayed > 0
    ? ((profile.wins / profile.gamesPlayed) * 100).toFixed(0)
    : "0";

  return (
    <div className="flex flex-col items-center gap-6 py-12 px-6 max-w-sm mx-auto">
      <AvatarComposite face={profile.face} hat={profile.hat} size={96} />
      <h1 className="text-2xl font-bold text-slate-100">{profile.displayName}</h1>

      <div className="w-full grid grid-cols-3 gap-3">
        {[
          { label: "Games", value: profile.gamesPlayed },
          { label: "Wins", value: profile.wins },
          { label: "Win rate", value: `${winRate}%` },
        ].map(({ label, value }) => (
          <div key={label} className="flex flex-col items-center gap-1 bg-slate-800/60 border border-slate-700/50 rounded-xl py-3">
            <p className="text-lg font-bold text-sky-400 tabular-nums">{value}</p>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">{label}</p>
          </div>
        ))}
      </div>

      {profile.bestCpm != null && (
        <div className="w-full flex flex-col items-center gap-1 bg-slate-800/60 border border-slate-700/50 rounded-xl py-4">
          <p className="text-3xl font-bold text-amber-400 tabular-nums">{profile.bestCpm.toFixed(0)}</p>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Best CPM in Arena</p>
        </div>
      )}

      <Link href="/pvp" className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 transition-colors">
        <FontAwesomeIcon icon={faArrowLeft} className="w-3.5 h-3.5" />
        Back to Arena
      </Link>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-64"><div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" /></div>}>
      <ProfileContent />
    </Suspense>
  );
}
```

- [ ] **Step 2: Add "View Profile" link to your own row in `PvPHub`**

In the "Your avatar" row button JSX (added in Task 7), add a secondary link alongside the edit button. Change the `<button>` to a `<div>` wrapper with two children — the clickable row (opens picker) and a separate "View Profile" link:

```tsx
{user && !showNewChallenge && (
  <div className="flex flex-col gap-1">
    <button
      onClick={() => setPickerOpen((o) => !o)}
      className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl bg-violet-500/10 border border-dashed border-violet-500/30 hover:bg-violet-500/12 hover:border-violet-500/50 transition-all duration-150 text-left"
    >
      <AvatarComposite face={myFace} hat={myHat} size={40} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-violet-300">You</p>
        <p className="text-xs text-violet-400/60">Tap to customise avatar</p>
      </div>
      <span className="text-[11px] font-bold text-violet-400 bg-violet-500/15 border border-violet-500/25 rounded-full px-2.5 py-0.5">
        {pickerOpen ? "✕ Close" : "✎ Edit"}
      </span>
    </button>
    <Link
      href="/pvp/profile"
      className="text-[10px] text-slate-600 hover:text-slate-400 text-right px-2 transition-colors"
    >
      View profile →
    </Link>
  </div>
)}
```

Add `import Link from "next/link";` to `PvPHub.tsx` if not already present.

- [ ] **Step 3: Type-check**

```bash
pnpm type-check
```
Expected: no errors.

- [ ] **Step 4: Verify visually**

Run `pnpm dev:next`. Navigate to `/pvp/profile` (no query param — shows your own profile). Confirm:
- Avatar renders at 96px
- Stats show correctly (may be 0 if no PvP games locally)
- "Back to Arena" link works
- Navigating to `/pvp/profile?id=<some-uuid>` shows that user's data (or "not found")

- [ ] **Step 5: Commit**

```bash
git -C touch-type add renderer/src/app/pvp/profile/
git -C touch-type add renderer/src/components/PvP/PvPHub.tsx
git -C touch-type commit -m "feat: add pvp profile page + View Profile link"
```

---

## Self-Review Checklist

Before calling this done, verify:

- [ ] `pnpm type-check` passes with zero errors
- [ ] All 11 face slugs match between `FACES` array and the face files
- [ ] All 13 hat slugs match between `HATS` array and the hat files (including `none`)
- [ ] Selecting a face or hat in the picker immediately updates the preview and the game row
- [ ] Locked earned hats show the correct `X / Y wins|games` progress
- [ ] Locked premium hats show lock icon and "Upgrade" text for non-premium users
- [ ] Your own row's avatar updates immediately on selection (optimistic update)
- [ ] `/pvp/profile` uses `<Suspense>` wrapping `useSearchParams` (required for Next.js static export)
- [ ] `supabase gen types typescript` was re-run after migration (Task 1 Step 3)
