// Frame-by-frame animation for every face.
//
// Each face keeps its still sprite as frame "base" and adds edited copies
// (closed eyes, open mouth, looking left...) plus a script that strings them
// into a long, varied loop. Frames can also carry a pixel offset so the whole
// head (and its hat) hops, nods or sways.

import { ell, flipX, poly } from "./sprite-kit";
import { FACE_SPRITES } from "./sprite-data";
import { STREAK_ANIMATIONS } from "./sprite-streak";
import {
  INK, WHITE, PINK, make, repeat, s, recolor, closeEye, winkEye, lookEyes, shiftBox, shiftBoxBoth, shiftRows, note, zed,
  type Edit, type Script, type SpriteAnimation,
} from "./sprite-anim-kit";
import type { Canvas } from "./sprite-kit";

export type { SpriteAnimation };

// Shared "no-art" frames: the same sprite, just moved.
const hop: Edit[] = [
  ["hopMid", () => {}, [0, -1]],
  ["hopUp", () => {}, [0, -2]],
];
const hopScript: Script = [["hopMid", 90], ["hopUp", 130], ["hopMid", 90], ["base", 120]];
const nod: Edit[] = [["nodDown", () => {}, [0, 1]]];
const nodScript: Script = [["nodDown", 170], ["base", 170], ["nodDown", 170]];
const shake: Edit[] = [["shakeL", () => {}, [-1, 0]], ["shakeR", () => {}, [1, 0]]];
const shakeScript: Script = repeat(4, [["shakeL", 50], ["shakeR", 50]]);
const swayEdits: Edit[] = [["swayL", () => {}, [-1, 0]], ["swayR", () => {}, [1, 0]]];

/** Round, two-eyed faces that can look around, wink and laugh. */
function eyed(slug: string, skin: string, eye: [number, number, number, number], extra: Edit[], script: Script, mouth: (c: Canvas) => void) {
  const [x, y, w, h] = eye;
  const edits: Edit[] = [
    ["blink", (c) => closeEye(c, x, y, w, h, skin)],
    ["lookL", (c) => lookEyes(c, x, y, w, h, -1, 0, skin)],
    ["lookR", (c) => lookEyes(c, x, y, w, h, 1, 0, skin)],
    ["wink", (c) => winkEye(c, x, y, w, h, skin)],
    ["laugh", (c) => { closeEye(c, x, y, w, h, skin); mouth(c); }, [0, -1]],
    ["laughDown", (c) => { closeEye(c, x, y, w, h, skin); mouth(c); }],
    ...hop,
    ...extra,
  ];
  return make(FACE_SPRITES[slug], edits, script);
}

const roundMouth = (skin: string) => (c: Canvas) => {
  recolor(c, 9, 22, 22, 27, [INK], skin);
  c.rect(11, 23, 10, 3, INK).rect(13, 25, 6, 1, PINK);
};

function robotAnim(slug: "robot" | "goldbot", c: { base: string; dark: string; light: string; eye: string }): SpriteAnimation {
  const bars = (heights: number[]) => (g: Canvas) => {
    g.rect(10, 25, 12, 3, INK);
    heights.forEach((h, i) => g.rect(11 + i * 2, 28 - h, 1, h, c.light));
  };
  return make(
    FACE_SPRITES[slug],
    [
      ["blink", (g) => { s(g, 7, 16, 6, 5, c.base); s(g, 7, 18, 6, 1, c.eye); }],
      ["antennaDim", (g) => s(g, 14, 1, 2, 3, c.dark)],
      ["barsA", bars([3, 1, 2, 3, 1])],
      ["barsB", bars([1, 3, 3, 1, 2])],
      ["barsC", bars([2, 2, 1, 3, 3])],
      ["scanL", (g) => shiftBoxBoth(g, 6, 15, 13, 21, -1, 0, c.base)],
      ["scanR", (g) => shiftBoxBoth(g, 6, 15, 13, 21, 1, 0, c.base)],
      ["glitch", (g) => {
        shiftBox(g, 4, 15, 27, 16, 1, 0, c.base);
        shiftBox(g, 4, 18, 27, 19, -1, 0, c.base);
        g.rect(5, 21, 22, 1, c.eye);
      }, [1, 0]],
      ...hop,
    ],
    [
      ["base", 900], ["antennaDim", 300], ["base", 400], ["antennaDim", 300],
      ["base", 500], ["scanL", 350], ["scanR", 700], ["base", 400], ["blink", 120],
      ["base", 400], ["barsA", 140], ["barsB", 140], ["barsC", 140], ["barsA", 140], ["barsB", 140], ["barsC", 140], ["base", 500],
      ["glitch", 80], ["base", 60], ["glitch", 80], ["base", 700],
      ["hopMid", 90], ["hopUp", 130], ["hopMid", 90], ["base", 900],
    ],
  );
}

export const FACE_ANIMATIONS: Record<string, SpriteAnimation> = {
  classic: eyed("classic", "#FBBF24", [8, 16, 4, 5], [
    ["grin", roundMouth("#FBBF24")],
    ["surprise", (c) => {
      recolor(c, 9, 22, 22, 27, [INK], "#FBBF24");
      c.fill(ell(15.5, 25, 2.5, 3), INK);
    }],
  ], [
    ["base", 1400], ["lookL", 450], ["base", 150], ["lookR", 450], ["base", 900], ["blink", 110],
    ["base", 700], ["wink", 320], ["base", 600],
    ...hopScript, ["base", 300],
    ...repeat(3, [["laugh", 150], ["laughDown", 150]] as Script), ["base", 500],
    ["surprise", 800], ["blink", 110], ["grin", 700], ["base", 1000],
  ], roundMouth("#FBBF24")),

  cool: make(
    FACE_SPRITES.cool,
    [
      ...[6, 8, 10].map((gx, i): Edit => [`glint${i + 1}`, (c) => {
        s(c, 5, 16, 9, 6, INK);
        s(c, gx, 17, 3, 1, "#94A3B8");
        s(c, gx + 1, 18, 1, 1, "#94A3B8");
      }]),
      ["peek", (c) => {
        recolor(c, 2, 14, 13, 23, [INK, "#475569"], "#60A5FA");
        recolor(c, 18, 14, 29, 23, [INK, "#475569"], "#60A5FA");
        c.rect(7, 16, 4, 3, WHITE).rect(9, 17, 2, 2, INK);
        c.rect(21, 16, 4, 3, WHITE).rect(23, 17, 2, 2, INK);
        s(c, 4, 19, 12, 1, INK);
        s(c, 5, 20, 9, 3, INK);
        c.rect(14, 19, 4, 1, INK);
      }],
      ...nod,
      ...hop,
    ],
    [
      ["base", 2400], ["glint1", 90], ["glint2", 90], ["glint3", 90], ["base", 1800],
      ["peek", 1000], ["base", 500], ...nodScript, ["base", 1400],
      ["glint1", 90], ["glint2", 90], ["glint3", 90], ["base", 1000], ...hopScript, ["base", 1600],
    ],
  ),

  fierce: make(
    FACE_SPRITES.fierce,
    [
      ["squint", (c) => closeEye(c, 8, 19, 4, 4, "#F87171")],
      ["steam1", (c) => s(c, 5, 6, 2, 2, "#e2e8f0")],
      ["steam2", (c) => { s(c, 4, 4, 2, 2, "#e2e8f0"); s(c, 6, 6, 1, 1, "#cbd5e1"); }],
      ["roar", (c) => {
        recolor(c, 9, 26, 22, 30, [INK, WHITE], "#F87171");
        c.rect(10, 26, 12, 4, INK);
        for (const x of [11, 14, 17, 20]) c.rect(x, 26, 2, 2, WHITE);
      }, [0, -1]],
      ...shake,
    ],
    [
      ["base", 1500], ["steam1", 200], ["steam2", 200], ["steam1", 200], ["base", 700],
      ...shakeScript, ["base", 400], ["roar", 800], ["base", 500], ["squint", 110], ["base", 900],
      ["steam2", 200], ["steam1", 200], ["steam2", 200], ["base", 1200],
    ],
  ),

  chill: make(
    FACE_SPRITES.chill,
    [
      ["note1", (c) => note(c, 25, 5)],
      ["note2", (c) => note(c, 26, 3)],
      ["note3", (c) => note(c, 25, 1)],
      ["zzzA", (c) => zed(c, 24, 8, 3)],
      ["zzzB", (c) => { zed(c, 24, 8, 3); zed(c, 26, 3, 4); }],
      ["blushUp", (c) => recolor(c, 4, 22, 27, 25, ["#f9a8d4"], "#fb7185")],
      ...swayEdits,
    ],
    [
      ["base", 900], ["swayL", 700], ["base", 400], ["swayR", 700], ["base", 700],
      ["note1", 380], ["note2", 380], ["note3", 380], ["base", 900],
      ["zzzA", 700], ["zzzB", 800], ["zzzA", 500], ["base", 500],
      ["blushUp", 450], ["base", 450], ["blushUp", 450], ["base", 700],
      ["swayR", 700], ["base", 400], ["swayL", 700], ["base", 900],
    ],
  ),

  nerd: make(
    FACE_SPRITES.nerd,
    [
      ["blink", (c) => { s(c, 8, 17, 4, 4, WHITE); s(c, 7, 19, 6, 1, INK); }],
      ["chew", (c) => {
        recolor(c, 12, 26, 19, 28, [INK, WHITE, "#cbd5e1"], "#34D399");
        c.rect(13, 25, 6, 3, INK).rect(14, 25, 2, 1, WHITE).rect(16, 25, 2, 1, "#cbd5e1");
      }],
      ["glare", (c) => {
        s(c, 6, 15, 7, 7, WHITE);
        c.rect(3, 12, 1, 3, WHITE).rect(2, 13, 3, 1, WHITE);
        c.rect(28, 11, 1, 3, WHITE).rect(27, 12, 3, 1, WHITE);
      }],
      ["lookL", (c) => shiftBoxBoth(c, 6, 15, 12, 21, -1, 0, WHITE)],
      ["lookR", (c) => shiftBoxBoth(c, 6, 15, 12, 21, 1, 0, WHITE)],
      ["lookUp", (c) => shiftBoxBoth(c, 6, 15, 12, 21, 0, -1, WHITE)],
      ...nod,
    ],
    [
      ["base", 1800], ["blink", 110], ["base", 900], ["lookL", 450], ["lookR", 650], ["base", 500],
      ["lookUp", 600], ["glare", 140], ["base", 140], ["glare", 140], ["base", 900],
      ["chew", 300], ["base", 220], ["chew", 300], ["base", 220], ["chew", 300], ["base", 700],
      ...nodScript, ["blink", 110], ["base", 1300],
    ],
  ),

  robot: robotAnim("robot", { base: "#94A3B8", dark: "#64748B", light: "#CBD5E1", eye: "#22D3EE" }),

  alien: make(
    FACE_SPRITES.alien,
    [
      ["blink", (c) => {
        const eye = poly([[4, 15], [14, 18], [13, 23], [8, 24], [5, 20]]);
        c.fill(eye, "#86EFAC").fill(flipX(eye), "#86EFAC");
        c.line(4, 18, 13, 21, INK).line(27, 18, 18, 21, INK);
      }],
      ["bulbL", (c) => c.fill(ell(6.5, 3, 2.5, 2.2), "#FDE68A")],
      ["bulbR", (c) => c.fill(flipX(ell(6.5, 3, 2.5, 2.2)), "#FDE68A")],
      ["bulbBoth", (c) => {
        c.fill(ell(6.5, 3, 2.5, 2.2), "#FFFFFF").fill(flipX(ell(6.5, 3, 2.5, 2.2)), "#FFFFFF");
      }],
      ["float1", () => {}, [0, -1]],
      ["float2", () => {}, [0, -2]],
      ["tiltL", () => {}, [-1, 0]],
      ["tiltR", () => {}, [1, 0]],
    ],
    [
      ["base", 1200], ["bulbL", 300], ["bulbR", 300], ["bulbL", 300], ["bulbR", 300], ["base", 600],
      ["blink", 120], ["base", 600],
      ["float1", 400], ["float2", 800], ["bulbBoth", 250], ["float2", 600], ["float1", 400], ["base", 700],
      ["tiltL", 400], ["base", 300], ["tiltR", 400], ["base", 400], ["blink", 120], ["base", 1100],
    ],
  ),

  zombie: make(
    FACE_SPRITES.zombie,
    [
      ["chomp", (c) => {
        recolor(c, 9, 24, 22, 29, [INK, WHITE], "#86A98B");
        c.rect(9, 27, 14, 2, INK);
        for (const x of [10, 13, 16, 19]) c.rect(x, 27, 2, 1, WHITE);
      }],
      ["groan", (c) => {
        recolor(c, 9, 24, 22, 29, [INK, WHITE], "#86A98B");
        c.rect(10, 25, 12, 5, INK);
        for (const x of [11, 14, 17, 20]) c.rect(x, 25, 2, 2, WHITE);
        c.rect(12, 29, 8, 1, "#7f1d1d");
      }],
      ["popEye", (c) => {
        recolor(c, 6, 15, 13, 22, [INK], "#86A98B");
        c.rect(7, 16, 6, 6, WHITE).rect(9, 17, 3, 4, INK).rect(9, 17, 1, 1, WHITE);
      }],
      ["drool1", (c) => c.rect(18, 29, 2, 2, "#bef264")],
      ["drool2", (c) => c.rect(18, 29, 2, 3, "#bef264").rect(19, 32 - 1, 1, 1, "#d9f99d")],
      ["twitchL", () => {}, [-1, 0]],
      ["twitchR", () => {}, [1, 0]],
      ["lurchL", () => {}, [-1, 1]],
    ],
    [
      ["base", 1100], ["chomp", 220], ["base", 220], ["chomp", 220], ["base", 800],
      ["popEye", 600], ["base", 300],
      ...repeat(3, [["twitchL", 60], ["twitchR", 60]] as Script), ["base", 400],
      ["groan", 800], ["drool1", 400], ["drool2", 500], ["base", 300],
      ["lurchL", 450], ["base", 450], ["chomp", 200], ["base", 900],
    ],
  ),

  ghost: make(
    FACE_SPRITES.ghost,
    [
      ["blink", (c) => closeEye(c, 9, 16, 4, 6, "#F1F5F9")],
      ["hemL", (c) => shiftRows(c, 27, 1), [0, -1]],
      ["hemR", (c) => shiftRows(c, 27, -1), [0, 1]],
      ["mouthO", (c) => {
        recolor(c, 13, 23, 18, 30, [INK], "#F1F5F9");
        c.fill(ell(15.5, 26, 3.2, 3.8), INK);
      }],
      ["boo", (c) => {
        recolor(c, 8, 15, 23, 30, [INK], "#F1F5F9");
        s(c, 8, 15, 5, 7, INK);
        s(c, 9, 16, 2, 2, WHITE);
        c.fill(ell(15.5, 26, 3.8, 4.2), INK);
      }, [0, -2]],
      ["floatUp", () => {}, [0, -1]],
      ["floatDown", () => {}, [0, 1]],
    ],
    [
      ["base", 300], ["hemL", 300], ["hemR", 300], ["hemL", 300], ["hemR", 300], ["floatUp", 400],
      ["blink", 110], ["floatUp", 500], ["base", 400], ["floatDown", 400],
      ["hemL", 300], ["hemR", 300], ["mouthO", 700], ["boo", 800], ["mouthO", 300], ["base", 500],
      ["floatUp", 500], ["hemL", 300], ["hemR", 300], ["base", 400],
    ],
  ),

  dog: make(
    FACE_SPRITES.dog,
    [
      ["blink", (c) => closeEye(c, 9, 15, 4, 5, "#D97706")],
      ["pant", (c) => c.rect(14, 28, 4, 4, PINK).rect(15, 28, 2, 1, "#db2777")],
      ["bark", (c) => {
        recolor(c, 11, 26, 20, 28, [INK], "#FDE68A");
        c.rect(12, 27, 8, 3, INK).rect(14, 28, 4, 2, PINK);
        c.rect(28, 17, 1, 4, WHITE).rect(30, 15, 1, 8, "#cbd5e1");
      }, [0, -1]],
      ["lookL", (c) => lookEyes(c, 9, 15, 4, 5, -1, 0, "#D97706")],
      ["lookR", (c) => lookEyes(c, 9, 15, 4, 5, 1, 0, "#D97706")],
      ["tiltL", () => {}, [-1, 0]],
      ["tiltR", () => {}, [1, 0]],
    ],
    [
      ["base", 1200], ["lookL", 400], ["lookR", 500], ["base", 500], ["blink", 110],
      ["base", 600], ["pant", 220], ["base", 220], ["pant", 220], ["base", 220], ["pant", 220], ["base", 500],
      ["bark", 250], ["base", 120], ["bark", 250], ["base", 800],
      ["tiltL", 500], ["base", 300], ["tiltR", 500], ["base", 300], ["blink", 110], ["base", 1000],
    ],
  ),

  cat: make(
    FACE_SPRITES.cat,
    [
      ["blink", (c) => closeEye(c, 8, 16, 5, 6, "#FB923C")],
      ["lick", (c) => c.rect(15, 27, 2, 3, PINK).rect(15, 29, 2, 1, "#db2777")],
      ["earL", (c) => shiftBox(c, 3, 1, 9, 8, 0, 1, null)],
      ["earR", (c) => shiftBox(c, 22, 1, 28, 8, 0, 1, null)],
      ["yawn", (c) => {
        closeEye(c, 8, 16, 5, 6, "#FB923C");
        recolor(c, 11, 26, 20, 27, [INK], "#FB923C");
        c.rect(12, 26, 8, 4, INK).rect(14, 28, 4, 2, PINK);
      }, [0, -1]],
      ["lookL", (c) => lookEyes(c, 8, 16, 5, 6, -1, 0, "#FB923C")],
      ["lookR", (c) => lookEyes(c, 8, 16, 5, 6, 1, 0, "#FB923C")],
    ],
    [
      ["base", 1400], ["earL", 120], ["base", 160], ["earL", 120], ["base", 900],
      ["lookR", 500], ["lookL", 500], ["base", 600], ["earR", 120], ["base", 900],
      ["blink", 120], ["base", 700], ["lick", 500], ["base", 200], ["lick", 500], ["base", 800],
      ["yawn", 1100], ["base", 400], ["blink", 120], ["base", 1000],
    ],
  ),

  goldbot: robotAnim("goldbot", { base: "#FBBF24", dark: "#B45309", light: "#FEF08A", eye: "#34D399" }),

  ...STREAK_ANIMATIONS,
};

/** Frame to show `elapsed` ms into the timeline (wraps). */
export function frameAt(anim: SpriteAnimation, elapsed: number): number {
  let t = elapsed % anim.total;
  for (const [frame, ms] of anim.timeline) {
    if (t < ms) return frame;
    t -= ms;
  }
  return 0;
}

