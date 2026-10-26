// Game wind field; centre-wind classes and local signal thresholds follow HKO.
import { CLOUD_RADIUS, MAX_WIND_RADIUS, km, project } from "./geography.js";
export const stormRadius = () => CLOUD_RADIUS;
export const centreWind = (energy) => Math.max(0, Math.round(energy * 2.2));
// Land drain is 5.625× the original 0.15 + 2.4 × coverage (+25%, +50%, then
// tripled); open sea recharges 22.5 a second (12 → 9 → ×2.5).
export const SEA_RECHARGE = 22.5;
export const energyRate = (coverage) =>
  coverage > 0 ? -(0.84375 + coverage * 13.5) : SEA_RECHARGE;

export function classification(wind) {
  if (wind >= 185) return "超強颱風";
  if (wind >= 150) return "強颱風";
  if (wind >= 118) return "颱風";
  if (wind >= 88) return "強烈熱帶風暴";
  if (wind >= 63) return "熱帶風暴";
  if (wind >= 41) return "熱帶低氣壓";
  return "低壓區";
}

// Representative regions, not the Observatory's real anemometer network.
export const HK_REGIONS = [
  ["香港島", 114.2, 22.25],
  ["九龍", 114.18, 22.32],
  ["新界東", 114.2, 22.48],
  ["新界西", 114.0, 22.44],
  ["大嶼山", 113.95, 22.27],
  ["長洲", 114.03, 22.21],
  ["西貢", 114.27, 22.38],
  ["橫瀾島", 114.3, 22.18],
].map(([name, longitude, latitude]) => ({
  name,
  ...project(longitude, latitude),
}));

export function windAtDistance(maxWind, radius, distance) {
  if (distance >= radius) return 0;
  if (distance < MAX_WIND_RADIUS) return (maxWind * distance) / MAX_WIND_RADIUS;
  // Decaying outer winds, smoothly tapering after 150 km to the outer circulation.
  // Gale extent therefore depends on wind speed, not the visible cloud edge.
  const taper = Math.min(1, (radius - distance) / (radius - km(150)));
  return maxWind * (MAX_WIND_RADIUS / distance) ** 0.65 * taper;
}

export function hongKongWind(x, y, energy) {
  const radius = stormRadius(energy);
  const maximum = centreWind(energy);
  const regional = HK_REGIONS.map((p) =>
    windAtDistance(maximum, radius, Math.hypot(p.x - x, p.y - y)),
  ).sort((a, b) => a - b);
  return { sustained: (regional[3] + regional[4]) / 2, peak: regional[7] };
}

export function warningSignal(localWind, forecastWind = localWind) {
  if (localWind >= 118) return 10;
  if (localWind >= 63)
    return forecastWind >= 118 && forecastWind - localWind >= 15 ? 9 : 8;
  return localWind >= 41 ? 3 : 1;
}

// Signed triangle/sector integration gives the actual circle/polygon overlap,
// including tiny coastal slivers and islands wholly inside the storm circle.
const ringBounds = new WeakMap();
export function landCoverage(x, y, radius, polygons) {
  const r2 = radius * radius;
  let total = 0;
  for (const ring of polygons) {
    // Coast rings are immutable; reject distant islands before exact integration.
    let bounds = ringBounds.get(ring);
    if (!bounds) {
      bounds = [Infinity, Infinity, -Infinity, -Infinity];
      for (const [px, py] of ring) {
        bounds[0] = Math.min(bounds[0], px);
        bounds[1] = Math.min(bounds[1], py);
        bounds[2] = Math.max(bounds[2], px);
        bounds[3] = Math.max(bounds[3], py);
      }
      ringBounds.set(ring, bounds);
    }
    if (
      x + radius < bounds[0] ||
      x - radius > bounds[2] ||
      y + radius < bounds[1] ||
      y - radius > bounds[3]
    )
      continue;
    let area = 0;
    for (let i = 0; i < ring.length; i++) {
      const a = ring[i],
        b = ring[(i + 1) % ring.length];
      const ax = a[0] - x,
        ay = a[1] - y,
        bx = b[0] - x,
        by = b[1] - y;
      const dx = bx - ax,
        dy = by - ay;
      const length2 = dx * dx + dy * dy;
      if (!length2) continue;
      const dot = ax * dx + ay * dy;
      const discriminant = dot * dot - length2 * (ax * ax + ay * ay - r2);
      const cuts = [0, 1];
      if (discriminant > 0) {
        const root = Math.sqrt(discriminant);
        for (const t of [(-dot - root) / length2, (-dot + root) / length2])
          if (t > 0 && t < 1) cuts.push(t);
      }
      cuts.sort((a, b) => a - b);
      for (let j = 1; j < cuts.length; j++) {
        const t0 = cuts[j - 1],
          t1 = cuts[j],
          middle = (t0 + t1) / 2;
        const ux = ax + dx * t0,
          uy = ay + dy * t0,
          vx = ax + dx * t1,
          vy = ay + dy * t1;
        const mx = ax + dx * middle,
          my = ay + dy * middle;
        const cross = ux * vy - uy * vx;
        area +=
          mx * mx + my * my < r2
            ? cross / 2
            : (r2 * Math.atan2(cross, ux * vx + uy * vy)) / 2;
      }
    }
    total += Math.abs(area);
  }
  const fraction = total / (Math.PI * r2);
  // Remove floating-point cancellation noise from completely disjoint polygons.
  return fraction < 1e-10 ? 0 : Math.min(1, fraction);
}
