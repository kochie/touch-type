// renderer/src/components/avatars/AvatarComposite.tsx
"use client";

import { useRef, type FC } from "react";
import { getFace, getHat } from "@/lib/avatars";
import { PixelSprite } from "./PixelSprite";
import { FACE_ANIMATIONS } from "./sprite-frames";
import { VICTORY_ANIMATIONS } from "./sprite-victory";
import { useHostHover, useOneShot, useSpriteFrame } from "./sprite-ticker";

/** Twinkle positions (64x64 space) for hats that carry permanent flair. */
const SPARKLES: Record<string, [number, number, string][]> = {
  crown: [[16, 6, "#fde68a"], [46, 8, "#fff"]],
  halo: [[14, 9, "#fff"], [49, 7, "#fde68a"]],
  samurai: [[12, 10, "#fde68a"], [50, 9, "#fff"]],
  grandmaster: [[10, 8, "#fff"], [32, 3, "#fde68a"], [53, 9, "#fff"]],
  wizard: [[44, 6, "#fde68a"], [18, 14, "#fff"]],
  keycap: [[48, 8, "#fff"]],
  pith: [[46, 10, "#fde68a"]],
};

export type AvatarMotion = "idle" | "hover" | "off";

interface AvatarCompositeProps {
  face: string;
  hat?: string | null;
  size?: number;
  /** idle: always animating, hover: animates while the pointer is over it, off: still. */
  motion?: AvatarMotion;
  /** Pin a specific animation frame (debug tooling). Overrides the clock. */
  frame?: number;
  /** Which animation `frame` indexes into (debug tooling). */
  animation?: "idle" | "victory";
  /** Play this face's victory animation once, then call `onVictoryEnd`. */
  victory?: boolean;
  onVictoryEnd?: () => void;
}

export function AvatarComposite({
  face,
  hat = null,
  size = 40,
  motion = "idle",
  frame: pinned,
  animation = "idle",
  victory = false,
  onVictoryEnd,
}: AvatarCompositeProps) {
  const ref = useRef<SVGSVGElement>(null);
  const faceDef = getFace(face);
  const hatDef = getHat(hat);
  const FaceComp = faceDef.Component as FC<object>;
  const HatComp = hatDef.Component as FC<object> | null;
  const idleAnim = FACE_ANIMATIONS[faceDef.slug];
  const victoryAnim = VICTORY_ANIMATIONS[faceDef.slug];
  const victoryFrame = useOneShot(victoryAnim, victory, onVictoryEnd);
  const anim = victoryFrame !== null || (pinned !== undefined && animation === "victory") ? victoryAnim : idleAnim;
  const hovered = useHostHover(ref, motion === "hover");
  const clockFrame = useSpriteFrame(anim, pinned === undefined && victoryFrame === null && (motion === "idle" || hovered));
  const frame =
    victoryFrame !== null
      ? victoryFrame
      : pinned !== undefined && anim
      ? Math.min(pinned, anim.frames.length - 1)
      : clockFrame;
  const [dx, dy] = anim?.offsets[frame] ?? [0, 0];
  const sparkles = hatDef.slug !== "none" ? (SPARKLES[hatDef.slug] ?? []) : [];
  const sparkling = motion === "idle" || hovered;

  return (
    <svg
      ref={ref}
      width={size}
      height={size}
      viewBox="0 0 64 64"
      style={{ overflow: "visible" }}
      xmlns="http://www.w3.org/2000/svg"
      aria-label={`${faceDef.name} face${hatDef.slug !== "none" ? ` with ${hatDef.name} hat` : ""}`}
    >
      <g transform={dx || dy ? `translate(${dx * 2} ${dy * 2})` : undefined}>
        {anim ? <PixelSprite grid={anim.frames[frame]} /> : <FaceComp />}
        {HatComp && <HatComp />}
      </g>
      {anim?.effects && (victoryFrame !== null || pinned !== undefined) && <PixelSprite grid={anim.effects[frame]} />}
      {sparkling &&
        sparkles.map(([x, y, fill], i) => (
          <path
            key={i}
            className="av-spark"
            style={{ animationDelay: `${i * 0.8}s` }}
            d={`M${x} ${y - 3}L${x + 1} ${y - 1}L${x + 3} ${y}L${x + 1} ${y + 1}L${x} ${y + 3}L${x - 1} ${y + 1}L${x - 3} ${y}L${x - 1} ${y - 1}Z`}
            fill={fill}
          />
        ))}
    </svg>
  );
}
