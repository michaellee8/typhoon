// Real-input visual playtest. Browser time is advanced; game state is read-only.
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright";
import { km } from "../public/geography.js";
import { COPY } from "../public/copy.js";
import { serve } from "./serve.mjs";
// Tests PREVIEW_URL if set, else serves public/ on a free local port.
const server = process.env.PREVIEW_URL ? null : await serve(0);
const url =
  process.env.PREVIEW_URL || `http://127.0.0.1:${server.address().port}/`;
const browser = await chromium.launch();
const errors = [];
const reports = [];
let captureNumber = 0;
await mkdir(new URL("../artifacts/", import.meta.url), { recursive: true });

async function runRound(page, mobile = false) {
  const label = mobile ? "mobile" : "desktop";
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  await page.clock.install();
  await page.goto(url);
  await page.waitForFunction(() => window.__typhoon?.snapshot().mapReady);
  await page.evaluate(() => localStorage.clear());
  await page.goto(url);
  await page.waitForFunction(() => window.__typhoon?.snapshot().mapReady);
  // From here page time only moves in runFor, so results don't depend on how
  // fast this machine renders.
  await page.clock.pauseAt((await page.evaluate(() => Date.now())) + 100);
  assert((await page.title()).startsWith("李氏力場"));
  assert((await page.title()).includes("Mr. Li's Force Field"));
  await page.clock.runFor(100);
  const snap = () => page.evaluate(() => window.__typhoon.snapshot());
  async function capture(name, fullPage = false) {
    const filename = `${String(captureNumber++).padStart(2, "0")}-${label}-${name}.png`;
    // Let CSS entrance animations (real time, not the fake clock) finish first.
    await page.waitForTimeout(450);
    await page.screenshot({
      path: new URL(`../artifacts/${filename}`, import.meta.url).pathname,
      fullPage,
    });
    const audit = await page.evaluate(() => window.__typhoon.auditVisuals());
    assert.deepEqual(audit.issues, [], JSON.stringify(audit));
    assert(audit.canvasRatio > 0.99 && audit.canvasRatio < 2.01);
    const report = { name: `${label}-${name}`, ...(await snap()) };
    assert(report.atmosphere?.finite, "Fluid and moisture fields stay finite");
    assert(
      report.atmosphere.peakSpeed < 1000,
      "The fluid does not develop an unstable velocity spike",
    );
    reports.push(report);
    console.log(JSON.stringify(report));
  }
  // A still for panels that cover the map on purpose (no covered-map audit).
  async function still(name) {
    const filename = `${String(captureNumber++).padStart(2, "0")}-${label}-${name}.png`;
    await page.waitForTimeout(450);
    await page.screenshot({
      path: new URL(`../artifacts/${filename}`, import.meta.url).pathname,
    });
  }
  async function click(id) {
    const p = await page.locator(`#${id}`).evaluate((el) => {
      el.scrollIntoView({ block: "nearest" });
      const r = el.getBoundingClientRect();
      const x = r.x + r.width / 2,
        y = r.y + r.height / 2;
      if (!el.contains(document.elementFromPoint(x, y)))
        throw new Error(`${el.id} is covered`);
      return { x, y };
    });
    if (mobile) await page.touchscreen.tap(p.x, p.y);
    else await page.mouse.click(p.x, p.y);
    await page.clock.runFor(50); // let the next frame render the change
  }
  const assertCanvas = async (p) =>
    assert.equal(
      await page.evaluate((p) => document.elementFromPoint(p.x, p.y)?.id, p),
      "map",
    );
  if (mobile) {
    await click("lang");
    assert.equal((await snap()).lang, "en");
    assert.equal(await page.locator("html").getAttribute("lang"), "en-HK");
    assert((await page.title()).startsWith("Mr. Li's Force Field"));
  }
  await capture("ready");
  const idleAtmosphere = (await snap()).atmosphere;
  assert(idleAtmosphere?.finite, "Live atmosphere must be available");
  await page.clock.runFor(1500);
  await page.waitForFunction(
    (steps) => window.__typhoon.snapshot().atmosphere.steps > steps,
    idleAtmosphere.steps,
  );
  const evolvedAtmosphere = (await snap()).atmosphere;
  assert(
    evolvedAtmosphere.steps > idleAtmosphere.steps,
    "Atmosphere advances with a stationary cyclone",
  );
  assert.notEqual(
    evolvedAtmosphere.signature,
    idleAtmosphere.signature,
    "Stationary cloud density evolves instead of rotating a fixed image",
  );
  assert(
    evolvedAtmosphere.condensed > 0,
    "Clouds condense from simulated moisture",
  );
  await capture("cloud-evolution");
  await click("help");
  assert(await page.locator("#help-dialog").evaluate((el) => el.open));
  await capture("help");
  await page.keyboard.press("Escape");
  await click("start");
  if (!mobile) {
    await page.keyboard.down("ArrowUp");
    for (let i = 0; i < 85 && (await snap()).landFraction === 0; i++)
      await page.clock.runFor(50);
    await page.keyboard.up("ArrowUp");
    const partial = await snap();
    assert(partial.landFraction > 0 && partial.landFraction < 0.1);
    assert.equal(
      partial.centreOnLand,
      false,
      "Outer storm contact precedes centre landfall",
    );
    assert(partial.energyRate < 0);
    await page.clock.runFor(200);
    assert(
      (await snap()).energy < partial.energy,
      "Partial contact must immediately weaken the storm",
    );
    await capture("partial-land-contact");
    await page.keyboard.down("ArrowUp");
    for (let i = 0; i < 35 && (await snap()).landFraction < 0.3; i++)
      await page.clock.runFor(100);
    await page.keyboard.up("ArrowUp");
    const deep = await snap();
    assert(deep.landFraction > 0.25);
    assert(
      deep.energyRate < partial.energyRate,
      "Greater exposure must drain faster",
    );
    await capture("heavy-land-contact");
    await page.keyboard.down("ArrowDown");
    for (let i = 0; i < 70 && (await snap()).landFraction > 0; i++)
      await page.clock.runFor(100);
    await page.keyboard.up("ArrowDown");
    const sea = await snap();
    assert.equal(sea.energyRate, 22.5);
    await page.clock.runFor(200);
    const recovered = await snap();
    if (sea.hits === recovered.hits)
      assert(
        recovered.energy >= Math.min(100, sea.energy + 1),
        "Open water recharges quickly",
      );
    await capture("sea-recovery");
    await click("pause");
    await click("restart-paused");
  }
  const before = await snap();
  await assertCanvas(before.screenStorm);
  const touch = mobile ? await page.context().newCDPSession(page) : null;
  if (touch) {
    await touch.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ ...before.screenStorm, id: 0 }],
    });
    const steer = {
      x: before.screenStorm.x - 50,
      y: before.screenStorm.y - 70,
    };
    await touch.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ ...steer, id: 0 }],
    });
    // Multi-touch: a second finger boosts while the first keeps steering.
    const boostAt = await page.locator("#boost").evaluate((el) => {
      const r = el.getBoundingClientRect();
      const p = { x: r.x + r.width / 2, y: r.y + r.height / 2 };
      if (!el.contains(document.elementFromPoint(p.x, p.y)))
        throw new Error("boost is covered");
      return p;
    });
    await touch.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [
        { ...steer, id: 0 },
        { ...boostAt, id: 1 },
      ],
    });
    await page.clock.runFor(100);
    assert.equal((await snap()).boosts, 1, "A second finger boosts mid-drag");
  } else {
    await page.mouse.move(before.screenStorm.x, before.screenStorm.y);
    await page.mouse.down();
    await page.mouse.move(
      before.screenStorm.x - 70,
      before.screenStorm.y - 90,
      { steps: 8 },
    );
  }
  await page.clock.runFor(1000);
  if (touch)
    await touch.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
  else await page.mouse.up();
  assert((await snap()).y < before.y - km(18), `${label} drag moves the storm`);
  await capture("steering");
  await click("pause");
  const pausedAt = (await snap()).elapsed;
  const pausedAtmosphere = (await snap()).atmosphere;
  await page.clock.runFor(1500);
  assert.equal((await snap()).elapsed, pausedAt, "Pause freezes time");
  assert.equal(
    (await snap()).atmosphere.steps,
    pausedAtmosphere.steps,
    "Pause freezes fluid integration",
  );
  assert.equal(
    (await snap()).atmosphere.signature,
    pausedAtmosphere.signature,
    "Pause freezes cloud water",
  );
  await capture("paused");
  await click("resume");
  if (!mobile) await page.keyboard.press("Space");
  assert.equal((await snap()).boosts, 1, "Boost works");
  if (mobile) {
    // Compact layout: the status strip and the forum bar open and fold.
    const isOpen = (id) =>
      page.locator(`#${id}`).evaluate((el) => el.classList.contains("open"));
    await click("status-toggle");
    assert(await isOpen("status-card"), "Status strip opens");
    assert(await page.locator("#avg-note").isVisible());
    await still("status-open");
    await click("status-toggle");
    assert(!(await isOpen("status-card")), "Status strip folds");
    // Posts arrive over game time; wait for a thread worth opening.
    const posts = page.locator("#forum-posts li");
    for (let i = 0; i < 80 && (await posts.count()) < 2; i++)
      await page.clock.runFor(250);
    const latest = (await snap()).forum.latest;
    assert(
      (await page.locator("#forum-latest").textContent()).includes(latest),
      "The forum bar shows the newest post",
    );
    await click("forum-latest");
    assert(
      await isOpen("forum-card"),
      "Tapping the forum bar opens the thread",
    );
    assert((await posts.count()) > 1);
    await still("forum-open");
    await click("forum-toggle");
    assert(!(await isOpen("forum-card")), "Forum folds back to its bar");
  }
  // Wait for the next pulse: the panel checks above take real time, so an
  // earlier pulse (and its one-second push) may already be over.
  for (let i = 0; i < 40 && !(await snap()).boss.pushing; i++)
    await page.clock.runFor(250);
  const bossPulse = await snap();
  assert(bossPulse.boss.pushing, "The boss pushes when the force field pulses");
  assert(bossPulse.boss.line, "The boss calls out each pulse");
  await capture("boss-pulse");

  // The autopilot steers with real keys (desktop) or a held touch drag (phone)
  // towards a point on a ring around Hong Kong; `plan` picks the ring radius.
  let held = new Set();
  const bossLines = [];
  let anchor = null;
  async function release() {
    if (touch && anchor)
      await touch.send("Input.dispatchTouchEvent", {
        type: "touchEnd",
        touchPoints: [],
      });
    anchor = null;
    for (const key of held) await page.keyboard.up(key);
    held = new Set();
  }
  async function fly(plan, { until = () => false, shots = {} } = {}) {
    let recharging = false;
    for (let i = 0; i < 900; i++) {
      const s = await snap();
      if (s.mode !== "playing" || until(s)) break;
      if (s.energy < 88) recharging = true;
      if (recharging && s.energy > 98) recharging = false;
      if (s.landFraction > 0) assert(s.energyRate < 0);
      else assert.equal(s.energyRate, 22.5);
      const radius = plan(s, recharging);
      const angle = 1.1;
      const dx = s.hongKong.x + Math.cos(angle) * radius - s.x,
        dy = s.hongKong.y + Math.sin(angle) * radius - s.y;
      if (touch) {
        if (!anchor) {
          anchor = await page.locator("#map").evaluate((el) => {
            const r = el.getBoundingClientRect();
            return { x: r.x + r.width * 0.5, y: r.y + r.height * 0.63 };
          });
          await assertCanvas(anchor);
          await touch.send("Input.dispatchTouchEvent", {
            type: "touchStart",
            touchPoints: [anchor],
          });
        }
        const len = Math.max(1, Math.hypot(dx, dy) / 48);
        await touch.send("Input.dispatchTouchEvent", {
          type: "touchMove",
          touchPoints: [{ x: anchor.x + dx / len, y: anchor.y + dy / len }],
        });
      } else {
        const next = new Set();
        if (dx > km(4)) next.add("ArrowRight");
        if (dx < -km(4)) next.add("ArrowLeft");
        if (dy > km(4)) next.add("ArrowDown");
        if (dy < -km(4)) next.add("ArrowUp");
        for (const key of held) if (!next.has(key)) await page.keyboard.up(key);
        for (const key of next)
          if (!held.has(key)) await page.keyboard.down(key);
        held = next;
      }
      await page.clock.runFor(200);
      const after = await snap();
      if (after.boss.line)
        bossLines.push({ minute: after.minute, line: after.boss.line });
      for (const [name, when] of Object.entries(shots))
        if (when(after)) {
          delete shots[name];
          await capture(name);
        }
    }
    await release();
    return snap();
  }
  // Short, frequent top-ups just off the coast keep the hourly average above gale
  // force (a long trip to open sea lets it sag into a warning).
  const hold = (s, recharging) => km(recharging ? 200 : 120);
  const restart = async () => {
    await click("restart");
    const fresh = await snap();
    assert.equal(fresh.mode, "playing");
    assert.equal(fresh.clock, "07:00", "Restart rewinds the day to 07:00");
    assert.equal(fresh.boosts, 0, "Restart resets boost");
    assert(fresh.atmosphere.steps < 10, "Restart resets the physical fields");
  };
  async function shareChecks(tier) {
    const result = await snap();
    assert.equal(result.result.tier, tier);
    assert.equal(
      await page.locator("#result-tip").isVisible(),
      !["pass", "bigWin"].includes(tier),
      "Only failed rounds show the tip",
    );
    assert(
      (await page.locator("#share-whatsapp").getAttribute("href")).startsWith(
        "https://wa.me/?text=",
      ),
    );
    assert(
      (await page.locator("#share-threads").getAttribute("href")).startsWith(
        "https://www.threads.net/intent/post?text=",
      ),
    );
    const download = page.waitForEvent("download", { timeout: 15000 });
    await click("share-download");
    const file = await download;
    await file.saveAs(
      new URL(`../artifacts/card-${label}-${tier}.png`, import.meta.url)
        .pathname,
    );
    // Without Web Share (desktop Linux), Instagram downloads the card and opens IG.
    const igDownload = page.waitForEvent("download", { timeout: 15000 });
    const igTab = page.context().waitForEvent("page", { timeout: 15000 });
    await click("share-instagram");
    await igDownload;
    const tab = await igTab;
    assert.match(tab.url(), /instagram\.com|about:blank/);
    await tab.close();
    assert(
      (await page.locator("#share-status").textContent()).length > 0,
      "Instagram says where the image went",
    );
    // No track ships, so the music button is hidden; sound toggles off and on.
    assert(!(await page.locator("#music").isVisible()), "No music button");
    await click("sound");
    assert.equal((await snap()).sound.on, false, "Sound mutes");
    await click("sound");
    assert((await snap()).sound.on, "Sound turns back on");
    await click("share-copy");
    assert(
      (await page.locator("#share-status").textContent()).length > 0,
      "Copy shows the share text or a confirmation",
    );
  }

  // Office: No. 8 at 08:00, then the storm leaves; the Observatory warns and
  // downgrades well before 14:00, so it's back to the office.
  await click("pause");
  await click("restart-paused");
  let s = await fly(hold, {
    until: (s) => s.minute >= 8 * 60 + 5,
    shots: { "eight-am": (s) => s.minute >= 8 * 60 },
  });
  assert(s.hko.hoisted, `${label}: No. 8 is up by 08:00`);
  assert(s.sound.on, "Sound is on during a round");
  assert(s.signal >= 8);
  if (s.signal === 8)
    assert.match(s.signalKey, /^8(NE|SE|SW|NW)$/, "No. 8 carries a direction");
  assert.equal(
    await page.locator("#signal-icon svg path").count(),
    1,
    "The HUD shows the HKO symbol, not a number",
  );
  assert.equal((await page.locator("#signal-icon").textContent()).trim(), "");
  assert(s.forum.count > 1, "The forum thread reacts");
  assert(s.headline, "The ticker carries a headline");
  s = await fly(() => km(560), {
    until: (s) => s.hko.warned,
  });
  assert(s.hko.warned, "The Observatory warns before downgrading");
  assert(s.notice, "The warning shows as an announcement");
  for (let i = 0; i < 20 && !s.sound.voice; i++) {
    await page.clock.runFor(50);
    s = await snap();
  }
  assert.match(
    s.sound.voice ?? "",
    /^audio\/hko\/warning-\d\.mp3$/,
    "The Observatory's warning is voiced",
  );
  await capture("hko-warning");
  s = await fly(() => km(560));
  assert.equal(s.mode, "over", JSON.stringify(s));
  assert.equal(s.result.tier, "office", JSON.stringify(s.result));
  assert(s.result.minute < 14 * 60);
  await capture("result-office");
  await shareChecks("office");

  // Commute: never reach Hong Kong, so there is no No. 8 at 08:00.
  await restart();
  await page.clock.runFor(11000);
  s = await snap();
  assert.equal(s.mode, "over");
  assert.equal(s.result.tier, "commute");
  assert.equal(s.heldUntil, null);
  await capture("result-commute");

  // The full day: hold No. 8 from 08:00, past the 14:00 WFH call and 15:00.
  await restart();
  let sawContact = false;
  s = await fly(
    (s, recharging) => {
      if (s.landFraction > 0) sawContact = true;
      return hold(s, recharging);
    },
    {
      shots: {
        "playing-0930": (s) => s.minute >= 9 * 60 + 30,
        "wfh-call": (s) => s.minute >= 14 * 60 && s.minute < 14 * 60 + 20,
        "pass-1500": (s) => s.minute >= 15 * 60 && s.minute < 15 * 60 + 20,
      },
    },
  );
  assert.equal(s.mode, "over");
  assert(
    ["pass", "bigWin"].includes(s.result.tier),
    `${label} autopilot passes; got ${JSON.stringify(s.result)}`,
  );
  assert(s.hits > 0, "Pulses exercised collisions");
  assert(sawContact, "The wind footprint exercised partial land contact");
  // From 14:00 the boss stops telling everyone to come in (a bubble lasts ~11
  // game minutes, so allow a line said just before 14:00 to finish).
  const commuteLines = new Set(
    [...COPY.boss.pulse, ...COPY.boss.hit].flatMap((l) => [l.zh, l.en]),
  );
  const afternoon = bossLines.filter((b) => b.minute >= 14 * 60 + 12);
  assert(afternoon.length > 0, "The boss speaks in the afternoon");
  assert(
    afternoon.every((b) => !commuteLines.has(b.line)),
    `Afternoon boss lines moved on: ${JSON.stringify(afternoon.filter((b) => commuteLines.has(b.line)))}`,
  );
  await capture(`result-${s.result.tier}`);
  await shareChecks(s.result.tier);
  if (mobile) {
    await page.setViewportSize({ width: 844, height: 390 });
    await page.clock.runFor(100);
    await capture("landscape", true);
  }
}

const desktop = await browser.newContext({
  viewport: { width: 1360, height: 1000 },
  locale: "zh-HK",
  acceptDownloads: true,
});
await runRound(await desktop.newPage());
await desktop.close();
const phone = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
  locale: "zh-HK",
  acceptDownloads: true,
});
await runRound(await phone.newPage(), true);
await phone.close();
assert.deepEqual(errors, [], "No console or page errors");
await writeFile(
  new URL("../artifacts/report.json", import.meta.url),
  JSON.stringify({ errors, reports }, null, 2),
);
console.log(
  `PASS: ${reports.length} visual checkpoints; mouse, keyboard, touch, 08:00 gate, HKO warning and downgrade, office/commute/pass endings, both languages, pause, boost, restart and share.`,
);
await browser.close();
server?.close();
