// renderer/src/components/avatars/sprites.tsx
// One component per face / hat, all drawn from the pixel data in sprite-data.ts.
import { PixelSprite } from "./PixelSprite";
import { FACE_SPRITES, HAT_SPRITES } from "./sprite-data";
import { STREAK_SPRITES } from "./sprite-streak";
import type { Grid } from "./sprite-kit";

const sprite = (grid: Grid) => {
  const Sprite = () => <PixelSprite grid={grid} />;
  return Sprite;
};

export const ClassicFace = sprite(FACE_SPRITES.classic);
export const CoolFace = sprite(FACE_SPRITES.cool);
export const FierceFace = sprite(FACE_SPRITES.fierce);
export const ChillFace = sprite(FACE_SPRITES.chill);
export const NerdFace = sprite(FACE_SPRITES.nerd);
export const RobotFace = sprite(FACE_SPRITES.robot);
export const AlienFace = sprite(FACE_SPRITES.alien);
export const ZombieFace = sprite(FACE_SPRITES.zombie);
export const GhostFace = sprite(FACE_SPRITES.ghost);
export const DogFace = sprite(FACE_SPRITES.dog);
export const CatFace = sprite(FACE_SPRITES.cat);
export const GoldbotFace = sprite(FACE_SPRITES.goldbot);

export const EmberFace = sprite(STREAK_SPRITES.ember);
export const TorchFace = sprite(STREAK_SPRITES.torch);
export const BlazeFace = sprite(STREAK_SPRITES.blaze);
export const InfernoFace = sprite(STREAK_SPRITES.inferno);
export const PhoenixFace = sprite(STREAK_SPRITES.phoenix);
export const SunFace = sprite(STREAK_SPRITES.sun);

export const BeanieHat = sprite(HAT_SPRITES.beanie);
export const CapHat = sprite(HAT_SPRITES.cap);
export const HeadbandHat = sprite(HAT_SPRITES.headband);
export const CowboyHat = sprite(HAT_SPRITES.cowboy);
export const LaurelsHat = sprite(HAT_SPRITES.laurels);
export const CrownHat = sprite(HAT_SPRITES.crown);
export const NinjaHat = sprite(HAT_SPRITES.ninja);
export const TopHat = sprite(HAT_SPRITES.tophat);
export const WizardHat = sprite(HAT_SPRITES.wizard);
export const VikingHat = sprite(HAT_SPRITES.viking);
export const HaloHat = sprite(HAT_SPRITES.halo);
export const SamuraiHat = sprite(HAT_SPRITES.samurai);

export const KeycapHat = sprite(HAT_SPRITES.keycap);
export const GogglesHat = sprite(HAT_SPRITES.goggles);
export const ScholarHat = sprite(HAT_SPRITES.scholar);
export const BeretHat = sprite(HAT_SPRITES.beret);
export const AlpineHat = sprite(HAT_SPRITES.alpine);
export const NordicHat = sprite(HAT_SPRITES.nordic);
export const PithHat = sprite(HAT_SPRITES.pith);
export const GrandmasterHat = sprite(HAT_SPRITES.grandmaster);
