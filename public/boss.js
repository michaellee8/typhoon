// 李氏力場's owner: a hand-drawn chibi tycoon caricature (bald crown, grey sides,
// thick round glasses, navy suit). Poses: idle, push (palms out at a pulse),
// smug (the 14:00 WFH call), gloat (staff back at the office) and sour (he lost).
const SKIN = "#f1c9a2";
const SUIT = "#1f2b47";
const sleeve = (d) =>
  `<path d="${d}" stroke="${SUIT}" stroke-width="13" stroke-linecap="round" fill="none"/>`;
const hand = (x, y, r = 7) =>
  `<circle cx="${x}" cy="${y}" r="${r}" fill="${SKIN}"/>`;

const ARMS = {
  down: `${sleeve("M35 96 Q27 112 30 128")}${sleeve("M85 96 Q93 112 90 128")}${hand(30, 131)}${hand(90, 131)}`,
  push: `${sleeve("M34 98 Q20 92 10 80")}${sleeve("M86 98 Q100 92 110 80")}${hand(9, 76, 8)}${hand(111, 76, 8)}
    <circle cx="9" cy="76" r="15" fill="none" stroke="#f3c262" stroke-width="3" opacity=".8"/>
    <circle cx="111" cy="76" r="15" fill="none" stroke="#f3c262" stroke-width="3" opacity=".8"/>`,
  // One hand on the hip, the other raising a coffee cup.
  smug: `${sleeve("M35 96 Q22 110 34 120")}${sleeve("M85 96 Q100 96 102 80")}${hand(36, 120)}
    <rect x="94" y="62" width="16" height="17" rx="3" fill="#f4f1e6" stroke="#8a6a3c" stroke-width="2"/>
    <path d="M110 66 Q117 70 110 75" stroke="#8a6a3c" stroke-width="2" fill="none"/>
    <path d="M98 57 Q101 52 98 47 M105 57 Q108 52 105 47" stroke="#bbb" stroke-width="1.6" fill="none"/>${hand(100, 80)}`,
  // Both arms up, laughing.
  gloat: `${sleeve("M34 96 Q18 84 16 66")}${sleeve("M86 96 Q102 84 104 66")}${hand(16, 62, 8)}${hand(104, 62, 8)}`,
  // Hands clutching the sides of the head.
  sour: `${sleeve("M34 98 Q16 86 22 64")}${sleeve("M86 98 Q104 86 98 64")}${hand(24, 60, 8)}${hand(96, 60, 8)}`,
};

const FACE = {
  idle: {
    eyes: `<circle cx="46" cy="53" r="2.6" fill="#222"/><circle cx="74" cy="53" r="2.6" fill="#222"/>`,
    mouth: `<path d="M47 70 Q60 80 73 70" stroke="#5a2b22" stroke-width="3" fill="none" stroke-linecap="round"/>`,
  },
  push: {
    eyes: `<path d="M41 53 Q46 49 51 53 M69 53 Q74 49 79 53" stroke="#222" stroke-width="2.5" fill="none" stroke-linecap="round"/>`,
    mouth: `<path d="M47 70 Q60 84 73 70 Z" fill="#7b2e2a"/><path d="M49 71 L71 71" stroke="#fff" stroke-width="2.5"/>`,
  },
  smug: {
    brows: `<path d="M38 41 Q46 39 54 41 M66 37 Q74 30 82 35" stroke="#9c958b" stroke-width="2.5" fill="none" stroke-linecap="round"/>`,
    eyes: `<path d="M40 53 L52 53" stroke="#222" stroke-width="3" stroke-linecap="round"/><path d="M41 55 Q46 57 51 55" stroke="#222" stroke-width="1.8" fill="none"/>
      <path d="M68 52 L80 52" stroke="#222" stroke-width="3" stroke-linecap="round"/><path d="M69 54 Q74 57 79 54" stroke="#222" stroke-width="1.8" fill="none"/>`,
    mouth: `<path d="M48 72 Q62 76 74 66" stroke="#5a2b22" stroke-width="3" fill="none" stroke-linecap="round"/>`,
  },
  gloat: {
    eyes: `<path d="M41 53 Q46 49 51 53 M69 53 Q74 49 79 53" stroke="#222" stroke-width="2.5" fill="none" stroke-linecap="round"/>`,
    mouth: `<path d="M45 68 Q60 90 75 68 Z" fill="#7b2e2a"/><path d="M47 69 L73 69" stroke="#fff" stroke-width="3"/><ellipse cx="60" cy="80" rx="6" ry="3" fill="#d4675e"/>`,
    extra: `<text x="-4" y="30" font-size="16" font-weight="900" fill="#c9932f" font-family="sans-serif">哈</text><text x="104" y="24" font-size="13" font-weight="900" fill="#c9932f" font-family="sans-serif">哈</text>`,
  },
  sour: {
    brows: `<path d="M38 36 Q46 42 54 41 M66 41 Q74 42 82 36" stroke="#9c958b" stroke-width="2.5" fill="none" stroke-linecap="round"/>`,
    eyes: `<circle cx="46" cy="54" r="2.4" fill="#222"/><circle cx="74" cy="54" r="2.4" fill="#222"/>
      <path d="M43 62 Q42 70 45 72" stroke="#7cc3e8" stroke-width="2.4" fill="none" stroke-linecap="round"/>`,
    mouth: `<path d="M48 75 Q60 66 72 75" stroke="#5a2b22" stroke-width="3" fill="none" stroke-linecap="round"/>`,
    extra: `<path d="M98 28 Q103 37 98 41 Q93 37 98 28 Z" fill="#9bd4f1" stroke="#4d93b8" stroke-width="1.2"/>`,
  },
};

const ARMS_FOR = {
  idle: "down",
  push: "push",
  smug: "smug",
  gloat: "gloat",
  sour: "sour",
};

function svg(pose) {
  const face = FACE[pose] ?? FACE.idle;
  const brows =
    face.brows ??
    `<path d="M38 39 Q46 35 54 39 M66 39 Q74 35 82 39" stroke="#9c958b" stroke-width="2.5" fill="none" stroke-linecap="round"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-10 0 140 165">
  <ellipse cx="60" cy="160" rx="30" ry="4" fill="#000" opacity=".35"/>
  <rect x="44" y="136" width="13" height="20" fill="#18213a"/><rect x="63" y="136" width="13" height="20" fill="#18213a"/>
  <ellipse cx="49" cy="157" rx="10" ry="4.5" fill="#111"/><ellipse cx="71" cy="157" rx="10" ry="4.5" fill="#111"/>
  <path d="M33 92 Q60 82 87 92 L91 140 L29 140 Z" fill="${SUIT}"/>
  <path d="M50 87 L60 112 L70 87 Z" fill="#f4f1e6"/>
  <path d="M57 92 L63 92 L65 114 L60 120 L55 114 Z" fill="#a8322d"/>
  <path d="M48 88 L58 116 L44 104 Z M72 88 L62 116 L76 104 Z" fill="#2c3b5f"/>
  <ellipse cx="25" cy="56" rx="7" ry="11" fill="#e5b58d"/><ellipse cx="95" cy="56" rx="7" ry="11" fill="#e5b58d"/>
  <ellipse cx="60" cy="52" rx="34" ry="36" fill="${SKIN}"/>
  <path d="M27 50 Q26 30 36 24 Q32 38 33 50 Z M93 50 Q94 30 84 24 Q88 38 87 50 Z" fill="#c9c5bd"/>
  <path d="M44 22 Q60 17 76 22" stroke="#d9a983" stroke-width="2" fill="none" opacity=".6"/>
  ${brows}
  <circle cx="46" cy="52" r="11" fill="#fff" fill-opacity=".25" stroke="#151515" stroke-width="4.5"/>
  <circle cx="74" cy="52" r="11" fill="#fff" fill-opacity=".25" stroke="#151515" stroke-width="4.5"/>
  <path d="M57 51 L63 51 M35 50 L28 48 M85 50 L92 48" stroke="#151515" stroke-width="3.5"/>
  ${face.eyes}
  <path d="M59 56 Q56 64 60 65" stroke="#cf9e78" stroke-width="2" fill="none"/>
  <path d="M42 67 Q44 71 46 72 M78 67 Q76 71 74 72" stroke="#d9a983" stroke-width="1.6" fill="none"/>
  ${face.mouth}
  ${ARMS[ARMS_FOR[pose] ?? "down"]}
  ${face.extra ?? ""}
</svg>`;
}

const urls = {};
export const bossSvgUrl = (pose = "idle") =>
  (urls[pose] ??=
    `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg(pose))}`);

function load(pose) {
  const image = new Image();
  image.src = bossSvgUrl(pose);
  return image;
}

export const BOSS_POSES = ["idle", "push", "smug", "gloat", "sour"];
export const bossImages = Object.fromEntries(
  BOSS_POSES.map((pose) => [pose, load(pose)]),
);
