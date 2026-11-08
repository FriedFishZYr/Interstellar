# Tidal Forecast Mission

An interactive, browser-based learning module (≈ 8–10 minutes, **target only — not yet piloted**) for high-school learners (ages 16–19) studying gravity and tides. It targets **LO3**: using a simplified tidal-height model to predict and explain changes in tidal bulge height.

Learners play a spacecraft's science analyst and work through **Predict → Run the model → Compare → Explain → Apply**.

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
| `…/Interstellar/?research=1` | Study sessions | The session record and export are shown open in the debrief, the complete screen and the dialog. Notes such as "Saved as your first attempt. Retries are recorded separately." and "hint use is recorded" are shown. |
| `…/Interstellar/?author=1` | Authors checking content | Author notices are shown, e.g. "Ending boundaries are marked 'to verify' in content.js". These also appear automatically on `localhost`, `127.0.0.1` and `file://` pages. |

### Developer mode (for user testing)

Anyone can switch on **developer mode** with the **`<>`** button at the right of the top bar, or by opening `…/Interstellar/?dev=1`. While it's on:

- A bar under the top bar has a **Jump to** menu listing the start screen, every activity (grouped by step) and the mission-complete screen. Choose one and press **Go**.
- Every segment of the progress rail and every sub-step tab is unlocked, so you can also click straight to any step.
- The setting is remembered in this browser (`localStorage` key `tfm.devmode`), so it stays on after a reload or **Start over**. Press **Turn off** in the bar, or the `<>` button again, to switch it off. Steps you reached while it was on stay open.
- The session record notes it: the export gets a `devMode` entry (`enabledAt` plus each jump's target and time), so sessions where it was used can be told apart from real learner runs.

A fresh session opens on a **start screen** (title, learning goal, about 10 minutes, the Predict → Run → Compare → Explain → Apply loop). **Finish mission** opens a **mission-complete screen** with the three relationships found, the evidence count and the time on mission. The wording for both is in `content.js` under `intro` and `complete`. Sessions saved before the start screen existed skip it.

## Files

| File | Purpose |
|---|---|
| `index.html` | Page shell: top bar, console, stage, live region, evidence dialog |
| `styles.css` | Visual design (colour variables mirror the Figma "Mission colours" collection; change the accent in `--system`). Text uses size tokens, `--fs-sm` 14 · `--fs-md` 16 · `--fs-lg` 18 · `--fs-xl` 24 · `--fs-2xl` 32 px, plus `--fs-xs` 12 px for the step names under the progress rail only; SVG diagram labels use their own sizes. |
| `model.js` | **Calculation logic only**: height ratios, Δg, uniform changes, prediction classification. No DOM. Also loads in Node for tests. |
| `content.js` | **Editable content**: all wording, scenario values, hint text, explanation choices, evidence entries, and the **video configuration** |
| `app.js` | Interface logic: state machine, rendering, SVG diagram, gauge, hints, persistence, export |
| `tests/model.test.js` | Unit tests for the model and content values (`node --test tests/model.test.js`) |
| `tests/e2e.js` | Optional end-to-end browser test (see *Testing*) |

Project references: `Gravity_and_Tides_Project_Brief.md` (content and assessment brief) and `Tidal_Forecast_Mission_Build_Prompt.md` (build specification). The formal pre/posttest items and answer key in the brief are **not** used in the module.

## Editing content

Everything a designer is likely to change lives in `content.js`:

- **Video**: `video.videoId`, `video.opening.start` and `video.opening.end` (in seconds), and `video.opening.status`.
  - Current excerpt: **2:00–2:40 (120–160 s)**. The project author checked these times by watching playback (6 Nov 2026), so `status` is `'verified'`.
  - If you change the times without re-checking them, set `status: 'to-verify'`. Author links then show a "to verify" notice (learners never see it).
  - `video.ending` (3:35–4:19, about 44 s) plays by default after the crew challenges, before the debrief. The debrief unlocks once it has played, been skipped or its text fallback shown. Its `status` is `'to-verify'` until someone checks the boundaries by watching; while it is, author links show a notice.
- **Experiments**: `experiments['exp-dg' | 'exp-gp' | 'exp-R'].variants` lists the multipliers. The first is the specified case (×2); later ones are used for fresh attempts.
- **Sensor readings**: `sensor.readings` (12 / 10 / 8, illustrative units) and `sensor.variants` (the amount added everywhere: +3, then +5).
- **Quick checks**: `mixed.items['mixed-1', 'mixed-2']`. Each variant has a plain-language `scenario` (it must not name Δg, gₚ or R; the learner works that out), a `change` (factors; missing = 1, `{}` = a uniform change), a `why` line for the mapping feedback and a `physical` line. The first variant is the first attempt; later ones are fresh attempts on the same input. Every answer must be one of `mixed.heightOptions`; the unit tests check this.
- **Planet comparison**: `planets.sets`. Set 1 is the specified A/B/C comparison; set 2 is used for fresh attempts.
- **Crew briefing** (set on Miller's planet): `crewCombined.variants` (first: Δg ×2.6, gₚ ×1.3 → 8 m; gₚ ×1.3 is the film's "130% of Earth gravity", the Δg factors are illustrative) and the `crewExplain` claim, the Earth-gravity twin vs Miller's planet comparison (10.4 m vs 8 m), expert note and self-check.
- **Film ending and debrief**: `filmEnding` (lead-in, "watch for" prompts, text fallback) and `debrief.filmCheck` / `debrief.goDeeper` (what the model explains and doesn't, plus the optional Go deeper box with its source).
- **Hints**: each task has graduated hints. Each hint is `{ title, html, cue }`, where `cue` tells the interface what to highlight: `inputs`, `diagram`, `eq`, `brackets`, `rows` or `worked`.

`tests/model.test.js` checks that every variant stays on the 0–10 m gauge and moves the bulge in a consistent direction. Run it after editing values.

## Progress rail (top bar)

The top bar shows the mission as a **progress rail**: one segment per step, sized by how many tasks it has, and one block per task (15 in all). Green blocks are finished tasks, the white-outlined block is the task on screen, mid-grey blocks were opened but not finished, and dark blocks are still ahead. Above the rail is the current step and task ("Experiments · task 2 of 3") and "Step 3 of 8". Reached segments are buttons that go back to that step. Each has a full name for screen readers and as a hover tooltip, e.g. "Step 3: Experiments, 1 of 3 tasks done".

- Laptops (over 1100 px): step names sit under the segments.
- 901–1100 px: names are dropped; the header still names the current step.
- 900 px and below: the rail becomes a thin strip along the bottom of the top bar, with "Experiments · 2/3" beside the logo (the header is hidden below 480 px, where the task panel's own label names the step).

## Learning sequence (as built)

| Step | What happens |
|---|---|
| **A. Briefing** | Learner presses Play to start the excerpt; it pauses at the end boundary. Learner logs an **unscored** first idea (or "Not sure yet"). Skip and scene-summary fallback are always available. |
| **B. Console** | Three click-or-keyboard identification tasks: Δg panel, gₚ arrows, R line. Distractors are the external body and the ocean bulge (h). The equation term highlights as a visual is selected. |
| **C. Experiments** | Δg ×2 → 8 m, gₚ ×2 → 2 m, R ×2 → 8 m. The changed input is shown; the others show a lock icon and "Fixed". A prediction (gauge drag, gauge keyboard, stepper or typed value) is required before **Run experiment** unlocks. The result animates; prediction and result are shown together; then one explanation question with misconception-specific feedback. |
| **D. Sensor update** | Near / centre / far readings all +3. Arrows lengthen while the Δg bracket keeps its width. Learner answers Higher / Lower / Stays the same **plus** which model quantity supports it. |
| **D2. Quick checks** | Two short items covering cases the earlier steps don't: the planet's own gravity halves (gₚ down → taller bulge, 8 m), and the moon's pull weakens by the same amount everywhere (no input changes, 4 m). Both are decreases; the experiments only use increases. The scenario is written in plain words and the console does **not** say which input changes. The learner first sets each of Δg, gₚ and R to Up / Down / Fixed (LO3.1 mapping), then picks the new height. After submitting, the chips reveal the actual changes, and feedback names each wrongly mapped input. Fresh attempts use new values for the same case (gₚ ×4; a uniform increase). R and Δg checks were dropped as redundant with Experiments 1 and 3. |
| **E. Planets** | A (Δg 2×, gₚ 1×), B (2×, 4×), C (0.5×, 0.5×). Learner estimates each planet's height relative to baseline, picks the smallest, and chooses a reason. Results are revealed on a common 0–10 m scale (8 / 2 / 4 m). |
| **F. Crew briefing** | Set on Miller's planet. (1) Forecast its bulge with a required written reason (Δg ×2.6 from Gargantua, gₚ ×1.3 → 8 m). (2) Agree/disagree with a crewmate who says the 130% gravity heaps the water up, with a required explanation, then an expert note and an optional self-check. Challenge 2 shows gₚ as the **only difference** (Twin ×1 vs Miller's ×1.3) and Δg, R and k as **Same for both**, with no ×2.6 badge, so the shared Δg doesn't read as a difference. Both diagrams keep their Δg arrows in the same place. |
| **G. Debrief** | (1) The film's ending (3:35–4:19) plays by default, with skip and text fallback. (2) Opening question, the learner's first idea, a three-card summary, a reflection line chosen from the first idea, what the model explains about the scene and what it doesn't, and an optional Go deeper box. Also shows the evidence log, session summary, export and start over. |

The **tidal-height model** (h = k × (Δg / gₚ) × R, with definitions) is a bar at the top of the model view, directly above the diagram and the input chips, on every task (spatial contiguity: the formula sits next to the picture and inputs it describes). It is always in the same place, and on laptops it stays pinned while the model view scrolls; on phones it sits between the task and the diagram. When a hint or result highlights terms, the bar highlights them and shows their definitions; views ask for this with `eqCard(highlights)` and `render()` draws the bar in `#formula`. The ratio sum for a result ("Δg ×2 ÷ gₚ ×1 × R ×1 = 2 → 4 m × 2 = 8 m") sits under the result numbers in the task panel.

Every prediction task follows explicit states: **awaiting prediction → prediction submitted → result shown → explanation submitted → feedback → continue**. Results are never shown in the diagram, gauge or equation before a prediction is submitted.

### Feedback, hints and completion

- Every feedback card starts with a status label, so the outcomes can't be confused at a glance:
  - **Correct**: green label with a check, solid green border, green tint.
  - **Partly right**: yellow label with a half-filled circle, dashed yellow border, yellow tint (`--partly`, a lemon yellow kept lighter than the Δg amber).
  - **Not yet**: coral label with a retry arrow, coral border.
  - **Answer**: neutral grey, for an answer shown after unsuccessful attempts.

- Feedback explains the relationship, for example: *"You predicted a taller bulge. Here only the planet's surface gravity increased. Its stronger restoring pull holds the ocean closer to the planet, so the modelled bulge is divided by 2."*
- Each task has 3–4 graduated, free hints:
  1. Highlight the changed and fixed inputs.
  2. A physical cue on the diagram.
  3. The proportional relationship highlighted in the equation.
  4. A worked example with **different numbers**, then a fresh attempt.
- **Fresh attempts** use new values (for example gₚ ×4 instead of ×2), so a retry is a genuine new prediction. Earlier answers are never overwritten.
- After **2 unsuccessful attempts**, learners can review a worked solution and continue. This is recorded as **supported completion**.
- Completion categories, recorded per activity:
  - `independent`: first attempt fully correct, with no hints before submitting.
  - `assisted`: correct after hints or a retry.
  - `worked-solution`: the learner viewed the worked solution.
  - `continued-after-feedback`: the learner moved on without a correct attempt.

  Mission progress and independent success are reported separately.
- No lives, timers, speed bonuses or leaderboards. The game layer is limited to mission checkpoints, the 5-entry evidence log, and progress through investigations.

## Science conventions implemented

- External acceleration arrows (amber) always point **toward** the external body; nothing pushes the far side away.
- Δg is the **full near-to-far** difference.
- Planet gravity arrows (cyan) point inward to the planet's centre.
- Each experiment changes one input. **Changing R never recalculates Δg or gₚ**, and the interface states this.
- A uniform change in external acceleration leaves Δg and h unchanged.
- The bulge is a simplified static deformation, labelled *"Deformation exaggerated for visibility"* (plus *"sizes not to scale"* when R changes). It is not the film's travelling wave.
- Colours are always paired with a shape or label: dashed bracket (Δg), inward arrows (gₚ), dotted line with end caps (R), white outline and gauge (h), lock icon and "Fixed", check and retry icons, half-circle and the "Partly right" label for partly correct answers.

## Motion

Motion explains a change; it never delays the learner. Clicks respond in 80–150 ms, entrances take 250–400 ms, and nothing waits on an animation before it can be used.

| What | Motion |
|---|---|
| Buttons, choices, chips, stepper | Dip to 97% while pressed; the radio dot pops in with a slight overshoot |
| Moving to the next task | The task panel slides in from the right (from the left when going back); the diagram cross-fades |
| Progress rail | A finished task's block sweeps green; the white outline pops onto the new task |
| Feedback | The card rises in and its icon pops. "Not yet" gets the same calm entrance (no shaking) |
| New evidence | The "Added to evidence log" entry rises in, and the top-bar count bumps once |
| Results | Experiment and crew results count up from the 4 m baseline, alongside the existing bulge, gauge and bar animations |
| Hints | The hint panel unfolds downward |
| Start and complete screens | Content rises in, staggered; on "Mission complete" the check badge pops and the three findings arrive one after another |

Entrances are keyed (`data-enter` in `app.js`), so each plays once: not on page load, not when revisiting a step, and not on unrelated re-renders. Timings and curves are CSS variables (`--ease-out`, `--ease-pop`) and keyframes in `styles.css`.

## Accessibility

- Semantic landmarks, a skip link, and a visible green focus ring.
- Every diagram part is a keyboard target (Tab, then Enter or Space).
- The gauge is an ARIA slider: arrows ±0.5 m, PageUp/PageDown ±1 m, Home and End. The stepper and typed input are equivalent alternatives to dragging.
- Results and feedback are announced through an `aria-live` region, and focus moves to the new task heading.
- `prefers-reduced-motion` disables all animations, including slides, entrances and the result count-up (numbers show their final value at once).
- Layouts: laptop (two columns), tablet, and a narrow single-column fallback at 390 px. On narrow screens the gauge becomes the stepper plus horizontal comparison bars, and the equation definitions collapse.
- Small text uses a text-safe grey (`--muted`, ≥ 4.5:1) rather than the Figma `faint` value.

## Session record (learning data)

> **Browser storage does not send data to anyone.** Progress is saved in this browser's `localStorage` under the key `tfm.session.v2` (v1 sessions from before the Quick checks step aren't loaded, because their step positions no longer line up). There is no backend, no central collection and no analytics. Researchers get data only if the learner clicks **Export session (JSON)** and hands over the file.

Export is available on the mission-complete screen and in the evidence-log dialog (inside *For teachers and researchers*), and in the debrief on `?research=1` links. **Start over / Reset progress** clears the record, after an in-page confirmation.

### Exported JSON fields

| Field | Meaning |
|---|---|
| `schema` | `tidal-forecast-mission/session-record@1` |
| `sessionId` | Random anonymous UUID created on first visit (no personal data) |
| `moduleId`, `moduleVersion` | Module identity |
| `createdAt`, `updatedAt`, `completedAt`, `exportedAt` | ISO timestamps (`completedAt` is set by **Finish mission**) |
| `elapsed.wallClockMs` | Time since the session was created |
| `elapsed.activeVisibleMs` | Approximate time with the page visible (5-second sampling; includes idle time while visible) |
| `firstIdea` | `{ text, notSure, loggedAt }`, the unscored opening prediction |
| `video.opening`, `video.ending` | Configured `start`/`end`, `boundaryStatus`, and timestamps for play requested, playback started, end reached, skipped, and fallback shown, plus any `error` (e.g. `youtube-error-150`) |
| `evidence[]` | `{ id, foundAt, activity }` for each relationship found |
| `summary` | Counts: `independent`, `assisted`, `workedSolution`, `withSupport`, `continuedAfterFeedback`, `notCompleted`, `hintsViewed` |
| `devMode` | `null` for a normal run. If developer mode was on: `{ enabledAt, jumps: [{ to, at }] }`, where `to` is `screen:intro`, `screen:complete` or `step:sub` (e.g. `5:0` = Planets) |
| `activities.<id>` | One entry per activity, described below |

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
| `outcome` | Activity-specific, always including `overall`: `correct`, `partly` or `not-yet` |

Activity-specific attempt fields:

| Activity | Extra fields |
|---|---|
| Console | `selection` |
| Experiments | `prediction`, `predictedAt`, `result`, `predictionOutcome`, `explanation`, `explainedAt` |
| Sensor | `choice`, `quantity` |
| Quick checks | `mapping` (`{ dg, gp, R }`: `up` · `down` · `fixed`), `prediction`, `result`; `outcome` adds per-input `mapping`, `mappingCorrect`, `wrongInputs` and `prediction` |
| Planets | `estimates`, `smallest`, `reason` |
| Crew 1 | `prediction`, `reason`, `result` |
| Crew 2 | `stance`, `explanation`, `selfCheck` |

Free-text reasons and explanations are recorded **but not auto-scored**. Crew 1 is judged on the numeric prediction and Crew 2 on the agree/disagree stance; the text needs human scoring. Success after hints, retries or a worked solution should not be reported as independent mastery.

## Testing

```bash
node --test tests/model.test.js          # 16 unit tests: all spec ratios + content sanity checks
```

Optional browser test (needs Chrome and `playwright-core`, not included):

```bash
npm i --no-save playwright-core
python3 -m http.server 8765 &            # in this folder
node tests/e2e.js                        # CHROME_PATH=/path/to/chrome to override
```

The end-to-end run covers:

- The whole module with mouse and keyboard.
- Results stay hidden until a prediction is made.
- Wrong answers get relationship-specific feedback, and retries use fresh values.
- Quick checks hide the changing inputs until submit, give per-input mapping feedback, and record mapping attempts separately.
- All four hint levels work.
- Reload restores the position and draft answers.
- Checkpoint navigation goes back to saved states.
- The YouTube-failure fallback appears.
- The JSON export separates first attempts from retries.
- Reset works.
- 390 px and 1024 px layouts have no horizontal overflow.
- There are no console errors.

All checks passed during development. Separately, YouTube's own demo video was used to confirm that the player starts at the configured start time and pauses at the end time.

## Known limitations

- **The Interstellar clip may not play when embedded.** In testing (6 Nov 2026), the YouTube player returned **error 150** for `DB8i1kyXkWc`. That usually means the owner or a copyright claim blocks playback on other websites. YouTube's oEmbed endpoint still lists the video, and the same player code plays other videos correctly.
  - When this happens, the module shows the scene summary, a link to watch 2:00–2:40 on YouTube in a new tab, and *Continue without video*.
  - Check in a normal browser on your target network. If it is still blocked, either point `video.videoId` at an embeddable upload of the scene (re-verify the timestamps) or rely on the link-out.
  - The film is never downloaded or redistributed.
- **Duration** (≈ 9 minutes before the Quick checks; the two checks add about a minute) is a design estimate, not a measured completion time; it needs a learner pilot.
- **Narrow screens**: the diagram scales down, so its smaller labels (the Δg panel) are small at 390 px. The panel and equation repeat the key information in larger text.
- **Font**: Noto Sans loads from Google Fonts; offline, the system sans-serif is used.
- **Storage**: progress is per browser and per device, and disappears if browser data is cleared. Private windows may not keep it.
- The narrow (390 px) layout follows the three representative Figma narrow screens; other narrow screens were adapted from the desktop designs.
