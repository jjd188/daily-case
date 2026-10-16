(async function () {
  const CASES = window.CASES;
  const STORE = "dailycase.v1";
  const MAX_MISSES = 3;
  const app = document.getElementById("app");

  // ---------- storage ----------
  function load() {
    try {
      const s = JSON.parse(localStorage.getItem(STORE));
      if (s && s.v === 1) return s;
    } catch (e) {}
    return { v: 1, streak: 0, best: 0, lastWin: "", days: {} };
  }
  function persist() {
    try { localStorage.setItem(STORE, JSON.stringify(save)); } catch (e) {}
  }

  // ---------- which case is today's ----------
  const params = new URLSearchParams(location.search);
  if (params.has("reset")) { try { localStorage.removeItem(STORE); } catch (e) {} }
  const save = load();

  const now = new Date();
  function key(d) {
    const p = (n) => String(n).padStart(2, "0");
    return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate());
  }
  function dayNumber(d) {
    return Math.floor((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - Date.UTC(2026, 0, 1)) / 864e5);
  }
  const preview = params.has("case"); // ?case=N plays any case without touching the streak
  const num = preview ? Number(params.get("case")) || 0 : dayNumber(now);
  const caseIdx = ((num % CASES.length) + CASES.length) % CASES.length;
  let kase = CASES[caseIdx];
  const dayKey = preview ? "preview-" + caseIdx : key(now);

  // Today's generated case (daily/YYYY-MM-DD.json) replaces the premade one, but only if it passes
  // the same rules the generator used. Missing file, offline or bad data: the premade case stands.
  // Once a day is started its case is stored with the progress, so a refresh or a later publish
  // can never swap the case out from under the player.
  if (!preview) {
    const mine = save.days[dayKey];
    if (mine && mine.caseData) kase = mine.caseData;
    else {
      try {
        const r = await fetch("daily/" + dayKey + ".json", { cache: "no-cache" });
        if (r.ok) { const c = await r.json(); if (!window.RULES.validateCase(c).length) kase = c; }
      } catch (e) {}
    }
  }

  if (!save.days[dayKey] || preview && params.has("fresh")) {
    save.days[dayKey] = { started: false, opened: [], crossed: [], misses: 0, wasted: 0, log: [], done: false, won: false };
  }
  const st = save.days[dayKey];

  // ---------- rules ----------
  function fits(s, clue) {
    const match = s[clue.axis] === clue.value;
    return clue.not ? !match : match;
  }
  function remaining(openedIdx) {
    return kase.suspects.map((_, i) => i).filter((i) => openedIdx.every((ci) => fits(kase.suspects[i], kase.clues[ci])));
  }
  const solved = () => remaining(st.opened).length === 1;

  function openClue(ci) {
    if (st.done || st.opened.includes(ci)) return;
    if (solved()) st.wasted++;
    st.opened.push(ci);
    st.log.push("c");
    persist();
    render();
  }
  function toggleOut(si) {
    if (st.done) return;
    const at = st.crossed.indexOf(si);
    if (at >= 0) st.crossed.splice(at, 1); else st.crossed.push(si);
    persist();
    render();
  }
  function accuse(si) {
    if (st.done) return;
    if (si === kase.culprit) {
      st.log.push("w");
      finish(true);
    } else {
      st.misses++;
      st.log.push("x");
      if (!st.crossed.includes(si)) st.crossed.push(si);
      if (st.misses >= MAX_MISSES) finish(false);
      else { flash = kase.suspects[si].name + " has an alibi. That's " + st.misses + " of " + MAX_MISSES + " wrong guesses."; }
    }
    persist();
    render();
  }
  function finish(won) {
    st.done = true;
    st.won = won;
    if (preview) return;
    if (won) {
      const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
      save.streak = save.lastWin === key(yesterday) || save.lastWin === dayKey ? save.streak + 1 : 1;
      save.lastWin = dayKey;
      save.best = Math.max(save.best, save.streak);
    } else {
      save.streak = 0;
    }
  }
  function stars() {
    if (!st.won) return 0;
    if (st.misses === 0 && st.wasted === 0) return 3;
    return st.misses === 0 ? 2 : 1;
  }

  // ---------- tiny DOM helper ----------
  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    for (const k in attrs || {}) {
      const v = attrs[k];
      if (k === "class") el.className = v;
      else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
      else if (v !== false && v != null) el.setAttribute(k, v);
    }
    kids.flat().forEach((c) => { if (c != null && c !== false) el.append(c.nodeType ? c : document.createTextNode(c)); });
    return el;
  }

  let flash = "";
  let sure = -1; // suspect awaiting accusation confirm
  let sureTimer = 0;
  let tick = 0;

  // ---------- views ----------
  function header() {
    return h("div", { class: "top" },
      h("span", {}, preview ? "Preview · case " + (caseIdx + 1) : "Case #" + (num + 1)),
      h("span", { class: "streak" }, save.streak ? "🔥 " + save.streak + " day streak" : ""));
  }

  function intro() {
    return [
      header(),
      h("h1", {}, kase.title),
      h("p", {}, kase.intro),
      h("p", { class: "muted" }, "Five suspects. Open clues to learn about the culprit, cross off anyone who doesn't fit, then make your accusation. Fewer wasted clues and wrong guesses means more stars."),
      h("button", { class: "primary", onclick: () => { st.started = true; if (!preview) st.caseData = kase; persist(); render(); } }, "Open the case"),
    ];
  }

  function board() {
    const out = new Set(st.crossed);
    const left = kase.suspects.length - out.size;
    const suspects = kase.suspects.map((s, i) => {
      const isOut = out.has(i);
      const confirming = sure === i;
      return h("div", {
        class: "suspect" + (isOut ? " out" : ""), role: "button", tabindex: "0",
        "aria-label": s.name + (isOut ? ", crossed off. Tap to restore." : ". Tap to cross off."),
        onclick: () => { sure = -1; toggleOut(i); },
        onkeydown: (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); sure = -1; toggleOut(i); } },
      },
        h("div", { class: "face" }, s.emoji),
        h("div", {},
          h("div", { class: "name" }, s.name),
          h("div", { class: "quote" }, "“" + s.line + "”"),
          h("div", { class: "chips" }, kase.axes.map((a) => h("span", { class: "chip" }, s[a.key])))),
        h("button", {
          class: "accuse" + (confirming ? " sure" : ""),
          onclick: (e) => {
            e.stopPropagation();
            if (sure === i) { sure = -1; clearTimeout(sureTimer); accuse(i); return; }
            sure = i; render();
            clearTimeout(sureTimer);
            sureTimer = setTimeout(() => { sure = -1; render(); }, 3000);
          },
        }, confirming ? "Sure?" : "Accuse"));
    });

    const clues = kase.clues.map((c, ci) => {
      const open = st.opened.includes(ci);
      const axis = kase.axes.find((a) => a.key === c.axis).label;
      if (open) return h("div", { class: "clue open" }, h("div", { class: "place" }, "📍 " + c.place), h("div", { class: "text" }, c.text));
      return h("button", { class: "clue", onclick: () => openClue(ci) },
        h("div", { class: "place" }, "🔎 " + c.place),
        h("div", { class: "tease" }, "About: " + axis.toLowerCase()));
    });

    const lives = "❤️".repeat(MAX_MISSES - st.misses) + "🖤".repeat(st.misses);
    const nodes = [
      header(),
      h("h1", {}, kase.title),
      h("p", { class: "muted" }, kase.intro),
      h("h2", {}, "Suspects · " + left + " left"),
      h("div", { class: "suspects" }, suspects),
      h("div", { class: "hint" }, "Tap a suspect to cross them off. Accuse when you're sure."),
      h("h2", {}, "Clues"),
      h("div", { class: "clues" }, clues),
      h("div", { class: "status" }, h("span", {}, "Guesses " + lives), h("span", {}, "Clues opened " + st.opened.length + "/" + kase.clues.length)),
    ];
    if (flash) { nodes.splice(3, 0, h("div", { class: "banner bad" }, flash)); flash = ""; }
    return nodes;
  }

  function shareText() {
    const grid = st.log.map((c) => (c === "c" ? "🔍" : c === "x" ? "❌" : "✅")).join("");
    const star = st.won ? "⭐".repeat(stars()) : "💀";
    return "Daily Case #" + (num + 1) + " · " + kase.title + "\n" + star + "\n" + grid;
  }

  function result() {
    const culprit = kase.suspects[kase.culprit];
    const msLeft = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1) - new Date();
    const hh = Math.floor(msLeft / 36e5), mm = Math.floor((msLeft % 36e5) / 6e4);
    const share = h("button", { class: "primary" }, "Share result");
    share.addEventListener("click", async () => {
      const text = shareText();
      try {
        if (navigator.share) await navigator.share({ text });
        else { await navigator.clipboard.writeText(text); share.textContent = "Copied!"; }
      } catch (e) {}
    });
    return h("div", { class: "result" },
      header(),
      h("h1", {}, st.won ? "Case closed!" : "The culprit got away"),
      h("div", { class: "stars" }, st.won ? "⭐".repeat(stars()) + "☆".repeat(3 - stars()) : "💀"),
      h("div", { class: "culprit-card" },
        h("div", { class: "face" }, culprit.emoji),
        h("div", { class: "name" }, "It was " + culprit.name),
        h("div", { class: "muted" }, kase.clues.map((c) => c.text).join(" "))),
      h("div", { class: "grid" }, st.log.map((c) => (c === "c" ? "🔍" : c === "x" ? "❌" : "✅")).join("")),
      h("div", { class: "stack" },
        share,
        preview ? h("button", { class: "ghost", onclick: () => { location.search = "?case=" + (caseIdx + 1) + "&fresh"; } }, "Next case") : null),
      preview ? null : h("div", { class: "next" }, "Next case in " + hh + "h " + mm + "m"),
      save.best ? h("div", { class: "next" }, "Best streak: " + save.best) : null);
  }

  function render() {
    clearInterval(tick);
    app.replaceChildren(...[].concat(st.done ? result() : st.started ? board() : intro()));
    if (st.done && !preview) tick = setInterval(render, 60000);
  }

  render();

  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
})();
