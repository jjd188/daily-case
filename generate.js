// Generates daily cases with Claude and writes them to daily/YYYY-MM-DD.json.
//
//   node generate.js                    today + the next 6 days (skips dates that already have a case)
//   node generate.js --days 30          today + the next 29 days
//   node generate.js --date 2026-11-01  one specific date
//   node generate.js --force            overwrite existing files
//   node generate.js --dry              generate and validate, print the case, write nothing
//
// Two model calls per case: Claude invents the cast, code picks four true facts about the culprit
// that make a fair puzzle, Claude writes the clue text. Every case is then run through the same
// rules the app uses (rules.js); anything failing is sent back with the exact problems, and after
// MAX_TRIES it is dropped so the app falls back to a premade case. Nothing unvalidated is written.
//
// Key: ANTHROPIC_API_KEY from the environment, else from ../story-rpg/.env. Model: CASE_MODEL.
const fs = require("fs");
const path = require("path");
const { validateCase, remaining, par } = require("./rules.js");
const PREMADE = require("./cases.js");

const MODEL = process.env.CASE_MODEL || "claude-haiku-5-5";
const MAX_TRIES = 3;
const DIR = path.join(__dirname, "daily");

// ---------- args ----------
const args = process.argv.slice(2);
const flag = (n) => args.includes("--" + n);
const opt = (n) => { const i = args.indexOf("--" + n); return i >= 0 ? args[i + 1] : undefined; };

function apiKey() {
  if (process.env.ANTHROPIC_API_KEY) return process.env.ANTHROPIC_API_KEY;
  try {
    const env = fs.readFileSync(path.join(__dirname, "..", "story-rpg", ".env"), "utf8");
    const m = env.match(/^ANTHROPIC_API_KEY=(.+)$/m);
    if (m) return m[1].trim().replace(/^["']|["']$/g, "");
  } catch (e) {}
  return "";
}

// ---------- variety ----------
const SETTINGS = [
  "a village bake sale", "a school science fair", "a city library", "a neighborhood block party",
  "a seaside lighthouse", "a small-town diner", "a community garden", "a roller rink",
  "a mountain ski lodge", "a campground", "a pet adoption fair", "a farmers market",
  "a rooftop movie night", "a train station", "a museum after hours", "a high school talent show",
  "a houseboat marina", "a comic book shop", "a county fair", "a dorm common room",
  "a cozy bookstore cafe", "a toy workshop", "an indoor mini-golf course", "a hot-air balloon festival",
  "a retirement-home bingo night", "a food truck rally", "a community theater", "an aquarium gift shop",
];
const THEFTS = [
  "something valuable goes missing", "a prank has ruined an event", "a prize is swapped for a fake",
  "someone has been sneaking in at night", "a beloved object has been hidden", "a secret recipe or plan has leaked",
];
const TRAIT_IDEAS = [
  "clothing", "footwear", "accessory", "carrying", "smell", "sound", "hair or hat", "hands (stains, gloves)",
  "how they travel", "when they arrived", "where they were last seen", "what they were eating or drinking", "what they left behind",
];

function hash(s) { let h = 2166136261; for (const ch of s) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
function pick(list, seed, salt) { return list[hash(seed + salt) % list.length]; }
function pickN(list, n, seed) {
  const pool = list.slice(), out = [];
  for (let i = 0; i < n; i++) out.push(pool.splice(hash(seed + "t" + i) % pool.length, 1)[0]);
  return out;
}

function recentTitles() {
  const titles = PREMADE.map((c) => c.title);
  try {
    fs.readdirSync(DIR).filter((f) => f.endsWith(".json")).forEach((f) => {
      try { titles.push(JSON.parse(fs.readFileSync(path.join(DIR, f), "utf8")).title); } catch (e) {}
    });
  } catch (e) {}
  return titles.filter(Boolean);
}

// ---------- prompts ----------
// Two model calls per case. The model is good at invention and bad at set arithmetic, so:
//   1. the model invents the world (suspects, traits, culprit)
//   2. CODE picks four true facts about the culprit that make a fair puzzle
//   3. the model writes the clue text for those facts
const EXAMPLE_WORLD = (() => {
  const { clues, ...world } = PREMADE[1];
  return JSON.stringify(world);
})();

const WORLD_SYSTEM = `You invent the cast for one small whodunit in a casual mobile game. It is gentle, funny and family-friendly: a theft, a prank or a mix-up, never violence, danger, real people or real brands.

Create a title, a one-or-two-sentence intro setting the scene, 3 trait "axes" (categories like Clothing or Last seen), 5 suspects, and pick which suspect is the culprit. Every suspect has one short value on each axis. The game will invent the clues later from these traits, so design traits that make a good deduction:
  - Each suspect: a single-word name under 14 characters (all different), one person emoji, a short in-character "line" under 90 characters that does not give away the culprit, and one value per axis (lowercase, under 25 characters).
  - No two suspects have the same three values.
  - Every axis has at least 2 different values among the suspects, and the values are concrete and visual or checkable (a grey hoodie, a backpack, the library) so a clue can point at them.
  - Make it a puzzle: the culprit should share each of their traits with at least one other suspect, and every other suspect should share at least one trait with the culprit.

Reply with ONLY a JSON object, no markdown:
{"title":"...","intro":"...","axes":[{"key":"wear","label":"Clothing"},{"key":"carry","label":"Carrying"},{"key":"spot","label":"Last seen"}],"suspects":[{"name":"...","emoji":"...","line":"...","wear":"...","carry":"...","spot":"..."}, ...5],"culprit":0}
Axis "key" is 2-12 lowercase letters. "culprit" is the index (0-4) of the culprit in "suspects".

Example of the style (do not reuse its theme or traits):
${EXAMPLE_WORLD}`;

const CLUE_SYSTEM = `You write the evidence for a small whodunit in a casual mobile game. You are given the scene and a list of facts about the culprit. Write one clue for each fact: a short place or witness where it is found ("place", under 24 characters), and one or two sentences of evidence ("text", under 170 characters).

Rules:
  - Each text must state the fact plainly, using the fact's own value word(s), so a player can match it to the suspects' traits. For a fact marked NOT, the text must make clear the evidence rules that value out, for example "the culprit is not X" shown by an alibi or a clean spot, without saying who is the culprit.
  - Never name any suspect. Never say who did it. Gentle, specific, a little funny.
  - Places must all be different.

Reply with ONLY a JSON array with one object per fact, in the same order: [{"place":"...","text":"..."}, ...]`;

function userPrompt(date) {
  const setting = pick(SETTINGS, date, "s");
  const trouble = pick(THEFTS, date, "x");
  const traits = pickN(TRAIT_IDEAS, 4, date).join(", ");
  const avoid = recentTitles().slice(-30).join("; ");
  return `Invent today's cast.
Setting: ${setting}
What happened: ${trouble}
Trait ideas to draw 3 axes from (pick any 3 that suit the setting, or substitute your own): ${traits}
Titles already used, do not repeat or echo them: ${avoid}`;
}

// ---------- model call ----------
async function ask(system, messages, key, maxTokens) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
    // Thinking off: with it on, Haiku 5.5 can spend the whole token budget and return no text
    // (the same thing Waypoint measured). The validator and retry loop do the checking instead.
    body: JSON.stringify({ model: MODEL, max_tokens: maxTokens, thinking: { type: "disabled" }, system, messages }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`API ${res.status}: ${body.error && body.error.message || "unknown error"}`);
  const text = (body.content || []).filter((b) => b.type === "text").map((b) => b.text).join("");
  if (!text) throw new Error(`empty reply (stop_reason ${body.stop_reason})`);
  return { text, usage: body.usage || {} };
}

function parseJSON(text, open, close) {
  const a = text.indexOf(open), b = text.lastIndexOf(close);
  if (a < 0 || b <= a) throw new Error("no JSON in reply");
  return JSON.parse(text.slice(a, b + 1));
}

// ---------- step 2: choose the clue facts in code ----------
// Candidate facts are things that are TRUE of the culprit: "has value v" or "does not have
// some other value w". A valid set of four leaves exactly the culprit, has no clue that rules
// nobody out, and has no clue that solves the case alone.
function chooseFacts(world) {
  const keys = world.axes.map((a) => a.key);
  const culprit = world.suspects[world.culprit];
  const facts = [];
  keys.forEach((k) => {
    facts.push({ axis: k, value: culprit[k] });
    new Set(world.suspects.map((s) => s[k])).forEach((v) => { if (v !== culprit[k]) facts.push({ axis: k, value: v, not: true }); });
  });
  const probe = { suspects: world.suspects };
  const left = (fs) => remaining(probe, fs);
  const useful = facts.filter((f) => left([f]).length > 1 && left([f]).length < world.suspects.length);

  const good = [];
  const n = useful.length;
  for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) for (let c = b + 1; c < n; c++) for (let d = c + 1; d < n; d++) {
    const set = [useful[a], useful[b], useful[c], useful[d]];
    if (left(set).length !== 1) continue;
    if (new Set(set.map((f) => f.axis)).size < 2) continue;                 // not all about one trait
    if (set.every((f) => f.not)) continue;                                   // need at least one positive clue
    if (new Set(set.map((f) => f.axis + "|" + f.value)).size < 4) continue; // no repeats
    good.push(set);
  }
  if (!good.length) return null;
  return good[Math.floor(Math.random() * good.length)];
}

function factLine(world, f, i) {
  const label = world.axes.find((a) => a.key === f.axis).label;
  return `${i + 1}. ${label}: the culprit ${f.not ? "is NOT" : "is"} "${f.value}"${f.not ? " (rule it out)" : ""}`;
}

function clueProblems(clues, facts, world) {
  const errs = [];
  if (!Array.isArray(clues) || clues.length !== facts.length) return [`need exactly ${facts.length} clues`];
  clues.forEach((cl, i) => {
    const text = String(cl && cl.text || "").toLowerCase();
    const words = facts[i].value.toLowerCase().match(/[a-z0-9]{4,}/g) || [facts[i].value.toLowerCase()];
    if (!words.some((w) => text.includes(w.slice(0, 4)))) errs.push(`clue ${i + 1} text never mentions "${facts[i].value}"`);
  });
  return errs;
}

const BANNED = ["kill", "murder", "blood", "dead", "weapon", "gun", "knife", "drug"];
function gentle(c) {
  const blob = JSON.stringify(c).toLowerCase();
  return BANNED.filter((w) => new RegExp("\\b" + w).test(blob)).map((w) => `keep it gentle: remove "${w}"`);
}

function assemble(world, facts, clues) {
  return {
    title: world.title, intro: world.intro, axes: world.axes, suspects: world.suspects, culprit: world.culprit,
    clues: facts.map((f, i) => ({ place: String(clues[i].place).trim(), axis: f.axis, value: f.value, ...(f.not ? { not: true } : {}), text: String(clues[i].text).trim() })),
  };
}

// Models favour one seat for the culprit, so shuffle suspects (remapping the culprit) and clues.
function shuffled(c) {
  const order = c.suspects.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
  const clues = c.clues.slice();
  for (let i = clues.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [clues[i], clues[j]] = [clues[j], clues[i]]; }
  return { ...c, suspects: order.map((i) => c.suspects[i]), culprit: order.indexOf(c.culprit), clues };
}

async function makeCase(date, key) {
  const tokens = { in: 0, out: 0 };
  const spend = (u) => { tokens.in += u.input_tokens || 0; tokens.out += u.output_tokens || 0; };

  // 1. the world
  const wm = [{ role: "user", content: userPrompt(date) }];
  let world = null, facts = null;
  for (let attempt = 1; attempt <= MAX_TRIES && !facts; attempt++) {
    const { text, usage } = await ask(WORLD_SYSTEM, wm, key, 1500);
    spend(usage);
    let problems;
    try {
      world = parseJSON(text, "{", "}");
      // Structural check using stand-in clues; the real ones come in step 3.
      const stand = chooseFacts(world);
      if (!stand) problems = ["no fair set of 4 clues exists for these traits. Make the culprit share traits with other suspects, and give each axis 3 or more different values across the suspects"];
      else {
        facts = stand;
        const trial = assemble(world, facts, facts.map((f, i) => ({ place: "Spot " + (i + 1), text: "Evidence about " + f.value })));
        problems = validateCase(trial).concat(gentle(world));
        if (problems.length) facts = null;
      }
    } catch (e) { problems = ["reply could not be used: " + e.message]; }
    if (!facts) {
      console.log(`  world attempt ${attempt} rejected: ${problems.join("; ")}`);
      wm.push({ role: "assistant", content: text });
      wm.push({ role: "user", content: "That cast has problems:\n- " + problems.join("\n- ") + "\nReply with the complete corrected JSON only." });
    }
  }
  if (!facts) return { c: null, attempt: MAX_TRIES, tokens };

  // 3. the clue text
  const cm = [{ role: "user", content: `Scene: ${world.title}. ${world.intro}\nFacts about the culprit, one clue each:\n${facts.map((f, i) => factLine(world, f, i)).join("\n")}` }];
  for (let attempt = 1; attempt <= MAX_TRIES; attempt++) {
    const { text, usage } = await ask(CLUE_SYSTEM, cm, key, 1200);
    spend(usage);
    let problems, clues;
    try {
      clues = parseJSON(text, "[", "]");
      problems = clueProblems(clues, facts, world);
      if (!problems.length) {
        const c = assemble(world, facts, clues);
        problems = validateCase(c).concat(gentle(c));
        if (!problems.length) return { c: shuffled(c), attempt, tokens };
      }
    } catch (e) { problems = ["reply was not valid JSON: " + e.message]; }
    console.log(`  clue attempt ${attempt} rejected: ${problems.join("; ")}`);
    cm.push({ role: "assistant", content: text });
    cm.push({ role: "user", content: "Those clues have problems:\n- " + problems.join("\n- ") + "\nReply with the complete corrected JSON array only." });
  }
  return { c: null, attempt: MAX_TRIES, tokens };
}

// ---------- main ----------
function dates() {
  const one = opt("date");
  if (one) return [one];
  const n = Number(opt("days")) || 7;
  const out = [];
  const d = new Date();
  for (let i = 0; i < n; i++) {
    const p = (x) => String(x).padStart(2, "0");
    out.push(`${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`);
    d.setDate(d.getDate() + 1);
  }
  return out;
}

(async () => {
  const key = apiKey();
  if (!key) { console.error("No ANTHROPIC_API_KEY (set it, or put it in ../story-rpg/.env)."); process.exit(2); }
  if (!flag("dry")) fs.mkdirSync(DIR, { recursive: true });
  const total = { in: 0, out: 0 };
  let made = 0, failed = 0;
  for (const date of dates()) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) { console.error("bad date " + date); process.exit(2); }
    const file = path.join(DIR, date + ".json");
    if (!flag("force") && !flag("dry") && fs.existsSync(file)) { console.log(`${date}: exists, skipping`); continue; }
    console.log(`${date}: generating (${MODEL})`);
    try {
      const { c, attempt, tokens } = await makeCase(date, key);
      total.in += tokens.in; total.out += tokens.out;
      if (!c) { failed++; console.log(`${date}: gave up after ${MAX_TRIES} tries, app will use a premade case`); continue; }
      const full = { ...c, meta: { date, model: MODEL, attempts: attempt, par: par(c) } };
      if (flag("dry")) console.log(JSON.stringify(full, null, 2));
      else fs.writeFileSync(file, JSON.stringify(full, null, 2) + "\n");
      made++;
      console.log(`${date}: "${c.title}" ok (attempt ${attempt}, ${tokens.in} in / ${tokens.out} out tokens)`);
    } catch (e) {
      failed++;
      console.error(`${date}: ${e.message}`);
      if (/API 4(01|03|29)|credit|billing/i.test(e.message)) break; // no point hammering a dead key
    }
  }
  console.log(`done: ${made} written, ${failed} failed, ${total.in} in / ${total.out} out tokens`);
  process.exit(failed ? 1 : 0);
})();
