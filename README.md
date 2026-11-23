# Tidal Forecast Mission

> **Version 2.3.1 (23 Nov 2026), after the pilot.** Two kinds of change. Sessions before it are pilot sessions:
> `moduleVersion` (2.3.1) and the study `version` (`tests@2026-11-23`) are in every record, so they can be told apart.
>
> *Test wording.* The items were reworded for clarity; the rules are in a comment above `PRE` in `study-content.js`. One name per
> idea ("the difference in pull between the near side and the far side", not "near-to-far difference", "gap" or "across the
> planet"); stems no longer repeat what the diagram or table shows; the options of a question are about the same length; item 4
> no longer names Δg just before item 5 asks what it means; item 8 asks a question and lists its values; item 9 is two questions
> with every option in view instead of two dropdowns under "[blank 1] … [blank 2]"; part labels carry no hard-coded numbers; the
> directions encourage a calculator and ask for a best guess throughout; each test is given as about 8 minutes (it said 5). Keys, option order and every number are unchanged, so the
> answer key still applies. One survey answer set reads "it" for the singular "mission story".
>
> *Delivery.* The study stops are named *Starting questions* and *Final questions* (not "Quick check", which is also the
> mission's phase 5); a page drawn again (a choice, a reminder, a number error) no longer replays its entrance; the question
> count and progress bar keep one place and the bar grows; screens with a different backdrop fade in; the four-stop line animates
> the stop just finished; the last screen says "Saving your answers…" until everything has reached the server; the mission
> summary cards drop to one column in a narrow window; and "Your job" on the phase intro pages has a dark backing.
>
> **Version 2.3.0 (branch `in-module-tests`).** The study runs inside the module: a consent page and a pretest before the
> mission, a posttest and a short learner survey after it, an event log of every click, change and page, and a sender that
> stores the data in Supabase (see *Study pages and data collection*). This replaces the plan to run the tests in Qualtrics.
> `?study=0` turns all of it off.
>
> **Version 2.2.0 (branch `evidence-first`).** A new A/B test: the two versions now differ in *when the learner meets the model*
> (evidence first versus formula first; see *A/B test*). The earlier test, prediction versus no prediction, is retired: a
> prediction is part of both versions. A bare link assigns a version at random. The tag `v2.1.0` marks the module before this.
>
> **Version 2.1.0.** Revisions from the first walk-through of the new design (17 Nov 2026): the Pre-flight ranking is a short
> drag-to-reorder task with an animated diagram; the Tide Lab diagram follows the predicted height; k = 2 is shown as a constant
> instead of typed; worked-example hints are tagged as different numbers; the forecast chart has a to-scale panel and an enlarged
> one; the complete screen uses the starting-page layout and opens with a jump to light speed; and motion was refined across the tasks (see *Motion*).
>
> **Version 2.0.0, the new design.** Rebuilt to follow the Figma “New” section and merged into `main` on 17 Nov 2026: seven phases,
> Incoming Transmission → Pre-flight Check → Tide Lab → Decode the Model → Quick Checks →
> Landing Call → Return to Endurance, ending on the “Mission complete!” screen (a jump to light speed, since 2.1.0).
> The page types added for it are in `app.js` (search “New design”) and their wording is in `content.js`
> (`tideRank`, `labResults`, `decode`, `calc`, `millerBg`, `landing`, `endReflect`, `missionSummary`).
> Use `?dev=1` to jump to any page. The tag `pre-new-design` marks the module just before this design.

An interactive, browser-based learning module (≈ 30 minutes, **estimate only — not yet piloted**) for high-school learners (ages 16–19) studying gravity and tides. It targets two goals under one module goal (see *Learning goals*): **LO1**, explaining how a difference in an outside body's pull stretches an ocean into a tidal bulge, and **LO2**, using a simplified tidal-height model to predict and calculate the bulge's height.

Learners play the Endurance's science analyst. They have seen the crew land on Miller's planet and lose Doyle to a wall of water; now they get a second chance. They test how each variable changes the bulge, turn their findings into a model, check it on new planets, then forecast Miller's planet and decide whether the crew should land.

```
h = k × (Δg / gₚ) × R        implemented as   h / h₀ = (Δg/Δg₀) × (gₚ₀/gₚ) × (R/R₀),  h₀ = 4 m
```

All scenario values are instructional examples, **not** measurements of the film's planet.

Built with HTML, CSS, vanilla JavaScript and SVG. No framework or build step is needed.

## Learning goals

The module began as the bulge-height module of a three-goal unit. After learner testing, and because of its length, it now covers two goals under one module goal (reorganized 19 Nov 2026). The goals are listed in the order learners meet them.

A note on numbering: LO1 and LO2 below are this module's own numbers. They are not the LO1 and LO2 of `Gravity_and_Tides_Project_Brief.md`, where bulge height was LO3 (with LO3.1–LO3.3). Drafts of this reorganization called them LO2 and LO3, and the module goal LO4.

**Module goal.** Explain why Miller's planet, orbiting so close to Gargantua, has a huge tide: a heavier, closer body → a bigger difference in pull (Δg) → a taller bulge (h). Use that to judge whether landing is safe. It opens the mission as the unscored first guess (phase 1) and closes it in the forecast and landing report (phase 6) and the reflection (phase 7).

**LO1. Explain how a difference in an outside body's pull across a planet stretches its ocean into a tidal bulge.**

| | Sub-goal | Where |
|---|---|---|
| LO1.1 | Rank the pull at the near side, center and far side by distance from the body | Pre-flight Check, task 1 (ranking) |
| LO1.2 | Explain that the difference in pull (Δg), not the pull itself, stretches the ocean, and that the body only pulls | Ranking feedback; Tide Lab test 1 explanation; Quick Check 3 |
| LO1.3 | Explain how a heavier or closer body changes Δg | Tide Lab test 1 set-up; Landing Call background; landing report |

**LO2. Use the model h = k × (Δg / gₚ) × R to predict and calculate bulge height when one input changes and the others stay fixed.**

| | Sub-goal | Where |
|---|---|---|
| LO2.1 | Identify Δg, gₚ, R and h in a diagram or a worded scenario, and say which change and which stay fixed | Pre-flight Check, tasks 2–4; Quick Checks 2 and 3 (mapping); Quick Check 1, step 1 |
| LO2.2 | Describe how each input relates to h (Δg and R directly, gₚ inversely) and give the physical reason | Tide Lab tests and results table; Decode the Model |
| LO2.3 | Predict the direction and factor of change in h when one input changes | Tide Lab predictions; Quick Checks 2 and 3 |
| LO2.4 | Calculate a bulge height from given values | Quick Check 1; the Miller's planet forecast |

Outside these goals: Quick Check 4 (work back to R) goes beyond LO2.4, and how the planet's radius or the distance sets Δg appears only on the optional Go deeper page.

---

## Run it locally

Serve the folder over HTTP. YouTube embeds usually refuse to play from a `file://` page.

```bash
cd "Interstellar"
python3 -m http.server 8000
# then open http://localhost:8000
```

Any static server works (`npx serve`, VS Code Live Server, etc.). Opening `index.html` directly still works for everything except the video; the module shows a notice and the scene summary.

## Learner, research and author links

The same page serves three audiences, chosen by the URL:

| Link | Who it's for | What changes |
|---|---|---|
| **`…/Interstellar/a/`** | **Learners, version A** (the study link) | Forwards to `…/?v=a`: the full study (consent, pretest, mission, posttest, survey). No `<>` developer button. Any extra options are kept, e.g. `…/a/?research=1`. |
| **`…/Interstellar/b/`** | **Learners, version B** (the study link) | The same, forwarding to `…/?v=b`. |
| **`…/Interstellar/tester/`** | **You and testers** | Forwards to `…/?v=b&tester=1`: developer mode on for that tab (Jump menu, version switch, every page unlocked), so consent and the pretest don't force themselves in. Data from it is sent marked `dev = true`. |
| `…/Interstellar/` | Learners (the default) | Learner wording only. The session record and **Export session (JSON)** sit in a collapsed *For teachers and researchers* section on the mission-complete screen and in the evidence-log dialog. |
| `…/Interstellar/?research=1` | Study sessions | The session record and export are shown open on the complete screen and in the dialog. Attempt labels such as "First attempt" and "Fresh attempt 2", and notes such as "hint use is recorded", are shown. |
| `…/Interstellar/?study=0` | Demos, reviewers, authors | No consent page, pretest, posttest or survey, and nothing is sent: the mission as it was before 2.3.0. Combines with the others, e.g. `?study=0&v=a`. |
| `…/Interstellar/?author=1` | Authors checking content | Author notices are shown, e.g. "Excerpt boundaries are marked 'to verify' in content.js" if a clip's times are changed without re-checking. These also appear automatically on `localhost`, `127.0.0.1` and `file://` pages. |

## A/B test: two versions of the module

The module comes in two versions that differ in one thing: **when the learner meets the model** h = k × (Δg / gₚ) × R. Our innovative principle is *evidence before the formula*: learners run the tests first and build the model from what they find, instead of being given the formula and practising with it.

Why this principle: in our CTA, novices could compute a bulge height once the formula was given (2/2) but were unsure what Δg stood for. The hypothesis is that building the model from evidence improves the **physical explanation** (LO1.2 and LO2.2), with calculation (LO2.4) no worse. The course's own example of a CTA-driven experiment makes the same move (solve first, then symbolise: Koedinger & Anderson, 1998).

| | **B · evidence first** (`?v=b`) | **A · formula first** (`?v=a`) |
|---|---|---|
| Pre-flight Check | Rank the Moon's pull; find Δg, gₚ and R (4 tasks) | The same 4 tasks, then **the model page**: the formula, the three rules and k (5 tasks) |
| Tide Lab | Three tests with **no formula on screen**, then the results table | The same three tests with the **formula bar on screen** and the changed term highlighted, then the results table |
| Decode the Model | Summarize each test, then **the model page**: "Your three rules, in one model" (2 tasks) | Summarize each test and check it against the model (1 task) |
| Everything after | The same | The same |

Both versions have the same 20 tasks, the same questions, hints and feedback, the same film clips, and a prediction before every Tide Lab run. The model page is the same page in a different place, so the time on task should match; `activeMs` per activity is in the export, so check it.

What else differs, and why (each follows from whether the formula is known at that point):

- **The model page itself.** In B it arrives with results, so each term is tied to the row of the results table it came from. In A it arrives before the tests, so its table shows only where each variable sits (on top, on the bottom, multiplies), and its note reads "you will test each term in the Tide Lab".
- **The line under each Tide Lab result.** A sees the model's arithmetic ("Δg ×2 ÷ gₚ ×1 × R ×1 = 2 → 4 m × 2 = 8 m"). That line shows the formula's shape, so B instead reads "Only Δg changed (×2). The bulge went from 4 m to 8 m: ×2."
- **The worked solution** offered after two misses in a test. A's second step points at the formula ("Δg is on top of the fraction"); B's gives the same relationship from the evidence ("A bigger Δg stretches the ocean by the same factor"), and leaves out k, which B has not met yet.
- **Lines that say where the model came from**: "the model you just built" / "tested", "turn it into a model" / "check each finding against the model", and the matching lines on the lab results, the mission summary and the complete screen.

Two things are deliberately the same in both, so the formula cannot leak into B early:

- **No formula before it is introduced.** Neither version shows the formula bar in Incoming Transmission or the Pre-flight tasks.
- **The Tide Lab never says "model".** Its results are test results ("Test result: 8 m", "Your prediction of 8 m matched the result"). The Quick Checks, which come after the model in both versions, still compare with the model.
- **Test 3's correct explanation** puts the ratio in words ("the difference in pull and the planet's own gravity set the stretch as a fraction of the planet's size") rather than writing Δg ÷ gₚ.

Predictions are recorded but not marked in either version (a test is correct when its explanation is). A prediction in the Tide Lab means something different in each version: in A the learner can calculate it from the formula, in B it is a reasoned guess. That is the manipulation, not a side effect, but say so when reporting Tide Lab accuracy. **Compare the versions on what comes after**: the Quick Checks (first-attempt accuracy and hint use), the landing report, and the posttest.

### Assignment

- A link with **`?v=a`** or **`?v=b`** sets the version.
- A **bare link** (`…/Interstellar/`) assigns a new browser at random, 50/50, and that browser keeps its version on later visits.
- Each version saves its progress under its own key, so one browser cannot resume A's progress in B.
- The export has `condition` (`a` or `b`), `conditionLabel`, and `assignment` (`random` or `link`); the file is named `tidal-forecast-session-A-….json` or `…-B-….json`.

For a small study, **send the short links and alternate them** (`…/a/`, `…/b/`, `…/a/`, `…/b/`…) rather than relying on the random draw, which can come out uneven with few learners. Use the bare link when numbers are large or when you cannot hand out links one by one. `?v=` combines with the other options, e.g. `?v=a&research=1`. A learner who clears their browser data or changes device on a bare link may be given the other version; the export shows which version each record came from.

### In the code

The switch is `FORMULA_FIRST` near the top of `app.js`; searching for it and for `V(` lists every place the versions differ. `content.js` holds the rest under `abTest`: the two versions, and version A's step order. Wording that differs sits beside its default in a `formulaFirst` object (the default is version B's), for example `stepIntros.decode.formulaFirst.job`. The unit tests check that both versions have the same 20 tasks in the same order apart from the model page, that every version-A wording replaces an existing default and never says the learner built the model, and that version B's Tide Lab texts never point at the formula.

The tags `m4-prototype`, `m5-ab-test` (the prediction test on the earlier design) and `v2.1.0` (the prediction test on the new design) mark older versions.

### Developer mode (for user testing)

**Developer mode** opens with the tester link, `…/Interstellar/tester/` (or `?tester=1`; `?dev=1` still works). The **`<>`** button at the right of the top bar switches it on and off. Learners on the A and B links never see that button: it shows only in a tab opened from the tester link, and on author pages (`localhost`, `file://`, `?author=1`). While it's on:

- A bar under the top bar has a **Jump to** menu listing the start screen, every step's intro page and task (grouped by step) and the mission-complete screen, 28 entries in all. Choose one and press **Go**.
- Every segment of the progress rail and every sub-step tab is unlocked, so you can also click straight to any step.
- The setting lasts for **this tab only** (`sessionStorage` key `tfm.devmode`). It stays on after a reload or **Start over**, and so does turning it off. A new tab, or the next person at the same computer, starts without it, so a tester can't leave it on for a learner. (Before 2.3.0 it was kept for the whole browser; that old setting is now cleared and ignored.) Press **Turn off** in the bar, or the `<>` button again, to switch it off. Steps you reached while it was on stay open.
- The bar shows **Version A** or **Version B** and a **Switch to** button that opens the same page in the other version (see *A/B test*). Progress doesn't carry across, because each version has its own saved session.
- The session record notes it: the export gets a `devMode` entry (`enabledAt` plus each jump's target and time), so sessions where it was used can be told apart from real learner runs.
- Consent and the pretest don't force themselves in while it is on, but **Finish mission** still leads to the posttest and the survey before the complete screen, as for learners. Reach any study page from the **Jump to** menu: *Consent*, *Pretest*, *Pretest → thank-you page*, *Transition page* (before the posttest), *Posttest* (its intro, past the transition page) and *Learner survey*. A jump restarts that page: its earlier answers are cleared (the thank-you jump keeps the pretest answers and marks the pretest submitted), and the reset is listed in the study record's `devResets`. Data sent while developer mode is on is marked `dev = true`.

A fresh session opens on a **start screen** of two short pages. Page 1 has the title, a two-sentence story hook, "about 30 minutes" and "two short film clips", and **Continue**. Page 2, **Your mission**, has the three goals as a checklist (LO1, LO2, then the landing call), the seven phases, **Back** and **Start mission**. Which page is showing is not saved, so a reload opens page 1. **Finish mission** opens a **mission-complete screen**: a starfield that jumps to light speed, then a card with four achievement chips (3 tests run, 1 model built, 4 quick checks, 1 crew saved), **Review the summary** and **Back to start**. The wording for both is in `content.js` under `intro` and `complete`.


## Study pages and data collection

With the study on (the default), a learner goes through:

1. **Consent.** The study described in four short paragraphs, then *Do you agree to take part?* A learner who says no sees a thank-you page and can still try the mission; nothing is recorded or sent for them.
2. **Pretest.** An intro page with the directions, then items 0–9 (11 pages: 6a and 6b are separate pages), one per page.
3. **Thank-you page.** *Thanks for your answers!*, what comes next (the mission, about 30 minutes, sound on; one more check at the end) and **Go to the mission**. A reload stays on it until the learner moves on (`study.pretest.proceededAt`).
4. **The mission** (start screen, seven phases), unchanged.
5. **Transition page.** After **Finish mission**: *Great work, analyst!*, what comes next (a few final questions, about 8 minutes, then a short survey) and **Continue to the final questions**. A reload stays on it until the learner moves on (`study.posttest.transitionAt`).

**How the study joins the mission.** The mission was built to stand alone, so these choices make the pages fit together:

- **Same parts, same backgrounds.** Both in-between pages (3 and 5) are built from the mission's own parts: the step intro card with its check icon, the start screen's fact line and the same primary button. The page before the mission uses the start screen's film still with no overlay, so moving on to the start screen only swaps the card for the title. The page after it uses the *Return to Endurance* intro's still and overlay.
- **One set of names.** A four-stop line, *Starting questions → Mission → Final questions → Your thoughts*, shows what is done and what comes next (since 2.3.1 the tests are not called "checks": the mission's phase 5 is *Quick Checks*). On the in-between pages and the survey the stop just finished fills in and the line runs on to the next one. It is in the card on the in-between pages and smaller at the top of the test intro pages and the survey. Each study page's small heading is the name of its stop. The posttest no longer says "Mission debrief", which is the name of a mission page.
- **No repeats.** The page before the mission doesn't repeat the start screen's "about 30 minutes" and film clips. "Mission complete" is kept for the last screen, after the survey: the mission summary no longer says it (since 2.3.1), and the page after it says *Before you head home*.
- **Mission lines that change with the study on** (`study-content.js`, `mission`): under **Finish mission**, "Thanks for flying with the Endurance crew." becomes "Next: a few final questions, about 8 minutes.", following the mission's rule that the line under a button starts "Next: …". After the survey, the complete screen adds "That's everything. Thank you for taking part! You can close this page now." While the last answers are still being sent it reads "Saving your answers… Please keep this page open." instead (and "Still saving…" if the server can't be reached). Its **Back to start** button is then secondary rather than the main action.
- **Wording in the mission:** the reflection's quote label is now "Your first guess, at the start of the mission", because with a pretest, "before the mission" was ambiguous.

The wording, facts and stops are in `study-content.js` (`journey`, `pretest.thanks`, `posttest.transition`, `mission`).
6. **Posttest.** An intro page, then items 1–9 (10 pages).
7. **Learner survey.** Ten questions on one page, none required.
8. **Mission complete** screen, with the jump to light speed.

The test pages follow the rules we set for Qualtrics. There is no Back button, and options stay in the written order. Neither test offers *I'm not sure*: the directions and the reminder ask for a best guess. To bring the option back, set `offerUnsure: true` in `study-content.js`, for both tests or inside one of them, and reword that test's `directions` and `unanswered` to mention it. Number boxes take only numbers. An unanswered part gets one reminder ("press Next again to skip"), the same as Qualtrics' *request response*. There is no feedback during either test.

**The answer key is not in this repository**, because the repository is public. The module records each learner's raw choices, and we score them afterwards from the private key. The items are in `study-content.js`; keep its option order, because the key's letters depend on it. The consent text there is final (`consent.draft: false`). If you edit it, set `draft: true` until it is settled, so author pages on `localhost` show a reminder.

The study record has its own storage key (`tfm.study.v1`) and holds a random `participantId`. **Start over** clears the mission but not the study record, so a learner can't take the pretest twice. After Start over the participant ID stays and the mission session ID is new.

### What is recorded

| Data | Where | What's in it |
|---|---|---|
| Test answers | `study.pretest.items.<page>` / `study.posttest.items.<page>` in the record, plus a `test-answer` event | `answers` by part key (`pre_4a`, `post_9_d2`, `pre_5_h` …): the option's position (0 = first as written), or the typed number as text (`'unsure'` only if *I'm not sure* is turned back on). Also `shownAt`, `submittedAt`, `activeMs` (visible time on the page), every change with its time, `nudgedAt` and `skipped` |
| Survey | `study.survey`, plus `survey-change` and `survey-submit` events | `answers` coded 1–5 in the order written (`srv_1` … `srv_10`), changes, times |
| Consent | `study.consent` | `choice` (`yes`/`no`), `at`, and `continuedAt` if a learner who said no went on to the mission |
| Mission | the session record (see *Session record*) | Unchanged: attempts, hints, outcomes, times per activity |
| Event log | `events` table | One row per interaction: `page` (every page or task shown), `click` (what was clicked, by its `data-action` and label), `change` (choices and numbers; free text only as its length), `drag` and `key` on the gauge and ranking cards, `test-*` and `survey-*` events, `complete` (each task), `finish`, `reset`, `visibility` (tab hidden or shown), `pagehide` and page `error`s |

Each event row has `participant_id`, `session_id`, `condition`, `module_version`, `dev`, `seq` (counts up in that browser), `client_time` (the learner's clock), `type`, `page` and `data`. Supabase adds `received_at`. Durations computed from `client_time` are reliable; clock times can be off by the device's error.

### Sending (Supabase)

`telemetry.js` sends two kinds of rows to the project set in `study-content.js` (`supabase.url` and `supabase.key`):

- **`events`**: in batches of up to 200 every 4 seconds, and when the page changes.
- **`session_snapshots`**: the whole record (the same JSON as **Export session**, now including `study`). It is sent at consent, when each test is submitted, at the end of each phase, at **Finish mission**, after the survey, on **Start over**, and when the tab is hidden or closed (at most once a minute). Analyze the latest snapshot per session.

Nothing is sent before the learner agrees, for a learner who declines, with `?study=0`, or while `supabase.url` is empty. Rows that can't be sent wait in the browser (`tfm.outbox.v1`) and go out on the next visit. Requests on a closing tab use `keepalive`, and a row may then arrive twice. Drop duplicates by `participant_id`, `session_id` and `seq`; the `events_clean` view in `supabase/schema.sql` does this. Everything also stays in the browser, so **Export session (JSON)** remains a fallback.

**Setting it up:**

1. Create a Supabase project (the free tier is enough).
2. In the SQL editor, run `supabase/schema.sql`. It creates both tables, row-level security that lets the page's key **add rows only** (it can't read, change or delete them), and two views for analysis: `latest_snapshots` and `events_clean`.
3. Copy the project URL and the **publishable** key (Project Settings → API) into `supabase.url` and `supabase.key` in `study-content.js`. The publishable key is meant to be public. Never put the secret key in the page.
4. Open `…/?v=b` on `localhost`, agree, answer one question, and check that rows appear in the Table Editor. Then clear the test rows, or mark them by opening the page with `?dev=1`.

Free projects pause after about a week without activity. Open the dashboard, or send a test row, the day before each session.

## Files

| File | Purpose |
|---|---|
| `index.html` | Page shell: top bar, console, stage, live region, evidence dialog |
| `styles.css` | Visual design (colour variables mirror the Figma "Mission colours" collection; change the accent in `--system`). Text uses size tokens, `--fs-sm` 14 · `--fs-md` 16 · `--fs-lg` 18 · `--fs-xl` 24 · `--fs-2xl` 32 px, plus `--fs-xs` 12 px for the step names under the progress rail only; SVG diagram labels use their own sizes. |
| `model.js` | **Calculation logic only**: height ratios, Δg, uniform changes, prediction classification. No DOM. Also loads in Node for tests. |
| `content.js` | **Editable content**: all wording, scenario values, hint text, explanation choices, evidence entries, and the **video configuration** |
| `app.js` | Interface logic: state machine, rendering, SVG diagrams, gauge, hints, persistence, export, and the study pages (search "Study pages") |
| `study-content.js` | **Study content**: consent text, pretest and posttest items (no answer key), learner survey, and the Supabase project settings |
| `telemetry.js` | Event log and sender: captures clicks, changes, drags and pages, and sends events and snapshots to Supabase |
| `supabase/schema.sql` | Tables, insert-only security and analysis views for the Supabase project |
| `assets/test/*.svg` | The diagrams for test items 0 and 1 |
| `a/`, `b/`, `tester/` | The short study links: each `index.html` forwards to `../?v=a`, `../?v=b` or `../?v=b&tester=1` |
| `assets/start-bg.jpg` | The Miller's planet still behind the start screen and on the video frames (JPEG; `start-bg.png` is the earlier, heavier copy and is no longer referenced) |
| `assets/bg-*.jpg` | Film stills behind the step intro pages (`bg-preflight`, `bg-lab`, `bg-return`) and on the Landing Call background page (`bg-miller`) |
| `tests/model.test.js` | Unit tests for the model and content values (`node --test tests/model.test.js`) |
| `tests/e2e.js` | Optional end-to-end browser test of the mission, run with `?study=0` (see *Testing*) |
| `tests/study-e2e.js` | Optional end-to-end browser test of the study pages and the data sent, against a fake Supabase |

Project references: `Gravity_and_Tides_Project_Brief.md` (content and assessment brief) and `Tidal_Forecast_Mission_Build_Prompt.md` (build specification). Both were written for the earlier, single-goal scope (bulge height, which they call LO3); where their goal wording or numbering differs, *Learning goals* above is current. The pre/posttest items in the brief are **not** the ones in the module: the module uses the tuned items of 22 Nov 2026 (`study-content.js`).

## Editing content

Everything a designer is likely to change lives in `content.js`:

- **Video**: `video.videoId`, `video.opening.start` and `video.opening.end` (in seconds), and `video.opening.status`.
  - Current excerpt: **2:00–2:40 (120–160 s)**. The project author checked these times by watching playback (6 Nov 2026), so `status` is `'verified'`.
  - If you change the times without re-checking them, set `status: 'to-verify'`. Author links then show a "to verify" notice (learners never see it).
  - `video.ending` (3:35–4:19, about 44 s) plays on the first page of Return to Endurance, beside the reflection, with skip and a text summary. The project author checked these times by watching playback (17 Nov 2026), so its `status` is `'verified'` too. Before that it was `'to-verify'` until someone checked the boundaries by watching; while it is, author links show a notice.
- **Opening**: `briefing` (the crew message, the first-guess question and its label).
- **Step intro pages**: `stepIntros` (title, situation, job, Start label) and `crewLines` (the quoted crew message on the Pre-flight Check and Tide Lab intros).
- **Pre-flight ranking**: `tideRank` (start order, correct order, feedback and hints).
- **Tide Lab tests**: `experiments['exp-dg' | 'exp-gp' | 'exp-R']`. `variants` lists the multipliers: the first is the specified case (×2); later ones are used for fresh attempts. Each test also has its question, prompt, explanation choices with misconception feedback, and hints.
- **Results table and Decode the Model**: `labResults`, `decode.summary` (the fill-in-the-blank sentences and their answers) and `decode.model` (the three rules).
- **Quick Checks 1 and 4 and the Miller's planet forecast**: `calc['qc-1' | 'qc-4' | 'miller-forecast']`. Each has a `scenario`, the `known` values the learner fills in (with the right `value` for each; one marked `fixed: true`, as k is, is shown as a given constant instead of a field), an optional `substitute` step, and the value to `solve` for.
- **Quick Checks 2 and 3**: `mixed.items['qc-2', 'qc-3']`. Each variant has a plain-language `scenario` (it must not name Δg, gₚ or R; the learner works that out), a `change` (factors; missing = 1, `{}` = a uniform change), a `why` line for the mapping feedback and a `physical` line. The first variant is the first attempt; later ones are fresh attempts on the same input. Every answer must be one of `mixed.heightOptions`; the unit tests check this.
- **Landing Call**: `millerBg` (background page; `placeholder` is the still's screen-reader description), `landing` (the decision, crew replies, sample report and checklist).
- **Return to Endurance**: `endReflect` (reflection prompts) and `missionSummary` (the four summary cards and the optional Go deeper cards with their source).
- **Hints**: each task has graduated hints. Each hint is `{ title, html, cue }`, where `cue` tells the interface what to highlight: `inputs`, `diagram`, `eq`, `brackets`, `rows` or `worked`.

`content.js` still holds the wording of the earlier design's Sensor, Planets, Crew briefing, landing-call page and debrief (`sensor`, `planets`, `crewCombined`, `landingCall`, `debrief`). They are no longer part of the mission.

`tests/model.test.js` checks that every variant stays on the 0–10 m gauge and moves the bulge in a consistent direction. Run it after editing values.

## Story and stakes

The learner's work feeds one decision: whether the crew should land on Miller's planet.

Story and tasks are kept on separate pages, so task panels hold only the task and its feedback.

- **Step intro pages.** Every phase after the opening starts with one intro page: a card with the phase title, a crew message where there is one, the situation in a sentence or two, then "Your job: …" and **Start**. Each shows once; returning to a step through the progress rail goes straight to its tasks. The rail doesn't count intro pages as tasks.
- **Evidence for the crew.** New findings are "Added to the crew's evidence log".
- **The landing decision.** After the forecast (1,200 m, shown against Earth's ~1 m tide and the lander's 5 m limit), the crew asks "Is it safe to land?". The learner chooses yes or no and writes a short report. "Yes" gets the crew's pushback ("That's the same call you made last time…") and **Try again**; "No" gets the pilot's reply, the learner's report quoted back, a sample report and a self-check list.
- **Payoff.** The Return to Endurance intro thanks the analyst for changing the crew's fate, and the film ending is replayed with "This time, you know why."

## Progress rail (top bar)

The top bar shows the mission as a **progress rail**: one segment per step, sized by how many tasks it has, and one block per task (20 in all). Green blocks are finished tasks, the white-outlined block is the task on screen, mid-grey blocks were opened but not finished, and dark blocks are still ahead. Above the rail is the current step and task ("Tide Lab · task 2 of 4") and "Step 3 of 7". Reached segments are buttons that go back to that step. Each has a full name for screen readers and as a hover tooltip, e.g. "Step 3: Tide Lab, 1 of 4 tasks done".

- Laptops (over 1100 px): step names sit under the segments.
- 901–1100 px: names are dropped; the header still names the current step.
- 900 px and below: the rail becomes a thin strip along the bottom of the top bar, with "Tide Lab · 2/4" beside the logo (the header is hidden below 480 px, where the task panel's own label names the step).

Inside a task panel, the label above the heading can count a smaller group: "Explore the 3 variables · 1 of 3" for the last three Pre-flight tasks and "Tide Lab · test 1 of 3" for the tests. Elsewhere it matches the rail.

## Learning sequence (as built)

| Phase (tasks) | What happens |
|---|---|
| **1. Incoming Transmission** (1) | The crew reminds the analyst how the last landing ended. Learner presses Play to start the opening excerpt; it pauses at the end boundary. Skip and scene-summary fallback are always available. Then the opening question: the learner logs an **unscored** first guess (or "Not sure yet"). No formula is shown yet. |
| **2. Pre-flight Check** (4) | (1) **Rank the Moon's pull** on Earth's near side, center and far side, strongest to weakest, by dragging three cards into order (each card also has ↑ / ↓ buttons, for the keyboard). The text before the list is two sentences. The ocean and the pull arrows on the diagram glide to each new order, also while a card is being dragged. Unscored: a wrong order gets "Distance matters", the right one names the difference in pull Δg and plays a "one day" loop, in which Earth turns under the two bulges and a coast meets two high tides. (2–4) **Find Δg, gₚ and R** on the diagram, by click or keyboard. Distractors are the external body and the ocean bulge (h). Each heading is the action only ("Find gₚ on the diagram."). The diagram hides the symbol labels of inputs not yet found, so learners map the picture to the quantity rather than matching text; finding an input reveals its label. |
| **3. Tide Lab** (4) | Three tests, each opened with a scenario question: "What if the Moon were twice as heavy?" (Δg ×2 → 8 m), the planet's own gravity doubles (gₚ ×2 → 2 m), the planet is twice as big (R ×2 → 8 m). Chips above the diagram show the changed input and "Fixed" for the others. The current bulge is outlined before the run ("h = 4 m" on the diagram, an outlined column on the gauge). Each test opens by **showing what changed**: the changed input animates from its baseline to its new value (the near and far pull arrows spread apart, the planet's inward arrows grow, or the planet grows) while the ocean stays still, so the cue shows the cause without making the prediction. Marks on the diagram keep the baseline in view afterwards (ticks where the arrows ended, a dashed "size before" ring), dashes drift along the changed pull, and **Replay change** plays it again. A prediction (gauge drag, gauge keyboard, stepper or typed value) is required before **Run experiment** unlocks. It is a guess and **is not marked**: a test is correct when its explanation is, and the feedback reports the prediction back ("You predicted 6 m; the result was 8 m"). The diagram follows the prediction: the ocean stretches to the predicted height, labelled "You 8 m" like the gauge marker. On the run the whole diagram animates from the prediction to the result, and the prediction stays as a dashed outline. The result is called a **test result** ("Test result: 8 m", "Result 8 m" on the gauge), not the model's, because in version B of the A/B test the learner has not met the model yet. Then one explanation question with misconception-specific feedback. The fourth task is the **results table** of the three findings (unscored). The formula bar is on screen here only in version A of the A/B test. |
| **4. Decode the Model** (2) | (1) **Summarize** each test by completing three short sentences per variable, each on its own line ("When Δg doubles, the bulge height h ___." / "So the bigger Δg is, the ___ h is." / "h is ___ proportional to Δg."). Wrong blanks are marked, with a pointer back to the results table and **Try again**. (2) **The model**: the three rules (Δg and R directly proportional, gₚ inversely) and k, shown as one formula next to the results table (unscored). In version A of the A/B test this page closes the Pre-flight Check instead, and Decode has the summary alone. |
| **5. Quick Checks** (4) | (1) **Calculate h** from real numbers (Δg 0.00001 m/s², gₚ 10 m/s², R 2,000,000 m → 4 m); each filled value is marked right or wrong. k is not typed: it is given as "k = 2 · constant" beside the other values, and the formula bar carries a "k = 2" chip with "k is a constant: the same for every planet". Getting it right adds the fourth evidence entry, "compare Δg ÷ gₚ". (2) and (3) **Map a plain-language scenario** to the inputs: set each of Δg, gₚ and R to Up / Down / Fixed, then pick the new height. Check 2 is the planet's own gravity halving (gₚ down → 8 m; fresh attempt gₚ ×4 → 1 m); check 3 is the moon's pull weakening by the same amount everywhere (no input changes → 4 m). Until they submit, the diagram is **their sketch**: each choice redraws that input with ↑ / ↓ rather than a factor, and picking a height reshapes the ocean. After submitting, the chips reveal the actual changes, and feedback names each wrongly mapped input. (4) **Work back to R** from a 6 m bulge (Δg 0.00003, gₚ 10 → R 1,000,000 m); the model with the learner's numbers unlocks once step 1 is right. |
| **6. Landing Call** (3) | (1) **Background**: a film still of Gargantua, and why Miller's planet orbiting so close to it matters (unscored). (2) **Forecast** the bulge from the scan (Δg 0.0039 m/s², gₚ 13 m/s², R 2,000,000 m → 1,200 m), then see how tall that is in a two-panel chart: everything to scale (0 to 1,400 m, where Earth's 1 m tide is too small to see), and the bottom 10 m enlarged, with Earth's tide, the lander's 5 m limit, and Miller's bar running off the top. (3) **Is it safe to land?** Choose yes or no and write a report (see *Story and stakes*). |
| **7. Return to Endurance** (2) | (1) The film's ending (3:35–4:19) beside a **reflection**: it quotes the learner's first guess; three prompts (what caused the disaster, what made the bulge so huge, what they learned); a few written sentences are needed to continue. (2) **Mission summary**: four cards (what sets the bulge height, how each variable works, the model, why Miller's planet is so dangerous) and an optional **Go deeper** page (why Δg is so large there, where the model stops working, Kip Thorne's rocking planet). **Finish mission** opens the complete screen. |

The **tidal-height model** (h = k × (Δg / gₚ) × R, with definitions) is a bar at the top of the model view, directly above the diagram, on every task that works with the diagram **once the model has been introduced** (spatial contiguity: the formula sits next to the picture it describes). That is from the Quick Checks on in version B, and from the Tide Lab on in version A. Incoming Transmission, the Pre-flight tasks, the results table, Decode the Model and the story pages never show it. It is always in the same place, and on laptops it stays pinned while the model view scrolls; on phones it sits between the task and the diagram. When a hint or result highlights terms, the bar highlights them and shows their definitions; views ask for this with `eqCard(highlights)` and `render()` draws the bar in `#formula`.

Every prediction task follows explicit states: **awaiting prediction → prediction submitted → result shown → explanation submitted → feedback → continue**. Results are never shown in the diagram, gauge or equation before a prediction is submitted. (What the Tide Lab diagram shows before the run is the learner's own prediction, labelled "You".)

### Feedback, hints and completion

- Every feedback card starts with a status label, so the outcomes can't be confused at a glance:
  - **Correct**: green label with a check, solid green border, green tint.
  - **Partly right**: yellow label with a half-filled circle, dashed yellow border, yellow tint (`--partly`, a lemon yellow kept lighter than the Δg amber).
  - **Not yet**: coral label with a retry arrow, coral border.
  - **Answer**: neutral grey, for an answer shown after unsuccessful attempts (also used for a wrong Pre-flight ranking, which is unscored).

- Feedback explains the relationship, for example: *"The planet's gravity points inward. It holds the ocean down, so a stronger gₚ means a smaller bulge. A stronger pull from the planet holds its ocean closer. gₚ doubles, so the bulge is divided by 2: 4 m ÷ 2 = 2 m. You predicted a taller bulge (6 m)."*
- **Hints come from mission control.** The panel is headed "Mission control · Hint 1 of 3", so asking for one reads as part of the mission rather than a penalty.
- **Learners are pointed to the Hint button twice, once each** (wording in `content.js` under `coach`): on the first task that has hints ("Stuck on a task? Open Hint. Hints are free.") and on the first Tide Lab test, where a prediction can feel like a blind guess ("Not sure how to predict? Open Hint for a pointer."). A pointer goes for good once the learner dismisses it, opens a hint, or moves on. The Tide Lab's intro page says the same in a line. These are identical in both versions of the A/B test: a pointer shown in only one would be a second difference between them.
- **After a miss the Hint button asks straight away** ("Need a hint?", solid green), without waiting for the quiet spell. The attempt records it as `hintNudgedAt` with `hintNudgeReason: 'miss'`.
- The **Hint** button is a green-outlined pill at the top of every task panel. If a learner spends `hintNudge.afterSec` seconds (default 45, in `content.js`) on a task without submitting or opening a hint, the button turns solid green, glows and reads **Need a hint?** It doesn't fire again on that attempt once a hint has been opened. With reduced motion it shows a steady ring instead of pulsing. The time it fired is saved on the attempt (`hintNudgedAt`). For user testing, `?nudge=5` sets the delay to 5 seconds (`?nudge=0` turns it off).
- Each task has three graduated, free hints, from what changed to the relationship in the model. In the calculations and the mapping checks, the third hint is a worked example with **different numbers**. The panel says so: the example sits in its own dashed box under the tag "Example only · different numbers from your task", followed by "Now do the same with the numbers in your own task." (`workedHint` in `content.js`). Quick Check 1's example is a different planet with a different answer (12 m).
- **Fresh attempts** in the Tide Lab and Quick Checks 2 and 3 use new values (for example gₚ ×4 instead of ×2), so a retry is a genuine new attempt. Elsewhere **Try again** keeps the learner's answers so they can fix what was marked. Earlier attempts are never overwritten.
- In the Pre-flight variable tasks, the Tide Lab tests and Quick Checks 2 and 3, learners can review a worked solution and continue after **2 unsuccessful attempts**. This is recorded as **supported completion**.
- Completion categories, recorded per activity:
  - `independent`: first attempt fully correct, with no hints before submitting.
  - `assisted`: correct after hints or a retry.
  - `worked-solution`: the learner viewed the worked solution.
  - `continued-after-feedback`: the learner moved on without a correct attempt.
  - `unscored`: the opening, the ranking, the results table, the model page, the Miller background, the reflection and the summary.

  Mission progress and independent success are reported separately.
- No lives, countdowns, speed bonuses or leaderboards. The only timer is the hint nudge, which learners never see counting. The game layer is limited to mission phases, the 4-entry evidence log (one per Tide Lab test, plus "compare Δg ÷ gₚ" from Quick Check 1), and progress through the mission.

## Spelling

Everything a learner reads or hears uses American spelling ("Center", "meters", "Summarize", "modeled"). Identifiers keep their original names, so saved sessions and exports are unchanged: the ranking's middle point is still the id `centre`, and sensor readings still have a `centre` key.

## Science conventions implemented

- External acceleration arrows (amber) always point **toward** the external body; nothing pushes the far side away.
- Δg is the **full near-to-far** difference.
- Planet gravity arrows (cyan) point inward to the planet's center.
- Each Tide Lab test changes one input. **Changing R never recalculates Δg or gₚ**, and the interface states this.
- A uniform change in external acceleration leaves Δg and h unchanged.
- The bulge is a simplified static deformation, labelled *"Deformation exaggerated for visibility"* (plus *"sizes not to scale"* when R changes). It is not the film's travelling wave; the Go deeper page says where the model stops working.
- Colours are always paired with a shape or label: dashed bracket (Δg), inward arrows (gₚ), dotted line with end caps (R), white outline and gauge (h), "Fixed" chips, check and retry icons, half-circle and the "Partly right" label for partly correct answers.

## Learning supports

Three supports that tie a symbol or a number to what it means. They are the same in both versions of the A/B test.

- **Values on the diagram (Quick Checks 1 and 4).** What the learner types under "Fill in what you know" is written on the part of the diagram it belongs to: Δg in the difference panel, gₚ beside the planet's pull, R beside the radius; in Check 4 the known bulge height sets the bulge. It shows their own mapping back to them ("is 10 m/s² really the near-to-far difference?") and marks nothing; marking happens on **Check**. The value they are solving for is never drawn. Our CTA found novices could compute but did not know what Δg stood for, which is why the numbers are tied to the picture at the moment they are used (`calcDiagram` in `app.js`).
- **Symbol key.** Any coloured Δg, gₚ, R, k or h says what it stands for when pointed at or tapped, using the formula bar's own definitions (`definitions` in `content.js`). In the Tide Lab the three chips above the diagram are buttons, so the key is reachable from the keyboard there too. This matters most in version B's Tide Lab, where no formula bar is on screen. Escape, a tap elsewhere or moving away closes the note.
- **Predictions recap.** The mission summary ends with the learner's first prediction in each Tide Lab test beside what that test showed, on the gauge's 0–10 m scale. It is a look back at how their thinking moved, not a score: nothing is marked right or wrong (wording under `predictionRecap`).

## Look

One visual system runs through the tasks. It changes no content.

- **The sky.** Two layers of stars drift slowly behind every task (`#sky`, drawn once by `drawSky` in `app.js`; the drift is a CSS transform, so nothing is redrawn per frame). Diagrams no longer carry their own stars. Full-page screens cover the sky with their film stills; the complete screen has its own starfield. On phones, where the task panels have no background, the sky is kept faint. With reduced motion it is still.
- **One panel style.** The console and every card on the stage share the same fill and hairline (`--panel-line`). Stage headings ("Tide Lab · Results") are a line of type over a rule, not a second grey slab. The definition banner on the variables tasks is the same card, marked on its left edge with its variable's colour.
- **Pages made of cards** (the results table, the model, the forecast chart, the summary) sit in the middle of the stage instead of being pinned to its top.
- **Gargantua is drawn as a black hole**: a dark sphere, a ring of bent light and a disc seen edge-on. The Moon keeps its plain ring. Both stay in the amber of the external pull, so the colour still means the same thing.
- **Readouts use tabular figures**, so numbers keep their width as they change.
- **The video frame shows a film still before Play**, under a dark wash, instead of an empty box.
- **The Earth and Moon in the ranking task** use the same lighting as the planet diagram: an ocean lit from the upper left, a darker body, a faint halo.
- **The evidence log opens as the mission file**: a full-height panel on the right edge with numbered findings and a count. When a finding is earned it travels from its card in the task panel up to the log button, which bumps as it lands (`flyToLog`).
- **After the right landing call** the stage shows a mission status board (landing called off, forecast bulge, lander limit, crew safe). It restates what the crew's reply and the forecast already say (`statusBoard` in `content.js`).
- **The browser tab** names the phase ("Tide Lab · Tidal Forecast Mission").
- **Phones.** Typed Quick Check values are also listed under the diagram, whose own labels are too small to read there; the predictions recap stacks its labels above its bars; the Tide Lab chips wrap; the welcome-back note sits under the top bar.

## Motion

Motion explains a change; it never delays the learner. Clicks respond in 80–150 ms, entrances take 250–400 ms, and nothing waits on an animation before it can be used.

| What | Motion |
|---|---|
| Buttons, choices, chips, stepper | Dip to 97% while pressed; the radio dot pops in with a slight overshoot |
| Moving to the next task | The task panel slides in from the right (from the left when going back), its parts following in a short stagger; the diagram cross-fades. Results-table rows, summary cards and the model's terms come in one after another |
| The next stage of the same task | When a task moves on without leaving the page (prediction → result → explanation, scene → question, summary → Go deeper), the panel's new content rises in, top to bottom |
| Pre-flight ranking | A dragged card lifts and the others make room; dropped or moved by arrow, cards glide to their places. The diagram's arrows and ocean glide to the new order. Dashes drift along the arrows toward the Moon. A correct order starts the "one day" loop |
| Tide Lab diagram | The ocean, the arrows on its surface and the height label move together: after each change of the prediction, and from the prediction to the result on the run. The gauge marker eases between steps and tracks the pointer exactly while dragged |
| Tide Lab "what changed" cue | When a test opens (after the page's fade-in), the changed input moves from baseline to its new value over about a second and glows while it moves; the ocean does not move. Dashes then drift along the changed pull. With reduced motion nothing moves and there is no replay control; the baseline marks carry the cue |
| A clip ends | Two soft rings spread from the control that has just unlocked |
| Checked calculation fields and blanks | Each outline glows once in its result colour, then settles |
| Mission start | On **Start mission** the screen goes dark on "Incoming Transmission", then opens from the middle onto the first task (about a second). It takes no clicks: the task underneath is already there |
| Crew messages | They arrive word by word, the first time they are seen, while the signal icon beside the speaker pulses. All of the text is in the page from the start, so a screen reader has it at once and nothing waits on it (`streamHTML` in `app.js`) |
| Forecast reveal | The first time the chart is shown, its left panel opens at the lander's scale (0 to 10 m: Earth's 1 m tide and the lander's 5 m limit fill the frame, and Miller's bar runs off the top) and zooms out over about two seconds until the whole 1,200 m is in view and the limit has sunk into the axis. The scale moves by equal factors, so the small end is not skipped. Then the strip it started from is marked and shown enlarged beside it (`chartZoomOut`) |
| Landing report | "Sending your report to the crew…" gives way to "Report delivered", and the crew's reply follows it |
| Progress rail | A finished task's block sweeps green; the white outline pops onto the new task |
| Feedback | The card rises in and its icon pops. "Not yet" gets the same calm entrance (no shaking). Crew replies rise in the same way |
| New evidence | The "Added to evidence log" entry rises in, and the top-bar count bumps once |
| Results | Tide Lab results count up from the 4 m baseline, alongside the bulge, gauge and bar animations |
| Hints | The hint panel unfolds downward |
| Start and complete screens | Content rises in, staggered. "Mission complete!" opens with a jump to light speed: the stars hold, stretch into streaks rushing out from the center, flash, and settle into a slow drift; the card rises in as they settle (about 1.8 s after **Finish mission**). The jump plays on arrival only, not when the screen is reopened. With reduced motion the stars are still and the card is there at once. Drawn on a canvas (`warpSync` in `app.js`; timings in `WARP`) |

Entrances are keyed (`data-enter` in `app.js`), so each plays once: not on page load, not when revisiting a step, and not on unrelated re-renders. Timings and curves are CSS variables (`--ease-out`, `--ease-pop`) and keyframes in `styles.css`.

## Accessibility

- Semantic landmarks, a skip link, and a visible green focus ring.
- Every diagram part is a keyboard target (Tab, then Enter or Space). The ranking can be dragged, and each card has ↑ / ↓ buttons with labels such as "Move Near up"; each move is announced ("Near is now 1 of 3").
- The gauge is an ARIA slider: arrows ±0.5 m, PageUp/PageDown ±1 m, Home and End. The stepper and typed input are equivalent alternatives to dragging.
- Results and feedback are announced through an `aria-live` region, and focus moves to the new task heading.
- `prefers-reduced-motion` disables all animations, including slides, entrances, the jump to light speed and the result count-up (numbers show their final value at once). The looping ones hold still instead of strobing: the pull dashes and the Moon's halo stop, the "one day" dot rests at high tide, and an unlocked control gets a steady ring.
- Layouts: laptop (two columns), tablet, and a narrow single-column fallback at 390 px. On narrow screens the gauge becomes the stepper plus horizontal comparison bars, and the equation definitions collapse.
- Small text uses a text-safe grey (`--muted`, ≥ 4.5:1) rather than the Figma `faint` value.

## Session record (learning data)

A learner who comes back to a session in progress lands on their task, with a short note at the top ("Welcome back, analyst. Picking up at Tide Lab · task 2 of 4.") that leaves on its own. Under a button, the line that says what comes next always starts "Next: …".

> **With the study on and a Supabase project set, the record and the event log are sent** (see *Study pages and data collection*). Without them, nothing leaves the browser. Progress is saved in this browser's `localStorage` under the key `tfm.session.v4.a` or `tfm.session.v4.b`, one per version of the A/B test, and the version itself under `tfm.condition` (sessions saved under older keys aren't loaded, because the test and the step positions have changed). With `?study=0`, or no Supabase project set, there is no central collection: researchers get data only if the learner clicks **Export session (JSON)** and hands over the file.

Export is available on the mission-complete screen and in the evidence-log dialog (inside *For teachers and researchers*, shown open on `?research=1` links). **Reset progress** in the dialog and **Back to start** on the complete screen clear the record, after an in-page confirmation.

### Exported JSON fields

| Field | Meaning |
|---|---|
| `schema` | `tidal-forecast-mission/session-record@1` |
| `sessionId` | Random anonymous UUID created on first visit (no personal data) |
| `condition`, `conditionLabel` | A/B test version: `a` (formula first) or `b` (evidence first), with a readable label |
| `assignment` | How the version was set: `random` (a bare link) or `link` (`?v=` in the address) |
| `moduleId`, `moduleVersion` | Module identity (`moduleVersion` is `2.2.0` for this A/B test; records from `2.1.0` and earlier belong to the prediction test and must not be pooled with it) |
| `createdAt`, `updatedAt`, `completedAt`, `exportedAt` | ISO timestamps (`completedAt` is set by **Finish mission**) |
| `elapsed.wallClockMs` | Time since the session was created |
| `elapsed.activeVisibleMs` | Approximate time with the page visible (5-second sampling; includes idle time while visible) |
| `firstIdea` | `{ text, notSure, loggedAt }`, the unscored opening first guess |
| `reflection` | `{ text, at }`, the learner's written reflection in Return to Endurance (`null` until they continue past it) |
| `goDeeperOpenedAt` | When the learner first opened the optional Go deeper page (`null` if never) |
| `video.opening`, `video.ending` | Configured `start`/`end`, `boundaryStatus`, and timestamps for play requested, playback started, end reached, skipped, and fallback shown, plus any `error` (e.g. `youtube-error-150`) |
| `evidence[]` | `{ id, foundAt, activity }` for each finding added to the evidence log |
| `summary` | Counts: `scoredActivities`, `independent`, `assisted`, `workedSolution`, `withSupport`, `continuedAfterFeedback`, `notCompleted`, `hintsViewed` |
| `devMode` | `null` for a normal run. If developer mode was on: `{ enabledAt, jumps: [{ to, at }] }`, where `to` is `screen:intro`, `screen:complete`, `intro:step` (an intro page) or `step:sub` (e.g. `5:1` = the Miller's planet forecast) |
| `stepIntros` | `{ stepId: { shownAt, startedAt } }` for each step intro page: when it first appeared and when the learner pressed Start (the gap is time spent reading). `skippedInDevMode: true` if a developer jumped past it |
| `activities.<id>` | One entry per activity, described below |

Activity ids, in order: `briefing`, `tide-rank`, `console-dg`, `console-gp`, `console-R`, `exp-dg`, `exp-gp`, `exp-R`, `lab-results`, `decode-summary`, `decode-model`, `qc-1`, `qc-2`, `qc-3`, `qc-4`, `miller-bg`, `miller-forecast`, `landing-call`, `end-reflect`, `mission-summary`. Thirteen are scored.

Each `activities.<id>` entry contains:

| Field | Meaning |
|---|---|
| `label` | Human-readable activity name |
| `startedAt`, `completedAt`, `activeMs` | Timing |
| `completion` | `independent` · `assisted` · `worked-solution` · `continued-after-feedback` · `unscored` |
| `firstCompletion` | The category when the learner first continued (later retries don't overwrite it) |
| `workedSolutionViewedAt` | Set if the worked solution was viewed |
| `hintsViewed[]` | `{ level, viewedAt, attempt, phase }`, in the order viewed |
| `firstAttempt` | The first attempt, kept separately |
| `retries[]` | Later attempts |

Each attempt contains:

| Field | Meaning |
|---|---|
| `attempt`, `kind` | Attempt number; `first` or `retry` |
| `variant` | The scenario values used |
| `startedAt`, `submittedAt` | Timing |
| `hintsUsedBeforeSubmit` | Hint levels viewed before submitting, in order |
| `hintNudgedAt`, `hintNudgeReason` | When the hint button started glowing on this attempt (absent if it never did), and `'miss'` if that was because of an earlier miss on the task rather than the quiet spell. Compare with `hintsViewed` to see whether learners opened a hint because of the nudge |
| `outcome` | Activity-specific, always including `overall`: `correct`, `partly` or `not-yet` (Tide Lab tests are `correct` or `not-yet`: see below) |

Activity-specific attempt fields:

| Activity | Extra fields |
|---|---|
| Pre-flight ranking (`tide-rank`) | `order` (e.g. `['near', 'centre', 'far']`). Moving a point after feedback starts a new attempt, so each order checked is kept |
| Pre-flight variables (`console-*`) | `selection` |
| Tide Lab tests (`exp-*`) | `prediction`, `predictedAt`, `predictionOutcome`, `ranAt`, `result`, `explanation`, `explainedAt`. The prediction is not marked: `outcome.overall` rests on the explanation alone. `predictionOutcome` (and `outcome.prediction`) still records how close it came: `correct` (within tolerance), `partly` (right direction) or `not-yet` |
| Decode summary | `blanks` (`{ dg: { change, size, prop }, … }`); `outcome.rows` marks each blank `true` / `false` |
| Quick Checks 1 and 4, Miller forecast | `values` (what the learner typed, keyed `dg`, `gp`, `R`, `h`, plus `k`, which is given and always `2`); `outcome.known` marks each known value, `outcome.solve` the answer. Right values with a wrong answer (or the reverse) is `partly` |
| Quick Checks 2 and 3 | `mapping` (`{ dg, gp, R }`: `up` · `down` · `fixed`), `prediction`, `result`; `outcome` adds per-input `mapping`, `mappingCorrect`, `wrongInputs` and `prediction` |
| Landing decision (`landing-call`) | `choice` (`yes` / `no`), `report` |

Free-text answers (the first guess, the landing report and the reflection) are recorded **but not auto-scored**. The landing decision is judged on the yes/no choice; the report needs human scoring. Success after hints, retries or a worked solution should not be reported as independent mastery.

## Testing

```bash
node --test tests/model.test.js          # 17 unit tests: all spec ratios + content sanity checks
```

Optional browser test (needs Chrome and `playwright-core`, not included):

```bash
npm i --no-save playwright-core
python3 -m http.server 8765 &            # in this folder
node tests/e2e.js                        # CHROME_PATH=/path/to/chrome to override
node tests/study-e2e.js                  # the study pages and the data sent (fake Supabase)
```

The study run covers consent (nothing sent before agreeing), the pretest (11 pages, no *I'm not sure* anywhere, the reminder and skip, a refused non-number, the matching item, item 8's value list and item 9's two questions), the thank-you page, **Finish mission** leading to the transition page and then the posttest (also without *I'm not sure*), the survey, the record's study section, and what reaches Supabase: snapshots at each milestone, one `test-answer` event per page, page views, unique sequence numbers, the publishable key, and no free text. It also covers Start over (no second pretest), declining (nothing sent), Supabase being down (events wait and go out later), a reload mid-test, `?study=0`, and a phone-width test page. Finally, it opens the three links on a learner-style address (not `localhost`). It checks that `/a/` and `/b/` show no `<>` button and ignore an old browser-wide developer setting, and that `/tester/` turns developer mode on for its tab only and sends data marked `dev = true`. All checks passed on 22 Nov 2026.

The end-to-end run covers:

- The whole mission with mouse and keyboard, all 20 tasks, including a wrong answer and a retry in the ranking, a Pre-flight variable, a Tide Lab test, Decode, Quick Checks 1 and 2 and the landing decision.
- The A/B test. Version B (the full run): no formula in the Tide Lab, results stated as what the test showed, the model page tied to the results table. Version A: the model page at the end of the Pre-flight Check, the formula bar and the model's arithmetic in the Tide Lab, the same prediction, questions and feedback, the "tested, not built" wording, its own saved session, and the `condition` and `assignment` fields in the export. Assignment: a bare link assigns at random and the browser keeps it; a named link wins.
- Results stay hidden until a prediction is made.
- Wrong answers get relationship-specific feedback, and retries use fresh values where they should.
- Quick checks hide the changing inputs until submit, redraw the diagram from the learner's answers, give per-input mapping feedback, and record mapping attempts separately; the calculation checks mark each value and unlock steps in order.
- Hint levels work, and the hint nudge fires and is recorded.
- Reload restores the position and draft answers.
- Checkpoint navigation goes back to saved states, and task counters match the progress rail.
- The YouTube-failure fallback appears.
- The JSON export separates first attempts from retries and includes the reflection.
- Developer mode reaches all 28 pages without errors.
- Reset works.
- 390 px, 1024 px and short (680 px tall) layouts have no horizontal overflow or squashed panels.
- There are no console errors.

All checks passed on 17 Nov 2026. Separately, YouTube's own demo video was used to confirm that the player starts at the configured start time and pauses at the end time.

## Known limitations

- **The Interstellar clip may not play when embedded.** In testing (6 Nov 2026), the YouTube player returned **error 150** for `DB8i1kyXkWc`. That usually means the owner or a copyright claim blocks playback on other websites. YouTube's oEmbed endpoint still lists the video, and the same player code plays other videos correctly.
  - When this happens, the module shows the scene summary, a link to watch 2:00–2:40 on YouTube in a new tab, and *Continue without video*.
  - Check in a normal browser on your target network. If it is still blocked, either point `video.videoId` at an embeddable upload of the scene (re-verify the timestamps) or rely on the link-out.
  - The film is never downloaded or redistributed.
- **Duration** (the start screen says about 30 minutes) is an estimate from the built content (about 22–25 min for a fast learner, 40–45 for one who needs hints and worked solutions), not a measured completion time; it needs a learner pilot. The course brief still targets 8–10 minutes, for its earlier single-goal scope.
- **Narrow screens**: the diagram scales down, so its smaller labels (the Δg panel) are small at 390 px. The panel and equation repeat the key information in larger text.
- **Font**: Noto Sans loads from Google Fonts; offline, the system sans-serif is used.
- **Data collection depends on the network.** A school network that blocks `*.supabase.co` stops sending; events then wait in the browser. Check from the target network before a session, and keep **Export session (JSON)** as a fallback.
- **Storage**: progress is per browser and per device, and disappears if browser data is cleared. Private windows may not keep it.
- The narrow (390 px) layout follows the three representative Figma narrow screens; other narrow screens were adapted from the desktop designs.
