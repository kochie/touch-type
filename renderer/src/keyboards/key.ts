import { makeKey, OFFSETS } from "../lib/canvas_utils";

export type Shape = "ansi" | "iso" | "backwards-l-slim" | "backwards-l-wide";

export class Key {
  key: string;
  position: [CanvasTextBaseline, CanvasTextAlign];
  text: string;
  width: number;
  height: number;
  secondaryKey?: string;
  isInert: boolean;
  icon?: string;
  font?: string;
  shape?: Shape;

  constructor(
    key: string,
    opts?: {
      width?: number;
      height?: number;
      position?: [CanvasTextBaseline, CanvasTextAlign];
      secondaryKey?: string;
      inert?: boolean;
      icon?: string;
      font?: string;
      shape?: Shape;
    },
    text?: string,
  ) {
    this.key = key;
    this.position = opts?.position ?? ["middle", "center"];
    this.text = text ?? key;
    this.width = opts?.width ?? 80;
    this.height = opts?.height ?? 80;
    this.secondaryKey = opts?.secondaryKey;
    this.isInert = opts?.inert ?? false;
    this.icon = opts?.icon;
    this.font = opts?.font;
    this.shape = opts?.shape;
  }
}

export class Keyboard {
  rows: (Key | Key[])[][];
  width: number = 80;
  gap: number = 5;
  scale: number = 1;

  constructor(rows: (Key | Key[])[][], scale: number = 1) {
    this.rows = rows;
    this.scale = scale;
    this.gap = this.gap * this.scale;
  }

  getRowWidth(rowNumber: number) {
    return (
      this.rows[rowNumber].reduce((prev, current) => {
        if (Array.isArray(current))
          return (current[0]?.width ?? this.width) + prev;
        return prev + current.width;
      }, 0) +
      (this.rows[rowNumber].length - 1) * this.gap
    );
  }

  drawKeyboard(ctx: CanvasRenderingContext2D, hideSecondary: boolean = false) {
    this.rows.forEach((row, i) =>
      row.forEach((letter, j) => {
        this.drawKey(
          ctx,
          i,
          j,
          letter,
          "rgba(0, 0, 0, 0.5)",
          Array.isArray(letter) ? letter[0].isInert : letter.isInert,
          hideSecondary,
        );
      }),
    );
  }

  keyExists(k: string): boolean {
    return this.rows.some((rows) =>
      rows.some((key) =>
        Array.isArray(key)
          ? key[0].key === k || key[1].key === k || key[0].secondaryKey === k || key[1].secondaryKey === k
          : key.key === k || key.secondaryKey === k,
      ),
    );
  }

  findIndex(key: string): [number, number, number] {
    for (let i = 0; i < this.rows.length; i++) {
      const row = this.rows[i];
      for (let j = 0; j < row.length; j++) {
        const b = row[j];
        if (Array.isArray(b)) {
          if (b[0].key === key || b[0].secondaryKey === key) {
            return [i, j, 0];
          }
          if (b[1].key === key || b[1].secondaryKey === key) {
            return [i, j, 1];
          }
        } else if (b.key === key || b.secondaryKey === key) {
          return [i, j, 0];
        }
      }
    }
    return [0, 0, 0];
  }

  findKey(key: string): Key {
    for (let i = 0; i < this.rows.length; i++) {
      const row = this.rows[i];
      for (let j = 0; j < row.length; j++) {
        const b = row[j];
        if (Array.isArray(b)) {
          if (b[0].key === key || b[0].secondaryKey === key) {
            return this.rows[i][j][0];
          }
          if (b[1].key === key || b[1].secondaryKey === key) {
            return this.rows[i][j][1];
          }
        } else if (b.key === key || b.secondaryKey === key) {
          return this.rows[i][j] as Key;
        }
      }
    }
    throw new Error(`Can't find key on keyboard - ${key}`);
  }

  drawKey(
    ctx: CanvasRenderingContext2D,
    i: number,
    j: number,
    letter: Key | Key[],
    color: string,
    isInert: boolean = false,
    hideSecondary: boolean = false,
  ) {
    const width = 80
    const height = 80

    const keyboardLength = this.getRowWidth(0);
    const offset = (window.innerWidth - keyboardLength) / 2 + OFFSETS[i];

    let x = 0;
    for (let q = 0; q < j; q++) {
      const k = this.rows[i][q];
      if (Array.isArray(k)) x += k[0]?.width ?? width;
      else if (typeof k === "object") x += k?.width ?? width;
      else x += width;
      x += this.gap;
    }
    if (Array.isArray(letter)) {
      makeKey(
        ctx,
        (x + offset) * this.scale,
        (i * (height + this.gap)) * this.scale,
        (letter[0].width || width) * this.scale,
        (letter[0].height || height) * this.scale,
        letter[0],
        color,
        this.scale,
        hideSecondary,
      );
      makeKey(
        ctx,
        (x + offset) * this.scale,
        (i * (height + this.gap) + letter[0].height + this.gap) * this.scale,
        (letter[1].width || width) * this.scale,
        (letter[1].height || height) * this.scale,
        letter[1],
        color,
        this.scale,
        hideSecondary,
      );
    } else {
      makeKey(
        ctx,
        (x + offset) * this.scale,
        (i * (height + this.gap)) * this.scale,
        (letter.width || width) * this.scale,
        (letter.height || height) * this.scale,
        letter,
        color,
        this.scale,
        hideSecondary,
      );
    }
  }
}
