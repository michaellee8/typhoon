// Local equirectangular projection, calibrated at 22°N. Distances share one scale.
// ponytail: east/west distance accuracy varies ~5% across this regional map;
// a globe projection is the upgrade if the playable area expands further.
export const KM_PER_UNIT = 1.45;
export const km = (distance) => distance / KM_PER_UNIT;
const DEGREE_KM = 111.195;
const LONGITUDE_KM = DEGREE_KM * Math.cos((22 * Math.PI) / 180);
export const BOUNDS = [
  108,
  26 - (840 * KM_PER_UNIT) / DEGREE_KM,
  108 + (1000 * KM_PER_UNIT) / LONGITUDE_KM,
  26,
];
export const project = (longitude, latitude) => ({
  x: ((longitude - BOUNDS[0]) * LONGITUDE_KM) / KM_PER_UNIT,
  y: ((BOUNDS[3] - latitude) * DEGREE_KM) / KM_PER_UNIT,
});
export const HK = project(114.1667, 22.2667);
// Compact mature cyclone, not a universal typhoon size. See research/typhoon-size.md.
export const EYE_RADIUS = km(15);
export const MAX_WIND_RADIUS = km(30);
export const CLOUD_RADIUS = km(225);
// Gameplay land-contact footprint, separate from the visible cloud shield.
export const LAND_CONTACT_RADIUS = km(140);
export const START = project(116.6, 19.5);
