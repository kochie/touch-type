import { KeyboardLayoutNames } from "@/keyboards";

export type Finger =
  | "left pinky" | "left ring" | "left middle" | "left index"
  | "right index" | "right middle" | "right ring" | "right pinky"
  | "thumb";

export type Hand = "left" | "right" | "thumb";

export const handOf = (finger: Finger): Hand =>
  finger === "thumb" ? "thumb" : finger.startsWith("left") ? "left" : "right";

// Same rule as the backend's finger mapping: a column of the letter block is
// one finger on a standard row-staggered keyboard.
const FINGER_BY_COLUMN: Finger[] = [
  "left pinky", "left ring", "left middle", "left index", "left index",
  "right index", "right index", "right middle", "right ring", "right pinky",
];

const LAYOUT_ROWS: Record<string, string[]> = {
  qwerty: ["qwertyuiop", "asdfghjkl;", "zxcvbnm,./"],
  qwertz: ["qwertzuiop", "asdfghjkl;", "yxcvbnm,./"],
  azerty: ["azertyuiop", "qsdfghjklm", "wxcvbn,;:!"],
  dvorak: ["',.pyfgcrl", "aoeuidhtns", ";qjkxbmwvz"],
  colemak: ["qwfpgjluy;", "arstdhneio", "zxcvbkm,./"],
  colemak_dh: ["qwfpbjluy;", "arstgmneio", "xcdvzkh,./"],
};

function layoutFamily(keyboard: KeyboardLayoutNames): string {
  const k = keyboard.toUpperCase();
  if (k.includes("COLEMAK_DH")) return "colemak_dh";
  if (k.includes("COLEMAK")) return "colemak";
  if (k.includes("DVORAK")) return "dvorak";
  if (k.includes("AZERTY")) return "azerty";
  if (k.includes("QWERTZ")) return "qwertz";
  // Every other supported layout has the QWERTY letter block in the same places.
  return "qwerty";
}

/** Lowercase key to the finger that types it. The space bar belongs to the thumbs. */
export function fingerMap(keyboard: KeyboardLayoutNames): Map<string, Finger> {
  const map = new Map<string, Finger>();
  LAYOUT_ROWS[layoutFamily(keyboard)].forEach((row) =>
    [...row].forEach((ch, col) => map.set(ch, FINGER_BY_COLUMN[col])),
  );
  map.set(" ", "thumb");
  return map;
}

/** Left hand in cool colours, right hand in warm ones, thumbs in green. */
export const FINGER_COLORS: Record<Finger, string> = {
  "left pinky": "rgb(99,102,241)",
  "left ring": "rgb(59,130,246)",
  "left middle": "rgb(14,165,233)",
  "left index": "rgb(6,182,212)",
  "right index": "rgb(245,158,11)",
  "right middle": "rgb(249,115,22)",
  "right ring": "rgb(239,68,68)",
  "right pinky": "rgb(236,72,153)",
  thumb: "rgb(16,185,129)",
};

export const FINGER_ORDER: Finger[] = [
  "left pinky", "left ring", "left middle", "left index", "thumb",
  "right index", "right middle", "right ring", "right pinky",
];
