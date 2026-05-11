// renderer/src/components/avatars/faces/ZombieFace.tsx
export function ZombieFace() {
  return (
    <g>
      <rect x="10" y="14" width="44" height="44" rx="10" fill="#86A888" />
      <line x1="19" y1="28" x2="27" y2="36" stroke="#1e293b" strokeWidth="3" strokeLinecap="round" />
      <line x1="27" y1="28" x2="19" y2="36" stroke="#1e293b" strokeWidth="3" strokeLinecap="round" />
      <line x1="37" y1="28" x2="45" y2="36" stroke="#1e293b" strokeWidth="3" strokeLinecap="round" />
      <line x1="45" y1="28" x2="37" y2="36" stroke="#1e293b" strokeWidth="3" strokeLinecap="round" />
      <rect x="20" y="43" width="24" height="10" rx="3" fill="#1e293b" />
      <rect x="22" y="43" width="5" height="6" rx="1" fill="white" />
      <rect x="29" y="43" width="5" height="6" rx="1" fill="white" />
      <rect x="36" y="43" width="5" height="6" rx="1" fill="white" />
      <rect x="8" y="28" width="4" height="8" rx="1" fill="#64748b" />
      <rect x="52" y="28" width="4" height="8" rx="1" fill="#64748b" />
    </g>
  );
}
