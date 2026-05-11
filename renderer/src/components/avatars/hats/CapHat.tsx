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
