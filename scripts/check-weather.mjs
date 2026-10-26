import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  centreWind,
  classification,
  energyRate,
  hongKongWind,
  landCoverage,
  stormRadius,
  warningSignal,
  windAtDistance,
} from "../public/weather.js";
import {
  HK,
  START,
  MAX_WIND_RADIUS,
  LAND_CONTACT_RADIUS,
  km,
  project,
} from "../public/geography.js";
import { SIGNAL_SHAPES, galeDirection } from "../public/signals.js";
const near = (actual, expected, tolerance = 1e-8) =>
  assert(Math.abs(actual - expected) < tolerance, `${actual} ≠ ${expected}`);
const square = (left, top, right, bottom) => [
  [left, top],
  [right, top],
  [right, bottom],
  [left, bottom],
];
near(landCoverage(0, 0, 1, [square(2, -2, 4, 2)]), 0);
near(landCoverage(0, 0, 1, [square(-2, -2, 2, 2)]), 1);
near(landCoverage(0, 0, 1, [square(0, -2, 2, 2)]), 0.5);
near(landCoverage(0, 0, 1, [square(0, 0, 2, 2)]), 0.25);
near(landCoverage(0, 0, 1, [square(-0.1, -0.1, 0.1, 0.1)]), 0.04 / Math.PI);
near(landCoverage(0, 0, 1, [square(1, -2, 3, 2)]), 0);
const sliver = landCoverage(0, 0, 1, [square(0.99999, -2, 2, 2)]);
assert(
  sliver > 0 && sliver < 0.00001,
  "Even a very small overlap must register",
);
assert(
  energyRate(sliver) < 0,
  "Any positive land coverage must reduce strength",
);
let previous = 0;
for (const left of [0.99, 0.9, 0.6, 0.2, 0, -0.5, -1]) {
  const fraction = landCoverage(0, 0, 1, [square(left, -2, 3, 2)]);
  assert(fraction > previous, "More land exposure must have greater overlap");
  if (previous > 0)
    assert(
      energyRate(fraction) < energyRate(previous),
      "More exposure must weaken faster",
    );
  previous = fraction;
}
const cap = (d) => (Math.acos(d) - d * Math.sqrt(1 - d * d)) / Math.PI;
for (const d of [0.01, 0.3, 0.7, 0.95, 0.999])
  near(landCoverage(0, 0, 1, [square(d, -2, 3, 2)]), cap(d));
near(
  landCoverage(0, 0, 1, [
    square(-0.1, -0.1, 0.1, 0.1),
    square(0.3, -0.1, 0.4, 0.1),
  ]),
  0.06 / Math.PI,
);
near(landCoverage(0, 0, 1, [square(0, -2, 2, 2).reverse()]), 0.5);
assert.equal(energyRate(0), 22.5, "Open water recovers 22.5 a second");
assert(energyRate(0.1) >= -2.2, "Grazing the coast should leave time to react");
assert(
  energyRate(0.5) >= -7.6,
  "Half-land exposure should be survivable for a sustained approach",
);
assert(energyRate(1) < energyRate(0.5), "Full landfall still drains faster");
for (const [speed, label] of [
  [40, "低壓區"],
  [41, "熱帶低氣壓"],
  [62, "熱帶低氣壓"],
  [63, "熱帶風暴"],
  [87, "熱帶風暴"],
  [88, "強烈熱帶風暴"],
  [117, "強烈熱帶風暴"],
  [118, "颱風"],
  [149, "颱風"],
  [150, "強颱風"],
  [184, "強颱風"],
  [185, "超強颱風"],
  [220, "超強颱風"],
])
  assert.equal(classification(speed), label);
assert.equal(centreWind(100), 220);
const overhead = hongKongWind(HK.x, HK.y, 100),
  far = hongKongWind(START.x, START.y, 100);
assert(
  overhead.sustained >= 118,
  "A full-strength storm covering HK must produce hurricane winds across HK, even with the eye centred over the city",
);
assert.equal(warningSignal(overhead.sustained), 10);
assert.equal(far.sustained, 0);
assert.equal(warningSignal(far.sustained), 1);
near(windAtDistance(220, stormRadius(100), MAX_WIND_RADIUS), 220);
for (const [local, forecast, signal] of [
  [40, 40, 1],
  [41, 41, 3],
  [62, 62, 3],
  [63, 63, 8],
  [103, 103, 8],
  [103, 125, 9],
  [118, 118, 10],
])
  assert.equal(warningSignal(local, forecast), signal);
const coast = JSON.parse(
  readFileSync(new URL("../public/coast.json", import.meta.url), "utf8"),
);
const offshore = landCoverage(HK.x, HK.y + km(120), LAND_CONTACT_RADIUS, coast);
assert(
  offshore > 0,
  "The actual coast must weaken a partially overlapping storm while its centre remains offshore",
);
assert.equal(landCoverage(START.x, START.y, stormRadius(78), coast), 0);
near(stormRadius() * 1.45 * 2, 450);
near(LAND_CONTACT_RADIUS * 1.45, 140);
assert(
  LAND_CONTACT_RADIUS < stormRadius(),
  "Contact radius can shrink without reducing clouds or wind reach",
);
assert(
  energyRate(1) >= -14.4,
  "Even full landfall should allow time to recover",
);
near(MAX_WIND_RADIUS * 1.45, 30);
near(
  Math.hypot(
    project(114, 22).x - project(114, 23).x,
    project(114, 22).y - project(114, 23).y,
  ) * 1.45,
  111.195,
);
assert(windAtDistance(185, stormRadius(), km(150)) >= 63);
assert(windAtDistance(185, stormRadius(), km(160)) < 63);
near(windAtDistance(220, stormRadius(), stormRadius() - 1e-6), 0, 1e-4);
// No. 8 direction: anticlockwise winds turned in towards the centre, as HKO
// issues them (storm to the south gives NE gales, to the east NW, and so on).
const galeFrom = (east, north) =>
  galeDirection(HK.x + east, HK.y - north, HK.x, HK.y);
assert.equal(galeFrom(0, -300), "NE", "Storm due south: NE gales");
assert.equal(galeFrom(300, -300), "NE", "Storm to the SE: NE gales");
assert.equal(galeFrom(300, 0), "NW", "Storm due east: NW gales");
assert.equal(galeFrom(-300, -300), "SE", "Storm to the SW: SE gales");
assert.equal(galeFrom(-300, 0), "SE", "Storm due west: SE gales");
assert.equal(galeFrom(0, 300), "SW", "Storm due north: SW gales");
// Just past the NE/NW line the previous symbol stays up; well past, it changes.
assert.equal(galeFrom(300, -120), "NE");
assert.equal(
  galeDirection(HK.x + 300, HK.y + 120, HK.x, HK.y, "NW"),
  "NW",
  "Hysteresis keeps the symbol steady at a quadrant boundary",
);
assert.equal(
  galeDirection(HK.x + 300, HK.y + 300, HK.x, HK.y, "NW"),
  "NE",
  "A clear change of quadrant replaces the symbol",
);
for (const key of ["1", "3", "8NE", "8SE", "8SW", "8NW", "9", "10"])
  assert(SIGNAL_SHAPES[key]?.length, `HKO symbol ${key}`);

const started = performance.now();
for (let i = 0; i < 100; i++) landCoverage(600, 326, 150, coast);
console.log(
  `PASS: coastal slivers, monotonic exposure/drain, islands, centre wind vs local wind, HKO boundaries, No. 8 directions, 22.5/s sea recovery. Geometry: ${((performance.now() - started) / 100).toFixed(2)} ms/update.`,
);
