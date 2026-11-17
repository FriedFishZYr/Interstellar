# Tidal Forecast Mission

> **Version 2.0.0, the new design.** Rebuilt to follow the Figma “New” section and merged into `main` on 17 Nov 2026: seven phases,
> Incoming Transmission → Pre-flight Check → Tide Lab → Decode the Model → Quick Checks →
> Landing Call → Return to Endurance, ending on a confetti “Mission complete!” screen.
> The page types added for it are in `app.js` (search “New design”) and their wording is in `content.js`
> (`tideRank`, `labResults`, `decode`, `calc`, `millerBg`, `landing`, `endReflect`, `missionSummary`).
> Use `?dev=1` to jump to any page. The tag `pre-new-design` marks the module just before this design.

An interactive, browser-based learning module (≈ 10 minutes, **target only — not yet piloted**) for high-school learners (ages 16–19) studying gravity and tides. It targets **LO3**: using a simplified tidal-height model to predict and explain changes in tidal bulge height.

Learners play the Endurance's science analyst. They have seen the crew land on Miller's planet and lose Doyle to a wall of water; now they get a second chance. They test how each variable changes the bulge, turn their findings into a model, check it on new planets, then forecast Miller's planet and decide whether the crew should land.

```
h = k × (Δg / gₚ) × R        implemented as   h / h₀ = (Δg/Δg₀) × (gₚ₀/gₚ) × (R/R₀),  h₀ = 4 m
```

All scenario values are instructional examples, **not** measurements of the film's planet.

Built with HTML, CSS, vanilla JavaScript and SVG. No framework or build step is needed.

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
| `…/Interstellar/` | Learners (the default) | Learner wording only. The session record and **Export session (JSON)** sit in a collapsed *For teachers and researchers* section on the mission-complete screen and in the evidence-log dialog. |
| `…/Interstellar/?research=1` | Study sessions | The session record and export are shown open on the complete screen and in the dialog. Attempt labels such as "First attempt" and "Fresh attempt 2", and notes such as "hint use is recorded", are shown. |
| `…/Interstellar/?author=1` | Authors checking content | Author notices are shown, e.g. "Ending boundaries are marked 'to verify' in content.js". These also appear automatically on `localhost`, `127.0.0.1` and `file://` pages. |

## A/B test: two versions of the module

The module comes in two versions, so we can test whether **predict–observe–explain (POE)**, our innovative principle, helps learning. Version B has POE; version A has observe–explain only. The link decides the version, and it stays fixed for the whole session.

POE is applied in two places, and version A removes the prediction from both:

| Where | **B**, the full module: `…/Interstellar/` (or `?v=b`) | **A**, the control: `…/Interstellar/?v=a` |
|---|---|---|
| Incoming Transmission | After the scene, the learner logs a first guess about the opening question (or "Not sure yet"). | After the scene, the question "What might make a tidal bulge larger?" is shown with nothing to answer; the learner presses **Continue**. |
| Tide Lab (tests 1–3) | A predicted height is required before every run. Prediction and result are shown side by side, and the feedback recaps the prediction. | No prediction. **Run experiment** is available at once, and the result shows against the 4 m baseline. |
| Return to Endurance | The reflection quotes the learner's first guess back to them. | The same reflection questions, with no first-guess quote. |

Everything else is the same in both versions: the Pre-flight Check, the explanation question after every Tide Lab test with its feedback and hints, the results table, Decode the Model, the Quick Checks, the Landing Call and the mission summary. Several of those steps ask for an answer before the reveal (the Pre-flight ranking, which is unscored, and the predicted height in Quick Checks 2 and 3). They are ordinary practice in both versions, and the scored ones are what we compare the versions on.

Smaller differences that follow from the above, all in version A:

- The opening prompt and button read "Then see the question for this mission." / "See the mission question", and the question heading leaves out "log your first guess".
- The Pre-flight ranking task asks the learner to rank the Moon's pull without calling the answer a guess.
- The Tide Lab intro's job line reads "Run the model, then explain the change."
- In the Tide Lab there is no stepper and no gauge marker; the gauge only displays the baseline and then the model's result.
- The **Hint** button appears with the explanation question, not before the run (there is nothing to answer yet).
- Feedback gives the same explanation of the relationship, without the "You predicted…" line.
- A test's outcome rests on the explanation alone: `correct` or `not-yet`. In version B it also counts the prediction, so **don't compare the two versions on Tide Lab completion**; use the shared later steps.
- A retry is "Try a fresh experiment" and uses new values, as in B.
- The mission-complete screen opens "You built a model from your own evidence" instead of "You started with a guess…".

Running a study:

- Send each learner one link. `?v=a` can be combined with the other options, e.g. `?v=a&research=1`.
- Each version saves its progress under its own key, so a browser that ran one version starts a new session on the other link. A learner who reopens the *wrong* link would start again in the other version; the export shows which version each record came from.
- The export has `condition` (`a` or `b`) and `conditionLabel`, and the file is named `tidal-forecast-session-A-….json` or `…-B-….json`. In version A, `firstIdea` is `null`.
- Version B takes longer by design. `activeMs` per activity is in the export, so report time on task alongside the results.

In the code, the switch is `PREDICTS` near the top of `app.js`; searching for it lists every place the versions differ. The labels and version A's wording are in `content.js` under `abTest`; the unit tests check that none of A's wording mentions predicting or guessing. The tags `m4-prototype` (before the test was added) and `m5-ab-test` (the test on the earlier design) mark older versions.

### Developer mode (for user testing)

Anyone can switch on **developer mode** with the **`<>`** button at the right of the top bar, or by opening `…/Interstellar/?dev=1`. While it's on:

- A bar under the top bar has a **Jump to** menu listing the start screen, every step's intro page and task (grouped by step) and the mission-complete screen, 28 entries in all. Choose one and press **Go**.
- Every segment of the progress rail and every sub-step tab is unlocked, so you can also click straight to any step.
- The setting is remembered in this browser (`localStorage` key `tfm.devmode`), so it stays on after a reload or **Start over**. Press **Turn off** in the bar, or the `<>` button again, to switch it off. Steps you reached while it was on stay open.
- The bar shows **Version A** or **Version B** and a **Switch to** button that opens the same page in the other version (see *A/B test*). Progress doesn't carry across, because each version has its own saved session.
- The session record notes it: the export gets a `devMode` entry (`enabledAt` plus each jump's target and time), so sessions where it was used can be told apart from real learner runs.

A fresh session opens on a **start screen**: the story so far, about 10 minutes and two short film clips, the learning goal, and the seven phases. **Finish mission** opens a **mission-complete screen** with confetti, four achievement chips (3 tests run, 1 model built, 4 quick checks, 1 crew saved), **Review the summary** and **Back to start**. The wording for both is in `content.js` under `intro` and `complete`.

## Files

| File | Purpose |
|---|---|
| `index.html` | Page shell: top bar, console, stage, live region, evidence dialog |
| `styles.css` | Visual design (colour variables mirror the Figma "Mission colours" collection; change the accent in `--system`). Text uses size tokens, `--fs-sm` 14 · `--fs-md` 16 · `--fs-lg` 18 · `--fs-xl` 24 · `--fs-2xl` 32 px, plus `--fs-xs` 12 px for the step names under the progress rail only; SVG diagram labels use their own sizes. |
| `model.js` | **Calculation logic only**: height ratios, Δg, uniform changes, prediction classification. No DOM. Also loads in Node for tests. |
| `content.js` | **Editable content**: all wording, scenario values, hint text, explanation choices, evidence entries, and the **video configuration** |
| `app.js` | Interface logic: state machine, rendering, SVG diagrams, gauge, hints, persistence, export |
| `assets/bg-*.jpg` | Film stills behind the step intro pages (`bg-preflight`, `bg-lab`, `bg-return`) and on the Landing Call background page (`bg-miller`) |
| `tests/model.test.js` | Unit tests for the model and content values (`node --test tests/model.test.js`) |
| `tests/e2e.js` | Optional end-to-end browser test (see *Testing*) |

Project references: `Gravity_and_Tides_Project_Brief.md` (content and assessment brief) and `Tidal_Forecast_Mission_Build_Prompt.md` (build specification). The formal pre/posttest items and answer key in the brief are **not** used in the module.

## Editing content

Everything a designer is likely to change lives in `content.js`:

- **Video**: `video.videoId`, `video.opening.start` and `video.opening.end` (in seconds), and `video.opening.status`.
  - Current excerpt: **2:00–2:40 (120–160 s)**. The project author checked these times by watching playback (6 Nov 2026), so `status` is `'verified'`.
  - If you change the times without re-checking them, set `status: 'to-verify'`. Author links then show a "to verify" notice (learners never see it).
  - `video.ending` (3:35–4:19, about 44 s) plays on the first page of Return to Endurance, beside the reflection, with skip and a text summary. Its `status` is `'to-verify'` until someone checks the boundaries by watching; while it is, author links show a notice.
- **Opening**: `briefing` (the crew message, the first-guess question and its label).
- **Step intro pages**: `stepIntros` (title, situation, job, Start label) and `crewLines` (the quoted crew message on the Pre-flight Check and Tide Lab intros).
- **Pre-flight ranking**: `tideRank` (start order, correct order, feedback and hints).
- **Tide Lab tests**: `experiments['exp-dg' | 'exp-gp' | 'exp-R']`. `variants` lists the multipliers: the first is the specified case (×2); later ones are used for fresh attempts. Each test also has its question, prompt, explanation choices with misconception feedback, and hints.
- **Results table and Decode the Model**: `labResults`, `decode.summary` (the fill-in-the-blank sentences and their answers) and `decode.model` (the three rules).
- **Quick Checks 1 and 4 and the Miller's planet forecast**: `calc['qc-1' | 'qc-4' | 'miller-forecast']`. Each has a `scenario`, the `known` values the learner fills in (with the right `value` for each), an optional `substitute` step, and the value to `solve` for.
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
| **1. Incoming Transmission** (1) | The crew reminds the analyst how the last landing ended. Learner presses Play to start the opening excerpt; it pauses at the end boundary. Skip and scene-summary fallback are always available. Then the opening question: in version B the learner logs an **unscored** first guess (or "Not sure yet"). |
| **2. Pre-flight Check** (4) | (1) **Rank the Moon's pull** on Earth's near side, centre and far side, strongest to weakest, with ↑ / ↓ buttons; the ocean on the diagram reshapes as the order changes. Unscored: a wrong order gets "Distance matters", the right one names the difference in pull Δg. (2–4) **Find Δg, gₚ and R** on the diagram, by click or keyboard. Distractors are the external body and the ocean bulge (h). Each heading is the action only ("Find gₚ on the diagram."). The diagram hides the symbol labels of inputs not yet found, so learners map the picture to the quantity rather than matching text; finding an input reveals its label. |
| **3. Tide Lab** (4) | Three tests, each opened with a scenario question: "What if the Moon were twice as heavy?" (Δg ×2 → 8 m), the planet's own gravity doubles (gₚ ×2 → 2 m), the planet is twice as big (R ×2 → 8 m). Chips above the diagram show the changed input and "Fixed" for the others. The current bulge is outlined before the run ("h = 4 m" on the diagram, an outlined column on the gauge). In version B a prediction (gauge drag, gauge keyboard, stepper or typed value) is required before **Run experiment** unlocks. The result animates; then one explanation question with misconception-specific feedback. The fourth task is the **results table** of the three findings (unscored). |
| **4. Decode the Model** (2) | (1) **Summarise** each test by completing a sentence per variable ("When Δg doubles, the bulge height h ___. So the bigger Δg is, the ___ h is: h is ___ proportional to Δg."). Wrong blanks are marked, with a pointer back to the results table and **Try again**. (2) **The model**: the three rules (Δg and R directly proportional, gₚ inversely) and k, shown as one formula next to the results table (unscored). |
| **5. Quick Checks** (4) | (1) **Calculate h** from real numbers (Δg 0.00001 m/s², gₚ 10 m/s², R 2,000,000 m, k 2 → 4 m); each filled value is marked right or wrong. Getting it right adds the fourth evidence entry, "compare Δg ÷ gₚ". (2) and (3) **Map a plain-language scenario** to the inputs: set each of Δg, gₚ and R to Up / Down / Fixed, then pick the new height. Check 2 is the planet's own gravity halving (gₚ down → 8 m; fresh attempt gₚ ×4 → 1 m); check 3 is the moon's pull weakening by the same amount everywhere (no input changes → 4 m). Until they submit, the diagram is **their sketch**: each choice redraws that input with ↑ / ↓ rather than a factor, and picking a height reshapes the ocean. After submitting, the chips reveal the actual changes, and feedback names each wrongly mapped input. (4) **Work back to R** from a 6 m bulge (Δg 0.00003, gₚ 10 → R 1,000,000 m); the model with the learner's numbers unlocks once step 1 is right. |
| **6. Landing Call** (3) | (1) **Background**: a film still of Gargantua, and why Miller's planet orbiting so close to it matters (unscored). (2) **Forecast** the bulge from the scan (Δg 0.0039 m/s², gₚ 13 m/s², R 2,000,000 m → 1,200 m), then see it on one scale with Earth's tide and the lander's 5 m limit. (3) **Is it safe to land?** Choose yes or no and write a report (see *Story and stakes*). |
| **7. Return to Endurance** (2) | (1) The film's ending (3:35–4:19) beside a **reflection**: version B quotes the learner's first guess; three prompts (what caused the disaster, what made the bulge so huge, what they learned); a few written sentences are needed to continue. (2) **Mission summary**: four cards (what sets the bulge height, how each variable works, the model, why Miller's planet is so dangerous) and an optional **Go deeper** page (why Δg is so large there, where the model stops working, Kip Thorne's rocking planet). **Finish mission** opens the complete screen. |

The **tidal-height model** (h = k × (Δg / gₚ) × R, with definitions) is a bar at the top of the model view, directly above the diagram, on every task that works with the diagram (spatial contiguity: the formula sits next to the picture it describes). The ranking task, the results table, Decode the Model and the story pages show their own content instead. It is always in the same place, and on laptops it stays pinned while the model view scrolls; on phones it sits between the task and the diagram. When a hint or result highlights terms, the bar highlights them and shows their definitions; views ask for this with `eqCard(highlights)` and `render()` draws the bar in `#formula`.

Every prediction task follows explicit states: **awaiting prediction → prediction submitted → result shown → explanation submitted → feedback → continue**. Results are never shown in the diagram, gauge or equation before a prediction is submitted. (The one exception is the Tide Lab in version A of the A/B test, which has no prediction; see *A/B test*.)

### Feedback, hints and completion

- Every feedback card starts with a status label, so the outcomes can't be confused at a glance:
  - **Correct**: green label with a check, solid green border, green tint.
  - **Partly right**: yellow label with a half-filled circle, dashed yellow border, yellow tint (`--partly`, a lemon yellow kept lighter than the Δg amber).
  - **Not yet**: coral label with a retry arrow, coral border.
  - **Answer**: neutral grey, for an answer shown after unsuccessful attempts (also used for a wrong Pre-flight ranking, which is unscored).

- Feedback explains the relationship, for example: *"The planet's gravity points inward. It holds the ocean down, so a stronger gₚ means a smaller bulge. A stronger pull from the planet holds its ocean closer. gₚ doubles, so the bulge is divided by 2: 4 m ÷ 2 = 2 m. You predicted a taller bulge (6 m)."*
- The **Hint** button is a green-outlined pill at the top of every task panel. If a learner spends `hintNudge.afterSec` seconds (default 45, in `content.js`) on a task without submitting or opening a hint, the button turns solid green, glows and reads **Need a hint?** It doesn't fire again on that attempt once a hint has been opened. With reduced motion it shows a steady ring instead of pulsing. The time it fired is saved on the attempt (`hintNudgedAt`). For user testing, `?nudge=5` sets the delay to 5 seconds (`?nudge=0` turns it off).
- Each task has three graduated, free hints, from what changed to the relationship in the model. In the calculations and the mapping checks, the third hint is a worked example with **different numbers**.
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

## Science conventions implemented

- External acceleration arrows (amber) always point **toward** the external body; nothing pushes the far side away.
- Δg is the **full near-to-far** difference.
- Planet gravity arrows (cyan) point inward to the planet's centre.
- Each Tide Lab test changes one input. **Changing R never recalculates Δg or gₚ**, and the interface states this.
- A uniform change in external acceleration leaves Δg and h unchanged.
- The bulge is a simplified static deformation, labelled *"Deformation exaggerated for visibility"* (plus *"sizes not to scale"* when R changes). It is not the film's travelling wave; the Go deeper page says where the model stops working.
- Colours are always paired with a shape or label: dashed bracket (Δg), inward arrows (gₚ), dotted line with end caps (R), white outline and gauge (h), "Fixed" chips, check and retry icons, half-circle and the "Partly right" label for partly correct answers.

## Motion

Motion explains a change; it never delays the learner. Clicks respond in 80–150 ms, entrances take 250–400 ms, and nothing waits on an animation before it can be used.

| What | Motion |
|---|---|
| Buttons, choices, chips, stepper | Dip to 97% while pressed; the radio dot pops in with a slight overshoot |
| Moving to the next task | The task panel slides in from the right (from the left when going back); the diagram cross-fades |
| Progress rail | A finished task's block sweeps green; the white outline pops onto the new task |
| Feedback | The card rises in and its icon pops. "Not yet" gets the same calm entrance (no shaking) |
| New evidence | The "Added to evidence log" entry rises in, and the top-bar count bumps once |
| Results | Tide Lab results count up from the 4 m baseline, alongside the bulge, gauge and bar animations |
| Hints | The hint panel unfolds downward |
| Start and complete screens | Content rises in, staggered; on "Mission complete!" confetti falls (it rests in place with reduced motion) |

Entrances are keyed (`data-enter` in `app.js`), so each plays once: not on page load, not when revisiting a step, and not on unrelated re-renders. Timings and curves are CSS variables (`--ease-out`, `--ease-pop`) and keyframes in `styles.css`.

## Accessibility

- Semantic landmarks, a skip link, and a visible green focus ring.
- Every diagram part is a keyboard target (Tab, then Enter or Space). The ranking uses ↑ / ↓ buttons with labels such as "Move Near up".
- The gauge is an ARIA slider: arrows ±0.5 m, PageUp/PageDown ±1 m, Home and End. The stepper and typed input are equivalent alternatives to dragging.
- Results and feedback are announced through an `aria-live` region, and focus moves to the new task heading.
- `prefers-reduced-motion` disables all animations, including slides, entrances, confetti and the result count-up (numbers show their final value at once).
- Layouts: laptop (two columns), tablet, and a narrow single-column fallback at 390 px. On narrow screens the gauge becomes the stepper plus horizontal comparison bars, and the equation definitions collapse.
- Small text uses a text-safe grey (`--muted`, ≥ 4.5:1) rather than the Figma `faint` value.

## Session record (learning data)

> **Browser storage does not send data to anyone.** Progress is saved in this browser's `localStorage` under the key `tfm.session.v3` (version A of the A/B test uses `tfm.session.v3.a`; sessions saved by earlier designs under older keys aren't loaded, because their step positions no longer line up). There is no backend, no central collection and no analytics. Researchers get data only if the learner clicks **Export session (JSON)** and hands over the file.

Export is available on the mission-complete screen and in the evidence-log dialog (inside *For teachers and researchers*, shown open on `?research=1` links). **Reset progress** in the dialog and **Back to start** on the complete screen clear the record, after an in-page confirmation.

### Exported JSON fields

| Field | Meaning |
|---|---|
| `schema` | `tidal-forecast-mission/session-record@1` |
| `sessionId` | Random anonymous UUID created on first visit (no personal data) |
| `condition`, `conditionLabel` | A/B test version: `a` (observe–explain: no first guess, no prediction in the Tide Lab) or `b` (predict–observe–explain), with a readable label |
| `moduleId`, `moduleVersion` | Module identity (`moduleVersion` is `2.0.0` for this design) |
| `createdAt`, `updatedAt`, `completedAt`, `exportedAt` | ISO timestamps (`completedAt` is set by **Finish mission**) |
| `elapsed.wallClockMs` | Time since the session was created |
| `elapsed.activeVisibleMs` | Approximate time with the page visible (5-second sampling; includes idle time while visible) |
| `firstIdea` | `{ text, notSure, loggedAt }`, the unscored opening first guess (`null` in version A, which doesn't ask for one) |
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
| `hintNudgedAt` | When the hint button started glowing on this attempt (absent if it never did). Compare with `hintsViewed` to see whether learners opened a hint because of the nudge |
| `outcome` | Activity-specific, always including `overall`: `correct`, `partly` or `not-yet` |

Activity-specific attempt fields:

| Activity | Extra fields |
|---|---|
| Pre-flight ranking (`tide-rank`) | `order` (e.g. `['near', 'centre', 'far']`). Moving a point after feedback starts a new attempt, so each order checked is kept |
| Pre-flight variables (`console-*`) | `selection` |
| Tide Lab tests (`exp-*`) | `ranAt`, `result`, `explanation`, `explainedAt`; version B also has `prediction`, `predictedAt`, `predictionOutcome`. In version A, `outcome.prediction` is `null` |
| Decode summary | `blanks` (`{ dg: { change, size, prop }, … }`); `outcome.rows` marks each blank `true` / `false` |
| Quick Checks 1 and 4, Miller forecast | `values` (what the learner typed, keyed `dg`, `gp`, `R`, `k`, `h`); `outcome.known` marks each known value, `outcome.solve` the answer. Right values with a wrong answer (or the reverse) is `partly` |
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
```

The end-to-end run covers:

- The whole mission with mouse and keyboard, all 20 tasks, including a wrong answer and a retry in the ranking, a Pre-flight variable, a Tide Lab test, Decode, Quick Checks 1 and 2 and the landing decision.
- Version A of the A/B test: no first guess, no prediction controls in the Tide Lab, no guess wording in the ranking or on the complete screen, no first-guess quote in the reflection, the same explanation questions and feedback, its own saved session, and the `condition` field in the export.
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
- **Duration** (the start screen says about 10 minutes) is a design estimate, not a measured completion time; it needs a learner pilot.
- **Narrow screens**: the diagram scales down, so its smaller labels (the Δg panel) are small at 390 px. The panel and equation repeat the key information in larger text.
- **Font**: Noto Sans loads from Google Fonts; offline, the system sans-serif is used.
- **Storage**: progress is per browser and per device, and disappears if browser data is cleared. Private windows may not keep it.
- The narrow (390 px) layout follows the three representative Figma narrow screens; other narrow screens were adapted from the desktop designs.
