// Regenerates the brand rasters from their sources:
//   public/logo.svg     → public/logo-animated.svg (+ scripts/brand/logo-animation.css)
//   public/favicon.svg  → favicon-16/32.png, favicon.ico, apple-touch-icon.png,
//                         icon-192.png, icon-512.png, icon-maskable-512.png
//   scripts/brand/og-cover.html (+ logo.svg, coast.json) → public/og-cover.png
// and a review sheet at artifacts/brand-contact.png.
// SVGs are rasterised by headless Chromium (Playwright); ImageMagick only packs the ICO.
// og-cover.png is then palette-quantised with sharp (libimagequant, dithered) to
// stay well under 300 KB for WhatsApp/Threads previews.
// Usage: pnpm brand
import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { chromium } from "playwright";
import sharp from "sharp";

const root = new URL("../", import.meta.url);
const pub = (name) => new URL(`public/${name}`, root);
const at = (path) => new URL(path, root);
const PAPER = "#f3f1e8";

const logo = await readFile(pub("logo.svg"), "utf8");
const favicon = await readFile(pub("favicon.svg"), "utf8");

// 1. Animated logo = static logo + embedded CSS (respects prefers-reduced-motion).
const css = await readFile(at("scripts/brand/logo-animation.css"), "utf8");
const animated = logo.replace(
  /(<title[^>]*>.*?<\/title>)/s,
  `$1\n  <style>\n${css.trim()}\n  </style>`,
);
if (animated === logo)
  throw new Error("logo.svg has no <title> to anchor the style");
await writeFile(pub("logo-animated.svg"), animated);

const browser = await chromium.launch();
const page = await browser.newPage();
await page.emulateMedia({ reducedMotion: "reduce" });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));

const COVER_BUDGET = 300 * 1024;
async function quantise(png) {
  const out = await sharp(png)
    .png({
      palette: true,
      quality: 90,
      effort: 10,
      dither: 1,
      compressionLevel: 9,
    })
    .toBuffer();
  if (out.length > COVER_BUDGET)
    errors.push(`og-cover.png is ${out.length} B, over ${COVER_BUDGET} B`);
  return out;
}

const dataUri = (svg) =>
  `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;

// Render an SVG into a size×size PNG. `pad` is the inset fraction per side,
// `bg` an opaque background (omit for transparency), `radius` corner rounding.
async function icon(svg, size, out, { pad = 0, bg, radius = 0 } = {}) {
  const inner = size * (1 - 2 * pad);
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<!doctype html><style>
    html,body{margin:0;background:transparent}
    div{width:${size}px;height:${size}px;display:grid;place-items:center;
        background:${bg || "transparent"};border-radius:${radius * size}px;overflow:hidden}
    img{width:${inner}px;height:${inner}px;display:block}
  </style><div><img src="${dataUri(svg)}"></div>`);
  await page.locator("img").evaluate((img) => img.decode());
  await page.screenshot({
    path: out.pathname,
    omitBackground: !bg || radius > 0,
  });
}

await icon(favicon, 16, pub("favicon-16.png"));
await icon(favicon, 32, pub("favicon-32.png"));
await icon(favicon, 180, pub("apple-touch-icon.png"), { pad: 0.1, bg: PAPER });
await icon(favicon, 192, pub("icon-192.png"), {
  pad: 0.08,
  bg: PAPER,
  radius: 0.22,
});
await icon(favicon, 512, pub("icon-512.png"), {
  pad: 0.08,
  bg: PAPER,
  radius: 0.22,
});
// Maskable: full-bleed background, art kept inside the centre safe circle.
await icon(favicon, 512, pub("icon-maskable-512.png"), { pad: 0.2, bg: PAPER });
execFileSync("convert", [
  pub("favicon-16.png").pathname,
  pub("favicon-32.png").pathname,
  pub("favicon.ico").pathname,
]);

// 2. Social cover.
const coast = await readFile(pub("coast.json"), "utf8");
const cover = (await readFile(at("scripts/brand/og-cover.html"), "utf8"))
  .replace("<!--LOGO-->", logo)
  .replace("/*COAST*/ null", coast);
await page.setViewportSize({ width: 1200, height: 630 });
await page.setContent(cover);
await page.waitForFunction(() => window.__brandReady === true);
const tofu = await page.evaluate(async () => {
  // Every CJK glyph must come from a real CJK font, not a fallback box.
  const text = document.querySelector(".title").innerText;
  return document.fonts.check('700 26px "Noto Sans CJK HK"', text) ? "" : text;
});
if (tofu) errors.push(`CJK font missing for: ${tofu}`);
const coverPng = await page.screenshot();
await writeFile(pub("og-cover.png"), await quantise(coverPng));

// 3. Contact sheet for review (artifacts/ is gitignored).
await mkdir(at("artifacts/"), { recursive: true });
const png = async (name) =>
  `data:image/png;base64,${(await readFile(pub(name))).toString("base64")}`;
const pixel = (src, scale, n) =>
  `<img src="${src}" style="width:${n * scale}px;height:${n * scale}px;image-rendering:pixelated">`;
const cell = (label, html, bg = PAPER) =>
  `<figure style="background:${bg}"><div>${html}</div><figcaption>${label}</figcaption></figure>`;
const sheet = `<!doctype html><style>
  body{margin:0;padding:24px;background:#d9d6cb;font:13px/1.3 "Liberation Mono",monospace;color:#152e38;width:1552px}
  .row{display:flex;gap:16px;align-items:flex-end;margin-bottom:16px;flex-wrap:wrap}
  figure{margin:0;padding:12px;border-radius:8px}
  figure>div{display:flex;gap:12px;align-items:center}
  figcaption{margin-top:8px}
  .mast{display:flex;align-items:center;gap:12px;font:900 29px "Noto Sans CJK HK";letter-spacing:-1.5px}
</style>
<div class="row">
  ${cell("logo.svg 512", `<img src="${dataUri(logo)}" width="512" height="512">`)}
  ${cell("logo.svg 64 / 48 / 40", `<img src="${dataUri(logo)}" width="64"><img src="${dataUri(logo)}" width="48"><img src="${dataUri(logo)}" width="40">`)}
  ${cell("logo on dark", `<img src="${dataUri(logo)}" width="96">`, "#15294d")}
  ${cell("masthead mock", `<div class="mast"><img src="${dataUri(logo)}" width="56">李氏<span style="color:#bb7d20">力場</span></div>`)}
</div>
<div class="row">
  ${cell("favicon-16 ×8", pixel(await png("favicon-16.png"), 8, 16), "#fff")}
  ${cell("favicon-32 ×8", pixel(await png("favicon-32.png"), 8, 32), "#fff")}
  ${cell("16 / 32 actual (light, dark tab)", `${pixel(await png("favicon-16.png"), 1, 16)}${pixel(await png("favicon-32.png"), 1, 32)}`, "#fff")}
  ${cell("dark tab", `${pixel(await png("favicon-16.png"), 1, 16)}${pixel(await png("favicon-32.png"), 1, 32)}`, "#202124")}
  ${cell("apple-touch-icon 180", `<img src="${await png("apple-touch-icon.png")}" style="border-radius:40px">`, "#fff")}
  ${cell("icon-192", `<img src="${await png("icon-192.png")}">`, "#fff")}
</div>
<div class="row">
  ${cell("icon-512 (½)", `<img src="${await png("icon-512.png")}" width="256">`, "#fff")}
  ${cell("maskable-512 (½), safe circle", `<div style="position:relative;width:256px;height:256px"><img src="${await png("icon-maskable-512.png")}" width="256"><div style="position:absolute;left:25.6px;top:25.6px;width:204.8px;height:204.8px;border:2px dashed #e0464680;border-radius:50%;box-sizing:border-box"></div></div>`, "#fff")}
  ${cell("og-cover 1200×630 (¾), square crop", `<div style="position:relative;width:900px;height:472.5px"><img src="${await png("og-cover.png")}" width="900"><div style="position:absolute;left:213.75px;top:0;width:472.5px;height:472.5px;outline:2px dashed #fff8;box-sizing:border-box"></div><div style="position:absolute;left:45px;top:45px;right:45px;bottom:45px;outline:1px dotted #f3be5588"></div></div>`, "#fff")}
</div>`;
await page.setViewportSize({ width: 1600, height: 900 });
await page.setContent(sheet);
await page.evaluate(() =>
  Promise.all([...document.images].map((i) => i.decode().catch(() => {}))),
);
await page.screenshot({
  path: at("artifacts/brand-contact.png").pathname,
  fullPage: true,
});

await page.close();
await browser.close();
if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log("brand assets written to public/ and artifacts/brand-contact.png");
