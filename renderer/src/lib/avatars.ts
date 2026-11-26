// renderer/src/lib/avatars.ts
import type { FC } from "react";

import {
  AlienFace,
  BeanieHat,
  CapHat,
  CatFace,
  ChillFace,
  ClassicFace,
  CoolFace,
  CowboyHat,
  CrownHat,
  DogFace,
  FierceFace,
  GhostFace,
  HaloHat,
  HeadbandHat,
  LaurelsHat,
  NerdFace,
  NinjaHat,
  RobotFace,
  SamuraiHat,
  TopHat,
  VikingHat,
  WizardHat,
  ZombieFace,
  GoldbotFace,
  EmberFace,
  TorchFace,
  BlazeFace,
  InfernoFace,
  PhoenixFace,
  SunFace,
  KeycapHat,
  GogglesHat,
  ScholarHat,
  BeretHat,
  AlpineHat,
  NordicHat,
  PithHat,
  GrandmasterHat,
} from "@/components/avatars/sprites";
import { KeyboardLayoutNames } from "@/keyboards";

export type HatTier = "free" | "earned" | "premium";

/** A "perfect" session has no mistakes and at least this many correct keystrokes (about 30 words). */
export const PERFECT_MIN_CORRECT = 150;

export type UnlockCondition =
  | { type: "games_played" | "wins"; count: number }
  /** A perfect session on any one of these layouts. */
  | { type: "perfect_layout"; layouts: string[]; label: string }
  /** Perfect sessions on this many different layouts. */
  | { type: "perfect_layouts"; count: number }
  /** A perfect session on every layout. */
  | { type: "perfect_all" }
  /** Longest daily streak reached, in days. */
  | { type: "streak"; days: number };

export interface AvatarStats {
  gamesPlayed: number;
  wins: number;
  /** Keyboard layouts the user has at least one perfect session on. */
  perfectLayouts: string[];
  /** Longest daily typing streak ever reached. */
  longestStreak: number;
}

export interface FaceDef {
  slug: string;
  name: string;
  description: string;
  Component: FC;
  unlockCondition?: UnlockCondition;
}

export type HatDef =
  | { slug: string; name: string; description: string; tier: "free" | "premium"; Component: FC | null; unlockCondition?: never }
  | { slug: string; name: string; description: string; tier: "earned"; Component: FC; unlockCondition: UnlockCondition };

const ALL_LAYOUTS = Object.values(KeyboardLayoutNames) as string[];
const layoutsEnding = (suffix: string) => ALL_LAYOUTS.filter((l) => l.endsWith(suffix));
const layoutsNamed = (...names: string[]) => ALL_LAYOUTS.filter((l) => names.some((n) => l.includes(n)));

export const FACES: readonly FaceDef[] = [
  { slug: "classic", description: "The original friendly face, always ready to type.", name: "Classic", Component: ClassicFace },
  { slug: "cool",    description: "Sunglasses on, and nothing can rattle this typist.", name: "Cool",    Component: CoolFace },
  { slug: "fierce",  description: "A scowl that says every key is about to get smashed.", name: "Fierce",  Component: FierceFace },
  { slug: "chill",   description: "Relaxed and smiling, typing at its own pace.", name: "Chill",   Component: ChillFace },
  { slug: "nerd",    description: "Thick glasses and a big brain for all those long words.", name: "Nerd",    Component: NerdFace },
  { slug: "robot",   description: "A tireless machine built for perfect keystrokes.", name: "Robot",   Component: RobotFace },
  { slug: "alien",   description: "Visiting from another planet to study human typing.", name: "Alien",   Component: AlienFace },
  { slug: "zombie",  description: "Stitched together and still hungry for words.", name: "Zombie",  Component: ZombieFace },
  { slug: "ghost",   description: "Floats silently over the keys without leaving a trace.", name: "Ghost",   Component: GhostFace },
  { slug: "dog",     description: "A loyal pup that fetches every word.", name: "Dog",     Component: DogFace },
  { slug: "cat",     description: "Curious, quick and always lands on its feet.", name: "Cat",     Component: CatFace },
  { slug: "goldbot", description: "A gleaming golden robot for typists who have mastered every layout.", name: "Golden Robot", Component: GoldbotFace, unlockCondition: { type: "perfect_all" } },
  { slug: "ember", description: "A small flame flickers on this cheerful head.", name: "Ember", Component: EmberFace, unlockCondition: { type: "streak", days: 7 } },
  { slug: "torch", description: "Burning bright with a flame on every side.", name: "Torch", Component: TorchFace, unlockCondition: { type: "streak", days: 14 } },
  { slug: "blaze", description: "Glowing eyes and a roaring blaze for a month of dedication.", name: "Blaze", Component: BlazeFace, unlockCondition: { type: "streak", days: 30 } },
  { slug: "inferno", description: "Cracked with lava and wreathed in fire.", name: "Inferno", Component: InfernoFace, unlockCondition: { type: "streak", days: 90 } },
  { slug: "phoenix", description: "Rises again every day, with wings and a fiery crest.", name: "Phoenix", Component: PhoenixFace, unlockCondition: { type: "streak", days: 180 } },
  { slug: "sun", description: "A full year of typing, shining down on every keyboard.", name: "Sun", Component: SunFace, unlockCondition: { type: "streak", days: 365 } },
];

export const HATS: readonly HatDef[] = [
  { slug: "none",     description: "Go bare-headed and let the face do the talking.", name: "None",         tier: "free",    Component: null },
  { slug: "beanie",   description: "A cosy knit beanie with a bobble on top.", name: "Beanie",       tier: "free",    Component: BeanieHat },
  { slug: "cap",      description: "A classic red baseball cap, worn forwards.", name: "Baseball Cap", tier: "free",    Component: CapHat },
  { slug: "headband", description: "A purple headband to keep your focus sharp.", name: "Headband",     tier: "free",    Component: HeadbandHat },
  { slug: "cowboy",   description: "A wide-brimmed hat for riding into the arena.", name: "Cowboy",       tier: "earned",  Component: CowboyHat,  unlockCondition: { type: "games_played", count: 10 } },
  { slug: "laurels",  description: "A wreath of laurel leaves for champions.", name: "Laurels",      tier: "earned",  Component: LaurelsHat, unlockCondition: { type: "wins", count: 5 } },
  { slug: "crown",    description: "A gold crown for those who rule the arena.", name: "Crown",        tier: "earned",  Component: CrownHat,   unlockCondition: { type: "wins", count: 20 } },
  { slug: "ninja",    description: "A black hood and metal plate for silent, deadly typing.", name: "Ninja",        tier: "earned",  Component: NinjaHat,   unlockCondition: { type: "games_played", count: 50 } },
  { slug: "keycap",   description: "A crown of keycaps for the QWERTY faithful.", name: "Keycap Crown", tier: "earned",  Component: KeycapHat,  unlockCondition: { type: "perfect_layout", layouts: layoutsEnding("_QWERTY"), label: "QWERTY" } },
  { slug: "goggles",  description: "Aviator goggles for pilots of the Dvorak layout.", name: "Aviator Goggles", tier: "earned", Component: GogglesHat, unlockCondition: { type: "perfect_layout", layouts: layoutsNamed("DVORAK"), label: "Dvorak" } },
  { slug: "scholar",  description: "A graduation cap for scholars of Colemak.", name: "Scholar's Cap", tier: "earned", Component: ScholarHat, unlockCondition: { type: "perfect_layout", layouts: layoutsNamed("COLEMAK"), label: "Colemak" } },
  { slug: "beret",    description: "A jaunty beret fit for an AZERTY artist.", name: "Beret",        tier: "earned",  Component: BeretHat,   unlockCondition: { type: "perfect_layout", layouts: layoutsNamed("AZERTY"), label: "AZERTY" } },
  { slug: "alpine",   description: "A feathered alpine hat for QWERTZ explorers.", name: "Alpine Hat",   tier: "earned",  Component: AlpineHat,  unlockCondition: { type: "perfect_layout", layouts: layoutsNamed("QWERTZ"), label: "QWERTZ" } },
  { slug: "nordic",   description: "A bronze helm with white horns for the Nordic layouts.", name: "Nordic Helm",  tier: "earned",  Component: NordicHat,  unlockCondition: { type: "perfect_layout", layouts: layoutsEnding("_NORDIC"), label: "Nordic" } },
  { slug: "pith",     description: "An explorer's helmet for typists who roam many layouts.", name: "Pith Helmet",  tier: "earned",  Component: PithHat,    unlockCondition: { type: "perfect_layouts", count: 5 } },
  { slug: "grandmaster", description: "A jewelled crown, the mark of a true layout grandmaster.", name: "Grandmaster Crown", tier: "earned", Component: GrandmasterHat, unlockCondition: { type: "perfect_all" } },
  { slug: "tophat",   description: "A smart black top hat with a red band.", name: "Top Hat",      tier: "premium", Component: TopHat },
  { slug: "wizard",   description: "A starry wizard hat for casting words.", name: "Wizard",       tier: "premium", Component: WizardHat },
  { slug: "viking",   description: "A horned helmet, ready for battle.", name: "Viking",       tier: "premium", Component: VikingHat },
  { slug: "halo",     description: "A golden halo for typing angels.", name: "Halo",         tier: "premium", Component: HaloHat },
  { slug: "samurai",  description: "A red kabuto helmet with golden horns.", name: "Samurai",      tier: "premium", Component: SamuraiHat },
];

export function getFace(slug: string): FaceDef {
  return FACES.find((f) => f.slug === slug) ?? FACES[0];
}

export function getHat(slug: string | null | undefined): HatDef {
  return HATS.find((h) => h.slug === slug) ?? HATS[0]; // fallback to "none"
}

export function isConditionMet(cond: UnlockCondition, stats: AvatarStats): boolean {
  switch (cond.type) {
    case "wins":
      return stats.wins >= cond.count;
    case "games_played":
      return stats.gamesPlayed >= cond.count;
    case "perfect_layout":
      return cond.layouts.some((l) => stats.perfectLayouts.includes(l));
    case "perfect_layouts":
      return stats.perfectLayouts.length >= cond.count;
    case "perfect_all":
      return ALL_LAYOUTS.every((l) => stats.perfectLayouts.includes(l));
    case "streak":
      return stats.longestStreak >= cond.days;
  }
}

/** Short progress text for a locked item, e.g. "3 / 10 games" or "Perfect QWERTY". */
export function unlockProgress(cond: UnlockCondition, stats: AvatarStats): string {
  switch (cond.type) {
    case "wins":
      return `${stats.wins} / ${cond.count} wins`;
    case "games_played":
      return `${stats.gamesPlayed} / ${cond.count} games`;
    case "perfect_layout":
      return `Perfect ${cond.label}`;
    case "perfect_layouts":
      return `${Math.min(stats.perfectLayouts.length, cond.count)} / ${cond.count} layouts`;
    case "streak":
      return `${Math.min(stats.longestStreak, cond.days)} / ${cond.days} days`;
    case "perfect_all": {
      const done = ALL_LAYOUTS.filter((l) => stats.perfectLayouts.includes(l)).length;
      return `${done} / ${ALL_LAYOUTS.length} layouts`;
    }
  }
}

/** One sentence on how to get an item, e.g. "Win 5 arena matches." */
export function describeUnlock(cond: UnlockCondition): string {
  switch (cond.type) {
    case "wins":
      return `Win ${cond.count} arena matches.`;
    case "games_played":
      return `Play ${cond.count} arena matches.`;
    case "perfect_layout":
      return `Type ${PERFECT_MIN_CORRECT}+ keys with no mistakes on ${cond.label}.`;
    case "perfect_layouts":
      return `Type ${PERFECT_MIN_CORRECT}+ keys with no mistakes on ${cond.count} different layouts.`;
    case "perfect_all":
      return `Type ${PERFECT_MIN_CORRECT}+ keys with no mistakes on all ${ALL_LAYOUTS.length} layouts.`;
    case "streak":
      return `Reach a ${cond.days}-day typing streak.`;
  }
}

export function howToEarnHat(hat: HatDef): string {
  if (hat.tier === "premium") return "Included with Premium.";
  if (hat.tier === "earned") return describeUnlock(hat.unlockCondition);
  return "Free for everyone.";
}

export function howToEarnFace(face: FaceDef): string {
  return face.unlockCondition ? describeUnlock(face.unlockCondition) : "Free for everyone.";
}

export function isHatUnlocked(hat: HatDef, stats: AvatarStats, isPremium: boolean): boolean {
  if (hat.tier !== "earned") return hat.tier === "free" || isPremium;
  return isConditionMet(hat.unlockCondition, stats);
}

export function isFaceUnlocked(face: FaceDef, stats: AvatarStats): boolean {
  return !face.unlockCondition || isConditionMet(face.unlockCondition, stats);
}
