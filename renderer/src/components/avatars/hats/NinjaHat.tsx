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
