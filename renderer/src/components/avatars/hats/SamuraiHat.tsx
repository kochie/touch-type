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
