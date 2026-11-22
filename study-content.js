/*
 * Tidal Forecast Mission — study content: consent, pretest, posttest and learner survey.
 *
 * The items match the tuned pre/posttest (22 Nov 2026). ANSWER KEYS ARE NOT IN THIS FILE, on
 * purpose: the repository is public. The module records each learner's raw choices and the
 * scoring is done afterwards, from the private answer key.
 *
 * Choices are recorded by position: 0 = the first option as written, and so on. "I'm not sure"
 * is recorded as 'unsure', never as a number. Keep the option order as it is: the answer key's
 * letters depend on it.
 *
 * Strings may contain simple HTML (authored content, never learner input).
 */
(function () {
  'use strict';

  var G = '<i>g</i><sub>p</sub>';
  var DG = 'Δ<i>g</i>';

  var HALF = ['halves', 'stays the same', 'doubles'];

  var MEANINGS = [
    'the height of the tidal bulge',
    'the near-to-far difference in the outside body’s pull across the planet',
    'the planet’s own surface gravity',
    'the planet’s radius',
    'the outside body’s pull at the planet’s surface',
    'the combined gravity of the planet and the outside body'
  ];
  var MATCH_STEM = 'A planet’s tidal bulge can be modeled with the equation below, where <i>k</i> = 2 for every planet. ' +
    'Match each symbol to its meaning. Two meanings are not used.';

  function readings(body, vals, change) {
    return '<table class="t-readings"><caption class="sr-only">' + body + '’s pull at three points</caption>' +
      '<thead><tr><th scope="col">' + body + '’s pull (units)</th><th scope="col">Near side</th><th scope="col">Center</th><th scope="col">Far side</th></tr></thead>' +
      '<tbody><tr><th scope="row">Before</th><td>' + vals[0] + '</td><td>' + vals[1] + '</td><td>' + vals[2] + '</td></tr>' +
      '<tr><th scope="row">Change</th><td>' + change + '</td><td>' + change + '</td><td>' + change + '</td></tr></tbody></table>';
  }

  function miller(prefix) {
    return {
      id: prefix + '_9', item: '9', title: 'Miller’s planet',
      stem: 'In <em>Interstellar</em>, Miller’s planet orbits very close to Gargantua, and the crew meets an enormous wave. ' +
        'Compare the same planet in its current orbit and in a farther orbit. The planet and <i>k</i> stay the same.',
      eq: 'model',
      after: 'The model predicts a higher bulge in the closer orbit because <b>[blank 1]</b> is larger there. It is larger because <b>[blank 2]</b>.',
      parts: [
        { key: prefix + '_9_d1', kind: 'select', label: 'Blank 1',
          options: ['<i>k</i>, the model constant', DG + ', the difference in Gargantua’s pull across the planet', G + ', the planet’s surface gravity', '<i>R</i>, the planet’s radius'] },
        { key: prefix + '_9_d2', kind: 'select', label: 'Blank 2',
          options: ['the model constant grows as the planet gets closer', 'Gargantua’s gravity adds to the planet’s own surface gravity',
            'Gargantua’s pull changes more over the same distance when the planet is closer', 'a closer orbit makes the planet bigger'] }
      ]
    };
  }

  var PRE = [
    {
      id: 'pre_0', item: '0', title: 'Two spacecraft', scored: false,
      fig: { src: 'assets/test/item0-spacecraft.svg', w: 500, h: 180,
        alt: 'A planet and two spacecraft on one line. A is 10,000 km from the planet’s center and B is 20,000 km.',
        caption: 'Distances are measured from the planet’s center. Not to scale.' },
      stem: 'Two spacecraft have the same mass. Use the equation below, where <i>d</i> is the distance from the planet’s center. ' +
        'How does the planet’s pull on B compare with its pull on A?',
      eq: 'force',
      parts: [{ key: 'pre_0', kind: 'mc', options: ['Half as strong', 'One quarter as strong', 'Twice as strong', 'The same'] }]
    },
    {
      id: 'pre_1', item: '1', title: 'Pull across a planet',
      fig: { src: 'assets/test/item1-pre.svg', w: 520, h: 215,
        alt: 'A planet with the Moon on the right. A is on the near side, B at the center, C on the far side.' },
      stem: 'Point A is on the side of the planet closest to the Moon. Point B is at the planet’s center. Point C is on the side farthest from the Moon. ' +
        'Which statement correctly compares the Moon’s pull (gravitational acceleration) at A, B and C?',
      parts: [{ key: 'pre_1', kind: 'mc', options: ['Greatest at B, smaller at A and C', 'Greatest at A, then B, smallest at C', 'The same at A, B and C', 'Greatest at C, then B, smallest at A'] }]
    },
    {
      id: 'pre_2', item: '2', title: 'Why the ocean stretches',
      stem: 'The Moon’s gravity acts on every part of a planet. Which statement best explains why the ocean bulges on the side facing the Moon <em>and</em> on the side facing away?',
      parts: [{ key: 'pre_2', kind: 'mc', options: [
        'The Moon pulls the near side toward itself and pushes the far side away.',
        'The Moon pulls the near side, center and far side equally.',
        'The Moon pulls every part toward itself: the near side more than the center, and the far side less. That difference stretches the ocean.',
        'The Moon pulls the center more than either side.'] }]
    },
    {
      id: 'pre_3', item: '3', title: 'The same change everywhere',
      table: readings('Moon', [9, 8, 7], '+3'),
      stem: 'The Moon’s pull grows by the same amount at every point on the planet. Nothing about the planet changes. What happens to the tidal bulge?',
      parts: [{ key: 'pre_3', kind: 'mc', options: [
        'It grows, because the pull is stronger everywhere.',
        'It stays the same, because the near-to-far difference in pull has not changed.',
        'It shrinks, because the whole planet is pulled toward the Moon.',
        'It grows, because the far side is pushed away harder.'] }]
    },
    {
      id: 'pre_4', item: '4', title: 'A heavier or lighter moon',
      stem: 'A moon is replaced by a heavier moon at the same distance. Nothing about the planet changes.',
      parts: [
        { key: 'pre_4a', kind: 'mc', label: '4a. The near-to-far difference in pull (' + DG + ') will…', options: ['increase', 'decrease', 'stay the same'] },
        { key: 'pre_4b', kind: 'mc', label: '4b. Why?', options: [
          'A heavier moon pulls every point harder, so the gap between near-side and far-side pull grows too.',
          'A heavier moon pushes the far side away harder.',
          DG + ' depends only on distance, not on the moon’s mass.',
          'A heavier moon increases the planet’s own gravity.'] }
      ]
    },
    {
      id: 'pre_5', item: '5', title: 'What the symbols mean',
      stem: MATCH_STEM, eq: 'model',
      parts: [{ key: 'pre_5', kind: 'match', options: MEANINGS, rows: [
        { key: 'pre_5_h', symbol: '<i>h</i>' }, { key: 'pre_5_dg', symbol: DG }, { key: 'pre_5_gp', symbol: G }, { key: 'pre_5_R', symbol: '<i>R</i>' }] }]
    },
    {
      id: 'pre_6a', item: '6a', title: 'Changing the planet’s gravity',
      stem: 'A planet’s own surface gravity ' + G + ' doubles. ' + DG + ' and <i>R</i> stay the same.', eq: 'model',
      parts: [
        { key: 'pre_6a_1', kind: 'mc', label: 'The bulge height <i>h</i>…', options: HALF.concat(['becomes four times as high']) },
        { key: 'pre_6a_2', kind: 'mc', label: 'What is the physical reason?', options: [
          'Stronger own gravity holds the ocean down harder, so the same difference in pull stretches it less.',
          'Stronger own gravity adds to the outside pull, so the ocean stretches more.',
          '<i>h</i> depends only on the outside body’s pull, so the planet’s gravity doesn’t matter.',
          'Stronger gravity shrinks the planet, so the bulge has less room.'] }
      ]
    },
    {
      id: 'pre_6b', item: '6b', title: 'Changing the planet’s size',
      stem: 'A planet’s radius <i>R</i> halves. ' + DG + ' and ' + G + ' stay the same.', eq: 'model',
      parts: [
        { key: 'pre_6b_1', kind: 'mc', label: 'The bulge height <i>h</i>…', options: HALF.concat(['becomes one quarter as high']) },
        { key: 'pre_6b_2', kind: 'mc', label: 'What is the physical reason?', options: [
          'The ocean stretches by the same fraction of the planet’s size, so on a smaller planet that stretch is shorter.',
          '<i>h</i> depends on <i>R</i> squared.',
          '<i>h</i> depends only on ' + DG + ', so the radius doesn’t matter.',
          'A smaller planet’s ocean is pulled less by the outside body.'] }
      ]
    },
    {
      id: 'pre_7', item: '7', title: 'A moon changes orbit',
      stem: 'A planet’s tidal bulge is 6 m high. Its moon drifts farther away. Now the near side is pulled only a little more than the far side: ' +
        'the gap is half what it was. The planet itself does not change.', eq: 'model',
      parts: [
        { key: 'pre_7a', kind: 'mc', label: '7a. Which input in the model changed?', options: ['<i>k</i>', DG, G, '<i>R</i>'] },
        { key: 'pre_7b', kind: 'num', label: '7b. What is the new bulge height?', unit: 'm' }
      ]
    },
    {
      id: 'pre_8', item: '8', title: 'Calculate the bulge',
      stem: 'Use the model with <i>k</i> = 2, ' + DG + ' = 0.00002 m/s², ' + G + ' = 10 m/s² and <i>R</i> = 3,000,000 m.', eq: 'model',
      parts: [{ key: 'pre_8', kind: 'num', prefix: '<i>h</i> =', unit: 'm' }]
    },
    miller('pre')
  ];

  var POST = [
    {
      id: 'post_1', item: '1', title: 'Pull across a planet',
      fig: { src: 'assets/test/item1-post.svg', w: 520, h: 215,
        alt: 'A planet with the Moon on the left. X is on the near side, Y at the center, Z on the far side.' },
      stem: 'Point X is on the side of the planet closest to the Moon. Point Y is at the planet’s center. Point Z is on the side farthest from the Moon. ' +
        'Which statement correctly compares the Moon’s pull (gravitational acceleration) at X, Y and Z?',
      parts: [{ key: 'post_1', kind: 'mc', options: ['Greatest at Y, smaller at X and Z', 'The same at X, Y and Z', 'Greatest at Z, then Y, smallest at X', 'Greatest at X, then Y, smallest at Z'] }]
    },
    {
      id: 'post_2', item: '2', title: 'Why the ocean stretches',
      stem: 'A planet orbits close to a star. The star’s gravity acts on every part of the planet. Which statement best explains why the ocean bulges on the side facing the star <em>and</em> on the side facing away?',
      parts: [{ key: 'post_2', kind: 'mc', options: [
        'The star pulls the center more than either side.',
        'The star pulls every part toward itself: the near side more than the center, and the far side less. That difference stretches the ocean.',
        'The star pulls the near side toward itself and pushes the far side away.',
        'The star pulls the near side, center and far side equally.'] }]
    },
    {
      id: 'post_3', item: '3', title: 'The same change everywhere',
      table: readings('Star', [12, 10, 8], '−4'),
      stem: 'The star’s pull weakens by the same amount at every point on the planet. Nothing about the planet changes. What happens to the tidal bulge?',
      parts: [{ key: 'post_3', kind: 'mc', options: [
        'It shrinks, because the pull is weaker everywhere.',
        'It grows, because the whole planet is pulled less.',
        'It stays the same, because the near-to-far difference in pull has not changed.',
        'It shrinks, because the far side is pushed away less.'] }]
    },
    {
      id: 'post_4', item: '4', title: 'A heavier or lighter moon',
      stem: 'A moon is replaced by a lighter moon at the same distance. Nothing about the planet changes.',
      parts: [
        { key: 'post_4a', kind: 'mc', label: '4a. The near-to-far difference in pull (' + DG + ') will…', options: ['increase', 'decrease', 'stay the same'] },
        { key: 'post_4b', kind: 'mc', label: '4b. Why?', options: [
          'A lighter moon pushes the far side away less.',
          DG + ' depends only on distance, not on the moon’s mass.',
          'A lighter moon pulls every point less, so the gap between near-side and far-side pull shrinks too.',
          'A lighter moon decreases the planet’s own gravity.'] }
      ]
    },
    {
      id: 'post_5', item: '5', title: 'What the symbols mean',
      stem: MATCH_STEM, eq: 'model',
      parts: [{ key: 'post_5', kind: 'match', options: MEANINGS, rows: [
        { key: 'post_5_R', symbol: '<i>R</i>' }, { key: 'post_5_gp', symbol: G }, { key: 'post_5_h', symbol: '<i>h</i>' }, { key: 'post_5_dg', symbol: DG }] }]
    },
    {
      id: 'post_6a', item: '6a', title: 'Changing the planet’s gravity',
      stem: 'A planet’s own surface gravity ' + G + ' halves. ' + DG + ' and <i>R</i> stay the same.', eq: 'model',
      parts: [
        { key: 'post_6a_1', kind: 'mc', label: 'The bulge height <i>h</i>…', options: HALF.concat(['becomes four times as high']) },
        { key: 'post_6a_2', kind: 'mc', label: 'What is the physical reason?', options: [
          '<i>h</i> depends only on the outside body’s pull, so the planet’s gravity doesn’t matter.',
          'Weaker own gravity holds the ocean down less, so the same difference in pull stretches it more.',
          'Weaker own gravity takes away from the outside pull, so the ocean stretches less.',
          'Weaker gravity lets the planet expand, so the bulge has more room.'] }
      ]
    },
    {
      id: 'post_6b', item: '6b', title: 'Changing the planet’s size',
      stem: 'A planet’s radius <i>R</i> doubles. ' + DG + ' and ' + G + ' stay the same.', eq: 'model',
      parts: [
        { key: 'post_6b_1', kind: 'mc', label: 'The bulge height <i>h</i>…', options: HALF.concat(['becomes four times as high']) },
        { key: 'post_6b_2', kind: 'mc', label: 'What is the physical reason?', options: [
          '<i>h</i> depends on <i>R</i> squared.',
          '<i>h</i> depends only on ' + DG + ', so the radius doesn’t matter.',
          'A bigger planet’s ocean is pulled more by the outside body.',
          'The ocean stretches by the same fraction of the planet’s size, so on a bigger planet that stretch is taller.'] }
      ]
    },
    {
      id: 'post_7', item: '7', title: 'A moon changes orbit',
      stem: 'A planet’s tidal bulge is 8 m high. Its moon moves closer. Now the near side is pulled much more than the far side: ' +
        'the gap is twice what it was. The planet itself does not change.', eq: 'model',
      parts: [
        { key: 'post_7a', kind: 'mc', label: '7a. Which input in the model changed?', options: ['<i>k</i>', DG, G, '<i>R</i>'] },
        { key: 'post_7b', kind: 'num', label: '7b. What is the new bulge height?', unit: 'm' }
      ]
    },
    {
      id: 'post_8', item: '8', title: 'Calculate the bulge',
      stem: 'Use the model with <i>k</i> = 2, ' + DG + ' = 0.00003 m/s², ' + G + ' = 15 m/s² and <i>R</i> = 2,500,000 m.', eq: 'model',
      parts: [{ key: 'post_8', kind: 'num', prefix: '<i>h</i> =', unit: 'm' }]
    },
    miller('post')
  ];

  var LIKE = ['Didn’t like them at all', 'Didn’t like them much', 'They were OK', 'Liked them', 'Loved them'];

  window.TFM_STUDY = {
    version: 'tests@2026-11-22',

    /* Supabase project that receives the data. Leave url empty to collect nothing (the module
       then works as before and keeps everything in the browser). The key is the project's
       publishable (anon) key: it is meant to be public, and the tables only accept new rows. */
    supabase: {
      url: '',
      key: '',
      snapshotsTable: 'session_snapshots',
      eventsTable: 'events'
    },

    storageKey: 'tfm.study.v1',
    outboxKey: 'tfm.outbox.v1',

    consent: {
      // Final wording (chosen 22 Nov 2026). Set draft to true while editing it: author pages on
      // localhost then show a reminder.
      draft: false,
      eyebrow: 'Before you start',
      title: 'Taking part in this study',
      body: [
        'This mission is part of a class research project at Carnegie Mellon University on how people learn about gravity and tides.',
        'If you agree, you will answer a short quiz (about 5 minutes), play the mission (about 30 minutes), answer a second short quiz and a few questions about the mission. The quizzes are not graded.',
        'We record your answers, your clicks and how long each part takes. We do not ask for your name or email, and the data is linked only to a random code.',
        'Taking part is voluntary. You can stop at any time by closing the page.'
      ],
      question: 'Do you agree to take part?',
      yes: 'Yes, I agree to take part',
      no: 'No, I do not agree',
      next: 'Continue',
      declinedTitle: 'Thanks for letting us know',
      declinedBody: 'Nothing you do on this page will be recorded. You can still try the mission if you like, or close the page.',
      declinedTry: 'Try the mission anyway'
    },

    // Neither test offers "I'm not sure": every question asks for a best guess. To bring the
    // option back (as the last choice of every question and dropdown), set offerUnsure to true,
    // here for both tests or inside pretest / posttest for one, and give that test directions
    // and an `unanswered` reminder that mention it.
    offerUnsure: false,
    directions: 'Use the equations and diagrams given. Choose the best answer, even if you’re not sure: a best guess is fine. ' +
      'You can’t go back to a question once you move on.',

    /* How the study pages join the mission. Each study page's small heading (eyebrow) is the
       name of its stop in `journey`, and the progress line on the in-between pages and the test
       intro pages uses the same four names. The mission's own pages keep their wording; where a
       line has to change with the study on (the note under Finish mission, the closing line on
       the complete screen), it is under `mission` below. */
    journey: ['Quick check', 'Mission', 'Last check', 'Your thoughts'],

    pretest: {
      eyebrow: 'Quick check',
      title: 'A quick check before you start',
      lede: 'Answer what you can. This is not graded, and nobody expects you to know these yet.',
      start: 'Start the check',
      done: 'Check complete.',
      // The page between the pretest and the mission. It leads straight into the mission's start
      // screen, which gives the time and the film clips, so it doesn't repeat them.
      // Facts (optional) show with an icon: one of clock, sound, info, check, radio.
      thanks: {
        eyebrow: 'Quick check done',
        title: 'Thanks for your answers!',
        lede: 'Next comes the mission itself. You’re the Endurance’s science analyst, and the crew needs your tide forecast before they land.',
        facts: [],
        go: 'Go to the mission'
      },
      items: PRE
    },
    posttest: {
      // The page between the mission and the posttest. The mission summary just before it already
      // said "Mission complete", so this page looks ahead: the last check, then home.
      transition: {
        eyebrow: 'Before you head home',
        title: 'Great work, analyst!',
        lede: 'You forecast the wave on Miller’s planet and made the landing call. One last short check and a few questions, and the Endurance can head home.',
        facts: [
          { icon: 'clock', text: 'About 5 minutes' },
          { icon: 'check', text: 'Not graded' }
        ],
        go: 'Continue to the last check'
      },
      eyebrow: 'Last check',
      title: 'One last check',
      lede: 'Some of these questions look like the ones from the start. Answer them with what you know now.',
      start: 'Start the check',
      items: POST
    },
    // Mission lines that change while the study is on.
    mission: {
      // Under Finish mission on the summary (and Go deeper) page. The module's rule: the line
      // under a button that says what comes next starts "Next: …".
      finishNote: 'Next: one last short check, about 5 minutes.',
      // On the complete screen, after the survey.
      closing: 'That’s everything. Thank you for taking part! You can close this page now.'
    },
    unsure: 'I’m not sure',
    next: 'Next',
    finishTest: 'Submit',
    numPlaceholder: 'Type a number',
    selectPlaceholder: 'Choose…',
    unanswered: 'You haven’t answered every part. Choose your best guess, or press <b>Next</b> again to skip.',

    survey: {
      eyebrow: 'Your thoughts',
      title: 'What did you think?',
      lede: 'You’re almost done! Tell us what you thought of the mission. There are no right or wrong answers.',
      submit: 'Finish',
      // Answers are coded 1–5 in the order written. None are required.
      questions: [
        { key: 'srv_1', q: 'Overall, how much did you enjoy the Tidal Forecast Mission?', options: ['Not at all', 'A little', 'Somewhat', 'Quite a bit', 'A lot'] },
        { key: 'srv_2', q: 'What did you think of the visuals (the planet diagrams, animations and charts)?', options: LIKE },
        { key: 'srv_3', q: 'What did you think of the <em>Interstellar</em> film clips?', options: LIKE },
        { key: 'srv_4', q: 'What did you think of the mission story (being the crew’s science analyst and deciding whether they can land)?', options: LIKE },
        { key: 'srv_5', q: 'What did you think of the hands-on activities (ranking, predicting and running tests in the Tide Lab)?', options: LIKE },
        { key: 'srv_6', q: 'What did you think of the hints and explanations?', options: LIKE },
        { key: 'srv_7', q: 'How easy was the mission to follow?', options: ['Very confusing', 'A bit confusing', 'OK', 'Mostly clear', 'Very clear'] },
        { key: 'srv_8', q: 'How was the length?', options: ['Too short', 'A bit short', 'About right', 'A bit long', 'Too long'] },
        { key: 'srv_9', q: 'How hard was it?', options: ['Too easy', 'A bit easy', 'About right', 'A bit hard', 'Too hard'] },
        { key: 'srv_10', q: 'Would you like to learn other science topics this way?', options: ['No', 'Probably not', 'Not sure', 'Probably yes', 'Yes'] }
      ]
    }
  };
}());
