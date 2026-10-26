// 李氏力場 / Mr. Li's Force Field: steer a typhoon so No. 8 is up by 08:00 and stays
// up as late as possible. Rules (timing, the Observatory's hourly average) live in rules.js.
import {
  centreWind,
  classification,
  energyRate,
  landCoverage,
  hongKongWind,
  warningSignal,
} from "./weather.js";
import { terrainTexture, createSatellite } from "./satellite.js";
import { bossImages, bossSvgUrl } from "./boss.js";
import { hkoSvgUrl } from "./hko.js";
import { COPY } from "./copy.js";
import { createFeed, createPicker } from "./feed.js";
import { detectLang, getLang, say, setLang, stormClass, t } from "./i18n.js";
import { renderCard, shareLinks } from "./share.js";
import { setContext, track } from "./analytics.js";
import {
  duckMusic,
  hasMusic,
  musicPlaying,
  pauseMusic,
  preloadVoices,
  resumeMusic,
  setSound,
  setMusic,
  musicOn,
  sfx,
  soundOn,
  startMusic,
  stopVoice,
  voice,
  voicePlaying,
} from "./audio.js";
import { drawSignal, galeDirection, signalKey, signalSvg } from "./signals.js";
import {
  COMMUTE,
  DAY_END,
  DAY_START,
  PASS,
  WFH_CALL,
  clock,
  createObservatory,
  displayedSignal,
  gameMinute,
  observe,
  outcome,
} from "./rules.js";
import {
  HK,
  START,
  km,
  project,
  KM_PER_UNIT,
  LAND_CONTACT_RADIUS,
} from "./geography.js";
const $ = (id) => document.getElementById(id);
const canvas = $("map");
const ctx = canvas.getContext("2d");
const viewport = $("viewport");
const TAU = Math.PI * 2;
// A force-field hit: knockback (km/s added to the drift) and energy lost.
const HIT_SHOVE = 400;
const HIT_ENERGY = 8;
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
let state;
let camera = {
  scale: 1,
  x: 0,
  y: 0,
  w: 1000,
  h: 840,
  safe: { left: 0, top: 0, right: 1000, bottom: 840 },
};
let pointer = null;
let last = 0;
let hudTime = 0;
let helpPaused = false;
let typhoonIndex = Math.floor(Math.random() * COPY.typhoonNames.length);
const keys = new Set();
const terrain = document.createElement("canvas");
terrain.width = 1000;
terrain.height = 840;
const terrainCtx = terrain.getContext("2d");
let land = new Path2D();
let landPolygons = [];
let mapReady = false;
let loadFailed = false;
let satellite;
const feed = createFeed({
  posts: $("forum-posts"),
  title: $("thread-title"),
  reading: $("forum-reading"),
  ticker: $("ticker-text"),
  latest: $("forum-latest"),
  tickerTime: $("ticker-time"),
});
let pick = createPicker();

// Outcome tiers → copy banks, the boss's face and the forum's reaction.
const TIERS = {
  commute: {
    label: "tierCommute",
    title: "eightAmFail",
    boss: "hit",
    pose: "gloat",
    forum: "eightAmFail",
    text: "outcomeCommute",
  },
  office: {
    label: "tierOffice",
    title: "downgradeBefore2",
    boss: "downgradeBefore2",
    pose: "gloat",
    forum: "downgradeBefore2",
    text: "outcomeOffice",
  },
  wfh: {
    label: "tierWfh",
    title: "downgrade2to3",
    boss: "twoPmWfh",
    pose: "smug",
    forum: "downgrade2to3",
    text: "outcomeWfh",
  },
  pass: {
    label: "tierPass",
    title: "pass",
    boss: "threePmPass",
    pose: "sour",
    forum: "downgradeAfter3",
    text: "outcomePass",
  },
  bigWin: {
    label: "tierBigWin",
    title: "bigWin",
    boss: "sixPmBigWin",
    pose: "sour",
    forum: "sixPmBigWin",
    text: "outcomeBigWin",
  },
};

const END_SOUND = {
  commute: "alarm",
  office: "wahwah",
  wfh: "uhoh",
  pass: "party",
  bigWin: "party",
};

function freshState() {
  return {
    mode: "ready",
    elapsed: 0,
    minute: DAY_START,
    energy: 78,
    ...START,
    vx: 0,
    vy: 0,
    signal: 1,
    liveSignal: 1,
    galeDir: null,
    wind: 0,
    boost: 0,
    cooldown: 0,
    pulses: [],
    nextPulse: 5,
    bossPush: 0,
    bossLine: null,
    bossLineUntil: 0,
    bossPose: null,
    bossPoseUntil: 0,
    hits: 0,
    boosts: 0,
    dodges: 0,
    trail: [],
    onLand: false,
    landFraction: 0,
    energyRate: energyRate(0),
    maxWind: centreWind(78),
    localPeak: 0,
    hko: createObservatory(),
    nextPost: 4,
    lastPost: {},
    flags: {},
    notice: null,
    result: null,
  };
}

const typhoon = () => COPY.typhoonNames[typhoonIndex];
const typhoonName = () => say(typhoon());

function randomEntry(bank, key) {
  return bank[pick(key, bank)];
}

// Forum posts are throttled per bank so a flickering signal does not spam the thread.
function post(bank, { every = 3, hot = false } = {}) {
  if (state.elapsed - (state.lastPost[bank] ?? -99) < every) return;
  state.lastPost[bank] = state.elapsed;
  state.nextPost = state.elapsed + 5 + Math.random() * 4;
  feed.post(bank, state.minute, { hot });
}

function once(flag) {
  if (state.flags[flag]) return false;
  state.flags[flag] = true;
  return true;
}

// Pulse and hit lines follow the day: from 14:00 the boss wants No. 8 down so
// everyone works from home; after 15:00 the day is lost and he sulks.
function bossBank(bank) {
  if (state.minute >= PASS) return `${bank}Pass`;
  if (state.minute >= WFH_CALL) return `${bank}Wfh`;
  return bank;
}

function bossSay(bank, pose = null, seconds = 1.8) {
  state.bossLine = randomEntry(COPY.boss[bank], `boss.${bank}`);
  state.bossLineUntil = state.elapsed + seconds;
  if (pose) {
    state.bossPose = pose;
    state.bossPoseUntil = state.elapsed + seconds;
  }
}

// The announcement strip over the top of the map. `render` returns its text in
// the current language, so a language switch redraws it.
function notice(face, render, seconds = 7) {
  state.notice = { face, render, until: state.elapsed + seconds };
  renderNotice();
}

// The Observatory's voiced announcements: Cantonese clips with no typhoon name
// or time in them (scripts/build-hko-voice.mjs): No. 8 at 08:00, then one per
// warning/cancel line.
const HKO_VOICES = [
  "audio/hko/eight-am.mp3",
  ...COPY.hko.warning.map((_, i) => `audio/hko/warning-${i}.mp3`),
  ...COPY.hko.cancelled.map((_, i) => `audio/hko/cancelled-${i}.mp3`),
];

// Voices the announcement just shown and keeps its strip up until it is read.
function announce(clip, delay = 0.7) {
  const shown = state.notice;
  voice(`audio/hko/${clip}.mp3`, delay).then((seconds) => {
    if (seconds && state.notice === shown && state.mode === "playing")
      shown.until = Math.max(shown.until, state.elapsed + seconds + 0.3);
  });
}

function renderNotice() {
  const n = state?.notice;
  const visible = n && state.mode !== "ready" && state.elapsed < n.until;
  $("notice").classList.toggle("hidden", !visible);
  if (!visible) return;
  const { eyebrow, title, body } = n.render();
  if ($("notice-face").src !== n.face) $("notice-face").src = n.face;
  $("notice-eyebrow").textContent = eyebrow;
  $("notice-title").textContent = title;
  $("notice-body").textContent = body ?? "";
  $("notice-body").hidden = !body;
  // A tall announcement under the top panels would hide Hong Kong (phones):
  // then it sits at the bottom of the map instead.
  const el = $("notice");
  const top = camera.safe.top + 10;
  const hk = HK.y * camera.scale + camera.y;
  el.classList.toggle("low", hk > top - 30 && hk < top + el.offsetHeight + 30);
}

function releaseControls() {
  keys.clear();
  pointer = null;
}

function start() {
  state = freshState();
  pick = createPicker();
  typhoonIndex =
    (typhoonIndex + 1 + Math.floor(Math.random() * 3)) %
    COPY.typhoonNames.length;
  satellite.reset(state);
  state.mode = "playing";
  stopVoice();
  startMusic();
  preloadVoices(HKO_VOICES);
  releaseControls();
  feed.reset(typhoonIndex);
  feed.post("intro", state.minute);
  feed.news("start", state.minute);
  $("overlay").classList.add("hidden");
  for (const id of ["intro-card", "pause-card", "result-card"])
    $(id).classList.add("hidden");
  $("pause").disabled = false;
  $("share-status").textContent = "";
  shareCache = null;
  renderNames();
  renderNotice();
  hud();
  canvas.focus({ preventScroll: true });
  setContext({ typhoon: typhoon().en });
  track("game_start", { lang: getLang() });
}

function pause() {
  if (state.mode !== "playing") return;
  state.mode = "paused";
  pauseMusic();
  stopVoice();
  satellite.pause();
  releaseControls();
  $("overlay").classList.remove("hidden");
  $("pause-card").classList.remove("hidden");
  $("resume").focus({ preventScroll: true });
  hud();
}

function resume() {
  if (state.mode !== "paused") return;
  state.mode = "playing";
  resumeMusic();
  satellite.resume();
  $("overlay").classList.add("hidden");
  $("pause-card").classList.add("hidden");
  canvas.focus({ preventScroll: true });
  hud();
}

// reason: "commute" (no No. 8 at 08:00), "downgrade", "energy" (the storm fell
// apart: before 08:00 that is a commute, after it an immediate downgrade) or "end".
function end(reason) {
  const hoisted = state.hko.hoisted && state.minute >= COMMUTE;
  const result = outcome(
    reason === "energy" ? (hoisted ? "downgrade" : "commute") : reason,
    state.minute,
  );
  const tier = TIERS[result.tier];
  state.result = {
    ...result,
    reason,
    titleIndex: pick(`results.${tier.title}`, COPY.results[tier.title]),
    commentIndex: pick(`boss.${tier.boss}`, COPY.boss[tier.boss]),
  };
  state.mode = "over";
  state.notice = null;
  state.bossPose = tier.pose;
  state.bossPoseUntil = Infinity;
  satellite.pause();
  releaseControls();
  feed.post(tier.forum, state.minute, { hot: true });
  // A voice line still playing (the No. 3 warning) is read to the end.
  duckMusic();
  sfx(END_SOUND[result.tier]);
  if (result.tier === "bigWin") feed.news("bigWin", state.minute);
  else if (result.tier !== "commute") feed.news("downgrade", state.minute);
  $("overlay").classList.remove("hidden");
  $("result-card").classList.remove("hidden");
  $("pause").disabled = true;
  renderResult();
  renderNotice();
  $("restart").focus({ preventScroll: true });
  hud();
  track("game_end", {
    tier: result.tier,
    held_until: result.tier === "commute" ? null : clock(result.minute),
    minute: Math.round(result.minute),
    reason,
    hits: state.hits,
    boosts: state.boosts,
    dodges: state.dodges,
    lang: getLang(),
  });
}

function resultText() {
  const r = state.result;
  const tier = TIERS[r.tier];
  const held = r.tier === "commute" ? t("heldNone") : clock(r.minute);
  let text = t(tier.text, {
    time: clock(r.minute),
    back: clock(r.backBy ?? r.minute),
  });
  if (r.reason === "energy" && r.tier !== "commute")
    text += ` ${t("dissipated", { time: clock(r.minute) })}`;
  return {
    eyebrow: t(tier.label),
    title: say(COPY.results[tier.title][r.titleIndex]),
    held,
    outcome: text,
    comment: say(COPY.boss[tier.boss][r.commentIndex]),
    pose: tier.pose,
  };
}

// Failed rounds get the rule that beat them (the old survival notes) as a tip.
function failTip() {
  const { tier, reason } = state.result;
  if (tier === "pass" || tier === "bigWin") return null;
  if (reason === "energy") return ["tipEnergy", "tipEnergySub"];
  if (tier === "commute") return ["brief1", "brief1Sub"];
  if (tier === "wfh") return ["brief3", "brief3Sub"];
  return ["brief2", "brief2Sub", "brief2Tip"];
}

function renderResult() {
  if (!state.result) return;
  const r = resultText();
  const card = $("result-card");
  card.dataset.tier = state.result.tier;
  $("result-eyebrow").textContent = r.eyebrow;
  $("result-title").textContent = r.title;
  $("result-time").textContent = r.held;
  $("result-outcome").textContent = r.outcome;
  $("result-comment").textContent = r.comment;
  $("result-boss").src = bossSvgUrl(r.pose);
  const tip = failTip();
  $("result-tip").classList.toggle("hidden", !tip);
  if (tip) {
    $("result-tip-title").textContent = t(tip[0]);
    $("result-tip-body").textContent = tip
      .slice(1)
      .map((k) => t(k))
      .join(" ");
  }
  const { whatsapp, threads } = shareLinks(shareText(), shareUrl());
  $("share-whatsapp").href = whatsapp;
  $("share-threads").href = threads;
}

function renderNames() {
  feed.render();
}

function boost() {
  if (state.mode !== "playing" || state.cooldown > 0 || state.energy < 12)
    return;
  state.boost = 1;
  state.cooldown = 7;
  state.energy -= 7;
  state.boosts++;
  sfx("whoosh");
  let [dx, dy] = input();
  if (Math.hypot(dx, dy) < 0.1) {
    const dist = Math.hypot(HK.x - state.x, HK.y - state.y);
    dx = (HK.x - state.x) / dist;
    dy = (HK.y - state.y) / dist;
  }
  state.vx += dx * km(158);
  state.vy += dy * km(158);
  hud();
}

function input() {
  let x =
    Number(keys.has("ArrowRight") || keys.has("d")) -
    Number(keys.has("ArrowLeft") || keys.has("a"));
  let y =
    Number(keys.has("ArrowDown") || keys.has("s")) -
    Number(keys.has("ArrowUp") || keys.has("w"));
  if (pointer) {
    x += (pointer.x - pointer.startX) / 48;
    y += (pointer.y - pointer.startY) / 48;
  }
  const len = Math.max(1, Math.hypot(x, y));
  return [x / len, y / len];
}

function step(dt) {
  if (state.mode !== "playing") return;
  const previousMinute = state.minute;
  state.elapsed += dt;
  state.minute = gameMinute(state.elapsed);
  const minutes = state.minute - previousMinute;
  const [ix, iy] = input();
  state.cooldown = Math.max(0, state.cooldown - dt);
  state.boost = Math.max(0, state.boost - dt);
  const speed = state.boost > 0 ? km(188) : km(96);
  const easing = 1 - Math.exp(-3.3 * dt);
  state.vx += (ix * speed - km(4) - state.vx) * easing;
  state.vy += (iy * speed - km(1.5) - state.vy) * easing;
  // The storm stays in the part of the map that no panel covers: its whole
  // landfall ring across, at least half of it up and down.
  const { safe, scale } = camera;
  const padX = LAND_CONTACT_RADIUS * scale + 10;
  const padY = LAND_CONTACT_RADIUS * scale * 0.5 + 10;
  const left = Math.max(100, (safe.left + padX - camera.x) / scale);
  const top = Math.max(120, (safe.top + padY - camera.y) / scale);
  state.x = clamp(
    state.x + state.vx * dt,
    left,
    Math.max(left, Math.min(900, (safe.right - padX - camera.x) / scale)),
  );
  state.y = clamp(
    state.y + state.vy * dt,
    top,
    Math.max(top, Math.min(680, (safe.bottom - padY - camera.y) / scale)),
  );
  state.landFraction = landCoverage(
    state.x,
    state.y,
    LAND_CONTACT_RADIUS,
    landPolygons,
  );
  const wasOnLand = state.onLand;
  state.onLand = state.landFraction > 0;
  if (state.onLand && !wasOnLand) {
    post("landContact", { every: 8 });
    if (once("newsLand")) feed.news("landContact", state.minute);
  }
  state.energyRate = energyRate(state.landFraction);
  state.energy = clamp(state.energy + state.energyRate * dt, 0, 100);
  if (state.elapsed >= state.nextPulse) {
    const gap = 1.15 + Math.sin(state.elapsed * 0.19) * 1.2;
    state.pulses.push({ radius: km(50), gap, hit: false });
    state.bossPush = state.elapsed + 1;
    bossSay(bossBank("pulse"));
    state.nextPulse += Math.max(4.5, 7 - state.elapsed / 65);
  }
  const distance = Math.hypot(state.x - HK.x, state.y - HK.y);
  const angle = Math.atan2(state.y - HK.y, state.x - HK.x);
  for (const pulse of state.pulses) {
    const previous = pulse.radius;
    pulse.radius += km(48) * dt;
    const gapDistance = Math.abs(
      Math.atan2(Math.sin(angle - pulse.gap), Math.cos(angle - pulse.gap)),
    );
    if (
      !pulse.hit &&
      distance >= previous - km(14) &&
      distance <= pulse.radius + km(14)
    ) {
      pulse.hit = true;
      if (gapDistance > 0.62 && state.boost === 0) {
        const normal = Math.max(1, distance);
        state.vx += ((state.x - HK.x) / normal) * km(HIT_SHOVE);
        state.vy += ((state.y - HK.y) / normal) * km(HIT_SHOVE);
        state.energy = Math.max(0, state.energy - HIT_ENERGY);
        state.hits++;
        sfx("boing");
        bossSay(bossBank("hit"), state.minute >= PASS ? "sour" : "gloat");
        post("forceFieldHit", { every: 6 });
        if (once("newsField")) feed.news("forceField", state.minute);
      } else if (distance < km(400)) {
        state.dodges++;
        post("forceFieldDodge", { every: 8 });
      }
    }
  }
  state.pulses = state.pulses.filter((p) => p.radius < km(240));
  state.maxWind = centreWind(state.energy);
  const local = hongKongWind(state.x, state.y, state.energy);
  const forecast = hongKongWind(
    state.x + state.vx * 2,
    state.y + state.vy * 2,
    clamp(state.energy + state.energyRate * 2, 0, 100),
  );
  state.wind = local.sustained;
  state.localPeak = local.peak;
  const live = warningSignal(state.wind, forecast.sustained);
  state.liveSignal = live;
  const hko = state.hko;
  const events = observe(hko, state.minute, minutes, state.wind, live);
  const previousSignal = state.signal;
  state.signal = displayedSignal(hko, state.minute, live);
  state.galeDir = galeDirection(state.x, state.y, HK.x, HK.y, state.galeDir);
  if (state.minute < COMMUTE) {
    if (state.signal >= 8 && previousSignal < 8) {
      sfx("hoist");
      post("signal8Up", { every: 2.5, hot: true });
      if (once("newsSignal8")) feed.news("signal8", state.minute);
    } else if (state.signal < 8 && previousSignal >= 8)
      post("signalDropPre8", { every: 2.5 });
    if (
      state.minute >= COMMUTE - 25 &&
      state.signal < 8 &&
      state.wind >= 35 &&
      once("nearEight")
    )
      post("nearEightNo8", { hot: true });
  }
  if (previousMinute < COMMUTE && state.minute >= COMMUTE) {
    track("commute_check", {
      hoisted: hko.hoisted,
      wind: Math.round(state.wind),
    });
    if (!hko.hoisted) return end("commute");
    post("eightAmPass", { every: 0, hot: true });
    if (once("newsSignal8")) feed.news("signal8", state.minute);
    notice(
      hkoSvgUrl("cancel"),
      () => ({
        eyebrow: t("noticeCommute"),
        title: t("noticeCommuteTitle"),
      }),
      4,
    );
    announce("eight-am", 0.2);
  }
  if (state.minute >= COMMUTE && state.signal >= 9 && previousSignal < 9)
    post("signal9or10", { every: 10, hot: true });
  if (
    state.minute >= COMMUTE + 10 &&
    hko.below > 2 &&
    !hko.warned &&
    !state.flags.avgDropping
  ) {
    state.flags.avgDropping = true;
    post("avgDropping", { every: 0 });
  }
  if (hko.below === 0) state.flags.avgDropping = false;
  for (const event of events) {
    if (event.type === "warning") {
      const time = clock(event.downgradeAt);
      const line = pick("hko.warning", COPY.hko.warning);
      const body = COPY.hko.warning[line];
      notice(
        hkoSvgUrl("warn"),
        () => ({
          eyebrow: t("noticeHko"),
          title: say(COPY.hkoTemplate, { name: typhoonName(), time }),
          body: say(body),
        }),
        9,
      );
      sfx("uhoh");
      announce(`warning-${line}`);
      post("hkoWarning", { every: 0, hot: true });
      feed.news("hkoWarning", state.minute);
      track("hko_warning", { at: clock(state.minute) });
    } else if (event.type === "cancelled") {
      const line = pick("hko.cancelled", COPY.hko.cancelled);
      const body = COPY.hko.cancelled[line];
      notice(
        hkoSvgUrl("cancel"),
        () => ({
          eyebrow: t("noticeHko"),
          title: t("noticeHkoCancel"),
          body: say(body),
        }),
        5,
      );
      sfx("hoist");
      announce(`cancelled-${line}`);
      post("warningCancelled", { every: 0, hot: true });
      track("hko_cancelled", { at: clock(state.minute) });
    } else if (event.type === "downgrade") return end("downgrade");
  }
  if (previousMinute < WFH_CALL && state.minute >= WFH_CALL) {
    const line = randomEntry(COPY.boss.twoPmWfh, "boss.twoPmWfh.notice");
    notice(
      bossSvgUrl("smug"),
      () => ({
        eyebrow: t("noticeBoss"),
        title: say(line),
      }),
      6,
    );
    sfx("ding");
    bossSay("twoPmWfh", "smug", 5);
    post("twoPmWfh", { every: 0, hot: true });
    feed.news("wfh", state.minute);
    track("wfh_call");
  }
  if (previousMinute < PASS && state.minute >= PASS) {
    sfx("party");
    notice(
      bossSvgUrl("sour"),
      () => ({
        eyebrow: t("noticePass"),
        title: t("noticePassTitle"),
      }),
      5,
    );
    bossSay("threePmPass", "sour", 5);
    post("threePmPass", { every: 0, hot: true });
    feed.news("pass", state.minute);
  }
  if (state.minute >= 12 * 60 + 30 && state.minute < 13 * 60 + 30)
    post("lunch", { every: 4 });
  if (state.elapsed >= state.nextPost) post("idle", { every: 0 });
  if (state.trail.length === 0 || state.elapsed - state.trail.at(-1).t > 0.25) {
    state.trail.push({ x: state.x, y: state.y, t: state.elapsed });
    state.trail = state.trail.slice(-70);
  }
  if (state.energy <= 0) end("energy");
  else if (state.minute >= DAY_END) end("end");
}

function heldUntil() {
  if (state.result)
    return state.result.tier === "commute" ? null : state.result.minute;
  const { hoisted, downgraded } = state.hko;
  return hoisted && !downgraded && state.minute >= COMMUTE
    ? state.minute
    : null;
}

// The HKO symbol on show: No. 8 carries the quadrant the gales blow from.
const currentSignalKey = () =>
  signalKey(state.mode === "ready" ? 1 : state.signal, state.galeDir ?? "NE");

function hud() {
  const held = heldUntil();
  $("clock").textContent = clock(state.minute);
  $("held").textContent = held === null ? "--:--" : clock(held);
  $("held").classList.toggle("live", held !== null && state.mode !== "over");
  $("timeline-fill").style.width =
    `${((state.minute - DAY_START) / (DAY_END - DAY_START)) * 100}%`;
  $("timeline-fill").classList.toggle(
    "held",
    held !== null || (state.minute < COMMUTE && state.signal >= 8),
  );
  $("milestone").textContent =
    state.mode === "over" || state.minute >= DAY_END
      ? t("nextDone")
      : state.minute < COMMUTE
        ? t("nextBefore8")
        : state.minute < WFH_CALL
          ? t("nextBefore14")
          : state.minute < PASS
            ? t("nextBefore15")
            : t("nextBefore18");
  const signal = state.mode === "ready" ? 1 : state.signal;
  const key = currentSignalKey();
  const icon = $("signal-icon");
  if (icon.dataset.key !== key) {
    icon.innerHTML = signalSvg(key);
    icon.dataset.key = key;
  }
  icon.classList.toggle("eight", signal >= 8);
  $("signal-name").textContent = t(`signal${key}`);
  icon.setAttribute("aria-label", $("signal-name").textContent);
  const hko = state.hko;
  $("signal-note").textContent = hko.downgraded
    ? t("noteDown")
    : hko.warned
      ? t("noteWarned", { time: clock(hko.downgradeAt) })
      : state.minute < COMMUTE && state.mode !== "ready"
        ? signal >= 8
          ? t("notePre8Up")
          : t("notePre8Down")
        : hko.hoisted && state.minute >= COMMUTE
          ? t("noteHeld", {
              signal: t(`heldSignal${Math.min(10, Math.max(8, signal))}`),
            })
          : t("noteWaiting");
  $("signal-note").classList.toggle("warned", hko.warned && !hko.downgraded);
  $("wind").firstChild.textContent =
    state.mode === "ready" ? "—" : String(Math.floor(state.wind));
  $("wind").title = t("windTitle", {
    w: Math.round(state.wind),
    p: Math.round(state.localPeak),
  });
  const average = state.mode === "ready" ? 0 : hko.average;
  $("avg").textContent =
    state.mode === "ready" ? "—" : `${Math.round(average)} km/h`;
  $("avg-fill").style.width = `${clamp(average / 150, 0, 1) * 100}%`;
  const below = state.minute >= COMMUTE && hko.below > 0;
  $("avg-fill").classList.toggle("below", average < 63);
  $("avg-note").textContent =
    state.minute < COMMUTE
      ? t("avgPre8")
      : below
        ? t("avgBelow", { m: Math.min(30, Math.floor(hko.below)) })
        : t("avgSafe");
  $("avg-note").classList.toggle("below", below);
  $("storm-class").textContent = stormClass(classification(state.maxWind));
  $("centre-wind").textContent = `${state.maxWind} km/h`;
  $("energy-number").textContent = `${Math.round(state.energy)}%`;
  $("energy-fill").style.width = `${state.energy}%`;
  $("energy-fill").style.background = state.energy < 25 ? "#be7855" : "#6f8c6c";
  const p = (state.landFraction * 100).toFixed(1);
  $("energy-note").textContent = state.onLand
    ? t("energyLand", { p, r: Math.abs(state.energyRate).toFixed(1) })
    : t("energySea");
  $("contact-readout").textContent = state.onLand
    ? t("contactLand", { p })
    : t("contactSea");
  $("boost").disabled =
    state.mode !== "playing" || state.cooldown > 0 || state.energy < 12;
  $("boost-label").textContent =
    state.cooldown > 0
      ? t("boostCooling", { s: state.cooldown.toFixed(1) })
      : t("boostKeys");
  const bossPose = bossSvgUrl(currentBossPose());
  if ($("field-boss").src !== bossPose) $("field-boss").src = bossPose;
  $("field-label").textContent =
    state.mode === "ready"
      ? t("fieldReady")
      : state.mode === "paused"
        ? t("fieldPaused")
        : state.mode === "over"
          ? t("fieldOver")
          : t("fieldPulse", {
              s: Math.max(0, Math.ceil(state.nextPulse - state.elapsed)),
            });
  $("map-status").textContent = t(
    loadFailed
      ? "mapFailed"
      : state.mode === "playing"
        ? "mapPlaying"
        : state.mode === "paused"
          ? "mapPaused"
          : state.mode === "over"
            ? "mapOver"
            : "mapReady",
  );
  if (state.notice && state.elapsed >= state.notice.until) {
    state.notice = null;
    renderNotice();
  }
}

function currentBossPose() {
  if (state.bossPose && state.elapsed < state.bossPoseUntil)
    return state.bossPose;
  return state.elapsed < state.bossPush ? "push" : "idle";
}

// The part of the map no panel covers. In the compact layout the panels float
// over the map and name their edge in CSS (--dock); they are measured folded.
function safeRect(width, height) {
  const box = viewport.getBoundingClientRect();
  const safe = { left: 0, top: 0, right: width, bottom: height };
  const open = [
    ...document.querySelectorAll(".score-card.open, .forum-card.open"),
  ];
  for (const panel of open) panel.classList.remove("open");
  for (const el of document.querySelectorAll(
    ".score-card, .forum-card, .boost-button, .field-status",
  )) {
    const dock = getComputedStyle(el).getPropertyValue("--dock").trim();
    if (!dock || !el.checkVisibility()) continue;
    const b = el.getBoundingClientRect();
    if (dock === "top") safe.top = Math.max(safe.top, b.bottom - box.top + 6);
    if (dock === "bottom")
      safe.bottom = Math.min(safe.bottom, b.top - box.top - 6);
    if (dock === "left")
      safe.left = Math.max(safe.left, b.right - box.left + 6);
    if (dock === "right")
      safe.right = Math.min(safe.right, b.left - box.left - 6);
  }
  for (const panel of open) panel.classList.add("open");
  return safe;
}

// The map always fills the screen (cover) and centres this point in the clear
// area, as far as the world's edges allow.
const FOCUS = { x: 500, y: 330 };

function resize() {
  const { width, height } = viewport.getBoundingClientRect();
  const ratio = Math.min(devicePixelRatio, 2);
  if (canvas.width !== Math.round(width * ratio))
    canvas.width = Math.round(width * ratio);
  if (canvas.height !== Math.round(height * ratio))
    canvas.height = Math.round(height * ratio);
  const scale = Math.max(width / 1000, height / 840);
  const safe = safeRect(width, height);
  const fit = (size, centre, focus, world) =>
    clamp(centre - focus * scale, size - world * scale, 0);
  camera = {
    scale,
    x: fit(width, (safe.left + safe.right) / 2, FOCUS.x, 1000),
    y: fit(height, (safe.top + safe.bottom) / 2, FOCUS.y, 840),
    w: width,
    h: height,
    ratio,
    safe,
  };
  viewport.style.setProperty("--safe-top", `${safe.top}px`);
  viewport.style.setProperty("--safe-left", `${safe.left}px`);
  viewport.style.setProperty("--safe-right", `${width - safe.right}px`);
  viewport.style.setProperty("--safe-bottom", `${height - safe.bottom}px`);
  $("scale-bar").style.width = `${km(200) * scale}px`;
}

// The boss stands west of the HK marker at a fixed on-screen size.
function drawBoss(scale) {
  const pose = currentBossPose();
  const image = bossImages[pose];
  if (!image.complete) return;
  const h = 80 / scale;
  const w = (h * 140) / 165;
  const bob = pose === "idle" ? Math.sin(state.elapsed * 2.4) * 1.2 : 0;
  const x = HK.x - 16 / scale - w;
  const y = HK.y + 14 / scale - h + bob / scale;
  ctx.drawImage(image, x, y, w, h);
  if (
    state.mode !== "playing" ||
    !state.bossLine ||
    state.elapsed > state.bossLineUntil
  )
    return;
  const line = say(state.bossLine);
  const size = 13 / scale;
  ctx.font = `bold ${size}px Arial,"Noto Sans CJK TC",sans-serif`;
  const tw = ctx.measureText(line).width;
  // Keep the bubble on screen and clear of docked panels: long English lines
  // would run off the left edge or under the landscape score card.
  const { safe } = camera;
  const half = tw / 2 + 7 / scale;
  const bx = Math.min(
      Math.max(x + w / 2, (safe.left - camera.x + 8) / scale + half),
      Math.max(x + w / 2, (safe.right - camera.x - 8) / scale - half),
    ),
    by = y - 10 / scale;
  ctx.fillStyle = "#f7f1dc";
  ctx.strokeStyle = "#c9932f";
  ctx.lineWidth = 1.5 / scale;
  ctx.beginPath();
  ctx.roundRect(
    bx - tw / 2 - 7 / scale,
    by - size - 6 / scale,
    tw + 14 / scale,
    size + 11 / scale,
    6 / scale,
  );
  ctx.moveTo(x + w / 2 - 4 / scale, by + 5 / scale);
  ctx.lineTo(x + w / 2, by + 10 / scale);
  ctx.lineTo(x + w / 2 + 4 / scale, by + 5 / scale);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#3a2410";
  ctx.textAlign = "center";
  ctx.fillText(line, bx, by);
}

function circle(x, y, radius) {
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, TAU);
}

function text(label, x, y, size = 13, color = "#a8c2af", align = "center") {
  ctx.font = `${size}px Arial,"Noto Sans CJK TC",sans-serif`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.shadowColor = "#06162c";
  ctx.shadowBlur = 3;
  ctx.fillText(label, x, y);
  ctx.shadowBlur = 0;
}

async function buildTerrain(polygons) {
  landPolygons = polygons;
  land = new Path2D();
  for (const ring of polygons) {
    ring.forEach(([x, y], index) =>
      index === 0 ? land.moveTo(x, y) : land.lineTo(x, y),
    );
    land.closePath();
  }
  terrainCtx.save();
  terrainCtx.clip(land);
  terrainCtx.drawImage(terrainTexture(), 0, 0);
  terrainCtx.restore();
  terrainCtx.strokeStyle = "#e2e7dcaa";
  terrainCtx.lineWidth = 0.7;
  terrainCtx.stroke(land);
  satellite = await createSatellite(land, state, innerWidth <= 760 ? 144 : 224);
  mapReady = true;
  $("start").disabled = false;
}

function draw() {
  const { ratio, scale, x, y, w, h } = camera;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  const sea = ctx.createLinearGradient(0, 0, w, h);
  sea.addColorStop(0, "#273862");
  sea.addColorStop(1, "#15294d");
  ctx.fillStyle = sea;
  ctx.fillRect(0, 0, w, h);
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.drawImage(terrain, 0, 0);
  // Cloud water is a persistent world-space field, never a rotated sprite.
  if (satellite) ctx.drawImage(satellite.canvas, 0, 0, 1000, 840);
  ctx.strokeStyle = "#e2e7dc77";
  ctx.lineWidth = 0.7;
  ctx.stroke(land);
  ctx.strokeStyle = "#ead46942";
  ctx.lineWidth = 1;
  ctx.setLineDash([2, 7]);
  for (let i = 0; i <= 1000; i += 125) {
    ctx.beginPath();
    ctx.moveTo(i, -300);
    ctx.lineTo(i, 1200);
    ctx.stroke();
  }
  for (let i = 0; i <= 840; i += 120) {
    ctx.beginPath();
    ctx.moveTo(-500, i);
    ctx.lineTo(1500, i);
    ctx.stroke();
  }
  ctx.setLineDash([]);
  const en = getLang() === "en";
  for (const [label, english, lon, lat, size] of [
    ["廣 東", "GUANGDONG", 112.8, 24.2, 20],
    ["廣州", "Guangzhou", 113.26, 23.13, 12],
    ["澳門", "Macau", 113.54, 22.2, 11],
    ["台 灣", "TAIWAN", 121, 23.7, 16],
    ["海 南", "HAINAN", 109.7, 19.4, 16],
    ["呂 宋", "LUZON", 121, 17.1, 16],
    ["南 中 國 海", "SOUTH CHINA SEA", 113.1, 17.3, 20],
  ]) {
    const p = project(lon, lat);
    text(
      en ? english : label,
      p.x,
      p.y,
      Math.max(en ? size * 0.8 : size, 11 / scale),
      "#b4c5b699",
    );
  }
  text("N", 925, 114, 12, "#b0c7b7");
  ctx.beginPath();
  ctx.moveTo(925, 131);
  ctx.lineTo(925, 172);
  ctx.moveTo(919, 139);
  ctx.lineTo(925, 128);
  ctx.lineTo(931, 139);
  ctx.strokeStyle = "#b0c7b779";
  ctx.stroke();

  // The dashed annulus is the positioning target, not an extra collision surface.
  circle(HK.x, HK.y, km(160));
  ctx.setLineDash([3, 8]);
  ctx.lineWidth = 1;
  ctx.strokeStyle = "#f1c96d46";
  ctx.stroke();
  ctx.setLineDash([]);
  circle(HK.x, HK.y, km(100));
  ctx.fillStyle = "#f3bc4b08";
  ctx.fill();
  ctx.strokeStyle = "#f1c96d42";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  for (const pulse of state.pulses) {
    ctx.beginPath();
    ctx.arc(HK.x, HK.y, pulse.radius, pulse.gap + 0.62, pulse.gap + TAU - 0.62);
    ctx.lineWidth = 4;
    ctx.strokeStyle = `rgba(243,194,98,${clamp(0.85 - pulse.radius / 650, 0, 1)})`;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(
      HK.x,
      HK.y,
      pulse.radius + 7,
      pulse.gap + 0.62,
      pulse.gap + TAU - 0.62,
    );
    ctx.lineWidth = 1;
    ctx.strokeStyle = "#e2c28325";
    ctx.stroke();
    for (const endAngle of [pulse.gap - 0.62, pulse.gap + 0.62]) {
      circle(
        HK.x + Math.cos(endAngle) * pulse.radius,
        HK.y + Math.sin(endAngle) * pulse.radius,
        4,
      );
      ctx.fillStyle = "#f3dca4";
      ctx.fill();
    }
  }

  if (state.trail.length > 1) {
    ctx.beginPath();
    state.trail.forEach((point, i) =>
      i === 0 ? ctx.moveTo(point.x, point.y) : ctx.lineTo(point.x, point.y),
    );
    ctx.strokeStyle = "#c3e5d44d";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([3, 6]);
    ctx.stroke();
    ctx.setLineDash([]);
  } else {
    ctx.beginPath();
    ctx.moveTo(890, 745);
    ctx.bezierCurveTo(880, 680, 805, 680, state.x, state.y);
    ctx.setLineDash([4, 7]);
    ctx.strokeStyle = "#c3e5d43b";
    ctx.stroke();
    ctx.setLineDash([]);
  }
  const radius = LAND_CONTACT_RADIUS;
  circle(state.x, state.y, radius);
  const windGlow = ctx.createRadialGradient(
    state.x,
    state.y,
    25,
    state.x,
    state.y,
    radius,
  );
  windGlow.addColorStop(0, "#cadfca00");
  windGlow.addColorStop(0.7, "#d3e5ca0b");
  windGlow.addColorStop(1, "#d3e5ca16");
  ctx.fillStyle = windGlow;
  ctx.fill();
  // Screen-sized dashes and a dark halo keep the land-contact boundary legible
  // over bright clouds and on phones. Amber reflects actual contact, not signal.
  const boundaryColour = state.onLand ? "#ffc36b" : "#d2f4ff";
  ctx.setLineDash([7 / scale, 6 / scale]);
  ctx.lineWidth = 4 / scale;
  ctx.strokeStyle = "#092330c9";
  ctx.stroke();
  ctx.lineWidth = 2 / scale;
  ctx.strokeStyle = boundaryColour;
  ctx.stroke();
  ctx.setLineDash([]);
  const boundaryLabel = en
    ? `Land contact · ${Math.round(radius * KM_PER_UNIT)} km radius`
    : `登陸圈 · 半徑 ${Math.round(radius * KM_PER_UNIT)} km`;
  const labelY = state.y + radius + 14 / scale;
  ctx.font = `${12 / scale}px Arial,"Noto Sans CJK TC",sans-serif`;
  const labelWidth = ctx.measureText(boundaryLabel).width;
  ctx.fillStyle = "#102d39ed";
  ctx.fillRect(
    state.x - labelWidth / 2 - 6 / scale,
    labelY - 13 / scale,
    labelWidth + 12 / scale,
    18 / scale,
  );
  text(boundaryLabel, state.x, labelY, 12 / scale, boundaryColour);
  text(
    `${stormClass(classification(state.maxWind))} · ${state.maxWind} km/h`,
    state.x,
    state.y + radius + 33 / scale,
    12 / scale,
    "#e8edf0",
  );
  text(
    state.onLand
      ? en
        ? `LANDFALL ${(state.landFraction * 100).toFixed(1)}% / WEAKENING`
        : `登陸 ${(state.landFraction * 100).toFixed(1)}% / 持續減弱`
      : en
        ? "OPEN SEA / RECHARGING"
        : "海上 / 快速回氣",
    state.x,
    state.y + radius + 49 / scale,
    11 / scale,
    state.onLand ? "#edb582" : "#91b6a9",
  );

  circle(HK.x, HK.y, 17);
  ctx.fillStyle = "#f2c25f24";
  ctx.fill();
  circle(HK.x, HK.y, 8);
  ctx.fillStyle = "#f3c15d";
  ctx.fill();
  circle(HK.x, HK.y, 3);
  ctx.fillStyle = "#233e40";
  ctx.fill();
  text(
    en ? "Hong Kong" : "香港",
    HK.x + 30,
    HK.y + 3,
    Math.max(en ? 16 : 19, 15 / scale),
    "#f0d798",
    "left",
  );
  text(
    en ? "香港" : "HONG KONG",
    HK.x + 31,
    HK.y + 19,
    Math.max(8, 11 / scale),
    "#d4c799",
    "left",
  );
  drawBoss(scale);
  if (state.mode === "playing" && state.signal >= 8) {
    // The HKO symbol on a gold tile, then the signal's short name.
    const key = currentSignalKey();
    ctx.fillStyle = "#f4bf52";
    ctx.beginPath();
    ctx.roundRect(HK.x + 30, HK.y - 36, 18, 18, 3);
    ctx.fill();
    drawSignal(ctx, key, HK.x + 39, HK.y - 27, 13, "#17313b");
    text(
      t(`signalShort${key}`),
      HK.x + 53,
      HK.y - 22,
      Math.max(12, 12 / scale),
      "#f5cd6e",
      "left",
    );
  }
  if (pointer && state.mode === "playing") {
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    circle(pointer.startX, pointer.startY, 37);
    ctx.strokeStyle = "#eff2ce44";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    const dx = pointer.x - pointer.startX,
      dy = pointer.y - pointer.startY;
    const len = Math.max(1, Math.hypot(dx, dy) / 32);
    circle(pointer.startX + dx / len, pointer.startY + dy / len, 11);
    ctx.fillStyle = "#eff2ce55";
    ctx.fill();
  }
}

function frame(now) {
  const dt = last ? Math.min((now - last) / 1000, 0.05) : 0;
  last = now;
  // Integrate bounded substeps so pulse collisions and energy are stable after a slow frame.
  let remaining = dt;
  while (remaining > 0) {
    const delta = Math.min(remaining, 1 / 60);
    step(delta);
    remaining -= delta;
  }
  if (
    satellite &&
    (state.mode === "playing" || state.mode === "ready") &&
    !document.hidden
  )
    satellite.update(dt, state);
  hudTime += dt;
  if (hudTime > 0.1) {
    hud();
    hudTime = 0;
  }
  draw();
  requestAnimationFrame(frame);
}

// Sharing: a rendered result card through the Web Share API where files are
// supported (phones: Instagram, WhatsApp, Threads…), else links, download and copy.
let shareCache = null;
const shareUrl = () => `${location.origin}${location.pathname}`;

function shareText() {
  const r = state.result;
  if (!r) return "";
  if (r.tier === "commute") return t("shareTextNone");
  return t("shareText", {
    time: clock(r.minute),
    tier: t(TIERS[r.tier].label),
  });
}

async function shareImage() {
  if (shareCache?.lang === getLang()) return shareCache.file;
  const r = resultText();
  const blob = await renderCard({
    tier: state.result.tier,
    eyebrow: r.eyebrow,
    title: r.title,
    heldLabel: t("cardHeld"),
    held: r.held,
    outcome: r.outcome,
    bossLabel: t("bossSays"),
    comment: r.comment,
    bossSrc: bossSvgUrl(r.pose),
    typhoon: typhoonName(),
    map: canvas,
    lang: getLang(),
  });
  const file = new File(
    [blob],
    `typhoon-${clock(state.result.minute).replace(":", "")}.png`,
    {
      type: "image/png",
    },
  );
  shareCache = { lang: getLang(), file };
  return file;
}

function download(file) {
  const url = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

async function copyText() {
  const text = `${shareText()}\n${shareUrl()}`;
  try {
    if (!navigator.clipboard?.writeText)
      throw new Error("Clipboard unavailable");
    await navigator.clipboard.writeText(text);
    $("share-status").textContent = t("shareCopied");
  } catch {
    // The devbox preview is HTTP, where browsers disable the Clipboard API.
    $("share-status").textContent = text;
    const range = document.createRange();
    range.selectNodeContents($("share-status"));
    getSelection().removeAllRanges();
    getSelection().addRange(range);
  }
}

$("share").addEventListener("click", async () => {
  track("share_click", { method: "button", tier: state.result?.tier });
  const file = await shareImage();
  const data = { files: [file], text: shareText(), url: shareUrl() };
  if (navigator.canShare?.(data)) {
    try {
      await navigator.share(data);
      track("share_done", { method: "native" });
    } catch {}
    return;
  }
  download(file);
  $("share-status").textContent = t("shareSaved");
});
// The web cannot post straight to Instagram: phones get the share sheet with the
// image (Instagram is in it); elsewhere the image downloads and Instagram opens.
$("share-instagram").addEventListener("click", async () => {
  track("share_click", { method: "instagram", tier: state.result?.tier });
  const probe = new File([""], "card.png", { type: "image/png" });
  const native = navigator.canShare?.({ files: [probe] });
  // Opened before the await so popup blockers allow it.
  if (!native) window.open("https://www.instagram.com/", "_blank", "noopener");
  const file = await shareImage();
  if (native) {
    try {
      await navigator.share({ files: [file] });
      track("share_done", { method: "instagram" });
    } catch {}
    return;
  }
  download(file);
  $("share-status").textContent = t("shareIgSaved");
});
$("share-download").addEventListener("click", async () => {
  track("share_click", { method: "download", tier: state.result?.tier });
  download(await shareImage());
  $("share-status").textContent = t("shareSaved");
});
$("share-copy").addEventListener("click", () => {
  track("share_click", { method: "copy", tier: state.result?.tier });
  copyText();
});
for (const [id, method] of [
  ["share-whatsapp", "whatsapp"],
  ["share-threads", "threads"],
])
  $(id).addEventListener("click", () =>
    track("share_click", { method, tier: state.result?.tier }),
  );

$("start").addEventListener("click", start);
$("restart").addEventListener("click", start);
$("restart-paused").addEventListener("click", start);
$("pause").addEventListener("click", () =>
  state.mode === "paused" ? resume() : pause(),
);
$("resume").addEventListener("click", resume);
// Boost on pointerdown: a second finger on a phone never gets a click while
// the first is still steering. Keyboard activation still arrives as a click.
let boostPressedAt = -Infinity;
$("boost").addEventListener("pointerdown", (event) => {
  event.preventDefault();
  boostPressedAt = performance.now();
  boost();
});
$("boost").addEventListener("click", () => {
  if (performance.now() - boostPressedAt > 800) boost();
});
for (const [toggle, panel] of [
  ["status-toggle", "status-card"],
  ["forum-toggle", "forum-card"],
]) {
  $(toggle).addEventListener("click", (event) => {
    event.stopPropagation();
    const open = $(panel).classList.toggle("open");
    $(toggle).setAttribute("aria-expanded", String(open));
    track("panel_toggle", { panel, open });
  });
}
// The folded forum pill opens from anywhere on it.
$("forum-card").addEventListener("click", () => {
  if (!$("forum-card").classList.contains("open")) $("forum-toggle").click();
});
const fullscreenHost = document.documentElement;
const fullscreenOn = () =>
  Boolean(document.fullscreenElement || document.webkitFullscreenElement);
if (document.fullscreenEnabled || document.webkitFullscreenEnabled) {
  $("fullscreen").classList.remove("hidden");
  $("fullscreen").addEventListener("click", () => {
    if (fullscreenOn())
      (document.exitFullscreen || document.webkitExitFullscreen).call(document);
    else
      (
        fullscreenHost.requestFullscreen ||
        fullscreenHost.webkitRequestFullscreen
      )
        .call(fullscreenHost, { navigationUI: "hide" })
        ?.catch?.(() => {});
    track("fullscreen_toggle", { on: !fullscreenOn() });
  });
  for (const type of ["fullscreenchange", "webkitfullscreenchange"])
    document.addEventListener(type, () => {
      $("fullscreen").classList.toggle("active", fullscreenOn());
      $("fullscreen").setAttribute("aria-pressed", String(fullscreenOn()));
    });
}
$("help").addEventListener("click", () => {
  helpPaused = state.mode === "playing";
  if (helpPaused) pause();
  $("help-dialog").showModal();
  track("help_open");
});
$("help-dialog").addEventListener("close", () => {
  if (helpPaused) resume();
  helpPaused = false;
});
$("lang").addEventListener("click", () => {
  const next = getLang() === "en" ? "zh" : "en";
  setLang(next);
  setContext({ lang: next });
  track("lang_switch", { to: next, mode: state.mode });
});
document.addEventListener("langchange", () => {
  if (!state) return;
  renderNames();
  renderNotice();
  renderResult();
  hud();
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden) pause();
  // pause() covers a live round; the result screen's music stops with the tab.
  if (document.hidden) pauseMusic();
  if (document.hidden) stopVoice();
  else if (state?.mode === "over") resumeMusic();
  last = 0;
});
window.addEventListener("blur", () => {
  releaseControls();
  pause();
});
window.addEventListener("keydown", (event) => {
  if ($("help-dialog").open) return;
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
  const movement = [
    "ArrowUp",
    "ArrowDown",
    "ArrowLeft",
    "ArrowRight",
    "w",
    "a",
    "s",
    "d",
  ];
  if (movement.includes(key) && state.mode === "playing") {
    event.preventDefault();
    keys.add(key);
  }
  if (
    (event.code === "Space" ||
      event.code === "ShiftLeft" ||
      event.code === "ShiftRight") &&
    state.mode === "playing" &&
    !event.repeat &&
    (event.target === canvas || event.target === document.body)
  ) {
    event.preventDefault();
    boost();
  }
  if (event.key === "Escape" && !event.repeat) {
    if (state.mode === "playing") pause();
    else if (state.mode === "paused") resume();
  }
});
window.addEventListener("keyup", (event) =>
  keys.delete(event.key.length === 1 ? event.key.toLowerCase() : event.key),
);
canvas.addEventListener("pointerdown", (event) => {
  if (state.mode !== "playing" || pointer || event.button !== 0) return;
  event.preventDefault();
  canvas.focus({ preventScroll: true });
  const rect = canvas.getBoundingClientRect();
  pointer = {
    id: event.pointerId,
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
    startX: event.clientX - rect.left,
    startY: event.clientY - rect.top,
  };
  canvas.setPointerCapture(event.pointerId);
});
canvas.addEventListener("pointermove", (event) => {
  if (pointer?.id !== event.pointerId) return;
  const rect = canvas.getBoundingClientRect();
  pointer.x = event.clientX - rect.left;
  pointer.y = event.clientY - rect.top;
});
for (const type of ["pointerup", "pointercancel", "lostpointercapture"])
  canvas.addEventListener(type, (event) => {
    if (pointer?.id === event.pointerId) pointer = null;
  });
// A finger still steering when the round ends must not lift into a click on
// the result card's restart button.
canvas.addEventListener("touchend", (event) => {
  if (event.cancelable) event.preventDefault();
});

function screenPoint(point) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: rect.left + camera.x + point.x * camera.scale,
    y: rect.top + camera.y + point.y * camera.scale,
  };
}

// Read-only observations for real-input playtesting; no state setters or completion bypasses.
window.__typhoon = Object.freeze({
  snapshot: () => ({
    mode: state.mode,
    elapsed: state.elapsed,
    minute: state.minute,
    clock: clock(state.minute),
    heldUntil: heldUntil(),
    x: state.x,
    y: state.y,
    energy: state.energy,
    landFraction: state.landFraction,
    energyRate: state.energyRate,
    centreWind: state.maxWind,
    localWind: state.wind,
    localPeak: state.localPeak,
    radius: LAND_CONTACT_RADIUS,
    signal: state.signal,
    signalKey: currentSignalKey(),
    sound: {
      on: soundOn(),
      musicOn: musicOn(),
      music: musicPlaying(),
      voice: voicePlaying(),
    },
    galeDir: state.galeDir,
    liveSignal: state.liveSignal,
    hko: {
      average: state.hko.average,
      below: state.hko.below,
      warned: state.hko.warned,
      downgradeAt: state.hko.downgradeAt,
      hoisted: state.hko.hoisted,
      downgraded: state.hko.downgraded,
    },
    result: state.result && {
      tier: state.result.tier,
      minute: state.result.minute,
      reason: state.result.reason,
    },
    hits: state.hits,
    boosts: state.boosts,
    dodges: state.dodges,
    onLand: state.onLand,
    centreOnLand: terrainCtx.isPointInPath(land, state.x, state.y),
    mapReady,
    lang: getLang(),
    typhoon: typhoonName(),
    forum: { count: feed.count, latest: feed.latest },
    headline: feed.headline,
    notice: state.notice && state.elapsed < state.notice.until,
    hongKong: { ...HK },
    screenStorm: screenPoint(state),
    screenHongKong: screenPoint(HK),
    pulseCount: state.pulses.length,
    boss: {
      pose: currentBossPose(),
      pushing: state.elapsed < state.bossPush,
      line:
        state.bossLine && state.elapsed < state.bossLineUntil
          ? say(state.bossLine)
          : "",
    },
    atmosphere: satellite?.model.stats(),
    kmPerWorldUnit: KM_PER_UNIT,
  }),
  auditVisuals: () => {
    const rect = canvas.getBoundingClientRect();
    const issues = [];
    if (document.documentElement.scrollWidth > innerWidth)
      issues.push("Horizontal overflow");
    if (state.mode === "playing") {
      for (const [name, point] of [
        ["storm", state],
        ["Hong Kong", HK],
      ]) {
        const p = screenPoint(point);
        if (
          p.x < rect.left + 8 ||
          p.x > rect.right - 8 ||
          p.y < rect.top + 8 ||
          p.y > rect.bottom - 8
        )
          issues.push(`${name} is clipped`);
        const picked = document.elementFromPoint(p.x, p.y);
        // The announcement strip is click-through, but must not hide Hong Kong.
        if (picked !== canvas) issues.push(`${name} is covered by UI`);
        if (name === "Hong Kong" && !$("notice").classList.contains("hidden")) {
          const n = $("notice").getBoundingClientRect();
          if (p.x > n.left && p.x < n.right && p.y > n.top && p.y < n.bottom)
            issues.push("Hong Kong is under the announcement");
        }
      }
    }
    const modal = ["pause-card", "result-card"].some(
      (id) => !$(id).classList.contains("hidden"),
    );
    for (const element of document.querySelectorAll(
      "button:not(:disabled), .share-row a",
    )) {
      if (!element.checkVisibility()) continue;
      if ($("help-dialog").open && !element.closest("dialog")) continue;
      // A pause or result card is modal: what it covers is meant to be covered.
      if (modal && !element.closest(".game-overlay")) continue;
      const b = element.getBoundingClientRect();
      if (b.top < 0 || b.bottom > innerHeight) continue;
      const scroller = element.closest(".result-card, .game-overlay");
      const c = scroller?.getBoundingClientRect();
      if (c && (b.top < c.top || b.bottom > c.bottom)) continue;
      const picked = document.elementFromPoint(
        b.x + b.width / 2,
        b.y + b.height / 2,
      );
      if (!element.contains(picked))
        issues.push(`Button ${element.id || element.textContent} is covered`);
    }
    return { issues, canvasRatio: canvas.width / rect.width, mode: state.mode };
  },
});

setLang(detectLang(), { save: false });
setContext({ lang: getLang() });
state = freshState();
feed.reset(typhoonIndex);
// A couple of early birds are already in the thread before the round starts.
feed.post("intro", DAY_START - 9);
feed.post("intro", DAY_START - 2);
renderNames();
hud();
// The compact layout's one-line news bar scrolls a headline that does not fit.
function fitTicker() {
  const text = $("ticker-text");
  text.classList.remove("marquee");
  if (getComputedStyle(text).whiteSpace !== "nowrap") return;
  const bar = text.parentElement;
  const style = getComputedStyle(bar);
  const room =
    bar.clientWidth -
    parseFloat(style.paddingLeft) -
    parseFloat(style.paddingRight);
  const over = text.scrollWidth - room;
  if (over <= 2) return;
  text.style.setProperty("--marquee", `${-over}px`);
  text.style.setProperty("--marquee-time", `${4 + over / 30}s`);
  void text.offsetWidth;
  text.classList.add("marquee");
}
new MutationObserver(fitTicker).observe($("ticker-text"), {
  childList: true,
  characterData: true,
  subtree: true,
});
new ResizeObserver(fitTicker).observe($("ticker-text").parentElement);
const resizer = new ResizeObserver(resize);
for (const el of [viewport, $("status-card"), $("forum-card")])
  resizer.observe(el);
resize();
try {
  const response = await fetch("coast.json");
  if (!response.ok) throw new Error("Could not load coastline");
  await buildTerrain(await response.json());
} catch (error) {
  loadFailed = true;
  $("map-status").textContent = t("mapFailed");
  $("start").disabled = true;
  console.error(error);
}
requestAnimationFrame(frame);

// Music and sound (effects and voice) on/off, each remembered on this browser.
function renderSound() {
  for (const [id, on, key] of [
    ["sound", soundOn(), "sound"],
    ["music", musicOn(), "music"],
  ]) {
    $(id).setAttribute("aria-pressed", String(on));
    $(id).setAttribute("aria-label", t(on ? `${key}OffAria` : `${key}OnAria`));
    $(id).classList.toggle("muted", !on);
  }
}
$("music").classList.toggle("hidden", !hasMusic);
$("music").addEventListener("click", () => {
  setMusic(!musicOn());
  renderSound();
  track("music_toggle", { on: musicOn() });
});
$("sound").addEventListener("click", () => {
  setSound(!soundOn());
  renderSound();
  track("sound_toggle", { on: soundOn() });
});
document.addEventListener("langchange", renderSound);
renderSound();
