// Natural Earth's public-domain map is the only external source asset.
import { readFileSync, writeFileSync } from "node:fs";
const source = JSON.parse(readFileSync(process.argv[2], "utf8"));
import { BOUNDS as bounds, project } from "../public/geography.js";
function clip(ring, axis, edge, sign) {
  const output = [];
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i],
      b = ring[(i + 1) % ring.length];
    const insideA = (a[axis] - edge) * sign >= 0;
    const insideB = (b[axis] - edge) * sign >= 0;
    if (insideA) output.push(a);
    if (insideA !== insideB) {
      const t = (edge - a[axis]) / (b[axis] - a[axis]);
      output.push([a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])]);
    }
  }
  return output;
}
const polygons = [];
for (const feature of source.features) {
  const groups =
    feature.geometry.type === "Polygon"
      ? [feature.geometry.coordinates]
      : feature.geometry.coordinates;
  for (const group of groups) {
    let ring = group[0];
    for (const [axis, edge, sign] of [
      [0, bounds[0], 1],
      [0, bounds[2], -1],
      [1, bounds[1], 1],
      [1, bounds[3], -1],
    ])
      ring = clip(ring, axis, edge, sign);
    if (ring.length > 2)
      polygons.push(
        ring.map(([x, y]) => [
          Math.round(project(x, y).x * 10) / 10,
          Math.round(project(x, y).y * 10) / 10,
        ]),
      );
  }
}
writeFileSync(
  new URL("../public/coast.json", import.meta.url),
  JSON.stringify(polygons),
);
console.log(`Prepared ${polygons.length} coastline polygons.`);
