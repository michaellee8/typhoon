// A fictional Observatory duty forecaster for announcement cards: bust portrait
// at a lectern with a microphone. Moods: warn (apologetic sweat), cancel (relieved)
// and downgrade (a resigned shrug). Not based on any real person.
const SKIN = "#f0c9a4";

const FACE = {
  warn: {
    eyes: `<circle cx="41" cy="45" r="2.4" fill="#222"/><circle cx="59" cy="45" r="2.4" fill="#222"/>`,
    brows: `M34 37 Q40 35 46 38 M54 38 Q60 35 66 37`,
    mouth: `<path d="M43 58 Q50 54 57 58" stroke="#6b3226" stroke-width="2.4" fill="none" stroke-linecap="round"/>`,
    extra: `<path d="M71 30 Q75 37 71 40 Q67 37 71 30 Z" fill="#9bd4f1" stroke="#4d93b8" stroke-width="1"/>`,
  },
  cancel: {
    eyes: `<path d="M37 46 Q41 42 45 46 M55 46 Q59 42 63 46" stroke="#222" stroke-width="2.2" fill="none" stroke-linecap="round"/>`,
    brows: `M34 36 Q40 33 46 36 M54 36 Q60 33 66 36`,
    mouth: `<path d="M42 55 Q50 62 58 55" stroke="#6b3226" stroke-width="2.4" fill="none" stroke-linecap="round"/>`,
    extra: "",
  },
  downgrade: {
    eyes: `<path d="M37 45 L45 45 M55 45 L63 45" stroke="#222" stroke-width="2.6" stroke-linecap="round"/>`,
    brows: `M34 38 Q40 37 46 38 M54 38 Q60 37 66 38`,
    mouth: `<path d="M44 57 L56 57" stroke="#6b3226" stroke-width="2.4" stroke-linecap="round"/>`,
    extra: `<text x="70" y="26" font-size="11" font-weight="700" fill="#7c8c95" font-family="sans-serif">…</text>`,
  },
};

function svg(mood) {
  const f = FACE[mood] ?? FACE.warn;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" rx="14" fill="#dceaf0"/>
  <path d="M0 70 L100 70" stroke="#b8d0da" stroke-width="1"/>
  <path d="M8 22 L24 22 M8 28 L20 28" stroke="#9ab9c6" stroke-width="2"/>
  <path d="M18 100 Q18 74 50 72 Q82 74 82 100 Z" fill="#203a5c"/>
  <path d="M42 73 L50 88 L58 73 Z" fill="#d7ebf7"/>
  <path d="M48 76 L52 76 L53 90 L50 93 L47 90 Z" fill="#2f7fb5"/>
  <rect x="44" y="62" width="12" height="12" fill="${SKIN}"/>
  <ellipse cx="50" cy="45" rx="20" ry="22" fill="${SKIN}"/>
  <path d="M29 44 Q28 22 50 21 Q72 22 71 44 Q68 30 58 29 Q46 33 32 32 Q30 37 29 44 Z" fill="#1d1d22"/>
  <path d="${f.brows}" stroke="#1d1d22" stroke-width="2.2" fill="none" stroke-linecap="round"/>
  ${f.eyes}
  <path d="M50 48 Q48 53 51 53" stroke="#c99a76" stroke-width="1.6" fill="none"/>
  ${f.mouth}
  ${f.extra}
  <rect x="22" y="86" width="56" height="14" rx="2" fill="#f4f1e6"/>
  <text x="50" y="96" text-anchor="middle" font-size="7" font-weight="700" fill="#203a5c" font-family="sans-serif">天文台 · OBSERVATORY</text>
  <path d="M66 86 L72 66" stroke="#333" stroke-width="2"/>
  <ellipse cx="73" cy="63" rx="4" ry="5" fill="#333"/>
</svg>`;
}

const urls = {};
export const hkoSvgUrl = (mood = "warn") =>
  (urls[mood] ??=
    `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg(mood))}`);
