// renderer/src/components/avatars/faces/GhostFace.tsx
export function GhostFace() {
  return (
    <g>
      <path d="M 14,44 Q 14,10 32,10 Q 50,10 50,44 L 50,60 L 44,54 L 38,60 L 32,54 L 26,60 L 20,54 L 14,60 Z" fill="#E2E8F0" />
      <circle cx="24" cy="32" r="4.5" fill="#1e293b" />
      <circle cx="40" cy="32" r="4.5" fill="#1e293b" />
      <circle cx="25.5" cy="30.5" r="1.5" fill="white" />
      <circle cx="41.5" cy="30.5" r="1.5" fill="white" />
      <circle cx="32" cy="42" r="3.5" fill="#1e293b" />
    </g>
  );
}
