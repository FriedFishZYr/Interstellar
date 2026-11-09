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
    moduleVersion: '1.5.0',
    recordSchema: 'tidal-forecast-mission/session-record@1',
    // v2: the Quick checks step was added, so step positions saved by v1 no longer line up.
    storageKey: 'tfm.session.v2',
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
      // The film's ending plays by default after the crew challenges, before the debrief.
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

    steps: [
      { id: 'briefing', label: 'Briefing', activities: ['briefing'] },
      { id: 'console', label: 'Console', activities: ['console-dg', 'console-gp', 'console-R'] },
      { id: 'experiments', label: 'Experiments', activities: ['exp-dg', 'exp-gp', 'exp-R'] },
      { id: 'sensor', label: 'Sensor', activities: ['sensor'] },
      { id: 'mixed', label: 'Quick checks', activities: ['mixed-1', 'mixed-2'] },
      { id: 'planets', label: 'Planets', activities: ['planets'] },
      { id: 'crew', label: 'Crew briefing', activities: ['crew-combined', 'crew-explain'] },
      { id: 'debrief', label: 'Debrief', activities: ['film-ending', 'debrief'] }
    ],

    /* ------------------------- Landing-stakes thread ------------------------- *
     * A short message from the crew for each step, tying it to the landing on Miller's planet.
     * Roles are generic (not the film's characters). Keep each to ~20 words.
     * Steps listed in stepIntros show their message on an intro page before the first task;
     * the others (briefing, debrief) show it at the top of the task panel. */
    crewLines: {
      briefing: { who: 'Mission control', text: 'The crew is setting down on Miller’s planet. They need your tide forecast to decide how long they can stay.' },
      console: { who: 'Navigator', text: 'Learn the console first. Every forecast you send us is built from these readings.' },
      experiments: { who: 'Navigator', text: 'Before we trust a forecast, we need to know what drives the bulge. Test one input at a time.' },
      sensor: { who: 'Pilot', text: 'Something’s off with our readings: they all changed at once. Is the landing site still safe?' },
      mixed: { who: 'Navigator', text: 'The survey teams ran out of time for numbers, so they sent written notes instead. Can you work out what they mean for the forecast?' },
      planets: { who: 'Mission control', text: 'Three candidate ocean worlds. Which one has the gentlest tides for a landing?' },
      crew: { who: 'Pilot', text: 'We’re on the surface now. Your forecast decides how long we stay.' },
      debrief: { who: 'Mission control', text: 'Time to see how your forecast held up on the surface.' }
    },

    // Intro page shown once before a step's first task: the crew message (crewLines), the
    // situation in a sentence or two, and the learner's job. Keep each page to ~3 short lines.
    stepIntros: {
      console: {
        title: 'Learn the console',
        situation: 'The console shows the planet, the external body pulling on it, and the three model inputs: ' + S.dg + ', ' + S.gp + ' and R.',
        job: 'Find each input on the diagram.'
      },
      experiments: {
        title: 'Run three experiments',
        situation: 'Each experiment changes one input while the others stay locked.',
        job: 'Predict the new bulge, run the model, then explain the change.'
      },
      sensor: {
        title: 'Sensor update',
        situation: 'The readings at the near side, the centre and the far side of the planet have all changed.',
        job: 'Decide whether the forecast bulge changes, and which model quantity tells you.'
      },
      mixed: {
        title: 'Quick checks',
        situation: 'Each note describes a change in everyday words. It won’t say which model inputs are affected.',
        job: 'Decide what happens to ' + S.dg + ', ' + S.gp + ' and R, then predict the new height.'
      },
      planets: {
        title: 'Compare three planets',
        situation: 'Planets A, B and C are the same size but differ in ' + S.dg + ' and ' + S.gp + '.',
        job: 'Estimate each planet’s bulge and find the one with the gentlest tides.'
      },
      crew: {
        title: 'Miller’s planet',
        situation: 'It orbits close to Gargantua, so ' + S.dg + ' is much larger than on the reference ocean world (bulge 4 m). Its gravity is 130% of Earth’s, so ' + S.gp + ' is 1.3×.',
        job: 'Forecast the bulge, make the landing call, then answer a crewmate.'
      }
    },
    stepIntroStart: 'Start',

    // After crew challenge 1: the learner turns the forecast into a call to the crew (unscored),
    // on its own page.
    landingCall: {
      eyebrow: 'Crew briefing · your call',
      ask: 'We’re on the surface. Based on your forecast, how long can we stay?',
      toCall: 'Make the landing call',
      back: 'Back to the forecast',
      next: 'Continue to challenge 2',
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
      lede: 'In <em>Interstellar</em>, the crew lands on Miller’s planet and meets a wall of water. ' +
        'You’re the spacecraft’s science analyst: use a simple model to work out what makes a tidal bulge grow.',
      goalLabel: 'By the end you’ll be able to',
      goal: 'predict and explain how a tidal bulge’s height changes with the difference in an outside body’s pull (' +
        S.dg + '), the planet’s own gravity (' + S.gp + ') and the planet’s radius (' + S.R + ').',
      facts: ['About 10 minutes', 'Two short film clips, so turn sound on', 'No timer or score. Hints are always free.'],
      loopLabel: 'Every investigation follows the same loop',
      loop: ['Predict', 'Run the model', 'Compare', 'Explain', 'Apply'],
      start: 'Start mission',
      note: 'Progress is saved in this browser, so you can come back and pick up where you left off.'
    },

    complete: {
      eyebrow: 'Tidal Forecast Mission',
      title: 'Mission complete',
      lede: 'You used the tidal-height model to explain why tides on Miller’s planet are so extreme.',
      foundLabel: 'What you found',
      evidenceLabel: 'Evidence log',
      timeLabel: 'Time on mission',
      review: 'Review the debrief',
      restart: 'Start over'
    },

    activityTypes: {
      'briefing': 'briefing',
      'console-dg': 'console', 'console-gp': 'console', 'console-R': 'console',
      'exp-dg': 'experiment', 'exp-gp': 'experiment', 'exp-R': 'experiment',
      'sensor': 'sensor',
      'mixed-1': 'mixed', 'mixed-2': 'mixed',
      'planets': 'planets',
      'crew-combined': 'crewCombined',
      'crew-explain': 'crewExplain',
      'film-ending': 'filmEnding',
      'debrief': 'debrief'
    },

    activityLabels: {
      'briefing': 'Mission briefing — first idea (unscored)',
      'console-dg': 'Learn the console — identify Δg',
      'console-gp': 'Learn the console — identify gₚ',
      'console-R': 'Learn the console — identify R',
      'exp-dg': 'Experiment 1 — change Δg',
      'exp-gp': 'Experiment 2 — change gₚ',
      'exp-R': 'Experiment 3 — change R',
      'sensor': 'Sensor update — uniform change in external pull',
      'mixed-1': 'Quick check 1 — map a plain-language scenario to the inputs, then predict (gₚ changes)',
      'mixed-2': 'Quick check 2 — map a plain-language scenario to the inputs, then predict (uniform change: nothing changes)',
      'planets': 'Compare three planets',
      'crew-combined': 'Crew briefing 1 — forecast Miller’s planet (Δg and gₚ both change)',
      'crew-explain': 'Crew briefing 2 — respond to a crewmate: does stronger gₚ heap the water up?',
      'film-ending': 'Film ending — what the crew finds (unscored)',
      'debrief': 'Mission debrief'
    },

    // Activities that count toward "independent" vs "supported" completion.
    scoredActivities: ['console-dg', 'console-gp', 'console-R', 'exp-dg', 'exp-gp', 'exp-R',
      'sensor', 'mixed-1', 'mixed-2', 'planets', 'crew-combined', 'crew-explain'],

    // Offer a worked solution after this many unsuccessful attempts.
    workedSolutionAfter: 2,

    evidence: [
      { id: 'ev-dg', html: 'Larger ' + S.dg + ' → larger bulge' },
      { id: 'ev-gp', html: 'Larger ' + S.gp + ' → smaller bulge' },
      { id: 'ev-R', html: 'Larger R → larger bulge (' + S.dg + ', ' + S.gp + ' fixed)' },
      { id: 'ev-uniform', html: 'Same pull added everywhere → ' + S.dg + ' and bulge unchanged' },
      { id: 'ev-ratio', html: 'Compare ' + S.dg + ' ÷ ' + S.gp + ' — both quantities matter' }
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
      eyebrow: 'Mission briefing',
      heading: 'You’re this spacecraft’s science analyst.',
      prompt: 'Watch the landing scene, then log your first idea. You’ll test it with the model.',
      promptFallback: 'Read the scene summary, then log your first idea. You’ll test it with the model.',
      question: 'What might make a tidal bulge larger?',
      note: 'Not scored. You’ll compare it with your findings at the end.',
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
          { title: 'Think “difference”', html: S.dg + ' isn’t the external pull itself. It’s how much that pull differs between the near side and the far side.', cue: { diagram: 'body' } },
          { title: 'Look for amber', html: 'Amber shows the external body’s pull. One amber visual compares the pull at the near side, centre and far side.', cue: { diagram: 'dgarrows' } },
          { title: 'Find the bracket', html: 'The dashed bracket in the amber panel marks near − far. That difference is ' + S.dg + '.', cue: { diagram: 'dg' } }
        ]
      },
      'console-gp': {
        n: 2, target: 'gp',
        heading: 'Find ' + S.gp + ' on the diagram.',
        notYet: S.gp + ' belongs to the planet itself, not to the external body.',
        success: 'The cyan arrows are ' + S.gp + '. They point inward because the planet pulls its own ocean toward its centre.',
        next: 'Next: find R',
        hints: [
          { title: 'Whose gravity?', html: S.gp + ' is the planet’s own pull. It doesn’t come from the external body.', cue: null },
          { title: 'Which way does it point?', html: 'A planet pulls things toward its own centre. Look for arrows pointing inward, from all sides.', cue: { diagram: 'gp' } },
          { title: 'The cyan arrows', html: 'The cyan arrows around the planet are ' + S.gp + '.', cue: { diagram: 'gp' } }
        ]
      },
      'console-R': {
        n: 3, target: 'R',
        heading: 'Find R on the diagram.',
        notYet: 'R runs from the planet’s centre to its surface.',
        success: 'The dotted violet line from the centre to the surface is R.',
        next: 'Start the experiments',
        hints: [
          { title: 'Start at the centre', html: 'A radius starts at the centre dot.', cue: null },
          { title: 'A measurement, not an arrow', html: 'Look for a dotted line with end caps, rather than an arrow.', cue: { diagram: 'R' } },
          { title: 'The violet line', html: 'The dotted violet line labelled R is the planet’s radius.', cue: { diagram: 'R' } }
        ]
      }
    },

    /* ------------------------------ C. Experiments ------------------------------ */
    experiments: {
      'exp-dg': {
        n: 1, key: 'dg', topic: 'external difference', evidence: 'ev-dg',
        // Each fresh attempt uses the next variant so a retry is a genuine new prediction.
        // All variants change h in the same direction so the explanation choices stay valid.
        variants: [2, 1.5, 2.5],
        prompt: function (x) { return 'Baseline bulge: 4 m. The external difference, ' + S.dg + ', ' + changeWord(x) + '. Everything else is locked.'; },
        relation: function (x, h) { return 'Only ' + S.dg + ' changed (' + times(x) + '). A bigger near-to-far difference stretches the ocean more, so ' + S.h + ' changes by the same factor: 4 m ' + times(x) + ' = ' + f(h) + ' m.'; },
        choices: [
          { id: 'stretch', correct: true, text: 'A bigger difference in the external pull across the planet stretches the ocean more.' },
          { id: 'push', text: 'The external body pushes the far side away more strongly.',
            feedback: 'The external body only attracts — it never pushes. The far side bulges because it is pulled <em>less</em> than the centre, so it lags behind.' },
          { id: 'weaker', text: 'The planet’s own gravity got weaker, so it holds less water.',
            feedback: S.gp + ' was locked in this experiment. Only ' + S.dg + ' changed.' },
          { id: 'notsure', notSure: true, text: 'Not sure' }
        ],
        notSureFeedback: 'Look at the amber panel: the gap between the near and far pulls grew. That bigger difference is what stretches the ocean.',
        hints: function (x) {
          return [
            { title: 'What changed?', html: 'Only ' + S.dg + ' changes (' + times(x) + '). ' + S.gp + ', R and k are locked at baseline.', cue: { inputs: true } },
            { title: 'Look at the amber panel', html: 'The gap between the near and far pulls is now ' + f(x) + ' times as wide. ' + S.dg + ' is what stretches the ocean.', cue: { diagram: 'dg' } },
            { title: 'Find it in the model', html: S.dg + ' is on top of the fraction: ' + S.h + ' is proportional to ' + S.dg + '. Multiply ' + S.dg + ' by a number and ' + S.h + ' is multiplied by the same number.', cue: { eq: ['dg'] } },
            { title: 'Worked example (different planet)', html: 'A planet with a 3 m bulge has its ' + S.dg + ' tripled; everything else is locked. ' + S.h + ' = 3 m × 3 = 9 m. Now try your own task.', cue: { worked: true } }
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
        n: 2, key: 'gp', topic: 'planet gravity', evidence: 'ev-gp',
        variants: [2, 4, 8],
        prompt: function (x) { return 'Baseline bulge: 4 m. The planet’s surface gravity, ' + S.gp + ', ' + changeWord(x) + '. Everything else is locked.'; },
        relation: function (x, h) { return 'Only the planet’s surface gravity changed (' + times(x) + '). Its stronger restoring pull holds the ocean closer to the planet, so the modelled bulge is divided by ' + f(x) + ': 4 m → ' + f(h) + ' m.'; },
        choices: [
          { id: 'restore', correct: true, text: 'The planet pulls its ocean back toward its centre more strongly, so the bulge is smaller.' },
          { id: 'external', text: 'The external body pulls harder on the whole planet.',
            feedback: 'The external pull was locked (' + S.dg + ' fixed). Only the planet’s own gravity changed.' },
          { id: 'lift', text: 'Stronger planet gravity lifts the ocean into a bigger bulge.',
            feedback: 'The planet’s gravity points inward, toward its centre. It holds the ocean down rather than lifting it, so a stronger ' + S.gp + ' means a smaller bulge.' },
          { id: 'notsure', notSure: true, text: 'Not sure' }
        ],
        notSureFeedback: 'Look at the cyan arrows: they point inward. A stronger inward pull resists the stretching, so the bulge is smaller.',
        hints: function (x) {
          return [
            { title: 'What changed?', html: 'Only ' + S.gp + ' changes (' + times(x) + '). ' + S.dg + ', R and k are locked.', cue: { inputs: true } },
            { title: 'Look at the cyan arrows', html: 'They show the planet pulling its own ocean back toward its centre. A stronger pull resists the stretching.', cue: { diagram: 'gp' } },
            { title: 'Find it in the model', html: S.gp + ' is on the bottom of the fraction: ' + S.h + ' is inversely proportional to ' + S.gp + '. Multiply ' + S.gp + ' by a number and ' + S.h + ' is divided by that number.', cue: { eq: ['gp'] } },
            { title: 'Worked example (different planet)', html: 'A planet with a 9 m bulge has its ' + S.gp + ' tripled. ' + S.h + ' = 9 m ÷ 3 = 3 m. Now try your own task.', cue: { worked: true } }
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
        n: 3, key: 'R', topic: 'planet radius', evidence: 'ev-R',
        variants: [2, 1.5, 2.5],
        prompt: function (x) { return 'Baseline bulge: 4 m. The planet’s radius, R, ' + changeWord(x) + '. ' + S.dg + ' and ' + S.gp + ' are locked — they are not recalculated.'; },
        relation: function (x, h) { return 'Only R changed (' + times(x) + '). With ' + S.dg + ' and ' + S.gp + ' locked, the bulge is the same fraction of a bigger planet, so ' + S.h + ' changes by the same factor: 4 m ' + times(x) + ' = ' + f(h) + ' m.'; },
        choices: [
          { id: 'fraction', correct: true, text: S.dg + ' ÷ ' + S.gp + ' sets the stretch as a fraction of the planet’s size. The same fraction of a bigger planet is a taller bulge.' },
          { id: 'recalc', text: 'A bigger planet also feels a bigger ' + S.dg + ', so the bulge grows.',
            feedback: 'In a real system a bigger planet could feel a different ' + S.dg + ', but in this experiment ' + S.dg + ' is locked. The model isn’t recalculating it — the change comes from R alone.' },
          { id: 'stronger', text: 'A bigger planet has stronger gravity, so the bulge shrinks.',
            feedback: S.gp + ' is locked here, so the planet’s restoring pull hasn’t changed. Only R changed — and the bulge grew.' },
          { id: 'notsure', notSure: true, text: 'Not sure' }
        ],
        notSureFeedback: 'With ' + S.dg + ' and ' + S.gp + ' locked, the ocean stretches by the same fraction of the planet’s size. A bigger planet means a taller bulge.',
        hints: function (x) {
          return [
            { title: 'What changed?', html: 'Only R changes (' + times(x) + '). ' + S.dg + ' and ' + S.gp + ' are locked — don’t recalculate them.', cue: { inputs: true } },
            { title: 'Look at the violet radius', html: 'The ratio ' + S.dg + ' ÷ ' + S.gp + ' sets how much the ocean stretches as a fraction of the planet’s size. That ratio is locked; the planet is bigger.', cue: { diagram: 'R' } },
            { title: 'Find it in the model', html: 'R multiplies the whole expression: with ' + S.dg + ' and ' + S.gp + ' fixed, ' + S.h + ' is proportional to R.', cue: { eq: ['R'] } },
            { title: 'Worked example (different planet)', html: 'A 5 m bulge on a planet whose R triples, with ' + S.dg + ' and ' + S.gp + ' locked: ' + S.h + ' = 5 m × 3 = 15 m. Now try your own task.', cue: { worked: true } }
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
      prompt: 'No labels this time. Decide what happens to each model input, then predict the new height.',
      heightOptions: [1, 2, 4, 6, 8],
      directions: [
        { id: 'up', text: 'Up' },
        { id: 'down', text: 'Down' },
        { id: 'fixed', text: 'Fixed' }
      ],
      items: {
        'mixed-1': {
          n: 1,
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
        'mixed-2': {
          n: 2,
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
      eyebrow: 'Crew briefing · challenge 1 of 2',
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

    // Same Δg for both (same orbit); only gₚ differs, so the comparison isolates gₚ.
    crewExplain: {
      eyebrow: 'Crew briefing · challenge 2 of 2',
      claim: 'Miller’s planet has 130% of Earth’s gravity. That stronger gravity is what heaps the water up so high.',
      prompt: 'Do you agree? Explain what ' + S.dg + ' and ' + S.gp + ' each do.',
      dg: 2.6,
      planets: [
        { id: 'twin', name: 'Earth-gravity twin', short: 'Twin', gp: 1 },
        { id: 'miller', name: 'Miller’s planet', short: 'Miller’s', gp: 1.3 }
      ],
      // Feature focusing: gₚ is shown as the only difference; Δg is shown as the same for both,
      // without its ×2.6 factor (a factor badge reads as "this differs").
      diffLabel: 'Only difference',
      sameLabel: 'Same for both',
      sameNote: 'Both planets share the same orbit close to Gargantua, so ' + S.dg + ' is large — and identical — for both.',
      stances: [
        { id: 'agree', text: 'Agree' },
        { id: 'disagree', text: 'Disagree', correct: true }
      ],
      correctTitle: 'Correct — the stronger gravity makes the bulge smaller, not taller.',
      correctBody: 'In the same orbit, the Earth-gravity twin’s modelled bulge is 10.4 m; Miller’s planet’s is 8 m. The extra 30% gravity resists the stretch.',
      notYetTitle: 'Not yet — the stronger gravity makes the bulge smaller.',
      expert: 'Disagree. Gargantua’s ' + S.dg + ' — the difference in its pull across the planet — does the stretching, and it’s the same in both cases. Miller’s 130% gravity pulls the ocean back toward the centre, resisting that stretch, so its modelled bulge is smaller: 10.4 m ÷ 1.3 = 8 m. The water is high because ' + S.dg + ' is large, in spite of the strong gravity.',
      agreeFeedback: 'The planet’s gravity points inward, toward its centre. It holds the ocean down; it doesn’t lift it. In the same orbit, Miller’s stronger ' + S.gp + ' gives a <em>smaller</em> bulge (8 m) than an Earth-gravity twin (10.4 m).',
      selfCheck: [
        { id: 'dg', html: 'My explanation said ' + S.dg + ' (the difference in Gargantua’s pull) drives the stretching.' },
        { id: 'gp', html: 'My explanation said ' + S.gp + ' (the planet’s gravity) resists the stretching.' }
      ],
      hints: function () {
        return [
          { title: 'What’s the same?', html: 'Both planets sit in the same orbit, so ' + S.dg + ', R and k are the same. Only ' + S.gp + ' differs.', cue: { inputs: true } },
          { title: 'Which way does gₚ point?', html: 'The cyan arrows point inward. The planet’s gravity holds its ocean down, toward its centre.', cue: { diagram: 'gp' } },
          { title: 'Find it in the model', html: S.gp + ' is on the bottom of the fraction: a larger ' + S.gp + ' gives a smaller ' + S.h + '.', cue: { eq: ['gp'] } },
          { title: 'Worked example (different case)', html: 'Two moons feel the same ' + S.dg + '; one has half the surface gravity. Its bulge is twice as tall, because weaker gravity resists the stretching less.', cue: { worked: true } }
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
    }
  };
}());
