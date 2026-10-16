// node validate.js            -> checks every premade case
// node validate.js daily/*.json -> checks generated cases too
const fs = require("fs");
const { validateCase, par } = require("./rules.js");

const files = process.argv.slice(2);
const cases = files.length
  ? files.map((f) => ({ name: f, c: JSON.parse(fs.readFileSync(f, "utf8")) }))
  : require("./cases.js").map((c, i) => ({ name: "#" + i, c }));

let bad = 0;
cases.forEach(({ name, c }) => {
  const errs = validateCase(c);
  console.log(`${errs.length ? "FAIL" : "ok  "} ${name} ${c.title || ""}${errs.length ? "" : "  (best case " + par(c) + " clues)"}`);
  errs.forEach((e) => console.log("      ERROR " + e));
  bad += errs.length;
});
process.exit(bad ? 1 : 0);
