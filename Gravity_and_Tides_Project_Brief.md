# Gravity and Tides: Project Brief for the Building Agent

**Prepared:** 6 November 2026  
**Purpose:** A consolidated content and assessment reference to accompany the separate **Tidal Forecast Mission** HTML/CSS/JavaScript build prompt.  
**Current build:** One interactive learning module targeting **LO3**, designed for approximately **8–10 minutes**.

This brief consolidates the three supplied milestone documents and the latest revised assessment. It contains the project setup, current learning goals, rationale for revisions, scientific conventions, and complete assessment reference. The accompanying prompt specifies the interface, activity sequence, feedback behavior, and technical deliverables.

> **Agent instruction:** Build the LO3 module described in the accompanying prompt. Use this brief to preserve the intended audience, scientific meanings, and goal–assessment alignment. The full assessment bank and answer key are design references; do not display them as module instruction or copy the formal test items into practice.

## 1. Source priority and resolved differences

| Topic | Guidance for this handoff |
|---|---|
| Project setup | Use **Milestones 1.docx** for the target audience, prerequisites, and motivation. |
| Learning goals | **Milestones 2--Learning Goals V2.docx** supersedes the earlier goal statements. The current goals are reproduced in Section 3. |
| Earlier goals document | Retain its gravity-to-tides progression and use of a film as motivation. Do not reinstate its superseded film conclusion or broader build scope. |
| Audience mismatch | Milestone 1 specifies high-school students aged 16–19; the earlier Milestone 2 describes undergraduate freshmen. This handoff uses **Milestone 1's high-school audience**, consistent with the accompanying build prompt. This is an editorial resolution for the prototype, not evidence that recruitment has been finalized. |
| Duration | The older approximately 25-minute estimate concerned the larger unit. The current **LO3 component** targets 8–10 minutes. Assessment time is separate. |
| Latest assessment | Use **Gravity_and_Tides_Pretest_and_Posttest.docx**, prepared 5 November 2026. Its items and scoring are compiled below. |
| Success criterion | The earlier document proposed 75% correct plus a judgment about the film. V2 does not specify a validated mastery threshold. Do not implement the old criterion as a compulsory passing rule. |
| Film interpretation | Do not claim that the real bulge must be 19,000 km or three planetary radii. A result outside a model's assumptions does not establish the actual height. |
| Relationship to the build prompt | This brief supplies content and assessment context; the prompt supplies the current implementation requirements. Report any unresolved contradiction rather than silently changing the goals or science. |

## 2. Project setup

### 2.1 Learners and prior knowledge

The project targets **high-school students, typically aged 16–19**, who are interested in introductory astronomy and astrophysics and have completed or are currently taking **Algebra II and regular physics**.

Learners may recognize gravity, orbits, black holes, and time dilation from science-fiction films or popular media. Familiarity with those terms does not establish formal understanding. Learners may need support interpreting diagrams, connecting variables to physical quantities, and explaining a relationship beyond substituting numbers into a formula.

For the current LO3 module, assume that LO1 and LO2 have been introduced. Provide brief visual reminders of the necessary concepts without turning this component into a complete lesson on all three goals.

### 2.2 Domain, motivation, and scope

The initial project explored introductory astrophysics through science fiction, including gravity and orbits, black holes, event horizons, and time dilation. The revised instructional sequence focuses on:

**Gravitational force and acceleration → differences in acceleration across a planet → modeled tidal bulge height.**

The film establishes a motivating question. Learners then use explicit models, diagrams, and evidence to reason about it.

For this build:

- Teach LO3 directly.
- Use LO1 and LO2 as prerequisite context.
- Do not add separate lessons on black-hole formation, event horizons, orbital mechanics, or relativistic time dilation.
- Keep the film's traveling wall of water distinct from the simplified static tidal bulge represented by the model.

### 2.3 Intended capabilities and dispositions

The broader project supports learners in:

- Interpreting diagrams, simple equations, and simulations.
- Making predictions and explaining them using physical relationships.
- Distinguishing an overall gravitational pull from differences in pull across an object.
- Questioning claims in popular media and recognizing the limits of a scientific model.

Curiosity and evidence-based questioning are design intentions. The present assessment does not independently measure dispositions.

### 2.4 Media and delivery context

**Motivating video:** [Interstellar — Miller's Planet](https://www.youtube.com/watch?v=DB8i1kyXkWc)

The current delivery plan is an interactive HTML/CSS/JavaScript module, with the formal pretest and posttest administered separately, for example through Qualtrics.

The video excerpt boundaries have not been verified in this brief. Inspect playback before choosing timestamps, and retain a usable fallback if the embedded video is unavailable.

### 2.5 Background resources and standards context

The source documents identify Newton's law of gravitation, **NGSS HS-PS2-4**, and **Pennsylvania STEELS physical science** as potential standards connections. Treat these as the project's proposed connections, not a completed standards-alignment audit.

Milestone 1 lists Diane Turnshek, Barry Luokkala, and Matthew Walker as potential consultants. The revised assessment specifically attributes Qualtrics wording and layout feedback to Diane Turnshek. Do not interpret the other names as confirmed reviewers or endorsements.

The original design references include Luokkala's *Exploring Science Through Science Fiction*, Pitt's Physics and Science Fiction course, BU's introductory astronomy course, PhET Gravity and Orbits, and MIT's *A Slower Speed of Light*. These are background inspirations, not required assets or evidence that any particular interaction has been validated for this module.

## 3. Current learning goals

**Authoritative source:** *Milestones 2--Learning Goals V2.docx*.

The equations and variable definitions are provided. The intended performance is interpretation, prediction, proportional reasoning, and explanation—not unaided formula recall or derivation.

### LO1. Gravitational force and acceleration

**Predict how changes in mass and distance affect gravitational force and justify their predictions using Newton's law of gravitation.**

- **LO1.1:** Map information in the wording and diagrams to masses and center-to-center distances, identifying which quantities change and which remain constant.
- **LO1.2:** Use the provided equation to predict the direction and simple proportional size of a change in gravitational force and explain the relationship supporting the prediction.
- **LO1.3:** Apply the shared inverse-square distance relationship when moving from gravitational-force comparisons to gravitational-acceleration comparisons, using the provided equations.

### LO2. Tidal acceleration

**Explain how differences in gravitational acceleration across a planet produce tidal stretching.**

- **LO2.1:** Identify the near side, center, and far side relative to an external body, and use their distances to rank the gravitational accelerations caused by that body.
- **LO2.2:** Compare each side's acceleration with the acceleration at the planet's center and explain how accelerations in the same direction can differ in magnitude and produce relative stretching.
- **LO2.3:** Use the provided tidal-acceleration relationship to predict how changes in external mass, center-to-center distance, or planet radius affect tidal acceleration, holding other specified quantities constant.

### LO3. Tidal bulge height — current module target

**Use a simplified tidal-height model to predict changes in tidal bulge height and explain the physical meaning of those changes.**

- **LO3.1:** Map the scenario to the model's quantities—differential external gravitational acceleration, the planet's surface gravity, and planet radius—and identify changing and fixed inputs.
- **LO3.2:** Predict the direction and simple proportional size of a change in tidal bulge height using the provided model.
- **LO3.3:** Explain the prediction in physical terms, connecting differential external gravity to tidal deformation and the planet's own gravity to resistance to that deformation.

### Optional extension: model validity

If model assumptions are explicitly taught, learners may evaluate whether a numerical result remains within those assumptions. This extension is separate from the three main goals and is assessed separately. It should not displace the core LO3 activities in an 8–10-minute module.

## 4. Evidence behind the revisions

The V2 document identifies three knowledge demands that were missing or insufficiently explicit in the earlier cognitive model:

| Knowledge demand | Why it matters | Consequence for instruction and assessment |
|---|---|---|
| **KC′1: Force-to-acceleration transfer** | Knowing how force changes with distance may not automatically transfer to acceleration in another context. | Ask learners to connect the two inverse-square relationships. A correct answer alone does not demonstrate how the learner obtained it. |
| **KC′2: Spatial terminology** | Learners must locate the near side, center, and far side relative to an external body before comparing accelerations. | Use consistent labels and explicit spatial references. |
| **KC′3: Diagram-to-quantity translation** | Learners must translate positions and distances in a diagram into the quantities used by a relationship. | Make the relevant mapping visible and observable before asking for the physical prediction. |

These are diagnostic interpretations from the CTA, not claims that all learners share the same difficulty.

The latest assessment also summarizes the expert/novice CTA findings and Milestone 3 Qualtrics feedback:

| Observation summarized in the assessment source | Requirement for the build |
|---|---|
| Awkward wording, multipart numbering, and unnecessary narrative obscured the task. | Use short stems, simple numbering, and one clear task at a time. |
| Terms such as “planet stretching” and “liquid accelerating” could be misunderstood. | Use “gravitational acceleration” and “tidal deformation,” with plain-language definitions where needed. |
| Spatial referents and labels caused difficulty. | Keep the external body and planet center visible; identify near/far relative to that body. |
| Instructions about constants and fixed quantities were unclear. | Name G as the gravitational constant. Put “Keep … fixed” beside each comparison. |
| Some correct responses could come from intuition or answer-option cues. | Require a prediction plus a brief explanation; separate numerical success from physical understanding. |
| Learners could manipulate the height formula without clearly explaining its meaning. | Include a uniform-acceleration comparison and a physical explanation of the role of planetary surface gravity. |
| The film question mixed confusing presentation with model validity. | Teach the model's scope explicitly; do not infer the actual height from an out-of-scope calculation. |

**Feedback distinction:** Give immediate explanatory feedback and hints during learning activities. Do not show answer keys or correctness feedback during the formal pretest or posttest.

## 5. Scientific conventions

### 5.1 Equations and definitions

| Relationship | Equation | Definitions and conditions |
|---|---|---|
| Gravitational force | F = GMm/d² | G is the gravitational constant; M and m are the two masses; d is center-to-center distance. |
| External gravitational acceleration | a = GM/d² | M is the attracting body's mass; d is distance from its center to the location under consideration. |
| Near-to-far acceleration difference | Δg ≈ 4GMR/d³ | M is the external body's mass; R is planet radius; d is center-to-center distance. Use when R ≪ d. |
| Simplified tidal bulge height | h = k(Δg/gₚ)R | h is bulge height; Δg is the near-to-far external acceleration difference; gₚ is the planet's own surface gravity; R is planet radius; k is a fixed dimensionless model constant. |

Here **Δg means the full near-to-far difference**. Do not silently substitute a center-to-near definition, which uses a different coefficient in the approximation.

### 5.2 Interpretation requirements

- The external body attracts both sides toward itself. It does not push the far side away.
- The near side accelerates more toward the external body than the center does. The far side accelerates less than the center does.
- Relative to the center, these differences can increase separation on both sides.
- Adding or subtracting the same external acceleration everywhere does not change Δg.
- Differential external gravity drives tidal deformation; planetary surface gravity provides a restoring influence.
- For an isolated height-model experiment that changes R while fixing Δg and gₚ, do not recalculate those fixed inputs. A different scenario may explicitly couple them.
- Exaggerated diagram deformation should be labeled. A visual scale exaggeration does not change the numeric model.
- A calculated h = 3R violates an assumption that h ≪ R. It does not establish an actual bulge three times the radius or, by itself, prove the film wrong.

### 5.3 Check values for the LO3 implementation

These illustrative checks come from the accompanying build prompt, not measurements of Miller's planet.

| Isolated model change | Fixed quantities | Height from a 4 m baseline |
|---|---|---:|
| Δg doubles | gₚ, R, k | 8 m |
| gₚ doubles | Δg, R, k | 2 m |
| R doubles | Δg, gₚ, k | 8 m |
| Δg and gₚ both double | R, k | 4 m |
| Same external acceleration added everywhere | R, gₚ, k; Δg unchanged | 4 m |

## 6. Latest assessment: scope and administration

The following is the **whole-project assessment bank**, covering LO1–LO3. It is included for alignment and future assessment implementation; it is not an instruction to build all of it into the LO3 module.

| Component | Items | Maximum score | Suggested pilot time |
|---|---|---:|---|
| Pretest matched core | 1–6 | 12 | About 6 minutes |
| Posttest matched core | 1–6 | 12 | Within the approximately 10-minute posttest |
| Posttest applications | 7–9 | 8 | Within the approximately 10-minute posttest |
| Optional model validity | One additional item | 2, reported separately | About 2 additional minutes |

These durations are targets, not validated completion times.

**For evaluation of the LO3-only module:** Q5–6 on both forms and posttest Q8 directly target LO3. Posttest Q9 also requires LO2 reasoning. Do not attribute a change in the entire LO1–LO3 score solely to the LO3 component. Any shortened LO3-only test should be identified as a separate selection or adaptation; this compilation does not silently redefine the existing forms.

**Learner directions:** Use the equations and diagrams provided. A brief phrase or calculation is enough for each explanation unless the question explicitly requests a physical explanation. If you do not know an answer, write “not sure.”

**Diagram conversion note:** The Word source contains embedded diagrams. This Markdown replaces them with explicit reconstruction specifications so that the handoff remains self-contained. When implementing the assessment, render the diagrams beside their questions; do not present the specifications as additional answer hints.

## 7. Pretest questions

### Pretest 1 — Two spacecraft

Two spacecraft have the same mass and are near the same planet. Distances are measured from the planet's center.

**Diagram specification:** Show one planet and two spacecraft on the same outward line. Spacecraft A is 10,000 km from the planet's center; spacecraft B is 20,000 km from the center. Draw both distance measurements from the center. Do not show force arrows that reveal the answer.

**Provided equation:** F = GMm/d².

F is gravitational force; G is the gravitational constant; M is planet mass; m is spacecraft mass; d is distance from the planet's center.

**Question:** How does the force on spacecraft B compare with the force on spacecraft A? Give the fraction and explain using what changes and what stays fixed.

**Response:** Fraction and reason.

### Pretest 2 — A moving probe

Probe Orion moves from distance d to distance 3d from the center of the same planet. The probe's mass stays the same.

**Provided equation:** a = GM/d².

a is gravitational acceleration, the change in velocity per second caused by gravity. G is the gravitational constant; M is planet mass; d is distance from the planet's center.

**Question:** What fraction of its original acceleration does the probe experience now? Explain how this distance relationship compares with the relationship for gravitational force.

**Response:** Fraction and reason.

### Pretest 3 — Gravity across a planet

**Diagram specification:** Place a moon to the left of a planet. Across the planet, label A at the left surface, B at the center, and C at the right surface. Identify B as the center. State that only the moon's gravity is being compared at A, B, and C. Do not encode acceleration magnitudes in arrow lengths.

**Provided equation:** a = GM/d², with M now the moon's mass and d the distance from the moon's center.

**Question:** Rank A, B, and C from greatest to least acceleration caused by the moon. Explain using distance.

**Response:** Order and reason.

### Pretest 4 — Comparing accelerations

**Diagram specification:** Repeat the Pretest 3 diagram next to this question.

Consider the moon's gravity at the three marked locations. A student says:

> “All three accelerations point toward the moon, so the moon cannot cause tidal deformation.”

Here, deformation means a change in shape.

**Question:** Explain whether the claim is correct. Compare the near side and the far side with the planet's center. The near side faces the moon; the far side faces away from it.

**Response:** Brief explanation.

### Model provided separately with both Questions 5 and 6

**h = k(Δg/gₚ)R**

h = tidal bulge height; Δg = difference between the moon-caused gravitational accelerations on the near and far sides; gₚ = the planet's own surface gravity; R = planet radius; k = a fixed dimensionless model constant.

### Pretest 5 — A change in the simulation

In a simulation, the same extra acceleration toward the moon is added at every location on the planet. Keep the planet's radius, its own surface gravity, and k fixed.

**Question:** According to the model, what happens to the tidal bulge height? Select one and explain which quantity in the model supports your answer.

**Choices:** Higher / Lower / Stays the same.

**Response:** Choice and reason.

### Pretest 6 — A change in the planet

A model planet has a tidal bulge 6 m high. Its surface gravity gₚ doubles. Keep Δg, R, and k fixed.

**Question:** What is the new height? Explain physically why the height changes.

**Response:** New height and physical explanation.

## 8. Posttest questions

### Posttest 1 — Two spacecraft

Two spacecraft have the same mass and are near the same planet. Distances are measured from the planet's center.

**Diagram specification:** Show one planet and two spacecraft on the same outward line. Spacecraft P is 30,000 km from the planet's center; spacecraft Q is 60,000 km from the center. Draw both distance measurements from the center. Do not show force arrows that reveal the answer.

**Provided equation:** F = GMm/d².

F is gravitational force; G is the gravitational constant; M is planet mass; m is spacecraft mass; d is distance from the planet's center.

**Question:** How does the force on spacecraft Q compare with the force on spacecraft P? Give the fraction and explain using what changes and what stays fixed.

**Response:** Fraction and reason.

### Posttest 2 — A moving probe

Probe Vega moves from distance d to distance 3d from the center of the same planet. The probe's mass stays the same.

**Provided equation:** a = GM/d².

a is gravitational acceleration, the change in velocity per second caused by gravity. G is the gravitational constant; M is planet mass; d is distance from the planet's center.

**Question:** What fraction of its original acceleration does the probe experience now? Explain how this distance relationship compares with the relationship for gravitational force.

**Response:** Fraction and reason.

### Posttest 3 — Gravity across a planet

**Diagram specification:** Place a moon to the right of a planet. Across the planet, label A at the left surface, B at the center, and C at the right surface. Identify B as the center. State that only the moon's gravity is being compared at A, B, and C. Do not encode acceleration magnitudes in arrow lengths.

**Provided equation:** a = GM/d², with M now the moon's mass and d the distance from the moon's center.

**Question:** Rank A, B, and C from greatest to least acceleration caused by the moon. Explain using distance.

**Response:** Order and reason.

### Posttest 4 — Comparing accelerations

**Diagram specification:** Repeat the Posttest 3 diagram next to this question.

Consider the moon's gravity at the three marked locations. A student says:

> “All three accelerations point toward the moon, so the moon cannot cause tidal deformation.”

Here, deformation means a change in shape.

**Question:** Explain whether the claim is correct. Compare the near side and the far side with the planet's center. The near side faces the moon; the far side faces away from it.

**Response:** Brief explanation.

### Model provided separately with both Questions 5 and 6

**h = k(Δg/gₚ)R**

h = tidal bulge height; Δg = difference between the moon-caused gravitational accelerations on the near and far sides; gₚ = the planet's own surface gravity; R = planet radius; k = a fixed dimensionless model constant.

### Posttest 5 — A change in the simulation

In a simulation, the acceleration toward the moon is reduced by the same amount at every location on the planet. All these accelerations still point toward the moon. Keep the planet's radius, its own surface gravity, and k fixed.

**Question:** According to the model, what happens to the tidal bulge height? Select one and explain which quantity in the model supports your answer.

**Choices:** Higher / Lower / Stays the same.

**Response:** Choice and reason.

### Posttest 6 — A change in the planet

A model planet has a tidal bulge 10 m high. Its surface gravity gₚ doubles. Keep Δg, R, and k fixed.

**Question:** What is the new height? Explain physically why the height changes.

**Response:** New height and physical explanation.

### Posttest 7 — Changes in tidal acceleration

**Provided equation:** Δg ≈ 4GMR/d³.

Δg is the near-to-far acceleration difference. G is the gravitational constant; M is the external body's mass; R is planet radius; d is the distance between the two centers. Use this approximation when R is much smaller than d.

**Diagram specification:** Show an external body and a planet; label their center-to-center distance d and the planet's center-to-surface radius R.

**Question:** For each row, write the factor by which Δg changes. For example, ×3 means three times its original value. Treat each row as a separate comparison.

| Change | Keep fixed | Learner response |
|---|---|---|
| External mass M doubles | G, R, and d | Factor for Δg |
| Planet radius R doubles | G, M, and d | Factor for Δg |
| Center distance d doubles | G, M, and R | Factor for Δg |

### Posttest 8 — Radius in the height model

**Provided equation:** h = k(Δg/gₚ)R, with the definitions from Questions 5 and 6 repeated.

Double R. Keep Δg, gₚ, and k fixed.

**Question:** What factor change in h does the model predict? Explain why the change in R does not also change Δg in this question.

**Response:** Factor and reason.

### Posttest 9 — A planet near a star

An ocean-covered planet moves closer to the same star. Its radius and surface gravity stay fixed, and the simplified models remain applicable.

**Provide both equations and their definitions beside the question:**

- Δg ≈ 4GMR/d³.
- h = k(Δg/gₚ)R.

**Question:** Using the two equations, explain what happens to the star's acceleration difference across the planet and to the planet's tidal bulge height. Connect the changes in one or two sentences.

**Response:** Linked explanation.

### Optional model-validity question

Administer only if model assumptions were taught. Allow approximately two additional minutes after Question 9, and report the result separately.

A student uses a simplified tidal-height model to evaluate an ocean planet in a film. The model assumes h is much smaller than R, written h ≪ R. The calculation produces h = 3R. The student concludes:

> “This proves the real tidal bulge is three times the planet's radius.”

**Question:** Does this model support the student's conclusion? Explain using the assumption and the calculated result.

**Response:** Brief explanation.

## 9. Answer key and scoring — instructor/agent reference only

### 9.1 Matched core: 12 points on each form

Award the two points independently for each item. Accept equivalent language, diagrams, and calculations.

| Item | Expected answer | Scoring |
|---|---|---|
| 1 | Pre: F_B = F_A/4. Post: F_Q = F_P/4. | 1 point for the correct fraction; 1 for identifying doubled distance and fixed masses, using 1/2². |
| 2 | New acceleration = original acceleration/9 on both forms. | 1 point for the fraction; 1 for explaining that force and acceleration share the inverse-square distance relationship under the stated fixed-mass conditions. |
| 3 | Pre: A > B > C. Post: C > B > A. | 1 point for the complete ranking; 1 for explaining that positions closer to the moon have greater moon-caused acceleration. |
| 4 | The claim is incorrect: a common direction does not imply equal magnitudes. | 1 point for explaining the near side's greater acceleration relative to the center; 1 for explaining the far side's smaller acceleration relative to the center and consequent lag. Both increase separation relative to the center. |
| 5 | Height stays the same on both forms. | 1 point for unchanged height; 1 for explaining that a uniform addition or subtraction leaves Δg unchanged. |
| 6 | Pre: 3 m. Post: 5 m. | 1 point for the height; 1 for explaining that stronger planetary surface gravity resists deformation more strongly while Δg stays fixed. |

**Scoring distinctions:**

- For Q4, “false” alone earns no points. Do not accept “the moon pushes the far side away.”
- For Q6, “gₚ is in the denominator” supports the calculation but does not earn the physical-explanation point. Accept stronger restoring gravity or stronger attraction of displaced water toward the planet.
- Record blank responses and “not sure” separately for diagnosis; both receive zero performance points.
- Do not deduct for spelling, grammar, or equivalent notation.

### 9.2 Posttest applications: 8 points

| Item | Expected answer | Scoring |
|---|---|---|
| 7 | M doubles: ×2. R doubles: ×2. d doubles: ×1/8. | 3 points: one per correct factor. |
| 8 | h doubles. Δg is explicitly fixed in this isolated comparison. | 2 points: one for ×2; one for respecting the stated fixed inputs rather than automatically changing Δg. |
| 9 | Moving closer increases Δg; with gₚ, R, and k fixed, h increases. | 3 points: one for increased Δg; one for increased h; one for a linked physical explanation involving greater differential external gravity and unchanged planetary restoring gravity. |

**Sample full-credit Q9 response:** “Moving closer increases the difference between the star's pull on the near and far sides. This produces greater tidal deformation, so the model predicts a larger bulge while the planet's own gravity stays the same.”

### 9.3 Optional model validity: 2 points

- **1 point:** h = 3R violates h ≪ R.
- **1 point:** The model cannot justify that numerical prediction outside its assumptions.

The result does not establish the actual height or, by itself, prove the film wrong.

### 9.4 Reporting limits

- Compare pretest Q1–6 with posttest Q1–6, both out of 12.
- Report posttest Q7–9 separately, out of 8.
- Report the optional item separately, out of 2.
- Core change = posttest core − pretest core.
- Do not compare a 12-point pretest total directly with a 20-point posttest total.
- The forms were designed to be comparable but have not been empirically equated.
- The core force item samples a distance change, not independent mastery of mass effects.
- LO2.3 is assessed only in the posttest applications.
- A correct numerical answer does not automatically establish physical understanding.
- Completion or success after hints should not be reported as independent mastery.

## 10. Goal–assessment alignment

| Goal | Pretest | Posttest | Observable evidence |
|---|---|---|---|
| LO1.1 | 1 | 1 | Maps diagram distances to d and identifies fixed masses. |
| LO1.2 | 1 | 1 | Predicts the factor and explains inverse-square reasoning. |
| LO1.3 | 2 | 2 | Applies the acceleration relationship and explains shared distance dependence. |
| LO2.1 | 3 | 3 | Uses positions and distances to rank external accelerations. |
| LO2.2 | 4 | 4 | Explains near- and far-side differences relative to the center. |
| LO2.3 | — | 7, 9 | Predicts tidal-acceleration changes and applies them in a new context. |
| LO3.1 | 5, 6 | 5, 6, 8 | Distinguishes Δg from gₚ and respects changing/fixed inputs. |
| LO3.2 | 5, 6 | 5, 6, 8, 9 | Predicts unchanged height or the appropriate direction/factor. |
| LO3.3 | 6 | 6, 9 | Explains differential external gravity and planetary restoring gravity. |
| Optional model validity | — | Optional item | Compares a prediction against an explicit model assumption. |

## 11. Assessment presentation and pilot requirements

These requirements preserve the revised assessment's response to Milestone 3 feedback:

- Put each numbered item on its own page or screen.
- Keep its stem, equation, diagram, and response fields together.
- Repeat the spatial diagram for Q4 and the height model for Q5 and Q6.
- Use one short response field for a prediction and one for its reason where appropriate.
- For Q5, use a vertical single-choice list plus a reason field.
- For Q7, use three clearly labeled numeric fields or stacked comparisons on narrow screens.
- Use black text, white backgrounds, and scalable equations and diagrams for formal tests.
- Keep item order and available supports consistent across participants.
- Allow review of earlier test pages; do not reveal worked answers during testing.
- Treat “not sure” as a response status, not a distractor implying missing information.
- Use a soft reminder for missing responses rather than forcing guesses.
- Pilot completion time, interpretation of Q5, diagram legibility, and scoring agreement.

The learning module may use the visual style in the build prompt and provide immediate hints and feedback. These test-presentation requirements do not require the instructional interface to resemble a survey.

## 12. What this handoff changes and preserves

**Preserved:** Milestone 1's learner setup and motivation; all current V2 goals and subgoals; the revised assessment's question content, matched-core structure, application items, answer key, and scoring distinctions.

**Consolidated:** Repeated setup statements, equation definitions, CTA implications, and assessment implementation guidance.

**Clarified:** Audience priority, whole-project versus LO3-only scope, model conventions, separate learning/assessment timing, and formal-test versus instructional feedback.

**Removed from active requirements:** Assignment boilerplate, empty links and formula placeholders, obsolete broad-topic requirements, the earlier claim about actual film-wave height, and the old unvalidated passing criterion.

**Converted:** Embedded assessment figures into precise diagram specifications, and paper instructions such as “circle one” into format-neutral response instructions. These are presentation changes, not new test constructs.

## 13. Source register

This brief was compiled from the following supplied project files:

1. **Milestones 1.docx** — four pages; audience, prerequisites, project rationale, resources, and proposed standards connections.
2. **Milestones 2--Learning Goals.docx** — three pages; original progression, initial ABCD statement, earlier goals, and assessment plans. Superseded content is identified above.
3. **Milestones 2--Learning Goals V2.docx** — two pages; CTA-derived knowledge demands, assessment revision rationale, and authoritative revised goals.
4. **Gravity_and_Tides_Pretest_and_Posttest.docx** — nine pages; latest assessment, diagrams, keys, scoring, goal alignment, and Qualtrics guidance.

The assessment source attributes its revision rationale to **Milestones.docx**, Milestone 3: Qualtrics review and annotations (pp. 54–60), theoretical CTA (pp. 61–71), and expert/novice CTA analyses (pp. 74–85), using that document's 100-page rendering. This brief carries forward that attribution; it is not a substitute for the full CTA transcripts.

The separate **Tidal Forecast Mission build prompt** supplies the 8–10-minute activity design and implementation details. Deliver that prompt together with this file.
