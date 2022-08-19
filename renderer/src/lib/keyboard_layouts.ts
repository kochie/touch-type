// export interface Key {
//   key: string;
//   position?: [CanvasTextBaseline, CanvasTextAlign];
//   text?: string;
//   width?: number;
//   height?: number;
// }

import { makeKey, OFFSETS } from "./canvas_utils";
// import {src} from "../assets/fontawesome-pro-6.1.2-web/svgs/solid/command.svg";

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
    },
    text?: string
  ) {
    this.key = key;
    this.position = opts?.position ?? ["middle", "center"];
    this.text = text ?? key;
    this.width = opts?.width ?? 80;
    this.height = opts?.height ?? 80;
    this.secondaryKey = opts?.secondaryKey;
    this.isInert = opts?.inert ?? false;
    // console.log()
    this.icon = opts?.icon;
    this.font = opts?.font;
  }
}

export class Keyboard {
  rows: (Key | Key[])[][];
  width: number = 80;
  gap: number = 5;

  constructor(rows: (Key | Key[])[][]) {
    this.rows = rows;
  }

  getRowWidth(rowNumber: number) {
    return (
      this.rows[rowNumber].reduce((prev, current) => {
        if (Array.isArray(current))
          return (current[0]?.width ?? this.width) + prev;
        return prev + current.width ?? this.width;
      }, 0) +
      (this.rows[rowNumber].length - 1) * this.gap
    );
  }

  drawKeyboard(ctx: CanvasRenderingContext2D) {
    // console.log("HELLO");
    this.rows.forEach((row, i) =>
      row.forEach((letter, j) => {
        this.drawKey(
          ctx,
          i,
          j,
          letter,
          "rgba(0, 0, 0, 0.5)",
          Array.isArray(letter) ? letter[0].isInert : letter.isInert
        );
      })
    );
  }

  keyExists(k: string): boolean {
    return this.rows.some((rows) =>
      rows.some((key) =>
        Array.isArray(key)
          ? key[0].key === k || key[1].key === k
          : key.key === k
      )
    );
  }

  findIndex(key: string): [number, number, number] {
    for (let i = 0; i < this.rows.length; i++) {
      const row = this.rows[i];
      for (let j = 0; j < row.length; j++) {
        const b = row[j];
        if (Array.isArray(b)) {
          if (b[0].key === key) {
            return [i, j, 0];
          }
          if (b[1].key === key) {
            return [i, j, 1];
          }
        } else if (b.key === key) {
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
          if (b[0].key === key) {
            return this.rows[i][j][0];
          }
          if (b[1].key === key) {
            return this.rows[i][j][1];
          }
        } else if (b.key === key) {
          return this.rows[i][j] as Key;
        }
      }
    }
    throw new Error("Can't find key on keyboard");
  }

  drawKey(
    ctx: CanvasRenderingContext2D,
    i: number,
    j: number,
    letter: Key | Key[],
    color: string,
    isInert: boolean = false
  ) {
    const width = 80;
    const height = 80;
    // const gap = GAP;

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
    // const x = j * (width + gap);
    if (Array.isArray(letter)) {
      makeKey(
        ctx,
        x + offset,
        i * (height + this.gap),
        letter[0].width || width,
        letter[0].height || height,
        letter[0],
        color
      );
      makeKey(
        ctx,
        x + offset,
        i * (height + this.gap) + letter[0].height + this.gap,
        letter[1].width || width,
        letter[1].height || height,
        letter[1],
        color
      );
    } else {
      makeKey(
        ctx,
        x + offset,
        i * (height + this.gap),
        letter.width || width,
        letter.height || height,
        letter,
        color
      );
    }
  }
}

export const MACOS_US_QWERTY = [
  [
    new Key("`", { secondaryKey: "~" }),
    new Key("1"),
    new Key("2"),
    new Key("3"),
    new Key("4"),
    new Key("5"),
    new Key("6"),
    new Key("7"),
    new Key("8"),
    new Key("9"),
    new Key("0"),
    new Key("-"),
    new Key("="),
    new Key(
      "Backspace",
      { position: ["bottom", "right"], width: 120, inert: true },
      "delete"
    ),
  ],
  [
    new Key(
      "Tab",
      { position: ["bottom", "left"], width: 120, inert: true },
      "tab"
    ),
    new Key("q", {}, "Q"),
    new Key("w", {}, "W"),
    new Key("e", {}, "E"),
    new Key("r", {}, "R"),
    new Key("t", {}, "T"),
    new Key("y", {}, "Y"),
    new Key("u", {}, "U"),
    new Key("i", {}, "I"),
    new Key("o", {}, "O"),
    new Key("p", {}, "P"),
    new Key("["),
    new Key("]"),
    new Key("\\"),
  ],
  [
    new Key(
      "Caps Lock",
      {
        position: ["bottom", "left"],
        width: 142.5,
        inert: true,
      },
      "caps lock"
    ),
    new Key("a", {}, "A"),
    new Key("s", {}, "S"),
    new Key("d", {}, "D"),
    new Key("f", {}, "F"),
    new Key("g", {}, "G"),
    new Key("h", {}, "H"),
    new Key("j", {}, "J"),
    new Key("k", {}, "K"),
    new Key("l", {}, "L"),
    new Key(";"),
    new Key("'"),
    new Key(
      "Enter",
      { position: ["bottom", "right"], width: 142.5, inert: true },
      "return"
    ),
  ],
  [
    new Key(
      "Shift",
      { position: ["bottom", "left"], width: 185, inert: true },
      "shift"
    ),
    new Key("z", {}, "Z"),
    new Key("x", {}, "X"),
    new Key("c", {}, "C"),
    new Key("v", {}, "V"),
    new Key("b", {}, "B"),
    new Key("n", {}, "N"),
    new Key("m", {}, "M"),
    new Key(","),
    new Key("."),
    new Key("/"),
    new Key(
      "Shift",
      { position: ["bottom", "right"], width: 185, inert: true },
      "shift"
    ),
  ],
  [
    new Key("fn", { position: ["bottom", "left"], inert: true }, "fn"),
    new Key(
      "Control",
      { position: ["bottom", "center"], inert: true, icon: "\uf106" },
      "control"
    ),
    new Key(
      "Alt",
      { position: ["bottom", "center"], inert: true, icon: "\ue318" },
      "option"
    ),
    new Key(
      "Meta",
      {
        position: ["bottom", "center"],
        width: 100,
        inert: true,
        icon: "\ue142",
      },
      "command"
    ),
    new Key(" ", { width: 420 }),
    new Key(
      "Meta",
      {
        position: ["bottom", "center"],
        width: 100,
        inert: true,
        icon: "\ue142",
      },
      "command"
    ),
    new Key(
      "Alt",
      { position: ["bottom", "center"], inert: true, icon: "\ue318" },
      "option"
    ),
    new Key(
      "ArrowLeft",
      {
        position: ["middle", "center"],
        inert: true,
        font: "bold 20px FontAwesome",
      },
      "\uf0d9"
    ),
    [
      new Key(
        "ArrowUp",
        {
          position: ["middle", "center"],
          inert: true,
          height: 37.5,
          font: "bold 20px FontAwesome",
        },
        "\uf0d8"
      ),
      new Key(
        "ArrowDown",
        {
          position: ["middle", "center"],
          height: 37.5,
          inert: true,
          font: "bold 20px FontAwesome",
        },
        "\uf0d7"
      ),
    ],
    new Key(
      "ArrowRight",
      {
        position: ["middle", "center"],
        inert: true,
        font: "bold 20px FontAwesome",
      },
      "\uf0da"
    ),
  ],
];
