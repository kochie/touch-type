// A tiny pixel-art drawing kit for the 32x32 avatar sprites.
//
// A Canvas is a grid of hex colours (null = transparent). Shapes are described
// by a "shape test" (x, y) => boolean and filled with an automatic light/dark
// rim so every sprite gets the same lighting without hand-shading pixels.

export const N = 32;
export type Grid = (string | null)[][];
export type Shape = (x: number, y: number) => boolean;

export class Canvas {
  readonly g: Grid = Array.from({ length: N }, () => Array.from({ length: N }, () => null));

  px(x: number, y: number, c: string | null) {
    x = Math.round(x);
    y = Math.round(y);
    if (x >= 0 && x < N && y >= 0 && y < N) this.g[y][x] = c;
    return this;
  }

  rect(x: number, y: number, w: number, h: number, c: string) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.px(x + i, y + j, c);
    return this;
  }

  /** Fill every pixel inside `shape`. With light/dark, rims facing the light/away get those tones. */
  fill(shape: Shape, base: string, light?: string, dark?: string, d = 2) {
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        if (!shape(x, y)) continue;
        let c = base;
        if (dark && !shape(x + d, y + d)) c = dark;
        else if (light && !shape(x - d, y - d)) c = light;
        this.g[y][x] = c;
      }
    }
    return this;
  }

  /** Straight line, `thick` pixels wide (drawn as a square brush). */
  line(x0: number, y0: number, x1: number, y1: number, c: string, thick = 1) {
    const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    for (let s = 0; s <= steps; s++) {
      const x = x0 + ((x1 - x0) * s) / steps;
      const y = y0 + ((y1 - y0) * s) / steps;
      const off = Math.floor(thick / 2);
      this.rect(Math.round(x) - off, Math.round(y) - off, thick, thick, c);
    }
    return this;
  }

  /** Paint a 1px outline around everything currently drawn. */
  outline(c: string) {
    const hits: [number, number][] = [];
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        if (this.g[y][x]) continue;
        const near = [
          [x - 1, y],
          [x + 1, y],
          [x, y - 1],
          [x, y + 1],
        ].some(([i, j]) => i >= 0 && i < N && j >= 0 && j < N && this.g[j][i]);
        if (near) hits.push([x, y]);
      }
    }
    for (const [x, y] of hits) this.g[y][x] = c;
    return this;
  }

  /** Copy the left half onto the right half, flipped. Draw one side, mirror, done. */
  mirror() {
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N / 2; x++) {
        const c = this.g[y][x];
        if (c) this.g[y][N - 1 - x] = c;
      }
    }
    return this;
  }

  /** Split into a left-only canvas and a mirrored right-only canvas (for parts that animate independently). */
  split(): [Canvas, Canvas] {
    const left = new Canvas();
    const right = new Canvas();
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N / 2; x++) {
        const c = this.g[y][x];
        if (!c) continue;
        left.g[y][x] = c;
        right.g[y][N - 1 - x] = c;
      }
    }
    return [left, right];
  }

  isEmpty(): boolean {
    return this.g.every((row) => row.every((c) => !c));
  }

  /** Paint another canvas over this one. */
  stamp(other: Canvas) {
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        const c = other.g[y][x];
        if (c) this.g[y][x] = c;
      }
    }
    return this;
  }

  /** Remove pixels outside `keep` (used to clip a pattern to the shape under it). */
  clip(keep: Shape) {
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (!keep(x, y)) this.g[y][x] = null;
    return this;
  }
}

export const ell =
  (cx: number, cy: number, rx: number, ry: number): Shape =>
  (x, y) =>
    ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1;

export const box =
  (x0: number, y0: number, x1: number, y1: number): Shape =>
  (x, y) =>
    x >= x0 && x <= x1 && y >= y0 && y <= y1;

/** Even-odd polygon test at pixel centres. */
export const poly =
  (pts: [number, number][]): Shape =>
  (px, py) => {
    const x = px + 0.5;
    const y = py + 0.5;
    let inside = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const [xi, yi] = pts[i];
      const [xj, yj] = pts[j];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  };

export const union =
  (...shapes: Shape[]): Shape =>
  (x, y) =>
    shapes.some((s) => s(x, y));

export const minus =
  (a: Shape, b: Shape): Shape =>
  (x, y) =>
    a(x, y) && !b(x, y);

export const both =
  (a: Shape, b: Shape): Shape =>
  (x, y) =>
    a(x, y) && b(x, y);

/** Flip a shape across the vertical centre line. */
export const flipX =
  (s: Shape): Shape =>
  (x, y) =>
    s(N - 1 - x, y);

export const mirrored = (s: Shape): Shape => union(s, flipX(s));
