export const KEYS = [
  ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-", "="],
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "[", "]"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L", ";", "'"],
  ["Z", "X", "C", "V", "B", "N", "M", ",", ".", "/"],
  ["cmd", { key: " ", width: 420 }, "cmd", "opt"],
];
const OFFSETS = [0, 20, 40, 70, 155];
const GAP = 5;
const SPACE = " ";

export function makeKey(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  letter: string,
  fillColor = "white",
  offset = 0
) {
  const X = x + offset;
  const Y = y + 20;

  ctx.save();
  ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
  ctx.clearRect(X, Y, width, height);
  ctx.fillStyle = fillColor;
  roundRect(ctx, X, Y, width, height, 12.5, true, true);
  ctx.fillStyle = "white";
  ctx.font = `20px 'Roboto Mono'`;
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  ctx.fillText(letter, X + width / 2, Y + height / 2 + 2);
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

export function findKey(key: string): [number, number] {
  for (let i = 0; i < KEYS.length; i++) {
    const row = KEYS[i];
    for (let j = 0; j < row.length; j++) {
      if (typeof row[j] === "string" && row[j] === key.toUpperCase()) {
        return [i, j];
      }
      if (
        typeof row[j] === "object" &&
        (row[j] as any).key === key.toUpperCase()
      ) {
        return [i, j];
      }
    }
  }
  return [0, 0];
}

export const drawKey = (
  ctx: CanvasRenderingContext2D,
  i: number,
  j: number,
  letter: string,
  color: string
) => {
  const width = 80;
  const height = 80;
  const gap = GAP;

  // console.log(i, j);

  const keyboardLength = width * KEYS[0].length + (KEYS[0].length - 1) * gap;
  const offset = (window.innerWidth - keyboardLength) / 2 + OFFSETS[i];

  let x = 0;
  for (let q = 0; q < j; q++) {
    const k = KEYS[i][q];
    if (typeof k === "object") x += k.width;
    else x += width;
    x += gap;
  }
  // const x = j * (width + gap);

  makeKey(
    ctx,
    x,
    i * (height + gap),
    letter === SPACE ? 420 : width,
    height,
    letter === SPACE ? "SPACE" : letter.toUpperCase(),
    color,
    offset
  );
};
