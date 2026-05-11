// renderer/src/components/avatars/hats/HaloHat.tsx
export function HaloHat() {
  return (
    <g>
      <ellipse cx="32" cy="18" rx="18" ry="5" fill="none" stroke="#FCD34D" strokeWidth="5" opacity="0.3" />
      <ellipse cx="32" cy="18" rx="18" ry="5" fill="none" stroke="#FBBF24" strokeWidth="3" />
      <path d="M18,16 Q20,12 26,14" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.8" />
    </g>
  );
}
