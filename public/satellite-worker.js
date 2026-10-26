// Keep the numerical solver off the input/render thread. Transfer pixels, not fields.
import { Atmosphere } from "./atmosphere.js";
let model;
self.onmessage = ({ data }) => {
  const { type, epoch, storm } = data;
  if (type === "init")
    model = new Atmosphere(data.width, data.height, data.land);
  if (type === "init" || type === "reset") model.reset(storm);
  else for (let i = 0; i < data.steps; i++) model.step(0.05, storm);
  const { width, height, cloud } = model;
  const pixels = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const i = y * width + x,
        pixel = i * 4;
      const density = Math.max(0, cloud[i] - 0.13);
      const left = cloud[y * width + Math.max(0, x - 1)],
        above = cloud[Math.max(0, y - 1) * width + x];
      const light = Math.max(
        0.58,
        Math.min(1, 0.92 + (left + above - 2 * cloud[i]) * 1.4),
      );
      pixels[pixel] = light * 249;
      pixels[pixel + 1] = light * 251;
      pixels[pixel + 2] = light * 255;
      pixels[pixel + 3] = (1 - Math.exp(-density * 3.2)) * 255;
    }
  self.postMessage({ epoch, pixels, stats: model.stats() }, [pixels.buffer]);
};
