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

  /* Wording rules for the items (revised 23 Nov 2026, after the pilot):
     - one name per idea: "the difference in pull between the near side and the far side"
       (not "near-to-far difference", "gap" or "across the planet");
     - the pull is "stronger / weaker" at a point, and a body "pulls harder / less";
     - the stem says only what the diagram or table doesn't already show;
     - the options of one question are about the same length, so length is no clue;
     - no item explains a symbol that a later item asks about (item 4 does not name Δg,
       because item 5 asks what Δg means).
     Option order is unchanged from the piloted version, so the answer key still applies. */
  var NEAR_FAR = 'between the near side and the far side';

  var MEANINGS = [
    'the height of the tidal bulge',
    'the difference in the outside body’s pull between the near and far sides', // short enough to fit its dropdown
    'the planet’s own surface gravity',
    'the planet’s radius',
    'the outside body’s pull at the planet’s surface',
    'the combined gravity of the planet and the outside body'
  ];
  var MATCH_STEM = 'A planet’s tidal bulge can be modeled with the equation below, where <i>k</i> = 2 for every planet. ' +
    'The “outside body” is the moon, star or black hole that pulls on the planet. ' +
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
      stem: 'In <em>Interstellar</em>, Miller’s planet orbits very close to the black hole Gargantua, and the crew meets an enormous wave. ' +
        'Suppose the same planet orbited farther away. The planet itself and <i>k</i> would not change.',
      eq: 'model',
      // Two questions with every option in view (they were two dropdowns under a sentence with
      // "[blank 1]" and "[blank 2]"). Same keys, same options in the same order.
      parts: [
        { key: prefix + '_9_d1', kind: 'mc', label: 'The model predicts a higher bulge in the close orbit because one input is larger there. Which one?',
          options: ['<i>k</i>, the constant in the model', DG + ', the difference in Gargantua’s pull on the two sides', G + ', the planet’s own surface gravity', '<i>R</i>, the radius of the planet'] },
        { key: prefix + '_9_d2', kind: 'mc', label: 'Why is it larger in the close orbit?',
          options: ['The model constant <i>k</i> grows as the planet gets closer.', 'Gargantua’s gravity adds to the planet’s own surface gravity.',
            'Up close, Gargantua’s pull differs more between the planet’s two sides.', 'Being in a close orbit makes the planet itself bigger.'] }
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
      stem: 'A, B and C are three points on a planet, as the diagram shows. How does the Moon’s pull compare at the three points?',
      parts: [{ key: 'pre_1', kind: 'mc', options: ['Strongest at B, weaker at A and C', 'Strongest at A, then B, weakest at C', 'The same at A, B and C', 'Strongest at C, then B, weakest at A'] }]
    },
    {
      id: 'pre_2', item: '2', title: 'Why the ocean stretches',
      stem: 'A planet’s ocean bulges on the side facing the Moon (the near side) <em>and</em> on the side facing away (the far side). Which statement best explains why?',
      parts: [{ key: 'pre_2', kind: 'mc', options: [
        'The Moon pulls the near side toward it and pushes the far side away.',
        'The Moon pulls the near side, the center and the far side equally hard.',
        'The Moon pulls the near side hardest and the far side least, which stretches the ocean.',
        'The Moon pulls the center harder than it pulls either side.'] }]
    },
    {
      id: 'pre_3', item: '3', title: 'The same change everywhere',
      table: readings('Moon', [9, 8, 7], '+3'),
      stem: 'The table shows the Moon’s pull at three points on a planet. The pull then grows by 3 units at every point. Nothing about the planet changes. What happens to the tidal bulge?',
      parts: [{ key: 'pre_3', kind: 'mc', options: [
        'It grows, because the pull is now stronger at every point on the planet.',
        'It stays the same, because the difference between the two sides has not changed.',
        'It shrinks, because the whole planet is pulled harder toward the Moon.',
        'It grows, because the far side is now pushed away harder than before.'] }]
    },
    {
      id: 'pre_4', item: '4', title: 'A heavier or lighter moon',
      stem: 'A moon is replaced by a heavier moon at the same distance. Nothing about the planet changes.',
      parts: [
        { key: 'pre_4a', kind: 'mc', label: 'The difference in the moon’s pull ' + NEAR_FAR + ' will…', options: ['increase', 'decrease', 'stay the same'] },
        { key: 'pre_4b', kind: 'mc', label: 'Why?', options: [
          'A heavier moon pulls every point harder, so the difference grows too.',
          'A heavier moon pushes the far side away harder than before.',
          'The difference depends only on distance, not on the moon’s mass.',
          'A heavier moon makes the planet’s own gravity stronger.'] }
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
        { key: 'pre_6a_2', kind: 'mc', label: 'Why?', options: [
          'The planet’s stronger gravity holds the ocean down harder, so it stretches less.',
          'The planet’s stronger gravity adds to the outside pull, so the ocean stretches more.',
          '<i>h</i> depends only on the outside body’s pull, so the planet’s gravity doesn’t matter.',
          'The planet’s stronger gravity shrinks the planet, so the bulge has less room.'] }
      ]
    },
    {
      id: 'pre_6b', item: '6b', title: 'Changing the planet’s size',
      stem: 'A planet’s radius <i>R</i> halves. ' + DG + ' and ' + G + ' stay the same.', eq: 'model',
      parts: [
        { key: 'pre_6b_1', kind: 'mc', label: 'The bulge height <i>h</i>…', options: HALF.concat(['becomes one quarter as high']) },
        { key: 'pre_6b_2', kind: 'mc', label: 'Why?', options: [
          'The stretch is a fixed fraction of the planet’s size, so a smaller planet gets a smaller bulge.',
          '<i>h</i> depends on <i>R</i> squared, so the bulge changes even more than <i>R</i> does.',
          '<i>h</i> depends only on ' + DG + ', so the planet’s radius doesn’t matter.',
          'The outside body pulls less on a smaller planet’s ocean, so it stretches less.'] }
      ]
    },
    {
      id: 'pre_7', item: '7', title: 'A moon changes orbit',
      stem: 'A planet’s tidal bulge is 6 m high. Then its moon moves farther away, and the difference in its pull ' + NEAR_FAR +
        ' drops to half of what it was. The planet itself does not change.', eq: 'model',
      parts: [
        { key: 'pre_7a', kind: 'mc', label: 'Which input in the model changed?', options: ['<i>k</i>', DG, G, '<i>R</i>'] },
        { key: 'pre_7b', kind: 'num', label: 'What is the new bulge height?', unit: 'm' }
      ]
    },
    {
      id: 'pre_8', item: '8', title: 'Calculate the bulge',
      stem: 'Use the model and the values below. What is the height of the planet’s tidal bulge?', eq: 'model',
      values: [['<i>k</i>', '2'], [DG, '0.00002 m/s²'], [G, '10 m/s²'], ['<i>R</i>', '3,000,000 m']],
      parts: [{ key: 'pre_8', kind: 'num', prefix: '<i>h</i> =', unit: 'm' }]
    },
    miller('pre')
  ];

  var POST = [
    {
      id: 'post_1', item: '1', title: 'Pull across a planet',
      fig: { src: 'assets/test/item1-post.svg', w: 520, h: 215,
        alt: 'A planet with the Moon on the left. X is on the near side, Y at the center, Z on the far side.' },
      stem: 'X, Y and Z are three points on a planet, as the diagram shows. How does the Moon’s pull compare at the three points?',
      parts: [{ key: 'post_1', kind: 'mc', options: ['Strongest at Y, weaker at X and Z', 'The same at X, Y and Z', 'Strongest at Z, then Y, weakest at X', 'Strongest at X, then Y, weakest at Z'] }]
    },
    {
      id: 'post_2', item: '2', title: 'Why the ocean stretches',
      stem: 'A planet orbits close to a star. Its ocean bulges on the side facing the star (the near side) <em>and</em> on the side facing away (the far side). Which statement best explains why?',
      parts: [{ key: 'post_2', kind: 'mc', options: [
        'The star pulls the center harder than it pulls either side.',
        'The star pulls the near side hardest and the far side least, which stretches the ocean.',
        'The star pulls the near side toward it and pushes the far side away.',
        'The star pulls the near side, the center and the far side equally hard.'] }]
    },
    {
      id: 'post_3', item: '3', title: 'The same change everywhere',
      table: readings('Star', [12, 10, 8], '−4'),
      stem: 'The table shows a star’s pull at three points on a planet. The pull then weakens by 4 units at every point. Nothing about the planet changes. What happens to the tidal bulge?',
      parts: [{ key: 'post_3', kind: 'mc', options: [
        'It shrinks, because the pull is now weaker at every point on the planet.',
        'It grows, because the whole planet is pulled less hard toward the star.',
        'It stays the same, because the difference between the two sides has not changed.',
        'It shrinks, because the far side is now pushed away less than before.'] }]
    },
    {
      id: 'post_4', item: '4', title: 'A heavier or lighter moon',
      stem: 'A moon is replaced by a lighter moon at the same distance. Nothing about the planet changes.',
      parts: [
        { key: 'post_4a', kind: 'mc', label: 'The difference in the moon’s pull ' + NEAR_FAR + ' will…', options: ['increase', 'decrease', 'stay the same'] },
        { key: 'post_4b', kind: 'mc', label: 'Why?', options: [
          'A lighter moon pushes the far side away less than before.',
          'The difference depends only on distance, not on the moon’s mass.',
          'A lighter moon pulls every point less, so the difference shrinks too.',
          'A lighter moon makes the planet’s own gravity weaker.'] }
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
        { key: 'post_6a_2', kind: 'mc', label: 'Why?', options: [
          '<i>h</i> depends only on the outside body’s pull, so the planet’s gravity doesn’t matter.',
          'The planet’s weaker gravity holds the ocean down less, so it stretches more.',
          'The planet’s weaker gravity takes away from the outside pull, so the ocean stretches less.',
          'The planet’s weaker gravity lets the planet expand, so the bulge has more room.'] }
      ]
    },
    {
      id: 'post_6b', item: '6b', title: 'Changing the planet’s size',
      stem: 'A planet’s radius <i>R</i> doubles. ' + DG + ' and ' + G + ' stay the same.', eq: 'model',
      parts: [
        { key: 'post_6b_1', kind: 'mc', label: 'The bulge height <i>h</i>…', options: HALF.concat(['becomes four times as high']) },
        { key: 'post_6b_2', kind: 'mc', label: 'Why?', options: [
          '<i>h</i> depends on <i>R</i> squared, so the bulge changes even more than <i>R</i> does.',
          '<i>h</i> depends only on ' + DG + ', so the planet’s radius doesn’t matter.',
          'The outside body pulls more on a bigger planet’s ocean, so it stretches more.',
          'The stretch is a fixed fraction of the planet’s size, so a bigger planet gets a bigger bulge.'] }
      ]
    },
    {
      id: 'post_7', item: '7', title: 'A moon changes orbit',
      stem: 'A planet’s tidal bulge is 8 m high. Then its moon moves closer, and the difference in its pull ' + NEAR_FAR +
        ' doubles. The planet itself does not change.', eq: 'model',
      parts: [
        { key: 'post_7a', kind: 'mc', label: 'Which input in the model changed?', options: ['<i>k</i>', DG, G, '<i>R</i>'] },
        { key: 'post_7b', kind: 'num', label: 'What is the new bulge height?', unit: 'm' }
      ]
    },
    {
      id: 'post_8', item: '8', title: 'Calculate the bulge',
      stem: 'Use the model and the values below. What is the height of the planet’s tidal bulge?', eq: 'model',
      values: [['<i>k</i>', '2'], [DG, '0.00003 m/s²'], [G, '15 m/s²'], ['<i>R</i>', '2,500,000 m']],
      parts: [{ key: 'post_8', kind: 'num', prefix: '<i>h</i> =', unit: 'm' }]
    },
    miller('post')
  ];

  var LIKE = ['Didn’t like them at all', 'Didn’t like them much', 'They were OK', 'Liked them', 'Loved them'];
  // The same five answers for a singular subject (the story). Coded 1–5 in the same order.
  var LIKE_IT = ['Didn’t like it at all', 'Didn’t like it much', 'It was OK', 'Liked it', 'Loved it'];

  window.TFM_STUDY = {
    // 2026-11-23, after the pilot: the items were reworded for clarity (see the wording rules above
    // PRE), part labels lost their hard-coded numbers and the study stops were renamed. Keys,
    // option order and the numbers in every item are unchanged, so the answer key is the same.
    version: 'tests@2026-11-23',

    /* Supabase project that receives the data. Leave url empty to collect nothing (the module
       then works as before and keeps everything in the browser). The key is the project's
       publishable (anon) key: it is meant to be public, and the tables only accept new rows. */
    supabase: {
      url: 'https://wcbilkfmeubuyzklxruc.supabase.co',
      key: 'sb_publishable_EB6O47uXTZ41ROzjyCeOeQ_NTrHG7j4',
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
        'If you agree, you will answer a short quiz (about 8 minutes), play the mission (about 30 minutes), answer a second short quiz (about 8 minutes) and a few questions about the mission. The quizzes are not graded.',
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
      'We encourage you to use a calculator. You can’t go back to a question once you move on.',
    // How long each test takes, in minutes (from the pilot). Shown on the test intro pages; the
    // same figure is written out in consent.body, posttest.transition.facts and mission.finishNote.
    testMinutes: 8,

    /* How the study pages join the mission. Each study page's small heading (eyebrow) is the
       name of its stop in `journey` (not "check": the mission's phase 5 is called Quick Checks),
       and the progress line on the in-between pages and the test intro pages uses the same four
       names. The mission's own pages keep their wording; where a
       line has to change with the study on (the note under Finish mission, the closing line on
       the complete screen), it is under `mission` below. */
    journey: ['Starting questions', 'Mission', 'Final questions', 'Your thoughts'],

    pretest: {
      eyebrow: 'Starting questions',
      title: 'A few questions before you start',
      lede: 'This is not graded, and nobody expects you to know these yet. Just give your best guess on each one.',
      start: 'Start the questions',
      done: 'Questions complete.',
      // The page between the pretest and the mission. It leads straight into the mission's start
      // screen, which gives the time and the film clips, so it doesn't repeat them.
      // Facts (optional) show with an icon: one of clock, sound, info, check, radio.
      thanks: {
        eyebrow: 'Starting questions done',
        title: 'Thanks for your answers!',
        lede: 'Next comes the mission itself. You’re the Endurance’s science analyst, and the crew needs your tide forecast before they land.',
        facts: [],
        go: 'Go to the mission'
      },
      items: PRE
    },
    posttest: {
      // The page between the mission and the posttest. It looks ahead: the final questions, the
      // survey, then home. ("Mission complete" is kept for the last screen, after the survey.)
      transition: {
        eyebrow: 'Before you head home',
        title: 'Great work, analyst!',
        lede: 'You forecast the wave on Miller’s planet and made the landing call. A few final questions and a short survey, and the Endurance can head home.',
        facts: [
          { icon: 'clock', text: 'About 8 minutes' },
          { icon: 'check', text: 'Not graded' }
        ],
        go: 'Continue to the final questions'
      },
      eyebrow: 'Final questions',
      title: 'A few final questions',
      lede: 'Some of these questions look like the ones from the start. Answer them with what you know now.',
      start: 'Start the questions',
      items: POST
    },
    // Mission lines that change while the study is on.
    mission: {
      // Under Finish mission on the summary (and Go deeper) page. The module's rule: the line
      // under a button that says what comes next starts "Next: …".
      finishNote: 'Next: a few final questions, about 8 minutes.',
      // On the complete screen, after the survey. While the last answers are still on their way
      // to the server the page says so, and only then that it can be closed.
      saving: 'Saving your answers… Please keep this page open.',
      savingSlow: 'Still saving. Please check your connection and keep this page open.',
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
        { key: 'srv_4', q: 'What did you think of the mission story (being the crew’s science analyst and deciding whether they can land)?', options: LIKE_IT },
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
