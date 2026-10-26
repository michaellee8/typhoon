// Hong Kong Observatory tropical cyclone signal symbols, redrawn as flat shapes in
// a 100×100 box (after https://www.hko.gov.hk/en/wxinfo/dailywx/warnlegend.htm):
//   1 T · 3 ⊥ · 8NE ▲▲ · 8SE ▼▼ · 8SW ▼ · 8NW ▲ · 9 hourglass · 10 cross
// The No. 8 direction is the quadrant the gales blow from.
const up = (top, bottom) => [
  [50, top],
  [90, bottom],
  [10, bottom],
];
const down = (top, bottom) => [
  [10, top],
  [90, top],
  [50, bottom],
];
const rect = (x0, y0, x1, y1) => [
  [x0, y0],
  [x1, y0],
  [x1, y1],
  [x0, y1],
];

export const SIGNAL_SHAPES = {
  1: [rect(10, 14, 90, 38), rect(38, 37, 62, 88)],
  3: [rect(38, 12, 62, 63), rect(10, 62, 90, 86)],
  "8NE": [up(4, 46), up(52, 94)],
  "8SE": [down(6, 48), down(54, 96)],
  "8SW": [down(26, 74)],
  "8NW": [up(26, 74)],
  9: [down(6, 50), up(50, 94)],
  10: [rect(38, 8, 62, 92), rect(8, 38, 92, 62)],
};

export const GALE_DIRECTIONS = ["NE", "SE", "SW", "NW"];

export const signalKey = (signal, direction = "NE") =>
  signal === 8 ? `8${direction}` : String(signal);

const pathData = (key) =>
  SIGNAL_SHAPES[key]
    .map((poly) => `M${poly.map(([x, y]) => `${x} ${y}`).join("L")}Z`)
    .join("");

export const signalSvg = (key, fill = "#152e38") =>
  `<svg viewBox="0 0 100 100" aria-hidden="true"><path fill="${fill}" d="${pathData(key)}"/></svg>`;

// Draws the symbol centred on (x, y), size px tall, on a 2D canvas context.
export function drawSignal(ctx, key, x, y, size, fill = "#152e38") {
  const s = size / 100;
  ctx.save();
  ctx.translate(x - 50 * s, y - 50 * s);
  ctx.scale(s, s);
  ctx.fillStyle = fill;
  ctx.fill(new Path2D(pathData(key)));
  ctx.restore();
}

// Wind at Hong Kong circles the storm anticlockwise and turns about 20° in towards
// its centre. Map y points south. Keeps the previous quadrant until the bearing is
// 10° past a boundary, so the symbol does not flicker on the line.
const INFLOW = (20 * Math.PI) / 180;
export function galeDirection(stormX, stormY, hkX, hkY, previous) {
  const east = hkX - stormX;
  const north = stormY - hkY;
  const d = Math.hypot(east, north) || 1;
  const [re, rn] = [east / d, north / d];
  // Blowing towards: tangent (−rn, re) turned inwards by INFLOW.
  const te = -rn * Math.cos(INFLOW) - re * Math.sin(INFLOW);
  const tn = re * Math.cos(INFLOW) - rn * Math.sin(INFLOW);
  const from = ((Math.atan2(-te, -tn) * 180) / Math.PI + 360) % 360;
  const quadrant = GALE_DIRECTIONS[Math.floor(from / 90) % 4];
  if (!previous || previous === quadrant) return quadrant;
  const centre = GALE_DIRECTIONS.indexOf(previous) * 90 + 45;
  const off = Math.abs(((from - centre + 540) % 360) - 180);
  return off > 55 ? quadrant : previous;
}
