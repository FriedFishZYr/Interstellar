/*
 * Tidal Forecast Mission — editable lesson content, scenario values and video settings.
 *
 * Everything a designer is likely to tweak lives here: wording, scenario numbers,
 * hint text, explanation choices and the YouTube excerpt boundaries.
 * Strings may contain simple HTML (e.g. g<sub>p</sub>); they are authored content,
 * never learner input.
 *
 * All scenario values are INSTRUCTIONAL EXAMPLES, not measurements of the film's planet.
 */
(function () {
  'use strict';
  var M = window.TFMModel;
  var f = M.fmt;

  var S = {
    dg: 'Δg',
    gp: 'g<sub>p</sub>',
    R: 'R',
    k: 'k',
    h: 'h'
  };

  var BASE = 4; // illustrative baseline bulge height, metres

  function times(x) { return '×' + f(x); }

  // "doubles", "triples", "is multiplied by 1.5" …
  function changeWord(x) {
    if (x === 2) return 'doubles';
    if (x === 3) return 'triples';
    if (x === 4) return 'quadruples';
    if (x === 0.5) return 'halves';
    return 'is multiplied by ' + f(x);
  }

  window.TFM_CONTENT = {
    moduleId: 'tidal-forecast-mission',
    moduleVersion: '2.0.0',
    recordSchema: 'tidal-forecast-mission/session-record@1',
    // v2: the Quick checks step was added, so step positions saved by v1 no longer line up.
    storageKey: 'tfm.session.v3',

    /* ------------------------- A/B test (Milestone 5) ------------------------- */
    // Two versions of the module, chosen by the link: no parameter (or ?v=b) is version B,
    // ?v=a is version A. B has predict–observe–explain (POE); A has observe–explain only.
    // POE is applied in two places, and A removes the prediction from both:
    //   Briefing:    B logs a first idea, and the debrief returns to it.
    //                A shows the mission question without asking for an answer.
    //   Experiments: B requires a predicted height before every run.
    //                A runs the model and sees the result.
    // Every other step, the explanation questions and their feedback are the same.
    // Each version saves its progress under its own key (version A adds ".a" to storageKey),
    // and the session export carries a `condition` field.
    abTest: {
      param: 'v',
      fallback: 'b',
      conditions: {
        a: { label: 'A · observe–explain: no first idea, no prediction in Experiments', predicts: false },
        b: { label: 'B · predict–observe–explain: first idea, prediction before result', predicts: true }
      },
      // Wording used only in version A.
      noPrediction: {
        // Briefing and debrief (no first idea)
        briefingLabel: 'Mission briefing — scene and mission question',
        briefPrompt: 'Then see the question for this mission.',
        briefNext: 'See the mission question',
        questionNote: 'You’ll investigate this question with the model.',
        loopFirst: 'Watch',
        reflection: 'Your evidence log answers it: ' + S.dg + ' drives the deformation, ' + S.gp + ' resists it, and R scales it when the others are fixed.',
        // Experiments (no prediction before the run)
        introJob: 'Run the model, then explain the change.',
        heading: 'Run the experiment.',
        runHelper: 'Run it to see the model’s result.',
        retryLabel: 'Try a fresh experiment'
      }
    },
    symbols: S,
    baselineHeight: BASE,
    gauge: { min: 0, max: 10, step: 0.5 },

    /* ------------------------------------------------------------------ *
     * VIDEO — YouTube IFrame Player API. Times are in seconds.
     * The film is never downloaded or redistributed; it is embedded from YouTube.
     * ------------------------------------------------------------------ */
    video: {
      videoId: 'DB8i1kyXkWc',
      watchUrl: 'https://www.youtube.com/watch?v=DB8i1kyXkWc',
      title: 'Interstellar — Miller’s planet',
      loadTimeoutMs: 10000,
      opening: {
        start: 120, // 2:00
        end: 160,   // 2:40
        // 'verified' = boundaries were checked by watching playback.
        // Set to 'to-verify' if you change start/end without re-checking.
        status: 'verified',
        verifiedBy: 'project author, by inspecting playback (6 Nov 2026)',
        description: 'The crew sees the wave — what looked like distant mountains is a wall of water.'
      },
      // The film's ending plays by default after the crew briefing, before the debrief.
      // The video is 259 s long (YouTube metadata, 6 Nov 2026), so 3:35 to the end is about 44 s.
      ending: {
        start: 215, // 3:35
        end: 259,   // 4:19, end of the video
        // Not yet checked by watching playback. Set to 'verified' once you have checked
        // where the scene starts and that nothing after it (credits, end screen) is included.
        status: 'to-verify',
        verifiedBy: null,
        description: 'The wave reaches the landing site and the crew races to escape.'
      }
    },

    // New design (Figma "New" section): seven phases.
    steps: [
      { id: 'briefing', label: 'Incoming Transmission', activities: ['briefing'] },
      { id: 'preflight', label: 'Pre-flight Check', activities: ['tide-rank', 'console-dg', 'console-gp', 'console-R'] },
      { id: 'lab', label: 'Tide Lab', activities: ['exp-dg', 'exp-gp', 'exp-R', 'lab-results'] },
      { id: 'decode', label: 'Decode the Model', activities: ['decode-summary', 'decode-model'] },
      { id: 'quick', label: 'Quick Checks', activities: ['qc-1', 'qc-2', 'qc-3', 'qc-4'] },
      { id: 'landing', label: 'Landing Call', activities: ['miller-bg', 'miller-forecast', 'landing-call'] },
      { id: 'return', label: 'Return to Endurance', activities: ['end-reflect', 'mission-summary'] }
    ],

    /* ------------------------- Landing-stakes thread ------------------------- *
     * A short message from the crew for each step, tying it to the landing on Miller's planet.
     * Roles are generic (not the film's characters). Keep each to ~20 words.
     * Steps listed in stepIntros show their message on an intro page before the first task;
     * the others (briefing, debrief) show it at the top of the task panel. */
    crewLines: {
      preflight: { who: 'Mission control', text: 'Analyst? You look like you’ve seen a ghost. The lander leaves soon.' },
      lab: { who: 'Mission control', text: 'Analyst, pre-flight check complete. But the lander is already fuelling up, and the crew won’t turn back on a hunch. Get into the Tide Lab and find out how each of the three variables changes the bulge. That’s the evidence that will convince them.' }
    },

    // Starting page shown once before a phase's first task.
    stepIntros: {
      preflight: {
        title: 'Pre-flight Check',
        situation: 'You’re back before the landing, and this time the crew is still on board. A bad feeling won’t stop them. You need hard evidence.',
        job: 'find out what decides how big a tidal bulge gets. First a quick refresher on tides, then the three key variables, one at a time.',
        note: '*Next: press Start to begin the pre-flight check.'
      },
      lab: {
        title: 'Tide Lab',
        situation: 'You now know the three key variables behind the height of a tidal bulge: ' + S.dg + ', ' + S.gp + ' and R.',
        job: 'test how changing each one changes the bulge height. Your results are the evidence you need about Miller’s planet to save your crew.'
      },
      decode: {
        title: 'Decode the Model',
        situation: 'Your results table is solid, but the crew can’t carry three separate findings to Miller’s planet. They need one rule that works for any planet.',
        job: 'sum up what each test showed, then turn it into a model that predicts the bulge height.',
        start: 'Start decoding'
      },
      quick: {
        title: 'Quick Checks',
        situation: 'Your model works on the results you collected. Before the lander leaves for Miller’s planet, the crew wants proof that it also works on worlds you haven’t tested.',
        job: 'complete these quick checks to get comfortable using the model you just built.',
        start: 'Start checks'
      },
      landing: {
        title: 'Landing Call: Miller’s Planet',
        situation: 'Your model passed every quick check. Now it counts: the lander is about to leave for Miller’s planet, which orbits close to the black hole Gargantua. The crew will plan the landing around your forecast.',
        job: 'forecast the bulge height on Miller’s planet, then tell the crew whether a bulge that high makes landing too dangerous.',
        start: 'Start forecast'
      },
      'return': {
        title: 'Return to Endurance',
        situation: 'Congratulations! You made the right call. Your forecast kept the crew away from a planet with a 1,200 m tidal bulge, and changed the sad fate that was waiting for them. Cooper: “We owe you one. Without your forecast, we’d have been in real trouble down there.”',
        job: 'watch what happened in the film when the crew did land, then look back at what you learned on this mission.'
      }
    },
    stepIntroNext: 'View your task',
    stepIntroStart: 'Start',

    // After the crew forecast: the learner turns the forecast into a call to the crew (unscored),
    // on its own page.
    landingCall: {
      eyebrow: 'Crew briefing · your call',
      ask: 'We’re on the surface. Based on your forecast, how long can we stay?',
      toCall: 'Make the landing call',
      back: 'Back to the forecast',
      next: 'Continue: back to the film',
      legend: 'Your call to the crew',
      context: function (h) {
        return 'Your model gives ' + f(h) + ' m: ' + f(Math.round(h / BASE * 100) / 100) + '× the reference world’s ' + BASE + ' m bulge.';
      },
      options: [
        { value: 'stay', label: 'Stay as long as the search needs' },
        { value: 'short', label: 'Keep the stay short and be ready to lift off' }
      ],
      who: 'Pilot',
      reply: function (choice, h) {
        var x = f(Math.round(h / BASE * 100) / 100);
        if (choice === 'short') return 'Copy: short stay, engines warm. Your forecast says these tides are ' + x + '× the reference world’s.';
        if (h > BASE) return 'Copy… but your forecast says these tides are ' + x + '× the reference world’s. Want to change your call?';
        return 'Copy. Your forecast says these tides are no stronger than the reference world’s.';
      },
      helper: 'Make your call to continue.',
      // The film-ending lead-in picks up the learner's call.
      endingHeading: {
        short: 'You told the crew to keep it short. Watch what they find.',
        stay: 'You told the crew they could stay. Watch what they find.'
      }
    },

    /* ------------------------- Start and finish screens ------------------------- */
    intro: {
      eyebrow: 'Gravity and tides · interactive module',
      title: 'Tidal Forecast Mission',
      // One entry per paragraph.
      lede: [
        'In Interstellar, Cooper’s crew lands on Miller’s planet and is hit by a wall of water. Doyle is killed, ' +
        'and the delay costs the team 23 years back home. Now you get a second chance. You’re the Endurance’s ' +
        'science analyst, and the lander hasn’t left yet. <b>Before anyone goes down to the surface, you need hard ' +
        'evidence of the danger, strong enough to convince the crew to turn back.</b>',
        'To build that case, you’ll learn the physics behind tidal bulges in this module.'
      ],
      goalLabel: 'By the end you’ll be able to',
      goal: 'predict and explain how a tidal bulge’s height changes with the difference in an outside body’s pull (' +
        S.dg + '), the planet’s own gravity (' + S.gp + ') and the planet’s radius (' + S.R + '), ' +
        'and use that evidence to keep the whole crew safe.',
      facts: ['About 10 minutes', 'Two short film clips, so turn sound on'],
      loopLabel: 'Your mission, phase by phase',
      loop: ['Incoming Transmission', 'Pre-flight Check', 'Tide Lab', 'Decode the Model', 'Quick Checks', 'Landing Call', 'Return to Endurance'],
      start: 'Start mission',
      note: 'Progress is saved in this browser, so you can come back and pick up where you left off.'
    },

    complete: {
      title: 'Mission complete!',
      lede: 'You started with a guess and finished with a model you built from your own evidence. You used it to read a planet you’d never seen, and you kept your crew safe. That’s how real scientists think.',
      chips: ['3 tests run', '1 model built', '4 quick checks', '1 crew saved'],
      restart: 'Back to start',
      review: 'Review the summary'
    },

    activityTypes: {
      'briefing': 'briefing',
      'tide-rank': 'rank',
      'console-dg': 'console', 'console-gp': 'console', 'console-R': 'console',
      'exp-dg': 'experiment', 'exp-gp': 'experiment', 'exp-R': 'experiment',
      'lab-results': 'labResults',
      'decode-summary': 'decodeFill',
      'decode-model': 'decodeModel',
      'qc-1': 'calc', 'qc-2': 'mixed', 'qc-3': 'mixed', 'qc-4': 'calc',
      'miller-bg': 'millerBg',
      'miller-forecast': 'calc',
      'landing-call': 'landing',
      'end-reflect': 'endReflect',
      'mission-summary': 'missionSummary'
    },

    activityLabels: {
      'briefing': 'Incoming transmission — first idea (unscored)',
      'tide-rank': 'Pre-flight check — rank the Moon’s pull (unscored)',
      'console-dg': 'Pre-flight check — find Δg',
      'console-gp': 'Pre-flight check — find gₚ',
      'console-R': 'Pre-flight check — find R',
      'exp-dg': 'Tide Lab test 1 — change Δg',
      'exp-gp': 'Tide Lab test 2 — change gₚ',
      'exp-R': 'Tide Lab test 3 — change R',
      'lab-results': 'Tide Lab — results table (unscored)',
      'decode-summary': 'Decode the model — summarise each test',
      'decode-model': 'Decode the model — the model (unscored)',
      'qc-1': 'Quick check 1 — find h from numbers',
      'qc-2': 'Quick check 2 — ratio change (gₚ changes)',
      'qc-3': 'Quick check 3 — the trap (uniform change: nothing changes)',
      'qc-4': 'Quick check 4 — work back to R',
      'miller-bg': 'Landing call — background (unscored)',
      'miller-forecast': 'Landing call — forecast Miller’s planet',
      'landing-call': 'Landing call — is it safe to land?',
      'end-reflect': 'Return to Endurance — film ending and reflection (unscored)',
      'mission-summary': 'Return to Endurance — mission summary (unscored)'
    },

    // Activities that count toward "independent" vs "supported" completion.
    scoredActivities: ['console-dg', 'console-gp', 'console-R', 'exp-dg', 'exp-gp', 'exp-R',
      'decode-summary', 'qc-1', 'qc-2', 'qc-3', 'qc-4', 'miller-forecast', 'landing-call'],
    unscoredActivities: ['briefing', 'tide-rank', 'lab-results', 'decode-model', 'miller-bg', 'end-reflect', 'mission-summary'],

    // Hint nudge: after this many seconds on a task without submitting or opening a hint, the
    // hint button glows and its label changes. Set afterSec to 0 to turn it off.
    // (?nudge=5 in the URL overrides the time for user testing.)
    hintNudge: { afterSec: 45, label: 'Need a hint?' },

    // Offer a worked solution after this many unsuccessful attempts.
    workedSolutionAfter: 2,

    evidence: [
      { id: 'ev-dg', html: 'Larger ' + S.dg + ' → larger bulge' },
      { id: 'ev-gp', html: 'Larger ' + S.gp + ' → smaller bulge' },
      { id: 'ev-R', html: 'Larger R → larger bulge (' + S.dg + ', ' + S.gp + ' fixed)' },
      { id: 'ev-ratio', html: 'Compare ' + S.dg + ' ÷ ' + S.gp + ' — both matter' }
    ],

    inputs: {
      dg: { sym: S.dg, label: 'external difference', short: 'external diff.' },
      gp: { sym: S.gp, label: 'surface gravity', short: 'surface gravity' },
      R: { sym: S.R, label: 'radius', short: 'radius' },
      k: { sym: S.k, label: 'constant', short: 'constant' }
    },

    definitions: [
      { key: 'h', sym: S.h, text: 'modelled tidal bulge height' },
      { key: 'dg', sym: S.dg, text: 'difference in external gravitational acceleration between the near and far sides' },
      { key: 'gp', sym: S.gp, text: 'the planet’s own surface gravity' },
      { key: 'R', sym: S.R, text: 'planet radius (centre to surface)' },
      { key: 'k', sym: S.k, text: 'fixed model constant' }
    ],

    /* ------------------------------ A. Briefing ------------------------------ */
    briefing: {
      eyebrow: 'Incoming Transmission',
      heading: 'Analyst, you’ve seen how this ends.',
      headingFallback: 'Analyst, you’ve seen how this ends.',
      prompt: 'Last time, the crew landed on Miller’s planet, the “mountains” turned out to be a wall of water, and Doyle never made it back. Replay that memory on the left and look for what went wrong.',
      next: 'Log your first guess',
      nextHelper: 'Watch the memory, skip it, or read the summary to continue.',
      question: 'When the memory ends, log your first guess: What might make a tidal bulge larger?',
      ideaLabel: 'Your first guess · not scored',
      ideaPlaceholder: 'Type your idea here. There’s no wrong answer yet.',
      loggedNote: 'Next: press Continue to start investigating. The crew is counting on you.',
      sceneSummary: 'A crew lands in shallow water on an ocean planet orbiting close to a massive black hole. What looks like a distant mountain range turns out to be an enormous wave.',
      sceneBridge: 'The film shows a moving wall of water. Our model asks something simpler: what controls how much an ocean deforms?'
    },

    /* ------------------------------ B. Console ------------------------------ */
    targets: {
      body: {
        name: 'External body',
        aria: 'External body — the massive object that attracts every part of the planet',
        info: 'That’s the external body. Its pull acts on the whole planet; the model uses only how that pull differs from side to side (' + S.dg + ').'
      },
      dg: {
        name: 'Δg panel',
        aria: 'External acceleration panel — near, centre and far readings with the Δg bracket',
        ariaFind: 'External acceleration panel — near, centre and far readings with a dashed bracket',
        info: 'That’s the ' + S.dg + ' panel: the near-to-far difference in the external body’s pull.'
      },
      gp: {
        name: 'gₚ arrows',
        aria: 'Cyan arrows pointing inward to the planet’s centre — the planet’s own surface gravity',
        ariaFind: 'Cyan arrows pointing inward to the planet’s centre',
        info: 'Those are the ' + S.gp + ' arrows: the planet’s own gravity, pulling toward its centre.'
      },
      R: {
        name: 'R line',
        aria: 'Dotted line from the planet’s centre to its surface — the planet radius',
        ariaFind: 'Dotted line from the planet’s centre to its surface',
        info: 'That’s R, the planet’s radius. The dotted line measures from the centre to the surface.'
      },
      h: {
        name: 'Ocean bulge',
        aria: 'Ocean layer with its tidal bulge — the modelled bulge height',
        info: 'That’s the ocean bulge, ' + S.h + ' — the model’s output, not one of its inputs.'
      }
    },

    // Each task's heading is the action only; the definition lives in the formula bar above the
    // diagram, which highlights the target term. notYet is the extra cue in the "Not this one" feedback.
    // While a learner is searching, the diagram hides the symbol labels of inputs not yet found
    // (ariaFind is the matching screen-reader name); a label appears once its input is found.
    consoleTasks: {
      'console-dg': {
        n: 1, target: 'dg',
        heading: 'Find ' + S.dg + ' on the diagram.',
        notYet: 'Look for the visual that compares the external pull at the near side and the far side.',
        success: 'That’s ' + S.dg + '. The dashed bracket marks the near-to-far difference in the external body’s pull.',
        next: 'Next: find ' + S.gp,
        hints: [
          { title: 'Think “difference”', html: S.dg + ' is a difference between two pulls. Look for something that compares the near side and the far side.', cue: { diagram: 'body' } },
          { title: 'Look for amber', html: 'Check the amber External acceleration panel.', cue: { diagram: 'dgarrows' } },
          { title: 'Find the bracket', html: 'Click the dashed bracket between the Near and Far arrows.', cue: { diagram: 'dg' } }
        ]
      },
      'console-gp': {
        n: 2, target: 'gp',
        heading: 'Find ' + S.gp + ' on the diagram.',
        notYet: S.gp + ' belongs to the planet itself, not to the external body.',
        success: 'The cyan arrows are ' + S.gp + '. They point inward because the planet pulls its own ocean toward its centre.',
        next: 'Next: find R',
        hints: [
          { title: 'Whose gravity?', html: S.gp + ' is the planet’s own pull. Which way does it point?', cue: null },
          { title: 'Which way does it point?', html: 'Look for arrows pointing toward the planet’s centre.', cue: { diagram: 'gp' } },
          { title: 'The cyan arrows', html: 'Click the cyan arrows around the planet.', cue: { diagram: 'gp' } }
        ]
      },
      'console-R': {
        n: 3, target: 'R',
        heading: 'Find R on the diagram.',
        notYet: 'R runs from the planet’s centre to its surface.',
        success: 'The dotted violet line from the centre to the surface is R.',
        next: 'Continue', nextNote: 'Click Continue to test how each of the three variables changes the height of the tidal bulge.',
        hints: [
          { title: 'Part of the planet', html: 'R is a length that belongs to the planet itself.', cue: null },
          { title: 'Centre to surface', html: 'It runs from the planet’s centre to its surface.', cue: { diagram: 'R' } },
          { title: 'The violet line', html: 'Click the dotted violet line from the centre.', cue: { diagram: 'R' } }
        ]
      }
    },

    /* ------------------------------ C. Experiments ------------------------------ */
    experiments: {
      'exp-dg': {
        n: 1, key: 'dg', topic: 'External difference', title: 'Test 1 · External difference (' + S.dg + ')', evidence: 'ev-dg',
        variants: [2, 1.5, 2.5],
        question: function (x) { return x === 2 ? 'What if the Moon were twice as heavy?' : 'What if the Moon were ' + f(x) + ' times as heavy?'; },
        prompt: function (x) { return 'The bulge is 4 m right now. Now imagine the Moon had ' + (x === 2 ? 'twice its' : f(x) + ' times its') + ' mass, at the same distance. Its pull on every point grows by the same factor, so the near–far difference ' + S.dg + ' ' + changeWord(x) + ' too. ' + S.gp + ' and R stay fixed.'; },
        relation: function (x, h) { return 'A bigger difference in pull stretches the ocean more. ' + S.dg + ' ' + changeWord(x) + ', so the bulge does too: 4 m ' + times(x) + ' = ' + f(h) + ' m.'; },
        extra: 'A closer Moon works the same way. Its pull grows more on the near side than on the far side, so ' + S.dg + ' grows and the bulge rises.',
        choices: [
          { id: 'stretch', correct: true, text: 'A bigger difference in the Moon’s pull across the planet stretches the ocean more.' },
          { id: 'push', text: 'The Moon pushes the far side away more strongly.',
            feedback: 'The Moon only pulls. It never pushes. The far side bulges because it is pulled less than the centre, so it lags behind.' },
          { id: 'weaker', text: 'The planet’s own gravity got weaker, so it holds less water.',
            feedback: S.gp + ' was fixed in this test. Only ' + S.dg + ' changed.' },
          { id: 'notsure', notSure: true, text: 'Not sure' }
        ],
        notSureFeedback: 'Look at the amber panel: the gap between the near and far pulls grew. That bigger gap is what stretches the ocean.',
        hints: function (x, phase) {
          if (phase === 'explain' || phase === 'feedback') return [
            { title: 'What happened?', html: 'In this test, what changed and what did the bulge do?', cue: { inputs: true } },
            { title: 'Pull, not push', html: 'The Moon only pulls. It never pushes.', cue: { diagram: 'dg' } },
            { title: 'Pick the difference', html: 'Pick the answer about the difference in pull across the planet.', cue: null }
          ];
          return [
            { title: 'What changed?', html: 'Only ' + S.dg + ' changed. It ' + changeWord(x) + '. ' + S.gp + ' and R are fixed.', cue: { inputs: true } },
            { title: 'Look at the amber panel', html: 'A bigger gap between the near and far pulls stretches the ocean more.', cue: { diagram: 'dg' } },
            { title: 'Think it through', html: 'If the stretch grows ' + times(x) + ' and nothing holds the ocean back harder, what happens to 4 m?', cue: null }
          ];
        },
        worked: function (x, h) {
          return [
            'Only ' + S.dg + ' changes: it ' + changeWord(x) + '. ' + S.gp + ', R and k are locked.',
            S.dg + ' is on top of the fraction, so ' + S.h + ' is multiplied by ' + f(x) + '.',
            '4 m × ' + f(x) + ' = ' + f(h) + ' m.',
            'Physically: a bigger near-to-far difference in the external pull stretches the ocean more.'
          ];
        }
      },
      'exp-gp': {
        n: 2, key: 'gp', topic: 'Surface gravity', title: 'Test 2 · Surface gravity (' + S.gp + ')', evidence: 'ev-gp',
        variants: [2, 4, 8],
        question: function (x) { return 'What happens if the planet’s own gravity ' + changeWord(x) + '?'; },
        prompt: function (x) { return 'Back to a 4 m bulge. This time only ' + S.gp + ' changes: it ' + changeWord(x) + '. ' + S.dg + ' and R stay fixed.'; },
        relation: function (x, h) { return 'A stronger pull from the planet holds its ocean closer. ' + S.gp + ' ' + changeWord(x) + ', so the bulge is divided by ' + f(x) + ': 4 m ÷ ' + f(x) + ' = ' + f(h) + ' m.'; },
        choices: [
          { id: 'restore', correct: true, text: 'The planet pulls its ocean back toward its centre more strongly, so the bulge is smaller.' },
          { id: 'external', text: 'The Moon pulls harder on the whole planet.',
            feedback: S.dg + ' was fixed in this test. Only the planet’s own gravity changed.' },
          { id: 'lift', text: 'Stronger planet gravity lifts the ocean into a bigger bulge.',
            feedback: 'The planet’s gravity points inward. It holds the ocean down, so a stronger ' + S.gp + ' means a smaller bulge.' },
          { id: 'notsure', notSure: true, text: 'Not sure' }
        ],
        notSureFeedback: 'Look at the cyan arrows: they point inward. A stronger inward pull resists the stretching.',
        hints: function (x, phase) {
          if (phase === 'explain' || phase === 'feedback') return [
            { title: 'What was fixed?', html: 'Was ' + S.dg + ' changed in this test?', cue: { inputs: true } },
            { title: 'Which way does it pull?', html: 'The planet’s gravity points inward. Does that lift the water or hold it down?', cue: { diagram: 'gp' } },
            { title: 'Pick the pull-back', html: 'Pick the answer about the planet pulling its ocean back.', cue: null }
          ];
          return [
            { title: 'What changed?', html: 'Only ' + S.gp + ' changed. It ' + changeWord(x) + '. ' + S.dg + ' and R are fixed.', cue: { inputs: true } },
            { title: 'Look at the cyan arrows', html: 'They pull the ocean inward, against the stretch.', cue: { diagram: 'gp' } },
            { title: 'Think it through', html: 'A stronger inward pull fights the stretch harder. Will the bulge end up above or below 4 m?', cue: null }
          ];
        },
        worked: function (x, h) {
          return [
            'Only ' + S.gp + ' changes: it ' + changeWord(x) + '. ' + S.dg + ', R and k are locked.',
            S.gp + ' is on the bottom of the fraction, so ' + S.h + ' is divided by ' + f(x) + '.',
            '4 m ÷ ' + f(x) + ' = ' + f(h) + ' m.',
            'Physically: a stronger planet pull holds the ocean closer, resisting the stretch from ' + S.dg + '.'
          ];
        }
      },
      'exp-R': {
        n: 3, key: 'R', topic: 'Radius', title: 'Test 3 · Radius (R)', evidence: 'ev-R',
        variants: [2, 1.5, 2.5],
        question: function (x) { return x === 2 ? 'What happens if the planet is twice as big?' : 'What happens if the planet is ' + f(x) + ' times as big?'; },
        prompt: function (x) { return 'Back to a 4 m bulge. Only R changes: it ' + changeWord(x) + '. ' + S.dg + ' and ' + S.gp + ' stay fixed, so don’t recalculate them.'; },
        relation: function (x, h) { return 'The same stretch on a bigger planet is a taller bulge. R ' + changeWord(x) + ', so the bulge does too: 4 m ' + times(x) + ' = ' + f(h) + ' m.'; },
        choices: [
          { id: 'fraction', correct: true, text: S.dg + ' ÷ ' + S.gp + ' sets the stretch as a fraction of the planet’s size. The same fraction of a bigger planet is a taller bulge.' },
          { id: 'recalc', text: 'A bigger planet also feels a bigger ' + S.dg + ', so the bulge grows.',
            feedback: S.dg + ' was fixed in this test. In a real system it could change, but here the change comes from R alone.' },
          { id: 'stronger', text: 'A bigger planet has stronger gravity, so the bulge shrinks.',
            feedback: S.gp + ' was fixed here, so the planet’s pull didn’t change. Only R changed, and the bulge grew.' },
          { id: 'notsure', notSure: true, text: 'Not sure' }
        ],
        notSureFeedback: 'With ' + S.dg + ' and ' + S.gp + ' fixed, the ocean stretches by the same fraction of the planet’s size. A bigger planet means a taller bulge.',
        hints: function (x, phase) {
          if (phase === 'explain' || phase === 'feedback') return [
            { title: 'What was fixed?', html: 'Which variables were fixed in this test?', cue: { inputs: true } },
            { title: 'Think in fractions', html: 'Think of the bulge as a fraction of the planet’s size.', cue: { diagram: 'R' } },
            { title: 'Pick the bigger planet', html: 'Pick the answer about the same stretch on a bigger planet.', cue: null }
          ];
          return [
            { title: 'What changed?', html: 'Only R changed. It ' + changeWord(x) + '. ' + S.dg + ' and ' + S.gp + ' are fixed, so don’t recalculate them.', cue: { inputs: true } },
            { title: 'Same fraction', html: 'The ocean is stretched by the same fraction, but now the planet is bigger.', cue: { diagram: 'R' } },
            { title: 'Think it through', html: 'The same fraction of a planet ' + times(x) + ' as big: what does that make 4 m?', cue: null }
          ];
        },
        worked: function (x, h) {
          return [
            'Only R changes: it ' + changeWord(x) + '. ' + S.dg + ' and ' + S.gp + ' are locked and not recalculated.',
            'R multiplies the model, so ' + S.h + ' is multiplied by ' + f(x) + '.',
            '4 m × ' + f(x) + ' = ' + f(h) + ' m.',
            'Physically: the same fractional stretch on a bigger planet is a taller bulge.'
          ];
        }
      }
    },

    /* ------------------------------ D. Sensor update ------------------------------ */
    sensor: {
      eyebrow: 'Sensor update',
      heading: 'The external pull increased everywhere. Does the modelled bulge height change?',
      prompt: S.gp + ', R and k stay locked.',
      unitsNote: 'illustrative units',
      readings: { near: 12, centre: 10, far: 8 },
      // Amount added at every location; each fresh attempt uses the next value.
      variants: [3, 5],
      choices: [
        { id: 'higher', text: 'Higher' },
        { id: 'lower', text: 'Lower' },
        { id: 'same', text: 'Stays the same', correct: true }
      ],
      quantities: [
        { id: '', text: 'Choose a quantity…' },
        { id: 'dg', text: 'Δg — the near-to-far difference', correct: true },
        { id: 'overall', text: 'The overall external pull' },
        { id: 'gp', text: 'gₚ — the planet’s surface gravity' },
        { id: 'R', text: 'R — the planet’s radius' },
        { id: 'notsure', text: 'Not sure' }
      ],
      quantityFeedback: {
        overall: 'The overall pull did go up — but the model doesn’t use the overall pull. It uses only ' + S.dg + ', the near-to-far difference.',
        gp: S.gp + ' was locked, so it can’t explain the result. The deciding quantity is ' + S.dg + ', which stayed the same.',
        R: 'R was locked, so it can’t explain the result. The deciding quantity is ' + S.dg + ', which stayed the same.',
        notsure: 'The deciding quantity is ' + S.dg + ': compare the brackets before and after.'
      },
      hints: function (amt) {
        return [
          { title: 'What changed?', html: S.gp + ', R and k are locked. Only the external readings change — each rises by ' + amt + '.', cue: { inputs: true } },
          { title: 'Compare the brackets', html: 'Look at the dashed brackets before and after. Did the gap between near and far change?', cue: { brackets: true } },
          { title: 'Find it in the model', html: 'The model uses ' + S.dg + ', the near-to-far difference — not the size of the overall pull.', cue: { eq: ['dg'] } },
          { title: 'Worked example (different readings)', html: 'Readings 9, 7, 5 become 11, 9, 7. ' + S.dg + ' = 9 − 5 = 4 before and 11 − 7 = 4 after. Same ' + S.dg + ', same bulge.', cue: { worked: true } }
        ];
      },
      worked: function (amt, before, after) {
        return [
          'Before: ' + S.dg + ' = ' + before.near + ' − ' + before.far + ' = ' + (before.near - before.far) + '.',
          'After adding ' + amt + ' everywhere: ' + S.dg + ' = ' + after.near + ' − ' + after.far + ' = ' + (after.near - after.far) + '.',
          S.dg + ', ' + S.gp + ' and R are all unchanged, so ' + S.h + ' stays at 4 m.',
          'A bigger overall pull is not a bigger difference across the planet.'
        ];
      }
    },

    /* ------------------------------ D2. Quick checks (mixed practice) ------------------------------ */
    // Two short checks after the blocked experiments. Each describes a change in plain words,
    // WITHOUT saying which model input it affects: the learner first maps the scenario to
    // Δg / gₚ / R (goes up, goes down or stays fixed), then predicts the new height.
    // Kept to the two cases the earlier steps don't cover: a gₚ DECREASE (taller bulge — the
    // inverse-relation trap) and a uniform DECREASE in external pull (sounds like a change, isn't).
    // `change` lists factors relative to baseline (missing = 1). The first variant is the first
    // attempt; later variants are fresh attempts on the same input with new values.
    mixed: {
      eyebrow: 'Quick checks',
      heading: 'What does this change do to the model?',
      prompt: '',
      // Before Check, the diagram is the learner's sketch: it redraws as they answer.
      sketchNote: '',
      sketchScale: '',
      heightOptions: [1, 2, 4, 6, 8],
      directions: [
        { id: 'up', text: 'Up' },
        { id: 'down', text: 'Down' },
        { id: 'fixed', text: 'Fixed' }
      ],
      items: {
        'qc-2': {
          n: 2,
          variants: [
            { change: { gp: 0.5 },
              scenario: 'A survey team models a lighter world of the same size. At its surface, the planet’s own gravity pulls only half as hard. The external body and the orbit don’t change.',
              why: 'Only the planet’s own surface gravity changed: ' + S.gp + ' ×0.5. Same size and same orbit, so R and ' + S.dg + ' stay fixed.',
              physical: 'A weaker inward pull resists the stretch less, so the bulge is taller.' },
            { change: { gp: 4 },
              scenario: 'A survey team models a much denser world of the same size. At its surface, the planet’s own gravity pulls four times as hard. The external body and the orbit don’t change.',
              why: 'Only the planet’s own surface gravity changed: ' + S.gp + ' ×4. Same size and same orbit, so R and ' + S.dg + ' stay fixed.',
              physical: 'A stronger inward pull holds the ocean closer, so the bulge is smaller.' }
          ],
          worked: 'A planet with a 3 m bulge has its own surface gravity cut to a third; nothing else changes. ' + S.gp + ' goes down, ' + S.dg + ' and R stay fixed, so ' + S.h + ' = 3 m × 3 = 9 m. Now try your own check.'
        },
        'qc-3': {
          n: 3,
          variants: [
            { change: {},
              scenario: 'The moon’s pull weakens by the same amount at the near side, the centre and the far side. Nothing about the planet itself changes.',
              why: 'Every reading dropped by the same amount, so the near-to-far difference — ' + S.dg + ' — is unchanged. ' + S.gp + ' and R belong to the planet, which didn’t change. All three stay fixed.',
              physical: 'A weaker overall pull isn’t a smaller difference across the planet, so the bulge stays at 4 m.' },
            { change: {},
              scenario: 'The star’s pull grows by the same amount at every point on the planet — near side, centre and far side alike. Nothing about the planet itself changes.',
              why: 'Every reading rose by the same amount, so the near-to-far difference — ' + S.dg + ' — is unchanged. ' + S.gp + ' and R belong to the planet, which didn’t change. All three stay fixed.',
              physical: 'A stronger overall pull isn’t a bigger difference across the planet, so the bulge stays at 4 m.' }
          ],
          worked: 'Readings 9, 7, 5 all drop by 2, to 7, 5, 3. ' + S.dg + ' = 9 − 5 = 4 before and 7 − 3 = 4 after. ' + S.dg + ', ' + S.gp + ' and R all stay fixed, so ' + S.h + ' doesn’t change. Now try your own check.'
        }
      },
      // Shared hint ladder; the worked example (level 3) comes from each item.
      hints: function (item) {
        return [
          { title: 'Ask three questions', html: 'Did the <em>difference</em> in the external pull between the near and far sides change? Did the planet’s own surface gravity change? Did the planet’s size change? Anything the scenario doesn’t change stays fixed.', cue: null },
          { title: 'Find it in the model', html: S.dg + ' is on top: ' + S.h + ' changes by the same factor. ' + S.gp + ' is on the bottom: ' + S.h + ' changes by the inverse factor. R multiplies everything. If none of the three changes, neither does ' + S.h + '.', cue: { eq: ['dg', 'gp', 'R'] } },
          { title: 'Worked example (different numbers)', html: item.worked, cue: { worked: true } }
        ];
      }
    },

    /* ------------------------------ E. Planet comparison ------------------------------ */
    planets: {
      eyebrow: 'Planet comparison',
      heading: 'Which planet has the smallest modelled bulge?',
      prompt: 'Predict each planet’s height compared with the 4 m baseline, then pick the smallest.',
      // First set is the specified comparison; later sets are fresh retries with new values.
      sets: [
        [
          { id: 'A', dg: 2, gp: 1 },
          { id: 'B', dg: 2, gp: 4 },
          { id: 'C', dg: 0.5, gp: 0.5 }
        ],
        [
          { id: 'D', dg: 3, gp: 3 },
          { id: 'E', dg: 1, gp: 2 },
          { id: 'F', dg: 0.5, gp: 0.25 }
        ]
      ],
      estimateOptions: [0.25, 0.5, 1, 2, 4],
      reasons: [
        { id: 'ratio', correct: true, text: 'Compare ' + S.dg + ' ÷ ' + S.gp + ' for each planet — both quantities matter.' },
        { id: 'smallest-dg', text: 'Pick the planet with the smallest ' + S.dg + '.',
          feedback: S.dg + ' alone isn’t enough. A planet with a small ' + S.dg + ' can still have a large bulge if its ' + S.gp + ' is small too.' },
        { id: 'largest-gp', text: 'Pick the planet with the largest ' + S.gp + '.',
          feedback: S.gp + ' alone isn’t enough. A planet with a large ' + S.gp + ' and an even larger ' + S.dg + ' would still have a big bulge.' }
      ],
      hints: function () {
        return [
          { title: 'What changes?', html: 'R and k are the same for all three planets. Two inputs change: ' + S.dg + ' and ' + S.gp + '.', cue: { inputs: true } },
          { title: 'Two influences', html: 'For each planet, ' + S.dg + ' raises the bulge by its factor and ' + S.gp + ' lowers it by its factor.', cue: { rows: true } },
          { title: 'Find it in the model', html: 'With R fixed, ' + S.h + ' ÷ 4 m = (' + S.dg + ' factor) ÷ (' + S.gp + ' factor). Work out that ratio for each planet.', cue: { eq: ['dg', 'gp'] } },
          { title: 'Worked example (different planet)', html: S.dg + ' ×5 and ' + S.gp + ' ×10 gives 5 ÷ 10 = 0.5 × baseline = 2 m.', cue: { worked: true } }
        ];
      },
      evidence: 'ev-ratio'
    },

    /* ------------------------------ F. Crew briefing ------------------------------ */
    // Miller's planet. gₚ ×1.3 matches the film's "130% of Earth gravity"; the Δg factors are
    // illustrative and scaled to fit the 0–10 m gauge (not measurements of the film's planet).
    crewCombined: {
      eyebrow: 'Crew briefing',
      heading: 'Forecast the bulge on Miller’s planet.',
      // Each fresh attempt uses a different (illustrative) orbit estimate; gₚ stays at the film's 130%.
      variants: [{ dg: 2.6, gp: 1.3 }, { dg: 1.95, gp: 1.3 }, { dg: 3.25, gp: 1.3 }],
      planetName: 'Miller’s planet',
      prompt: function (v) {
        return 'Compared with the reference world (bulge 4 m): ' + S.dg + ' ' + f(v.dg) + '×, ' + S.gp + ' ' + f(v.gp) + '×. R and k are the same.';
      },
      valuesNote: 'Illustrative console values scaled to fit the gauge — not measurements of the film’s planet. ' + S.gp + ' ×1.3 matches the crew’s “130% of Earth gravity”.',
      relation: function (v, h) {
        var ratio = M.heightRatio({ dg: v.dg, gp: v.gp });
        return 'Gargantua’s ' + S.dg + ' ' + times(v.dg) + ' stretches the ocean; Miller’s stronger ' + S.gp + ' ' + times(v.gp) + ' resists. The ratio is ' + f(v.dg) + ' ÷ ' + f(v.gp) + ' = ' + f(ratio) + ', so ' + S.h + ' = 4 m × ' + f(ratio) + ' = ' + f(h) + ' m.';
      },
      crewNote: function (v, h) {
        return 'Both inputs went up, so compare them. The planet’s stronger gravity holds the ocean down a little, but the black hole’s ' + S.dg + ' grew more: ' + f(v.dg) + ' ÷ ' + f(v.gp) + ' gives ' + f(h) + ' m — a larger bulge than the reference world.';
      },
      hints: function (v) {
        return [
          { title: 'What changed?', html: 'Two inputs change: ' + S.dg + ' ' + times(v.dg) + ' (Gargantua) and ' + S.gp + ' ' + times(v.gp) + ' (the planet’s 130% gravity). R and k are locked.', cue: { inputs: true } },
          { title: 'Two influences', html: S.dg + ' changes how hard the ocean is stretched; ' + S.gp + ' changes how strongly the planet holds it back. Which grew more?', cue: { diagram: 'both' } },
          { title: 'Find it in the model', html: S.h + ' = 4 m × (' + S.dg + ' factor ÷ ' + S.gp + ' factor).', cue: { eq: ['dg', 'gp'] } },
          { title: 'Worked example (different planet)', html: S.dg + ' ×6 and ' + S.gp + ' ×4 → 6 ÷ 4 = 1.5 → 4 m × 1.5 = 6 m.', cue: { worked: true } }
        ];
      },
      worked: function (v, h) {
        var ratio = M.heightRatio({ dg: v.dg, gp: v.gp });
        return [
          S.dg + ' is ' + times(v.dg) + ' and ' + S.gp + ' is ' + times(v.gp) + '; R and k are locked.',
          'Ratio: ' + f(v.dg) + ' ÷ ' + f(v.gp) + ' = ' + f(ratio) + '.',
          '4 m × ' + f(ratio) + ' = ' + f(h) + ' m.',
          'Physically: Gargantua’s ' + S.dg + ' drives the stretching; Miller’s ' + S.gp + ' resists it. ' + S.dg + ' grew more, so the bulge is larger.'
        ];
      }
    },

    /* ------------------------------ G1. Film ending ------------------------------ */
    filmEnding: {
      eyebrow: 'Mission debrief · back to the film',
      heading: 'Your forecast says tides here are extreme. Watch what the crew finds.',
      prompt: 'As you watch, notice which parts of the scene your model can explain — and which it can’t.',
      promptFallback: 'Read what happens, then notice which parts your model can explain — and which it can’t.',
      // Written from the film's plot, not from checking this clip; confirm it matches 3:35–4:19.
      sceneSummary: 'The wave reaches the landing site. The crew races back to their ship, which is lifted by the wall of water as it passes.',
      watchFor: [
        'Something your model explains: why tides on Miller’s planet are far stronger than on Earth.',
        'Something it doesn’t: a tall wave that moves across the ocean.'
      ]
    },

    /* ------------------------------ G. Debrief ------------------------------ */
    debrief: {
      question: 'What controls how much an ocean deforms?',
      summary: [
        { key: 'dg', title: 'Larger ' + S.dg, dir: 'up', result: 'larger bulge', note: 'difference in external pull drives deformation' },
        { key: 'gp', title: 'Larger ' + S.gp, dir: 'down', result: 'smaller bulge', note: 'the planet’s own gravity resists deformation' },
        { key: 'R', title: 'Larger R', dir: 'up', result: 'larger bulge', note: 'when ' + S.dg + ' and ' + S.gp + ' are held fixed' }
      ],
      filmCheck: {
        heading: 'Back to Miller’s planet',
        explains: {
          title: 'What your model explains',
          html: 'Why tidal stretching there is far larger than on Earth: Gargantua makes ' + S.dg + ' huge, and the planet’s 130% gravity (' + S.gp + ') resists only a little.'
        },
        doesnt: {
          title: 'What it doesn’t',
          html: 'The moving wall of water. Our model describes a still bulge that is much smaller than the planet, not a wave that travels and breaks.'
        }
      },
      goDeeper: {
        summary: 'Go deeper: where could a wave that tall come from?',
        sections: [
          { title: 'Why Δg is so large there',
            html: 'The difference in an external body’s pull across a planet grows with the body’s mass M and the planet’s radius R, and falls steeply with distance d: roughly ' + S.dg + ' ≈ 4GMR / d³ (near side minus far side). Gargantua is enormous and Miller’s planet orbits close to it, so ' + S.dg + ' is extreme.' },
          { title: 'Where our model stops working',
            html: 'The model assumes a still, “equilibrium” bulge with ' + S.h + ' much smaller than R. Plugging in values that extreme gives a number outside the model’s assumptions — and a result outside a model’s assumptions doesn’t tell you the real height.' },
          { title: 'One physicist’s explanation',
            html: 'Kip Thorne, the film’s science adviser, suggests the planet isn’t perfectly locked facing Gargantua. It rocks back and forth slightly under the tidal pull, and that rocking sloshes the ocean into giant waves — a moving wave, not the still bulge our model describes.' }
        ],
        source: 'Source: Kip Thorne, <cite>The Science of Interstellar</cite> (2014), chapter on Miller’s planet.'
      },
      // Reflection line chosen from keywords in the learner's first idea (first match wins).
      reflections: [
        { match: /black\s*hole|heav|mass|massive|gargantua|gravity of|pull of|stronger pull/i,
          html: 'Your first idea pointed at the external body. The model sharpens it: what matters is the <em>difference</em> in that body’s pull across the planet (' + S.dg + '), weighed against the planet’s own gravity (' + S.gp + ').' },
        { match: /clos|near|distance|far|orbit/i,
          html: 'Your first idea pointed at distance. In this model, distance matters through ' + S.dg + ': whatever increases the difference in pull across the planet raises the bulge — and the planet’s own gravity (' + S.gp + ') pushes back.' },
        { match: /size|big|radius|large planet|bigger planet|diameter/i,
          html: 'Your first idea pointed at the planet’s size. The model agrees — with ' + S.dg + ' and ' + S.gp + ' held fixed, a bigger R gives a bigger bulge. ' + S.dg + ' and ' + S.gp + ' matter too.' },
        { match: /water|ocean|deep|shallow|wave|wind/i,
          html: 'Your first idea focused on the water itself. The model looks at the forces instead: the difference in external pull (' + S.dg + ') stretches the ocean and the planet’s gravity (' + S.gp + ') resists it.' }
      ],
      reflectionNotSure: 'You started unsure. You now have three controls: ' + S.dg + ' drives the deformation, ' + S.gp + ' resists it, and R scales it when the others are fixed.',
      reflectionDefault: 'Compare your first idea with your evidence log: ' + S.dg + ' drives the deformation, ' + S.gp + ' resists it, and R scales it when the others are fixed.'
    },

    /* ================= New design: added pages ================= */

    /* Phase 2.1 · What makes a tide? (rank the Moon's pull; unscored) */
    tideRank: {
      eyebrow: 'Pre-flight Check',
      title: 'What makes a tide?',
      heading: 'Rank the pull of the Moon',
      intro: 'Back home on Earth, the sea rises and falls about twice a day: two high tides and two low tides. It all comes from our nearest neighbour, the Moon. Its pull gives Earth’s ocean two bulges: one facing the Moon and one on the far side.',
      task: 'The Moon’s gravity pulls on every part of Earth, but not by the same amount. Those differences in pull are what make the ocean rise higher in some places than others. What’s your guess? <b>Rank the Moon’s pull on these three points in the diagram on the left, from strongest to weakest, and watch how the ocean changes.</b>',
      rankLabel: 'Rank the pull: move each point to the right place',
      points: [
        { id: 'near', text: 'Near' },
        { id: 'centre', text: 'Centre' },
        { id: 'far', text: 'Far' }
      ],
      startOrder: ['centre', 'far', 'near'],
      correctOrder: ['near', 'centre', 'far'],
      check: 'Check selection',
      helper: 'Move a point at least once to check.',
      correct: '<b>The near side is pulled hardest and the far side least.</b> That difference in pull stretches the ocean into two bulges. We call it ' + S.dg + '.',
      other: '<b>Distance matters.</b> The closer a point is to the Moon, the stronger its pull.',
      nextNote: 'Click Continue to meet the three variables that set how tall a bulge gets.',
      hints: [
        { title: 'Closest point', html: 'Which of the three points is closest to the Moon?', cue: null },
        { title: 'Distance matters', html: 'Gravity gets weaker with distance. The closer a point is, the stronger its pull.', cue: null },
        { title: 'Rank by distance', html: 'Rank them by distance: closest point first, farthest point last.', cue: null }
      ]
    },

    /* Phase 3 · Tide Lab results */
    labResults: {
      title: 'Tide Lab · Results',
      heading: 'Lab results',
      text: 'Three tests, three findings. Each one is now in your results table and your evidence log.',
      crew: { who: 'Mission control', text: 'That’s solid evidence. Now let’s see whether it adds up to a model we can use on Miller’s planet.' },
      nextNote: 'Click Continue to build the model from your findings.'
    },

    /* Phase 4 · Decode the model */
    decode: {
      summary: {
        title: 'Decode the Model · Summarise',
        heading: 'What did each test tell you?',
        task: 'Complete each sentence from your results table.',
        blanks: {
          change: [{ id: 'doubles', text: 'doubles' }, { id: 'halves', text: 'halves' }, { id: 'same', text: 'stays the same' }],
          size: [{ id: 'bigger', text: 'bigger' }, { id: 'smaller', text: 'smaller' }],
          prop: [{ id: 'directly', text: 'directly' }, { id: 'inversely', text: 'inversely' }]
        },
        rows: [
          { key: 'dg', answers: { change: 'doubles', size: 'bigger', prop: 'directly' } },
          { key: 'gp', answers: { change: 'halves', size: 'smaller', prop: 'inversely' } },
          { key: 'R', answers: { change: 'doubles', size: 'bigger', prop: 'directly' } }
        ],
        correct: 'These are your three rules. ' + S.dg + ' and R raise the bulge; ' + S.gp + ' holds it down.',
        notYet: 'Find that variable’s row in your results table. Did the bulge go up to 8 m or down to 2 m?',
        helper: 'Fill every blank, then click Check.',
        nextNote: 'Click Continue to see your three rules as one model.',
        hints: [
          { title: 'Use your table', html: 'Each sentence matches one row of your results table.', cue: null },
          { title: 'Up or down?', html: 'Did the bulge go up to 8 m (it doubled) or down to 2 m (it halved)?', cue: null },
          { title: 'Proportional', html: 'If h grows when the variable grows, they are directly proportional. If h shrinks when it grows, they are inversely proportional.', cue: null }
        ]
      },
      model: {
        title: 'Decode the Model · The model',
        heading: 'Your three rules, in one model',
        modelLabel: 'Your model',
        modelNote: 'h = bulge height · each term comes from one row of your results table',
        placeCol: 'In the model',
        place: { dg: 'on top', gp: 'on the bottom', R: 'multiplies' },
        rules: [
          { key: 'dg', up: 'up', tag: 'directly proportional' },
          { key: 'gp', up: 'down', tag: 'inversely proportional' },
          { key: 'R', up: 'up', tag: 'directly proportional' }
        ],
        kRule: 'fixed for every planet',
        nextNote: 'Click Continue to try the model in the quick checks.'
      }
    },

    /* Phase 5 · Quick check 1 and 4, and the Miller's planet forecast: calculations with real numbers */
    calc: {
      'qc-1': {
        eyebrow: 'Quick Checks', n: 1,
        scenario: 'A survey team finds an ocean planet with a moon nearby. The moon pulls the planet’s near side 0.00001 m/s² harder than its far side. The planet’s surface gravity is 10 m/s², and its radius is 2,000,000 m (2,000 km).',
        known: [
          { key: 'dg', label: S.dg + ' =', unit: 'm/s²', value: 0.00001 },
          { key: 'gp', label: S.gp + ' =', unit: 'm/s²', value: 10 },
          { key: 'R', label: 'R =', unit: 'm', value: 2000000 },
          { key: 'k', label: 'k =', unit: '', value: 2 }
        ],
        knownLabel: '1 · Fill in what you know',
        solve: { key: 'h', label: 'h =', unit: 'm', value: 4, question: '2 · What is the bulge height h?' },
        helper: 'Complete step 1, then find h.',
        correct: S.dg + ' = 0.00001 (near − far), ' + S.gp + ' = 10, R = 2,000,000, k = 2. So h = 2 × 0.000001 × 2,000,000 = 4 m. This planet is the baseline for the next two checks.',
        notYet: 'Match each number to a symbol first: which one is the near-to-far difference? Then put them into the model.',
        evidence: 'ev-ratio',
        hints: [
          { title: 'Which is which?', html: 'Which number is ' + S.dg + ', ' + S.gp + ' and R?', cue: null },
          { title: 'Divide first', html: 'Work out ' + S.dg + ' ÷ ' + S.gp + ' first.', cue: { eq: ['dg', 'gp'] } },
          { title: 'Worked example', html: 'k = 2, ' + S.dg + ' = 0.00002, ' + S.gp + ' = 10, R = 1,000,000. Put them into the model: h = 2 × 0.000002 × 1,000,000 = 4 m.', cue: { worked: true } }
        ]
      },
      'qc-4': {
        eyebrow: 'Quick Checks', n: 4,
        scenario: 'The survey team finds another ocean planet. Its tide gauge shows a 6 m bulge. The moon pulls the near side 0.00003 m/s² harder than the far side, and the planet’s surface gravity is 10 m/s². How big is this planet?',
        known: [
          { key: 'h', label: 'h =', unit: 'm', value: 6 },
          { key: 'dg', label: S.dg + ' =', unit: 'm/s²', value: 0.00003 },
          { key: 'gp', label: S.gp + ' =', unit: 'm/s²', value: 10 },
          { key: 'k', label: 'k =', unit: '', value: 2 }
        ],
        knownLabel: '1 · Fill in what you know',
        substitute: { label: '2 · Put them into the model', locked: 'Fill in step 1 to see the model with your numbers.', lines: ['6 = 2 × (0.00003 ÷ 10) × R', '6 = 0.000006 × R'] },
        solve: { key: 'R', label: 'R =', unit: 'm', value: 1000000, question: '3 · Solve for R' },
        helper: 'Complete each step to unlock the next.',
        correct: 'R = 6 ÷ 0.000006 = 1,000,000 m (1,000 km). This planet is half as wide as the one in Check 1, yet its bulge is taller, because its ' + S.dg + ' is three times larger.',
        notYet: 'R is being multiplied by 0.000006. To get R on its own, divide both sides by 0.000006.',
        hints: [
          { title: 'Fill in first', html: 'Read the scenario again: which numbers are h, ' + S.dg + ', ' + S.gp + ' and k?', cue: null },
          { title: 'Simplify', html: 'Work out k × (' + S.dg + ' ÷ ' + S.gp + ') first, so the model reads 6 = (a number) × R.', cue: { eq: ['dg', 'gp', 'R'] } },
          { title: 'Worked example', html: 'h = 4 m, k = 2, ' + S.dg + ' = 0.00001, ' + S.gp + ' = 10 → 4 = 0.000002 × R → R = 2,000,000 m. That’s the planet from Check 1.', cue: { worked: true } }
        ]
      },
      'miller-forecast': {
        eyebrow: 'Landing Call', heading: 'Forecast Miller’s planet', noScaffold: true,
        scenario: 'The Endurance has scanned Miller’s planet. Gargantua pulls on the side of the planet facing it 0.0039 m/s² harder than on the far side. On the surface, the crew would feel a gravity of 13 m/s², a little stronger than Earth’s. The planet’s radius is 2,000,000 m. Use your model to work out the bulge height.',
        scenarioLabel: 'Mission briefing',
        known: [],
        solve: { key: 'h', label: 'h =', unit: 'm', value: 1200, question: 'What is the bulge height h?' },
        helper: 'Use the model to find h, then click Check.',
        correct: 'h = 2 × (0.0039 ÷ 13) × 2,000,000 = 1,200 m, about 4,000 feet. Gargantua makes ' + S.dg + ' 390 times larger than in Check 1, but Miller’s gravity is only 1.3 times stronger. The stretch wins by far, so the bulge is 300 times taller.',
        notYet: 'Which number is the near-to-far difference? Open Hint to see what each symbol stands for. Then work out ' + S.dg + ' ÷ ' + S.gp + ' before multiplying.',
        nextNote: 'Click Continue to make the landing call.',
        compare: [
          { label: 'Earth’s ocean tide', value: 1, text: 'about 1 m' },
          { label: 'Miller’s planet', value: 1200, text: '1,200 m', note: '≈ 4,000 feet, the wave height in the film' }
        ],
        safetyLimit: 5,
        hints: [
          { title: 'What each symbol means', html: S.dg + ' = 0.0039 m/s² (near − far), ' + S.gp + ' = 13 m/s², R = 2,000,000 m, k = 2', cue: null },
          { title: 'Divide first', html: 'Work out ' + S.dg + ' ÷ ' + S.gp + ' first, then multiply by k and R.', cue: { eq: ['dg', 'gp'] } },
          { title: 'Worked example', html: 'The planet in Check 1: h = 2 × (0.00001 ÷ 10) × 2,000,000 = 4 m.', cue: { worked: true } }
        ]
      }
    },

    /* Phase 6 · Background before the forecast */
    millerBg: {
      title: 'Approaching Miller’s planet',
      body: [
        'Miller’s planet orbits very close to Gargantua, a supermassive black hole.',
        'Your Tide Lab tests showed that a heavier, closer body makes ' + S.dg + ' bigger: its pull on the near side becomes much stronger than on the far side.',
        'Gargantua is very close to Miller’s planet, so it is likely to affect the tidal bulge there.'
      ],
      placeholder: 'Film still: Gargantua and Miller’s planet (placeholder)',
      nextNote: 'Click Continue to forecast the bulge.'
    },

    /* Phase 6 · Is it safe to land? */
    landing: {
      eyebrow: 'Landing Call',
      heading: 'Is it safe to land?',
      crew: { who: 'Crew message', text: 'The lander can handle a bulge of up to 5 m. Your forecast is our call.' },
      decide: '1 · Based on the bulge you calculated, is it safe for the crew to land?',
      options: [{ id: 'yes', text: 'Yes, it’s safe' }, { id: 'no', text: 'No, too dangerous', correct: true }],
      reportLabel: '2 · Report to the crew',
      reportPlaceholder: 'Explain your decision: should the crew land, and why? Include how Gargantua affects the bulge.',
      send: 'Send report',
      helper: 'Choose an answer and write your report, then send it.',
      correct: { who: 'Pilot', text: 'Copy that. A 1,200 m bulge is far above our 5 m limit. We’ll warn the landing team before they go. This time, the story ends differently.' },
      notYet: { who: 'Crew', text: 'Wait. That’s the same call you made last time, and we all know how that ended. Your forecast is 1,200 m, but the lander can only handle 5 m. Look again. Your crew is counting on you.' },
      retry: 'Try again',
      yourReport: 'Your report',
      sample: 'We shouldn’t land. Gargantua is very massive and very close, so it pulls the near side much harder than the far side. That makes ' + S.dg + ' large, so the bulge is about 1,200 m, far above the lander’s 5 m limit.',
      checklist: ['Did you say whether to land?', 'Did you give the bulge height and compare it with 5 m?', 'Did you explain how Gargantua makes the bulge bigger?'],
      nextNote: 'Click Continue to see what happened in the film.',
      hints: [
        { title: 'Compare', html: 'Compare your forecast (1,200 m) with the lander’s limit (5 m). Which is bigger?', cue: null },
        { title: 'Why so big?', html: 'Why is the bulge so big? Think about how close Gargantua is, and what that does to its pull on the near side and the far side.', cue: null },
        { title: 'Sentence starter', html: '“We should / shouldn’t land, because Gargantua … , so the bulge is about … m, which is above / below the 5 m limit.”', cue: null }
      ]
    },

    /* Phase 7 · Film ending + reflection */
    endReflect: {
      eyebrow: 'Mission debrief',
      text: 'This is how it ended last time: the crew landed, the “mountains” turned out to be a wall of water, and Doyle never made it back. Watch it again. This time, you know why.',
      quoteLabel: 'Your first guess, before the mission',
      question: 'Has your idea changed? In a few sentences, answer:',
      prompts: ['What caused the disaster last time?', 'What made the tidal bulge so huge?', 'What did you learn on this mission?'],
      placeholder: 'Type your answer here…',
      helper: 'Write a few sentences to continue.',
      nextNote: 'Click Continue to see your mission summary.'
    },

    /* Phase 7 · Mission summary, Go deeper and the finish */
    missionSummary: {
      heading: 'Mission summary',
      text: 'Mission complete. You turned a tragedy into a safe call, using a model you built yourself.',
      deeperLink: 'Go deeper (optional) →',
      deeperNote: 'Extra physics behind Miller’s planet. Not scored.',
      finish: 'Finish mission',
      finishNote: 'Thanks for flying with the Endurance crew.',
      cards: [
        { title: 'What sets the bulge height', rows: [
          { key: 'dg', text: 'The difference in pull between the near side and the far side' },
          { key: 'gp', text: 'The planet’s own surface gravity' },
          { key: 'R', text: 'The planet’s radius' }] },
        { title: 'How each one works' },
        { title: 'Your model', note: 'Use it to work out the bulge on any planet.' },
        { title: 'Why Miller’s planet is so dangerous', text: 'Miller’s planet orbits right next to Gargantua, a giant black hole. Gargantua pulls the near side far harder than the far side, so ' + S.dg + ' is huge. The model turns that into a bulge of about 1,200 m, more than a thousand times Earth’s tide. Every time the tide comes in, it’s like a mega-tsunami!' }
      ],
      deeper: {
        eyebrow: 'Go deeper · optional',
        heading: 'The real physics behind Miller’s planet',
        text: 'Curious? These extras aren’t scored.',
        back: '← Back to summary',
        finishNote: 'Finish whenever you’re ready.',
        cards: [
          { title: 'Why is ' + S.dg + ' so big there?', eq: S.dg + ' ≈ 4GMR / d³', text: 'M is the black hole’s mass and d is the distance to it. Gargantua is about 100 million times heavier than the Sun, and Miller’s planet is very close. Because of d³, halving the distance makes ' + S.dg + ' 8 times bigger.' },
          { title: 'Where our model stops working', text: 'Our model describes a still bulge, the shape the ocean settles into. The film shows a moving wall of water. The model tells you how big the tides are, but not how they travel.' },
          { title: 'Kip Thorne’s rocking planet', text: 'The film’s science adviser suggests Miller’s planet rocks slightly back and forth as it orbits. Each rock sloshes the ocean, sending a giant wave across the planet about once an hour.' }
        ],
        source: 'Source: Kip Thorne, <cite>The Science of Interstellar</cite> (2014).'
      }
    }

  };
}());
