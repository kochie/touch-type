// The maps offered on the Key Map page. To add one: add an entry here and a
// case in the page's renderMap(). `premium` maps show an upgrade card to free
// users; the data behind them is also refused by the database.
export type KeyMapId =
  | "missed"
  | "frequency"
  | "timing"
  | "improvement"
  | "consistency"
  | "fingers"
  | "confusion";

export interface KeyMapInfo {
  id: KeyMapId;
  label: string;
  premium: boolean;
  /** Shown on the upgrade card for premium maps. */
  upsell?: string;
}

export const KEY_MAPS: KeyMapInfo[] = [
  { id: "missed", label: "Missed keys", premium: false },
  { id: "frequency", label: "Keys pressed", premium: false },
  {
    id: "timing",
    label: "Key timing",
    premium: true,
    upsell:
      "See how long each key takes you to reach, so you know exactly which ones are slowing you down.",
  },
  {
    id: "improvement",
    label: "Improvement",
    premium: true,
    upsell:
      "See which keys got faster and which got slower compared with the period before, so you know whether your practice is working.",
  },
  {
    id: "consistency",
    label: "Consistency",
    premium: true,
    upsell:
      "See which keys you hit steadily and which are erratic. A slow but steady key and a jumpy one need different practice.",
  },
  {
    id: "fingers",
    label: "Fingers",
    premium: true,
    upsell:
      "See which finger types each key and how the work is shared between your hands and fingers.",
  },
  {
    id: "confusion",
    label: "Confusions",
    premium: true,
    upsell:
      "See which key you hit when you meant another, so you can fix the exact mix-ups that cost you the most.",
  },
];
