// renderer/src/components/avatars/faces/FierceFace.tsx
export function FierceFace() {
  return (
    <g>
      <circle cx="32" cy="38" r="22" fill="#F87171" />
      <circle cx="24" cy="36" r="4" fill="#1e293b" />
      <circle cx="40" cy="36" r="4" fill="#1e293b" />
      <circle cx="25.5" cy="34.5" r="1.5" fill="white" />
      <circle cx="41.5" cy="34.5" r="1.5" fill="white" />
      <line x1="20" y1="30" x2="28" y2="33" stroke="#1e293b" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="36" y1="33" x2="44" y2="30" stroke="#1e293b" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M26 46 Q32 43 38 46" stroke="#1e293b" strokeWidth="2.5" strokeLinecap="round" fill="none" />
    </g>
  );
}
