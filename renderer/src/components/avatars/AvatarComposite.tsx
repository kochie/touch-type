// renderer/src/components/avatars/AvatarComposite.tsx
import type { FC } from "react";
import { getFace, getHat } from "@/lib/avatars";

interface AvatarCompositeProps {
  face: string;
  hat?: string | null;
  size?: number;
}

export function AvatarComposite({ face, hat = null, size = 40 }: AvatarCompositeProps) {
  const faceDef = getFace(face);
  const hatDef = getHat(hat);
  const FaceComp = faceDef.Component as FC<object>;
  const HatComp = hatDef.Component as FC<object> | null;

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
