import { Key } from "@/keyboards/key";
import { KeyboardLayout } from ".";

export const MACOS_DE_QWERTZ: KeyboardLayout = [
  [
    new Key("^", { secondaryKey: "~" }),
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
    new Key("ß", { secondaryKey: "?" }, "ß"),
    new Key("`", { secondaryKey: "´" }, "`"),
    new Key(
      "Backspace",
      { position: ["bottom", "right"], width: 120, inert: true },
      "delete",
    ),
  ],
  [
    new Key(
      "Tab",
      { position: ["bottom", "left"], width: 120, inert: true },
      "tab",
    ),
    new Key("q", {}, "Q"),
    new Key("w", {}, "W"),
    new Key("e", {}, "E"),
    new Key("r", {}, "R"),
    new Key("t", {}, "T"),
    new Key("z", {}, "Z"),
    new Key("u", {}, "U"),
    new Key("i", {}, "I"),
    new Key("o", {}, "O"),
    new Key("p", {}, "P"),
    new Key("ü", {}, "Ü"),
    new Key("+", { secondaryKey: "*" }),
  ],
  [
    new Key(
      "Caps Lock",
      {
        position: ["bottom", "left"],
        width: 142.5,
        inert: true,
      },
      "caps lock",
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
    new Key("ö", {}, "Ö"),
    new Key("ä", {}, "Ä"),
    new Key("#", { secondaryKey: "'" }, "'"),
    new Key(
      "Enter",
      {
        position: ["top", "center"],
        width: 58,
        inert: true,
        shape: "backwards-l-slim",
      },
      "↵",
    ),
  ],
  [
    new Key(
      "Shift",
      { position: ["bottom", "left"], width: 185, inert: true },
      "shift",
    ),
    new Key("y", {}, "Y"),
    new Key("x", {}, "X"),
    new Key("c", {}, "C"),
    new Key("v", {}, "V"),
    new Key("b", {}, "B"),
    new Key("n", {}, "N"),
    new Key("m", { secondaryKey: "μ" }, "M"),
    new Key(",", { secondaryKey: ";" }, ","),
    new Key(".", { secondaryKey: ":" }, "."),
    new Key("-", { secondaryKey: "_" }, "-"),
    new Key(
      "Shift",
      { position: ["bottom", "right"], width: 185, inert: true },
      "shift",
    ),
  ],
  [
    new Key("fn", { position: ["bottom", "left"], inert: true }, "fn"),
    new Key(
      "Control",
      { position: ["bottom", "center"], inert: true, icon: "\uf106" },
      "control",
    ),
    new Key(
      "Alt",
      { position: ["bottom", "center"], inert: true, icon: "\ue318" },
      "option",
    ),
    new Key(
      "Meta",
      {
        position: ["bottom", "center"],
        width: 100,
        inert: true,
        icon: "\ue142",
      },
      "command",
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
      "command",
    ),
    new Key(
      "Alt",
      { position: ["bottom", "center"], inert: true, icon: "\ue318" },
      "option",
    ),
    new Key(
      "ArrowLeft",
      {
        position: ["middle", "center"],
        inert: true,
        font: "bold 20px FontAwesome",
      },
      "\uf0d9",
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
        "\uf0d8",
      ),
      new Key(
        "ArrowDown",
        {
          position: ["middle", "center"],
          height: 37.5,
          inert: true,
          font: "bold 20px FontAwesome",
        },
        "\uf0d7",
      ),
    ],
    new Key(
      "ArrowRight",
      {
        position: ["middle", "center"],
        inert: true,
        font: "bold 20px FontAwesome",
      },
      "\uf0da",
    ),
  ],
];
