# Build Prompt: Tidal Forecast Mission

**Companion file:** [Gravity_and_Tides_Project_Brief.md](https://chatgpt.com/library?file_id=libfile_fde3_f-0aa50ba2f4d081919f02f2d3e75d5ae5_621cfe3678bc8191a263936a6c06e83d&account_id=personal)

Read the companion file provided with this prompt for the project setup, authoritative revised learning goals, CTA/Qualtrics findings, and formal assessment reference. This prompt specifies the current LO3 module's design and implementation. Keep the formal assessment questions and answer keys separate from the module's instructional practice.

---

Build a complete, working browser-based learning module called **Tidal Forecast Mission** using **HTML, CSS, and vanilla JavaScript**, with SVG for interactive scientific diagrams.

Act as both a frontend developer and a learning experience designer. Implement the experience, test it, and provide runnable files. Make reasonable implementation decisions without stopping at a proposal.

## 1. Purpose and audience

Create an approximately **8–10-minute module** for novice high-school learners studying gravity and tides.

Learners play the role of a spacecraft's science analyst. Their mission is to investigate what controls tidal bulge height and use evidence to compare fictional planets.

The experience should be:

- Highly interactive and based on learning by doing.
- Primarily visual, with short instructions and explanations.
- Immersive through a coherent mission, responsive visuals, and meaningful decisions.
- Supportive, with explanatory feedback, optional hints, and retries.

The central activity pattern is:

**Predict → Run the model → Compare → Explain → Apply.**

Prior instruction introduces gravitational attraction and differential gravity. Include a brief visual reminder where needed, without reteaching those entire topics.

## 2. Learning goal and scientific model

Target this learning goal:

> Given a simplified tidal-height model and labeled diagrams, learners will identify the relevant quantities, predict how changing them affects tidal bulge height, and explain the roles of differential external gravity and the planet's own gravity.

Use:

**h = k × (Δg / gₚ) × R**

Define:

- **h:** modeled tidal bulge height.
- **Δg:** the difference between external gravitational acceleration at the planet's near and far sides.
- **gₚ:** the planet's own surface gravity.
- **R:** planet radius.
- **k:** a constant held fixed throughout the module.

Learners must practice:

1. Mapping these quantities to visual features.
2. Predicting direction and simple proportional changes.
3. Explaining that differential external gravity drives deformation, while the planet's gravity provides a restoring influence.

Implement calculations through normalized ratios:

**h / h₀ = (Δg / Δg₀) × (gₚ₀ / gₚ) × (R / R₀)**

Use **h₀ = 4 meters** as an illustrative baseline. Clearly identify all scenario values as instructional examples, not measurements of the film's planet.

Scientific requirements:

- Double Δg, with other inputs fixed → double h.
- Double gₚ, with other inputs fixed → halve h.
- Double R, with Δg and gₚ fixed → double h.
- Double both Δg and gₚ, with R fixed → unchanged h.
- Add the same amount to near-side and far-side external acceleration → unchanged Δg and h.
- Treat controls as isolated changes to model inputs. Changing R must not silently recalculate Δg or gₚ.
- External gravitational-acceleration arrows point toward the external attracting body. Any stretching arrows must be labeled as relative to the planet's center.
- Show a simplified static tidal bulge. Disclose that deformation is visually exaggerated.
- Do not portray this model as a simulation of a traveling wall of water, a landing-safety calculation, or a definitive evaluation of the film's realism.

## 3. Video integration

Use this video as the narrative hook:

https://www.youtube.com/watch?v=DB8i1kyXkWc

Embed it using the YouTube IFrame Player API.

Use a brief opening excerpt and, optionally, a short return to the scene during the conclusion. Keep total planned viewing around **30–45 seconds**.

Inspect playback before selecting excerpt boundaries. Do not invent timestamps. Store verified start/end times in an easily editable configuration. If playback cannot be inspected, leave those settings clearly marked for review and make the module usable through manual playback and a Skip button.

Requirements:

- Learners explicitly start playback.
- Pause at configured boundaries and present the next decision beside or below the player.
- Preserve standard video controls and caption access where available.
- Provide a useful visual/text fallback if embedding fails.
- Allow learners to continue without the video.
- Do not download or redistribute the film.

The film establishes the question: **“What controls how much an ocean deforms?”** The interactive model supplies the learning activity.

## 4. Learning sequence

Target approximately nine minutes, leaving flexibility for hints and retries. These are design estimates, not enforced timers.

### A. Mission briefing — 40 seconds

Introduce the learner's role in one short sentence.

Show the opening video excerpt and ask:

**“What might make a tidal bulge larger?”**

Collect an unscored initial prediction. Save it for comparison with the learner's later reasoning.

### B. Learn the console — 45 seconds

Introduce the planet diagram through three short identification tasks:

- Select the visual showing the difference in external gravitational acceleration: Δg.
- Select the inward arrows representing the planet's surface gravity: gₚ.
- Select the center-to-surface measurement: R.

Use click-to-select interactions with keyboard support. If using drag-and-drop, provide an equivalent click interaction.

Keep the equation visible with readable definitions. Briefly highlight the corresponding term when a visual is selected.

### C. Three guided experiments — three minutes

Create one experiment for each variable: Δg, gₚ, and R.

For each experiment:

1. Identify the changed input and visibly lock the others.
2. Ask the learner to predict the resulting height.
3. Let them place a prediction marker on a height gauge, with equivalent buttons or numeric controls.
4. Require a prediction before enabling “Run experiment.”
5. Animate the modeled result.
6. Display prediction and result together.
7. Ask one short explanation question.
8. Provide feedback tied to the learner's response.

Example:

- Baseline height: 4 m.
- Change: double gₚ.
- Hold Δg, R, and k fixed.
- Correct prediction: 2 m.
- Explanation: stronger planetary gravity provides a stronger restoring influence, so the modeled bulge is smaller.

Do not reveal the computed result through the diagram, gauge, or equation substitution before the prediction is submitted.

Reset to a clearly identified baseline between experiments.

### D. The sensor update — one minute

Show near-side, center, and far-side external acceleration readings.

Increase all three readings by the same amount.

Ask:

**“The external pull increased everywhere. Does the modeled bulge height change?”**

The correct answer is unchanged because the near-to-far difference remains unchanged.

Use animated arrows and a difference bracket to make this visible. Explain the distinction between a larger overall pull and a larger difference across the planet.

Keep gₚ and R fixed.

### E. Compare three planets — one minute, 50 seconds

Present three planet cards with the same R and k:

| Planet | Δg relative to baseline | gₚ relative to baseline |
|---|---:|---:|
| A | 2× | 1× |
| B | 2× | 4× |
| C | 0.5× | 0.5× |

Ask learners to predict each planet's height relative to baseline and select the smallest modeled bulge.

Correct results:

- A: 2× baseline height.
- B: 0.5× baseline height.
- C: 1× baseline height.

Require a short reasoning choice that considers both changing quantities.

Hide the results until predictions are submitted. Then reveal a side-by-side visual comparison using a common height scale.

Frame this as choosing the smallest modeled bulge, not selecting a safe landing site.

### F. Crew briefing — one minute, 25 seconds

Give two fresh application challenges with less scaffolding:

- One combined-variable prediction using values different from the preceding comparison.
- One explanation task distinguishing differential external gravity from planetary restoring gravity.

Require a prediction and a reason. Keep the equation available.

Preserve first responses separately from retries and record whether hints were used. Give explanatory feedback after submission.

These are practice and transfer checks within the module; do not label them as the formal research posttest.

### G. Mission debrief — 20 seconds

Return to the opening question and show a compact visual summary:

- Larger Δg → larger bulge.
- Larger gₚ → smaller bulge.
- Larger R → larger bulge when Δg and gₚ are fixed.

End with a brief model-limit statement:

**“This model helps us reason about tidal deformation. It does not reproduce the film's moving wall of water.”**

## 5. Feedback, hints, and gamification

Feedback must explain the relationship, not merely display “Correct” or “Incorrect.”

For example:

**“You predicted a taller bulge. Here, only the planet's surface gravity increased. Its stronger restoring influence makes the modeled bulge smaller.”**

Provide a graduated hint system:

1. Highlight the changed input and fixed inputs.
2. Show a physical cue using the relevant arrows or measurement.
3. Highlight the proportional relationship in the equation.
4. Offer a short worked example, followed by a fresh attempt.

Hints are free and do not remove progress.

After repeated difficulty, allow learners to review a worked solution and continue. Record this as supported completion rather than independent success.

Use:

- Mission checkpoints.
- A small evidence log that fills with discovered relationships.
- Progress based on completed investigations.
- A final crew briefing assembled from the learner's decisions.

Avoid lives, speed bonuses, competitive leaderboards, compulsory countdowns, and unrelated rewards. Mission completion and demonstrated independent understanding must remain distinct.

## 6. Visual and interaction design

Use a restrained spacecraft science-console aesthetic:

- Dark neutral background.
- High-contrast typography.
- Limited accent colors with consistent meanings.
- A large central planet diagram.
- Input controls and the equation near the relevant visual.
- A persistent but unobtrusive hint button.
- One main action per screen.

Keep most prompts to one or two short sentences. Use readable mathematical notation and ordinary scientific terms.

Address known wording and layout issues:

- Use simple task labels and clear progression.
- Avoid complicated multipart numbering.
- Keep diagrams, questions, and answer controls together.
- Explicitly identify what changes and what stays fixed.
- Avoid ambiguous spatial references.
- Make each task understandable without remembering film details.

Provide:

- Semantic HTML and visible keyboard focus.
- Keyboard alternatives for every drag interaction.
- Labels and patterns in addition to color.
- Accessible result announcements.
- Reduced-motion support.
- Responsive layouts for laptops and tablets, with a usable narrow-screen fallback.

Use smooth, brief transitions. Avoid decorative animation that competes with the scientific explanation.

## 7. Technical implementation and learning records

Use HTML, CSS, vanilla JavaScript, and SVG. No framework or build step is required.

Suggested files:

- `index.html`
- `styles.css`
- `app.js`
- `README.md`
- An assets folder if needed.

Keep lesson content, scenario values, and video settings easy to edit. Separate the calculation logic from the interface logic.

Implement explicit interaction states:

**Awaiting prediction → Prediction submitted → Result shown → Explanation submitted → Feedback → Continue.**

Preserve progress when navigating back. A new attempt should reset the appropriate experiment state without overwriting earlier responses.

Provide local progress persistence and an explicit reset option.

For a prototype, record:

- Anonymous session ID.
- Activity ID.
- First prediction and explanation.
- Retry responses.
- Hints viewed and their order.
- Elapsed time.
- Independent versus supported completion.

Provide JSON export of the session record and document its fields.

Clearly state in the README that browser storage does not automatically send data to researchers. Do not invent a backend, claim central data collection, or include third-party analytics.

## 8. Testing and delivery

Test the implemented module, not just the calculation function.

Verify that:

- The proportional results specified above are correct.
- Fixed inputs remain fixed.
- Uniform acceleration increases leave Δg and h unchanged.
- Results cannot be revealed before a prediction.
- Wrong answers receive relevant feedback and working retries.
- Hints work at every intended stage.
- Navigation and reload preserve the correct state.
- Keyboard users can complete the module.
- The experience remains usable if YouTube fails.
- Exported records preserve first attempts separately from retries.
- There are no blocking console errors.

Check representative laptop and narrow-screen layouts.

Provide the runnable project, local preview instructions, a brief implementation summary, and any remaining limitations. Mark unverified video boundaries clearly.

Treat the 8–10-minute duration as a target requiring a learner pilot; do not claim it has been validated through developer testing alone.
