// renderer/src/components/avatars/faces/DogFace.tsx
export function DogFace() {
  return (
    <g>
      <circle cx="32" cy="36" r="20" fill="#D97706" />
      {/* Floppy hanging ears */}
      <ellipse cx="14" cy="40" rx="8" ry="12" fill="#b45309" />
      <ellipse cx="50" cy="40" rx="8" ry="12" fill="#b45309" />
      <ellipse cx="14" cy="40" rx="5" ry="9" fill="#d97706" />
      <ellipse cx="50" cy="40" rx="5" ry="9" fill="#d97706" />
      <ellipse cx="32" cy="43" rx="9" ry="6" fill="#fbbf24" />
      <circle cx="25" cy="33" r="4" fill="#1e293b" />
      <circle cx="39" cy="33" r="4" fill="#1e293b" />
      <circle cx="26.5" cy="31.5" r="1.5" fill="white" />
      <circle cx="40.5" cy="31.5" r="1.5" fill="white" />
      <ellipse cx="32" cy="40" rx="3.5" ry="2.5" fill="#1e293b" />
      <path d="M 28,47 Q 32,52 36,47" stroke="#f87171" strokeWidth="3" strokeLinecap="round" fill="none" />
    </g>
  );
}
