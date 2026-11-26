// One-shot victory animations, one per face.
//
// A victory is the face yelling and jumping (reusing mouth/pose frames from its
// idle animation) with an effect layer on top: fireworks, streamers, hearts,
// flame jets... The effect layer is drawn above the hat so nothing is hidden.

import { Canvas, type Grid } from "./sprite-kit";
import { FACE_ANIMATIONS } from "./sprite-frames";
import type { SpriteAnimation } from "./sprite-anim-kit";

type Fx = (c: Canvas, t: number, steps: number) => void;

const STEPS = 16;
const STEP_MS = 120;

const PARTY = ["#f87171", "#fbbf24", "#34d399", "#60a5fa", "#a78bfa", "#f472b6"];

/** Cheap deterministic "random" so every frame agrees. */
const rnd = (seed: number) => {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
};

const spark = (c: Canvas, x: number, y: number, col: string) => {
  c.px(x, y, col).px(x - 1, y, col).px(x + 1, y, col).px(x, y - 1, col).px(x, y + 1, col);
};

/** Firework: bright core, rays that fly out, then fade to dots. */
function burst(c: Canvas, cx: number, cy: number, t: number, len: number, colors: string[], rays = 8) {
  const p = t / len;
  if (p < 0 || p > 1) return;
  if (p < 0.2) {
    c.px(cx, cy, "#ffffff").px(cx, cy - 1, colors[0]);
    return;
  }
  const r = 1 + p * 5;
  for (let k = 0; k < rays; k++) {
    const a = (k / rays) * Math.PI * 2;
    const col = colors[k % colors.length];
    if (p > 0.8) c.px(cx + Math.cos(a) * r, cy + Math.sin(a) * r, col);
    else {
      c.px(cx + Math.cos(a) * r, cy + Math.sin(a) * r, col);
      c.px(cx + Math.cos(a) * (r - 1.6), cy + Math.sin(a) * (r - 1.6), col);
    }
  }
}

/** Rows of confetti drifting down the whole frame. */
function confetti(c: Canvas, t: number, colors: string[], count = 22, speed = 2) {
  for (let i = 0; i < count; i++) {
    const x = Math.floor(rnd(i + 1) * 32);
    const y = (Math.floor(rnd(i + 50) * 32) + t * speed) % 32;
    c.px(x, y, colors[i % colors.length]);
    if (i % 3 === 0) c.px(x + 1, y, colors[i % colors.length]);
  }
}

/** Party-popper streamers: fired up from the top centre, arcing outward and falling, with ribbon trails. */
function streamers(c: Canvas, t: number, colors: string[]) {
  const cycle = t % 8;
  for (let k = 0; k < 8; k++) {
    const dir = k % 2 ? 1 : -1;
    const vx = 1.1 + (k >> 1) * 0.75;
    const vy = 3.2 + (k % 3) * 0.9;
    for (let j = 0; j < 6; j++) {
      const a = cycle - j * 0.45;
      if (a < 0) continue;
      const x = 15.5 + dir * vx * a * 1.6;
      const y = 8 - vy * a * 1.1 + 0.62 * a * a;
      c.px(x, y, colors[(k + j) % colors.length]);
    }
  }
}

/** Radiating "yell" lines beside the mouth. */
function shout(c: Canvas, t: number, col: string) {
  const long = t % 2 === 0;
  for (const side of [0, 1]) {
    const x = (dx: number) => (side ? 31 - dx : dx);
    c.line(x(1), 22, x(long ? 5 : 3), 24, col);
    c.line(x(0), 26, x(long ? 4 : 2), 26, col);
    c.line(x(1), 30, x(long ? 5 : 3), 28, col);
  }
}

const HEART = [
  [0, 1, 0, 1, 0],
  [1, 1, 1, 1, 1],
  [0, 1, 1, 1, 0],
  [0, 0, 1, 0, 0],
];
function hearts(c: Canvas, t: number, colors: string[]) {
  [4, 14, 24].forEach((x0, i) => {
    const y = 28 - ((t * 2 + i * 7) % 26);
    HEART.forEach((row, ry) => row.forEach((on, rx) => on && c.px(x0 + rx, y + ry, colors[i % colors.length])));
  });
}

function stars(c: Canvas, t: number, colors: string[], count = 6) {
  for (let i = 0; i < count; i++) {
    const phase = (t + i * 3) % 6;
    if (phase > 3) continue;
    const x = 2 + Math.floor(rnd(i + 5) * 28);
    const y = 1 + Math.floor(rnd(i + 20) * 12);
    if (phase === 0) c.px(x, y, colors[i % colors.length]);
    else spark(c, x, y, colors[i % colors.length]);
  }
}

/** Lightbulb flashing over the head. */
function bulb(c: Canvas, t: number) {
  const on = t % 4 < 3;
  c.fill((x, y) => (x - 15.5) ** 2 + (y - 3) ** 2 <= 6.5, on ? "#fde047" : "#a16207");
  c.rect(14, 6, 3, 1, "#94a3b8").rect(14, 7, 3, 1, "#64748b");
  if (on) {
    c.px(8, 3, "#fef08a").px(23, 3, "#fef08a").px(10, 0, "#fef08a").px(21, 0, "#fef08a").px(15, 0, "#fef08a");
  }
}

/** Rising ember sparks. */
function embers(c: Canvas, t: number, colors: string[], count = 14) {
  for (let i = 0; i < count; i++) {
    const x = Math.floor(rnd(i + 3) * 32);
    const y = 31 - ((Math.floor(rnd(i + 30) * 32) + t * 2) % 32);
    c.px(x, y, colors[i % colors.length]);
  }
}

function flameJets(c: Canvas, t: number) {
  for (const side of [0, 1]) {
    for (let k = 0; k < 3; k++) {
      const x = side ? 31 - k : k;
      const h = 6 + Math.round(Math.abs(Math.sin(t * 0.9 + k + side)) * 8);
      c.rect(x, 31 - h, 1, h, k === 0 ? "#f97316" : k === 1 ? "#fbbf24" : "#fef08a");
    }
  }
}

function feathers(c: Canvas, t: number) {
  const cols = ["#dc2626", "#f97316", "#fbbf24"];
  for (let i = 0; i < 7; i++) {
    const x = 2 + Math.floor(rnd(i + 9) * 28) + Math.round(Math.sin(t * 0.6 + i) * 2);
    const y = 31 - ((Math.floor(rnd(i + 40) * 30) + t * 2) % 31);
    c.px(x, y, cols[i % 3]).px(x + 1, y - 1, cols[i % 3]).px(x + 1, y, cols[(i + 1) % 3]);
  }
}

function sunburst(c: Canvas, t: number) {
  const len = 3 + (t % 4);
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2 + (t % 2) * 0.13;
    for (let r = 15; r < 15 + len; r++) c.px(15.5 + Math.cos(a) * r, 19.5 + Math.sin(a) * r * 0.9, k % 2 ? "#fbbf24" : "#fef08a");
  }
}

function orbit(c: Canvas, t: number) {
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + t * 0.4;
    spark(c, 15.5 + Math.cos(a) * 14, 19 + Math.sin(a) * 11, i % 2 ? "#e0e7ff" : "#a5b4fc");
  }
}

const both = (...fns: Fx[]): Fx => (c, t, n) => fns.forEach((f) => f(c, t, n));

interface VictorySpec {
  /** Two idle frames to alternate (the "yell"). */
  pair: [string, string];
  fx: Fx;
}

const fireworks = (colors: string[], spots: [number, number, number][] = [[6, 6, 0], [25, 5, 5], [15, 3, 9]]): Fx =>
  (c, t) => {
    for (const [x, y, start] of spots) burst(c, x, y, ((t - start + STEPS) % STEPS), 7, colors, 10);
  };

const SPECS: Record<string, VictorySpec> = {
  classic: { pair: ["laugh", "laughDown"], fx: both((c, t) => streamers(c, t, PARTY), (c, t) => confetti(c, t, PARTY, 14)) },
  cool: { pair: ["hopUp", "hopMid"], fx: both(fireworks(["#60a5fa", "#ffffff", "#93c5fd"]), (c, t) => stars(c, t, ["#ffffff", "#93c5fd"])) },
  fierce: { pair: ["roar", "base"], fx: both((c, t) => shout(c, t, "#fecaca"), fireworks(["#f87171", "#fbbf24"], [[6, 5, 2], [25, 6, 8]])) },
  chill: { pair: ["swayL", "swayR"], fx: both((c, t) => hearts(c, t, ["#f9a8d4", "#fb7185", "#e9d5ff"]), (c, t) => stars(c, t, ["#e9d5ff", "#c4b5fd"], 4)) },
  nerd: { pair: ["glare", "chew"], fx: both((c, t) => bulb(c, t), (c, t) => stars(c, t, ["#fde047", "#ffffff"], 5), (c, t) => confetti(c, t, ["#34d399", "#6ee7b7", "#ffffff"], 10)) },
  robot: { pair: ["barsA", "barsB"], fx: both(fireworks(["#22d3ee", "#ffffff", "#0891b2"]), (c, t) => confetti(c, t, ["#22d3ee", "#94a3b8"], 8)) },
  alien: { pair: ["float2", "float1"], fx: both((c, t) => stars(c, t, ["#bbf7d0", "#86efac", "#ffffff"], 8), (c, t) => orbit(c, t)) },
  zombie: { pair: ["groan", "chomp"], fx: both((c, t) => shout(c, t, "#bef264"), (c, t) => confetti(c, t, ["#86efac", "#bef264", "#a7c4ab"], 16)) },
  ghost: { pair: ["boo", "mouthO"], fx: both((c, t) => orbit(c, t), (c, t) => stars(c, t, ["#ffffff", "#e0e7ff"], 6)) },
  dog: { pair: ["bark", "base"], fx: both((c, t) => shout(c, t, "#fde68a"), (c, t) => confetti(c, t, ["#fde68a", "#92400e", "#ffffff", "#f472b6"], 18)) },
  cat: { pair: ["yawn", "base"], fx: both((c, t) => hearts(c, t, ["#f9a8d4", "#fb7185", "#fdba74"]), (c, t) => confetti(c, t, ["#fdba74", "#f9a8d4"], 10)) },
  goldbot: { pair: ["barsB", "barsC"], fx: both(fireworks(["#fde047", "#ffffff", "#fbbf24"]), (c, t) => confetti(c, t, ["#fde047", "#fbbf24", "#f59e0b"], 22, 3)) },
  ember: { pair: ["laugh", "laughDown"], fx: both((c, t) => embers(c, t, ["#fde047", "#f97316", "#fbbf24"], 16), (c, t) => stars(c, t, ["#fde047"], 4)) },
  torch: { pair: ["laugh", "laughDown"], fx: both(fireworks(["#fbbf24", "#f97316", "#fef08a"]), (c, t) => embers(c, t, ["#fbbf24", "#f97316"], 10)) },
  blaze: { pair: ["roar", "roarShakeL"], fx: both((c, t) => flameJets(c, t), (c, t) => shout(c, t, "#fecaca")) },
  inferno: { pair: ["lava", "lavaMid"], fx: both(fireworks(["#f97316", "#fde047", "#ffffff"], [[5, 6, 0], [26, 5, 4], [15, 2, 8], [9, 11, 11]]), (c, t) => embers(c, t, ["#f97316", "#fde047"], 14)) },
  phoenix: { pair: ["wingUp", "wingDown"], fx: both((c, t) => feathers(c, t), (c, t) => stars(c, t, ["#fef08a", "#f97316"], 5)) },
  sun: { pair: ["laugh", "laughDown"], fx: both((c, t) => sunburst(c, t), (c, t) => confetti(c, t, ["#fde047", "#fbbf24", "#ffffff"], 16)) },
};

function buildVictory(slug: string): SpriteAnimation | undefined {
  const idle = FACE_ANIMATIONS[slug];
  const spec = SPECS[slug];
  if (!idle || !spec) return undefined;
  const pick = (label: string) => Math.max(0, idle.labels.indexOf(label));
  const frames: Grid[] = [];
  const offsets: [number, number][] = [];
  const effects: Grid[] = [];
  const labels: string[] = [];
  for (let t = 0; t < STEPS; t++) {
    const label = spec.pair[t % 2];
    const i = pick(label);
    frames.push(idle.frames[i]);
    const [ox, oy] = idle.offsets[i];
    offsets.push([ox, oy + (t % 2 ? -1 : 0)]);
    const fx = new Canvas();
    spec.fx(fx, t, STEPS);
    effects.push(fx.g);
    labels.push(`${t + 1}: ${label}`);
  }
  const timeline = frames.map((_, i) => [i, STEP_MS] as [number, number]);
  return { frames, labels, offsets, effects, timeline, total: STEPS * STEP_MS };
}

export const VICTORY_ANIMATIONS: Record<string, SpriteAnimation> = Object.fromEntries(
  Object.keys(SPECS).flatMap((slug) => {
    const anim = buildVictory(slug);
    return anim ? [[slug, anim]] : [];
  }),
);
