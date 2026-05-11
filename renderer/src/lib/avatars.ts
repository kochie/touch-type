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

export type HatDef =
  | { slug: string; name: string; tier: "free" | "premium"; Component: FC | null; unlockCondition?: never }
  | { slug: string; name: string; tier: "earned"; Component: FC; unlockCondition: UnlockCondition };

export const FACES: readonly FaceDef[] = [
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

export const HATS: readonly HatDef[] = [
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
