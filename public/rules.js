// Monday rules. The day runs 07:00–18:00 at six game minutes per real second.
// 08:00: No. 8 must already be up, or everyone commutes. From then on the signal
// only drops through the Observatory: when the past hour's average local wind has
// (since No. 8 was hoisted) stayed under gale force (63 km/h) for 15 minutes it warns, and at 30 minutes it
// replaces No. 8 with No. 3. Downgrade time decides the outcome (research/typhoon-work-rules.md).
export const DAY_START = 7 * 60;
export const COMMUTE = 8 * 60;
export const WFH_CALL = 14 * 60;
export const PASS = 15 * 60;
export const DAY_END = 18 * 60;
export const MINUTES_PER_SECOND = 6;
export const ROUND = (DAY_END - DAY_START) / MINUTES_PER_SECOND;
export const GALE = 63;
export const AVERAGE_WINDOW = 60;
export const WARN_AFTER = 15;
export const DOWNGRADE_AFTER = 30;
export const RETURN_WITHIN = 120;

export const gameMinute = (elapsed) =>
  Math.min(DAY_END, DAY_START + elapsed * MINUTES_PER_SECOND);
export const elapsedAt = (minute) => (minute - DAY_START) / MINUTES_PER_SECOND;
export const clock = (minute) => {
  const m = Math.floor(minute + 1e-6);
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
};

export function createObservatory() {
  return {
    samples: [],
    average: 0,
    below: 0,
    warned: false,
    downgradeAt: null,
    hoisted: false,
    downgraded: false,
  };
}

// Feed one step of local wind. Returns the events that fired in this step.
export function observe(hko, minute, minutes, localWind, liveSignal) {
  const events = [];
  // The average covers the wind since No. 8 went up (at most an hour), so a slow
  // approach before the hoist does not count against it after 08:00.
  if (minute < COMMUTE && liveSignal >= 8 && !hko.hoisted) hko.samples = [];
  hko.samples.push({ minute, minutes, wind: localWind });
  while (hko.samples.length && hko.samples[0].minute <= minute - AVERAGE_WINDOW)
    hko.samples.shift();
  let weight = 0;
  let sum = 0;
  for (const s of hko.samples) {
    weight += s.minutes;
    sum += s.wind * s.minutes;
  }
  hko.average = weight > 0 ? sum / weight : localWind;
  if (hko.downgraded) return events;
  if (minute < COMMUTE) {
    hko.hoisted = liveSignal >= 8;
    return events;
  }
  if (!hko.hoisted) return events;
  if (hko.average < GALE) {
    hko.below += minutes;
    if (!hko.warned && hko.below >= WARN_AFTER) {
      hko.warned = true;
      hko.downgradeAt = minute + (DOWNGRADE_AFTER - hko.below);
      events.push({ type: "warning", downgradeAt: hko.downgradeAt });
    }
    if (hko.below >= DOWNGRADE_AFTER) {
      hko.downgraded = true;
      events.push({ type: "downgrade", minute });
    }
  } else {
    if (hko.warned) events.push({ type: "cancelled" });
    hko.below = 0;
    hko.warned = false;
    hko.downgradeAt = null;
  }
  return events;
}

// Before 08:00 the signal follows the live wind; after it, No. 8 holds (9/10 can
// still flash on top) until the Observatory downgrades. While the No. 3 warning
// stands it stays at No. 8: a gust does not upgrade a signal about to come down.
export function displayedSignal(hko, minute, liveSignal) {
  if (hko.downgraded) return 3;
  if (minute < COMMUTE || !hko.hoisted) return liveSignal;
  if (hko.warned) return 8;
  return Math.max(8, liveSignal);
}

// Outcome of a finished day. reason: "commute" (no No. 8 at 08:00),
// "downgrade" (No. 3 at `minute`) or "end" (18:00 with No. 8 still up).
export function outcome(reason, minute) {
  if (reason === "commute") return { tier: "commute", minute: COMMUTE };
  if (reason === "end" || minute >= DAY_END)
    return { tier: "bigWin", minute: DAY_END };
  if (minute < WFH_CALL)
    return {
      tier: "office",
      minute,
      backBy: minute + RETURN_WITHIN,
    };
  if (minute < PASS) return { tier: "wfh", minute };
  return { tier: "pass", minute };
}

export const PASSED = new Set(["pass", "bigWin"]);
