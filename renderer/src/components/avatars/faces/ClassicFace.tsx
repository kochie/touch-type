// renderer/src/components/avatars/faces/ClassicFace.tsx
export function ClassicFace() {
  return (
    <g>
      <circle cx="32" cy="38" r="22" fill="#FBBF24" />
      <circle cx="24" cy="36" r="4" fill="#1e293b" />
      <circle cx="40" cy="36" r="4" fill="#1e293b" />
      <circle cx="25.5" cy="34.5" r="1.5" fill="white" />
      <circle cx="41.5" cy="34.5" r="1.5" fill="white" />
      <path d="M25 44 Q32 49 39 44" stroke="#1e293b" strokeWidth="2.5" strokeLinecap="round" fill="none" />
    </g>
  );
}
