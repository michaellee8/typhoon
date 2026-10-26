// Two languages: Hong Kong Cantonese (繁中) and English. Static markup carries
// data-i18n / data-i18n-html / data-i18n-aria keys; dynamic text calls t().
const STORAGE = "typhoon.lang";

export const UI = {
  docTitle: {
    zh: "李氏力場 · Mr. Li's Force Field｜駕駛颱風爭取八號風球",
    en: "Mr. Li's Force Field · 李氏力場 | Steer a typhoon, win a T8 day off",
  },
  docDescription: {
    zh: "呢個風假，自己爭取。駕駛颱風，突破李氏力場，八點前掛八號，撐過三點救打工仔。免費網頁遊戲。",
    en: "Earn your typhoon day off. Steer a typhoon past Mr. Li's Force Field, get Signal No. 8 up before 8am and hold it past 3pm. A free Hong Kong browser game.",
  },
  brandAria: { zh: "李氏力場主頁", en: "Mr. Li's Force Field home" },
  brandMain: { zh: "李氏力場", en: "Mr. Li's Force Field" },
  brandSub: { zh: "Mr. Li's Force Field", en: "李氏力場" },
  help: { zh: "玩法", en: "How to play" },
  helpAria: { zh: "玩法說明", en: "How to play" },
  fullscreenAria: { zh: "全螢幕", en: "Full screen" },
  githubAria: { zh: "GitHub 原始碼", en: "Source code on GitHub" },
  statusToggleAria: { zh: "詳細狀態", en: "Full status" },
  forumToggleAria: { zh: "討論區", en: "Forum thread" },
  langButton: { zh: "EN", en: "中" },
  langAria: { zh: "Switch to English", en: "切換至中文" },
  tickerLabel: { zh: "快訊", en: "BREAKING" },
  tickerReady: {
    zh: "南海出現熱帶氣旋，全港打工仔密切留意天文台消息。",
    en: "Tropical cyclone forms in the South China Sea. Office workers refresh the Observatory page.",
  },
  mapAria: { zh: "南海颱風遊戲", en: "South China Sea typhoon game" },
  mapReady: {
    zh: "南海可見光雲圖 · 流體模擬",
    en: "South China Sea visible imagery · fluid sim",
  },
  mapPlaying: { zh: "星期一救援行動進行中", en: "Monday rescue in progress" },
  mapPaused: { zh: "救援暫停 · 時鐘已停止", en: "Paused · clock stopped" },
  mapOver: { zh: "本日任務完結", en: "Day over" },
  mapFailed: {
    zh: "地圖未能載入，請重新整理",
    en: "Map failed to load. Please refresh.",
  },
  pauseAria: { zh: "暫停遊戲", en: "Pause" },
  canvasAria: {
    zh: "遊戲海面：拖曳控制颱風，亦可用方向鍵或 WASD 移動",
    en: "Game sea: drag to steer the typhoon, or use the arrow keys or WASD",
  },
  fieldName: { zh: "李氏力場", en: "Mr. Li's Force Field" },
  fieldReady: { zh: "待機中", en: "standing by" },
  fieldPaused: { zh: "暫停中", en: "paused" },
  fieldOver: { zh: "收工", en: "off duty" },
  fieldPulse: { zh: "脈衝倒數 {s}s", en: "pulse in {s}s" },
  contactSea: {
    zh: "全海面 · 快速回氣 +22.5/s",
    en: "Open sea · +22.5 energy/s",
  },
  contactLand: {
    zh: "登陸 {p}% · 持續減弱",
    en: "Over land {p}% · weakening",
  },
  boost: { zh: "借東風", en: "Boost" },
  boostKeys: { zh: "SPACE / SHIFT · 衝刺", en: "SPACE / SHIFT" },
  boostCooling: { zh: "{s}s 回氣中", en: "recharging {s}s" },
  boostAria: {
    zh: "借東風衝刺，亦可按空白鍵或 Shift",
    en: "Boost, or press Space or Shift",
  },
  canvasHint: { zh: "拖曳海面操控颱風", en: "Drag the sea to steer" },
  canvasHintKeys: { zh: "／ WASD · 方向鍵", en: "/ WASD · arrow keys" },
  introTitle: {
    zh: "呢個風假，<br />自己爭取<span>。</span>",
    en: "Earn your<br />typhoon day<span>.</span>",
  },
  introBody: {
    zh: "你就係個風。<br />突破李氏力場，救救星期一嘅打工仔。",
    en: "You are the typhoon.<br />Break Mr. Li's Force Field and save Hong Kong's Monday.",
  },
  missionLabel: { zh: "任務", en: "Goal" },
  mission: {
    zh: "08:00 前掛八號；14:00 前唔好落波；撐過 15:00 就過關。",
    en: "T8 up by 08:00. Don't let it drop before 14:00. Hold past 15:00 to pass.",
  },
  introTip: {
    zh: "拖住個風吹去香港！八點未掛八號，全港都要返工㗎。",
    en: "Drag the storm to Hong Kong! No T8 by 8am and everyone goes to work.",
  },
  start: { zh: "開風！", en: "Blow!" },
  footRound: { zh: "一局約 2 分鐘", en: "About 2 minutes" },
  footControls: { zh: "拖曳／方向鍵", en: "Drag / arrow keys" },
  footInstant: { zh: "即開即玩", en: "No install" },
  pauseTitle: { zh: "個風抖緊。", en: "The storm is catching its breath." },
  pauseBody: {
    zh: "打工仔嘅命運，仲喺你手上。",
    en: "Hong Kong's office workers are still counting on you.",
  },
  resume: { zh: "繼續開風", en: "Keep blowing" },
  restart: { zh: "重新開始", en: "Restart" },
  heldLabel: { zh: "八號撐到", en: "T8 held until" },
  heldNone: { zh: "冇八號", en: "No T8" },
  tierCommute: { zh: "照常返工", en: "Business as usual" },
  tierOffice: {
    zh: "最慘結局 · 返工",
    en: "Worst ending · back to the office",
  },
  tierWfh: { zh: "WFH", en: "Work from home" },
  tierPass: { zh: "過關", en: "Passed" },
  tierBigWin: { zh: "大勝", en: "Big win" },
  outcomeCommute: {
    zh: "08:00 仍未掛八號，全港照常返工。",
    en: "No T8 at 08:00. Everyone commutes as usual.",
  },
  outcomeOffice: {
    zh: "{time} 改發三號，{back} 前要返到公司，仲要逼車兼大塞車。",
    en: "No. 3 at {time}. Back at your desk by {back}, through the gridlock.",
  },
  outcomeWfh: {
    zh: "{time} 改發三號。唔使返公司，但要開電腦 WFH。",
    en: "No. 3 at {time}. No commute, but the laptop comes out: WFH.",
  },
  outcomePass: {
    zh: "{time} 先改發三號，過咗三點，今日唔使做！",
    en: "No. 3 only at {time}, after 3pm. The day is yours!",
  },
  outcomeBigWin: {
    zh: "八號一直掛到 18:00 收工，全日唔使做！",
    en: "T8 stayed up until 18:00. A whole day off!",
  },
  dissipated: {
    zh: "（個風喺 {time} 散咗，天文台即刻落波。）",
    en: "(The storm fell apart at {time}, so the Observatory dropped the signal.)",
  },
  bossSays: { zh: "老細：", en: "The boss:" },
  playAgain: { zh: "再開一個風", en: "Another typhoon" },
  share: { zh: "分享戰績", en: "Share result" },
  shareWhatsApp: { zh: "WhatsApp", en: "WhatsApp" },
  shareThreads: { zh: "Threads", en: "Threads" },
  shareDownload: { zh: "下載圖片", en: "Save image" },
  shareCopy: { zh: "複製文字", en: "Copy text" },
  shareIgSaved: {
    zh: "圖片已下載，喺 IG 揀「新帖子」上載就得。",
    en: "Image saved. Post it from Instagram's New post.",
  },
  shareCopied: {
    zh: "已複製！快啲 send 去返工群組。",
    en: "Copied! Send it to the work group chat.",
  },
  shareSaved: { zh: "圖片已下載。", en: "Image saved." },
  shareText: {
    zh: "《李氏力場》我將八號撐到 {time}：{tier}！你又撐唔撐到三點？",
    en: "I held T8 until {time} in Mr. Li's Force Field: {tier}! Can you hold it past 3pm?",
  },
  shareTextNone: {
    zh: "《李氏力場》八點都掛唔到八號，我要返工……你得唔得？",
    en: "Couldn't get T8 up by 8am in Mr. Li's Force Field. Off to work… Can you do better?",
  },
  cardHeld: { zh: "八號撐到", en: "T8 HELD UNTIL" },
  legendRing: { zh: "登陸判定圈", en: "Land-contact ring" },
  legendField: { zh: "李氏力場", en: "Force field" },
  scoreLabel: { zh: "八號撐到", en: "T8 held until" },
  mapCornerSim: { zh: "流體 + 水氣模擬", en: "FLUID + MOISTURE SIMULATION" },
  introEyebrow: { zh: "星期一拯救任務", en: "MONDAY RESCUE MISSION" },
  nextBefore8: { zh: "08:00 前要掛八號", en: "T8 needed by 08:00" },
  nextBefore14: {
    zh: "撐到 14:00，落波都唔使返公司",
    en: "Hold to 14:00 and a drop means WFH, not the office",
  },
  nextBefore15: { zh: "撐過 15:00 就過關", en: "Past 15:00 is a pass" },
  nextBefore18: { zh: "撐到 18:00 大勝", en: "Hold to 18:00 for the big win" },
  nextDone: { zh: "收工", en: "Day over" },
  signal1: { zh: "一號戒備信號", en: "Standby Signal No. 1" },
  signal3: { zh: "三號強風信號", en: "Strong Wind Signal No. 3" },
  signal8NE: {
    zh: "八號東北烈風或暴風信號",
    en: "No. 8 Northeast Gale or Storm Signal",
  },
  signal8SE: {
    zh: "八號東南烈風或暴風信號",
    en: "No. 8 Southeast Gale or Storm Signal",
  },
  signal8SW: {
    zh: "八號西南烈風或暴風信號",
    en: "No. 8 Southwest Gale or Storm Signal",
  },
  signal8NW: {
    zh: "八號西北烈風或暴風信號",
    en: "No. 8 Northwest Gale or Storm Signal",
  },
  signalShort8NE: { zh: "八號東北生效中", en: "No. 8 NE in force" },
  signalShort8SE: { zh: "八號東南生效中", en: "No. 8 SE in force" },
  signalShort8SW: { zh: "八號西南生效中", en: "No. 8 SW in force" },
  signalShort8NW: { zh: "八號西北生效中", en: "No. 8 NW in force" },
  signalShort9: { zh: "九號生效中", en: "No. 9 in force" },
  signalShort10: { zh: "十號生效中", en: "No. 10 in force" },
  signal9: {
    zh: "九號烈風或暴風風力增強信號",
    en: "Increasing Gale or Storm Signal No. 9",
  },
  signal10: { zh: "十號颶風信號", en: "Hurricane Signal No. 10" },
  notePre8Up: { zh: "八點前要保持住", en: "Keep it up through 08:00" },
  notePre8Down: { zh: "08:00 前要掛起", en: "Must be up by 08:00" },
  noteHeld: { zh: "天文台維持{signal}", en: "The Observatory holds {signal}" },
  heldSignal8: { zh: "八號", en: "T8" },
  heldSignal9: { zh: "九號", en: "No. 9" },
  heldSignal10: { zh: "十號", en: "No. 10" },
  noteWarned: {
    zh: "天文台考慮 {time} 改發三號",
    en: "Observatory may issue No. 3 at {time}",
  },
  noteDown: { zh: "已改發三號", en: "Replaced by No. 3" },
  noteWaiting: { zh: "打工仔仲等緊你", en: "Office workers are waiting" },
  windUnit: { zh: "km/h · 香港", en: "km/h · HK" },
  windTitle: {
    zh: "香港各區模擬持續風速：普遍 {w} km/h，最高 {p} km/h",
    en: "Simulated Hong Kong sustained wind: typical {w} km/h, peak {p} km/h",
  },
  avgLabel: { zh: "過去一小時平均風速", en: "Past-hour average wind" },
  avgPre8: {
    zh: "08:00 後天文台開始睇平均",
    en: "From 08:00 the Observatory watches this",
  },
  avgSafe: { zh: "高於烈風 · 八號穩陣", en: "Gale force or more · T8 safe" },
  avgBelow: {
    zh: "低於烈風 {m}/30 分鐘",
    en: "Below gale {m} of 30 min",
  },
  stormLabel: { zh: "颱風自身強度", en: "Storm intensity" },
  centreLabel: { zh: "中心最高持續風速", en: "Max sustained at centre" },
  energyLabel: { zh: "颱風能量", en: "Storm energy" },
  energySea: {
    zh: "全海面 · 每秒 +22.5 能量",
    en: "Open sea · +22.5 energy a second",
  },
  energyLand: {
    zh: "陸地覆蓋 {p}% · 每秒 −{r} 能量",
    en: "Over land {p}% · −{r} energy a second",
  },
  forumAria: { zh: "虛構討論區實況討論串", en: "Fictional forum live thread" },
  forumBoard: { zh: "時事台", en: "Current Affairs" },
  forumReading: { zh: "{n} 人睇緊", en: "{n} reading" },
  forumTyping: {
    zh: "有人不停 refresh 天文台網頁",
    en: "Someone keeps refreshing the Observatory page",
  },
  soundOffAria: {
    zh: "關閉音效同語音",
    en: "Mute sound effects and voice",
  },
  soundOnAria: { zh: "開啟音效同語音", en: "Turn sound effects and voice on" },
  musicOffAria: { zh: "關閉音樂", en: "Mute music" },
  musicOnAria: { zh: "開啟音樂", en: "Turn music on" },
  tipLabel: { zh: "貼士", en: "Tip" },
  tipEnergy: { zh: "唔好喺陸地上耗太耐", en: "Don't linger over land" },
  tipEnergySub: {
    zh: "掂到陸地會甩能量，跌到八成幾就出海充返電，再埋岸。",
    en: "Land drains the storm. When energy dips into the 80s, top up at sea, then come back.",
  },
  brief2Tip: {
    zh: "能量跌到八成幾就出少少海回氣，唔好走太遠，平均風速先唔會跌。",
    en: "Top up at sea when energy dips into the 80s, but don't stray far, or the hourly average sags.",
  },
  brief1: { zh: "八點前掛八號", en: "T8 before 08:00" },
  brief1Sub: {
    zh: "08:00 未掛八號，全港照常返工。",
    en: "No T8 at 08:00 means everyone goes to work.",
  },
  brief2: { zh: "守住一小時平均", en: "Keep the hourly average up" },
  brief2Sub: {
    zh: "平均低過 63 km/h 15 分鐘，天文台會預告；30 分鐘就改發三號。",
    en: "Under 63 km/h for 15 min and the Observatory warns; 30 min and it's No. 3.",
  },
  brief3: { zh: "撐過下晝三點", en: "Hold past 3pm" },
  brief3Sub: {
    zh: "兩點前落波要返工；三點後過關；六點大勝。李氏力場會將你彈走，按空白鍵／Shift 衝刺。",
    en: "A drop before 2pm sends you to the office; past 3pm passes; 6pm is a big win. The force field bounces you: boost with Space or Shift.",
  },
  footerFiction: {
    zh: "純屬虛構，認真返工。",
    en: "Pure fiction. Do go to work.",
  },
  footerNote: {
    zh: "天氣資料為遊戲模擬，並非實際警告；廣播為 AI 合成語音。",
    en: "Simulated weather, not real warnings. AI-generated voice.",
  },
  helpClose: { zh: "關閉玩法說明", en: "Close" },
  helpTitle: { zh: "打風，有啲技巧。", en: "There's an art to a typhoon." },
  helpBody: {
    zh: `<p>拖曳海面，或者用 <b>WASD／方向鍵</b> 駕駛颱風，令香港各區嘅模擬持續風速達到烈風（63 km/h）。</p>
<p>星期一 <b>07:00</b> 開始，一秒等於六分鐘。<b>08:00</b> 前一定要掛起八號，否則全港照常返工。08:00 前個信號會隨風速即時升降。</p>
<p>08:00 之後，天文台睇<b>過去一小時平均風速</b>。平均低過 63 km/h 達 15 分鐘，天文台會預告考慮改發三號；達 30 分鐘就正式改發三號，遊戲完結。風速回升就會取消預告。</p>
<p><b>貼士：</b>能量跌到八成幾就出少少海回氣，唔好走太遠，平均風速先唔會跌。</p>
<p><b>14:00 前</b>落波：兩個鐘內要返到公司（最慘）。<b>14:00–15:00</b>：老細話 WFH。<b>15:00 後</b>：過關。撐到 <b>18:00</b>：大勝。能量跌到零，個風散咗，天文台即刻落波。</p>
<p><b>李氏力場</b>每隔幾秒發出一道脈衝；繞過缺口，或者按 <b>空白鍵／Shift／借東風</b> 衝過去。淺藍虛線圈係登陸判定範圍（半徑 140 km）：圈內覆蓋陸地就會減弱，覆蓋越多減弱越快；回到全海面，每秒回復 22.5 點能量。</p>
<p class="help-small">颱風自身強度按中心最高持續風速分級；香港風速按各區與風眼嘅距離另計。八號為本地持續風速 63–117 km/h；十號為 118 km/h 或以上；九號表示預料烈風或暴風風力顯著增強。</p>
<p class="help-small">本作係虛構惡搞遊戲；李氏力場純屬網絡笑話，老細、天文台發言人同討論區用戶全部虛構，唔代表真實停工安排；天文台廣播係 AI 合成語音，唔係真人。真實安排請睇勞工處《惡劣天氣下工作守則》。靈感來自 Taistorm 與 Typhoon Day Off；海岸線：Natural Earth（public domain）。</p>`,
    en: `<p>Drag the sea, or use <b>WASD / arrow keys</b>, to steer the typhoon until Hong Kong's simulated sustained wind reaches gale force (63 km/h).</p>
<p>Monday starts at <b>07:00</b>; one second is six minutes. Signal No. 8 (“T8”) must be up by <b>08:00</b> or everyone goes to work. Before 08:00 the signal follows the wind live.</p>
<p>After 08:00 the Observatory watches the <b>past hour's average wind</b>. If it stays under 63 km/h for 15 minutes, it warns that No. 3 is being considered; after 30 minutes it issues No. 3 and the day ends. Wind picking back up cancels the warning.</p>
<p><b>Tip:</b> top up at sea when energy dips into the 80s, but don't stray far, or the hourly average sags.</p>
<p>Dropped <b>before 14:00</b>: back at your desk within 2 hours (the worst ending). <b>14:00–15:00</b>: the boss says work from home. <b>After 15:00</b>: a pass. Held until <b>18:00</b>: a big win. If the storm's energy hits zero it falls apart and the signal drops at once.</p>
<p><b>Mr. Li's Force Field</b> pulses every few seconds. Slip through the gap, or boost through with <b>Space / Shift / Boost</b>. The pale dashed ring is the land-contact zone (140 km radius): any land inside it weakens the storm, faster the more land it covers. Over open sea it recovers 22.5 energy a second.</p>
<p class="help-small">Storm intensity uses maximum sustained wind at the centre; Hong Kong's wind depends on each district's distance from the eye. No. 8 means local sustained winds of 63–117 km/h, No. 10 means 118 km/h or more, and No. 9 means gales are expected to increase significantly.</p>
<p class="help-small">This is a fictional parody. “Mr. Li's Force Field” is a Hong Kong internet joke about typhoons that always seem to swerve away. The boss, the Observatory spokesperson and the forum users are all made up (the Observatory's announcements use an AI-generated voice, not a real person), and nothing here describes real work arrangements: see the Labour Department's Code of Practice in Times of Adverse Weather. Inspired by Taistorm and Typhoon Day Off. Coastline: Natural Earth (public domain).</p>`,
  },
  helpOk: { zh: "收到，開風！", en: "Got it, let's blow!" },
  noticeHko: { zh: "天文台特別報告", en: "OBSERVATORY ANNOUNCEMENT" },
  noticeHkoCancel: {
    zh: "天文台：八號會維持一段時間",
    en: "Observatory: No. 8 stays up for now",
  },
  noticeHkoDown: {
    zh: "三號強風信號現正生效",
    en: "Strong Wind Signal No. 3 is now in force",
  },
  noticeBoss: { zh: "老細宣布", en: "MEMO FROM THE BOSS" },
  noticeCommute: { zh: "08:00 · 八號生效", en: "08:00 · T8 IN FORCE" },
  noticeCommuteTitle: {
    zh: "八號已掛，全港打工仔瞓返覺。",
    en: "T8 is up. Hong Kong goes back to bed.",
  },
  noticePass: { zh: "15:00 · 過關", en: "15:00 · PASSED" },
  noticePassTitle: {
    zh: "過咗三點，今日唔使返公司！",
    en: "Past 3pm. Nobody's going back to the office today!",
  },
};

export const STORM_CLASS = {
  超強颱風: "Super typhoon",
  強颱風: "Severe typhoon",
  颱風: "Typhoon",
  強烈熱帶風暴: "Severe tropical storm",
  熱帶風暴: "Tropical storm",
  熱帶低氣壓: "Tropical depression",
  低壓區: "Low",
};

let lang = "zh";
export const getLang = () => lang;

export function detectLang() {
  const query = new URLSearchParams(location.search).get("lang");
  if (query === "en" || query === "zh") return query;
  try {
    const saved = localStorage.getItem(STORAGE);
    if (saved === "en" || saved === "zh") return saved;
  } catch {}
  return (navigator.languages ?? [navigator.language]).some((l) =>
    /^zh|^yue/i.test(l),
  )
    ? "zh"
    : "en";
}

const fill = (text, vars) =>
  vars ? text.replace(/\{(\w+)\}/g, (m, k) => vars[k] ?? m) : text;

export const t = (key, vars) => fill(UI[key]?.[lang] ?? key, vars);

// Copy entries are { zh, en } pairs (or plain strings for shared text).
export const say = (entry, vars) =>
  fill(
    typeof entry === "string" ? entry : (entry?.[lang] ?? entry?.zh ?? ""),
    vars,
  );

export const stormClass = (zh) => (lang === "en" ? STORM_CLASS[zh] : zh);

export function setLang(next, { save = true } = {}) {
  lang = next === "en" ? "en" : "zh";
  if (save)
    try {
      localStorage.setItem(STORAGE, lang);
    } catch {}
  const root = document.documentElement;
  root.lang = lang === "en" ? "en-HK" : "zh-Hant-HK";
  root.classList.toggle("lang-en", lang === "en");
  document.title = t("docTitle");
  document
    .querySelector('meta[name="description"]')
    ?.setAttribute("content", t("docDescription"));
  for (const el of document.querySelectorAll("[data-i18n]"))
    el.textContent = t(el.dataset.i18n);
  for (const el of document.querySelectorAll("[data-i18n-html]"))
    el.innerHTML = t(el.dataset.i18nHtml);
  for (const el of document.querySelectorAll("[data-i18n-aria]"))
    el.setAttribute("aria-label", t(el.dataset.i18nAria));
  for (const el of document.querySelectorAll("[data-i18n-alt]"))
    el.setAttribute("alt", t(el.dataset.i18nAlt));
  document.dispatchEvent(new CustomEvent("langchange", { detail: lang }));
}
