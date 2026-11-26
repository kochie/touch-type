// Faces earned through day streaks: Ember (7) to Sun (365).
//
// The flame faces are rebuilt per flicker frame (the flame changes shape), so
// each is described once as a function of its flame and then sampled.

import { Canvas, ell, poly, union, type Grid, type Shape } from "./sprite-kit";
import { INK, WHITE, blush, eye, face, smile } from "./sprite-data";
import {
  PINK, build, closeEye, derive, lookEyes, recolor, repeat, shiftBox, winkEye,
  type Edit, type FrameDef, type Script, type SpriteAnimation,
} from "./sprite-anim-kit";

/** A flame growing out of the top of the head (rows 0-9). `h` is its height, `w` its half-width. */
const flameShape = (cx: number, h: number, w: number): Shape =>
  union(
    ell(cx, 9, w, 3),
    ell(cx, 9 - h * 0.35, w * 0.7, h * 0.4),
    poly([[cx - w * 0.5, 9 - h * 0.45], [cx, 9 - h], [cx + w * 0.5, 9 - h * 0.45]]),
  );

type Tongue = [dx: number, h: number, w: number];

function drawFlame(c: Canvas, tongues: Tongue[], outer: string, inner: string, grow: number) {
  for (const [dx, h, w] of tongues) c.fill(flameShape(15.5 + dx, Math.min(9, h + grow), w), outer);
  for (const [dx, h, w] of tongues) c.fill(flameShape(15.5 + dx, Math.max(2, (h + grow) * 0.6), w * 0.55), inner);
}

interface FlameFace {
  base: string;
  light: string;
  dark: string;
  tongues: Tongue[];
  outer: string;
  inner: string;
  front: (c: Canvas) => void;
  center: (c: Canvas) => void;
  /** Eye box [x, y, w, h] on the left side. */
  eyeBox: [number, number, number, number];
  /** Signature moves for this face and where they go in the loop. */
  extras: Edit[];
  signature: Script;
}

function flameFace(spec: FlameFace, grow: number): Grid {
  return face({
    base: spec.base,
    light: spec.light,
    dark: spec.dark,
    behind: (c) => drawFlame(c, spec.tongues, spec.outer, spec.inner, grow),
    front: spec.front,
    center: spec.center,
  });
}

const FLICKER: Script = [["base", 170], ["flickA", 170], ["base", 170], ["flickB", 170]];

/** Mouth wiped and redrawn as a big open laugh. */
const bigMouth = (skin: string) => (c: Canvas) => {
  recolor(c, 9, 22, 22, 28, [INK, WHITE], skin);
  c.rect(10, 23, 12, 4, INK).rect(12, 25, 8, 2, PINK);
};

function flameAnim(spec: FlameFace): { sprite: Grid; anim: SpriteAnimation } {
  const base = flameFace(spec, 0);
  const [ex, ey, ew, eh] = spec.eyeBox;
  const frames: FrameDef[] = [
    { label: "base", grid: base },
    { label: "flickA", grid: flameFace(spec, 1) },
    { label: "flickB", grid: flameFace(spec, -1) },
    { label: "blink", grid: derive(base, (c) => closeEye(c, ex, ey, ew, eh, spec.base)) },
    { label: "wink", grid: derive(base, (c) => winkEye(c, ex, ey, ew, eh, spec.base)) },
    { label: "lookL", grid: derive(base, (c) => lookEyes(c, ex, ey, ew, eh, -1, 0, spec.base)) },
    { label: "lookR", grid: derive(base, (c) => lookEyes(c, ex, ey, ew, eh, 1, 0, spec.base)) },
    { label: "laugh", grid: derive(base, (c) => { closeEye(c, ex, ey, ew, eh, spec.base); bigMouth(spec.base)(c); }), offset: [0, -1] },
    { label: "laughDown", grid: derive(base, (c) => { closeEye(c, ex, ey, ew, eh, spec.base); bigMouth(spec.base)(c); }) },
    { label: "hopMid", grid: flameFace(spec, 1), offset: [0, -1] },
    { label: "hopUp", grid: flameFace(spec, 2), offset: [0, -2] },
    ...spec.extras.map(([label, fn, offset]) => ({ label, grid: derive(base, fn), offset })),
  ];
  const script: Script = [
    ...repeat(3, FLICKER),
    ["blink", 110], ...FLICKER,
    ["lookL", 450], ["base", 150], ["lookR", 450], ...FLICKER,
    ["wink", 300], ...FLICKER,
    ["hopMid", 90], ["hopUp", 130], ["hopMid", 90], ["base", 100], ...FLICKER,
    ...repeat(3, [["laugh", 150], ["laughDown", 150]] as Script), ...FLICKER,
    ...spec.signature, ...FLICKER,
  ];
  return { sprite: base, anim: build(frames, script) };
}

const ember = flameAnim({
  base: "#FB923C", light: "#FDBA74", dark: "#EA580C",
  tongues: [[0, 5, 5]], outer: "#F97316", inner: "#FDE047",
  eyeBox: [8, 16, 4, 5],
  front: (c) => {
    eye(c, 8, 16);
    blush(c);
  },
  center: (c) => smile(c, 9, 22, 23, 3),
  extras: [["spark", (c) => { c.rect(24, 6, 1, 1, "#FDE047").rect(26, 4, 1, 1, "#FDE68A").rect(22, 3, 1, 1, "#FDE047"); }]],
  signature: [["spark", 250], ["base", 200], ["spark", 250]],
});

const torch = flameAnim({
  base: "#F97316", light: "#FDBA74", dark: "#C2410C",
  tongues: [[0, 7, 5], [-6, 4, 3.5], [6, 4, 3.5]], outer: "#FBBF24", inner: "#FEF08A",
  eyeBox: [8, 16, 4, 5],
  front: (c) => {
    eye(c, 8, 16);
    c.line(6, 14, 12, 13, INK, 1);
  },
  center: (c) => smile(c, 10, 21, 23, 2),
  extras: [["browUp", (c) => { recolor(c, 5, 12, 13, 15, [INK], "#F97316"); c.line(6, 13, 12, 11, INK, 1); }]],
  signature: [["browUp", 500], ["base", 200], ["browUp", 500]],
});

const blaze = flameAnim({
  base: "#B91C1C", light: "#EF4444", dark: "#7F1D1D",
  tongues: [[0, 8, 6], [-6, 5, 4], [6, 5, 4]], outer: "#F97316", inner: "#FDE047",
  eyeBox: [8, 16, 4, 4],
  front: (c) => {
    c.rect(8, 16, 4, 4, "#FDE047");
    c.rect(10, 17, 2, 2, INK);
    c.line(6, 14, 12, 16, INK, 2);
  },
  center: (c) => {
    c.rect(10, 24, 12, 4, INK);
    for (const x of [11, 14, 17, 20]) c.rect(x, 24, 2, 1, WHITE);
  },
  extras: [
    ["roar", (c) => {
      recolor(c, 9, 23, 22, 29, [INK, WHITE], "#B91C1C");
      c.rect(9, 23, 14, 6, INK);
      for (const x of [10, 13, 16, 19]) c.rect(x, 23, 2, 2, WHITE);
      c.rect(12, 27, 8, 2, "#7f1d1d");
    }, [0, -1]],
    ["roarShakeL", (c) => c.rect(10, 23, 12, 5, INK), [-1, -1]],
    ["roarShakeR", (c) => c.rect(10, 23, 12, 5, INK), [1, -1]],
  ],
  signature: [["roar", 300], ["roarShakeL", 60], ["roarShakeR", 60], ["roarShakeL", 60], ["roarShakeR", 60], ["roar", 300]],
});

const inferno = flameAnim({
  base: "#334155", light: "#64748B", dark: "#1E293B",
  tongues: [[0, 9, 7], [-7, 6, 4.5], [7, 6, 4.5], [-3.5, 7, 3], [3.5, 7, 3]],
  outer: "#F97316", inner: "#FDE047",
  eyeBox: [8, 16, 4, 4],
  front: (c) => {
    c.rect(8, 16, 4, 4, "#FB923C");
    c.rect(9, 17, 2, 2, "#FDE047");
    c.line(5, 13, 8, 15, "#F97316", 1).line(5, 21, 7, 25, "#F97316", 1);
  },
  center: (c) => {
    c.rect(11, 25, 10, 2, "#F97316");
    c.line(15, 10, 16, 14, "#F97316", 1);
  },
  extras: [
    ["lava", (c) => {
      recolor(c, 3, 10, 28, 30, ["#F97316"], "#FDE047");
      recolor(c, 3, 10, 28, 30, ["#FB923C"], "#FFFFFF");
    }],
    ["lavaMid", (c) => recolor(c, 3, 10, 28, 30, ["#F97316"], "#FBBF24")],
  ],
  signature: [["lavaMid", 220], ["lava", 300], ["lavaMid", 220], ["base", 300], ["lava", 300], ["base", 300]],
});

// Phoenix: crest and wings instead of a flame.
const PHX = { base: "#F59E0B", light: "#FCD34D", dark: "#D97706" };
const phoenixGrid = face({
  ...PHX,
  behind: (c) => {
    c.fill(poly([[3, 14], [0, 18], [1, 27], [7, 24]]), "#DC2626", "#F87171", "#991B1B");
    c.rect(0, 22, 2, 1, "#FBBF24").rect(1, 25, 2, 1, "#FBBF24");
    c.line(14, 9, 10, 3, "#DC2626", 2);
    c.line(14, 8, 12, 1, "#F97316", 2);
    c.line(15, 8, 15, 0, "#FBBF24", 2);
  },
  front: (c) => eye(c, 8, 16),
  center: (c) => {
    c.fill(poly([[13, 21], [19, 21], [15.5, 27]]), "#FDE047");
    c.line(13, 21, 18, 21, INK, 1);
  },
});

const shimmer = (c: Canvas) => {
  const next: Record<string, string> = { "#DC2626": "#F97316", "#F97316": "#FBBF24", "#FBBF24": "#FEF08A" };
  for (let y = 0; y < 11; y++) for (let x = 0; x < 32; x++) {
    const v = c.g[y][x];
    if (v && next[v]) c.g[y][x] = next[v];
  }
};

const phoenixFrames: FrameDef[] = [
  { label: "base", grid: phoenixGrid },
  { label: "blink", grid: derive(phoenixGrid, (c) => closeEye(c, 8, 16, 4, 5, PHX.base)) },
  { label: "shimmer", grid: derive(phoenixGrid, shimmer) },
  { label: "lookL", grid: derive(phoenixGrid, (c) => lookEyes(c, 8, 16, 4, 5, -1, 0, PHX.base)) },
  { label: "lookR", grid: derive(phoenixGrid, (c) => lookEyes(c, 8, 16, 4, 5, 1, 0, PHX.base)) },
  { label: "wingUp", grid: derive(phoenixGrid, (c) => { shiftBox(c, 0, 12, 2, 28, 0, -1, null); shiftBox(c, 29, 12, 31, 28, 0, -1, null); }) },
  { label: "wingDown", grid: derive(phoenixGrid, (c) => { shiftBox(c, 0, 12, 2, 28, 0, 1, null); shiftBox(c, 29, 12, 31, 28, 0, 1, null); }) },
  { label: "hopMid", grid: phoenixGrid, offset: [0, -1] },
  { label: "hopUp", grid: derive(phoenixGrid, shimmer), offset: [0, -3] },
  { label: "spark", grid: derive(phoenixGrid, (c) => { c.rect(24, 5, 1, 1, "#FEF08A").rect(6, 4, 1, 1, "#FEF08A").rect(28, 12, 1, 1, "#FDE047"); }) },
];

const sunRays = (variant: number) =>
  face({
    base: "#FDE047", light: "#FEF9C3", dark: "#EAB308",
    behind: (c) => {
      const rays = variant === 0
        ? [[11, 8, 9, 2], [6, 11, 2, 7], [2, 17, 0, 14], [2, 24, 0, 27]]
        : [[12, 8, 12, 2], [6, 10, 3, 5], [2, 16, 0, 11], [2, 23, 0, 25]];
      for (const [x0, y0, x1, y1] of rays) c.line(x0, y0, x1, y1, "#F59E0B", 2);
    },
    front: (c) => {
      for (const [x, y] of [[7, 20], [8, 19], [9, 18], [10, 18], [11, 19], [12, 20]]) {
        c.px(x, y, INK).px(x, y + 1, INK);
      }
      blush(c);
    },
    center: (c) => smile(c, 9, 22, 23, 3),
  });
const sunGrid = sunRays(0);

const sunFrames: FrameDef[] = [
  { label: "base", grid: sunGrid },
  { label: "rays2", grid: sunRays(1) },
  { label: "bright", grid: derive(sunGrid, (c) => recolor(c, 0, 0, 31, 31, ["#F59E0B"], "#FEF08A")) },
  { label: "wink", grid: derive(sunGrid, (c) => { recolor(c, 6, 17, 13, 22, [INK], "#FDE047"); eye(c, 8, 17, 4, 4); }) },
  { label: "laugh", grid: derive(sunGrid, (c) => { recolor(c, 9, 22, 22, 27, [INK], "#FDE047"); c.rect(10, 23, 12, 4, INK).rect(12, 25, 8, 2, PINK); }), offset: [0, -1] },
  { label: "laughDown", grid: derive(sunGrid, (c) => { recolor(c, 9, 22, 22, 27, [INK], "#FDE047"); c.rect(10, 23, 12, 4, INK).rect(12, 25, 8, 2, PINK); }) },
  { label: "glow", grid: derive(sunGrid, (c) => { recolor(c, 0, 0, 31, 31, ["#F59E0B"], "#FFFFFF"); recolor(c, 4, 22, 27, 25, ["#f9a8d4"], "#fb7185"); }) },
  { label: "bobUp", grid: sunGrid, offset: [0, -1] },
];

export const STREAK_SPRITES: Record<string, Grid> = {
  ember: ember.sprite,
  torch: torch.sprite,
  blaze: blaze.sprite,
  inferno: inferno.sprite,
  phoenix: phoenixGrid,
  sun: sunGrid,
};

export const STREAK_ANIMATIONS: Record<string, SpriteAnimation> = {
  ember: ember.anim,
  torch: torch.anim,
  blaze: blaze.anim,
  inferno: inferno.anim,
  phoenix: build(phoenixFrames, [
    ["base", 1400], ["shimmer", 200], ["base", 200], ["shimmer", 200], ["base", 700],
    ["blink", 110], ["base", 800], ["lookL", 450], ["lookR", 450], ["base", 600],
    ["wingUp", 220], ["wingDown", 220], ["wingUp", 220], ["wingDown", 220], ["base", 700],
    ["hopMid", 90], ["hopUp", 140], ["hopMid", 90], ["spark", 260], ["base", 140], ["spark", 260], ["base", 1000],
  ]),
  sun: build(sunFrames, [
    ["base", 450], ["rays2", 450], ["base", 450], ["rays2", 450], ["base", 450], ["rays2", 450],
    ["bright", 300], ["base", 500], ["wink", 350], ["base", 600],
    ["bobUp", 300], ["base", 300], ["bobUp", 300], ["base", 300],
    ...repeat(3, [["laugh", 150], ["laughDown", 150]] as Script), ["glow", 350], ["bright", 300], ["base", 600],
  ]),
};

