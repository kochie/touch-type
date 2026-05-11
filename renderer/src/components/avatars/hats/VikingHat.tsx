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
