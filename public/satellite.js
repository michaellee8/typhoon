// Terrain shading and optical rendering of the live fluid/moisture fields.
function hash(x, y) {
  let n = Math.imul(x, 374761393) + Math.imul(y, 668265263);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
}
function noise(x, y) {
  const ix = Math.floor(x),
    iy = Math.floor(y);
  let fx = x - ix,
    fy = y - iy;
  fx *= fx * (3 - 2 * fx);
  fy *= fy * (3 - 2 * fy);
  const a = hash(ix, iy),
    b = hash(ix + 1, iy),
    c = hash(ix, iy + 1),
    d = hash(ix + 1, iy + 1);
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
}
const terrainNoise = (x, y) =>
  noise(x, y) * 0.5 +
  noise(x * 2 + 11, y * 2 + 8) * 0.28 +
  noise(x * 4 + 2, y * 4 + 13) * 0.15 +
  noise(x * 8 + 8, y * 8 + 3) * 0.07;
export function terrainTexture() {
  const image = document.createElement("canvas");
  image.width = 1000;
  image.height = 840;
  const context = image.getContext("2d");
  const pixels = context.createImageData(image.width, image.height);
  for (let y = 0; y < image.height; y++)
    for (let x = 0; x < image.width; x++) {
      const elevation = terrainNoise(x / 37, y / 37),
        ridge = noise((x + y * 0.6) / 12, (y - x * 0.3) / 25);
      const slope =
        (noise((x - 2) / 37, (y - 2) / 37) -
          noise((x + 2) / 37, (y + 2) / 37)) *
        125;
      const detail = noise(x / 2.5, y / 2.5) * 11,
        offset = (y * image.width + x) * 4;
      pixels.data[offset] = 40 + elevation * 34 + ridge * 12 + slope + detail;
      pixels.data[offset + 1] =
        48 + elevation * 37 + ridge * 12 + slope + detail;
      pixels.data[offset + 2] =
        40 + elevation * 26 + ridge * 8 + slope * 0.6 + detail * 0.6;
      pixels.data[offset + 3] = 255;
    }
  context.putImageData(pixels, 0, 0);
  return image;
}
// All cloud pixels come from the evolving condensate field in world coordinates.
// Only the fields the solver reads cross to the worker; game state also holds
// closures (announcements) that structured clone cannot copy.
const fields = ({ x, y, vx, vy, energy }) => ({ x, y, vx, vy, energy });

export async function createSatellite(landPath, storm, width = 224) {
  const height = Math.round(width * 0.84);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  context.scale(width / 1000, height / 840);
  context.fill(landPath);
  const mask = context.getImageData(0, 0, width, height);
  const land = Float32Array.from(
    { length: width * height },
    (_, i) => mask.data[i * 4 + 3] / 255,
  );
  context.setTransform(1, 0, 0, 1, 0, 0);
  context.clearRect(0, 0, width, height);
  const worker = new Worker(new URL("./satellite-worker.js", import.meta.url), {
    type: "module",
  });
  let epoch = 0,
    busy = true,
    paused = false,
    accumulator = 0,
    latestStorm = fields(storm),
    stats,
    held;
  let initialized, failed;
  const ready = new Promise((resolve, reject) => {
    initialized = resolve;
    failed = reject;
  });
  function paint(frame) {
    context.putImageData(new ImageData(frame.pixels, width, height), 0, 0);
    stats = frame.stats;
  }
  function flush() {
    if (busy || paused || accumulator < 0.05) return;
    const steps = Math.min(3, Math.floor((accumulator + 1e-8) / 0.05));
    accumulator -= steps * 0.05;
    busy = true;
    worker.postMessage({ type: "step", epoch, steps, storm: latestStorm });
  }
  worker.onmessage = ({ data }) => {
    if (data.epoch !== epoch) return;
    busy = false;
    if (paused) held = data;
    else paint(data);
    initialized();
    flush();
  };
  worker.onerror = (error) => {
    failed(error);
    console.error("Atmosphere worker failed", error.message);
  };
  worker.postMessage(
    { type: "init", epoch, width, height, land, storm: latestStorm },
    [land.buffer],
  );
  await ready;
  return {
    canvas,
    model: { stats: () => ({ ...stats }) },
    reset(storm) {
      epoch++;
      busy = true;
      paused = false;
      held = undefined;
      accumulator = 0;
      latestStorm = fields(storm);
      stats = { ...stats, steps: 0, time: 0, condensed: 0, rained: 0 };
      worker.postMessage({ type: "reset", epoch, storm: latestStorm });
    },
    pause() {
      paused = true;
    },
    resume() {
      paused = false;
      if (held) {
        paint(held);
        held = undefined;
      }
      flush();
    },
    update(dt, storm) {
      latestStorm = fields(storm);
      // ponytail: under sustained CPU overload, the cloud clock slows instead of
      // queueing stale fields; a GPU solver is the upgrade for higher resolution.
      accumulator = Math.min(0.15, accumulator + dt);
      flush();
    },
  };
}
