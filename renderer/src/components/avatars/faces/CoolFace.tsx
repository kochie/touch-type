// renderer/src/components/avatars/faces/CoolFace.tsx
export function CoolFace() {
  return (
    <g>
      <circle cx="32" cy="38" r="22" fill="#60A5FA" />
      <rect x="18" y="32" width="11" height="8" rx="4" fill="#1e293b" />
      <rect x="33" y="32" width="11" height="8" rx="4" fill="#1e293b" />
      <line x1="29" y1="36" x2="33" y2="36" stroke="#1e293b" strokeWidth="2" />
      <path d="M26 45 Q32 48 38 45" stroke="#1e293b" strokeWidth="2.5" strokeLinecap="round" fill="none" />
    </g>
  );
}
