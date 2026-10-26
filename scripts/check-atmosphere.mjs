import assert from "node:assert/strict";
import { Atmosphere } from "../public/atmosphere.js";

import { MAX_WIND_RADIUS } from "../public/geography.js";
const storm = { x: 500, y: 420, energy: 100, vx: 0, vy: 0 };
const make = (land = 0) =>
  new Atmosphere(64, 54, new Float32Array(64 * 54).fill(land));
function divergence(model) {
  let sum = 0,
    count = 0;
  for (let y = 2; y < model.height - 2; y++)
    for (let x = 2; x < model.width - 2; x++) {
      const i = y * model.width + x;
      const d =
        (model.u[i + 1] - model.u[i - 1]) / (2 * model.dx) +
        (model.v[i + model.width] - model.v[i - model.width]) / (2 * model.dy);
      sum += d * d;
      count++;
    }
  return Math.sqrt(sum / count);
}
const pressure = make();
for (let y = 0; y < pressure.height; y++)
  for (let x = 0; x < pressure.width; x++) {
    const i = y * pressure.width + x;
    pressure.u[i] = Math.sin(x * 0.65) * Math.cos(y * 0.43) * 20;
    pressure.v[i] = Math.cos(x * 0.33) * Math.sin(y * 0.51) * 15;
  }
const before = divergence(pressure);
pressure.project(40);
const after = divergence(pressure);
assert(
  after < before * 0.35,
  `Pressure projection must reduce divergence: ${before} -> ${after}`,
);

const transport = make();
function centerOfCloud(model) {
  let mass = 0,
    xsum = 0;
  for (let i = 0; i < model.cloud.length; i++) {
    mass += model.cloud[i];
    xsum += model.cloud[i] * (i % model.width);
  }
  return { x: xsum / mass, mass };
}
for (let y = 0; y < transport.height; y++)
  for (let x = 0; x < transport.width; x++)
    transport.cloud[y * transport.width + x] = Math.exp(
      -(((x - 19) / 3) ** 2 + ((y - 25) / 3) ** 2),
    );
transport.cloudU.fill(30);
transport.cloudV.fill(0);
const initial = centerOfCloud(transport);
for (let i = 0; i < 30; i++) {
  transport.advectCloud(0.05);
  [transport.cloud, transport.nextCloud] = [
    transport.nextCloud,
    transport.cloud,
  ];
}
const moved = centerOfCloud(transport);
assert(
  Math.abs(moved.x - initial.x - 45 / transport.dx) < 0.2,
  "Cloud water must advect by the velocity field, not a render transform",
);
assert(
  Math.abs(moved.mass / initial.mass - 1) < 0.08,
  "Advection should approximately preserve cloud water in the interior",
);
assert(
  transport.cloud.every((v) => v >= 0 && v <= 1.00001),
  "Corrected advection must remain bounded",
);

const ocean = make(0),
  land = make(1);
ocean.reset(storm);
land.reset(storm);
const signature = ocean.stats().signature;
for (let i = 0; i < 100; i++) {
  ocean.step(0.05, storm);
  land.step(0.05, storm);
}
assert(
  ocean.stats().condensed > 0 && ocean.stats().rained > 0,
  "Moisture must condense and rain out",
);
assert(
  ocean.stats().cloudMass > land.stats().cloudMass * 1.5,
  "Land must suppress moisture supply and cloud persistence",
);
assert(
  ocean.stats().peakSpeed > land.stats().peakSpeed,
  "Land friction must slow the simulated wind",
);
assert.notEqual(
  ocean.stats().signature,
  signature,
  "Stationary cyclone clouds must still evolve",
);
const eye = ocean.sample(ocean.cloud, storm.x / ocean.dx, storm.y / ocean.dy);
const eyewall = ocean.sample(
  ocean.cloud,
  (storm.x + MAX_WIND_RADIUS) / ocean.dx,
  storm.y / ocean.dy,
);
assert(
  eye < eyewall * 0.35,
  "Subsidence must keep the eye clearer than the eyewall",
);
const old = ocean.sample(
  ocean.cloud,
  (storm.x + MAX_WIND_RADIUS) / ocean.dx,
  storm.y / ocean.dy,
);
ocean.step(0.05, { ...storm, x: 700 });
assert(
  ocean.sample(
    ocean.cloud,
    (storm.x + MAX_WIND_RADIUS) / ocean.dx,
    storm.y / ocean.dy,
  ) >
    old * 0.5,
  "Moving the cyclone must not teleport or erase the old cloud field",
);
for (let i = 0; i < 300; i++)
  ocean.step(0.05, {
    ...storm,
    x: 500 + Math.sin(i * 0.01) * 100,
    y: 420 + Math.cos(i * 0.01) * 80,
  });
assert(
  ocean.stats().finite,
  "The simulation must remain finite under changing forcing",
);
assert(ocean.cloud.every((v) => v >= 0 && v <= 3));
assert(ocean.humidity.every((v) => v >= 0 && v <= 1.5));
ocean.reset(storm);
assert.equal(ocean.stats().steps, 0);
assert.equal(
  ocean.stats().signature,
  signature,
  "Reset must restore the initial physical state",
);
assert.throws(() => ocean.step(1, storm), RangeError);

// Uniform steering flow transports the existing cloud water while it evolves.
const still = new Atmosphere(96, 81),
  steered = new Atmosphere(96, 81);
still.reset(storm);
steered.reset(storm);
for (let i = 0; i < 20; i++) {
  still.step(0.05, storm);
  steered.step(0.05, { ...storm, x: storm.x + (i + 1) * 2, vx: 40 });
}
const displacement =
  (centerOfCloud(steered).x - centerOfCloud(still).x) * still.dx;
assert(
  displacement > 15 && displacement < 60,
  "Steering must advect existing condensate in the direction of travel",
);

const bench = new Atmosphere(144, 121);
bench.reset(storm);
for (let i = 0; i < 5; i++) bench.step(0.05, storm);
const started = performance.now();
for (let i = 0; i < 20; i++) bench.step(0.05, storm);
console.log(
  `PASS: pressure divergence ${before.toFixed(3)} -> ${after.toFixed(3)}, bounded water advection, condensation/rain, land friction/drying, eye subsidence, persistent wake, deterministic reset. Phone-grid step: ${((performance.now() - started) / 20).toFixed(1)} ms.`,
);
