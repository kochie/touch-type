// Draws a 32x32 pixel-art sprite into the shared 64x64 avatar viewBox.
import { N, type Grid } from "./sprite-kit";

const CELL = 64 / N;

export function PixelSprite({ grid }: { grid: Grid }) {
  // Merge horizontal runs of one colour so a sprite is a few hundred rects, not 1024.
  const rects: { x: number; y: number; w: number; fill: string }[] = [];
  grid.forEach((row, y) => {
    let x = 0;
    while (x < N) {
      const fill = row[x];
      let end = x + 1;
      while (end < N && row[end] === fill) end++;
      if (fill) rects.push({ x, y, w: end - x, fill });
      x = end;
    }
  });

  return (
    <g shapeRendering="crispEdges">
      {rects.map((r, i) => (
        <rect key={i} x={r.x * CELL} y={r.y * CELL} width={r.w * CELL} height={CELL} fill={r.fill} />
      ))}
    </g>
  );
}
