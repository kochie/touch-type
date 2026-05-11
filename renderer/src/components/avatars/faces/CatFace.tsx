// renderer/src/components/avatars/faces/CatFace.tsx
export function CatFace() {
  return (
    <g>
      <circle cx="32" cy="38" r="20" fill="#F59E0B" />
      {/* Pointed ears */}
      <polygon points="14,24 10,8 24,20" fill="#F59E0B" />
      <polygon points="50,24 54,8 40,20" fill="#F59E0B" />
      <polygon points="16,22 12,10 22,20" fill="#fcd34d" />
      <polygon points="48,22 52,10 42,20" fill="#fcd34d" />
      <ellipse cx="24" cy="35" rx="5" ry="4" fill="#1e293b" />
      <ellipse cx="40" cy="35" rx="5" ry="4" fill="#1e293b" />
      <circle cx="25.5" cy="33.5" r="1.5" fill="white" />
      <circle cx="41.5" cy="33.5" r="1.5" fill="white" />
      <polygon points="32,42 29,46 35,46" fill="#f87171" />
      <line x1="12" y1="42" x2="25" y2="44" stroke="#1e293b" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="12" y1="46" x2="25" y2="46" stroke="#1e293b" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="39" y1="44" x2="52" y2="42" stroke="#1e293b" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="39" y1="46" x2="52" y2="46" stroke="#1e293b" strokeWidth="1.2" strokeLinecap="round" />
    </g>
  );
}
