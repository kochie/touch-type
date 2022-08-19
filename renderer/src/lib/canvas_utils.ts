// export const KEYS = [
//   ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-", "="],
//   ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "[", "]"],
//   ["A", "S", "D", "F", "G", "H", "J", "K", "L", ";", "'"],
//   ["Z", "X", "C", "V", "B", "N", "M", ",", ".", "/"],
//   ["cmd", { key: " ", width: 420 }, "cmd", "opt"],
// ];

import { Key, Keyboard, MACOS_US_QWERTY } from "./keyboard_layouts";

export const KEYS = new Keyboard(MACOS_US_QWERTY);
export const OFFSETS = [0, 0, 0, 0, 0];
// const SPACE = " ";

export function makeKey(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  letter: Key,
  fillColor: string
) {
  const textColor = letter.isInert ? "gray" : "white";

  const X = x;
  const Y = y + 20;

  const padding = 15;

  const fontSize = letter.text.length > 1 ? 15 : 20;

  ctx.save();
  ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
  ctx.clearRect(X, Y, width, height);
  ctx.fillStyle = fillColor;
  roundRect(ctx, X, Y, width, height, 12.5, true, true);
  ctx.fillStyle = textColor;
  letter.font
    ? (ctx.font = letter.font)
    : (ctx.font = `${fontSize}px 'Roboto Mono'`);
  const textWidth = ctx.measureText(letter.text).width;
  let tY = 0;
  let tX = 0;

  let sX = 0;
  let sY = 0;

  if (letter.secondaryKey) letter.position[0] = "bottom";
  // ctx.textBaseline = position[0];
  switch (letter.position[0]) {
    case "top":
      tY = Y + padding;
      break;
    case "bottom":
      // ctx.textBaseline = position[0];
      // ctx.save();
      tY = Y + height - padding;
      sY = Y + padding;
      break;
    case "middle":
    default:
      // ctx.textBaseline = position[0];
      tY = Y + height / 2 + 2;
      break;
  }

  switch (letter.position[1]) {
    case "left":
      tX = X + textWidth * 0.5 + padding;
      break;
    case "right":
      tX = X + width - textWidth * 0.5 - padding;
      break;
    case "center":
    default:
      // ctx.textAlign = position[1];
      tX = X + width / 2;
      sX = X + width / 2;
      break;
  }

  // console.log(tX, tY);

  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  if (letter.secondaryKey) {
    ctx.fillText(letter.secondaryKey, sX, sY);
    // ctx.restore();
  }
  if (letter.icon) {
    ctx.save();
    ctx.font = `20px FontAwesome`;
    const w = ctx.measureText(letter.icon).width;
    ctx.textAlign = "end";
    ctx.textBaseline = "top";

    // console.log(icon);
    ctx.fillText(letter.icon, X + width - padding, Y + padding / 2);
    ctx.restore();
  }
  // font && ctx.font = font;
  ctx.fillText(`${letter.text}`, tX, tY);
  ctx.restore();
  // ctx.fillText(letter, x + width / 2, y + height);
}

export function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  r = 5,
  fill = false,
  stroke = true
) {
  const radius = { tl: r, tr: r, br: r, bl: r };

  ctx.beginPath();
  ctx.moveTo(x + radius.tl, y);
  ctx.lineTo(x + width - radius.tr, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius.tr);
  ctx.lineTo(x + width, y + height - radius.br);
  ctx.quadraticCurveTo(
    x + width,
    y + height,
    x + width - radius.br,
    y + height
  );
  ctx.lineTo(x + radius.bl, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius.bl);
  ctx.lineTo(x, y + radius.tl);
  ctx.quadraticCurveTo(x, y, x + radius.tl, y);
  ctx.closePath();
  if (fill) {
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = "black";
    ctx.stroke();
  }
}
