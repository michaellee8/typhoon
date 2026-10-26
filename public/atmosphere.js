// Reduced 2D atmosphere: forced Navier–Stokes flow plus advected water/heat.
// Semi-Lagrangian advection and pressure projection follow Stam's Stable Fluids.
// Vertical convection/subsidence are parameterized; this is not a forecast model.
import { centreWind, stormRadius } from "./weather.js";
import { EYE_RADIUS, MAX_WIND_RADIUS, km } from "./geography.js";

const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
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

export class Atmosphere {
  constructor(
    width = 224,
    height = 188,
    land = new Float32Array(width * height),
    upperWind = { x: 14, y: -9 },
  ) {
    this.width = width;
    this.height = height;
    this.land = land;
    this.upperWind = upperWind;
    this.dx = 1000 / (width - 1);
    this.dy = 840 / (height - 1);
    const size = width * height;
    for (const name of [
      "u",
      "v",
      "nextU",
      "nextV",
      "humidity",
      "nextHumidity",
      "cloud",
      "nextCloud",
      "heat",
      "nextHeat",
      "curl",
      "pressure",
      "divergence",
      "advectedCloud",
      "cloudU",
      "cloudV",
      "dirX",
      "dirY",
      "envelope",
      "eyewall",
      "eyeSink",
      "wetness",
      "eddyU",
      "eddyV",
    ])
      this[name] = new Float32Array(size);
    this.time = 0;
    this.steps = 0;
    this.condensed = 0;
    this.rained = 0;
  }

  sample(field, x, y) {
    x = clamp(x, 0, this.width - 1.001);
    y = clamp(y, 0, this.height - 1.001);
    const ix = Math.floor(x),
      iy = Math.floor(y),
      fx = x - ix,
      fy = y - iy;
    const i = iy * this.width + ix,
      a = field[i],
      b = field[i + 1],
      c = field[i + this.width],
      d = field[i + this.width + 1];
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
  }

  reset(storm) {
    this.time = 0;
    this.steps = 0;
    this.condensed = 0;
    this.rained = 0;
    const organization = clamp((centreWind(storm.energy) - 63) / 55, 0, 1);
    const radius = stormRadius(storm.energy),
      maximum = centreWind(storm.energy) * 0.45;
    for (let y = 0; y < this.height; y++)
      for (let x = 0; x < this.width; x++) {
        const i = y * this.width + x,
          wx = x * this.dx,
          wy = y * this.dy;
        const rx = wx - storm.x,
          ry = wy - storm.y,
          r = Math.max(1, Math.hypot(rx, ry));
        const eyeWall = MAX_WIND_RADIUS;
        const speed =
          maximum *
          Math.min(r / eyeWall, (eyeWall / r) ** 0.5) *
          Math.exp(-((r / (radius * 1.1)) ** 4));
        const moisture =
          noise(wx / 48, wy / 48) * 0.65 +
          noise(wx / 19 + 17, wy / 19 + 2) * 0.35;
        const envelope = Math.exp(-((r / radius) ** 4));
        const humid = clamp(
          0.58 + moisture * 0.35 + envelope * 0.1 - this.land[i] * 0.19,
          0,
          1.2,
        );
        this.wetness[i] = moisture;
        this.eddyU[i] =
          (noise(wx / 18, (wy + 2) / 18) - noise(wx / 18, (wy - 2) / 18)) * 140;
        this.eddyV[i] =
          -(noise((wx + 2) / 18, wy / 18) - noise((wx - 2) / 18, wy / 18)) *
          140;
        this.u[i] = (ry / r) * speed - 3 + this.eddyU[i] * envelope;
        this.v[i] = (-rx / r) * speed + 1.5 + this.eddyV[i] * envelope;
        this.humidity[i] = humid;
        this.heat[i] = 0.3 + moisture * 0.35 + envelope * 0.15;
        // Initial condensate patches and a nascent eyewall; no spiral image/mask.
        this.cloud[i] =
          Math.max(0, humid - 0.75) * 1.4 * envelope +
          Math.exp(-(((r - eyeWall) / km(14)) ** 2)) * 0.35 * organization;
        if (r < EYE_RADIUS) this.cloud[i] *= 1 - organization;
      }
    this.project();
  }

  advectVelocity(dt, steeringX = 0, steeringY = 0) {
    const { width: w, height: h, u, v, nextU, nextV } = this;
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        const mx = x - ((u[i] + steeringX) * dt) / (2 * this.dx),
          my = y - ((v[i] + steeringY) * dt) / (2 * this.dy);
        const bx = x - ((this.sample(u, mx, my) + steeringX) * dt) / this.dx,
          by = y - ((this.sample(v, mx, my) + steeringY) * dt) / this.dy;
        const left = x ? i - 1 : i,
          right = x < w - 1 ? i + 1 : i,
          above = y ? i - w : i,
          below = y < h - 1 ? i + w : i;
        const lapU =
          (u[left] + u[right] - 2 * u[i]) / (this.dx * this.dx) +
          (u[above] + u[below] - 2 * u[i]) / (this.dy * this.dy);
        const lapV =
          (v[left] + v[right] - 2 * v[i]) / (this.dx * this.dx) +
          (v[above] + v[below] - 2 * v[i]) / (this.dy * this.dy);
        nextU[i] = this.sample(u, bx, by) + 0.35 * dt * lapU;
        nextV[i] = this.sample(v, bx, by) + 0.35 * dt * lapV;
      }
    this.u = nextU;
    this.nextU = u;
    this.v = nextV;
    this.nextV = v;
  }

  project(iterations = 22) {
    const { width: w, height: h, u, v, pressure: p, divergence: d } = this;
    const ix = 1 / (2 * this.dx),
      iy = 1 / (2 * this.dy),
      dx2 = this.dx * this.dx,
      dy2 = this.dy * this.dy;
    p.fill(0);
    for (let y = 1; y < h - 1; y++)
      for (let x = 1; x < w - 1; x++) {
        const i = y * w + x;
        d[i] = (u[i + 1] - u[i - 1]) * ix + (v[i + w] - v[i - w]) * iy;
      }
    // Red/black Gauss–Seidel for the pressure Poisson equation, open boundaries.
    for (let iteration = 0; iteration < iterations; iteration++)
      for (let color = 0; color < 2; color++) {
        for (let y = 1; y < h - 1; y++)
          for (let x = 1 + ((y + color) & 1); x < w - 1; x += 2) {
            const i = y * w + x;
            p[i] =
              ((p[i - 1] + p[i + 1]) * dy2 +
                (p[i - w] + p[i + w]) * dx2 -
                d[i] * dx2 * dy2) /
              (2 * (dx2 + dy2));
          }
      }
    for (let y = 1; y < h - 1; y++)
      for (let x = 1; x < w - 1; x++) {
        const i = y * w + x;
        u[i] -= (p[i + 1] - p[i - 1]) * ix;
        v[i] -= (p[i + w] - p[i - w]) * iy;
      }
  }

  advectCloud(dt) {
    const {
      width: w,
      height: h,
      cloud: c,
      advectedCloud: a,
      cloudU: u,
      cloudV: v,
    } = this;
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        a[i] = this.sample(
          c,
          x - (u[i] * dt) / this.dx,
          y - (v[i] * dt) / this.dy,
        );
      }
    // MacCormack forward/backward correction, clamped to the original donors.
    // It keeps small cloud structures without introducing negative water or ringing.
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        const bx = clamp(x - (u[i] * dt) / this.dx, 0, w - 1.001),
          by = clamp(y - (v[i] * dt) / this.dy, 0, h - 1.001);
        const j = Math.floor(by) * w + Math.floor(bx);
        const reverse = this.sample(
          a,
          x + (u[i] * dt) / this.dx,
          y + (v[i] * dt) / this.dy,
        );
        this.nextCloud[i] = clamp(
          a[i] + 0.5 * (c[i] - reverse),
          Math.min(c[j], c[j + 1], c[j + w], c[j + w + 1]),
          Math.max(c[j], c[j + 1], c[j + w], c[j + w + 1]),
        );
      }
  }

  step(dt, storm) {
    if (!(dt > 0) || dt > 0.1)
      throw new RangeError("Atmosphere step must be in (0, 0.1] seconds");
    this.time += dt;
    this.steps++;
    // Steering is a uniform background flow. Advect the persistent fields with
    // it rather than making the moving pressure centre outrun its own clouds.
    const steeringX = storm.vx || 0,
      steeringY = storm.vy || 0;
    this.advectVelocity(dt, steeringX, steeringY);
    const { width: w, height: h, u, v, curl, land } = this;
    const organization = clamp((centreWind(storm.energy) - 63) / 55, 0, 1);
    const radius = stormRadius(storm.energy),
      maximum = centreWind(storm.energy) * 0.45;
    const forcing = 1 - Math.exp(-dt * 0.7);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const i = y * w + x,
          wx = x * this.dx,
          wy = y * this.dy;
        const rx = wx - storm.x,
          ry = wy - storm.y,
          r = Math.max(1, Math.hypot(rx, ry));
        const eyeWall = MAX_WIND_RADIUS,
          envelope = Math.exp(-((r / (radius * 1.1)) ** 4));
        this.dirX[i] = rx / r;
        this.dirY[i] = ry / r;
        this.envelope[i] = Math.exp(-((r / radius) ** 4));
        this.eyewall[i] =
          Math.exp(-(((r - eyeWall) / km(14)) ** 2)) * (storm.energy / 100);
        this.eyeSink[i] = Math.exp(-((r / EYE_RADIUS) ** 4)) * organization;
        const speed =
          maximum * Math.min(r / eyeWall, (eyeWall / r) ** 0.5) * envelope;
        const targetU =
          (ry / r) * speed - 4 + (wy - 420) * 0.008 + this.eddyU[i] * envelope;
        const targetV = (-rx / r) * speed + 1.5 + this.eddyV[i] * envelope;
        // The movable cyclone is external forcing; momentum is still advected,
        // pressure-projected and dragged by terrain rather than stamped each frame.
        u[i] += (targetU - u[i]) * forcing;
        v[i] += (targetV - v[i]) * forcing;
        // Northern-hemisphere Coriolis deflection on an accelerated f-plane.
        const beforeU = u[i];
        u[i] -= v[i] * 0.02 * dt;
        v[i] += beforeU * 0.02 * dt;
        const friction = Math.exp(-dt * (0.025 + land[i] * 0.65));
        u[i] *= friction;
        v[i] *= friction;
      }
    for (let y = 1; y < h - 1; y++)
      for (let x = 1; x < w - 1; x++) {
        const i = y * w + x;
        curl[i] =
          (v[i + 1] - v[i - 1]) / (2 * this.dx) -
          (u[i + w] - u[i - w]) / (2 * this.dy);
      }
    for (let y = 2; y < h - 2; y++)
      for (let x = 2; x < w - 2; x++) {
        const i = y * w + x;
        const gx = Math.abs(curl[i + 1]) - Math.abs(curl[i - 1]),
          gy = Math.abs(curl[i + w]) - Math.abs(curl[i - w]);
        const length = Math.hypot(gx, gy) + 1e-6,
          force = curl[i] * 35 * dt;
        u[i] += (gy / length) * force;
        v[i] -= (gx / length) * force;
      }
    this.project();
    for (let i = 0; i < u.length; i++) {
      const outflow = 9 * (storm.energy / 100) * this.envelope[i];
      // Anvil clouds experience upper-level shear as well as radial outflow;
      // this separates their motion from the low-level inflowing moisture.
      this.cloudU[i] =
        u[i] + steeringX + this.dirX[i] * outflow + this.upperWind.x;
      this.cloudV[i] =
        v[i] + steeringY + this.dirY[i] * outflow + this.upperWind.y;
    }
    this.advectCloud(dt);
    const {
      humidity: q,
      cloud: c,
      heat: temp,
      nextHumidity: nq,
      nextCloud: nc,
      nextHeat: nt,
    } = this;
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        const envelope = this.envelope[i];
        const inflow = 7 * (storm.energy / 100) * envelope;
        // Low-level converging inflow has a parameterized vertical outlet; the
        // horizontal momentum layer itself is pressure-projected above.
        const bx =
            x - ((u[i] + steeringX - this.dirX[i] * inflow) * dt) / this.dx,
          by = y - ((v[i] + steeringY - this.dirY[i] * inflow) * dt) / this.dy;
        let vapor = this.sample(q, bx, by),
          water = nc[i],
          heat = this.sample(temp, bx, by);
        const speed = Math.hypot(u[i], v[i]);
        const ocean = 1 - land[i];
        vapor +=
          dt *
          0.11 *
          ocean *
          (0.68 + envelope * 0.13 + (this.wetness[i] - 0.5) * 0.5 - vapor) *
          (0.4 + Math.min(1, speed / 65));
        heat +=
          dt *
          (ocean * (0.015 + 0.09 * this.wetness[i]) -
            land[i] * 0.09 -
            heat * 0.035);
        const eyewall = this.eyewall[i];
        const instability = Math.max(0, heat - 0.55) * 0.9 * envelope;
        const uplift = eyewall * 0.9 + instability;
        const saturation = 0.78 + heat * 0.06 - uplift * 0.3;
        const condensed =
          Math.max(0, vapor - saturation) * (1 - Math.exp(-dt * 2.8));
        vapor -= condensed;
        water += condensed * 3;
        heat += condensed * 0.75;
        this.condensed += condensed;
        const evaporated = Math.min(
          water,
          Math.max(0, saturation - vapor) * dt * 0.65,
        );
        water -= evaporated;
        vapor += evaporated / 3;
        heat -= evaporated * 0.08;
        const rain = Math.max(0, water - 0.72) * dt * 0.65;
        water -= rain;
        this.rained += rain;
        water *= Math.exp(-dt * (0.016 + land[i] * 0.18));
        // Sinking, warming air dries the eye; it is a sink in the water equation.
        const subsidence = this.eyeSink[i];
        water *= Math.exp(-subsidence * dt * 11);
        vapor *= Math.exp(-subsidence * dt * 0.5);
        nq[i] = clamp(vapor, 0, 1.5);
        nc[i] = clamp(water, 0, 3);
        nt[i] = clamp(heat, -1, 2);
      }
    this.humidity = nq;
    this.nextHumidity = q;
    this.cloud = nc;
    this.nextCloud = c;
    this.heat = nt;
    this.nextHeat = temp;
  }

  stats() {
    let cloudMass = 0,
      humidityMass = 0,
      peakSpeed = 0,
      signature = 0,
      finite = true;
    for (let i = 0; i < this.cloud.length; i++) {
      cloudMass += this.cloud[i];
      humidityMass += this.humidity[i];
      peakSpeed = Math.max(peakSpeed, Math.hypot(this.u[i], this.v[i]));
      signature += this.cloud[i] * (1 + (i % 997) / 997);
      finite &&= Number.isFinite(
        this.cloud[i] + this.humidity[i] + this.heat[i] + this.u[i] + this.v[i],
      );
    }
    return {
      steps: this.steps,
      time: this.time,
      cloudMass,
      humidityMass,
      peakSpeed,
      signature,
      condensed: this.condensed,
      rained: this.rained,
      finite,
      width: this.width,
      height: this.height,
    };
  }
}
