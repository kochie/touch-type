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
