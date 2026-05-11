// renderer/src/components/avatars/hats/WizardHat.tsx
export function WizardHat() {
  return (
    <g>
      <ellipse cx="32" cy="34" rx="26" ry="5" fill="#4C1D95" />
      <path d="M32,2 L14,34 L50,34 Z" fill="#5B21B6" />
      <text x="24" y="24" fontSize="7" fill="#FCD34D">★</text>
      <text x="33" y="16" fontSize="5" fill="#FCD34D">★</text>
      <text x="37" y="28" fontSize="6" fill="#A78BFA">✦</text>
      <rect x="14" y="30" width="36" height="5" rx="2" fill="#3B0764" />
      <circle cx="32" cy="32.5" r="3" fill="#FCD34D" />
    </g>
  );
}
