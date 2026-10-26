// Rule checks: the 08:00 commute gate, the hourly-average warning/downgrade clock and outcome tiers.
import assert from "node:assert/strict";
import {
  COMMUTE,
  DAY_END,
  DAY_START,
  ROUND,
  createObservatory,
  displayedSignal,
  elapsedAt,
  gameMinute,
  observe,
  outcome,
} from "../public/rules.js";

assert.equal(gameMinute(0), DAY_START);
assert.equal(gameMinute(elapsedAt(COMMUTE)), COMMUTE);
assert.equal(ROUND, 110, "07:00–18:00 at six game minutes per second");

// Run a wind schedule minute by minute; returns events with their minute.
function run(schedule, from = DAY_START, to = DAY_END) {
  const hko = createObservatory();
  const log = [];
  for (let m = from; m < to && !hko.downgraded; m++) {
    const wind = schedule(m);
    const live = wind >= 63 ? 8 : 3;
    for (const e of observe(hko, m, 1, wind, live)) log.push({ ...e, at: m });
  }
  return { hko, log };
}

// Live flicker before 08:00 is the live signal itself.
{
  const hko = createObservatory();
  observe(hko, 7 * 60 + 30, 1, 80, 8);
  assert.equal(displayedSignal(hko, 7 * 60 + 30, 8), 8);
  observe(hko, 7 * 60 + 31, 1, 30, 3);
  assert.equal(displayedSignal(hko, 7 * 60 + 31, 3), 3, "Pre-08:00 flips back");
  assert.equal(hko.hoisted, false);
}

// After 08:00 a single calm minute does not drop the signal.
{
  const { hko, log } = run((m) => (m === 9 * 60 ? 20 : 90));
  assert.equal(hko.downgraded, false);
  assert.equal(log.length, 0);
  assert.equal(displayedSignal(hko, 10 * 60, 3), 8, "No. 8 holds after 08:00");
}

// Calm from 10:00: warns when the hour average has been below 63 for 15 minutes,
// downgrades at 30, and the warning names the downgrade time.
{
  const { hko, log } = run((m) => (m < 10 * 60 ? 90 : 20));
  const warning = log.find((e) => e.type === "warning");
  const downgrade = log.find((e) => e.type === "downgrade");
  assert(warning && downgrade, "Warning then downgrade");
  assert.equal(downgrade.at - warning.at, 15);
  assert.equal(warning.downgradeAt, downgrade.at);
  // A 90→20 drop takes ~23 minutes to pull a 60-minute average below 63.
  assert(warning.at > 10 * 60 + 30 && warning.at < 10 * 60 + 45, warning.at);
  assert.equal(hko.downgraded, true);
  assert.equal(displayedSignal(hko, downgrade.at, 10), 3);
}

// Under the No. 3 warning a strong gust does not upgrade No. 8 to 9 or 10.
{
  const { hko } = run((m) => (m < 10 * 60 ? 90 : 20), DAY_START, 10 * 60 + 40);
  assert(hko.warned && !hko.downgraded, "Warning stands at 10:40");
  assert.equal(
    displayedSignal(hko, 10 * 60 + 40, 10),
    8,
    "No upgrade when warned",
  );
  const calm = run((m) => 90, DAY_START, 10 * 60);
  assert.equal(
    displayedSignal(calm.hko, 10 * 60, 10),
    10,
    "No. 10 without a warning",
  );
}

// Recovery after the warning cancels it and resets the clock.
{
  const { hko, log } = run((m) =>
    m < 10 * 60 ? 90 : m < 10 * 60 + 40 ? 20 : 200,
  );
  assert.deepEqual(
    log.map((e) => e.type),
    ["warning", "cancelled"],
  );
  assert.equal(hko.downgraded, false);
}

// A slow approach before the hoist does not drag the post-08:00 average down.
{
  const { hko, log } = run((m) => (m < 7 * 60 + 50 ? 20 : 70));
  assert.equal(hko.hoisted, true);
  assert.equal(log.length, 0, "Steady gales after a 07:50 hoist never warn");
  assert(hko.average >= 63);
}

// No No. 8 at 08:00: nothing is hoisted, so the observatory never runs.
{
  const { hko, log } = run(() => 40);
  assert.equal(hko.hoisted, false);
  assert.equal(log.length, 0);
}

// Outcome tiers.
assert.equal(outcome("commute").tier, "commute");
assert.deepEqual(outcome("downgrade", 11 * 60), {
  tier: "office",
  minute: 11 * 60,
  backBy: 13 * 60,
});
assert.equal(outcome("downgrade", 14 * 60 - 1).tier, "office");
assert.equal(outcome("downgrade", 14 * 60).tier, "wfh");
assert.equal(outcome("downgrade", 15 * 60).tier, "pass");
assert.equal(outcome("downgrade", 17 * 60 + 59).tier, "pass");
assert.equal(outcome("end").tier, "bigWin");

console.log(
  "PASS: 08:00 gate, pre-08:00 flicker, 15/30-minute hourly-average warning and downgrade, recovery, outcome tiers.",
);
