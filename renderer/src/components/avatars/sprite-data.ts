// Pixel-art avatar sprites, 32x32, drawn with the shape kit in sprite-kit.ts.
//
// Every face shares one head ellipse (HEAD) so any hat lines up with any face.
// Faces describe only their left half and are mirrored; hats are symmetric by
// construction. Colours are hex strings, so there is no palette indirection.

import { Canvas, box, both, ell, minus, mirrored, poly, union, type Grid, type Shape } from "./sprite-kit";

export const INK = "#0f172a";
export const OUTLINE = "#1e293b";
export const WHITE = "#ffffff";
export const PINK = "#f9a8d4";

export const HEAD = ell(15.5, 19.5, 13.5, 10.5);

/** Rounded rectangle test, used for the robot heads. */
const rbox =
  (x0: number, y0: number, x1: number, y1: number, r: number): Shape =>
  (x, y) => {
    if (x < x0 || x > x1 || y < y0 || y > y1) return false;
    const dx = Math.max(x0 + r - x, 0, x - (x1 - r));
    const dy = Math.max(y0 + r - y, 0, y - (y1 - r));
    return dx * dx + dy * dy <= r * r;
  };

interface FaceSpec {
  shape?: Shape;
  base: string;
  light: string;
  dark: string;
  /** Left-half parts drawn under the head (ears, antennae); mirrored. */
  behind?: (c: Canvas) => void;
  /** Left-half features drawn on the head; mirrored. */
  front?: (c: Canvas) => void;
  /** Centred features (mouth, nose), drawn after mirroring. */
  center?: (c: Canvas) => void;
}

export function face(spec: FaceSpec): Grid {
  const out = new Canvas();
  if (spec.behind) {
    const behind = new Canvas();
    spec.behind(behind);
    out.stamp(behind.mirror());
  }
  out.fill(spec.shape ?? HEAD, spec.base, spec.light, spec.dark);
  out.outline(OUTLINE);
  if (spec.front) {
    const front = new Canvas();
    spec.front(front);
    out.stamp(front.mirror());
  }
  spec.center?.(out);
  return out.g;
}

/** Round-cornered eye with a glint in the top-left. */
export function eye(c: Canvas, x: number, y: number, w = 4, h = 5, ink = INK) {
  c.rect(x, y, w, h, ink);
  c.px(x, y, null).px(x + w - 1, y, null).px(x, y + h - 1, null).px(x + w - 1, y + h - 1, null);
  c.rect(x, y + 1, 2, 2, WHITE);
}

/** Smile: ends at `yEnds`, bottom `depth` lower in the middle. */
export function smile(c: Canvas, x0: number, x1: number, yEnds: number, depth: number, ink = INK) {
  const mid = (x0 + x1) / 2;
  const half = (x1 - x0) / 2;
  for (let x = x0; x <= x1; x++) {
    const y = yEnds + Math.round(depth * (1 - ((x - mid) / half) ** 2));
    c.px(x, y, ink).px(x, y + 1, ink);
  }
}

export const blush = (c: Canvas) => c.rect(5, 23, 3, 2, PINK);

function robot(colors: { base: string; light: string; dark: string; eye: string; ball: string; star?: boolean }): Grid {
  return face({
    shape: rbox(3, 10, 28, 30, 4),
    base: colors.base,
    light: colors.light,
    dark: colors.dark,
    behind: (c) => {
      c.rect(15, 3, 1, 7, colors.dark);
      c.rect(14, 1, 2, 3, colors.ball);
      c.rect(0, 17, 3, 6, colors.dark);
    },
    front: (c) => {
      c.rect(7, 16, 6, 5, colors.eye);
      c.rect(7, 19, 6, 2, "#0891B2");
      c.rect(8, 17, 2, 1, WHITE);
      c.px(5, 27, colors.dark).px(5, 12, colors.dark);
    },
    center: (c) => {
      c.rect(10, 25, 12, 3, INK);
      for (let x = 11; x <= 20; x += 2) c.rect(x, 25, 1, 3, colors.light);
      if (colors.star) {
        c.rect(15, 11, 2, 4, WHITE);
        c.rect(14, 12, 4, 2, WHITE);
      }
    },
  });
}

const alienShape: Shape = (x, y) => {
  const dy = y - 19.5;
  const rx = dy < 0 ? 13.5 : 13.5 * (1 - 0.042 * dy);
  const t = 1 - (dy / 10.5) ** 2;
  return t >= 0 && Math.abs(x - 15.5) <= rx * Math.sqrt(t);
};

const ghostShape: Shape = (x, y) => {
  if (y <= 19.5) return ell(15.5, 19.5, 13.5, 10.5)(x, y);
  if (x < 2 || x > 29) return false;
  const period = 28 / 3;
  const u = ((x - 2) % period) / period - 0.5;
  const bottom = 27 + 3 * Math.sqrt(Math.max(0, 1 - (u * 2) ** 2));
  return y <= bottom;
};

export const FACE_SPRITES: Record<string, Grid> = {
  classic: face({
    base: "#FBBF24",
    light: "#FDE68A",
    dark: "#D99A0B",
    front: (c) => {
      eye(c, 8, 16);
      blush(c);
    },
    center: (c) => smile(c, 9, 22, 23, 3),
  }),

  cool: face({
    base: "#60A5FA",
    light: "#93C5FD",
    dark: "#3B82F6",
    front: (c) => {
      c.rect(4, 15, 12, 2, INK);
      c.rect(5, 16, 9, 6, INK);
      c.rect(6, 17, 3, 1, "#475569");
      c.rect(7, 18, 1, 1, "#475569");
      c.rect(2, 16, 2, 1, INK);
    },
    center: (c) => {
      c.rect(14, 16, 4, 2, INK);
      c.rect(12, 26, 8, 1, INK);
      c.px(20, 25, INK).px(21, 24, INK);
    },
  }),

  fierce: face({
    base: "#F87171",
    light: "#FCA5A5",
    dark: "#DC2626",
    front: (c) => {
      c.line(5, 16, 13, 19, INK, 2);
      eye(c, 8, 19, 4, 4);
    },
    center: (c) => {
      c.rect(11, 27, 10, 1, INK);
      c.px(10, 28, INK).px(9, 29, INK).px(21, 28, INK).px(22, 29, INK);
      c.rect(12, 28, 2, 2, WHITE).rect(18, 28, 2, 2, WHITE);
    },
  }),

  chill: face({
    base: "#A78BFA",
    light: "#C4B5FD",
    dark: "#7C3AED",
    front: (c) => {
      for (const [x, y] of [[7, 20], [8, 19], [9, 18], [10, 18], [11, 19], [12, 20]]) {
        c.px(x, y, INK).px(x, y + 1, INK);
      }
      blush(c);
    },
    center: (c) => smile(c, 11, 20, 24, 2),
  }),

  nerd: face({
    base: "#34D399",
    light: "#6EE7B7",
    dark: "#059669",
    front: (c) => {
      c.rect(5, 14, 9, 9, INK);
      c.rect(6, 15, 7, 7, WHITE);
      c.rect(8, 17, 4, 4, INK);
      c.rect(8, 17, 2, 1, WHITE);
      c.rect(2, 17, 3, 1, INK);
    },
    center: (c) => {
      c.rect(14, 17, 4, 2, INK);
      c.rect(12, 26, 8, 1, INK);
      c.rect(14, 27, 2, 2, WHITE).rect(16, 27, 2, 2, "#cbd5e1");
    },
  }),

  robot: robot({ base: "#94A3B8", light: "#CBD5E1", dark: "#64748B", eye: "#22D3EE", ball: "#22D3EE" }),

  alien: face({
    shape: alienShape,
    base: "#86EFAC",
    light: "#BBF7D0",
    dark: "#4ADE80",
    behind: (c) => {
      c.line(9, 10, 7, 4, "#4ADE80", 2);
      c.fill(ell(6.5, 3, 2.5, 2.2), "#BBF7D0");
    },
    front: (c) => {
      c.fill(poly([[4, 15], [14, 18], [13, 23], [8, 24], [5, 20]]), INK);
      c.rect(8, 19, 2, 2, WHITE);
    },
    center: (c) => c.rect(14, 27, 4, 1, INK),
  }),

  zombie: face({
    base: "#86A98B",
    light: "#A7C4AB",
    dark: "#5F7F64",
    behind: (c) => {
      c.rect(0, 17, 3, 6, "#64748B");
      c.rect(0, 19, 2, 2, "#94A3B8");
    },
    front: (c) => {
      c.line(7, 16, 12, 21, INK, 2);
      c.line(12, 16, 7, 21, INK, 2);
    },
    center: (c) => {
      c.rect(9, 25, 14, 4, INK);
      for (const x of [10, 13, 16, 19]) c.rect(x, 25, 2, 2, WHITE);
      for (const x of [11, 14, 17, 20]) c.rect(x, 27, 2, 2, WHITE);
      c.line(21, 11, 25, 15, "#5F7F64", 1);
      c.px(22, 11, INK).px(24, 13, INK).px(23, 14, INK);
    },
  }),

  ghost: face({
    shape: ghostShape,
    base: "#F1F5F9",
    light: WHITE,
    dark: "#CBD5E1",
    front: (c) => {
      eye(c, 9, 16, 4, 6);
      blush(c);
    },
    center: (c) => c.fill(ell(15.5, 26, 2.2, 2.8), INK),
  }),

  dog: face({
    base: "#D97706",
    light: "#F59E0B",
    dark: "#B45309",
    behind: (c) => c.fill(ell(4, 19, 3.6, 8.5), "#92400E", "#B45309", "#78350F"),
    front: (c) => {
      eye(c, 9, 15);
      c.rect(8, 13, 4, 1, "#92400E");
    },
    center: (c) => {
      c.fill(ell(15.5, 25, 6, 4.5), "#FDE68A", "#FEF3C7", "#FCD34D", 1);
      c.fill(ell(15.5, 22.5, 2.6, 1.8), INK);
      c.rect(15, 24, 2, 3, INK);
      c.rect(12, 27, 3, 1, INK).rect(17, 27, 3, 1, INK);
      c.rect(14, 28, 4, 2, "#f472b6");
    },
  }),

  cat: face({
    base: "#FB923C",
    light: "#FDBA74",
    dark: "#EA580C",
    behind: (c) => {
      c.fill(poly([[4, 14], [5, 2], [15, 10]]), "#FB923C", "#FDBA74", "#EA580C");
      c.fill(poly([[6, 11], [6, 5], [11, 9]]), "#f9a8d4");
    },
    front: (c) => {
      c.rect(8, 16, 5, 6, "#FDE047");
      c.rect(10, 16, 2, 6, INK);
      c.rect(9, 17, 1, 2, WHITE);
      c.line(3, 24, 8, 25, "#C2410C");
      c.line(3, 27, 8, 26, "#C2410C");
      c.rect(11, 10, 2, 3, "#EA580C").rect(8, 11, 2, 3, "#EA580C");
    },
    center: (c) => {
      c.rect(15, 10, 2, 4, "#EA580C");
      c.fill(poly([[14, 22], [18, 22], [16, 25]]), "#f472b6");
      c.rect(15, 25, 2, 2, INK);
      c.rect(12, 27, 3, 1, INK).rect(17, 27, 3, 1, INK);
      c.px(11, 26, INK).px(20, 26, INK);
    },
  }),

  goldbot: robot({
    base: "#FBBF24",
    light: "#FEF08A",
    dark: "#B45309",
    eye: "#34D399",
    ball: "#EF4444",
    star: true,
  }),
};

// ---------------------------------------------------------------------------
// Hats. Head top is y=8, so hats draw on rows 0-16.

function hat(draw: (c: Canvas) => void, outline = OUTLINE, detail?: (c: Canvas) => void): Grid {
  const c = new Canvas();
  draw(c);
  c.outline(outline);
  detail?.(c);
  return c.g;
}

/** Draw `fn` clipped to `shape` (stripes, ribs, bands that must stay inside a hat). */
function within(c: Canvas, shape: Shape, fn: (t: Canvas) => void) {
  const t = new Canvas();
  fn(t);
  c.stamp(t.clip(shape));
}

const upper = (shape: Shape, yMax: number): Shape => both(shape, (_x, y) => y <= yMax);

function crown(c: Canvas, xs: number[], peaks: number[], valleyY: number, gems: string[]) {
  const pts: [number, number][] = [[xs[0] - 0.5, 14]];
  xs.forEach((x, i) => {
    pts.push([x, peaks[i]]);
    if (i < xs.length - 1) pts.push([(x + xs[i + 1]) / 2, valleyY]);
  });
  pts.push([xs[xs.length - 1] + 0.5, 14]);
  c.fill(poly(pts), "#FBBF24", "#FDE68A", "#D97706");
  c.rect(Math.round(xs[0]) - 1, 11, Math.round(xs[xs.length - 1] - xs[0]) + 3, 3, "#D97706");
  gems.forEach((g, i) => {
    const gx = Math.round(xs[0] + ((xs[xs.length - 1] - xs[0]) * i) / (gems.length - 1));
    c.rect(gx - 1, 11, 2, 2, g);
  });
  xs.forEach((x, i) => c.px(x, peaks[i], WHITE));
}

const GLYPHS: Record<string, string[]> = {
  A: ["010", "101", "111", "101", "101"],
  S: ["111", "100", "111", "001", "111"],
  D: ["110", "101", "101", "101", "110"],
};

function keycap(c: Canvas, x: number, w: number, letter: string) {
  c.fill(box(x, 3, x + w - 1, 10), "#E2E8F0", "#F8FAFC", "#94A3B8", 1);
  const glyph = GLYPHS[letter];
  const gx = x + Math.floor((w - 3) / 2);
  glyph.forEach((row, j) => [...row].forEach((v, i) => v === "1" && c.px(gx + i, 4 + j, "#334155")));
}

function viking(c: Canvas, helm: [string, string, string], horn: [string, string, string]) {
  const hornShape = mirrored(poly([[3, 12], [0, 9], [0, 3], [2, 1], [2, 7], [6, 10]]));
  c.fill(hornShape, horn[0], horn[1], horn[2], 1);
  const dome = upper(ell(15.5, 13, 13.5, 9), 13);
  c.fill(dome, helm[0], helm[1], helm[2]);
  c.rect(2, 11, 28, 3, helm[2]);
  for (const x of [5, 10, 21, 26]) c.px(x, 12, "#FBBF24");
  c.fill(box(14, 14, 17, 19), helm[0], helm[1], helm[2], 1);
}

export const HAT_SPRITES: Record<string, Grid> = {
  beanie: hat((c) => {
    const dome = upper(ell(15.5, 13, 13.5, 9.5), 12);
    c.fill(dome, "#3B82F6", "#60A5FA", "#1D4ED8");
    within(c, dome, (t) => {
      for (const x of [6, 10, 14, 17, 21, 25]) t.rect(x, 4, 1, 9, "#2563EB");
    });
    c.fill(box(2, 11, 29, 15), "#2563EB", "#3B82F6", "#1E40AF", 1);
    for (let x = 3; x <= 28; x += 3) c.rect(x, 12, 1, 3, "#1E40AF");
    c.fill(ell(15.5, 3.5, 3.5, 3.5), "#F8FAFC", WHITE, "#CBD5E1", 1);
  }),

  cap: hat((c) => {
    c.fill(upper(ell(15.5, 14, 13.5, 9.5), 14), "#EF4444", "#F87171", "#B91C1C");
    c.rect(15, 5, 2, 8, "#DC2626");
    c.fill(ell(15.5, 5, 1.8, 1.8), "#B91C1C");
    c.rect(2, 13, 28, 2, "#B91C1C");
    c.fill(ell(6, 14.5, 7.5, 2.3), "#B91C1C", "#DC2626", "#7F1D1D", 1);
    c.rect(14, 8, 4, 3, WHITE);
  }),

  headband: hat((c) => {
    c.fill(box(2, 11, 29, 15), "#8B5CF6", "#A78BFA", "#6D28D9", 1);
    c.rect(2, 13, 28, 1, "#DDD6FE");
    c.fill(ell(28.5, 13, 2.8, 3), "#7C3AED");
    c.line(29, 14, 31, 21, "#7C3AED", 2);
    c.line(28, 14, 29, 22, "#6D28D9", 2);
    c.rect(15, 11, 2, 4, WHITE).rect(14, 12, 4, 2, WHITE);
  }),

  cowboy: hat((c) => {
    const crownShape = minus(poly([[8, 4], [23, 4], [25, 12], [6, 12]]), box(14, 4, 17, 6));
    c.fill(crownShape, "#92400E", "#B45309", "#78350F");
    c.rect(7, 8, 18, 3, "#FBBF24");
    c.rect(14, 8, 4, 3, "#FDE68A");
    const brim = union(ell(15.5, 13.5, 15.5, 2.8), ell(2.5, 11, 3, 2.5), ell(28.5, 11, 3, 2.5));
    c.fill(brim, "#A16207", "#CA8A04", "#78350F", 1);
  }),

  laurels: hat(
    (c) => {
      const t = new Canvas();
      for (let i = 0; i < 9; i++) {
        const phi = ((-50 + (i * 115) / 8) * Math.PI) / 180;
        const x = 15.5 - 14.8 * Math.cos(phi);
        const y = 19.5 - 11.8 * Math.sin(phi);
        t.fill(ell(x, y, 2.6, 1.6), i % 2 ? "#16A34A" : "#22C55E", "#4ADE80", "#15803D", 1);
        if (i % 3 === 1) t.px(x - 1, y + 2, "#EF4444");
      }
      c.stamp(t.mirror());
    },
    "#14532D",
  ),

  crown: hat((c) => crown(c, [5, 15.5, 26], [3, 1, 3], 8, ["#EF4444", "#3B82F6", "#EF4444"]), "#92400E"),

  ninja: hat(
    (c) => {
      c.fill(upper(ell(15.5, 13.5, 14, 9.5), 13), "#1F2937", "#374151", "#111827");
      c.fill(box(1, 12, 30, 15), "#111827", "#374151", "#0B1220", 1);
      c.line(28, 14, 31, 22, "#111827", 3);
      c.line(26, 15, 28, 23, "#1F2937", 2);
    },
    "#64748B",
    (c) => {
      c.fill(box(9, 12, 22, 14), "#CBD5E1", WHITE, "#94A3B8", 1);
      c.px(15, 13, "#334155").px(16, 13, "#334155");
    },
  ),

  tophat: hat(
    (c) => {
      c.fill(box(8, 0, 23, 10), "#1F2937", "#374151", "#111827");
      c.rect(8, 7, 16, 3, "#DC2626");
      c.fill(ell(15.5, 12.5, 15.5, 2.8), "#111827", "#374151", "#0B1220", 1);
      c.rect(10, 2, 1, 4, "#4B5563");
    },
    "#64748B",
  ),

  wizard: hat((c) => {
    c.fill(poly([[19, 0], [26, 13], [6, 13]]), "#7C3AED", "#8B5CF6", "#5B21B6");
    c.fill(ell(15.5, 13.5, 16, 3), "#5B21B6", "#7C3AED", "#4C1D95", 1);
    c.rect(9, 9, 14, 2, "#FBBF24");
    for (const [x, y] of [[14, 6], [19, 9], [11, 11]] as const) {
      c.px(x, y, "#FDE047").px(x - 1, y, "#FDE047").px(x + 1, y, "#FDE047").px(x, y - 1, "#FDE047").px(x, y + 1, "#FDE047");
    }
  }),

  viking: hat((c) => viking(c, ["#94A3B8", "#CBD5E1", "#64748B"], ["#F5E6C8", WHITE, "#D6C28F"])),

  halo: hat(
    (c) => c.fill(minus(ell(15.5, 4, 11, 3.6), ell(15.5, 4, 7.5, 1.6)), "#FDE047", "#FEF9C3", "#CA8A04", 1),
    "#CA8A04",
  ),

  samurai: hat((c) => {
    c.fill(mirrored(poly([[6, 10], [2, 1], [9, 5], [13, 9]])), "#FBBF24", "#FDE68A", "#D97706", 1);
    const dome = upper(ell(15.5, 14, 13.5, 8.5), 13);
    c.fill(dome, "#B91C1C", "#EF4444", "#7F1D1D");
    within(c, dome, (t) => {
      for (const x of [8, 12, 19, 23]) t.rect(x, 6, 1, 8, "#7F1D1D");
    });
    c.fill(box(2, 12, 29, 14), "#FBBF24", "#FDE68A", "#D97706", 1);
    c.fill(ell(15.5, 7, 2.4, 2.4), "#FBBF24");
    const flaps = new Canvas();
    flaps.fill(box(0, 14, 4, 24), "#991B1B", "#B91C1C", "#7F1D1D", 1);
    for (const y of [17, 20, 23]) flaps.rect(0, y, 5, 1, "#FBBF24");
    c.stamp(flaps.mirror());
  }),

  // Earned by perfect sessions
  keycap: hat(
    (c) => {
      c.fill(box(3, 11, 28, 14), "#475569", "#64748B", "#334155", 1);
      keycap(c, 4, 7, "A");
      keycap(c, 12, 8, "S");
      keycap(c, 21, 7, "D");
    },
    "#0f172a",
  ),

  goggles: hat((c) => {
    c.fill(upper(ell(15.5, 13, 13.5, 8.5), 12), "#92400E", "#B45309", "#78350F");
    c.rect(2, 10, 28, 3, "#451A03");
    c.rect(14, 11, 4, 2, "#B45309");
    c.fill(mirrored(ell(10, 11.5, 4.7, 4.3)), "#FBBF24", "#FDE68A", "#B45309", 1);
    c.fill(mirrored(ell(10, 11.5, 3.2, 2.9)), "#7DD3FC", "#BAE6FD", "#38BDF8", 1);
    c.px(9, 10, WHITE).px(22, 10, WHITE);
  }),

  scholar: hat(
    (c) => {
      c.fill(ell(15.5, 12, 10, 5), "#111827", "#1F2937", "#0B1220", 1);
      c.fill(poly([[15.5, 2], [31, 8], [15.5, 14], [0, 8]]), "#1F2937", "#4B5563", "#111827");
      c.rect(15, 7, 2, 2, "#FBBF24");
      c.line(16, 8, 27, 10, "#FBBF24", 1);
      c.line(27, 10, 27, 17, "#FBBF24", 1);
      c.rect(26, 16, 3, 5, "#FBBF24");
    },
    "#64748B",
  ),

  beret: hat((c) => {
    c.fill(union(ell(17, 10, 13, 5.8), ell(14, 13, 11, 3)), "#1E40AF", "#3B82F6", "#1E3A8A", 1);
    c.rect(18, 3, 3, 3, "#1E3A8A");
  }),

  alpine: hat((c) => {
    c.fill(poly([[9, 3], [22, 3], [24, 11], [7, 11]]), "#166534", "#22C55E", "#14532D");
    c.rect(8, 8, 16, 2, "#7F1D1D");
    c.fill(ell(15.5, 12.5, 14.5, 3), "#14532D", "#166534", "#052E16", 1);
    c.line(22, 7, 29, 0, "#F8FAFC", 2);
    c.px(29, 0, "#EF4444").px(28, 0, "#EF4444");
  }),

  nordic: hat((c) => viking(c, ["#D97706", "#FBBF24", "#92400E"], ["#E2E8F0", WHITE, "#94A3B8"])),

  pith: hat((c) => {
    const dome = upper(ell(15.5, 12, 13, 10), 12);
    c.fill(dome, "#E7D8B1", "#F5ECD0", "#C9B57F");
    within(c, dome, (t) => t.rect(0, 8, 32, 2, "#92400E"));
    c.fill(ell(15.5, 13.5, 16, 3), "#D6C28F", "#EADFB5", "#B09F6A", 1);
    c.rect(15, 4, 2, 1, "#B09F6A");
  }),

  grandmaster: hat(
    (c) =>
      crown(c, [4.5, 10, 15.5, 21, 26.5], [4, 2, 0, 2, 4], 9, ["#EF4444", "#F97316", "#FACC15", "#22C55E", "#3B82F6", "#A855F7"]),
    "#92400E",
  ),
};
