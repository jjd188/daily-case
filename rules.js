// Shared rules: the game, the validator and the generator all use this file, so a case that
// passes here plays correctly in the app. A clue says the culprit's <axis> is (or, with
// not:true, is NOT) <value>.
(function (root) {
  const N_SUSPECTS = 5, N_AXES = 3, N_CLUES = 4;

  function fits(s, clue) {
    const match = s[clue.axis] === clue.value;
    return clue.not ? !match : match;
  }

  function remaining(c, clues) {
    return c.suspects.map((_, i) => i).filter((i) => clues.every((cl) => fits(c.suspects[i], cl)));
  }

  // Smallest number of clues that pins down the culprit, or null if even all of them don't.
  function par(c) {
    let best = null;
    for (let mask = 1; mask < 1 << c.clues.length; mask++) {
      const sub = c.clues.filter((_, i) => mask & (1 << i));
      if (remaining(c, sub).length === 1 && (best === null || sub.length < best)) best = sub.length;
    }
    return best;
  }

  const isStr = (v, max) => typeof v === "string" && v.trim().length > 0 && v.length <= max;

  // Returns a list of problems; empty means the case is fair and safe to play.
  function validateCase(c) {
    const errs = [];
    if (!c || typeof c !== "object") return ["not an object"];
    if (!isStr(c.title, 40)) errs.push("title missing or over 40 chars");
    if (!isStr(c.intro, 220)) errs.push("intro missing or over 220 chars");

    if (!Array.isArray(c.axes) || c.axes.length !== N_AXES) return errs.concat(`need exactly ${N_AXES} axes`);
    const keys = c.axes.map((a) => a && a.key);
    c.axes.forEach((a) => {
      if (!a || !/^[a-z]{2,12}$/.test(a.key || "") || !isStr(a.label, 20)) errs.push("bad axis " + JSON.stringify(a));
    });
    if (new Set(keys).size !== keys.length) errs.push("duplicate axis keys");

    if (!Array.isArray(c.suspects) || c.suspects.length !== N_SUSPECTS) return errs.concat(`need exactly ${N_SUSPECTS} suspects`);
    c.suspects.forEach((s, i) => {
      if (!s || !isStr(s.name, 14)) errs.push(`suspect ${i} name missing or over 14 chars`);
      if (!s || !isStr(s.emoji, 12)) errs.push(`suspect ${i} emoji missing`);
      if (!s || !isStr(s.line, 90)) errs.push(`suspect ${i} line missing or over 90 chars`);
      keys.forEach((k) => { if (!s || !isStr(s[k], 24)) errs.push(`suspect ${i} ${k} missing or over 24 chars`); });
    });
    if (errs.length) return errs;

    const names = c.suspects.map((s) => s.name.trim().toLowerCase());
    if (new Set(names).size !== names.length) errs.push("duplicate suspect names");
    keys.forEach((k) => {
      if (new Set(c.suspects.map((s) => s[k])).size < 2) errs.push(`everyone shares the same ${k}`);
    });
    const profiles = c.suspects.map((s) => keys.map((k) => s[k]).join("|"));
    if (new Set(profiles).size !== profiles.length) errs.push("two suspects have identical traits");

    if (!Number.isInteger(c.culprit) || c.culprit < 0 || c.culprit >= N_SUSPECTS) return errs.concat("culprit must be an index 0-" + (N_SUSPECTS - 1));
    if (!Array.isArray(c.clues) || c.clues.length !== N_CLUES) return errs.concat(`need exactly ${N_CLUES} clues`);

    c.clues.forEach((cl, i) => {
      if (!cl || !keys.includes(cl.axis)) { errs.push(`clue ${i} unknown axis`); return; }
      if (!isStr(cl.place, 24)) errs.push(`clue ${i} place missing or over 24 chars`);
      if (!isStr(cl.text, 170)) errs.push(`clue ${i} text missing or over 170 chars`);
      if (cl.not !== undefined && typeof cl.not !== "boolean") errs.push(`clue ${i} "not" must be true/false`);
      if (!c.suspects.some((s) => s[cl.axis] === cl.value)) { errs.push(`clue ${i} value "${cl.value}" matches no suspect`); return; }
      if (!fits(c.suspects[c.culprit], cl)) errs.push(`clue ${i} contradicts the culprit`);
      if (remaining(c, [cl]).length === c.suspects.length) errs.push(`clue ${i} rules out nobody`);
      if (remaining(c, [cl]).length === 1) errs.push(`clue ${i} solves the case on its own`);
      const text = String(cl.text).toLowerCase();
      const words = new Set(text.match(/[a-z0-9']+/g) || []);
      names.forEach((n) => { if (words.has(n)) errs.push(`clue ${i} names a suspect (${n})`); });
    });
    if (new Set(c.clues.map((cl) => cl.place.trim().toLowerCase())).size !== c.clues.length) errs.push("duplicate clue places");
    if (!c.clues.some((cl) => !cl.not)) errs.push("need at least one positive clue");
    if (errs.length) return errs;

    const all = remaining(c, c.clues);
    if (all.length !== 1 || all[0] !== c.culprit) errs.push(`all clues leave ${all.map((i) => c.suspects[i].name).join(", ") || "nobody"}, not just the culprit`);
    return errs;
  }

  const api = { fits, remaining, par, validateCase, N_SUSPECTS, N_AXES, N_CLUES };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.RULES = api;
})(typeof window !== "undefined" ? window : globalThis);
