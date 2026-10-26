// Portrait result card (1080×1350, the Instagram/Threads feed size) drawn on a
// canvas from the live map, plus share links for platforms without Web Share.
const W = 1080;
const H = 1350;
const FONT = `"Noto Sans CJK TC","PingFang HK","Microsoft JhengHei",Arial,sans-serif`;
const MONO = `"SFMono-Regular",Menlo,Consolas,"Liberation Mono",monospace`;
// The card is signed with the site it was made on.
const HOME = () => location.host;

const images = new Map();
function image(src) {
  if (!images.has(src))
    images.set(
      src,
      new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = src;
      }),
    );
  return images.get(src);
}

function wrap(ctx, text, x, y, width, lineHeight, maxLines = 3) {
  const lines = [];
  let line = "";
  // CJK breaks anywhere; Latin breaks at spaces.
  const tokens = text.match(/[　-鿿＀-￯]|[^\s　-鿿＀-￯]+\s*|\s+/g) ?? [];
  for (const token of tokens) {
    const next = line + token;
    if (ctx.measureText(next.trimEnd()).width > width && line) {
      lines.push(line.trimEnd());
      line = token.trimStart();
    } else line = next;
  }
  if (line) lines.push(line.trimEnd());
  if (lines.length > maxLines) {
    lines.length = maxLines;
    lines[maxLines - 1] = `${lines[maxLines - 1].slice(0, -1)}…`;
  }
  lines.forEach((l, i) => ctx.fillText(l, x, y + i * lineHeight));
  return lines.length * lineHeight;
}

const ACCENT = {
  commute: "#c76b4f",
  office: "#c76b4f",
  wfh: "#c9932f",
  pass: "#4f8a63",
  bigWin: "#f4bf52",
};

// data: { tier, eyebrow, title, heldLabel, held, outcome, bossLabel, comment,
//         bossSrc, typhoon, map (canvas), lang }
export async function renderCard(data) {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  const [logo, boss] = await Promise.all([
    image("logo.svg"),
    image(data.bossSrc),
  ]);
  const accent = ACCENT[data.tier] ?? "#f4bf52";

  ctx.fillStyle = "#f3f1e8";
  ctx.fillRect(0, 0, W, H);

  // Masthead.
  ctx.fillStyle = "#17313b";
  ctx.fillRect(0, 0, W, 170);
  // The logo's pole and outlines are ink, so it sits on a paper tile.
  ctx.fillStyle = "#f3f1e8";
  ctx.beginPath();
  ctx.roundRect(40, 18, 134, 134, 18);
  ctx.fill();
  if (logo) ctx.drawImage(logo, 44, 22, 126, 126);
  ctx.fillStyle = "#f3f1e8";
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";
  ctx.font = `900 64px ${FONT}`;
  ctx.fillText(
    data.lang === "en" ? "Mr. Li's Force Field" : "李氏力場",
    196,
    96,
  );
  ctx.font = `600 30px ${FONT}`;
  ctx.fillStyle = "#f4bf52";
  ctx.fillText(
    data.lang === "en"
      ? "李氏力場 · TYPHOON " + data.typhoon
      : "Mr. Li's Force Field · 颱風「" + data.typhoon + "」",
    198,
    140,
  );

  // Live map snapshot, cover-fit.
  const mapY = 170;
  const mapH = 470;
  ctx.fillStyle = "#1c3157";
  ctx.fillRect(0, mapY, W, mapH);
  if (data.map?.width) {
    const s = Math.max(W / data.map.width, mapH / data.map.height);
    const sw = W / s;
    const sh = mapH / s;
    ctx.drawImage(
      data.map,
      (data.map.width - sw) / 2,
      (data.map.height - sh) / 2,
      sw,
      sh,
      0,
      mapY,
      W,
      mapH,
    );
  }
  const shade = ctx.createLinearGradient(0, mapY + mapH - 160, 0, mapY + mapH);
  shade.addColorStop(0, "#f3f1e800");
  shade.addColorStop(1, "#f3f1e8");
  ctx.fillStyle = shade;
  ctx.fillRect(0, mapY + mapH - 160, W, 160);
  // Tier and title.
  let y = mapY + mapH + 10;
  ctx.fillStyle = accent;
  ctx.font = `800 34px ${FONT}`;
  const eyebrow = data.eyebrow.toUpperCase();
  const ew = ctx.measureText(eyebrow).width + 40;
  ctx.beginPath();
  ctx.roundRect(60, y - 4, ew, 56, 28);
  ctx.fill();
  ctx.fillStyle = data.tier === "bigWin" ? "#17313b" : "#fff";
  ctx.fillText(eyebrow, 80, y + 36);
  y += 120;
  ctx.fillStyle = "#17313b";
  ctx.font = `900 60px ${FONT}`;
  y += wrap(ctx, data.title, 60, y, 960, 72, 2);

  // Held-until time and boss.
  y += 30;
  ctx.font = `700 32px ${FONT}`;
  ctx.fillStyle = "#5b6d70";
  ctx.fillText(data.heldLabel, 60, y);
  ctx.font = `bold 176px Arial,${FONT}`;
  ctx.fillStyle = accent === "#f4bf52" ? "#c9932f" : accent;
  ctx.fillText(data.held, 52, y + 160);
  if (boss) ctx.drawImage(boss, 760, y - 40, 260, 306);
  y += 220;
  ctx.font = `600 36px ${FONT}`;
  ctx.fillStyle = "#17313b";
  y += wrap(ctx, data.outcome, 60, y, 680, 48, 3);

  // Boss quote.
  y = Math.max(y + 20, 1150);
  ctx.font = `italic 700 34px ${FONT}`;
  ctx.fillStyle = "#3a2410";
  wrap(ctx, `${data.bossLabel}「${data.comment}」`, 60, y, 960, 44, 2);

  // Footer.
  ctx.fillStyle = "#17313b";
  ctx.fillRect(0, H - 86, W, 86);
  ctx.fillStyle = "#f3f1e8";
  ctx.font = `800 36px ${FONT}`;
  ctx.fillText(
    data.lang === "en" ? "Mr. Li's Force Field" : "李氏力場",
    60,
    H - 30,
  );
  ctx.textAlign = "right";
  ctx.font = `600 32px ${MONO}`;
  ctx.fillStyle = "#f4bf52";
  ctx.fillText(HOME(), W - 60, H - 32);
  ctx.textAlign = "left";

  return new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
}

export const shareLinks = (text, url) => ({
  whatsapp: `https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`,
  threads: `https://www.threads.net/intent/post?text=${encodeURIComponent(`${text}\n${url}`)}`,
});
