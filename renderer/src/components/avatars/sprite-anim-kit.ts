// Helpers for building sprite animations.
//
// A SpriteAnimation is a list of frames (each a full 32x32 grid, optionally
// nudged by a pixel offset so a face can hop or sway with its hat) and a
// timeline that loops forever.

import { Canvas, N, type Grid } from "./sprite-kit";

export const INK = "#0f172a";
export const WHITE = "#ffffff";
export const PINK = "#f472b6";

export interface SpriteAnimation {
  frames: Grid[];
  /** Human-readable frame names, used by the debug page. */
  labels: string[];
  /** Per-frame [dx, dy] in sprite pixels, applied to the face and its hat. */
  offsets: [number, number][];
  timeline: [frame: number, ms: number][];
  total: number;
  /** Optional overlay per frame, drawn above the face and hat (fireworks, streamers...). */
  effects?: Grid[];
}

/** [label, edit, optional pixel offset]. Edits run on a copy of the base grid. */
export type Edit = [label: string, edit: (c: Canvas) => void, offset?: [number, number]];
/** Timeline written with frame labels: ["base", 1200], ["blink", 110], ... */
export type Script = [label: string, ms: number][];

export const clone = (g: Grid) => {
  const c = new Canvas();
  g.forEach((row, y) => row.forEach((v, x) => (c.g[y][x] = v)));
  return c;
};

export const derive = (g: Grid, edit: (c: Canvas) => void): Grid => {
  const c = clone(g);
  edit(c);
  return c.g;
};

export interface FrameDef {
  label: string;
  grid: Grid;
  offset?: [number, number];
}

export function build(frames: FrameDef[], script: Script): SpriteAnimation {
  const index = new Map(frames.map((f, i) => [f.label, i]));
  const timeline = script.map(([label, ms]) => {
    const i = index.get(label);
    if (i === undefined) throw new Error(`Unknown sprite frame "${label}"`);
    return [i, ms] as [number, number];
  });
  return {
    frames: frames.map((f) => f.grid),
    labels: frames.map((f) => f.label),
    offsets: frames.map((f) => f.offset ?? [0, 0]),
    timeline,
    total: timeline.reduce((t, [, ms]) => t + ms, 0),
  };
}

/** Base grid is frame "base"; each edit adds a frame derived from it. */
export function make(base: Grid, edits: Edit[], script: Script): SpriteAnimation {
  return build(
    [{ label: "base", grid: base }, ...edits.map(([label, fn, offset]) => ({ label, grid: derive(base, fn), offset }))],
    script,
  );
}

/** Repeat a script `n` times. */
export const repeat = (n: number, script: Script): Script => Array.from({ length: n }, () => script).flat();

/** Rect drawn on the left and mirrored to the right. */
export const s = (c: Canvas, x: number, y: number, w: number, h: number, col: string) =>
  c.rect(x, y, w, h, col).rect(N - x - w, y, w, h, col);

/** Replace any of `from` inside the box with `to` (used to wipe a mouth or eye before redrawing). */
export function recolor(c: Canvas, x0: number, y0: number, x1: number, y1: number, from: string[], to: string) {
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const v = c.g[y][x];
      if (v && from.includes(v)) c.g[y][x] = to;
    }
  }
}

function eyeArc(c: Canvas, x: number, y: number, w: number, h: number, skin: string, mirrorToo: boolean) {
  const draw = (rx: number) => {
    c.rect(rx, y, w, h, skin);
    c.px(rx, y + h - 3, INK).px(rx + w - 1, y + h - 3, INK).rect(rx + 1, y + h - 2, w - 2, 1, INK);
  };
  draw(x);
  if (mirrorToo) draw(N - x - w);
}

/** Both eyes replaced by closed, smiling arcs. */
export const closeEye = (c: Canvas, x: number, y: number, w: number, h: number, skin: string) =>
  eyeArc(c, x, y, w, h, skin, true);

/** Only the left eye (a wink). */
export const winkEye = (c: Canvas, x: number, y: number, w: number, h: number, skin: string) =>
  eyeArc(c, x, y, w, h, skin, false);

/** Shift everything in a box by (dx, dy), clipped to the box. Pixels equal to `bg` stay put. */
export function shiftBox(c: Canvas, x0: number, y0: number, x1: number, y1: number, dx: number, dy: number, bg: string | null) {
  const keep: [number, number, string | null][] = [];
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const v = c.g[y][x];
      if (v !== bg) keep.push([x, y, v]);
      c.g[y][x] = bg;
    }
  }
  for (const [x, y, v] of keep) {
    const nx = x + dx;
    const ny = y + dy;
    if (nx >= x0 && nx <= x1 && ny >= y0 && ny <= y1) c.g[ny][nx] = v;
  }
}

/** Same shift on a box and its mirror image (both eyes at once). */
export function shiftBoxBoth(c: Canvas, x0: number, y0: number, x1: number, y1: number, dx: number, dy: number, bg: string | null) {
  shiftBox(c, x0, y0, x1, y1, dx, dy, bg);
  shiftBox(c, N - 1 - x1, y0, N - 1 - x0, y1, -dx, dy, bg);
}

/** Move both pupils the same way: left eye by (dx, dy) and right eye by (dx, dy). */
export function lookEyes(c: Canvas, x: number, y: number, w: number, h: number, dx: number, dy: number, skin: string) {
  const x0 = x - 1;
  const x1 = x + w;
  const y0 = y - 1;
  const y1 = y + h;
  shiftBox(c, x0, y0, x1, y1, dx, dy, skin);
  shiftBox(c, N - 1 - x1, y0, N - 1 - x0, y1, dx, dy, skin);
}

export function shiftRows(c: Canvas, fromY: number, dx: number) {
  for (let y = fromY; y < N; y++) {
    const row = [...c.g[y]];
    for (let x = 0; x < N; x++) c.g[y][x] = row[(x - dx + N) % N];
  }
}

export const note = (c: Canvas, x: number, y: number) => {
  const col = "#e9d5ff";
  c.rect(x, y + 4, 3, 2, col).rect(x + 2, y, 1, 5, col).rect(x + 3, y, 2, 1, col);
};

/** A pixel "Z" of the given size at (x, y). */
export function zed(c: Canvas, x: number, y: number, size: number, col = "#e9d5ff") {
  c.rect(x, y, size, 1, col).rect(x, y + size - 1, size, 1, col);
  for (let i = 1; i < size - 1; i++) c.px(x + size - 1 - i, y + i, col);
}
