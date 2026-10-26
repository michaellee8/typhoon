// Music and sound effects. No music ships with the game: set MUSIC_SRC to a
// track of your own (e.g. "audio/music.m4a") and it plays well under the action,
// from the top when a round starts, looping whole. Without one the music button
// is hidden. The effects are synthesised with Web Audio, so there are no sample files.
// Voice lines (the Observatory's announcements, audio/hko/) are pregenerated
// AI voice clips; they play through the sound channel and duck the music.
// Volume goes through a GainNode because iOS ignores HTMLMediaElement.volume.
// Music and sound (effects and any voice lines) mute separately.
const SOUND = "typhoon.sound"; // "on" | "off"
const MUSIC = "typhoon.music"; // "on" | "off"; defaults to the sound setting
const MUSIC_LEVEL = 0.09; // about −21 dB: the −16 LUFS master sits near −37 LUFS
const MUSIC_DUCKED = 0.036; // under the result card and under a voice line
const SFX_LEVEL = 0.5;

let enabled = true;
let musicEnabled = true;
try {
  enabled = localStorage.getItem(SOUND) !== "off";
  musicEnabled =
    (localStorage.getItem(MUSIC) ?? localStorage.getItem(SOUND)) !== "off";
} catch {}

let ctx = null;
let master, musicGain, sfxGain, noise;
const MUSIC_SRC = "";
const music = new Audio();
if (MUSIC_SRC) {
  music.src = MUSIC_SRC;
  music.loop = true;
  music.preload = "auto";
}
export const hasMusic = Boolean(MUSIC_SRC);
let musicWanted = false;
let musicDucked = false;
const voices = new Map(); // url -> Promise<AudioBuffer | null>
let speaking = null; // { src, until }

// Built on the first user gesture (browsers keep audio locked until then).
function graph() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = 1;
  master.connect(ctx.destination);
  musicGain = ctx.createGain();
  musicGain.gain.value = MUSIC_LEVEL;
  musicGain.connect(master);
  if (hasMusic) ctx.createMediaElementSource(music).connect(musicGain);
  sfxGain = ctx.createGain();
  sfxGain.gain.value = enabled ? SFX_LEVEL : 0;
  sfxGain.connect(master);
  noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const data = noise.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return ctx;
}

function wake() {
  const c = graph();
  if (c?.state === "suspended") c.resume().catch(() => {});
  return c;
}

function syncMusic() {
  if (hasMusic && musicWanted && musicEnabled) music.play().catch(() => {});
  else music.pause();
}

function ramp(param, value, seconds = 0.4) {
  if (!ctx) return;
  param.cancelScheduledValues(ctx.currentTime);
  param.setValueAtTime(param.value, ctx.currentTime);
  param.linearRampToValueAtTime(value, ctx.currentTime + seconds);
}

export const soundOn = () => enabled;
export const musicOn = () => musicEnabled;
export const musicPlaying = () => !music.paused;
export const voicePlaying = () => speaking?.url ?? null;

// Effects and voice lines.
export function setSound(on) {
  enabled = on;
  try {
    localStorage.setItem(SOUND, on ? "on" : "off");
  } catch {}
  if (wake()) ramp(sfxGain.gain, on ? SFX_LEVEL : 0, 0.15);
}

export function setMusic(on) {
  musicEnabled = on;
  try {
    localStorage.setItem(MUSIC, on ? "on" : "off");
  } catch {}
  wake();
  syncMusic();
}

// A new round: music from the top at full (background) level.
export function startMusic() {
  if (!wake()) return;
  musicDucked = false;
  ramp(musicGain.gain, MUSIC_LEVEL, 0.05);
  if (hasMusic) music.currentTime = 0;
  musicWanted = true;
  syncMusic();
}

export function pauseMusic() {
  musicWanted = false;
  syncMusic();
}

export function resumeMusic() {
  wake();
  musicWanted = true;
  syncMusic();
}

// The result card: keep the track going, quieter.
export function duckMusic() {
  musicDucked = true;
  if (ctx) ramp(musicGain.gain, MUSIC_DUCKED, 1.2);
}

// ---- Voice -----------------------------------------------------------------

function loadVoice(url) {
  if (!voices.has(url))
    voices.set(
      url,
      fetch(url)
        .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(r.status)))
        .then((data) => ctx.decodeAudioData(data))
        .catch(() => {
          voices.delete(url); // try again next time
          return null;
        }),
    );
  return voices.get(url);
}

// Fetch and decode clips ahead of time (after the first gesture).
export function preloadVoices(urls) {
  if (wake()) for (const url of urls) loadVoice(url);
}

// Plays one clip after `delay` seconds (room for a jingle), cutting off any
// line still playing. Resolves to the seconds until it ends, or 0 when it
// cannot play (no audio, still loading or failed).
export async function voice(url, delay = 0) {
  stopVoice();
  if (!wake()) return 0;
  const pending = loadVoice(url);
  const buffer = await Promise.race([
    pending,
    new Promise((done) => setTimeout(() => done(null), 1500)),
  ]);
  if (!buffer) return 0;
  stopVoice();
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.connect(sfxGain);
  const line = { src, url };
  speaking = line;
  if (!musicDucked) ramp(musicGain.gain, MUSIC_DUCKED, 0.3);
  src.onended = () => {
    if (speaking !== line) return;
    speaking = null;
    if (!musicDucked) ramp(musicGain.gain, MUSIC_LEVEL, 0.8);
  };
  src.start(ctx.currentTime + delay);
  return delay + buffer.duration;
}

export function stopVoice() {
  const line = speaking;
  if (!line) return;
  speaking = null;
  try {
    line.src.stop();
  } catch {}
  if (!musicDucked) ramp(musicGain.gain, MUSIC_LEVEL, 0.3);
}

// ---- Effects ---------------------------------------------------------------

function tone(type, freq, start, length, peak = 0.5, out = sfxGain) {
  const osc = ctx.createOscillator();
  const env = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  env.gain.setValueAtTime(0.0001, start);
  env.gain.exponentialRampToValueAtTime(peak, start + 0.012);
  env.gain.exponentialRampToValueAtTime(0.0001, start + length);
  osc.connect(env).connect(out);
  osc.start(start);
  osc.stop(start + length + 0.05);
  return osc;
}

function noiseBurst(start, length, from, to, peak = 0.5, q = 1.2) {
  const src = ctx.createBufferSource();
  src.buffer = noise;
  src.loop = true;
  const band = ctx.createBiquadFilter();
  band.type = "bandpass";
  band.Q.value = q;
  band.frequency.setValueAtTime(from, start);
  band.frequency.exponentialRampToValueAtTime(to, start + length);
  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, start);
  env.gain.exponentialRampToValueAtTime(peak, start + length * 0.3);
  env.gain.exponentialRampToValueAtTime(0.0001, start + length);
  src.connect(band).connect(env).connect(sfxGain);
  src.start(start);
  src.stop(start + length + 0.05);
}

function vibrato(osc, start, length, rate, depth) {
  const lfo = ctx.createOscillator();
  const amount = ctx.createGain();
  lfo.frequency.value = rate;
  amount.gain.value = depth;
  lfo.connect(amount).connect(osc.frequency);
  lfo.start(start);
  lfo.stop(start + length + 0.05);
}

const EFFECTS = {
  // The force field bounces the storm: a cartoon spring.
  boing(t) {
    const osc = tone("sine", 160, t, 0.55, 0.6);
    osc.frequency.exponentialRampToValueAtTime(520, t + 0.09);
    osc.frequency.exponentialRampToValueAtTime(240, t + 0.5);
    vibrato(osc, t, 0.55, 22, 45);
  },
  // 借東風 boost.
  whoosh(t) {
    noiseBurst(t, 0.65, 300, 2600, 0.7, 0.9);
  },
  // No. 8 goes up: two bright bells.
  hoist(t) {
    tone("triangle", 988, t, 0.5, 0.35);
    tone("sine", 1976, t, 0.35, 0.12);
    tone("triangle", 1319, t + 0.14, 0.7, 0.35);
    tone("sine", 2637, t + 0.14, 0.45, 0.1);
  },
  // The Observatory is considering No. 3: "uh-oh".
  uhoh(t) {
    const a = tone("square", 523, t, 0.2, 0.18);
    const b = tone("square", 392, t + 0.2, 0.42, 0.18);
    vibrato(b, t + 0.2, 0.42, 7, 8);
    a.frequency.linearRampToValueAtTime(500, t + 0.2);
  },
  // The boss's memo lands: a phone notification.
  ding(t) {
    tone("sine", 1568, t, 0.35, 0.3);
    tone("sine", 2093, t + 0.09, 0.5, 0.25);
  },
  // Downgrade before 14:00: sad trombone.
  wahwah(t) {
    const out = ctx.createBiquadFilter();
    out.type = "lowpass";
    out.frequency.value = 1400;
    out.connect(sfxGain);
    [392, 370, 349].forEach((f, i) =>
      tone("sawtooth", f, t + i * 0.42, 0.4, 0.22, out),
    );
    const last = tone("sawtooth", 330, t + 1.26, 1.1, 0.22, out);
    last.frequency.linearRampToValueAtTime(311, t + 2.2);
    vibrato(last, t + 1.4, 0.9, 6, 9);
  },
  // No No. 8 by 08:00: the alarm clock rings.
  alarm(t) {
    for (let i = 0; i < 4; i++) {
      tone("square", 2093, t + i * 0.24, 0.16, 0.08);
      tone("square", 2349, t + i * 0.24 + 0.08, 0.08, 0.06);
    }
  },
  // Past 15:00 or a big win: a party blower and a pop.
  party(t) {
    const osc = tone("square", 440, t, 0.7, 0.12);
    osc.frequency.exponentialRampToValueAtTime(880, t + 0.6);
    vibrato(osc, t, 0.7, 28, 30);
    noiseBurst(t + 0.72, 0.12, 3000, 1200, 0.5, 0.7);
  },
};

export function sfx(name) {
  if (!enabled || !EFFECTS[name] || !wake()) return;
  EFFECTS[name](ctx.currentTime + 0.01);
}
