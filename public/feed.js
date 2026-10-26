// The fictional forum thread and the BREAKING ticker. Items keep their bank and
// index, not text, so a language switch re-renders everything in place.
import { COPY } from "./copy.js";
import { say, t } from "./i18n.js";
import { clock } from "./rules.js";

const SHOWN = 5;

// Random picks that do not repeat until a bank is used up.
export function createPicker(random = Math.random) {
  const used = new Map();
  return (key, bank) => {
    const taken = used.get(key) ?? new Set();
    if (taken.size >= bank.length) taken.clear();
    let i;
    do i = Math.floor(random() * bank.length);
    while (taken.has(i));
    taken.add(i);
    used.set(key, taken);
    return i;
  };
}

export function createFeed(el) {
  let pick = createPicker();
  let posts = [];
  let number = 1;
  let thread = 0;
  let name = COPY.typhoonNames[0];
  let headline = null;
  let reading = 0;

  const vars = () => ({ name: say(name) });

  function renderPosts() {
    el.posts.replaceChildren(
      ...posts.slice(-SHOWN).map((p) => {
        const li = document.createElement("li");
        li.className = p.hot ? "post hot" : "post";
        if (p.fresh) li.classList.add("new");
        p.fresh = false;
        const head = document.createElement("div");
        head.className = "post-head";
        const no = document.createElement("span");
        no.className = "post-no mono";
        no.textContent = `#${p.number}`;
        const user = document.createElement("b");
        user.textContent = say(COPY.usernames[p.user]);
        const time = document.createElement("span");
        time.className = "post-time mono";
        time.textContent = clock(p.minute);
        head.append(no, user, time);
        const body = document.createElement("p");
        body.textContent = say(COPY.forum[p.bank][p.index], vars());
        const votes = document.createElement("div");
        votes.className = "post-votes mono";
        votes.textContent = `▲ ${p.up}  ▼ ${p.down}`;
        li.append(head, body, votes);
        return li;
      }),
    );
  }

  // The compact layout's forum pill shows the newest post.
  function renderLatest() {
    if (!el.latest) return;
    const p = posts.at(-1);
    if (!p) return el.latest.replaceChildren();
    const user = document.createElement("b");
    user.textContent = say(COPY.usernames[p.user]);
    el.latest.replaceChildren(user, say(COPY.forum[p.bank][p.index], vars()));
  }

  function render() {
    el.title.textContent = say(COPY.threadTitles[thread], vars());
    el.reading.textContent = t("forumReading", {
      n: reading.toLocaleString(),
    });
    renderPosts();
    renderLatest();
    if (headline) {
      el.tickerTime.textContent = clock(headline.minute);
      el.ticker.textContent = say(
        COPY.news[headline.bank][headline.index],
        vars(),
      );
    } else {
      el.tickerTime.textContent = "07:00";
      el.ticker.textContent = t("tickerReady");
    }
  }

  return {
    reset(nameIndex) {
      pick = createPicker();
      name = COPY.typhoonNames[nameIndex];
      thread = Math.floor(Math.random() * COPY.threadTitles.length);
      posts = [];
      number = 1;
      headline = null;
      reading = 800 + Math.floor(Math.random() * 600);
      render();
    },
    post(bank, minute, { hot = false } = {}) {
      const index = pick(bank, COPY.forum[bank]);
      const user = pick("user", COPY.usernames);
      number += 1 + Math.floor(Math.random() * 6);
      reading += Math.floor(40 + Math.random() * (hot ? 900 : 160));
      const up = Math.floor(Math.random() * (hot ? 380 : 90));
      posts.push({
        bank,
        index,
        user,
        minute,
        number,
        up,
        down: Math.floor(Math.random() * Math.max(4, up / 6)),
        hot,
        fresh: true,
      });
      posts = posts.slice(-SHOWN);
      render();
    },
    news(bank, minute) {
      headline = { bank, index: pick(`news.${bank}`, COPY.news[bank]), minute };
      render();
    },
    render,
    get count() {
      return number;
    },
    get latest() {
      const p = posts.at(-1);
      return p ? say(COPY.forum[p.bank][p.index], vars()) : "";
    },
    get headline() {
      return headline
        ? say(COPY.news[headline.bank][headline.index], vars())
        : "";
    },
  };
}
