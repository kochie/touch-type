// renderer/src/components/avatars/faces/AlienFace.tsx
export function AlienFace() {
  return (
    <g>
      {/* Wide forehead tapering to narrow chin */}
      <path d="M 6,28 Q 6,10 32,10 Q 58,10 58,28 Q 56,50 32,58 Q 8,50 6,28 Z" fill="#4ADE80" />
      <ellipse cx="22" cy="30" rx="7" ry="5" fill="#1e293b" />
      <ellipse cx="42" cy="30" rx="7" ry="5" fill="#1e293b" />
      <ellipse cx="23.5" cy="28.5" rx="2.5" ry="2" fill="#86efac" />
      <ellipse cx="43.5" cy="28.5" rx="2.5" ry="2" fill="#86efac" />
      <path d="M 27,47 Q 32,52 37,47" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" fill="none" />
      <line x1="32" y1="10" x2="32" y2="4" stroke="#4ADE80" strokeWidth="2.5" />
      <circle cx="32" cy="3" r="3" fill="#86efac" />
    </g>
  );
}
