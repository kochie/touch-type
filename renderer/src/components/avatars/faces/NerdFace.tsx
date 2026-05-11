// renderer/src/components/avatars/faces/NerdFace.tsx
export function NerdFace() {
  return (
    <g>
      <circle cx="32" cy="38" r="22" fill="#34D399" />
      <circle cx="24" cy="35" r="5.5" fill="none" stroke="#1e293b" strokeWidth="2" />
      <circle cx="40" cy="35" r="5.5" fill="none" stroke="#1e293b" strokeWidth="2" />
      <circle cx="24" cy="35" r="3" fill="#1e293b" opacity="0.7" />
      <circle cx="40" cy="35" r="3" fill="#1e293b" opacity="0.7" />
      <line x1="29.5" y1="35" x2="34.5" y2="35" stroke="#1e293b" strokeWidth="2" />
      <line x1="18" y1="33" x2="18.5" y2="35" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" />
      <line x1="46" y1="33" x2="45.5" y2="35" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" />
      <path d="M26 45 Q32 49 38 45" stroke="#1e293b" strokeWidth="2.5" strokeLinecap="round" fill="none" />
    </g>
  );
}
