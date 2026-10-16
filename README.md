# Daily Case

One tiny mystery a day. Five suspects, four clues, two minutes. Static PWA, no accounts, no server, state in `localStorage`.

## Run it
```bash
node serve.js 5174     # then open http://localhost:5174
node validate.js       # checks every case is solvable and the clues don't contradict the culprit
```
- `?case=N` plays case N without touching the streak (add `&fresh` to reset that case)
- `?reset` wipes local progress

## How it plays
Open clues (each says which trait it's about, not what it reveals), cross off suspects who don't fit, then accuse. Three wrong guesses ends the case. Stars: 3 = no wrong guesses and no clues opened after the case was already solvable, 2 = no wrong guesses, 1 = won after misses.

## Files
- `cases.js` — the case data. A clue says the culprit's trait IS (or, with `not: true`, is NOT) a value.
- `app.js` — rules, daily pick (day number since 2026-01-01 mod number of cases), streak, share text
- `validate.js` — the fairness check; a generator should run its output through the same rules
- `sw.js` — offline cache; **bump `CACHE` on every push**

## Generating cases
```bash
node generate.js                     # today + next 6 days, skips dates that already have a file
node generate.js --days 30           # a month ahead
node generate.js --date 2026-11-01 --force
node generate.js --dry               # print a case, write nothing
node validate.js daily/*.json        # re-check what's on disk
```
Writes `daily/YYYY-MM-DD.json`. The app loads today's file if it exists and passes `rules.js`; otherwise it plays a premade case. Needs `ANTHROPIC_API_KEY` in the environment, or it reads that one line from `../story-rpg/.env`. Model is `claude-haiku-5-5` (override with `CASE_MODEL`), thinking off.

How it stays fair: Claude invents the cast (suspects and traits) and picks the culprit. Code then chooses four true facts about the culprit that leave exactly one suspect with no clue solving it alone, and Claude writes the clue text for those facts. Asking Claude to do the logic directly failed its own checks 3 times out of 3, so the logic is not left to it. Every case then passes `rules.js`, the same rules the app runs, and a failure is sent back with the exact problems (3 tries, then dropped).

Cost: about 2-5k tokens per case, roughly a cent or less on Haiku. A month is a few tens of cents.

Once a day is started, the case is stored with the player's progress, so republishing can't change it mid-play.

## Next
- Hosting: `daily/` has to be published alongside the app, and someone has to run `generate.js` ahead of time (a scheduled task could do it weekly)
- Capacitor wrapper (reuse `../story-rpg/android-capacitor` setup, new package id)
- More variety: 6 suspects, 5 clues, clues that rule out two traits at once
