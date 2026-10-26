// Voices the Observatory announcements (static MiniMax clips, Cantonese host).
// The clips carry no typhoon name and no time, so one set fits every round.
// Usage: node scripts/build-hko-voice.mjs   (writes public/audio/hko/*.mp3)
import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { COPY } from "../public/copy.js";

const VOICE = "Cantonese_ProfessionalHost（M)";
// Same meaning as COPY.hkoTemplate, without {name} and {time}.
const WARNING_LEAD = "熱帶氣旋逐漸減弱，天文台正考慮改發三號強風信號。";
// Jyutping for words the voice misreads (checked by transcribing the clips).
const TONES = ["㗎咋/(gaa3)(zaa3)"];
// TTS input rewrites, [on screen, spoken]: the voice reads 返 (返工) wrongly
// but 番 right, and mangles 被竇.
const SPOKEN = [
  ["被竇", "張床上面"],
  ["返", "番"],
];
const spoken = (text) =>
  SPOKEN.reduce((s, [from, to]) => s.replaceAll(from, to), text);

const out = new URL("../public/audio/hko/", import.meta.url);
mkdirSync(out, { recursive: true });
const clips = [
  [
    "eight-am",
    "八號烈風或暴風信號現正生效，請市民留在室內安全地方，切勿外出或進行水上活動。",
  ],
  ...COPY.hko.warning.map((line, i) => [
    `warning-${i}`,
    WARNING_LEAD + line.zh,
  ]),
  ...COPY.hko.cancelled.map((line, i) => [`cancelled-${i}`, line.zh]),
];
for (const [name, text] of clips) {
  if (process.argv[2] && !process.argv.slice(2).includes(name)) continue;
  execFileSync(
    "uv",
    [
      "run",
      "--quiet",
      "python",
      "scripts/tts-minimax.py",
      new URL(`${name}.mp3`, out).pathname,
      spoken(text),
      "--voice",
      VOICE,
      ...TONES.flatMap((tone) => ["--tone", tone]),
      "--bitrate",
      "64000",
    ],
    { stdio: "inherit", cwd: new URL("..", import.meta.url).pathname },
  );
}
