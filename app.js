/*
 * Tidal Forecast Mission — interface logic.
 *
 * Depends on: model.js (window.TFMModel) for every calculation,
 *             content.js (window.TFM_CONTENT) for all wording and scenario values.
 *
 * Interaction states for every prediction task:
 *   awaiting prediction → prediction submitted → result shown →
 *   explanation submitted → feedback → continue
 *
 * A/B test (2.2.0): the two versions differ in when the learner meets the model. Version B
 *   (evidence first) runs the Tide Lab with no formula on screen and builds the model from the
 *   results; version A (formula first) is given the model before the Tide Lab and tests it.
 * Search for FORMULA_FIRST and V( to see every place the two versions differ.
 */
(function () {
  'use strict';

  var C = window.TFM_CONTENT;
  var M = window.TFMModel;
  var S = C.symbols;
  var BASE = C.baselineHeight;
  var GMAX = C.gauge.max;
  var f = M.fmt;

  var COL = {
    dg: '#f5b544', gp: '#4cd3e0', R: '#b497ff', ocean: '#2b5c8a', rock: '#1f2a38',
    white: '#ffffff', system: '#44c04a', notyet: '#ff8a7a', faint: '#8a8a8a'
  };

  var els = {
    head: document.getElementById('console-head'),
    stage: document.getElementById('stage-content'),
    stageScroll: document.getElementById('stage'),
    formula: document.getElementById('formula'),
    body: document.getElementById('console-body'),
    checkpoints: document.getElementById('checkpoints'),
    railHead: document.getElementById('rail-head'),
    evCount: document.getElementById('evidence-count'),
    live: document.getElementById('live'),
    dialog: document.getElementById('evidence-dialog'),
    dialogBody: document.getElementById('evidence-dialog-body'),
    app: document.getElementById('app'),
    screen: document.getElementById('screen'),
    devbar: document.getElementById('devbar'),
    devBtn: document.getElementById('dev-btn')
  };

  var motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  var narrowQuery = window.matchMedia('(max-width: 900px)');
  function reduced() { return motionQuery.matches; }

  /* Who is looking at the page. Learners see learner wording only.
     ?research=1 shows the session record, export and attempt-recording notes inline
     (use this link in studies). ?author=1, a local server or a file:// page also shows
     author notices such as unverified video boundaries. */
  var params = new URLSearchParams(window.location.search);
  var MODE = {
    research: params.has('research'),
    author: params.has('author') || window.location.protocol === 'file:' ||
      /^(localhost|127\.0\.0\.1|\[::1\])$/.test(window.location.hostname)
  };
  function forLearner(learnerText, researchText) { return MODE.research ? researchText : learnerText; }

  /* A/B test: which version of the module this page is (see abTest in content.js).
     ?v=a or ?v=b sets it. Without that, the browser keeps the version it was given before,
     and a new browser is assigned at random. It is fixed for the page's lifetime. */
  var AB = C.abTest;
  var COND = (params.get(AB.param) || '').toLowerCase();
  var ASSIGNED_BY = 'link';
  if (!AB.conditions[COND]) {
    var kept = null;
    try { kept = (window.localStorage.getItem(AB.assignKey) || '').split('|'); } catch (_) { /* storage blocked */ }
    if (kept && AB.conditions[kept[0]]) { COND = kept[0]; ASSIGNED_BY = kept[1] || 'random'; }
    else { COND = Math.random() < 0.5 ? 'a' : 'b'; ASSIGNED_BY = 'random'; }
  }
  try { window.localStorage.setItem(AB.assignKey, COND + '|' + ASSIGNED_BY); } catch (_) { /* storage blocked */ }
  var FORMULA_FIRST = !!AB.conditions[COND].formulaFirst;
  // Version A's step order: the model page closes the Pre-flight Check. Everything that walks
  // the mission (the rail, positions, the developer bar) reads C.steps, so it is set once here.
  if (AB.conditions[COND].steps) {
    C.steps = C.steps.map(function (st) {
      var acts = AB.conditions[COND].steps[st.id];
      return acts ? { id: st.id, label: st.label, activities: acts } : st;
    });
  }
  function activityLabel(id) { return (AB.conditions[COND].activityLabels || {})[id] || C.activityLabels[id]; }
  // Wording that differs between the versions sits beside its default in content.js, in a
  // `formulaFirst` object. V picks the one for this page.
  function V(obj, key) {
    return FORMULA_FIRST && obj.formulaFirst && obj.formulaFirst[key] != null ? obj.formulaFirst[key] : obj[key];
  }
  // Each version keeps its own saved session, so one browser can't resume A's progress in B.
  var STORE_KEY = C.storageKey + '.' + COND;
  // The same page in the other version (used by the developer bar).
  function conditionHref(cond) {
    var q = new URLSearchParams(window.location.search);
    q.set(AB.param, cond);
    var s = q.toString();
    return window.location.pathname + (s ? '?' + s : '');
  }

  /* ===================================================================== *
   * Utilities
   * ===================================================================== */
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function nowISO() { return new Date().toISOString(); }
  function uid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
  }
  function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
  function snap(v) { return Math.round(v * 2) / 2; }
  function n2(x) { return Math.round(x * 100) / 100; }
  function pct(v) { return (clamp(v, 0, GMAX) / GMAX * 100).toFixed(2) + '%'; }
  function times(x) { return '×' + f(x); }
  function fmtDuration(ms) {
    var s = Math.round((ms || 0) / 1000);
    var m = Math.floor(s / 60);
    return m + ':' + String(s % 60).padStart(2, '0');
  }
  function announce(msg) {
    els.live.textContent = '';
    window.setTimeout(function () { els.live.textContent = msg.replace(/<[^>]+>/g, ''); }, 40);
  }

  /* Inline icons (decorative; meaning is always also given in text). */
  var I = {
    check: '<svg class="ic" viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="8.2" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M6.3 10.4l2.4 2.4 5-5.2" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    retry: '<svg class="ic" viewBox="0 0 20 20" aria-hidden="true"><path d="M15.6 10.6A5.7 5.7 0 1 1 13.9 6" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/><path d="M14.6 2.8v3.8h-3.8" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    half: '<svg class="ic" viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="8.2" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M10 1.8a8.2 8.2 0 0 0 0 16.4z" fill="currentColor"/></svg>',
    lock: '<svg class="ic ic-sm" viewBox="0 0 16 16" aria-hidden="true"><rect x="3.2" y="7" width="9.6" height="6.8" rx="1.3" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M5.4 7V5.3a2.6 2.6 0 0 1 5.2 0V7" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>',
    bulb: '<svg class="ic" viewBox="0 0 20 20" aria-hidden="true"><path d="M10 2.5a5.3 5.3 0 0 0-3.1 9.6c.6.5.9 1.1.9 1.8v.6h4.4v-.6c0-.7.3-1.3.9-1.8A5.3 5.3 0 0 0 10 2.5z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M8 17h4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
    info: '<svg class="ic" viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="8.2" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M10 9v5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="10" cy="6.2" r="1.1" fill="currentColor"/></svg>',
    play: '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l10.5-6.5z" fill="currentColor"/></svg>',
    up: '<svg class="ic" viewBox="0 0 20 20" aria-hidden="true"><path d="M10 16V4M5 9l5-5 5 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    down: '<svg class="ic" viewBox="0 0 20 20" aria-hidden="true"><path d="M10 4v12M5 11l5 5 5-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    radio: '<svg class="ic" viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="11" r="1.8" fill="currentColor"/><path d="M6.6 14.4a4.8 4.8 0 0 1 0-6.8M13.4 7.6a4.8 4.8 0 0 1 0 6.8M4.2 16.8a8.2 8.2 0 0 1 0-11.6M15.8 5.2a8.2 8.2 0 0 1 0 11.6" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
    clock: '<svg class="ic" viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="8.2" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M10 5.5V10l3 2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    sound: '<svg class="ic" viewBox="0 0 20 20" aria-hidden="true"><path d="M3 8v4h3l4 3.5v-11L6 8z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M13 7.2a4 4 0 0 1 0 5.6M15.3 5a7 7 0 0 1 0 10" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
    close: '<svg class="ic" viewBox="0 0 20 20" aria-hidden="true"><path d="M5 5l10 10M15 5L5 15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    zoom: '<svg class="ic" viewBox="0 0 20 20" aria-hidden="true"><circle cx="8.5" cy="8.5" r="5.5" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M12.8 12.8L17 17M6.2 8.5h4.6M8.5 6.2v4.6" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
    grip: '<svg class="ic" viewBox="0 0 20 20" aria-hidden="true"><g fill="currentColor"><circle cx="7" cy="5" r="1.6"/><circle cx="13" cy="5" r="1.6"/><circle cx="7" cy="10" r="1.6"/><circle cx="13" cy="10" r="1.6"/><circle cx="7" cy="15" r="1.6"/><circle cx="13" cy="15" r="1.6"/></g></svg>'
  };

  /* ===================================================================== *
   * State & persistence (localStorage only — nothing is sent anywhere)
   * ===================================================================== */
  var ui = {
    hint: null,           // { act, level } while the hint panel is open
    animate: null,        // activity id whose result should animate on next render
    sketch: null,         // quick checks: { act, key, fromH } for the sketch part the learner just changed
    video: 'idle',        // 'idle' | 'player' | 'fallback'
    endVideo: 'idle',     // film ending: 'idle' | 'player' | 'fallback'
    videoReason: null,    // 'error' | 'chosen'
    confirmReset: false,
    defsOpen: false,      // equation-card definitions expanded (kept across re-renders)
    screen: null,         // full-page screen shown instead of the task layout: null | 'complete'
    nav: null,            // panel transition for the next render: null | 'fwd' | 'back' | 'fade'
    navSeq: 0,            // counts moves between tasks (keys the rail's "you are here" animation)
    hintOpens: 0,         // counts hint-panel openings (keys its unfold animation)
    enterSeen: {},        // [data-enter] keys already shown, so revisits don't replay entrances
    enterPrimed: false,   // false until the first render: nothing animates on page load
    lastEv: null,         // evidence count at the last render (bumps the top-bar count when it grows)
    flyEv: false,         // a finding was just earned: carry it up to the log on this render
    warpJump: false,      // the complete screen plays its jump to light speed on the next render
    motionKey: null,      // the full-page screen last drawn: drawing it again doesn't replay its entrance
    backdrop: null,       // what was behind the last render ('task' or a screen's backdrop): a change fades in
    cueShown: null,       // Tide Lab: the test attempt whose "what changed" cue has played
    storageOk: true
  };

  function freshEndingVideo() {
    return {
      start: C.video.ending.start, end: C.video.ending.end, boundaryStatus: C.video.ending.status,
      playRequestedAt: null, startedAt: null, reachedEndAt: null, skippedAt: null,
      fallbackShownAt: null, error: null
    };
  }

  function freshState() {
    return {
      schema: C.recordSchema,
      moduleId: C.moduleId,
      moduleVersion: C.moduleVersion,
      sessionId: uid(),
      condition: COND,
      assignment: ASSIGNED_BY, // 'link' (?v= in the address) or 'random'
      createdAt: nowISO(),
      updatedAt: nowISO(),
      completedAt: null,
      activeMs: 0,
      pos: { step: 0, sub: 0 },
      furthest: { step: 0, sub: 0 },
      firstIdea: null,
      video: {
        opening: {
          start: C.video.opening.start, end: C.video.opening.end, boundaryStatus: C.video.opening.status,
          playRequestedAt: null, startedAt: null, reachedEndAt: null, skippedAt: null,
          fallbackShownAt: null, error: null
        },
        ending: freshEndingVideo()
      },
      activities: {},
      evidence: [],
      stepIntros: {},      // { stepId: { shownAt, startedAt } } for the step intro pages
      coach: {}            // one-time pointers: { hint: { shownOn, seenAt }, hintLab: … }
    };
  }

  function load() {
    try {
      var raw = window.localStorage.getItem(STORE_KEY);
      if (!raw) return null;
      var s = JSON.parse(raw);
      if (!s || s.schema !== C.recordSchema || !s.pos || !s.activities) return null;
      // A session never changes version.
      if (s.condition !== COND) return null;
      return s;
    } catch (e) {
      ui.storageOk = false;
      return null;
    }
  }

  function save() {
    state.updatedAt = nowISO();
    try {
      window.localStorage.setItem(STORE_KEY, JSON.stringify(state));
      ui.storageOk = true;
    } catch (e) {
      ui.storageOk = false;
    }
  }

  var resumed = load();
  var state = resumed || freshState();
  if (!state.coach) state.coach = {};
  // Sessions saved before the film ending existed get its record added.
  if (!state.video.ending) state.video.ending = freshEndingVideo();
  if (!state.stepIntros) state.stepIntros = {};
  // Sessions saved before a task was removed may point past the end of a step.
  [state.pos, state.furthest].forEach(function (p) {
    if (!p) return;
    if (p.step >= C.steps.length) { p.step = C.steps.length - 1; p.sub = C.steps[p.step].activities.length - 1; }
    p.sub = Math.min(p.sub, C.steps[p.step].activities.length - 1);
  });

  /* Developer mode (for user testing): every section is unlocked and a bar under the
     top bar jumps anywhere. Anyone can switch it on with the "Dev" button or ?dev=1.
     The setting is kept in this browser, separate from the session record, so it
     survives Start over. Sessions where it was used carry a devMode entry in the export. */
  /* Since 2.3.0 (the study links): learners on the A and B links never see the "<>" button.
     It shows on the tester link (…/tester/, i.e. ?tester=1; ?dev=1 still works), which also
     turns developer mode on, and on author pages (localhost, file://, ?author=1). The setting
     lasts for this browser tab only (sessionStorage): a reload keeps it, and so does "Turn off",
     but a new tab, or the next person at the same computer, starts without it. */
  var DEV_KEY = 'tfm.devmode';
  var TESTER_LINK = params.has('tester') || params.has('dev');
  var DEV = { on: TESTER_LINK, available: TESTER_LINK || MODE.author };
  try {
    window.localStorage.removeItem(DEV_KEY); // the old browser-wide setting no longer applies
    var devKept = window.sessionStorage.getItem(DEV_KEY);
    if (devKept === null) { if (DEV.on) window.sessionStorage.setItem(DEV_KEY, '1'); }
    else { DEV.on = devKept === '1'; DEV.available = true; }
  } catch (_) { /* storage blocked: dev mode lasts for this page only */ }
  function noteDevUse() {
    if (!state.devMode) state.devMode = { enabledAt: nowISO(), jumps: [] };
  }
  if (DEV.on) noteDevUse();

  /* ---------------- study: consent, pretest, posttest, learner survey ---------------- */
  /* On by default; ?study=0 turns the study pages off (the module then runs as before and
     collects nothing). The study record has its own storage key and outlives "Start over",
     so a learner can't take the pretest twice. Answers are recorded raw: the answer key is
     kept out of this public repository and scoring happens afterwards. */
  var ST = window.TFM_STUDY;
  var LOG = window.TFMLog;
  var STUDY_WANTED = params.get('study') !== '0';
  var STUDY_ON = !!ST && STUDY_WANTED;
  // If study-content.js failed to load, stop rather than run the mission without consent.
  var STUDY_MISSING = STUDY_WANTED && !ST;

  function freshTest() {
    // transitionAt: when the learner left the page before the test (the posttest has one).
    return { transitionAt: null, startedAt: null, submittedAt: null, proceededAt: null, pos: -1, items: {} };
  }
  function freshStudy() {
    return {
      schema: 'tidal-forecast-mission/study-record@1',
      version: ST.version,
      participantId: uid(),
      createdAt: nowISO(),
      condition: COND,
      assignment: ASSIGNED_BY,
      consent: null,                // { choice: 'yes' | 'no', at, continuedAt? }
      pretest: freshTest(),
      posttest: freshTest(),
      survey: { shownAt: null, submittedAt: null, activeMs: 0, answers: {}, changes: [] },
      activeMs: 0,                  // visible time on the study pages (consent, tests, survey)
      devResets: []
    };
  }
  function loadStudy() {
    try {
      var raw = window.localStorage.getItem(ST.storageKey);
      var s = raw ? JSON.parse(raw) : null;
      if (s && s.schema === 'tidal-forecast-mission/study-record@1' && s.pretest && s.posttest && s.survey) return s;
    } catch (_) { /* storage blocked */ }
    return null;
  }
  function saveStudy() {
    if (!study) return;
    try { window.localStorage.setItem(ST.storageKey, JSON.stringify(study)); } catch (_) { /* storage blocked */ }
  }
  var study = STUDY_ON ? (loadStudy() || freshStudy()) : null;
  function studyActive() { return !!(study && study.consent && study.consent.choice === 'yes'); }
  // Data is recorded for a learner who agreed, and for a tester (developer mode, marked dev = true),
  // but never for someone who declined.
  function logAllowed() {
    return !!study && (studyActive() || (DEV.on && !(study.consent && study.consent.choice === 'no')));
  }

  // Data collection: on only after the learner agrees, and only if a Supabase project is set.
  function logContext() {
    if (!LOG) return;
    LOG.configure({ participantId: study ? study.participantId : null, sessionId: state.sessionId, condition: COND,
      moduleVersion: C.moduleVersion, dev: DEV.on });
  }
  function logOn() { if (LOG && logAllowed()) { logContext(); LOG.enable(true); } }
  function logEvent(type, data) { if (LOG && logAllowed()) LOG.event(type, data); }
  var lastSnapAt = 0;
  function logSnapshot(reason) {
    if (!LOG || !logAllowed()) return;
    lastSnapAt = Date.now();
    LOG.snapshot(reason, buildRecord());
  }
  if (study) saveStudy();
  logOn();

  /* Active (visible) time tracking. Wall-clock time is reported separately. */
  var lastTick = Date.now();
  function tick() {
    var t = Date.now();
    var d = Math.min(t - lastTick, 60000);
    lastTick = t;
    if (document.visibilityState !== 'visible') return;
    // Time on a study page counts for that page, not for the mission.
    var scr = study ? currentScreen() : null;
    if (scr && STUDY_SCREENS[scr]) {
      study.activeMs += d;
      var it = studyItemRec(scr);
      if (it) it.activeMs = (it.activeMs || 0) + d;
      saveStudy();
      return;
    }
    state.activeMs += d;
    var a = state.activities[curId()];
    if (a) a.activeMs = (a.activeMs || 0) + d;
  }
  window.setInterval(function () { tick(); save(); }, 5000);
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') {
      tick(); save();
      // Leaving the tab may be the end of the visit: send the record (at most once a minute).
      if (Date.now() - lastSnapAt > 60000) logSnapshot('hidden');
    } else { lastTick = Date.now(); }
  });
  window.addEventListener('pagehide', function () { tick(); save(); if (Date.now() - lastSnapAt > 5000) logSnapshot('pagehide'); });

  /* ---------------- activities & attempts ---------------- */
  function curId() { return C.steps[state.pos.step].activities[state.pos.sub]; }
  function typeOf(id) { return C.activityTypes[id]; }
  function cmpPos(a, b) { return (a.step - b.step) || (a.sub - b.sub); }

  function act(id) {
    var a = state.activities[id];
    if (!a) {
      a = state.activities[id] = {
        id: id,
        label: activityLabel(id),
        startedAt: nowISO(),
        completedAt: null,
        activeMs: 0,
        phase: 'awaiting',
        attempts: [],
        hints: [],
        completion: null,
        firstCompletion: null,
        workedSolutionViewedAt: null,
        draft: {}
      };
    }
    return a;
  }

  function variantFor(id, attemptNo) {
    var i = attemptNo - 1;
    var t = typeOf(id);
    var list = null;
    if (t === 'experiment') list = C.experiments[id].variants;
    else if (t === 'sensor') list = C.sensor.variants;
    else if (t === 'mixed') list = C.mixed.items[id].variants;
    else if (t === 'planets') list = C.planets.sets;
    else if (t === 'crewCombined') list = C.crewCombined.variants;
    return list ? list[i % list.length] : null;
  }

  function startAttempt(a) {
    var n = a.attempts.length + 1;
    var at = {
      attempt: n,
      kind: n === 1 ? 'first' : 'retry',
      variant: variantFor(a.id, n),
      startedAt: nowISO(),
      submittedAt: null,
      hintLevel: 0,
      hintsUsedBeforeSubmit: [],
      outcome: null
    };
    a.attempts.push(at);
    a.phase = 'awaiting';
    a.draft = {};
    return at;
  }

  function attempt(a) {
    if (!a.attempts.length) startAttempt(a);
    return a.attempts[a.attempts.length - 1];
  }

  function unsuccessful(a) {
    return a.attempts.filter(function (t) { return t.outcome && t.outcome.overall !== 'correct'; }).length;
  }

  function computeCompletion(a) {
    if ((C.unscoredActivities || []).indexOf(a.id) >= 0 || a.id === 'film-ending' || a.id === 'debrief') return 'unscored';
    if (a.workedSolutionViewedAt) return 'worked-solution';
    var first = a.attempts[0];
    if (first && first.outcome && first.outcome.overall === 'correct' && first.hintsUsedBeforeSubmit.length === 0) {
      return 'independent';
    }
    var anyCorrect = a.attempts.some(function (t) { return t.outcome && t.outcome.overall === 'correct'; });
    return anyCorrect ? 'assisted' : 'continued-after-feedback';
  }

  function completeActivity(id) {
    var a = act(id);
    var first = !a.completedAt;
    if (!a.completedAt) a.completedAt = nowISO();
    a.completion = computeCompletion(a);
    if (!a.firstCompletion) a.firstCompletion = a.completion;
    logEvent('complete', { activity: id, completion: a.completion, first: first });
    // The whole record goes out at the end of each step (the first time through).
    var st = C.steps.filter(function (x) { return x.activities.indexOf(id) >= 0; })[0];
    if (first && st && st.activities[st.activities.length - 1] === id) logSnapshot('step-' + st.id);
  }

  function addEvidence(evId, fromActivity) {
    if (!evId) return;
    if (state.evidence.some(function (e) { return e.id === evId; })) return;
    state.evidence.push({ id: evId, foundAt: nowISO(), activity: fromActivity });
  }
  function hasEvidence(evId) { return state.evidence.some(function (e) { return e.id === evId; }); }

  function canOfferWorked(a) {
    return !a.workedSolutionViewedAt && unsuccessful(a) >= C.workedSolutionAfter &&
      !a.attempts.some(function (t) { return t.outcome && t.outcome.overall === 'correct'; });
  }

  /* ---------------- navigation ---------------- */
  function goTo(step, sub, opts) {
    destroyPlayers();
    if (ui.screen === 'stepIntro') ui.screen = null; // a forced (dev-mode) intro page ends on any move
    var dir = cmpPos({ step: step, sub: sub || 0 }, state.pos);
    ui.nav = dir > 0 ? 'fwd' : dir < 0 ? 'back' : null;
    ui.navSeq++;
    state.pos = { step: step, sub: sub || 0 };
    if (cmpPos(state.pos, state.furthest) > 0) state.furthest = { step: state.pos.step, sub: state.pos.sub };
    ui.hint = null;
    ui.confirmReset = false;
    if (ui.video === 'player') ui.video = 'idle'; // players were destroyed above
    if (ui.endVideo === 'player') ui.endVideo = 'idle';
    act(curId());
    render({ focusHead: true, scrollTop: true });
    if (!opts || !opts.silent) announce(C.steps[step].label + '. ' + headingText());
  }

  function advance() {
    var st = C.steps[state.pos.step];
    if (state.pos.sub < st.activities.length - 1) goTo(state.pos.step, state.pos.sub + 1);
    else if (state.pos.step < C.steps.length - 1) goTo(state.pos.step + 1, 0);
  }

  function stepDone(i) {
    return C.steps[i].activities.every(function (id) {
      return state.activities[id] && state.activities[id].completedAt;
    });
  }

  function headingText() {
    var h = document.getElementById('task-heading');
    return h ? h.textContent : '';
  }

  /* ===================================================================== *
   * Hints
   * ===================================================================== */
  function hintsFor(id) {
    var a = act(id);
    var at = attempt(a);
    switch (typeOf(id)) {
      case 'console': return C.consoleTasks[id].hints;
      case 'experiment': return C.experiments[id].hints(at.variant, a.phase);
      case 'rank': return C.tideRank.hints;
      case 'decodeFill': return C.decode.summary.hints;
      case 'calc': return C.calc[id].hints;
      case 'landing': return C.landing.hints;
      case 'sensor': return C.sensor.hints(at.variant);
      case 'mixed': return C.mixed.hints(C.mixed.items[id]);
      case 'planets': return C.planets.hints();
      case 'crewCombined': return C.crewCombined.hints(at.variant);
      default: return null;
    }
  }

  function activeCue(id) {
    if (!ui.hint || ui.hint.act !== id) return null;
    var hs = hintsFor(id);
    var h = hs && hs[ui.hint.level - 1];
    return h && h.cue ? h.cue : null;
  }

  function revealHint(id, level) {
    var a = act(id);
    var at = attempt(a);
    if (level > at.hintLevel) {
      for (var l = at.hintLevel + 1; l <= level; l++) {
        a.hints.push({ level: l, viewedAt: nowISO(), attempt: at.attempt, phase: a.phase });
        if (!at.outcome) at.hintsUsedBeforeSubmit.push(l);
      }
      at.hintLevel = level;
    }
    ui.hint = { act: id, level: level };
  }

  function hintPanelHTML(id) {
    if (!ui.hint || ui.hint.act !== id) return '';
    var hs = hintsFor(id);
    var lvl = ui.hint.level;
    var h = hs[lvl - 1];
    var a = act(id);
    var dots = hs.map(function (_, i) { return '<span class="hint-dot' + (i < lvl ? ' on' : '') + '"></span>'; }).join('');
    var retryable = ['experiment', 'sensor', 'mixed', 'planets', 'crewCombined'].indexOf(typeOf(id)) >= 0;
    var fresh = (h.cue && h.cue.worked && retryable && a.phase !== 'awaiting')
      ? '<button type="button" class="btn btn-secondary btn-sm" data-action="fresh-attempt" data-fk="hint-fresh">Make a fresh attempt</button>' : '';
    return '<section class="hint-panel" id="hint-panel" aria-labelledby="hint-title" data-enter="hint|' + id + '|' + lvl + '|' + ui.hintOpens + '">' +
      '<div class="hint-top"><p class="hint-level">' + I.radio + '<span>' + C.hintVoice + ' · Hint ' + lvl + ' of ' + hs.length + '</span></p>' +
      '<span class="hint-dots" aria-hidden="true">' + dots + '</span></div>' +
      '<h2 id="hint-title" class="hint-title">' + h.title + '</h2>' +
      // A worked example always uses other numbers than the task: say so before and after it.
      (h.cue && h.cue.worked
        ? '<div class="hint-example"><p class="hint-diff">' + I.info + '<span>' + C.workedHint.tag + '</span></p>' +
          '<p class="hint-text">' + h.html + '</p></div><p class="hint-text hint-after">' + C.workedHint.after + '</p>'
        : '<p class="hint-text">' + h.html + '</p>') +
      '<div class="hint-actions">' +
      (lvl < hs.length ? '<button type="button" class="btn btn-ghost-strong btn-sm" data-action="hint-next" data-fk="hint-next">Show next hint</button>' : '') +
      (lvl > 1 ? '<button type="button" class="btn btn-ghost btn-sm" data-action="hint-prev" data-fk="hint-prev">Previous</button>' : '') +
      '<button type="button" class="btn btn-ghost btn-sm" data-action="hint-close" data-fk="hint-close">Back to task</button>' +
      fresh + '</div>' +
      '<p class="hint-foot">Hints are free and never remove progress.</p>' +
      '</section>';
  }

  /* Hint nudge: if a learner works on a task for a while without submitting or opening a hint,
     the hint button glows and reads "Need a hint?". Timing is in content.js (hintNudge.afterSec);
     ?nudge=5 overrides it in seconds for user testing. The time it fired is saved on the attempt. */
  var nudge = { key: null, timer: null, fired: false };
  var NUDGE_SEC = params.has('nudge') && isFinite(+params.get('nudge')) ? +params.get('nudge') : C.hintNudge.afterSec;
  function nudgeKey() {
    if (currentScreen()) return null;
    var id = curId();
    var a = state.activities[id];
    var hinted = ['console', 'experiment', 'sensor', 'mixed', 'planets', 'crewCombined', 'rank', 'decodeFill', 'calc', 'landing'];
    if (!a || hinted.indexOf(typeOf(id)) < 0 || ui.hint) return null;
    if (['awaiting', 'wrong', 'explain'].indexOf(a.phase) < 0) return null;
    var at = a.attempts[a.attempts.length - 1];
    if (at && at.hintLevel > 0) return null; // already using hints on this attempt
    return id + '|' + a.phase + '|' + a.attempts.length;
  }
  function scheduleNudge() {
    if (!currentScreen() && missNudge(curId())) {
      var ma = state.activities[curId()], mat = ma.attempts[ma.attempts.length - 1];
      if (!mat.hintNudgedAt) { mat.hintNudgedAt = nowISO(); mat.hintNudgeReason = 'miss'; }
    }
    var key = nudgeKey();
    if (!els.head.querySelector('.hint-btn')) key = null;
    if (key === nudge.key) return;
    window.clearTimeout(nudge.timer);
    nudge.key = key;
    nudge.fired = false;
    if (!key || !(NUDGE_SEC > 0)) return;
    nudge.timer = window.setTimeout(function () {
      if (nudgeKey() !== key) return;
      nudge.fired = true;
      var a = act(curId());
      var at = a.attempts[a.attempts.length - 1];
      if (at && !at.hintNudgedAt) at.hintNudgedAt = nowISO();
      save();
      var b = els.head.querySelector('.hint-btn');
      if (b) { b.classList.add('nudge'); b.querySelector('span').textContent = C.hintNudge.label; }
    }, NUDGE_SEC * 1000);
  }

  // After a miss the hint button asks straight away ("Need a hint?"), without waiting for the
  // quiet spell: that is when a learner most needs to know help is there.
  function missNudge(id) {
    var a = state.activities[id];
    if (!a || !a.attempts.length || a.phase === 'correct' || a.phase === 'worked') return false;
    var at = a.attempts[a.attempts.length - 1];
    if (at.hintLevel > 0 || (at.outcome && at.outcome.overall === 'correct')) return false;
    return unsuccessful(a) > 0;
  }

  /* One-time pointers to the Hint button (wording in content.js under `coach`). `hint` shows on
     the first task that has hints; `hintLab` on the first Tide Lab test. A pointer stays while
     the learner is on that task and goes for good once they dismiss it, open a hint, or move on. */
  function coachKey(id) { return typeOf(id) === 'experiment' ? 'hintLab' : 'hint'; }
  function coachSeen(key) {
    var c = state.coach[key] || (state.coach[key] = { shownOn: null, seenAt: null });
    if (!c.seenAt) c.seenAt = nowISO();
  }
  function coachHTML(id) {
    var key = coachKey(id);
    var c = state.coach[key] || (state.coach[key] = { shownOn: null, seenAt: null });
    if (c.seenAt) return '';
    if (c.shownOn && c.shownOn !== id) { c.seenAt = nowISO(); return ''; } // they moved on
    c.shownOn = id;
    return '<div class="coach" role="note" data-enter="coach|' + key + '">' + I.radio +
      '<p><span class="coach-who">' + C.hintVoice + '</span> ' + C.coach[key] + '</p>' +
      '<button type="button" class="coach-x" data-action="coach-dismiss" data-coach="' + key + '" data-fk="coach-dismiss">' + C.coach.dismiss + '</button></div>';
  }

  /* ===================================================================== *
   * Shared components
   * ===================================================================== */
  function headHTML(o) {
    var id = curId();
    var hintOpen = !!(ui.hint && ui.hint.act === id);
    var nudged = !hintOpen && ((nudge.fired && nudge.key === nudgeKey()) || missNudge(id));
    var hintBtn = o.hint === false ? '' :
      '<button type="button" class="hint-btn' + (nudged ? ' nudge' : '') + '" data-action="hint-toggle" data-fk="hint-btn" aria-expanded="' + hintOpen + '">' +
      I.bulb + '<span>' + (nudged ? C.hintNudge.label : 'Hint') + '</span></button>';
    var stepId = C.steps[state.pos.step].id;
    var line = o.crew !== false && !C.stepIntros[stepId] && C.crewLines && C.crewLines[stepId];
    var crew = line ? '<p class="crew-line" data-enter="crew|' + stepId + '">' + I.radio +
      '<span><b class="crew-who">' + line.who + '</b> ' + line.text + '</span></p>' : '';
    return crew + '<div class="head-row"><p class="eyebrow">' + o.eyebrow + '</p>' + hintBtn + '</div>' +
      (hintBtn && !hintOpen ? coachHTML(id) : '') +
      (o.badge || '') +
      '<h1 id="task-heading" class="task-heading" tabindex="-1">' + o.heading + '</h1>' +
      (o.prompt ? '<p class="prompt">' + o.prompt + '</p>' : '');
  }

  function attemptBadge(at) {
    // Record-keeping for researchers; learners don't need attempts labelled.
    if (!MODE.research) return '';
    return '<p class="attempt-badge">' + (at.attempt === 1 ? 'First attempt' : 'Fresh attempt ' + at.attempt) + '</p>';
  }

  // The progress rail already says "task 1 of 3"; the eyebrow repeats the count only on
  // narrow screens, where the rail heading is hidden.
  // "task 2 of 4" for the task on screen, read from its step.
  function taskTag() {
    return countTag('task ' + (state.pos.sub + 1) + ' of ' + C.steps[state.pos.step].activities.length);
  }
  function countTag(text) {
    return '<span class="eyebrow-count"> · ' + text + '</span>';
  }

  function chipsHTML(list) {
    return list.map(function (c) {
      var inp = C.inputs[c.key];
      var changing = c.factor !== 1;
      return '<span class="chip ' + (changing ? 'chip-changing' : 'chip-fixed') + '">' +
        '<span class="sw sw-' + c.key + '" aria-hidden="true"></span>' +
        '<b class="sym c-' + c.key + '">' + inp.sym + '</b>' +
        '<span class="chip-label">' + inp.label + '</span>' +
        (changing ? '<span class="factor"><span class="sr-only">changes </span>' + times(c.factor) + '</span>'
          : '<span class="lock">' + I.lock + (c.fixedText || 'Fixed') + '</span>') +
        '</span>';
    }).join('');
  }

  // Feature focusing: only inputs that change get a chip; the fixed ones share one muted line.
  function fixedLineHTML(list) {
    if (!list.length) return '';
    return '<p class="fixed-line">' + I.lock + '<span><span class="fixed-word">' + (list[0].fixedText || 'Fixed') + ':</span> ' +
      list.map(function (c) {
        var inp = C.inputs[c.key];
        return '<span class="fixed-item"><b class="sym c-' + c.key + '">' + inp.sym + '</b> ' + inp.label + '</span>';
      }).join('<span class="fixed-sep" aria-hidden="true"> · </span>') + '</span></p>';
  }

  function inputsBlock(label, list, cue) {
    var changing = list.filter(function (c) { return c.factor !== 1; });
    var fixed = list.filter(function (c) { return c.factor === 1; });
    return '<div class="inputs-block' + (cue ? ' cue' : '') + '"><p class="mini-label">' + label + '</p>' +
      (changing.length ? '<div class="chips">' + chipsHTML(changing) + '</div>' : '') + fixedLineHTML(fixed) + '</div>';
  }

  // Views call eqCard(highlights, note) where they used to place the card; it records what to
  // highlight and render() draws the card in its fixed slot above the diagram (#formula).
  // defs (optional): which definitions to show under the bar; defaults to the highlighted terms.
  function eqCard(hl, note, defs) {
    ui.eq = { hl: hl || [], note: note || null, defs: defs || null };
    return '';
  }

  // Wherever numbers go into the model, the bar spells out that k is a constant with the value 2.
  var K_NOTE = '<span class="k-chip">' + C.kNote.chip + '</span><span>' + C.kNote.text + '</span>';

  function formulaHTML(hl, note, defKeys) {
    hl = hl || [];
    defKeys = defKeys || hl;
    function has(k) { return hl.indexOf(k) >= 0 ? ' hl' : ''; }
    function defHTML(d) {
      return '<div class="def def-' + d.key + has(d.key) + '"><dt class="c-' + d.key + '">' + d.sym + '</dt><dd>' + d.text + '</dd></div>';
    }
    var defs = C.definitions.map(defHTML).join('');
    // Highlighted terms keep their definition visible; the full list is one click away.
    var focus = C.definitions.filter(function (d) { return defKeys.indexOf(d.key) >= 0; }).map(defHTML).join('');
    var open = ui.defsOpen ? ' open' : '';
    return '<section class="eq-card eq-bar" aria-label="Tidal-height model">' +
      '<div class="eq-top"><span class="eq-name">Tidal-height model</span></div>' +
      '<p class="eq"><span class="sr-only">h equals k times, Δg divided by g p, times R.</span>' +
      '<span aria-hidden="true" class="eq-vis">' +
      '<span class="t t-h' + has('h') + '">h</span><span class="op">=</span><span class="t t-k' + (note === K_NOTE ? ' k-const' : '') + '">k</span><span class="op">×</span>' +
      '<span class="op">(</span><span class="t t-dg c-dg' + has('dg') + '">Δg</span><span class="op">/</span>' +
      '<span class="t t-gp c-gp' + has('gp') + '">g<sub>p</sub></span><span class="op">)</span><span class="op">×</span>' +
      '<span class="t t-R c-R' + has('R') + '">R</span></span></p>' +
      (focus ? '<dl class="defs defs-focus">' + focus + '</dl>' : '') +
      '<details class="defs-wrap"' + open + '><summary>What the symbols mean</summary><dl class="defs">' + defs + '</dl></details>' +
      (note ? '<p class="eq-note' + (note === K_NOTE ? ' eq-note-k' : '') + '">' + note + '</p>' : '') +
      '</section>';
  }

  // Every card leads with a status label (icon + word) so the three outcomes can't be confused:
  // Correct (green), Partly right (yellow, half-filled icon), Not yet (coral). "answer" is a
  // neutral card for an answer shown after unsuccessful attempts.
  var FB_STATUS = { correct: 'Correct', partly: 'Partly right', notyet: 'Not yet', answer: 'Answer' };
  function feedbackHTML(kind, title, body) {
    var icon = kind === 'correct' ? I.check : kind === 'partly' ? I.half : kind === 'answer' ? I.info : I.retry;
    var cid = curId();
    var key = 'fb|' + cid + '|' + act(cid).attempts.length + '|' + kind + '|' + String(title).replace(/<[^>]+>/g, '').slice(0, 40);
    // The status label already gives the verdict, so the title doesn't repeat it.
    var shownTitle = String(title || '').replace(/^(Correct|Not yet|Partly there|Partly right)\s*—\s*/, '');
    shownTitle = shownTitle.charAt(0).toUpperCase() + shownTitle.slice(1);
    return '<div class="fb fb-' + kind + '" data-enter="' + esc(key) + '"><p class="fb-status">' + icon + '<span>' + FB_STATUS[kind] + '</span></p>' +
      (shownTitle && shownTitle !== FB_STATUS[kind] ? '<p class="fb-title"><span>' + shownTitle + '</span></p>' : '') +
      '<div class="fb-body">' + body + '</div></div>';
  }

  // Feedback body: the reason comes first and is emphasised; other points follow; the recap of
  // the learner's numbers and the arithmetic come last in muted text.
  function fbBody(why, rest, calc) {
    function ps(list, cls) {
      return (list || []).filter(Boolean).map(function (l) { return '<p' + (cls ? ' class="' + cls + '"' : '') + '>' + l + '</p>'; }).join('');
    }
    return ps(why, 'fb-why') + ps(rest) + ps(calc, 'fb-calc');
  }

  // After a miss, trying again is the default (primary) action and moving on is secondary.
  function nextActionsHTML(missed, retryLabel, contLabel, contAction, extra) {
    if (!missed) return actionsHTML(btn(contLabel, contAction, { fk: 'primary' }), '', extra);
    return actionsHTML(btn(retryLabel, 'fresh-attempt', { fk: 'primary' }),
      btn('Continue', contAction, { kind: 'secondary', fk: 'continue' }), extra);
  }

  // The evidence each activity contributes to the crew's log.
  function evidenceFor(id) {
    var t = typeOf(id);
    return t === 'experiment' ? C.experiments[id].evidence : t === 'calc' ? (C.calc[id].evidence || null) : t === 'sensor' ? 'ev-uniform' : t === 'planets' ? C.planets.evidence : null;
  }

  function evidenceAddedHTML(evId) {
    var ev = C.evidence.filter(function (e) { return e.id === evId; })[0];
    if (!ev) return '';
    if (!hasEvidence(evId)) {
      return '<div class="ev-added ev-pending"><p class="mini-label">What this test found</p>' +
        '<div class="ev-entry">' + I.info + '<span>' + ev.html + '</span></div></div>';
    }
    return '<div class="ev-added" data-enter="ev|' + evId + '"><p class="mini-label green">Added to the crew’s evidence log</p>' +
      '<div class="ev-entry found">' + I.check + '<span>' + ev.html + '</span></div></div>';
  }

  function radiosHTML(name, items, selected, o) {
    o = o || {};
    if (o.locked) {
      var pick = items.filter(function (it) { return it.id === selected; })[0];
      return '<div class="choice choice-locked" aria-label="Your answer">' +
        '<span class="radio-dot on" aria-hidden="true"></span><span>' + (pick ? pick.text : '') + '</span></div>';
    }
    return '<fieldset class="choices' + (o.row ? ' choices-row' : '') + '">' +
      '<legend class="' + (o.legend ? 'q' : 'sr-only') + '">' + (o.legend || o.srLegend || 'Choose one') + '</legend>' +
      items.map(function (it) {
        return '<label class="choice"><input type="radio" name="' + name + '" value="' + it.id + '" data-change="' + name + '"' +
          ' data-fk="r-' + name + '-' + it.id + '"' + (selected === it.id ? ' checked' : '') + '><span>' + it.text + '</span></label>';
      }).join('') + '</fieldset>';
  }

  function gaugeHTML(o) {
    var pred = o.pred, result = o.result, locked = o.locked;
    var ticks = '';
    for (var v = 0; v <= GMAX; v++) {
      ticks += '<span class="tick' + (v % 2 === 0 ? ' major' : '') + '" style="bottom:' + pct(v) + '">' +
        (v % 2 === 0 ? '<span>' + v + '</span>' : '') + '</span>';
    }
    var hasPred = pred != null;
    var trackAttrs = locked
      ? 'role="img" aria-label="Height gauge: baseline 4 m' + (hasPred ? ', your prediction ' + f(pred) + ' m' : '') +
        (result != null ? ', ' + (o.resultWord ? o.resultWord.toLowerCase() : 'model result') + ' ' + f(result) + ' m' : '') + '."'
      : 'role="slider" tabindex="0" data-fk="gauge" aria-label="Prediction marker, bulge height in meters" ' +
        'aria-valuemin="0" aria-valuemax="' + GMAX + '"' + (hasPred ? ' aria-valuenow="' + pred + '"' : '') +
        ' aria-valuetext="' + (hasPred ? f(pred) + ' meters' : 'No prediction yet') + '"';
    return '<div class="gauge' + (o.animate ? ' animate' : '') + '">' +
      '<p class="gauge-title">Bulge height (m)</p>' +
      '<div class="gauge-body">' +
      '<div class="gauge-left" aria-hidden="true">' +
      '<span class="g-base-label" style="bottom:' + pct(BASE) + '">Base 4 m</span>' +
      '<span class="g-you" style="bottom:' + pct(hasPred ? pred : 0) + '"' + (hasPred ? '' : ' hidden') + '>You ' + (hasPred ? f(pred) : '') + ' m</span>' +
      '</div>' +
      '<div class="gauge-track' + (locked ? ' locked' : '') + '" ' + trackAttrs + '>' +
      (result != null ? '<span class="g-fill" style="height:' + pct(result) + '"></span>' : '') +
      (o.current != null ? '<span class="g-now" style="height:' + pct(o.current) + '"></span>' : '') +
      '<span class="g-baseline" style="bottom:' + pct(BASE) + '"></span>' +
      '<span class="g-marker" style="bottom:' + pct(hasPred ? pred : 0) + '"' + (hasPred ? '' : ' hidden') + '></span>' +
      '</div>' +
      '<div class="gauge-scale" aria-hidden="true">' + ticks + '</div>' +
      '<div class="gauge-right" aria-hidden="true">' +
      (result != null ? '<span class="g-model" style="bottom:' + pct(result) + '">' + (o.resultWord || 'Model') + ' ' + f(result) + ' m</span>' : '') +
      '</div></div>' +
      (locked ? '' : '<p class="gauge-help">Drag the marker or use − / + to predict</p>') +
      '</div>';
  }

  function stepperHTML(pred, locked) {
    return '<div class="field"><label class="field-label" for="pred-input">Your prediction (bulge height)</label>' +
      '<div class="stepper' + (locked ? ' locked' : '') + '">' +
      '<button type="button" class="step-btn" data-action="pred-down" data-fk="pred-down" aria-label="Decrease prediction by 0.5 meters"' + (locked ? ' disabled' : '') + '>−</button>' +
      '<span class="step-val"><input id="pred-input" type="number" inputmode="decimal" min="0" max="' + GMAX + '" step="0.5"' +
      ' data-input="pred" data-fk="pred-input" placeholder="—" aria-describedby="pred-helper" value="' + (pred == null ? '' : f(pred)) + '"' + (locked ? ' readonly' : '') + '>' +
      '<span class="unit" aria-hidden="true">m</span></span>' +
      '<button type="button" class="step-btn" data-action="pred-up" data-fk="pred-up" aria-label="Increase prediction by 0.5 meters"' + (locked ? ' disabled' : '') + '>+</button>' +
      '</div></div>';
  }

  function predHelperText(pred, verb) {
    if (pred == null) {
      return narrowQuery.matches || verb !== 'run'
        ? 'Use − / + (steps of 0.5 m) or type a value from 0 to 10 m.'
        : 'Drag the marker on the gauge, or use − / + (steps of 0.5 m).';
    }
    return 'Prediction ready: ' + f(pred) + ' m. You can change it until you ' + (verb === 'run' ? 'run the experiment.' : 'submit.');
  }

  // resultWord: what the second bar is called. The Quick Checks compare with the model; the
  // Tide Lab, where version B has not met the model yet, calls it the test's result.
  function hbarsHTML(pred, result, extraClass, resultWord) {
    function w(v) { return (clamp(v, 0, GMAX) / GMAX * 100).toFixed(1); }
    var hasPred = pred != null;
    var word = resultWord || 'Model';
    return '<div class="hbars ' + (extraClass || '') + '" role="img" aria-label="' + (hasPred ? 'Your prediction ' + f(pred) + ' m; ' : '') +
      (resultWord ? resultWord.toLowerCase() : 'model result') + ' ' + f(result) + ' m; baseline 4 m.">' +
      (hasPred ? '<div class="hb-row"><span class="hb-label">You</span><span class="hb-track"><span class="hb-base" style="left:' + w(BASE) + '%"></span>' +
      '<span class="hb-fill hb-you" style="width:' + w(pred) + '%"></span></span><span class="hb-val">' + f(pred) + ' m</span></div>' : '') +
      '<div class="hb-row"><span class="hb-label">' + word + '</span><span class="hb-track"><span class="hb-base" style="left:' + w(BASE) + '%"></span>' +
      '<span class="hb-fill hb-model" style="width:' + w(result) + '%"></span></span><span class="hb-val">' + f(result) + ' m</span></div>' +
      '<p class="hb-scale" aria-hidden="true"><span>0</span><span>dashed line = base 4 m</span><span>10 m</span></p></div>';
  }

  function subnavHTML(labelFn) {
    var stepIdx = state.pos.step;
    var st = C.steps[stepIdx];
    if (st.activities.length < 2) return '';
    return '<nav class="subnav" aria-label="' + st.label + ' tasks">' + st.activities.map(function (id, i) {
      var lbl = labelFn(id, i);
      if (lbl == null) return '';
      var ok = DEV.on || cmpPos({ step: stepIdx, sub: i }, state.furthest) <= 0;
      var cur = i === state.pos.sub;
      var done = state.activities[id] && state.activities[id].completedAt;
      return '<button type="button" class="sub' + (cur ? ' current' : '') + (done ? ' done' : '') + '" data-action="goto-sub" data-sub="' + i + '" data-fk="sub-' + i + '"' +
        (ok ? '' : ' disabled') + (cur ? ' aria-current="true"' : '') + '>' + (done ? I.check : '') + '<span>' + lbl + '</span></button>';
    }).join('') + '</nav>';
  }

  function workedHTML(steps) {
    return '<div class="worked"><p class="mini-label">Worked solution</p><ol>' +
      steps.map(function (s) { return '<li>' + s + '</li>'; }).join('') + '</ol></div>' +
      '<div class="supported-note">' + I.info + '<p>' + SUPPORTED_NOTE() + '</p></div>';
  }

  function SUPPORTED_NOTE() {
    return forLearner('You can carry on. Working through the solution still counts toward your mission.',
      'Logged as supported completion — counts toward mission progress, recorded separately from independent success.');
  }

  function actionsHTML(primary, secondary, extra) {
    return '<div class="actions">' + (extra || '') +
      (secondary ? '<div class="actions-row">' + secondary + primary + '</div>' : primary) + '</div>';
  }

  function btn(label, action, o) {
    o = o || {};
    var cls = o.kind === 'secondary' ? 'btn btn-secondary' : o.kind === 'ghost' ? 'btn btn-ghost' : 'btn btn-primary';
    return '<button type="button" class="' + cls + '" data-action="' + action + '" data-fk="' + (o.fk || action) + '"' +
      (o.submit ? ' data-submit' : '') + (o.disabled ? ' disabled' : '') + '>' + label + '</button>';
  }

  function quoteHTML(label, text) {
    return '<div class="quote"><p class="mini-label">' + label + '</p><p class="quote-text">' + esc(text) + '</p></div>';
  }

  /* ===================================================================== *
   * Planet diagram (SVG)
   * ===================================================================== */
  // Fixed pseudo-random starfield [x, y, r, opacity] so every render matches.
  var STARS = (function () {
    var out = [], seed = 7;
    function rnd() { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }
    for (var i = 0; i < 46; i++) out.push([Math.round(rnd() * 860), Math.round(rnd() * 560), +(0.6 + rnd() * 1.1).toFixed(2), +(0.14 + rnd() * 0.36).toFixed(2)]);
    return out;
  })();

  var PLANET_LAST = {}; // idp -> the options the diagram was last drawn with
  var PT = {};          // idp -> { seq, tag, h }: the height the diagram is showing right now

  function planetSVG(o) {
    var p = {
      dg: 1, gp: 1, R: 1, h: BASE, hidden: false, from: null, showH: false, highlight: null,
      selectable: false, selected: null, selState: null, idp: 'pd', compact: false,
      hideSyms: [], // console: inputs whose symbol labels stay hidden until the learner finds them
      hValue: false, // label the h bracket with the current height ("h = 4 m")
      arrowH: null, // optional: anchor Δg arrows at this bulge height (keeps two diagrams' arrows aligned)
      dirs: null, // quick-check sketch: { dg, gp, R } as 'up' | 'down' | 'fixed'; labels show ↑/↓, not a factor
      pulse: null, // part that just changed ('dg' | 'gp' | 'R' | 'h'); it flashes once
      bodyName: 'External body', // label under the external body (e.g. 'Moon', 'Gargantua')
      bodySub: '',               // optional second line under the body label
      planetName: '',            // optional planet label under the diagram (e.g. 'Miller’s planet')
      hTag: null,                // 'you': the height shown is the learner's prediction, not the model's
      ghost: null,               // a predicted height kept as a dashed outline beside the result
      // Tide Lab cues: what changed in this test, shown as a cause (never as the ocean's response).
      was: null,                 // 'dg' | 'gp' | 'R': mark where that input stood at baseline
      flow: null,                // 'dg' | 'gp': dashes drift along those arrows, so they read as a pull
      fromProps: null,           // { dg: 1 } etc.: animate these inputs from there to their values
      vals: null,                // { dg, gp, R }: values the learner has typed, written on the part each belongs to
      labelVals: null,           // while animating, labels show the final factors (×2), not ×1.37
      changing: null             // 'dg' | 'gp' | 'R': that input is moving right now
    };
    Object.keys(o || {}).forEach(function (k) { p[k] = o[k]; });
    // Kept so the same diagram can be redrawn (see planetTween). Animation frames are not kept:
    // this is always the diagram as its view last asked for it.
    if (!p._frame) PLANET_LAST[p.idp] = p;
    var lv = p.labelVals || p;

    var W = 860, H = p.compact ? 470 : 560;
    var cx = 590, cy = 262, bx = 140, by = 262;
    var rock = 106 * clamp(1 + 0.32 * Math.log2(p.R), 0.62, 1.4);
    var level = rock + 12;
    function ell(h) { return { rx: level + h * 4.4, ry: level - h * 0.9 }; }
    var hv = p.hidden ? 0 : clamp(p.h, 0, 12);
    var e = ell(hv);
    var e0 = p.from != null && !p.hidden ? ell(clamp(p.from, 0, 12)) : null;
    var ea = p.arrowH != null && !p.hidden ? ell(clamp(Math.max(p.arrowH, hv), 0, 12)) : e;
    var sp = 24 * clamp(p.dg, 0.25, 2.6);
    var Lc = 78, Ln = Lc + sp, Lf = Math.max(10, Lc - sp);
    var gpL = 26 * clamp(1 + 0.42 * Math.log2(p.gp), 0.5, 2.3);
    var gpW = 2.4 * clamp(1 + 0.2 * Math.log2(p.gp), 0.7, 1.6);
    var hl = p.highlight === 'dgarrows' ? 'dg' : p.highlight;
    var idp = p.idp;

    function cls(k) {
      if (!hl) return '';
      var on = hl === k || (hl === 'both' && (k === 'dg' || k === 'gp'));
      return on ? ' hl' : ' dim';
    }
    function r1(x) { return Math.round(x * 10) / 10; }
    // Label for an input's change: a factor normally, an arrow in a sketch (the amount is the learner's to work out).
    function fac(k) {
      if (p.dirs) return p.dirs[k] === 'up' ? '↑' : p.dirs[k] === 'down' ? '↓' : '';
      return lv[k] !== 1 ? times(lv[k]) : '';
    }
    function facWords(k) {
      if (p.dirs) return p.dirs[k] === 'up' ? 'up' : p.dirs[k] === 'down' ? 'down' : '';
      return lv[k] !== 1 ? times(lv[k]) : '';
    }
    function pl(k) { return (p.pulse === k ? ' pulse' : '') + (p.changing === k ? ' changing' : ''); }
    function val(k) { return p.vals && p.vals[k] ? p.vals[k] : ''; }

    var defs = '<defs>' +
      '<marker id="' + idp + '-adg" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="' + COL.dg + '"/></marker>' +
      '<marker id="' + idp + '-agp" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="' + COL.gp + '"/></marker>' +
      // Ocean: lit from the upper left, deeper blue toward the edge.
      '<radialGradient id="' + idp + '-ocean" cx="50%" cy="50%" r="55%" fx="36%" fy="30%">' +
      '<stop offset="0" stop-color="#5aa3dc"/><stop offset=".55" stop-color="#2f6ea6"/><stop offset="1" stop-color="#1d4a75"/></radialGradient>' +
      // Rocky core: warm grey-brown, clearly not water.
      '<radialGradient id="' + idp + '-rock" cx="50%" cy="50%" r="55%" fx="38%" fy="32%">' +
      '<stop offset="0" stop-color="#6b5a48"/><stop offset=".6" stop-color="#46392d"/><stop offset="1" stop-color="#2c241d"/></radialGradient>' +
      '<radialGradient id="' + idp + '-halo"><stop offset=".55" stop-color="#7fc4ff" stop-opacity=".16"/><stop offset="1" stop-color="#7fc4ff" stop-opacity="0"/></radialGradient>' +
      '<radialGradient id="' + idp + '-glow"><stop offset=".6" stop-color="' + COL.dg + '" stop-opacity=".18"/><stop offset="1" stop-color="' + COL.dg + '" stop-opacity="0"/></radialGradient>' +
      // Black hole: warm halo, the ring of bent light (brightest at the top), and the disc.
      '<radialGradient id="' + idp + '-hglow"><stop offset=".45" stop-color="' + COL.dg + '" stop-opacity=".34"/><stop offset="1" stop-color="' + COL.dg + '" stop-opacity="0"/></radialGradient>' +
      '<linearGradient id="' + idp + '-hring" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff3d1"/><stop offset=".5" stop-color="' + COL.dg + '"/><stop offset="1" stop-color="#8a5a12"/></linearGradient>' +
      '<linearGradient id="' + idp + '-hdisc" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="' + COL.dg + '" stop-opacity="0"/><stop offset=".25" stop-color="' + COL.dg + '"/>' +
      '<stop offset=".5" stop-color="#fff3d1"/><stop offset=".75" stop-color="' + COL.dg + '"/><stop offset="1" stop-color="' + COL.dg + '" stop-opacity="0"/></linearGradient>' +
      '</defs>';

    var stars = '<g class="stars" aria-hidden="true">' + STARS.map(function (s) {
      return '<circle cx="' + s[0] + '" cy="' + s[1] + '" r="' + s[2] + '" fill="#fff" opacity="' + s[3] + '"/>';
    }).join('') + '</g>';

    var tagText = 'Deformation exaggerated for visibility' + (lv.R !== 1 ? ' · sizes not to scale' : '');
    // Compact diagrams render at about half size, so their tag uses larger type.
    var tagW = tagText.length * (p.compact ? 11.6 : 8.1) + 28, tagH = p.compact ? 38 : 28;
    var tag = '<g class="tag" aria-hidden="true"><rect x="' + r1(cx - tagW / 2) + '" y="14" width="' + r1(tagW) + '" height="' + tagH + '" rx="4" fill="#000" stroke="#555"/>' +
      '<text x="' + cx + '" y="' + (p.compact ? 40 : 33) + '" text-anchor="middle" class="t-tag">' + tagText + '</text></g>';

    // External body. A moon or star is a ringed disc. Gargantua is drawn as a black hole: a dark
    // sphere, a ring of light bent round it, and its glowing disc seen edge-on, crossing in front.
    var hole = /gargantua/i.test(p.bodyName);
    var bodyShape = hole
      ? '<circle cx="' + bx + '" cy="' + by + '" r="112" fill="url(#' + idp + '-hglow)"/>' +
        '<ellipse cx="' + bx + '" cy="' + by + '" rx="62" ry="59" fill="none" stroke="url(#' + idp + '-hring)" stroke-width="9"/>' +
        '<circle cx="' + bx + '" cy="' + by + '" r="53" fill="#000"/>' +
        '<ellipse cx="' + bx + '" cy="' + by + '" rx="112" ry="9" fill="url(#' + idp + '-hdisc)"/>' +
        '<ellipse cx="' + bx + '" cy="' + by + '" rx="96" ry="2" fill="#fff8e6" opacity=".9"/>'
      : '<circle cx="' + bx + '" cy="' + by + '" r="96" fill="url(#' + idp + '-glow)"/>' +
        '<circle cx="' + bx + '" cy="' + by + '" r="72" fill="none" stroke="#3a2e14" stroke-width="1.5"/>' +
        '<circle cx="' + bx + '" cy="' + by + '" r="58" fill="#000" stroke="' + COL.dg + '" stroke-width="2.4"/>';
    var bodyInner = bodyShape +
      '<text x="' + bx + '" y="' + (by + 100) + '" text-anchor="middle" class="t-lbl b">' + p.bodyName + '</text>' +
      (p.bodySub ? '<text x="' + bx + '" y="' + (by + (p.compact ? 128 : 120)) + '" text-anchor="middle" class="t-sub">' + p.bodySub + '</text>' : '');

    // Connector between body and near side
    var nearTip = cx - ea.rx - Ln;
    var connector = '<line x1="' + (bx + (hole ? 120 : 74)) + '" y1="' + cy + '" x2="' + r1(nearTip - 8) + '" y2="' + cy + '" stroke="#666" stroke-width="1.5" stroke-dasharray="2 6" aria-hidden="true"/>';

    // Ocean + rock
    var ocean;
    if (p.hidden) {
      ocean = '<circle cx="' + cx + '" cy="' + cy + '" r="' + r1(level) + '" fill="url(#' + idp + '-ocean)" stroke="#fff" stroke-width="1.6" stroke-dasharray="7 6" opacity=".55"/>';
    } else {
      ocean = '<ellipse class="ocean" cx="' + cx + '" cy="' + cy + '" rx="' + r1(e.rx) + '" ry="' + r1(e.ry) + '"' +
        ' fill="url(#' + idp + '-ocean)" stroke="#e8f4ff" stroke-width="2.2"/>';
    }
    var halo = '<circle cx="' + cx + '" cy="' + cy + '" r="' + r1(level + 70) + '" fill="url(#' + idp + '-halo)" aria-hidden="true"/>';
    var oceanInner = ocean +
      '<circle cx="' + cx + '" cy="' + cy + '" r="' + r1(rock) + '" fill="url(#' + idp + '-rock)" stroke="#1c1712" stroke-width="1.5"/>' +
      (p.showH && !p.hidden ? '<circle cx="' + cx + '" cy="' + cy + '" r="' + r1(level) + '" fill="none" stroke="#fff" stroke-opacity="' + (p.hValue ? '.8' : '.45') + '" stroke-width="' + (p.hValue ? '1.6' : '1.3') + '" stroke-dasharray="3 5"/>' : '');

    // The learner's prediction, kept beside the model's result: a dashed outline with its own tag.
    var ghost = '';
    if (p.ghost != null && !p.hidden) {
      var eg = ell(clamp(p.ghost, 0, 12));
      var ga = Math.PI / 4, gtx = cx + (eg.rx + gpL + 22) * Math.cos(ga), gty = cy + (eg.ry + gpL + 22) * Math.sin(ga);
      var gText = 'You ' + f(p.ghost) + ' m', gw = gText.length * 8.4 + 18;
      ghost = '<g class="ghost" aria-hidden="true">' +
        '<ellipse cx="' + cx + '" cy="' + cy + '" rx="' + r1(eg.rx) + '" ry="' + r1(eg.ry) + '" class="ghost-line"/>' +
        '<line x1="' + r1(cx + eg.rx * Math.cos(ga)) + '" y1="' + r1(cy + eg.ry * Math.sin(ga)) + '" x2="' + r1(gtx) + '" y2="' + r1(gty) + '" class="ghost-lead"/>' +
        '<rect x="' + r1(gtx - 4) + '" y="' + r1(gty - 4) + '" width="' + r1(gw) + '" height="26" rx="4" class="you-pill"/>' +
        '<text x="' + r1(gtx - 4 + gw / 2) + '" y="' + r1(gty + 14) + '" text-anchor="middle" class="t-you">' + gText + '</text></g>';
    }

    var hShown = Math.round(p.h * 10) / 10;
    var hBracket = '';
    if (p.showH && !p.hidden && e.rx - level > 6) {
      var y = cy + 30, x1 = cx + level, x2 = cx + e.rx;
      var hText = (p.hTag === 'you' ? 'You ' : 'h = ') + f(hShown) + ' m';
      hBracket = '<g class="h-bracket" aria-hidden="true">' +
        '<line x1="' + r1(x1) + '" y1="' + y + '" x2="' + r1(x2) + '" y2="' + y + '" stroke="#fff" stroke-width="2"/>' +
        '<line x1="' + r1(x1) + '" y1="' + (y - 7) + '" x2="' + r1(x1) + '" y2="' + (y + 7) + '" stroke="#fff" stroke-width="2"/>' +
        '<line x1="' + r1(x2) + '" y1="' + (y - 7) + '" x2="' + r1(x2) + '" y2="' + (y + 7) + '" stroke="#fff" stroke-width="2"/>' +
        (p.hValue
          ? '<rect x="' + r1(x1 - 96) + '" y="' + (y - 14) + '" width="86" height="28" rx="6" class="' + (p.hTag === 'you' ? 'you-pill' : 'h-pill') + '"/>' +
            '<text x="' + r1(x1 - 53) + '" y="' + (y + 6) + '" text-anchor="middle" class="' + (p.hTag === 'you' ? 't-you' : 't-lbl b') + '">' + hText + '</text>'
          : '<text x="' + r1(x1 - 10) + '" y="' + (y + 6) + '" text-anchor="end" class="t-lbl b">h</text>') + '</g>';
    }

    // Two short lines on a dark pill in the lower half of the planet, clear of the
    // horizontal arrows (at cy) and the R line (center to top).
    var hy = cy + rock * 0.42;
    var hiddenText = p.hidden ?
      '<g class="hidden-tag"><rect x="' + r1(cx - 74) + '" y="' + r1(hy) + '" width="148" height="50" rx="8" fill="#000" fill-opacity=".62"/>' +
      '<text x="' + cx + '" y="' + r1(hy + 21) + '" text-anchor="middle" class="t-sub w">Bulge hidden</text>' +
      '<text x="' + cx + '" y="' + r1(hy + 40) + '" text-anchor="middle" class="t-sub w">until you submit</text></g>' : '';

    // External acceleration arrows (all point toward the external body)
    function arrow(x1, x2) {
      return '<line x1="' + r1(x1) + '" y1="' + cy + '" x2="' + r1(x2) + '" y2="' + cy + '" stroke="' + COL.dg + '" stroke-width="4" stroke-linecap="round" marker-end="url(#' + idp + '-adg)"/>';
    }
    // Dashes that drift along an arrow toward its head. The phase comes from the clock, so the
    // drift carries on smoothly when the diagram is redrawn (as it is while a marker is dragged).
    var flowPhase = ' style="animation-delay:-' + ((Date.now() % 1100) / 1000).toFixed(2) + 's"';
    function flowLine(x1, y1, x2, y2, k) {
      return '<line x1="' + r1(x1) + '" y1="' + r1(y1) + '" x2="' + r1(x2) + '" y2="' + r1(y2) + '" class="pull-flow pf-' + k + '"' + flowPhase + '/>';
    }
    var dgFlow = p.flow !== 'dg' ? '' :
      flowLine(cx - ea.rx, cy, cx - ea.rx - Ln + 9, cy, 'dg') + flowLine(cx, cy, cx - Lc + 9, cy, 'dg') +
      (Lf > 16 ? flowLine(cx + ea.rx, cy, cx + ea.rx - Lf + 9, cy, 'dg') : '');
    // Where the near and far arrows ended at baseline: the gap between them is what changed.
    var dgWas = '';
    if (p.was === 'dg') {
      var n0 = cx - ea.rx - (Lc + 24), f0 = cx + ea.rx - (Lc - 24);
      dgWas = '<g class="was was-dg">' +
        '<line x1="' + r1(n0) + '" y1="' + (cy - 10) + '" x2="' + r1(n0) + '" y2="' + (cy + 10) + '" class="was-mark"/>' +
        '<line x1="' + r1(f0) + '" y1="' + (cy - 10) + '" x2="' + r1(f0) + '" y2="' + (cy + 10) + '" class="was-mark"/>' +
        (Math.abs((cx + ea.rx - Lf) - f0) > 2 ? '<line x1="' + r1(cx + ea.rx - Lf) + '" y1="' + cy + '" x2="' + r1(f0) + '" y2="' + cy + '" class="was-line"/>' : '') + '</g>';
    }
    var dgArrows = '<g class="grp' + cls('dg') + pl('dg') + '" aria-hidden="true">' + dgWas +
      arrow(cx - ea.rx, cx - ea.rx - Ln) + arrow(cx, cx - Lc) + arrow(cx + ea.rx, cx + ea.rx - Lf) + dgFlow + '</g>';

    // Planet surface gravity arrows (point inward)
    var angles = [25, 65, 115, 155, 205, 245, 295, 335];
    var gpLines = '', gpHits = '', gpCue = '';
    angles.forEach(function (deg) {
      var t = deg * Math.PI / 180, c = Math.cos(t), s = Math.sin(t);
      var px = cx + e.rx * c, py = cy - e.ry * s;
      var gap = 9;
      var sx = px + c * (gap + gpL), sy = py - s * (gap + gpL);
      var ex = px + c * gap, ey = py - s * gap;
      gpLines += '<line x1="' + r1(sx) + '" y1="' + r1(sy) + '" x2="' + r1(ex) + '" y2="' + r1(ey) + '" stroke="' + COL.gp + '" stroke-width="' + r1(gpW) + '" stroke-linecap="round" marker-end="url(#' + idp + '-agp)"/>';
      gpHits += '<line x1="' + r1(sx) + '" y1="' + r1(sy) + '" x2="' + r1(ex) + '" y2="' + r1(ey) + '" stroke="transparent" stroke-width="26" class="hit"/>';
      if (p.flow === 'gp') gpCue += flowLine(sx, sy, px + c * (gap + 8), py - s * (gap + 8), 'gp');
      if (p.was === 'gp') {
        // A tick where each arrow's tail stood at baseline.
        var tx = px + c * (gap + 26), ty = py - s * (gap + 26);
        gpCue += '<line x1="' + r1(tx - s * 7) + '" y1="' + r1(ty - c * 7) + '" x2="' + r1(tx + s * 7) + '" y2="' + r1(ty + c * 7) + '" class="was-mark was-gp"/>';
      }
    });
    var gpLabelX = r1(cx - e.rx * 0.62 - 52), gpLabelY = r1(cy - e.ry - 44);
    function shown(k) { return p.hideSyms.indexOf(k) < 0; }
    var gpInner = gpLines + gpCue + (!shown('gp') ? '' :
      '<text x="' + gpLabelX + '" y="' + gpLabelY + '" text-anchor="end" class="t-sym" fill="' + COL.gp + '">g<tspan dy="6" font-size="15">p</tspan>' + (fac('gp') ? '<tspan dy="-6" font-size="17"> ' + fac('gp') + '</tspan>' : '') +
      (val('gp') ? '<tspan dy="' + (fac('gp') ? 0 : -6) + '" font-size="18" class="t-val"> = ' + val('gp') + '</tspan>' : '') + '</text>' +
      (p.compact ? '' : '<text x="' + gpLabelX + '" y="' + (gpLabelY + 22) + '" text-anchor="end" class="t-sub" fill="' + COL.gp + '">planet’s pull, toward its center</text>'));

    // Radius
    var rTop = cy - level;
    var rWas = p.was !== 'R' ? '' :
      '<g class="was was-R" aria-hidden="true"><circle cx="' + cx + '" cy="' + cy + '" r="106" class="was-ring"/>' +
      (rock > 118 ? '<text x="' + cx + '" y="' + (cy + 96) + '" text-anchor="middle" class="t-was">size before</text>' : '') + '</g>';
    var rVal = val('R') ? '<text x="' + (cx - 12) + '" y="' + r1(cy - level / 2 + 6) + '" text-anchor="end" class="t-val" fill="' + COL.R + '">' + val('R') + '</text>' : '';
    var rInner = rWas + rVal + '<line x1="' + cx + '" y1="' + cy + '" x2="' + cx + '" y2="' + r1(rTop) + '" stroke="' + COL.R + '" stroke-width="2.6" stroke-dasharray="2 6" stroke-linecap="round"/>' +
      '<line x1="' + (cx - 10) + '" y1="' + r1(rTop) + '" x2="' + (cx + 10) + '" y2="' + r1(rTop) + '" stroke="' + COL.R + '" stroke-width="2.6"/>' +
      (shown('R') ? '<text x="' + (cx + 14) + '" y="' + r1(cy - level / 2 + 7) + '" class="t-sym" fill="' + COL.R + '">R' + (fac('R') ? ' ' + fac('R') : '') + '</text>' : '');

    var centreDot = '<circle cx="' + cx + '" cy="' + cy + '" r="4.5" fill="#fff"/>';

    // Δg inset panel
    var dgVal = val('dg');
    var ix = 16, iy = dgVal ? 384 : 396, iw = 304, ih = dgVal ? 172 : 152, ax = iw - 16, sc = 0.85;
    var tn = ax - Ln * sc, tc = ax - Lc * sc, tf = ax - Lf * sc;
    function insetArrow(x2, y) {
      return '<line x1="' + ax + '" y1="' + y + '" x2="' + r1(x2) + '" y2="' + y + '" stroke="' + COL.dg + '" stroke-width="4" stroke-linecap="round" marker-end="url(#' + idp + '-adg)"/>';
    }
    var insetInner = '<g transform="translate(' + ix + ',' + iy + ')">' +
      '<rect width="' + iw + '" height="' + ih + '" rx="10" fill="#1c1c1c" stroke="#3a3a3a"/>' +
      '<text x="14" y="26" class="t-in b">External acceleration</text>' +
      '<text x="' + (iw - 14) + '" y="26" text-anchor="end" class="t-in sm" fill="' + COL.dg + '">← toward body</text>' +
      '<text x="14" y="57" class="t-in">Near</text>' + insetArrow(tn, 52) +
      '<text x="14" y="83" class="t-in">Center</text>' + insetArrow(tc, 78) +
      '<text x="14" y="109" class="t-in">Far</text>' + insetArrow(tf, 104) +
      '<polyline points="' + r1(tn) + ',60 ' + r1(tn) + ',120 ' + r1(tf) + ',120 ' + r1(tf) + ',112" fill="none" stroke="' + COL.dg + '" stroke-width="2" stroke-dasharray="3 4"/>' +
      (shown('dg') ? '<text x="' + r1(Math.min(tn, iw - (fac('dg') ? 168 : 130))) + '" y="141" class="t-in b" fill="' + COL.dg + '">Δg = near − far' + (fac('dg') ? ' · ' + fac('dg') : '') + '</text>' : '') +
      (dgVal ? '<text x="' + (iw - 14) + '" y="162" text-anchor="end" class="t-val" fill="' + COL.dg + '">= ' + dgVal + '</text>' : '') +
      '</g>';

    // Labels
    var ly = cy + level + 58;
    var labels = p.compact ? '' : '<g aria-hidden="true">' +
      '<text x="' + r1(cx - level) + '" y="' + r1(ly) + '" text-anchor="middle" class="t-lbl b">Near side</text>' +
      '<text x="' + r1(cx - level) + '" y="' + r1(ly + 19) + '" text-anchor="middle" class="t-sub">faces the body</text>' +
      '<text x="' + cx + '" y="' + r1(ly) + '" text-anchor="middle" class="t-lbl b">Center</text>' +
      '<text x="' + r1(cx + level) + '" y="' + r1(ly) + '" text-anchor="middle" class="t-lbl b">Far side</text>' +
      '<text x="' + r1(cx + level) + '" y="' + r1(ly + 19) + '" text-anchor="middle" class="t-sub">faces away</text></g>';

    // Selection / focus shapes
    function shape(k, extra) {
      extra = extra || '';
      switch (k) {
        case 'body': return '<circle cx="' + bx + '" cy="' + by + '" r="84" ' + extra + '/>';
        case 'gp': return '<ellipse cx="' + cx + '" cy="' + cy + '" rx="' + r1(e.rx + gpL + 24) + '" ry="' + r1(e.ry + gpL + 24) + '" ' + extra + '/>';
        case 'R': return '<rect x="' + (cx - 22) + '" y="' + r1(rTop - 16) + '" width="44" height="' + r1(level + 30) + '" rx="8" ' + extra + '/>';
        case 'h': return '<ellipse cx="' + cx + '" cy="' + cy + '" rx="' + r1(e.rx + 7) + '" ry="' + r1(e.ry + 7) + '" ' + extra + '/>';
        case 'dg': return '<rect x="' + (ix - 7) + '" y="' + (iy - 7) + '" width="' + (iw + 14) + '" height="' + (ih + 14) + '" rx="14" ' + extra + '/>';
      }
      return '';
    }
    function tagPos(k) {
      switch (k) {
        case 'body': return [bx + 30, by - 92];
        case 'gp': return [cx + e.rx * 0.45, cy - e.ry - gpL - 34];
        case 'R': return [cx + 30, rTop - 20];
        case 'h': return [cx + e.rx * 0.55, cy - e.ry - 10];
        case 'dg': return [ix + iw - 120, iy - 14];
      }
      return [0, 0];
    }

    function group(k, inner, hit) {
      if (!p.selectable) {
        return '<g class="grp g-' + k + cls(k) + pl(k) + '">' + inner + '</g>';
      }
      var t = C.targets[k];
      return '<g class="grp g-' + k + cls(k) + ' tgt" data-action="select-target" data-target="' + k + '" data-fk="tgt-' + k + '"' +
        ' role="button" tabindex="0" aria-pressed="' + (p.selected === k) + '" aria-label="' + esc(!shown(k) && t.ariaFind ? t.ariaFind : t.aria) + '">' +
        inner + (hit || '') + '<g class="focus-ring" aria-hidden="true">' + shape(k, 'fill="none"') + '</g></g>';
    }

    var hitBody = '<circle cx="' + bx + '" cy="' + by + '" r="80" fill="transparent" class="hit"/>';
    var hitR = '<rect x="' + (cx - 20) + '" y="' + r1(rTop - 12) + '" width="40" height="' + r1(level + 18) + '" fill="transparent" class="hit"/>';
    var hitDg = '<rect x="' + ix + '" y="' + iy + '" width="' + iw + '" height="' + ih + '" fill="transparent" class="hit"/>';

    var selection = '';
    if (p.selected) {
      var st = p.selState || 'pending';
      var tp = tagPos(p.selected);
      var label = st === 'correct' ? 'Correct' : st === 'wrong' ? 'Your selection' : 'Selected';
      var tw = label.length * 8.6 + 20;
      selection = '<g class="sel sel-' + st + '" aria-hidden="true">' + shape(p.selected, 'fill="none"') +
        '<rect x="' + r1(tp[0]) + '" y="' + r1(tp[1] - 18) + '" width="' + r1(tw) + '" height="26" rx="4" class="sel-tag"/>' +
        '<text x="' + r1(tp[0] + 10) + '" y="' + r1(tp[1]) + '" class="t-seltag">' + label + '</text></g>';
    }

    var desc = (p.dirs ? 'Your sketch, drawn from your answers (sizes show direction, not amount). ' : '') + 'Diagram: an external body on the left attracts every part of an ocean planet on the right: a rocky core covered by an ocean. ' +
      (p.hidden ? 'The bulge is hidden until you submit. ' :
        'The ocean bulges along the line toward and away from the body; ' + (p.dirs ? 'height ' : p.hTag === 'you' ? 'your predicted height ' : 'modeled height ') + f(hShown) + ' m, shape exaggerated. ' +
        (p.ghost != null ? 'A dashed outline marks your prediction of ' + f(p.ghost) + ' m. ' : '')) +
      'Amber arrows show external acceleration pointing toward the body: largest on the near side, smallest on the far side. ' +
      'Cyan arrows show the planet’s own gravity pointing inward' + (facWords('gp') ? ' (' + facWords('gp') + ')' : '') + '. ' +
      'A dotted violet line shows the radius R' + (facWords('R') ? ' (' + facWords('R') + ')' : '') + '.' +
      (facWords('dg') ? ' The near-to-far difference Δg is ' + facWords('dg') + '.' : '');

    var svgOpen = '<svg class="planet-svg' + (p.compact ? ' compact' : '') + '" data-idp="' + idp + '"' + (e0 || p.fromProps ? ' data-tween' : '') + ' viewBox="0 0 ' + W + ' ' + H + '" ' +
      (p.selectable ? 'role="group" aria-label="Planet diagram — choose a part"' : 'role="img" aria-label="' + esc(desc) + '"') + '>';

    return svgOpen + defs + stars + halo +
      group('body', bodyInner, hitBody) +
      connector +
      group('h', oceanInner + hBracket + hiddenText) +
      ghost +
      dgArrows +
      group('gp', gpInner, gpHits) +
      group('R', rInner, hitR) +
      centreDot +
      (p.compact ? '' : group('dg', insetInner, hitDg)) +
      labels + selection +
      (p.planetName ? '<text x="' + cx + '" y="' + (H - 18) + '" text-anchor="middle" class="t-lbl b t-planet-name">' + p.planetName + '</text>' : '') +
      '</svg>';
  }

  /* Sensor readout panel: horizontal arrows proportional to the readings. */
  // showDg: print the Δg value under the bracket. It stays off until the learner has answered,
  // because working out that the difference is unchanged is the task.
  function sensorSVG(r, amt, idp, display, showDg) {
    display = display || r;
    var anchor = 388, sc = 12;
    function tip(v) { return Math.round((anchor - v * sc) * 10) / 10; }
    var rows = [['Near', 'near', 46], ['Center', 'centre', 90], ['Far', 'far', 134]];
    var out = '<svg class="sensor-svg" viewBox="0 0 400 196" role="img" aria-label="' +
      esc('Near ' + display.near + ', center ' + display.centre + ', far ' + display.far + '.' + (showDg ? ' Δg = ' + M.deltaG(display) + '.' : '')) + '">' +
      '<defs><marker id="' + idp + '-ah" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="3.6" markerHeight="3.6" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="' + COL.dg + '"/></marker></defs>';
    rows.forEach(function (row) {
      var y = row[2];
      out += '<text x="10" y="' + (y + 5) + '" class="s-lbl">' + row[0] + '</text>' +
        '<text x="70" y="' + (y + 5) + '" class="s-val">' + display[row[1]].toFixed(1) + (amt ? ' (+' + amt + ')' : '') + '</text>' +
        '<line x1="' + anchor + '" y1="' + y + '" x2="' + tip(r[row[1]]) + '" y2="' + y + '" stroke="' + COL.dg + '" stroke-width="5" stroke-linecap="round" marker-end="url(#' + idp + '-ah)"/>';
    });
    var tn = tip(r.near), tf = tip(r.far);
    out += '<polyline class="s-bracket" points="' + tn + ',56 ' + tn + ',162 ' + tf + ',162 ' + tf + ',144" fill="none" stroke="' + COL.dg + '" stroke-width="2" stroke-dasharray="3 4"/>' +
      '<text x="' + tn + '" y="186" class="s-dg">Δg = near − far' + (showDg ? ' = ' + M.deltaG(display).toFixed(1) : '') + '</text></svg>';
    return out;
  }

  /* ===================================================================== *
   * Views — each returns { stage, head, body, after? }
   * ===================================================================== */
  // Definition banner (Pre-flight Check): the symbol and what it means, without the formula.
  function defBannerHTML(key) {
    var d = C.definitions.filter(function (x) { return x.key === key; })[0];
    if (!d) return '';
    return '<div class="def-banner db-' + key + '"><b class="sym c-' + key + '">' + d.sym + '</b><span>' + d.text + '</span></div>';
  }
  // A footnote for every stage that shows the planet diagram.
  var STAGE_FOOT = '<p class="stage-foot">*Deformation exaggerated for visibility</p>';

  function scenarioCardHTML(label, text) {
    return '<div class="scenario-card"><p class="mini-label">' + label + '</p><p>' + text + '</p></div>';
  }

  var VIEWS = {};

  /* ---------------- A. Briefing ---------------- */
  VIEWS.briefing = function (id, a) {
    var B = C.briefing;
    var V = C.video;
    var stage;
    if (ui.video === 'fallback') {
      var blocked = /youtube-error-(101|150)/.test(state.video.opening.error || '');
      var title = ui.videoReason === 'chosen' ? 'Scene summary'
        : blocked ? 'This clip can’t play inside the module — here’s the scene.'
          : 'The video couldn’t load — here’s the scene.';
      var watchLink = '<p class="watch-out">' + (blocked ? 'The clip’s owner doesn’t allow it to play on other websites. ' : '') +
        'You can <a href="' + C.video.watchUrl + '&amp;t=' + V.opening.start + 's" target="_blank" rel="noopener">watch ' +
        mmss(V.opening.start) + '–' + mmss(V.opening.end) + ' on YouTube<span class="sr-only"> (opens in a new tab)</span></a>, then come back.</p>';
      stage = '<div class="stage-inner video-stage"><section class="fallback-card" aria-labelledby="fb-title">' +
        '<h2 id="fb-title" class="fallback-title" tabindex="-1">' + I.info + '<span>' + title + '</span></h2>' +
        '<div class="fallback-grid"><div><p>' + B.sceneSummary + '</p><p class="muted">' + B.sceneBridge + '</p>' + watchLink + '</div>' +
        '<div class="fallback-figure">' + planetSVG({ idp: 'pf', compact: true }) + '</div></div>' +
        '<div class="row">' + btn('Try video again', 'video-retry', { kind: 'secondary', fk: 'video-retry' }) +
        btn('Continue without video', 'video-continue', { kind: 'ghost', fk: 'video-continue' }) + '</div>' +
        '</section></div>';
    } else {
      var frame = ui.video === 'player'
        ? '<div id="yt-opening" class="yt-mount"></div>'
        : '<button type="button" class="video-start vs-still" data-action="video-play" data-fk="video-play">' +
          '<span class="play-circle">' + I.play + '</span><span class="vs-title">Play the opening scene</span>' +
          '<span class="vs-sub">' + mmss(V.opening.start) + '–' + mmss(V.opening.end) + ' · about ' + (V.opening.end - V.opening.start) + ' s · plays from YouTube</span></button>';
      var fileNote = location.protocol === 'file:'
        ? '<p class="video-note">' + I.info + '<span>This page is open as a local file, so YouTube may refuse to play. Run a local web server (see README) or read the scene summary.</span></p>' : '';
      var verifyNote = MODE.author && V.opening.status !== 'verified'
        ? '<p class="video-note warn">' + I.info + '<span>Excerpt boundaries are marked “to verify” in content.js. Check them by watching playback.</span></p>' : '';
      stage = '<div class="stage-inner video-stage">' +
        '<p class="video-tag">' + V.title + ' · opening excerpt</p>' +
        '<div class="video-frame">' + frame + '</div>' +
        '<p id="video-status" class="video-status" role="status"></p>' +
        '<div class="video-actions">' +
        btn('Skip video', 'video-skip', { kind: 'ghost', fk: 'video-skip' }) +
        '<button type="button" class="link-btn" data-action="video-summary" data-fk="video-summary">Video won’t load? Read the scene summary</button>' +
        '</div>' + fileNote + verifyNote + '</div>';
    }

    // Two learner-paced sections: first the scene (crew message, what to do, the video), then
    // the opening question on its own. A draft or a logged idea reopens on the second section.
    var d = a.draft;
    var ideaStep = !!(state.firstIdea || ui.briefIdea || d.notSure || (d.text && d.text.trim()));
    var head, body;
    if (!ideaStep) {
      var fb = ui.video === 'fallback';
      head = headHTML({ eyebrow: B.eyebrow, heading: fb ? B.headingFallback : B.heading, prompt: B.prompt, hint: false });
      // The question opens once the scene has been watched to the end, skipped, or read as a summary.
      var seen = openingSeen();
      body = actionsHTML(btn(B.next, 'brief-next', { fk: 'primary', disabled: !seen }) +
        '<p class="helper" id="brief-helper"' + (seen ? ' hidden' : '') + '>' + B.nextHelper + '</p>');
    } else if (state.firstIdea) {
      head = headHTML({ eyebrow: B.eyebrow, heading: B.question, hint: false, crew: false });
      body = quoteHTML('Your first idea (logged)', state.firstIdea.notSure && !state.firstIdea.text ? 'Not sure yet' : state.firstIdea.text) +
        '<p class="note">' + B.loggedNote + '</p>' +
        actionsHTML(btn('Continue', 'continue', { fk: 'primary' }));
    } else {
      head = headHTML({ eyebrow: B.eyebrow, heading: B.question, hint: false, crew: false });
      body = '<div class="field"><label class="field-label" for="first-idea">' + B.ideaLabel + '</label>' +
        '<textarea id="first-idea" rows="3" maxlength="500" placeholder="' + (B.ideaPlaceholder || 'Type a short idea…') + '" data-input="first-idea" data-fk="first-idea"' + (d.notSure ? ' disabled' : '') + '>' + esc(d.text || '') + '</textarea></div>' +
        '<label class="choice"><input type="checkbox" data-change="first-notsure" data-fk="first-notsure"' + (d.notSure ? ' checked' : '') + '><span>Not sure yet</span></label>' +
        actionsHTML(btn('Log idea &amp; continue', 'log-idea', { fk: 'primary', submit: true, disabled: !canSubmit(id, a) }) +
          '<p class="helper" id="submit-helper">Type an idea or choose “Not sure yet” to continue.</p>');
    }
    // No formula here: neither version has met the model yet.
    return { stage: stage, head: head, body: body, formula: false, phaseKey: !ideaStep ? 'scene' : state.firstIdea ? 'logged' : 'idea' };
  };

  function openingSeen() {
    var o = state.video.opening;
    return !!(o.reachedEndAt || o.skippedAt || o.fallbackShownAt || DEV.on);
  }

  function mmss(sec) { return Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0'); }

  /* ---------------- B. Learn the console ---------------- */
  VIEWS.console = function (id, a) {
    var task = C.consoleTasks[id];
    var at = attempt(a);
    var cue = activeCue(id);
    var sel = a.draft.selected || null;
    var phase = a.phase; // awaiting | wrong | correct | worked
    var selState = phase === 'wrong' ? 'wrong' : phase === 'correct' ? 'correct' : null;
    var highlight = cue && cue.diagram ? cue.diagram : null;
    if (phase === 'correct' || phase === 'worked') highlight = task.target;

    // Symbol labels stay hidden for inputs the learner hasn't found yet, so the task is mapping the
    // picture to the quantity rather than matching symbol text. Finding one reveals its label.
    var hideSyms = C.steps[state.pos.step].activities.filter(function (tid) {
      if (!C.consoleTasks[tid]) return false;
      var t = state.activities[tid];
      return !(t && (t.completedAt || t.phase === 'correct' || t.phase === 'worked'));
    }).map(function (tid) { return C.consoleTasks[tid].target; });

    var svg = planetSVG({
      idp: 'pc', selectable: phase === 'awaiting' || phase === 'wrong', hideSyms: hideSyms,
      selected: phase === 'worked' ? task.target : sel, selState: phase === 'worked' ? 'correct' : selState,
      highlight: highlight
    });
    var stage = '<div class="stage-inner">' +
      defBannerHTML(task.target) +
      subnavHTML(function (tid) { return C.consoleTasks[tid] ? 'Find ' + C.targets[C.consoleTasks[tid].target].name.replace(' panel', '').replace(' arrows', '').replace(' line', '') : null; }) +
      '<div class="diagram diagram-solo">' + svg + '</div></div>';

    var head = headHTML({ eyebrow: 'Explore the 3 variables' + countTag(task.n + ' of 3'), heading: task.heading });

    // The formula bar is the one place the target is defined: its definition shows throughout.
    // A selected visual also highlights its own term.
    var eqHl = [task.target];
    if (sel && ['dg', 'gp', 'R', 'h'].indexOf(sel) >= 0 && sel !== task.target && phase !== 'worked' && phase !== 'correct') eqHl.push(sel);
    if (cue && cue.eq) eqHl = cue.eq;

    var fb = '', actions;
    if (phase === 'wrong') {
      var given = at.outcome ? at.outcome.selected : sel;
      fb = feedbackHTML('notyet', 'Not this one.', '<p>' + C.targets[given].info + '</p><p>' + task.notYet + '</p>');
      actions = actionsHTML(btn('Try again', 'console-retry', { fk: 'primary' }),
        canOfferWorked(a) ? btn('Show me', 'worked', { kind: 'secondary', fk: 'worked' }) : '');
    } else if (phase === 'correct') {
      fb = feedbackHTML('correct', '', '<p>' + task.success + '</p>');
      actions = actionsHTML(btn(task.next, 'continue', { fk: 'primary' }) + (task.nextNote ? '<p class="helper caption">' + V(task, 'nextNote') + '</p>' : ''));
    } else if (phase === 'worked') {
      fb = feedbackHTML('answer', 'Here it is', '<p>' + task.success + '</p>') +
        '<div class="supported-note">' + I.info + '<p>' + SUPPORTED_NOTE() + '</p></div>';
      actions = actionsHTML(btn(task.next, 'continue', { fk: 'primary' }));
    } else {
      actions = actionsHTML(btn('Check selection', 'console-check', { fk: 'primary', submit: true, disabled: !canSubmit(id, a) }));
    }

    var body = hintPanelHTML(id) + eqCard(eqHl, null, [task.target]) +
      (phase === 'awaiting' ? (task.n === 1 ? '<p class="helper">Click a part of the diagram, or press Tab to move between parts and Enter to choose.</p>' : '') +
        (sel ? '<p class="selection-status">Selected: <b>' + C.targets[sel].name + '</b></p>' : '') : '') +
      fb + actions;
    return { stage: stage, head: head, body: body, formula: false };
  };

  /* ---------------- C. Experiments ---------------- */
  function experimentResult(id, at) {
    var cfg = C.experiments[id];
    var inputs = { dg: 1, gp: 1, R: 1 };
    inputs[cfg.key] = at.variant;
    return { inputs: inputs, h: M.modelHeight(inputs, BASE) };
  }

  function experimentOutcome(cfg, at) {
    var choice = cfg.choices.filter(function (c) { return c.id === at.explanation; })[0];
    var eo = choice && choice.correct ? 'correct' : (choice && choice.notSure ? 'not-sure' : 'incorrect');
    // A prediction is a guess, so it is not marked: a test is right when its explanation is.
    // How close the prediction came (correct / partly / not-yet) is kept beside it for analysis.
    var po = at.predictionOutcome == null ? null : at.predictionOutcome;
    return { prediction: po, explanation: eo, overall: eo === 'correct' ? 'correct' : 'not-yet' };
  }

  function describePrediction(p) {
    var d = M.direction(p, BASE);
    if (d === 'same') return 'no change (' + f(p) + ' m)';
    return (d === 'up' ? 'a taller bulge' : 'a smaller bulge') + ' (' + f(p) + ' m)';
  }

  function experimentFeedback(id, at) {
    var cfg = C.experiments[id];
    var res = experimentResult(id, at);
    var h = res.h, p = at.prediction;
    var o = at.outcome;
    var grew = M.direction(h, BASE) === 'up';
    var dirPhrase = grew ? 'grew to ' + f(h) + ' m' : 'got smaller';
    var title = o.overall === 'correct' ? 'Correct — the bulge ' + (grew ? 'grew to ' : 'shrank to ') + f(h) + ' m.'
      : 'Not yet — the bulge ' + dirPhrase + '.';
    // The prediction is reported back, not judged.
    var recap = p == null ? null
      : o.prediction === 'correct' ? 'Your prediction of ' + f(p) + ' m matched the result.'
        : 'You predicted ' + f(p) + ' m; the result was ' + f(h) + ' m.';
    var relation = cfg.relation(at.variant, h) + (cfg.extra ? ' ' + cfg.extra : '');
    var choice = cfg.choices.filter(function (c) { return c.id === at.explanation; })[0];
    // A wrong or unsure explanation gets its own correction first; otherwise the relationship leads.
    var own = o.explanation === 'incorrect' && choice ? choice.feedback : o.explanation === 'not-sure' ? cfg.notSureFeedback : null;
    var kind = o.overall === 'correct' ? 'correct' : 'notyet';
    return { kind: kind, title: title, body: own ? fbBody([own], [relation], [recap]) : fbBody([relation], [], [recap]) };
  }

  VIEWS.experiment = function (id, a) {
    var cfg = C.experiments[id];
    var at = attempt(a);
    var x = at.variant;
    var res = experimentResult(id, at);
    var h = res.h;
    var cue = activeCue(id);
    var phase = a.phase; // awaiting | result | explain | feedback | worked
    var shown = phase !== 'awaiting';
    var pred = shown ? at.prediction : (a.draft.prediction == null ? null : a.draft.prediction);
    var animate = ui.animate === id;

    // The diagram follows the learner: before the run it shows the height on the gauge (the
    // prediction, or the 4 m baseline until there is one); after the run it moves on to the
    // model's result and keeps the prediction as a dashed outline.
    var predicting = !shown && pred != null;
    var target = shown ? h : predicting ? pred : BASE;
    // What changed: the first time a test (or a fresh attempt at it) is on screen, its input
    // moves from the baseline to its new value. Only the cause moves; the ocean stays where
    // it is, so the cue does not make the prediction for the learner.
    var cueKey = id + '|' + at.attempt;
    var showChange = phase === 'awaiting' && pred == null && ui.cueShown !== cueKey && !reduced();
    if (phase === 'awaiting') ui.cueShown = cueKey;
    var changeFrom = {}; changeFrom[cfg.key] = 1;
    var startH = planetShown('px', id, target);
    var svg = planetSVG({
      idp: 'px', dg: res.inputs.dg, gp: res.inputs.gp, R: res.inputs.R, bodyName: 'Moon',
      h: target, from: Math.abs(startH - target) > 0.01 ? startH : null, showH: true, hValue: true,
      hTag: predicting ? 'you' : null, ghost: shown && pred != null ? pred : null,
      was: cfg.key, flow: cfg.key === 'R' ? null : cfg.key, fromProps: showChange ? changeFrom : null,
      highlight: cue && cue.diagram ? cue.diagram : null
    });
    var order = [cfg.key].concat(['dg', 'gp', 'R', 'k'].filter(function (k) { return k !== cfg.key; }));
    var chipList = order.map(function (k) { return { key: k, factor: k === cfg.key ? x : 1 }; });
    // Before the run the status says the diagram shows the baseline; afterwards the gauge and
    // the heading carry the result, so it isn't repeated here.
    var status = cfg.n > 1 || at.attempt > 1 ? 'Reset to baseline · showing 4 m' : 'Showing baseline · 4 m';

    var stage = '<div class="stage-inner">' +
      '<div class="lab-title"><h2 class="lab-title-text">' + cfg.title + '</h2>' +
      '<div class="lab-status">' + ['dg', 'gp', 'R'].map(function (k) {
        var on = k === cfg.key;
        // Each chip is a button: it says what its symbol means (see the symbol key below).
        return '<button type="button" class="lab-chip' + (on ? ' on c-' + k : '') + '" data-sym="' + k + '" data-fk="chip-' + k + '">' + C.inputs[k].sym + ' ' + (on ? times(x) : 'Fixed') + '</button>';
      }).join('') +
      // The cue is gone once it has played, so it can be seen again (not offered with reduced motion,
      // where the baseline marks on the diagram carry it).
      (reduced() ? '' : '<button type="button" class="replay-btn" data-action="cue-replay" data-fk="cue-replay">' + I.retry + '<span>' + C.labPredict.replay + '</span></button>') +
      '</div></div>' +
      '<div class="diagram-row"><div class="diagram">' + svg + '</div>' +
      gaugeHTML({ pred: pred, result: shown ? h : null, locked: shown, animate: animate, current: shown ? null : BASE, resultWord: 'Result' }) + '</div>' +
      (shown ? hbarsHTML(pred, h, 'narrow-only', 'Result') : '') +
      '</div>';

    var eyebrow = 'Tide Lab' + countTag('test ' + cfg.n + ' of 3');
    var nextNote = '<p class="helper caption">' + (cfg.n === 1 ? 'Click Continue to test ' + S.gp + '.' : cfg.n === 2 ? 'Click Continue to test R.' : 'Click Continue to review your lab results.') + '</p>';
    var head, body;
    var eqHl = cue && cue.eq ? cue.eq : [];
    // Signalling: the input that changes is highlighted in the formula on every phase (a hint's
    // own highlight takes over while it is open). Its definition shows with the result only.
    function eqFor(withDef) { return eqHl.length ? eqCard(eqHl) : eqCard([cfg.key], null, withDef ? null : []); }

    if (phase === 'awaiting') {
      head = headHTML({ eyebrow: eyebrow, badge: attemptBadge(at), heading: cfg.question(x), prompt: cfg.prompt(x) });
      body = hintPanelHTML(id) + '<p class="prompt">' + C.labPredict.prompt + '</p>' + stepperHTML(pred, false) +
        '<p class="helper" id="pred-helper">' + predHelperText(pred, 'run') + '</p>' +
        eqFor(false) +
        actionsHTML(btn('Run experiment', 'run-exp', { fk: 'primary', submit: true, disabled: !canSubmit(id, a) }) +
          '<p class="helper" id="submit-helper">' + (pred == null ? 'Make a prediction to unlock the experiment.' : 'Results stay hidden until you run it.') + '</p>');
    } else if (phase === 'result') {
      // Version A, which has the formula, sees the model's arithmetic. Version B has not met
      // the formula yet, so the same result is stated as what the test showed.
      var ratio = M.heightRatio(res.inputs);
      var note = FORMULA_FIRST
        ? S.dg + ' ' + times(res.inputs.dg) + ' ÷ ' + S.gp + ' ' + times(res.inputs.gp) +
          ' × R ' + times(res.inputs.R) + ' = ' + f(ratio) + ' → <span class="nowrap">4 m × ' + f(ratio) + ' = ' + f(h) + ' m</span>'
        : 'Only ' + C.inputs[cfg.key].sym + ' changed (' + times(x) + '). The bulge went from 4 m to ' + f(h) + ' m: <span class="nowrap">' +
          (M.direction(h, BASE) === 'up' ? '×' + f(h / BASE) : '÷' + f(BASE / h)) + '</span>.';
      head = headHTML({ eyebrow: eyebrow, badge: attemptBadge(at), heading: 'Test result: ' + f(h) + ' m.' });
      // Called a test result, not the model's: in version B the learner has not met the model yet.
      // The gauge compares prediction, result and baseline; the panel adds what the result means.
      body = hintPanelHTML(id) +
        '<div class="calc-card"><p class="mini-label">' + C.labResults.resultCard[FORMULA_FIRST ? 'formula' : 'evidence'] + '</p><p class="calc-note">' + note + '</p></div>' +
        (MODE.research ? '<p class="note">' + (at.attempt === 1 ? 'Saved as your first attempt. Retries are recorded separately.'
          : 'Saved as attempt ' + at.attempt + '. Your first attempt is kept separately.') + '</p>' : '') +
        eqFor(true) +
        actionsHTML(btn('Explain the result', 'to-explain', { fk: 'primary' }));
    } else if (phase === 'explain') {
      head = headHTML({ eyebrow: eyebrow, badge: attemptBadge(at), heading: 'The bulge ' + (M.direction(h, BASE) === 'up' ? 'grew' : 'shrank') + ' to ' + f(h) + ' m. Why?', prompt: 'Choose the best physical explanation.' });
      body = hintPanelHTML(id) +
        radiosHTML('exp-choice', cfg.choices, a.draft.choice, { srLegend: 'Physical explanation' }) +
        eqFor(false) +
        actionsHTML(btn('Submit explanation', 'submit-explain', { fk: 'primary', submit: true, disabled: !canSubmit(id, a) }));
    } else if (phase === 'feedback') {
      var fbk = experimentFeedback(id, at);
      head = headHTML({ eyebrow: eyebrow, badge: attemptBadge(at), heading: 'The bulge ' + (M.direction(h, BASE) === 'up' ? 'grew' : 'shrank') + ' to ' + f(h) + ' m. Why?' });
      var extra = canOfferWorked(a) ? '<div class="worked-offer"><p class="helper">Still tricky? You can review a worked solution and continue.</p>' +
        btn('Review worked solution', 'worked', { kind: 'ghost', fk: 'worked' }) + '</div>' : '';
      body = hintPanelHTML(id) + radiosHTML('exp-choice', cfg.choices, at.explanation, { locked: true }) +
        feedbackHTML(fbk.kind, fbk.title, fbk.body) + evidenceAddedHTML(cfg.evidence) + eqFor(false) +
        nextActionsHTML(at.outcome.overall !== 'correct', 'Try a fresh prediction', 'Continue', 'continue', extra) + nextNote;
    } else { // worked
      head = headHTML({ eyebrow: eyebrow, badge: attemptBadge(at), heading: 'Let’s walk through it together.' });
      body = hintPanelHTML(id) + workedHTML(cfg.worked(x, h, FORMULA_FIRST)) + evidenceAddedHTML(cfg.evidence) +
        actionsHTML(btn('Continue', 'continue', { fk: 'primary' })) + nextNote;
    }
    return {
      // The formula bar is on screen through the Tide Lab only where the model has already
      // been given (version A). Version B meets it after the tests, in Decode the Model.
      stage: stage, head: head, body: body, formula: FORMULA_FIRST, phaseKey: phase + '|' + at.attempt,
      after: function (animating) { runTweens(els.stage, animating === id ? 900 : 350); }
    };
  };

  /* ---------------- D. Sensor update ---------------- */
  function sensorOutcome(at) {
    var choiceOk = at.choice === 'same';
    var qOk = at.quantity === 'dg';
    return { choiceCorrect: choiceOk, quantityCorrect: qOk, overall: choiceOk && qOk ? 'correct' : (choiceOk || qOk) ? 'partly' : 'not-yet' };
  }

  VIEWS.sensor = function (id, a) {
    var cfg = C.sensor;
    var at = attempt(a);
    var amt = at.variant;
    var before = cfg.readings;
    var after = M.addUniform(before, amt);
    var dgB = M.deltaG(before), dgA = M.deltaG(after);
    var hAfter = M.heightAfterReadings(before, after, BASE);
    var cue = activeCue(id);
    var phase = a.phase; // awaiting | feedback | worked
    var answered = phase !== 'awaiting';
    if (!at.playedUpdate) { at.playedUpdate = true; ui.animate = id; }
    var animating = ui.animate === id;

    var stage = '<div class="stage-inner">' +
      inputsBlock('Locked model inputs', [{ key: 'gp', factor: 1 }, { key: 'R', factor: 1 }, { key: 'k', factor: 1 }], cue && cue.inputs) +
      '<div class="readout-head"><p class="mini-label">Sensor readout · external acceleration toward the body (' + cfg.unitsNote + ')</p>' +
      '<p class="toward c-dg">← Toward external body</p></div>' +
      '<div class="sensor-panels' + (cue && cue.brackets ? ' cue-brackets' : '') + '">' +
      '<figure class="sensor-panel"><figcaption>Before update</figcaption>' + sensorSVG(before, 0, 'sb', null, answered) + '</figure>' +
      '<span class="sensor-arrow" aria-hidden="true">→</span>' +
      '<figure class="sensor-panel after"><figcaption>After update · +' + amt + ' everywhere</figcaption><div id="sensor-after">' +
      sensorSVG(animating && !reduced() ? before : after, amt, 'sa', after, answered) + '</div></figure></div>' +
      '<div class="sensor-summary">' +
      (answered ? '<div><p class="mini">' + S.dg + ' before</p><p class="val c-dg">' + dgB.toFixed(1) + '</p></div>' +
        '<div><p class="mini">' + S.dg + ' after</p><p class="val c-dg">' + dgA.toFixed(1) + '</p></div>' : '') +
      '<div class="grow"><p class="mini">Modeled bulge</p><p class="val' + (answered ? '' : ' muted') + '">' +
      (answered ? f(hAfter) + ' m (unchanged)' : 'Hidden until you answer') + '</p></div></div>' +
      '<button type="button" class="link-btn" data-action="sensor-replay" data-fk="sensor-replay">Replay the update</button>' +
      '</div>';

    var head = headHTML({ eyebrow: 'Sensor update', badge: attemptBadge(at), heading: cfg.heading, prompt: cfg.prompt });

    var eqHl = cue && cue.eq ? cue.eq : [];
    var body;
    if (phase === 'awaiting') {
      var qOpts = cfg.quantities.map(function (q) {
        return '<option value="' + q.id + '"' + (a.draft.quantity === q.id ? ' selected' : '') + (q.id === '' ? ' disabled' : '') + '>' + q.text + '</option>';
      }).join('');
      if (!a.draft.quantity) qOpts = qOpts.replace('<option value="" disabled>', '<option value="" disabled selected>');
      body = hintPanelHTML(id) +
        radiosHTML('sensor-choice', cfg.choices, a.draft.choice, { srLegend: 'Does the modeled bulge height change?' }) +
        '<div class="field"><label class="q" for="sensor-quantity">Which model quantity supports your answer?</label>' +
        '<select id="sensor-quantity" data-change="sensor-quantity" data-fk="sensor-quantity">' + qOpts + '</select></div>' +
        (eqHl.length ? eqCard(eqHl) : '') +
        actionsHTML(btn('Submit', 'sensor-submit', { fk: 'primary', submit: true, disabled: !canSubmit(id, a) }));
    } else if (phase === 'feedback') {
      var o = at.outcome;
      var kind, title, lines = [], after_ = [];
      if (o.overall === 'correct') {
        kind = 'correct'; title = 'Correct — the bulge stays at 4 m.';
        lines.push('Every reading rose by ' + amt + ', so the near-to-far difference is still ' + dgA + '. The model depends on ' + S.dg + ', not on the overall pull. A bigger overall pull isn’t a bigger difference.');
      } else if (o.choiceCorrect) {
        kind = 'partly'; title = 'Partly there — right answer, check the reason.';
        lines.push(cfg.quantityFeedback[at.quantity] || '');
        after_.push('The bulge does stay at 4 m.');
      } else if (o.quantityCorrect) {
        kind = 'partly'; title = 'Partly there — right quantity, check the prediction.';
        lines.push(S.dg + ' is the right quantity to check — and it didn’t change: it is ' + dgB + ' before and ' + dgA + ' after. So the modeled bulge stays at 4 m.');
      } else {
        kind = 'notyet'; title = 'Not yet — the bulge stays at 4 m.';
        if (at.choice === 'higher') lines.push('The overall pull did increase, but every reading rose by the same amount (' + amt + '). ' + S.dg + ' is still ' + dgA + ', so the model’s bulge stays at 4 m.');
        else lines.push('Nothing that resists deformation changed (' + S.gp + ' is locked), and ' + S.dg + ' is still ' + dgA + '. So the model’s bulge stays at 4 m.');
        if (cfg.quantityFeedback[at.quantity]) after_.push(cfg.quantityFeedback[at.quantity]);
      }
      var pick = cfg.choices.filter(function (c) { return c.id === at.choice; })[0];
      var qPick = cfg.quantities.filter(function (q) { return q.id === at.quantity; })[0];
      body = hintPanelHTML(id) +
        '<div class="choice choice-locked"><span class="radio-dot on" aria-hidden="true"></span><span>' + pick.text + ' · ' + esc(qPick.text) + '</span></div>' +
        feedbackHTML(kind, title, fbBody(lines, after_)) +
        evidenceAddedHTML('ev-uniform') +
        nextActionsHTML(o.overall !== 'correct', 'Try a fresh update', 'Continue to quick checks', 'continue',
          canOfferWorked(a) ? '<div class="worked-offer">' + btn('Review worked solution', 'worked', { kind: 'ghost', fk: 'worked' }) + '</div>' : '');
    } else {
      body = hintPanelHTML(id) + workedHTML(cfg.worked(amt, before, after)) + evidenceAddedHTML('ev-uniform') +
        actionsHTML(btn('Continue to quick checks', 'continue', { fk: 'primary' }));
    }

    return {
      stage: stage, head: head, body: body,
      after: function (anim) {
        if (anim !== id) return;
        var host = document.getElementById('sensor-after');
        if (!host) return;
        tween(1000, function (k) {
          var r = {
            near: before.near + (after.near - before.near) * k,
            centre: before.centre + (after.centre - before.centre) * k,
            far: before.far + (after.far - before.far) * k
          };
          host.innerHTML = sensorSVG(r, amt, 'sa', after, answered);
        });
      }
    };
  };

  /* ---------------- D2. Quick checks (mixed practice with input mapping) ---------------- */
  // The scenario never names the changing input: the learner maps it to Δg / gₚ / R first.
  var MAP_KEYS = ['dg', 'gp', 'R'];

  function mixedInputs(v) {
    var c = v.change || {};
    return { dg: c.dg || 1, gp: c.gp || 1, R: c.R || 1 };
  }
  function dirOf(x) { return x > 1 ? 'up' : x < 1 ? 'down' : 'fixed'; }
  // Before Check, the diagram draws the learner's own answers. Up/down use one illustrative step
  // (not the scenario's factor), so the sketch shows direction only and gives nothing away.
  var SKETCH_STEP = { up: 2, down: 0.5 };
  function sketchFactor(dir) { return SKETCH_STEP[dir] || 1; }
  function dirText(id) {
    var d = C.mixed.directions.filter(function (x) { return x.id === id; })[0];
    return d ? d.text : id;
  }
  function dirPhrase(id) { return id === 'up' ? 'goes up' : id === 'down' ? 'goes down' : 'stays fixed'; }
  function mixedRatioLine(inp, h) {
    var ratio = M.heightRatio(inp);
    return 'Ratio to baseline: ' + S.dg + ' ' + times(inp.dg) + ' ÷ ' + S.gp + ' ' + times(inp.gp) + ' × R ' + times(inp.R) +
      ' = ' + f(ratio) + ', so <span class="nowrap">4 m × ' + f(ratio) + ' = ' + f(h) + ' m</span>.';
  }

  function mixedOutcome(at) {
    var inp = mixedInputs(at.variant);
    var h = M.modelHeight(inp, BASE);
    var rows = {}, wrong = 0;
    MAP_KEYS.forEach(function (k) {
      var ok = at.mapping[k] === dirOf(inp[k]);
      if (!ok) wrong++;
      rows[k] = { given: at.mapping[k], model: dirOf(inp[k]), correct: ok };
    });
    var predOk = Math.abs(at.prediction - h) < 1e-6;
    var mapOk = wrong === 0;
    return {
      mapping: rows, mappingCorrect: mapOk, wrongInputs: wrong,
      prediction: { given: at.prediction, model: h, correct: predOk },
      overall: mapOk && predOk ? 'correct' : (mapOk || predOk) ? 'partly' : 'not-yet'
    };
  }

  VIEWS.mixed = function (id, a) {
    var cfg = C.mixed;
    var item = cfg.items[id];
    var total = C.steps[state.pos.step].activities.length;
    var at = attempt(a);
    var v = at.variant;
    var inp = mixedInputs(v);
    var h = M.modelHeight(inp, BASE);
    var phase = a.phase; // awaiting | feedback | worked
    var shown = phase !== 'awaiting';
    var cue = activeCue(id);
    var animate = ui.animate === id;
    var d = a.draft;
    // One-shot: the part of the sketch the learner just changed flashes (and the ocean eases to a new height).
    var sk = ui.sketch && ui.sketch.act === id && !shown ? ui.sketch : null;
    ui.sketch = null;

    var svg;
    if (shown) {
      // On Check the ocean grows or shrinks from the learner's predicted height to the model's.
      svg = planetSVG({
        idp: 'pm', dg: inp.dg, gp: inp.gp, R: inp.R, bodyName: 'Moon',
        h: h, from: animate ? at.prediction : null, showH: true,
        highlight: cue && cue.diagram ? cue.diagram : null
      });
    } else {
      var smap = d.map || {};
      var predH = d.pred != null ? +d.pred : null;
      svg = planetSVG({
        idp: 'pm', dirs: smap, bodyName: 'Moon',
        dg: sketchFactor(smap.dg), gp: sketchFactor(smap.gp), R: sketchFactor(smap.R),
        h: predH != null ? predH : BASE, showH: predH != null, hValue: predH != null,
        from: sk && sk.key === 'h' && sk.fromH != null ? sk.fromH : null,
        pulse: sk ? sk.key : null,
        highlight: cue && cue.diagram ? cue.diagram : null
      });
    }
    var reveal = shown
      ? inputsBlock('What the scenario changes', [{ key: 'dg', factor: inp.dg }, { key: 'gp', factor: inp.gp }, { key: 'R', factor: inp.R }, { key: 'k', factor: 1 }])
      : (C.mixed.sketchNote ? '<p class="map-note">' + I.info + '<span>' + C.mixed.sketchNote + '</span></p>' : '');
    var status = '';
    if (!shown && C.mixed.sketchNote) {
      var sm = d.map || {};
      var anyMapped = MAP_KEYS.some(function (k) { return sm[k]; });
      status = '<p class="diagram-status"><span class="status-dot" aria-hidden="true"></span>' +
        (d.pred != null ? 'Your sketch · predicted bulge ' + f(+d.pred) + ' m'
          : anyMapped ? 'Your sketch · bulge still at the 4 m baseline' : 'Showing baseline · 4 m') + '</p>';
    }
    var stage = '<div class="stage-inner">' +
      subnavHTML(function (mid, i) { return 'Check ' + (i + 1); }) +
      reveal + status +
      '<div class="diagram diagram-solo">' + svg + '</div>' +
      (shown ? hbarsHTML(at.prediction, h) : (C.mixed.sketchScale ? '<p class="values-note">' + I.info + '<span>' + C.mixed.sketchScale + '</span></p>' : '')) + '</div>';

    var head = headHTML({
      eyebrow: cfg.eyebrow + countTag(item.n + ' of ' + total), badge: attemptBadge(at),
      heading: shown ? 'The model’s result: ' + f(h) + ' m.' : 'Scenario ' + item.n
    });

    var eqHl = cue && cue.eq ? cue.eq : [];
    var nextLabel = item.n < total ? 'Next check' : 'Continue';
    var body;
    if (phase === 'awaiting') {
      var map = d.map || {};
      var mapRows = MAP_KEYS.map(function (k) {
        var ic = C.inputs[k];
        return radiosHTML('map-' + k, cfg.directions, map[k], {
          row: true, legend: '<b class="sym c-' + k + '">' + ic.sym + '</b> <span class="map-legend-label">' + ic.label + '</span>'
        });
      }).join('');
      var predItems = cfg.heightOptions.map(function (x) {
        return { id: String(x), text: f(x) + ' m' + (x === BASE ? ' (no change)' : '') };
      });
      body = hintPanelHTML(id) + scenarioCardHTML('Scenario', v.scenario) +
        (cfg.prompt ? '<p class="helper">' + cfg.prompt + '</p>' : '') +
        '<div class="map-block"><p class="q">1 · What happens to each model input?</p>' + mapRows + '</div>' +
        radiosHTML('mixed-pred', predItems, d.pred, { row: true, legend: '2 · Predict the new bulge height (baseline 4 m, from Check 1)' }) +
        eqCard(eqHl, K_NOTE) +
        actionsHTML(btn('Check', 'mixed-submit', { fk: 'primary', submit: true, disabled: !canSubmit(id, a) }) +
          '<p class="helper" id="submit-helper">Choose an answer for all three inputs and a height.</p>');
    } else if (phase === 'feedback') {
      var o = at.outcome;
      var kind = o.overall === 'correct' ? 'correct' : o.overall === 'partly' ? 'partly' : 'notyet';
      var title = o.overall === 'correct' ? 'Correct — the model gives ' + f(h) + ' m.'
        : o.mappingCorrect ? 'Partly there — right inputs, check the height.'
          : o.prediction.correct ? 'Partly there — right height, check which inputs changed.'
            : 'Not yet — the model gives ' + f(h) + ' m.';
      var fixes = [];
      MAP_KEYS.forEach(function (k) {
        var r = o.mapping[k];
        if (!r.correct) fixes.push(C.inputs[k].sym + ': you chose “' + dirText(r.given) + '” — it ' + dirPhrase(r.model) + '.');
      });
      var recap = (o.prediction.correct ? 'Your prediction of ' + f(at.prediction) + ' m matched the model. ' : 'You predicted ' + f(at.prediction) + ' m. ') + mixedRatioLine(inp, h);
      // Wrong mapping: lead with which input the scenario changes. Otherwise lead with the physics.
      var fb = o.mappingCorrect ? fbBody([v.physical], [v.why], [recap]) : fbBody([v.why], fixes.concat([v.physical]), [recap]);
      var yours = '<div class="choice choice-locked" aria-label="Your answer"><span class="radio-dot on" aria-hidden="true"></span><span>' +
        MAP_KEYS.map(function (k) { return C.inputs[k].sym + ' ' + dirText(at.mapping[k]).toLowerCase(); }).join(' · ') +
        ' · ' + f(at.prediction) + ' m</span></div>';
      eqCard(eqHl, K_NOTE);
      body = hintPanelHTML(id) + scenarioCardHTML('Scenario', v.scenario) + yours +
        feedbackHTML(kind, title, fb) +
        nextActionsHTML(o.overall !== 'correct', 'Try a fresh check', nextLabel, 'continue',
          canOfferWorked(a) ? '<div class="worked-offer">' + btn('Review worked solution', 'worked', { kind: 'ghost', fk: 'worked' }) + '</div>' : '');
    } else { // worked
      var steps = [
        'Map the scenario: ' + MAP_KEYS.map(function (k) { return C.inputs[k].sym + ' ' + dirPhrase(dirOf(inp[k])); }).join(', ') + '. ' + v.why,
        mixedRatioLine(inp, h),
        'Physically: ' + v.physical.charAt(0).toLowerCase() + v.physical.slice(1)
      ];
      body = hintPanelHTML(id) + workedHTML(steps) + actionsHTML(btn(nextLabel, 'continue', { fk: 'primary' }));
    }
    return {
      stage: stage, head: head, body: body,
      after: function (anim) { if (anim === id || (sk && sk.key === 'h')) runTweens(els.stage); }
    };
  };

  /* ---------------- E. Compare three planets ---------------- */
  function planetHeights(set) {
    return set.map(function (pl) {
      var ratio = M.heightRatio({ dg: pl.dg, gp: pl.gp });
      return { id: pl.id, dg: pl.dg, gp: pl.gp, ratio: ratio, h: M.modelHeight({ dg: pl.dg, gp: pl.gp }, BASE) };
    });
  }

  VIEWS.planets = function (id, a) {
    var cfg = C.planets;
    var at = attempt(a);
    var set = planetHeights(at.variant);
    var phase = a.phase; // awaiting | feedback | worked
    var revealed = phase !== 'awaiting';
    var cue = activeCue(id);
    var animate = ui.animate === id;
    var minH = Math.min.apply(null, set.map(function (p) { return p.h; }));
    var smallestId = set.filter(function (p) { return p.h === minH; })[0].id;
    var d = a.draft;
    var est = revealed ? at.estimates : (d.estimates || {});

    var cards = set.map(function (pl) {
      var given = est[pl.id];
      var rows = '<div class="pc-row' + (cue && cue.rows ? ' cue-row' : '') + '"><span class="sw sw-dg" aria-hidden="true"></span><b class="c-dg">' + S.dg + '</b><span>external difference</span><b class="pc-f">' + times(pl.dg) + '</b></div>' +
        '<div class="pc-row' + (cue && cue.rows ? ' cue-row' : '') + '"><span class="sw sw-gp" aria-hidden="true"></span><b class="c-gp">' + S.gp + '</b><span>surface gravity</span><b class="pc-f">' + times(pl.gp) + '</b></div>' +
        '<div class="pc-row"><span class="sw sw-R" aria-hidden="true"></span><b class="c-R">R</b><span>radius</span><span class="lock">' + I.lock + 'Same</span></div>';
      var foot;
      if (!revealed) {
        foot = '<label class="field-label" for="est-' + pl.id + '">Predicted height vs baseline</label>' +
          '<select id="est-' + pl.id + '" data-change="est" data-planet="' + pl.id + '" data-fk="est-' + pl.id + '">' +
          '<option value=""' + (given == null ? ' selected' : '') + ' disabled>Choose…</option>' +
          cfg.estimateOptions.map(function (v) {
            return '<option value="' + v + '"' + (given === v ? ' selected' : '') + '>' + f(v) + '× baseline</option>';
          }).join('') + '</select>';
      } else {
        var match = Math.abs(given - pl.ratio) < 1e-6;
        foot = '<div class="pc-result"><div><p class="mini">You</p><p class="pc-big">' + f(given) + '×</p></div>' +
          '<div><p class="mini">Model</p><p class="pc-big">' + f(pl.ratio) + '× · ' + f(pl.h) + ' m</p></div>' +
          '<span class="pc-mark ' + (match ? 'ok' : 'miss') + '">' + (match ? I.check : I.retry) + '<span class="sr-only">' + (match ? 'Your estimate matches' : 'Your estimate differs') + '</span></span></div>';
      }
      var state_ = revealed ? (Math.abs(given - pl.ratio) < 1e-6 ? ' match' : ' miss') : '';
      return '<article class="planet-card' + state_ + '" aria-label="Planet ' + pl.id + '">' +
        '<h3 class="pc-title"><span class="pc-icon" aria-hidden="true"></span>Planet ' + pl.id + '</h3>' +
        rows + '<div class="pc-foot">' + foot + '</div></article>';
    }).join('');

    var chart;
    if (!revealed) {
      chart = '<div class="chart"><p class="mini-label">Modeled bulge height · common scale 0–10 m</p><p class="chart-empty">Results appear here, side by side on one scale, after you submit.</p></div>';
    } else {
      chart = '<div class="chart' + (animate ? ' animate' : '') + '"><p class="mini-label">Modeled bulge height · common scale 0–10 m</p>' +
        '<div class="chart-area" role="img" aria-label="' + esc(set.map(function (p) { return 'Planet ' + p.id + ' ' + f(p.h) + ' m'; }).join(', ') + '; baseline 4 m.') + '">' +
        '<span class="chart-base" style="bottom:' + pct(BASE) + '"><span>Base 4 m</span></span>' +
        set.map(function (p) {
          return '<div class="bar-col"><span class="bar" style="height:' + pct(p.h) + '"><span class="bar-label">' + p.id + ' · ' + f(p.h) + ' m</span></span>' +
            (p.id === smallestId ? '<span class="tag-smallest">Smallest</span>' : '') + '</div>';
        }).join('') + '</div></div>';
    }

    var stage = '<div class="stage-inner">' +
      inputsBlock('Same for all three planets', [{ key: 'R', factor: 1 }, { key: 'k', factor: 1 }], cue && cue.inputs) +
      '<div class="planet-cards">' + cards + '</div>' + chart + '</div>';

    var heading = revealed ? 'Planet ' + smallestId + ' has the smallest modeled bulge.' : cfg.heading;
    var head = headHTML({ eyebrow: cfg.eyebrow, badge: attemptBadge(at), heading: heading, prompt: revealed ? '' : cfg.prompt });
    var ids = set.map(function (p) { return { id: p.id, text: 'Planet ' + p.id }; });
    var eqHl = cue && cue.eq ? cue.eq : [];
    var body;
    if (phase === 'awaiting') {
      body = hintPanelHTML(id) +
        radiosHTML('planet-smallest', ids, d.smallest, { legend: 'Smallest modeled bulge', row: true }) +
        radiosHTML('planet-reason', cfg.reasons, d.reason, { legend: 'Why?' }) +
        (eqHl.length ? eqCard(eqHl) : '') +
        actionsHTML(btn('Reveal results', 'planets-submit', { fk: 'primary', submit: true, disabled: !canSubmit(id, a) }) +
          '<p class="helper" id="submit-helper">Choose an estimate for each planet, the smallest, and a reason.</p>');
    } else if (phase === 'feedback') {
      var o = at.outcome;
      var lines = [], why = [], calc = [];
      lines.push(o.smallest.correct ? 'You picked Planet ' + o.smallest.given + ' — correct.'
        : 'You picked Planet ' + o.smallest.given + ', but Planet ' + smallestId + ' has the smallest modeled bulge.');
      set.forEach(function (pl) {
        var e = o.estimates[pl.id];
        if (!e.correct) {
          calc.push('Planet ' + pl.id + ': you estimated ' + f(e.given) + '×; the model gives ' + S.dg + ' ' + f(pl.dg) + ' ÷ ' + S.gp + ' ' + f(pl.gp) + ' = ' + f(pl.ratio) + '× → ' + f(pl.h) + ' m.');
        }
      });
      var reason = cfg.reasons.filter(function (r) { return r.id === o.reason.given; })[0];
      if (!o.reason.correct && reason) why.push(reason.feedback);
      if (o.overall === 'correct') why.push('Both quantities matter: ' + S.dg + ' raises the bulge and ' + S.gp + ' lowers it.');
      var kind = o.overall === 'correct' ? 'correct' : o.overall === 'partly' ? 'partly' : 'notyet';
      var title = o.overall === 'correct' ? 'Correct — every estimate matches.'
        : o.overall === 'partly' ? (o.smallest.correct ? 'Partly there — right planet, ' + (o.wrongEstimates === 1 ? 'one estimate off.' : 'check your estimates.') : 'Partly there — compare both quantities.')
          : 'Not yet — compare ' + S.dg + ' ÷ ' + S.gp + '.';
      body = hintPanelHTML(id) +
        feedbackHTML(kind, title, fbBody(why, lines, calc)) +
        evidenceAddedHTML(cfg.evidence) +
        nextActionsHTML(o.overall !== 'correct', 'Try fresh planets', 'Continue to crew briefing', 'continue',
          canOfferWorked(a) ? '<div class="worked-offer">' + btn('Review worked solution', 'worked', { kind: 'ghost', fk: 'worked' }) + '</div>' : '');
    } else {
      var steps = set.map(function (pl) {
        return 'Planet ' + pl.id + ': ' + f(pl.dg) + ' ÷ ' + f(pl.gp) + ' = ' + f(pl.ratio) + ' × 4 m = ' + f(pl.h) + ' m.';
      });
      steps.push('Smallest: Planet ' + smallestId + '. Physically, ' + S.dg + ' drives the stretching and ' + S.gp + ' resists it, so you need both.');
      body = hintPanelHTML(id) + workedHTML(steps) + evidenceAddedHTML(cfg.evidence) +
        actionsHTML(btn('Continue to crew briefing', 'continue', { fk: 'primary' }));
    }
    return { stage: stage, head: head, body: body };
  };

  /* ---------------- F. Crew briefing — combined prediction ---------------- */
  VIEWS.crewCombined = function (id, a) {
    var cfg = C.crewCombined;
    var at = attempt(a);
    var v = at.variant;
    var h = M.modelHeight({ dg: v.dg, gp: v.gp }, BASE);
    var phase = a.phase; // awaiting | feedback | worked
    var shown = phase !== 'awaiting';
    var cue = activeCue(id);
    var animate = ui.animate === id;
    var pred = shown ? at.prediction : (a.draft.prediction == null ? null : a.draft.prediction);

    var svg = planetSVG({
      idp: 'pk', dg: v.dg, gp: v.gp, hidden: !shown, h: h, from: animate ? BASE : null, showH: shown,
      highlight: cue && cue.diagram ? cue.diagram : null
    });
    var stage = '<div class="stage-inner">' +
      inputsBlock('Model inputs for ' + cfg.planetName, [{ key: 'dg', factor: v.dg }, { key: 'gp', factor: v.gp }, { key: 'R', factor: 1 }, { key: 'k', factor: 1 }], cue && cue.inputs) +
      (shown ? '' : '<p class="diagram-status"><span class="status-dot" aria-hidden="true"></span>' + cfg.planetName + ' · bulge hidden until you submit</p>') +
      '<div class="diagram diagram-solo">' + svg + '</div>' +
      (shown ? hbarsHTML(pred, h) : '') +
      '<p class="values-note">' + I.info + '<span>' + cfg.valuesNote + '</span></p></div>';

    var head = headHTML({
      eyebrow: cfg.eyebrow, badge: attemptBadge(at),
      heading: shown ? 'The model’s result: ' + f(h) + ' m.' : cfg.heading,
      prompt: cfg.prompt(v)
    });
    var eqHl = cue && cue.eq ? cue.eq : [];
    var body;
    if (phase === 'awaiting') {
      body = hintPanelHTML(id) + stepperHTML(pred, false) +
        '<p class="helper" id="pred-helper">' + predHelperText(pred, 'submit') + '</p>' +
        '<div class="field"><label class="field-label" for="crew-reason">Your reason</label>' +
        '<textarea id="crew-reason" rows="3" maxlength="600" placeholder="Explain using Δg and gₚ…" data-input="crew-reason" data-fk="crew-reason">' + esc(a.draft.reason || '') + '</textarea></div>' +
        eqCard(eqHl) +
        actionsHTML(btn('Submit to crew', 'crew1-submit', { fk: 'primary', submit: true, disabled: !canSubmit(id, a) }) +
          '<p class="helper" id="submit-helper">' + forLearner('Fewer prompts this time. Hints are still here if you need them.', 'Less scaffolding here. Hints are still free; hint use is recorded.') + '</p>');
    } else if (phase === 'feedback') {
      var po = at.outcome.prediction;
      var kind = po === 'correct' ? 'correct' : po === 'partly' ? 'partly' : 'notyet';
      var title = po === 'correct' ? 'Correct — the model gives ' + f(h) + ' m.'
        : po === 'partly' ? 'Partly there — right direction, but the model gives ' + f(h) + ' m.'
          : 'Not yet — the model gives ' + f(h) + ' m.';
      body = hintPanelHTML(id) +
        feedbackHTML(kind, title, fbBody([cfg.relation(v, h)], [], ['You predicted ' + f(at.prediction) + ' m.'])) +
        quoteHTML('Your reason', at.reason) +
        '<div class="crew-note"><p class="mini-label">Crew note — compare with your reason</p><p>' + cfg.crewNote(v, h) + '</p></div>' +
        nextActionsHTML(po !== 'correct', 'Try a fresh forecast', C.landingCall.toCall, 'to-call',
          canOfferWorked(a) ? '<div class="worked-offer">' + btn('Review worked solution', 'worked', { kind: 'ghost', fk: 'worked' }) + '</div>' : '');
    } else {
      body = hintPanelHTML(id) + workedHTML(cfg.worked(v, h)) +
        actionsHTML(btn(C.landingCall.toCall, 'to-call', { fk: 'primary' }));
    }
    return {
      stage: stage, head: head, body: body,
      after: function (anim) { if (anim === id) runTweens(els.stage); }
    };
  };

  /* ---------------- G1. Film ending (plays by default before the debrief) ---------------- */
  function endingDone() {
    var e = state.video.ending;
    return !!(e.reachedEndAt || e.skippedAt || e.fallbackShownAt);
  }

  function endingHeading(F) {
    var call = state.activities['crew-combined'] && state.activities['crew-combined'].landingCall;
    return call && C.landingCall.endingHeading[call.choice] ? C.landingCall.endingHeading[call.choice] : F.heading;
  }

  VIEWS.filmEnding = function (id, a) {
    var F = C.filmEnding;
    var X = C.video.ending;
    var span = mmss(X.start) + '–' + mmss(X.end);
    var stage;
    if (ui.endVideo === 'fallback') {
      var blocked = /youtube-error-(101|150)/.test(state.video.ending.error || '');
      var title = ui.endVideoReason === 'chosen' ? 'What happens next'
        : blocked ? 'This clip can’t play inside the module — here’s what happens.'
          : 'The video couldn’t load — here’s what happens.';
      stage = '<div class="stage-inner video-stage"><section class="fallback-card" aria-labelledby="end-fb-title">' +
        '<h2 id="end-fb-title" class="fallback-title" tabindex="-1">' + I.info + '<span>' + title + '</span></h2>' +
        '<p>' + F.sceneSummary + '</p>' +
        '<p class="watch-out">You can <a href="' + C.video.watchUrl + '&amp;t=' + X.start + 's" target="_blank" rel="noopener">watch ' + span +
        ' on YouTube<span class="sr-only"> (opens in a new tab)</span></a>, then come back.</p>' +
        '<div class="row">' + btn('Try video again', 'ending-play', { kind: 'secondary', fk: 'ending-retry' }) + '</div>' +
        '</section></div>';
    } else {
      var frame = ui.endVideo === 'player'
        ? '<div id="yt-ending" class="yt-mount"></div>'
        : '<button type="button" class="video-start vs-still" data-action="ending-play" data-fk="ending-play">' +
          '<span class="play-circle">' + I.play + '</span><span class="vs-title">Play the ending</span>' +
          '<span class="vs-sub">' + span + ' · about ' + (X.end - X.start) + ' s · plays from YouTube</span></button>';
      var verifyNote = MODE.author && X.status !== 'verified'
        ? '<p class="video-note warn">' + I.info + '<span>Ending boundaries are marked “to verify” in content.js. Check them by watching playback.</span></p>' : '';
      stage = '<div class="stage-inner video-stage">' +
        '<p class="video-tag">' + C.video.title + ' · ending</p>' +
        '<div class="video-frame">' + frame + '</div>' +
        '<p id="ending-status" class="video-status" role="status"></p>' +
        '<div class="video-actions">' +
        btn('Skip video', 'ending-skip', { kind: 'ghost', fk: 'ending-skip' }) +
        '<button type="button" class="link-btn" data-action="ending-summary" data-fk="ending-summary">Video won’t load? Read what happens</button>' +
        '</div>' + verifyNote + '</div>';
    }
    var head = headHTML({
      eyebrow: F.eyebrow, heading: endingHeading(F), hint: false,
      prompt: ui.endVideo === 'fallback' ? F.promptFallback : F.prompt
    });
    var done = endingDone();
    var body = '<h2 class="q">Watch for</h2><ul class="watch-for">' +
      F.watchFor.map(function (w) { return '<li>' + w + '</li>'; }).join('') + '</ul>' +
      actionsHTML(btn('Continue to debrief', 'continue', { fk: 'primary', disabled: !done }) +
        (done ? '' : '<p class="helper" id="submit-helper">Play the ending (or skip it) to continue.</p>'));
    return { stage: stage, head: head, body: body };
  };

  /* ---------------- G. Debrief ---------------- */
  function reflectionFor(idea) {
    var D = C.debrief;
    if (!idea || (idea.notSure && !idea.text)) return D.reflectionNotSure;
    for (var i = 0; i < D.reflections.length; i++) {
      if (D.reflections[i].match.test(idea.text)) return D.reflections[i].html;
    }
    return D.reflectionDefault;
  }

  function summary() {
    var out = { scoredActivities: C.scoredActivities.length, independent: 0, assisted: 0, workedSolution: 0, continuedAfterFeedback: 0, notCompleted: 0, hintsViewed: 0 };
    C.scoredActivities.forEach(function (id) {
      var a = state.activities[id];
      if (!a || !a.completedAt) { out.notCompleted++; return; }
      if (a.completion === 'independent') out.independent++;
      else if (a.completion === 'assisted') out.assisted++;
      else if (a.completion === 'worked-solution') out.workedSolution++;
      else out.continuedAfterFeedback++;
    });
    Object.keys(state.activities).forEach(function (k) { out.hintsViewed += state.activities[k].hints.length; });
    out.withSupport = out.assisted + out.workedSolution;
    return out;
  }

  function evidenceListHTML() {
    return '<ol class="ev-list">' + C.evidence.map(function (ev, i) {
      var n = '<span class="ev-n">' + (i + 1) + '</span>';
      return hasEvidence(ev.id)
        ? '<li class="ev-entry found">' + n + I.check + '<span>' + ev.html + '</span></li>'
        : '<li class="ev-entry locked">' + n + I.lock + '<span>Not found yet</span></li>';
    }).join('') + '</ol>';
  }

  function confirmResetHTML() {
    return '<div class="confirm" role="group" aria-labelledby="confirm-text"><p id="confirm-text">Clear all progress in this browser?' + (MODE.research ? ' Export your session first if you need the record.' : '') + '</p>' +
      '<div class="row">' + '<button type="button" class="btn btn-danger" data-action="reset-confirm" data-fk="reset-confirm">Yes, clear progress</button>' +
      btn('Cancel', 'reset-cancel', { kind: 'ghost', fk: 'reset-cancel' }) + '</div></div>';
  }

  /* Session record and export. Shown open in research mode (?research=1);
     otherwise tucked into a collapsed "For teachers and researchers" section. */
  function researchHTML(exportFk) {
    var sm = summary();
    var inner = '<dl class="stats">' +
      (MODE.research ? '<div><dt>Version</dt><dd>' + state.condition.toUpperCase() + '</dd></div>' : '') +
      '<div><dt>Completed independently</dt><dd>' + sm.independent + '</dd></div>' +
      '<div><dt>Completed with support</dt><dd>' + sm.withSupport + '</dd></div>' +
      '<div><dt>Continued after feedback</dt><dd>' + sm.continuedAfterFeedback + '</dd></div>' +
      (sm.notCompleted ? '<div><dt>Not yet completed</dt><dd>' + sm.notCompleted + '</dd></div>' : '') +
      '<div><dt>Hints viewed</dt><dd>' + sm.hintsViewed + '</dd></div>' +
      '<div><dt>Active time</dt><dd>' + fmtDuration(state.activeMs) + '</dd></div>' +
      '</dl><p class="tiny">“Independently” means right on the first attempt without hints. Hints and retries are always fine — they’re just recorded separately.</p>' +
      '<p class="tiny">' + (LOG && LOG.configured && logAllowed() ? 'The session record is also sent to the study database while you work.' :
        'The session record stays in this browser. Nothing is sent automatically.') + '</p>' +
      '<div class="row">' + btn('Export session (JSON)', 'export', { kind: 'secondary', fk: exportFk }) + '</div>';
    if (MODE.research) return '<div class="session-card"><p class="mini-label">Session record</p>' + inner + '</div>';
    return '<details class="research-details"><summary>For teachers and researchers</summary><div class="research-body">' + inner + '</div></details>';
  }

  VIEWS.debrief = function () {
    var D = C.debrief;
    var idea = state.firstIdea;
    var FC = D.filmCheck, GD = D.goDeeper;
    var filmCheck = '<section class="film-check" aria-labelledby="film-check-h"><h3 id="film-check-h" class="film-check-h">' + FC.heading + '</h3>' +
      '<div class="film-cards">' +
      '<div class="film-card explains"><p class="film-card-t">' + I.check + '<span>' + FC.explains.title + '</span></p><p>' + FC.explains.html + '</p></div>' +
      '<div class="film-card doesnt"><p class="film-card-t">' + I.info + '<span>' + FC.doesnt.title + '</span></p><p>' + FC.doesnt.html + '</p></div>' +
      '</div></section>';
    var goDeeper = '<details class="go-deeper" id="go-deeper"><summary>' + GD.summary + '</summary><div class="go-deeper-body">' +
      GD.sections.map(function (sec) { return '<h4>' + sec.title + '</h4><p>' + sec.html + '</p>'; }).join('') +
      '<p class="go-deeper-src">' + GD.source + '</p></div></details>';
    var stage = '<div class="stage-inner debrief">' +
      '<p class="mini-label">Back to the opening question</p>' +
      '<h2 class="debrief-q">' + D.question + '</h2>' +
      '<div class="first-idea-box"><p class="mini-label">Your first idea</p><p class="idea-quote">' +
      (idea ? (idea.notSure && !idea.text ? '“Not sure yet”' : '“' + esc(idea.text) + '”') : 'No first idea was logged.') + '</p></div>' +
      summaryCardsHTML() +
      '<p class="reflection">' + reflectionFor(idea) + '</p>' +
      filmCheck + goDeeper + '</div>';

    var head = headHTML({ eyebrow: 'Mission debrief', heading: state.completedAt ? 'Mission complete.' : 'Your mission debrief.', hint: false });
    var body = '<p class="mini-label green">Evidence log · ' + state.evidence.length + ' of ' + C.evidence.length + '</p>' + evidenceListHTML() +
      (MODE.research ? researchHTML('export') : '') +
      (ui.storageOk ? '' : '<p class="note warn">Browser storage is unavailable, so progress won’t survive a reload.' + (MODE.research ? ' Export your session before closing.' : '') + '</p>') +
      '<div class="actions"><div class="actions-row">' + btn('Start over', 'reset-ask', { kind: 'ghost', fk: 'reset-ask' }) +
      (state.completedAt ? btn('View mission summary', 'show-complete', { fk: 'primary' }) : btn('Finish mission', 'finish', { fk: 'primary' })) + '</div>' +
      (ui.confirmReset && !els.dialog.open ? confirmResetHTML() : '') + '</div>';
    return { stage: stage, head: head, body: body };
  };

  /* ===================================================================== *
   * Submission rules
   * ===================================================================== */
  /* ===================================================================== *
   * New design (Figma "New" section): added page types
   * ===================================================================== */
  function numParse(v) {
    if (v == null) return NaN;
    var t = String(v).replace(/[,\s]/g, '').replace(/×10\^?/i, 'e');
    if (t === '') return NaN;
    return Number(t);
  }
  function approxEq(a, b) { return isFinite(a) && Math.abs(a - b) <= 1e-12 + Math.abs(b) * 1e-3; }
  function stageTitle(t, extra) { return '<div class="stage-title"><h2>' + t + '</h2>' + (extra || '') + '</div>'; }
  function caption(t) { return t ? '<p class="helper caption">' + t + '</p>' : ''; }
  // A crew message arrives word by word. All of its text is in the page from the start, so a
  // screen reader has it at once and nothing waits on it; only its appearance is staggered, and
  // only the first time the message is seen (its parent gets the class "enter").
  function streamHTML(html) {
    var i = 0;
    return String(html).replace(/(<[^>]+>)|([^\s<]+)/g, function (m, tag, word) {
      return tag ? tag : '<span class="w" style="--i:' + (i++) + '">' + word + '</span>';
    });
  }
  // late: the message follows something else on the page (a report being sent), so it comes in after it.
  function txCard(who, text, kind, late) {
    var cid = curId();
    // A reply (kind) arrives once per attempt; a standing message arrives once.
    var key = kind ? 'tx|' + cid + '|' + kind + '|' + act(cid).attempts.length : 'tx|' + cid + '|msg';
    return '<div class="tx-card' + (kind ? ' tx-' + kind : '') + (late ? ' tx-late' : '') + '" data-enter="' + key + '">' +
      '<p class="mini-label tx-who">' + I.radio + '<span>' + who + '</span></p><p class="tx-stream">“' + streamHTML(text) + '”</p></div>';
  }
  function badgeArrow(up, key) {
    return '<span class="arrow-badge' + (key ? ' ab-' + key : '') + '" aria-hidden="true">' + (up ? I.up : I.down) + '</span>';
  }

  // Results table built from the three Tide Lab tests (first variants: ×2 each).
  function resultsTableHTML(o) {
    o = o || {};
    var rows = ['exp-dg', 'exp-gp', 'exp-R'].map(function (eid) {
      var cfg = C.experiments[eid];
      var x = cfg.variants[0];
      var inp = { dg: 1, gp: 1, R: 1 }; inp[cfg.key] = x;
      var h = M.modelHeight(inp, BASE);
      var r = M.direction(h, BASE) === 'up' ? '×' + f(h / BASE) : '÷' + f(BASE / h);
      return '<tr class="rt-' + cfg.key + '"><th scope="row"><b class="sym c-' + cfg.key + '">' + C.inputs[cfg.key].sym + ' ' + times(x) + '</b></th>' +
        '<td>' + r + '<span class="rt-num">(4 → ' + f(h) + ' m)</span></td>' +
        (o.place ? '<td class="c-' + cfg.key + '">' + C.decode.model.place[cfg.key] + '</td>' : '') + '</tr>';
    }).join('');
    return '<section class="card results-table"><h3>Your results table</h3><table>' +
      '<thead><tr><th scope="col">What changed</th><th scope="col">Bulge height</th>' + (o.place ? '<th scope="col">' + C.decode.model.placeCol + '</th>' : '') + '</tr></thead>' +
      '<tbody>' + rows + '</tbody></table></section>';
  }

  // Where each variable sits in the model, without results (version A's model page).
  function placementTableHTML() {
    var T = C.decode.model;
    return '<section class="card results-table"><h3>' + T.placeTitle + '</h3><table>' +
      '<thead><tr><th scope="col">' + T.placeVar + '</th><th scope="col">' + T.placeCol + '</th></tr></thead><tbody>' +
      ['dg', 'gp', 'R'].map(function (k) {
        return '<tr class="rt-' + k + '"><th scope="row"><b class="sym c-' + k + '">' + C.inputs[k].sym + '</b></th>' +
          '<td class="c-' + k + '">' + T.place[k] + '</td></tr>';
      }).join('') + '</tbody></table></section>';
  }

  function bigFormulaHTML() {
    return '<span class="big-eq">h = k × (<b class="c-dg">Δg</b> / <b class="c-gp">g<sub>p</sub></b>) × <b class="c-R">R</b></span>';
  }

  /* ---------------- Phase 2.1 · Rank the Moon's pull ---------------- */
  function rankOrder(a) {
    if (!a.draft.order) a.draft.order = C.tideRank.startOrder.slice();
    return a.draft.order;
  }
  // The diagram is drawn from three pull strengths (3 = strongest … 1 = weakest), one per point.
  // They are numbers, not ranks, so the picture can glide from one order to the next.
  var RK = { cx: 250, cy: 230, R: 120 };
  function rankStrengths(order) {
    var s = {}; order.forEach(function (id, i) { s[id] = order.length - i; });
    return s;
  }
  function rankGeo(s) {
    var cx = RK.cx, cy = RK.cy, R = RK.R, k = 22;
    var nearB = s.near - s.centre, farB = s.centre - s.far;
    var rxR = Math.max(R + 4, R + 14 + k * nearB), rxL = Math.max(R + 4, R + 14 + k * farB);
    var ry = R + 14 - 6 * Math.max(0, nearB + farB) / 2;
    function n(x) { return Math.round(x * 10) / 10; }
    var d = 'M ' + cx + ' ' + n(cy - ry) + ' A ' + n(rxR) + ' ' + n(ry) + ' 0 0 1 ' + cx + ' ' + n(cy + ry) +
      ' A ' + n(rxL) + ' ' + n(ry) + ' 0 0 1 ' + cx + ' ' + n(cy - ry) + ' Z';
    var from = { far: cx - R + 10, centre: cx, near: cx + R - 10 };
    var tip = {};
    ['far', 'centre', 'near'].forEach(function (id) { tip[id] = n(from[id] + 26 + 22 * s[id]); });
    return { d: d, from: from, tip: tip, rxR: rxR, rxL: rxL, ry: ry };
  }
  // Distance from Earth's center to the ocean surface, at angle th (0 = toward the Moon).
  function rankOceanR(g, th) {
    var rx = Math.cos(th) >= 0 ? g.rxR : g.rxL;
    return (rx * g.ry) / Math.sqrt(Math.pow(g.ry * Math.cos(th), 2) + Math.pow(rx * Math.sin(th), 2));
  }
  function earthMoonSVG(s, day) {
    var cx = RK.cx, cy = RK.cy, R = RK.R;
    var g = rankGeo(s);
    var arrows = ['far', 'centre', 'near'].map(function (id) {
      var x = g.from[id];
      var line = 'x1="' + x + '" y1="' + cy + '" x2="' + g.tip[id] + '" y2="' + cy + '" data-rk="' + id + '"';
      return '<line ' + line + ' class="rk-arrow" marker-end="url(#rk-a)"/>' +
        // A lighter dashed copy runs along each arrow toward the Moon, so the pull reads as a pull.
        '<line ' + line + ' class="rk-flow"/>' +
        '<circle cx="' + x + '" cy="' + cy + '" r="6" fill="#fff"/>' +
        '<text x="' + x + '" y="' + (cy + 28) + '" text-anchor="middle" class="t-lbl b">' + C.tideRank.points.filter(function (p) { return p.id === id; })[0].text + '</text>';
    }).join('');
    // After a correct ranking, Earth turns once a "day" under the two bulges: a coast (the green
    // dot) meets two high tides and two low tides. Drawn hidden until then; see rankDay().
    var dayLayer = '<g class="rk-day"' + (day ? '' : ' hidden') + '>' +
      '<line class="rk-depth" x1="' + cx + '" y1="' + (cy - R) + '" x2="' + cx + '" y2="' + (cy - g.ry) + '"/>' +
      '<circle class="rk-dot" cx="' + cx + '" cy="' + (cy - R) + '" r="7"/>' +
      '<g class="rk-read"><rect x="' + (cx - 62) + '" y="386" width="124" height="28" rx="14"/>' +
      '<text x="' + cx + '" y="405" text-anchor="middle" class="rk-read-text">Low tide</text></g>' +
      '<text x="' + cx + '" y="440" text-anchor="middle" class="t-sub">' + C.tideRank.dayCaption + '</text></g>';
    return '<svg class="rank-svg' + (day ? ' day' : '') + '" viewBox="0 0 860 460" role="img" aria-label="Earth and Moon. Arrows show the pull you set at three points: ' +
      ['near', 'centre', 'far'].map(function (id) { return (id === 'centre' ? 'center' : id) + ' ' + (s[id] >= 2.5 ? 'strongest' : s[id] >= 1.5 ? 'middle' : 'weakest'); }).join(', ') +
      (day ? '. ' + C.tideRank.dayCaption : '') + '.">' +
      '<defs><marker id="rk-a" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="4" markerHeight="4" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#f5b544"/></marker>' +
      '<radialGradient id="rk-moon" cx="38%" cy="34%" r="70%"><stop offset="0" stop-color="#f4f4f4"/><stop offset="1" stop-color="#a9a9a9"/></radialGradient>' +
      '<radialGradient id="rk-halo"><stop offset=".5" stop-color="#fff" stop-opacity=".16"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>' +
      // The same lighting as the planet diagram used in the rest of the module: an ocean lit from
      // the upper left over a darker body, inside a faint blue halo.
      '<radialGradient id="rk-sea" cx="50%" cy="50%" r="55%" fx="36%" fy="30%"><stop offset="0" stop-color="#5aa3dc"/><stop offset=".55" stop-color="#2f6ea6"/><stop offset="1" stop-color="#1d4a75"/></radialGradient>' +
      '<radialGradient id="rk-earth" cx="50%" cy="50%" r="55%" fx="38%" fy="32%"><stop offset="0" stop-color="#3d4c5f"/><stop offset=".6" stop-color="#232e3c"/><stop offset="1" stop-color="#141b24"/></radialGradient>' +
      '<radialGradient id="rk-glow"><stop offset=".55" stop-color="#7fc4ff" stop-opacity=".16"/><stop offset="1" stop-color="#7fc4ff" stop-opacity="0"/></radialGradient></defs>' +
      '<circle cx="' + cx + '" cy="' + cy + '" r="' + (R + 84) + '" fill="url(#rk-glow)" aria-hidden="true"/>' +
      '<path class="rk-ocean" d="' + g.d + '" fill="url(#rk-sea)" stroke="#e8f4ff" stroke-width="2.2"/>' +
      '<circle cx="' + cx + '" cy="' + cy + '" r="' + R + '" fill="url(#rk-earth)" stroke="#0f141b" stroke-width="1.5"/>' +
      '<text x="' + cx + '" y="' + (cy - 50) + '" text-anchor="middle" class="t-sub">Earth</text>' +
      // The line of the Moon's pull, with dashes drifting toward the Moon.
      '<line class="rk-axis" x1="' + (cx + R + 40) + '" y1="' + cy + '" x2="' + (700 - 44) + '" y2="' + cy + '" aria-hidden="true"/>' +
      arrows + dayLayer +
      '<circle class="rk-halo" cx="700" cy="' + cy + '" r="60" fill="url(#rk-halo)"/>' +
      '<circle cx="700" cy="' + cy + '" r="34" fill="url(#rk-moon)"/><text x="700" y="' + (cy + 62) + '" text-anchor="middle" class="t-lbl">Moon</text>' +
      '</svg>';
  }

  /* The diagram follows the list: it glides to each new order (also while a card is being
     dragged), and plays the "one day" loop once the order is right. */
  var rankViz = { cur: null, seq: 0, dayRaf: 0, dayOn: false };
  function rankApply(svg, s) {
    var g = rankGeo(s);
    var ocean = svg.querySelector('.rk-ocean');
    if (ocean) ocean.setAttribute('d', g.d);
    svg.querySelectorAll('[data-rk]').forEach(function (el) { el.setAttribute('x2', g.tip[el.getAttribute('data-rk')]); });
  }
  function rankVizTo(order, ms) {
    var to = rankStrengths(order);
    var from = rankViz.cur || to;
    var seq = ++rankViz.seq;
    tween(ms || 420, function (k) {
      if (seq !== rankViz.seq) return;
      var s = {};
      ['near', 'centre', 'far'].forEach(function (id) { s[id] = from[id] + (to[id] - from[id]) * k; });
      rankViz.cur = s;
      var svg = els.stage.querySelector('.rank-svg');
      if (svg) rankApply(svg, s);
    });
  }
  function rankDay(on) {
    window.cancelAnimationFrame(rankViz.dayRaf);
    rankViz.dayOn = on;
    var svg = els.stage.querySelector('.rank-svg');
    if (!svg || !on) return;
    var dot = svg.querySelector('.rk-dot'), depth = svg.querySelector('.rk-depth');
    var read = svg.querySelector('.rk-read'), readText = svg.querySelector('.rk-read-text');
    var cx = RK.cx, cy = RK.cy, R = RK.R;
    function place(th) {
      var g = rankGeo(rankViz.cur || rankStrengths(C.tideRank.correctOrder));
      var c = Math.cos(th), sn = Math.sin(th), r = rankOceanR(g, th);
      dot.setAttribute('cx', (cx + R * c).toFixed(1)); dot.setAttribute('cy', (cy - R * sn).toFixed(1));
      depth.setAttribute('x1', (cx + R * c).toFixed(1)); depth.setAttribute('y1', (cy - R * sn).toFixed(1));
      depth.setAttribute('x2', (cx + r * c).toFixed(1)); depth.setAttribute('y2', (cy - r * sn).toFixed(1));
      var high = (r - g.ry) / (Math.max(g.rxR, g.rxL) - g.ry) > 0.5;
      if (read.getAttribute('data-high') !== String(high)) {
        read.setAttribute('data-high', String(high));
        readText.textContent = high ? 'High tide' : 'Low tide';
      }
    }
    // Reduced motion: no turning; the dot rests under the near-side bulge, at high tide.
    if (reduced()) { place(0); return; }
    var t0 = performance.now(), period = 9000;
    (function frame(t) {
      if (!rankViz.dayOn || !document.contains(svg)) return;
      place(Math.PI / 2 + ((t - t0) / period) * 2 * Math.PI);
      rankViz.dayRaf = window.requestAnimationFrame(frame);
    }(t0));
  }

  /* Reordering: cards glide to their new places (first-last-invert-play), whether they were
     moved with the arrows or dropped after a drag. */
  function rankTops() {
    var tops = {};
    els.body.querySelectorAll('.rank-card').forEach(function (c) { tops[c.getAttribute('data-rank-id')] = c.getBoundingClientRect().top; });
    return tops;
  }
  function rankFlip(before) {
    if (reduced()) return;
    els.body.querySelectorAll('.rank-card').forEach(function (c) {
      var was = before[c.getAttribute('data-rank-id')];
      var dy = was == null ? 0 : was - c.getBoundingClientRect().top;
      if (Math.abs(dy) < 1) return;
      c.style.transition = 'none';
      c.style.transform = 'translateY(' + dy.toFixed(1) + 'px)';
      void c.offsetWidth;
      c.style.transition = '';
      c.style.transform = '';
    });
  }
  function setRankOrder(order, focus, movedId) {
    var id = curId(); var a = act(id);
    var before = rankTops();
    // Moving a point after feedback is a new try: keep the checked order on its attempt
    // and carry the new order into a fresh one.
    if (a.phase === 'feedback') startAttempt(a);
    a.draft.order = order.slice();
    a.draft.moved = true;
    render({ focus: focus });
    rankFlip(before);
    if (movedId) {
      var p = C.tideRank.points.filter(function (x) { return x.id === movedId; })[0];
      announce(p.text + ' is now ' + (order.indexOf(movedId) + 1) + ' of ' + order.length + '.');
    }
  }

  VIEWS.rank = function (id, a) {
    var T = C.tideRank;
    // Open the attempt before reading the order: starting an attempt clears the draft, so doing
    // it later (on Check) would throw away the learner's ranking. It also gives a hint nudge an
    // attempt to be recorded on.
    attempt(a);
    var order = rankOrder(a);
    var phase = a.phase;
    var correct = order.join() === T.correctOrder.join();
    var day = phase === 'feedback' && correct;
    // Drawn where the picture currently is, then moved to the new order (see `after`).
    var stage = '<div class="stage-inner">' + stageTitle(T.title) +
      '<div class="diagram diagram-solo">' + earthMoonSVG(rankViz.cur || rankStrengths(order), day) + '</div></div>';
    var list = '<ol class="rank-list" aria-label="' + T.rankLabel + '">' + order.map(function (pid, i) {
      var p = T.points.filter(function (x) { return x.id === pid; })[0];
      return '<li class="rank-row"><span class="rank-slot"><b class="rank-n">' + (i + 1) + '</b>' +
        '<span class="rank-end">' + (i === 0 ? T.ends[0] : i === order.length - 1 ? T.ends[1] : '') + '</span></span>' +
        '<div class="rank-card" data-rank-id="' + pid + '"><span class="rank-grip" aria-hidden="true">' + I.grip + '</span>' +
        '<span class="rank-name">' + p.text + '</span>' +
        '<span class="rank-btns"><button type="button" class="step-btn" data-action="rank-move" data-id="' + pid + '" data-dir="-1" data-fk="rk-up-' + pid + '" aria-label="Move ' + p.text + ' up"' + (i === 0 ? ' disabled' : '') + '>↑</button>' +
        '<button type="button" class="step-btn" data-action="rank-move" data-id="' + pid + '" data-dir="1" data-fk="rk-dn-' + pid + '" aria-label="Move ' + p.text + ' down"' + (i === order.length - 1 ? ' disabled' : '') + '>↓</button></span>' +
        '</div></li>';
    }).join('') + '</ol>';
    var head = headHTML({ eyebrow: T.eyebrow + taskTag(), heading: T.heading, prompt: T.intro });
    var body = hintPanelHTML(id) + '<p class="prompt rank-task">' + T.task + '</p>' + list;
    if (phase === 'feedback') {
      body += feedbackHTML(correct ? 'correct' : 'answer', '', '<p>' + (correct ? T.correct : T.other) + '</p>') +
        actionsHTML(btn('Continue', 'continue', { fk: 'primary' })) + caption(T.nextNote);
    } else {
      body += actionsHTML(btn(T.check, 'rank-check', { fk: 'primary', submit: true, disabled: !canSubmit(id, a) }) +
        '<p class="helper" id="submit-helper">' + T.helper + '</p>');
    }
    return {
      stage: stage, head: head, body: body, formula: false,
      after: function () { rankVizTo(order); rankDay(day); }
    };
  };

  /* ---------------- Phase 3 · Lab results ---------------- */
  VIEWS.labResults = function (id, a) {
    var T = C.labResults;
    var stage = '<div class="stage-inner stage-center">' + stageTitle(T.title) + resultsTableHTML() + '</div>';
    var head = headHTML({ eyebrow: 'Tide Lab · results', heading: T.heading, hint: false });
    var body = '<p class="prompt">' + T.text + '</p>' + txCard(T.crew.who, V(T.crew, 'text')) +
      actionsHTML(btn('Continue', 'continue', { fk: 'primary' })) + caption(V(T, 'nextNote'));
    return { stage: stage, head: head, body: body, formula: false };
  };

  /* ---------------- Phase 4 · Summarize (fill the blanks) ---------------- */
  VIEWS.decodeFill = function (id, a) {
    var T = C.decode.summary;
    var d = a.draft; d.blanks = d.blanks || {};
    var phase = a.phase;
    var at = attempt(a);
    var res = at.outcome && at.outcome.rows;
    function sel(key, slot) {
      var cur = (d.blanks[key] || {})[slot] || '';
      var bad = phase === 'feedback' && res && res[key] && res[key][slot] === false;
      return '<select class="blank' + (bad ? ' bad' : '') + '" data-change="blank" data-key="' + key + '" data-slot="' + slot + '" data-fk="bl-' + key + '-' + slot + '" aria-label="' + slot + '"' + (phase === 'feedback' && at.outcome.overall === 'correct' ? ' disabled' : '') + '>' +
        '<option value="">select</option>' + T.blanks[slot].map(function (o) {
          return '<option value="' + o.id + '"' + (cur === o.id ? ' selected' : '') + '>' + o.text + '</option>';
        }).join('') + '</select>';
    }
    var cards = T.rows.map(function (r) {
      var sym = '<b class="sym c-' + r.key + '">' + C.inputs[r.key].sym + '</b>';
      return '<div class="sentence-card"' + (phase === 'feedback' ? ' data-enter="bl|' + at.attempt + '|' + r.key + '"' : '') + '>' +
        '<p class="s-line">When ' + sym + ' doubles, the bulge height h ' + sel(r.key, 'change') + '.</p>' +
        '<p class="s-line">So the bigger ' + sym + ' is, the ' + sel(r.key, 'size') + ' h is.</p>' +
        '<p class="s-line">h is ' + sel(r.key, 'prop') + ' proportional to ' + sym + '.</p></div>';
    }).join('');
    var stage = '<div class="stage-inner stage-center">' + stageTitle(V(T, 'title')) + resultsTableHTML() + '</div>';
    var head = headHTML({ eyebrow: C.steps[state.pos.step].label + taskTag(), heading: T.heading, prompt: T.task });
    var body = hintPanelHTML(id) + cards;
    if (phase === 'feedback') {
      var ok = at.outcome.overall === 'correct';
      body += feedbackHTML(ok ? 'correct' : 'notyet', '', '<p>' + (ok ? V(T, 'correct') : T.notYet) + '</p>') +
        (ok ? actionsHTML(btn('Continue', 'continue', { fk: 'primary' })) + caption(V(T, 'nextNote'))
          : actionsHTML(btn('Try again', 'decode-retry', { fk: 'primary' }), btn('Continue', 'continue', { kind: 'secondary', fk: 'continue' })));
    } else {
      body += actionsHTML(btn('Check', 'decode-check', { fk: 'primary', submit: true, disabled: !canSubmit(id, a) }) +
        '<p class="helper" id="submit-helper">' + T.helper + '</p>');
    }
    return { stage: stage, head: head, body: body, formula: false };
  };

  /* ---------------- Phase 4 · The model ---------------- */
  VIEWS.decodeModel = function (id, a) {
    var T = C.decode.model;
    // Version B arrives with results, so each term is tied to the row it came from. Version A
    // arrives before the Tide Lab, so the table shows only where each variable sits.
    var stage = '<div class="stage-inner stage-center">' + stageTitle(V(T, 'title')) +
      '<section class="card model-card"><h3>' + V(T, 'modelLabel') + '</h3>' + bigFormulaHTML() + '<p class="muted">' + V(T, 'modelNote') + '</p></section>' +
      (FORMULA_FIRST ? placementTableHTML() : resultsTableHTML({ place: true })) + '</div>';
    var head = headHTML({ eyebrow: C.steps[state.pos.step].label + taskTag(), heading: V(T, 'heading'), hint: false });
    var rules = T.rules.map(function (r) {
      var sym = '<b class="sym c-' + r.key + '">' + C.inputs[r.key].sym + '</b>';
      var up = r.up === 'up';
      return '<div class="rule-card"><div class="rule-row">' +
        '<span class="rule-pair">' + sym + badgeArrow(true, r.key) + '<b>h</b>' + badgeArrow(up, 'h') + '</span>' +
        '<span class="rule-pair">' + sym + badgeArrow(false, r.key) + '<b>h</b>' + badgeArrow(!up, 'h') + '</span></div>' +
        '<span class="rule-tag c-' + r.key + '">' + r.tag + '</span></div>';
    }).join('') + '<div class="rule-card rule-k"><b>k = 2</b><span>' + T.kRule + '</span></div>';
    var body = rules + actionsHTML(btn('Continue', 'continue', { fk: 'primary' })) + caption(V(T, 'nextNote'));
    return { stage: stage, head: head, body: body, formula: false };
  };

  /* ---------------- Phase 5/6 · Calculations with real numbers ---------------- */
  function calcState(id, a) {
    var cfg = C.calc[id];
    var v = a.draft.vals || {};
    var known = cfg.known.map(function (k) { return { k: k, ok: k.fixed || approxEq(numParse(v[k.key]), k.value) }; });
    var allKnown = known.every(function (x) { return x.ok; });
    return { cfg: cfg, v: v, known: known, allKnown: allKnown };
  }
  function fieldHTML(spec, val, state, locked) {
    // A constant is given, not asked for: it reads as a filled-in value with its own tag.
    if (spec.fixed) {
      return '<div class="calc-field fixed"><span class="cf-label">' + spec.label + '</span>' +
        '<span class="cf-fixed">' + f(spec.value) + '</span><span class="cf-tag">' + spec.unit + '</span></div>';
    }
    return '<label class="calc-field' + (state === true ? ' ok' : state === false ? ' bad' : '') + '"><span class="cf-label">' + spec.label + '</span>' +
      '<input type="text" inputmode="decimal" autocomplete="off" data-input="calc-val" data-key="' + spec.key + '" data-fk="cv-' + spec.key + '" value="' + esc(val == null ? '' : val) + '"' + (locked ? ' readonly' : '') + '>' +
      (spec.unit ? '<span class="cf-unit">' + spec.unit + '</span>' : '') + '</label>';
  }
  // Miller's 1,200 m against Earth's 1 m and the lander's 5 m limit. One linear scale can't show
  // all three (5 m is a hair's width at 0–1,400 m), so the chart has two panels: everything to
  // scale on the left, and the bottom 10 m enlarged on the right, where Miller's bar runs off the top.
  function compareChartHTML(cfg) {
    var T = cfg.chart, earth = cfg.compare[0], miller = cfg.compare[1];
    var max = T.scaleMax, zmax = T.zoomMax;
    function pc(v, m) { return (Math.min(v, m) / m * 100).toFixed(2) + '%'; }
    function grid(vals, m, unit) {
      return vals.map(function (v) { return '<span class="cc-grid" style="bottom:' + pc(v, m) + '"><i>' + v.toLocaleString('en-US') + (unit || '') + '</i></span>'; }).join('');
    }
    function col(c, m, cls, val) {
      return '<div class="cc-col' + (cls ? ' ' + cls : '') + '"><span class="cc-val">' + (val || c.text) + '</span>' +
        '<span class="cc-bar' + (c === miller ? ' cc-main' : '') + '" style="height:' + (c.value / m * 100 < 0.6 ? '2px' : pc(c.value, m)) + '"></span>' +
        '<span class="cc-label">' + c.label + '</span></div>';
    }
    // data-zoom: the first time the chart is shown, its left panel starts at the enlarged scale
    // (the lander and its 5 m limit fill the frame) and zooms out to the planet's (chartZoomOut).
    return '<section class="card compare-chart" data-enter="cc|' + esc(cfg.heading) + '" aria-label="' + esc(T.aria) + '" data-zoom' +
      ' data-earth="' + earth.value + '" data-miller="' + miller.value + '" data-limit="' + cfg.safetyLimit + '" data-from="' + zmax + '" data-to="' + max + '" data-cap="' + esc(T.scaleNow) + '">' +
      '<h3>' + T.title + '</h3><div class="cc-panels">' +
      '<figure class="cc-panel"><figcaption>' + T.scaleTitle + '</figcaption><div class="cc-plot">' +
      grid(T.scaleTicks, max) + col(earth, max) + col(miller, max) +
      // The lander's limit, with a small lander beside its label. It rides the line down as the
      // view zooms out and fades when the line reaches the axis.
      '<span class="cc-zlimit" aria-hidden="true"><span><svg viewBox="0 0 28 20"><path d="M9 2h10l4 10H5z" fill="currentColor"/>' +
      '<path d="M6 12l-3 7M22 12l3 7M11 12v7M17 12v7" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round"/></svg>' + T.limit + '</span></span>' +
      '<span class="cc-lens" aria-hidden="true"></span></div></figure>' +
      '<p class="cc-link" aria-hidden="true">' + I.zoom + '<span>' + T.link + '</span></p>' +
      '<figure class="cc-panel cc-zoom"><figcaption>' + T.zoomTitle + '</figcaption><div class="cc-plot">' +
      grid(T.zoomTicks, zmax, ' m') + col(earth, zmax) + col(miller, zmax, 'off', T.off) +
      '<span class="cc-limit" style="bottom:' + pc(cfg.safetyLimit, zmax) + '"><span>' + T.limit + '</span></span>' +
      '</div></figure></div>' +
      '<p class="cc-note">' + T.note + '</p></section>';
  }

  /* Quick Checks 1 and 4: what the learner types under "Fill in what you know" is written on the
     part of the diagram it belongs to (Δg on the difference panel, gₚ beside the planet's pull,
     R beside the radius; a known h sets the bulge). It shows their own mapping back to them, so
     "is 10 m/s² really the near-to-far difference?" can be seen, not only read. Nothing is
     marked here: that happens on Check. The value they are solving for is never drawn. */
  function calcVals(cfg, v) {
    var out = {};
    cfg.known.forEach(function (k) {
      if (k.fixed || ['dg', 'gp', 'R', 'h'].indexOf(k.key) < 0) return;
      var raw = String(v[k.key] == null ? '' : v[k.key]).trim().slice(0, 14);
      if (raw) out[k.key] = esc(raw) + (k.unit ? ' ' + k.unit : '');
    });
    return out;
  }
  function calcValsLineHTML(cfg, v) {
    var vals = calcVals(cfg, v);
    var parts = ['dg', 'gp', 'R', 'h'].filter(function (k) { return vals[k]; }).map(function (k) {
      return '<span class="vl-item"><b class="c-' + k + '">' + (C.inputs[k] ? C.inputs[k].sym : S[k]) + '</b> = ' + vals[k] + '</span>';
    });
    return '<p class="vals-line narrow-only" id="vals-line"' + (parts.length ? '' : ' hidden') + '>' + parts.join('') + '</p>';
  }
  function calcDiagram(cfg, v, pulse) {
    var vals = calcVals(cfg, v);
    var o = { idp: 'pq', bodyName: 'Moon', vals: vals, pulse: pulse || null };
    // A known bulge height (Quick Check 4) is drawn, if it is a height the diagram can show.
    var h = cfg.known.some(function (k) { return k.key === 'h'; }) ? numParse(v.h) : NaN;
    if (isFinite(h) && h >= 0 && h <= GMAX) { o.h = h; o.showH = true; o.hValue = true; }
    return o;
  }

  // The reveal: the left panel opens at the lander's scale (0 to 10 m: Earth's tide and the
  // lander's 5 m limit fill the frame, and Miller's bar runs off the top), then zooms out
  // until the whole 1,200 m is in view and the limit has sunk into the axis. The scale moves
  // by equal factors, not equal steps, so the small end is not skipped. Nothing waits on it.
  function chartZoomOut(card) {
    if (reduced()) return;
    var plot = card.querySelector('.cc-panel:first-child .cc-plot'), cap = card.querySelector('.cc-panel:first-child figcaption');
    if (!plot || !cap) return;
    var bars = plot.querySelectorAll('.cc-bar'), earthBar = bars[0], millerBar = bars[1], millerCol = millerBar.parentNode;
    var lim = plot.querySelector('.cc-zlimit');
    var d = card.dataset, E = +d.earth, Mh = +d.miller, L = +d.limit, from = +d.from, to = +d.to;
    var end = { earth: earthBar.style.height, miller: millerBar.style.height, cap: cap.textContent };
    function draw(max) {
      var lp = L / max * 100;
      earthBar.style.height = Math.max(0.7, E / max * 100).toFixed(2) + '%';
      millerBar.style.height = Math.min(100, Mh / max * 100).toFixed(2) + '%';
      millerCol.classList.toggle('off', Mh > max);
      lim.style.bottom = lp.toFixed(2) + '%'; lim.style.opacity = Math.min(1, lp / 4).toFixed(2);
      var shown = max < 100 ? Math.round(max / 5) * 5 : Math.round(max / 100) * 100;
      cap.textContent = d.cap.replace('{max}', shown.toLocaleString('en-US'));
    }
    plot.classList.add('zooming');
    draw(from);
    window.setTimeout(function () {
      var t0 = performance.now(), ms = 2300;
      (function step(t) {
        if (!document.contains(card)) return;
        var k = Math.min(1, (t - t0) / ms), e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
        draw(from * Math.pow(to / from, e));
        if (k < 1) { window.requestAnimationFrame(step); return; }
        plot.classList.remove('zooming');
        millerCol.classList.remove('off');
        earthBar.style.height = end.earth; millerBar.style.height = end.miller; cap.textContent = end.cap;
      }(t0));
    }, 600);
  }

  VIEWS.calc = function (id, a) {
    var cs = calcState(id, a);
    var cfg = cs.cfg, v = cs.v;
    var at = attempt(a);
    var phase = a.phase;
    var shown = phase === 'feedback';
    var ok = shown && at.outcome.overall === 'correct';
    var isMiller = id === 'miller-forecast';
    var stage;
    if (isMiller && ok) {
      stage = '<div class="stage-inner stage-center">' + compareChartHTML(cfg) + '</div>';
    } else {
      var svg = planetSVG(isMiller
        ? { idp: 'pq', dg: 2.6, gp: 1.3, bodyName: 'Gargantua', bodySub: 'supermassive black hole', planetName: 'Miller’s planet' }
        : calcDiagram(cfg, v));
      stage = '<div class="stage-inner">' +
        (isMiller ? '' : subnavHTML(function (mid, i) { return 'Check ' + (i + 1); })) +
        '<div class="diagram diagram-solo">' + svg + '</div>' + (isMiller ? '' : calcValsLineHTML(cfg, v)) + '</div>';
    }
    var head = headHTML({
      eyebrow: cfg.eyebrow + (cfg.n ? countTag(cfg.n + ' of 4') : isMiller ? countTag('task 2 of 3') : ''),
      heading: cfg.heading || 'Scenario ' + cfg.n
    });
    var parts = [scenarioCardHTML(cfg.scenarioLabel || 'Scenario', cfg.scenario)];
    // Checked fields react once per attempt (a wrong one shakes, a right one flashes green).
    var stepEnter = shown ? ' data-enter="cf|' + id + '|' + at.attempt + '|k"' : '';
    if (cfg.known.length) {
      parts.push('<div class="calc-step"' + stepEnter + '><p class="q">' + cfg.knownLabel + '</p><div class="calc-grid">' +
        cs.known.map(function (x) { return fieldHTML(x.k, v[x.k.key], shown ? x.ok : (cfg.substitute && x.ok ? true : null), ok); }).join('') + '</div></div>');
    }
    if (cfg.substitute) {
      parts.push('<div class="calc-step"><p class="q">' + cfg.substitute.label + '</p>' +
        (cs.allKnown ? '<div class="sub-card" data-enter="sub|' + id + '|' + at.attempt + '">' + cfg.substitute.lines.map(function (l) { return '<p>' + l + '</p>'; }).join('') + '</div>'
          : '<div class="sub-card locked"><p class="muted">h = k × (Δg / g<sub>p</sub>) × R</p><p class="muted small">' + cfg.substitute.locked + '</p></div>') + '</div>');
    }
    var sv = cfg.solve;
    var solveLocked = false;
    parts.push('<div class="calc-step"' + stepEnter.replace('|k"', '|s"') + '><p class="q">' + sv.question + '</p><div class="calc-grid one">' +
      fieldHTML(sv, v[sv.key], shown ? approxEq(numParse(v[sv.key]), sv.value) : null, ok || solveLocked) + '</div></div>');
    var body = hintPanelHTML(id) + parts.join('');
    eqCard([], K_NOTE);
    if (shown) {
      body += feedbackHTML(ok ? 'correct' : 'notyet', '', '<p>' + (ok ? cfg.correct : cfg.notYet) + '</p>') +
        (ok ? evidenceAddedHTML(cfg.evidence) : '');
      body += ok
        ? actionsHTML(btn(cfg.n && cfg.n < 4 ? 'Next check' : 'Continue', 'continue', { fk: 'primary' })) + caption(cfg.nextNote)
        : actionsHTML(btn('Try again', 'calc-retry', { fk: 'primary' }), btn('Continue', 'continue', { kind: 'secondary', fk: 'continue' }));
    } else {
      body += actionsHTML(btn('Check', 'calc-check', { fk: 'primary', submit: true, disabled: !canSubmit(id, a) }) +
        '<p class="helper" id="submit-helper">' + cfg.helper + '</p>');
    }
    return { stage: stage, head: head, body: body };
  };

  /* ---------------- Phase 6 · Background ---------------- */
  VIEWS.millerBg = function (id, a) {
    var T = C.millerBg;
    var stage = '<div class="stage-inner bg-stage"><div class="film-still" role="img" aria-label="' + T.placeholder + '"><span>' + T.placeholder + '</span></div></div>';
    var head = headHTML({ eyebrow: 'Landing Call' + countTag('task 1 of 3'), heading: T.title, hint: false });
    var body = T.body.map(function (p) { return '<p class="prompt">' + p + '</p>'; }).join('') +
      actionsHTML(btn('Continue', 'continue', { fk: 'primary' })) + caption(T.nextNote);
    return { stage: stage, head: head, body: body, formula: false };
  };

  // Where the mission stands after the right call: four readouts across the top of the stage.
  function statusBoardHTML(at) {
    var B = C.statusBoard;
    return '<section class="status-board" aria-label="' + B.title + '" data-enter="board|' + at.attempt + '"><h2 class="sb-title">' + I.radio + '<span>' + B.title + '</span></h2><dl class="sb-rows">' +
      B.rows.map(function (r, i) {
        return '<div class="sb-row' + (r.tone ? ' sb-' + r.tone : '') + '" style="--i:' + i + '"><dt>' + r.label + '</dt><dd>' + r.value + '</dd></div>';
      }).join('') + '</dl></section>';
  }

  // "Sending your report to the crew…" gives way to "Report delivered"; the reply follows it.
  function sentLineHTML(at) {
    var T = C.landing;
    return '<p class="sent-line" role="status" data-enter="sent|' + at.attempt + '">' + I.radio +
      '<span class="sent-words"><span class="s1" aria-hidden="true">' + T.sending + '</span><span class="s2">' + T.delivered + '</span></span></p>';
  }

  /* ---------------- Phase 6 · Is it safe to land? ---------------- */
  VIEWS.landing = function (id, a) {
    var T = C.landing;
    var d = a.draft;
    var at = attempt(a);
    var phase = a.phase;
    var svg = planetSVG({ idp: 'pl', dg: 2.6, gp: 1.3, bodyName: 'Gargantua', bodySub: 'supermassive black hole', planetName: 'Miller’s planet' });
    var sentOk = phase === 'feedback' && at.outcome.overall === 'correct';
    var stage = '<div class="stage-inner">' + (sentOk ? statusBoardHTML(at) : '') + '<div class="diagram diagram-solo">' + svg + '</div></div>';
    var head = headHTML({ eyebrow: T.eyebrow + countTag('task 3 of 3'), heading: phase === 'feedback' && at.outcome.overall === 'correct' ? 'Report sent' : T.heading });
    var body = hintPanelHTML(id);
    if (phase === 'feedback' && at.outcome.overall === 'correct') {
      body += sentLineHTML(at) + txCard('Correct · ' + T.correct.who, T.correct.text, 'ok', true) +
        quoteHTML(T.yourReport, at.report) +
        '<div class="scenario-card"><p class="mini-label">Sample report</p><p>' + T.sample + '</p></div>' +
        '<div class="scenario-card"><p class="mini-label">Check your report</p><ul class="checklist">' + T.checklist.map(function (c) { return '<li>' + c + '</li>'; }).join('') + '</ul></div>' +
        actionsHTML(btn('Continue', 'continue', { fk: 'primary' })) + caption(T.nextNote);
    } else {
      body += txCard(T.crew.who, T.crew.text) +
        radiosHTML('land-choice', T.options, phase === 'feedback' ? at.choice : d.choice, { row: true, legend: T.decide, locked: false });
      if (phase === 'feedback') {
        body += sentLineHTML(at) + txCard('Not yet · ' + T.notYet.who, T.notYet.text, 'no', true) + actionsHTML(btn(T.retry, 'landing-retry', { fk: 'primary' }));
      } else {
        body += '<div class="field"><label class="q" for="land-report">' + T.reportLabel + '</label>' +
          '<textarea id="land-report" rows="4" maxlength="800" placeholder="' + T.reportPlaceholder + '" data-input="land-report" data-fk="land-report">' + esc(d.report || '') + '</textarea></div>' +
          actionsHTML(btn(T.send, 'landing-send', { fk: 'primary', submit: true, disabled: !canSubmit(id, a) }) +
            '<p class="helper" id="submit-helper">' + T.helper + '</p>');
      }
    }
    eqCard([], K_NOTE);
    return { stage: stage, head: head, body: body, phaseKey: phase === 'feedback' && at.outcome.overall === 'correct' ? 'sent' : 'ask' };
  };

  /* ---------------- Phase 7 · Film ending + reflection ---------------- */
  VIEWS.endReflect = function (id, a) {
    var T = C.endReflect;
    var stage = VIEWS.filmEnding(id, a).stage;
    var d = a.draft;
    var idea = state.firstIdea ? (state.firstIdea.notSure && !state.firstIdea.text ? 'Not sure yet' : state.firstIdea.text) : '(no first guess logged)';
    var head = headHTML({ eyebrow: T.eyebrow, heading: 'This time, you know why.', hint: false, prompt: T.text });
    var body = '<div class="quote quote-accent"><p class="mini-label">' + T.quoteLabel + '</p><p class="quote-text"><em>“' + esc(idea) + '”</em></p></div>' +
      '<p class="q">' + T.question + '</p><ol class="reflect-list">' + T.prompts.map(function (p) { return '<li>' + p + '</li>'; }).join('') + '</ol>' +
      '<div class="field"><label class="sr-only" for="reflect-text">Your answer</label>' +
      '<textarea id="reflect-text" rows="5" maxlength="1200" placeholder="' + T.placeholder + '" data-input="reflect-text" data-fk="reflect-text">' + esc(d.text || '') + '</textarea></div>' +
      actionsHTML(btn('Continue', 'reflect-continue', { fk: 'primary', submit: true, disabled: !canSubmit(id, a) }) +
        '<p class="helper" id="submit-helper">' + T.helper + '</p>') + caption(T.nextNote);
    return { stage: stage, head: head, body: body, formula: false };
  };

  // The learner's first prediction in each Tide Lab test, beside what that test showed. Bars
  // share the gauge's 0–10 m scale. Nothing here is marked: it is a look back, not a score.
  function predictionRecapHTML() {
    var P = C.predictionRecap;
    var rows = ['exp-dg', 'exp-gp', 'exp-R'].map(function (eid) {
      var a = state.activities[eid], at = a && a.attempts[0];
      if (!at || at.prediction == null || at.result == null) return '';
      var cfg = C.experiments[eid];
      function bar(v, cls) { return '<span class="pr-track"><span class="pr-base" style="left:' + pct(BASE) + '"></span><span class="pr-fill ' + cls + '" style="width:' + pct(v) + '"></span></span>'; }
      return '<div class="pr-row"><p class="pr-what"><b class="sym c-' + cfg.key + '">' + C.inputs[cfg.key].sym + '</b> ' + times(at.variant) + '</p>' +
        '<div class="pr-bars"><p><span class="pr-label">' + P.you + '</span>' + bar(at.prediction, 'pr-you') + '<b>' + f(at.prediction) + ' m</b></p>' +
        '<p><span class="pr-label">' + P.result + '</span>' + bar(at.result, 'pr-res') + '<b>' + f(at.result) + ' m</b></p></div></div>';
    }).join('');
    if (!rows) return '';
    return '<section class="card pred-recap"><h3>' + P.title + '</h3>' + rows + '<p class="muted pr-note">' + P.note + '</p></section>';
  }

  /* ---------------- Phase 7 · Mission summary + Go deeper ---------------- */
  VIEWS.missionSummary = function (id, a) {
    var T = C.missionSummary;
    var stage, head, body;
    if (ui.deeper) {
      var D = T.deeper;
      stage = '<div class="stage-inner stage-center"><div class="deeper-list">' + D.cards.map(function (c, i) {
        return '<section class="card deeper-card"><h3><span class="muted">0' + (i + 1) + '</span> ' + c.title + '</h3>' +
          (c.eq ? '<p class="deeper-eq">' + c.eq + '</p>' : '') + '<p>' + c.text + '</p></section>';
      }).join('') + '<p class="muted small">' + D.source + '</p></div></div>';
      head = headHTML({ eyebrow: D.eyebrow, heading: D.heading, hint: false, prompt: D.text });
      body = '<button type="button" class="link-btn green" data-action="deeper-close" data-fk="deeper-close">' + D.back + '</button>' +
        actionsHTML(btn(T.finish, 'finish', { fk: 'primary' })) + caption(finishNote(D.finishNote));
    } else {
      var c = T.cards;
      var c1 = '<section class="card sum-card2"><p class="muted">01</p><h3>' + c[0].title + '</h3>' + c[0].rows.map(function (r) {
        return '<div class="sum-row"><b class="sym c-' + r.key + '">' + C.inputs[r.key].sym + '</b><span>' + r.text + '</span></div>';
      }).join('') + '</section>';
      var c2 = '<section class="card sum-card2"><p class="muted">02</p><h3>' + c[1].title + '</h3>' + C.decode.model.rules.map(function (r) {
        var sym = '<b class="sym c-' + r.key + '">' + C.inputs[r.key].sym + '</b>';
        return '<div class="rule-row compact"><span class="rule-pair">' + sym + badgeArrow(true, r.key) + '<b>h</b>' + badgeArrow(r.up === 'up', 'h') + '</span><span class="rule-tag c-' + r.key + '">' + r.tag + '</span></div>';
      }).join('') + '</section>';
      var c3 = '<section class="card sum-card2"><p class="muted">03</p><h3>' + V(c[2], 'title') + '</h3>' + bigFormulaHTML() + '<p class="muted">' + c[2].note + '</p></section>';
      var c4 = '<section class="card sum-card2"><p class="muted">04</p><h3>' + c[3].title + '</h3><p>' + c[3].text + '</p></section>';
      stage = '<div class="stage-inner stage-center"><div class="sum-grid">' + c1 + c2 + c3 + c4 + '</div>' + predictionRecapHTML() + '</div>';
      head = headHTML({ eyebrow: 'Mission debrief', heading: T.heading, hint: false, prompt: V(T, 'text') });
      body = '<button type="button" class="link-btn green" data-action="deeper-open" data-fk="deeper-open">' + T.deeperLink + '</button>' +
        '<p class="helper">' + T.deeperNote + '</p>' +
        actionsHTML(btn(T.finish, 'finish', { fk: 'primary' })) + caption(finishNote(T.finishNote));
    }
    return { stage: stage, head: head, body: body, formula: false, phaseKey: ui.deeper ? 'deeper' : 'summary', phaseStage: true };
  };

  function canSubmit(id, a) {
    var d = a.draft || {};
    switch (typeOf(id)) {
      case 'briefing': return !!(d.notSure || (d.text && d.text.trim()));
      case 'console': return !!d.selected;
      case 'experiment': return a.phase === 'explain' ? !!d.choice : d.prediction != null;
      case 'sensor': return !!d.choice && !!d.quantity;
      case 'mixed': {
        var m = d.map || {};
        return !!(m.dg && m.gp && m.R && d.pred);
      }
      case 'planets': {
        var at = attempt(a);
        var est = d.estimates || {};
        return at.variant.every(function (p) { return est[p.id] != null; }) && !!d.smallest && !!d.reason;
      }
      case 'crewCombined': return d.prediction != null && !!(d.reason && d.reason.trim());
      case 'rank': return !!d.moved;
      case 'decodeFill': {
        var bl = d.blanks || {};
        return C.decode.summary.rows.every(function (r) { var b = bl[r.key] || {}; return b.change && b.size && b.prop; });
      }
      case 'calc': {
        var cv = d.vals || {};
        var cc = C.calc[id];
        return cc.known.every(function (k) { return k.fixed || (cv[k.key] != null && String(cv[k.key]).trim() !== ''); }) &&
          cv[cc.solve.key] != null && String(cv[cc.solve.key]).trim() !== '';
      }
      case 'landing': return !!d.choice && !!(d.report && d.report.trim());
      case 'endReflect': return !!(d.text && d.text.trim());
      default: return true;
    }
  }

  function syncSubmitState() {
    var id = curId();
    var a = act(id);
    var b = els.body.querySelector('[data-submit]');
    if (b) b.disabled = !canSubmit(id, a);
  }

  /* ===================================================================== *
   * Prediction controls (gauge + stepper), updated in place during drags
   * ===================================================================== */
  function setPrediction(v) {
    var id = curId();
    var a = act(id);
    if (a.phase !== 'awaiting') return;
    a.draft.prediction = v == null ? null : clamp(n2(v), 0, GMAX);
    syncPredictionUI(a, id);
  }

  function syncPredictionUI(a, id) {
    var v = a.draft.prediction;
    var has = v != null;
    var pos = has ? pct(v) : '0%';
    var marker = els.stage.querySelector('.g-marker');
    var you = els.stage.querySelector('.g-you');
    var track = els.stage.querySelector('.gauge-track[role="slider"]');
    var input = document.getElementById('pred-input');
    var helper = document.getElementById('pred-helper');
    var sHelper = document.getElementById('submit-helper');
    if (marker) { marker.hidden = !has; marker.style.bottom = pos; }
    if (you) { you.hidden = !has; you.style.bottom = pos; you.textContent = has ? 'You ' + f(v) + ' m' : ''; }
    if (track) {
      if (has) track.setAttribute('aria-valuenow', String(v)); else track.removeAttribute('aria-valuenow');
      track.setAttribute('aria-valuetext', has ? f(v) + ' meters' : 'No prediction yet');
    }
    if (input && document.activeElement !== input) input.value = has ? f(v) : '';
    var verb = typeOf(id) === 'experiment' ? 'run' : 'submit';
    if (helper) helper.textContent = predHelperText(v, verb);
    if (sHelper && verb === 'run') sHelper.textContent = has ? 'Results stay hidden until you run it.' : 'Make a prediction to unlock the experiment.';
    // The planet follows the marker: its ocean stretches to the predicted height as it moves.
    if (typeOf(id) === 'experiment' && PLANET_LAST.px && PT.px) {
      planetTween('px', { h: PT.px.h }, { h: has ? v : BASE }, 170, { over: { hTag: has ? 'you' : null } });
    }
    syncSubmitState();
  }

  /* ===================================================================== *
   * Animation helpers (respect prefers-reduced-motion)
   * ===================================================================== */
  function tween(ms, fn, done) {
    if (reduced()) { fn(1); if (done) done(); return; }
    var t0 = performance.now();
    function step(t) {
      var k = Math.min(1, (t - t0) / ms);
      fn(1 - Math.pow(1 - k, 3));
      if (k < 1) requestAnimationFrame(step); else if (done) done();
    }
    requestAnimationFrame(step);
  }

  // Redraws one planet diagram at each height between two values, so the ocean, the arrows on
  // its surface and the height label all move together.
  // from / to: the values that move, e.g. { h: 4 } → { h: 8 } or { dg: 1 } → { dg: 2 }.
  // Everything else comes from the diagram as its view last drew it, plus `opt.over`.
  // opt.delay holds the first frame for a moment (used when a page is still fading in).
  function planetTween(idp, from, to, ms, opt) {
    opt = opt || {};
    var st = PT[idp] || (PT[idp] = { seq: 0, tag: null, h: null });
    var seq = ++st.seq;
    function frame(k) {
      if (seq !== st.seq) return;
      var base = PLANET_LAST[idp];
      if (!base) return;
      var o = {};
      Object.keys(base).forEach(function (key) { o[key] = base[key]; });
      Object.keys(opt.over || {}).forEach(function (key) { o[key] = opt.over[key]; });
      o.labelVals = { dg: base.dg, gp: base.gp, R: base.R };
      Object.keys(to).forEach(function (key) { o[key] = k === 1 ? to[key] : from[key] + (to[key] - from[key]) * k; });
      o.from = null; o.fromProps = null; o._frame = true;
      // While an input is moving it glows, so the eye goes to what is changing.
      o.changing = k < 1 ? (opt.emph || null) : null;
      st.h = o.h;
      var svg = els.stage.querySelector('svg.planet-svg[data-idp="' + idp + '"]');
      if (svg) svg.outerHTML = planetSVG(o);
    }
    if (opt.delay && !reduced()) {
      frame(0);
      window.setTimeout(function () { if (seq === st.seq) tween(ms, frame); }, opt.delay);
    } else tween(ms, frame);
  }
  // The height a diagram is showing for this task (tag), so the next drawing can start from it.
  function planetShown(idp, tag, target) {
    var st = PT[idp] || (PT[idp] = { seq: 0, tag: null, h: null });
    if (st.tag !== tag || st.h == null) { st.tag = tag; st.h = target; }
    return st.h;
  }

  // Diagrams drawn with a `from` height animate to their own height; those drawn with
  // `fromProps` also animate those inputs (the Tide Lab's "what changed" cue, which starts
  // a moment late so it is not lost under the page's fade-in).
  function runTweens(root, ms) {
    root.querySelectorAll('svg.planet-svg[data-tween]').forEach(function (el) {
      var idp = el.getAttribute('data-idp'), o = PLANET_LAST[idp];
      if (!o) return;
      var from = {}, to = {};
      if (o.from != null) { from.h = o.from; to.h = o.h; }
      Object.keys(o.fromProps || {}).forEach(function (key) { from[key] = o.fromProps[key]; to[key] = o[key]; });
      if (!Object.keys(to).length) return;
      if (o.fromProps) planetTween(idp, from, to, 1200, { delay: 350, emph: Object.keys(o.fromProps)[0] });
      else planetTween(idp, from, to, ms || 900);
    });
  }

  /* ===================================================================== *
   * Video — YouTube IFrame Player API (embedded, never downloaded)
   * ===================================================================== */
  var ytPromise = null;
  var players = {};

  function loadYT() {
    if (window.YT && window.YT.Player) return Promise.resolve(window.YT);
    if (ytPromise) return ytPromise;
    ytPromise = new Promise(function (resolve, reject) {
      var timer = window.setTimeout(function () { reject(new Error('api-timeout')); }, C.video.loadTimeoutMs);
      var prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = function () {
        window.clearTimeout(timer);
        if (typeof prev === 'function') prev();
        resolve(window.YT);
      };
      var s = document.createElement('script');
      s.src = 'https://www.youtube.com/iframe_api';
      s.async = true;
      s.onerror = function () { window.clearTimeout(timer); reject(new Error('api-script-error')); };
      document.head.appendChild(s);
    });
    ytPromise.catch(function () { ytPromise = null; });
    return ytPromise;
  }

  function mountPlayer(elId, excerpt, h) {
    var YT = window.YT;
    var poll = null, ready = false;
    var playerVars = { start: excerpt.start, end: excerpt.end, rel: 0, playsinline: 1, controls: 1, iv_load_policy: 3, autoplay: h.autoplay ? 1 : 0 };
    if (/^https?:$/.test(location.protocol)) playerVars.origin = location.origin;
    var readyTimer = window.setTimeout(function () { if (!ready) h.onError('player-timeout'); }, C.video.loadTimeoutMs);
    var player = new YT.Player(elId, {
      videoId: C.video.videoId,
      width: '100%', height: '100%',
      playerVars: playerVars,
      events: {
        onReady: function (e) {
          ready = true;
          window.clearTimeout(readyTimer);
          try { e.target.getIframe().setAttribute('title', C.video.title + ' — ' + (h.label || 'excerpt') + ' (YouTube video player)'); } catch (_) { /* ignore */ }
          if (h.autoplay) { try { e.target.playVideo(); } catch (_) { /* learner can press play */ } }
          if (h.onReady) h.onReady();
        },
        onStateChange: function (e) {
          window.clearInterval(poll);
          if (e.data === YT.PlayerState.PLAYING) {
            if (h.onPlay) h.onPlay();
            poll = window.setInterval(function () {
              var t = 0;
              try { t = player.getCurrentTime(); } catch (_) { return; }
              if (t >= excerpt.end - 0.25) {
                try { player.pauseVideo(); } catch (_) { /* ignore */ }
                window.clearInterval(poll);
                if (h.onEnd) h.onEnd();
              }
            }, 250);
          } else if (e.data === YT.PlayerState.ENDED) {
            if (h.onEnd) h.onEnd();
          }
        },
        onError: function (e) {
          window.clearInterval(poll);
          window.clearTimeout(readyTimer);
          h.onError('youtube-error-' + e.data);
        }
      }
    });
    players[elId] = { player: player, stop: function () { window.clearInterval(poll); window.clearTimeout(readyTimer); } };
  }

  function destroyPlayers() {
    Object.keys(players).forEach(function (k) {
      try { players[k].stop(); players[k].player.destroy(); } catch (_) { /* ignore */ }
      delete players[k];
    });
  }

  function setVideoStatus(msg) {
    var el = document.getElementById('video-status');
    if (el) el.textContent = msg;
  }

  function startOpeningVideo() {
    ui.video = 'player';
    state.video.opening.playRequestedAt = nowISO();
    render();
    setVideoStatus('Loading the video…');
    loadYT().then(function () {
      mountPlayer('yt-opening', C.video.opening, {
        autoplay: true, label: 'opening excerpt',
        onReady: function () { setVideoStatus('If playback doesn’t start, press play in the video.'); },
        onPlay: function () {
          if (!state.video.opening.startedAt) state.video.opening.startedAt = nowISO();
          setVideoStatus('');
          save();
        },
        onEnd: function () {
          if (!state.video.opening.reachedEndAt) state.video.opening.reachedEndAt = nowISO();
          save();
          // Unlock the next section in place; a re-render would disturb the player.
          var nextBtn = document.querySelector('[data-action="brief-next"]');
          if (nextBtn) nextBtn.disabled = false;
          var nextHelp = document.getElementById('brief-helper');
          if (nextHelp) nextHelp.hidden = true;
          var where = narrowQuery.matches ? 'below' : 'on the right';
          var nextUp = 'Log your first idea';
          setVideoStatus('Excerpt finished. ' + nextUp + ' ' + where + '.');
          announce('Excerpt finished. ' + nextUp + '.');
          cueNext(nextBtn);
        },
        onError: function (code) { showVideoFallback('error', code); }
      });
    }).catch(function (err) { showVideoFallback('error', err && err.message); });
  }

  function showVideoFallback(reason, detail) {
    destroyPlayers();
    ui.video = 'fallback';
    ui.videoReason = reason;
    if (!state.video.opening.fallbackShownAt) state.video.opening.fallbackShownAt = nowISO();
    if (detail) state.video.opening.error = String(detail);
    if (curId() === 'briefing') {
      render({ focus: '#fb-title' });
      announce(reason === 'chosen' ? 'Scene summary shown.' : 'The video couldn’t load. A scene summary is shown instead.');
    }
  }

  function setEndingStatus(msg) {
    var el = document.getElementById('ending-status');
    if (el) el.textContent = msg;
  }

  function startEndingVideo() {
    var rec = state.video.ending;
    ui.endVideo = 'player';
    rec.playRequestedAt = rec.playRequestedAt || nowISO();
    render();
    setEndingStatus('Loading the video…');
    loadYT().then(function () {
      mountPlayer('yt-ending', C.video.ending, {
        autoplay: true, label: 'ending',
        onReady: function () { setEndingStatus('If playback doesn’t start, press play in the video.'); },
        onPlay: function () {
          if (!rec.startedAt) rec.startedAt = nowISO();
          setEndingStatus('');
          save();
        },
        onEnd: function () {
          if (!rec.reachedEndAt) rec.reachedEndAt = nowISO();
          var where = narrowQuery.matches ? 'below' : 'on the right';
          render();
          var refl = typeOf(curId()) === 'endReflect';
          setEndingStatus(refl ? 'Scene finished. Write your answer ' + where + '.' : 'Scene finished. Continue to the debrief ' + where + '.');
          announce(refl ? 'Scene finished. Write your answer.' : 'Scene finished. Continue to the debrief.');
          cueNext(els.body.querySelector('textarea') || els.body.querySelector('[data-fk="primary"]'));
        },
        onError: function (code) { showEndingFallback('error', code); }
      });
    }).catch(function (err) { showEndingFallback('error', err && err.message); });
  }

  function showEndingFallback(reason, detail) {
    destroyPlayers();
    var rec = state.video.ending;
    ui.endVideo = 'fallback';
    ui.endVideoReason = reason;
    if (!rec.fallbackShownAt) rec.fallbackShownAt = nowISO();
    if (detail) rec.error = String(detail);
    // The ending plays on the reflection page in the new design ('end-reflect'); the older
    // 'film-ending' page is kept for saved sessions.
    var t = typeOf(curId());
    if (t === 'endReflect' || t === 'filmEnding' || curId() === 'film-ending') {
      render({ focus: '#end-fb-title' });
      announce(reason === 'chosen' ? 'Scene description shown.' : 'The video couldn’t load. A description of the scene is shown instead.');
    }
  }

  /* ===================================================================== *
   * Rendering
   * ===================================================================== */
  function patch(el, html) {
    if (el.__html !== html) {
      el.innerHTML = html;
      el.__html = html;
    }
  }

  function devbarHTML() {
    var scr = currentScreen();
    var cur = scr === 'stepIntro' ? 'intro:' + state.pos.step : scr === 'intro' || scr === 'complete' ? 'screen:' + scr :
      STUDY_SCREENS[scr] ? devStudyValue(scr) : state.pos.step + ':' + state.pos.sub;
    function opt(value, label) {
      return '<option value="' + value + '"' + (value === cur ? ' selected' : '') + '>' + esc(label) + '</option>';
    }
    // Study pages: a jump starts that page afresh (its earlier answers are cleared and the reset is noted).
    var studyOpts = study ? '<optgroup label="Study pages, before the mission (a jump restarts the page)">' +
      opt('study:consent', 'Consent') + opt('study:pretest', 'Pretest') +
      opt('study:pretest-thanks', 'Pretest → thank-you page (between pretest and mission)') + '</optgroup>' : '';
    var studyEnd = study ? '<optgroup label="Study pages, after the mission (a jump restarts the page)">' +
      opt('study:posttest-transition', 'Transition page (between mission and posttest)') + opt('study:posttest', 'Posttest') +
      opt('study:survey', 'Learner survey') + '</optgroup>' : '';
    var options = studyOpts + opt('screen:intro', 'Start screen') +
      C.steps.map(function (st, i) {
        return '<optgroup label="' + (i + 1) + '. ' + esc(st.label) + '">' +
          (C.stepIntros[st.id] ? opt('intro:' + i, 'Intro page — ' + C.stepIntros[st.id].title) : '') +
          st.activities.map(function (id, j) { return opt(i + ':' + j, activityLabel(id) || id); }).join('') + '</optgroup>';
      }).join('') +
      studyEnd + opt('screen:complete', 'Mission complete screen');
    return '<p class="devbar-tag"><svg class="ic" viewBox="0 0 20 20" aria-hidden="true"><path d="M7 6l-4 4 4 4M13 6l4 4-4 4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg><span>Developer mode</span></p>' +
      '<label class="devbar-label" for="dev-jump">Jump to</label>' +
      '<select id="dev-jump" class="devbar-select" data-fk="dev-jump">' + options + '</select>' +
      '<button type="button" class="btn btn-sm btn-secondary" data-action="dev-jump" data-fk="dev-go">Go</button>' +
      '<p class="devbar-note">All sections unlocked. Jumps are noted in the session export.</p>' +
      devVersionHTML() +
      '<button type="button" class="btn btn-sm btn-ghost devbar-off" data-action="dev-toggle" data-fk="dev-off">Turn off</button>';
  }

  // Which version of the A/B test this page is, with a link to the other one. Each version
  // has its own saved session, so switching doesn't carry progress across.
  function devVersionHTML() {
    var other = COND === 'a' ? 'b' : 'a';
    return '<p class="devbar-version" title="' + esc(AB.conditions[COND].label) + '">Version <b>' + COND.toUpperCase() + '</b></p>' +
      '<a class="btn btn-sm btn-secondary devbar-switch" href="' + esc(conditionHref(other)) + '" data-fk="dev-version" aria-label="Switch to version ' + other.toUpperCase() +
      '" title="' + esc(AB.conditions[other].label) + '"><span class="devbar-switch-long">Switch to </span>' + other.toUpperCase() + '</a>';
  }

  function renderDevbar() {
    document.body.classList.toggle('dev-on', DEV.on);
    els.devBtn.hidden = !DEV.available; // learners on the A and B links never see the button
    els.devBtn.setAttribute('aria-pressed', String(DEV.on));
    els.devbar.hidden = !DEV.on;
    patch(els.devbar, DEV.on ? devbarHTML() : '');
  }

  function devJump(value) {
    noteDevUse();
    state.devMode.jumps.push({ to: value, at: nowISO() });
    ui.confirmReset = false;
    if (value.indexOf('study:') === 0) {
      var page = value.slice(6);
      destroyPlayers();
      study.devResets.push({ page: page, at: nowISO() });
      if (page === 'consent') { study.consent = null; ui.consentChoice = null; }
      else if (page === 'survey') study.survey = { shownAt: null, submittedAt: null, activeMs: 0, answers: {}, changes: [] };
      else if (page === 'pretest-thanks') {
        // The thank-you page: the pretest counts as submitted (answers so far are kept).
        var pt = study.pretest;
        if (!pt.startedAt) pt.startedAt = nowISO();
        pt.submittedAt = pt.submittedAt || nowISO();
        pt.proceededAt = null;
        pt.pos = ST.pretest.items.length;
        page = 'pretest';
      } else if (page === 'posttest-transition') { study.posttest = freshTest(); page = 'posttest'; }
      // "Posttest" starts at its intro page, past the transition page.
      else if (page === 'posttest') { study.posttest = freshTest(); study.posttest.transitionAt = nowISO(); }
      else study[page] = freshTest();
      ui.testNudge = null; ui.testErr = null;
      saveStudy();
      ui.screen = page;
      save();
      render({ focusHead: true, scrollTop: true });
      return;
    }
    if (value === 'screen:intro' || value === 'screen:complete') {
      destroyPlayers();
      ui.screen = value.slice(7);
      ui.warpJump = ui.screen === 'complete';
      save();
      render({ focusHead: true, scrollTop: true });
      return;
    }
    var parts = value.split(':');
    ui.screen = null;
    if (!state.introSeenAt) state.introSeenAt = nowISO();
    if (parts[0] === 'intro') {
      goTo(+parts[1], 0, { silent: true });
      ui.screen = 'stepIntro';
      save();
      render({ focusHead: true, scrollTop: true });
      return;
    }
    var sid = C.steps[+parts[0]].id;
    if (C.stepIntros[sid] && !(state.stepIntros[sid] && state.stepIntros[sid].startedAt)) {
      state.stepIntros[sid] = { shownAt: null, startedAt: nowISO(), skippedInDevMode: true };
    }
    goTo(+parts[0], +parts[1]);
    save();
  }

  function renderTopbar() {
    renderDevbar();
    // Progress rail: one segment per step (wider for steps with more tasks), one block per task.
    // Block states: done (completed), now (the task on screen), seen (opened, not finished), or upcoming.
    var html = C.steps.map(function (s, i) {
      var isDone = stepDone(i);
      var cur = i === state.pos.step;
      var reachable = DEV.on || i <= state.furthest.step;
      var cls = cur ? 'seg-current' : isDone ? 'seg-done' : reachable ? 'seg-open' : 'seg-locked';
      var doneCount = 0;
      var blocks = s.activities.map(function (id, j) {
        var a = state.activities[id];
        var st = a && a.completedAt ? 'done' : '';
        if (st) doneCount++;
        if (cur && j === state.pos.sub) st = (st ? st + ' ' : '') + 'now';
        else if (!st && cmpPos({ step: i, sub: j }, state.furthest) <= 0) st = 'seen';
        var key = cur && j === state.pos.sub ? 'now|' + id + '|' + ui.navSeq : a && a.completedAt ? 'blk|' + id : '';
        return '<span class="blk' + (st ? ' ' + st : '') + '"' + (key ? ' data-enter="' + key + '"' : '') + '></span>';
      }).join('');
      var n = s.activities.length;
      var name = 'Step ' + (i + 1) + ': ' + s.label +
        (n > 1 ? ', ' + doneCount + ' of ' + n + ' tasks done' : isDone ? ', done' : '') +
        (reachable ? '' : ', locked');
      return '<li class="seg ' + cls + '" style="--n:' + n + '">' +
        '<button type="button" class="seg-btn" data-action="goto-step" data-step="' + i + '" data-fk="cp-' + i + '"' +
        ' aria-label="' + esc(name) + '" title="' + esc(name) + '"' +
        (reachable ? '' : ' disabled') + (cur ? ' aria-current="step"' : '') + '>' +
        '<span class="blocks" aria-hidden="true">' + blocks + '</span>' +
        '<span class="seg-label" aria-hidden="true">' + s.label + '</span></button></li>';
    }).join('');
    patch(els.checkpoints, html);
    var st = C.steps[state.pos.step];
    var many = st.activities.length > 1;
    patch(els.railHead,
      '<span class="rail-step"><b>' + st.label + '</b>' +
      (many ? '<span class="rail-task rail-task-long"> · task ' + (state.pos.sub + 1) + ' of ' + st.activities.length + '</span>' +
        '<span class="rail-task rail-task-short"> · ' + (state.pos.sub + 1) + '/' + st.activities.length + '</span>' : '') +
      '</span><span class="rail-count">Step ' + (state.pos.step + 1) + ' of ' + C.steps.length + '</span>');
    // The full rail stays folded away until the learner opens it from the header.
    els.railHead.setAttribute('aria-expanded', ui.railOpen ? 'true' : 'false');
    els.railHead.parentNode.classList.toggle('rail-open', !!ui.railOpen);
    els.evCount.textContent = state.evidence.length + '/' + C.evidence.length;
    // A new finding: it is carried from the task panel up to the log (see flyToLog), which bumps.
    if (ui.lastEv != null && state.evidence.length > ui.lastEv) ui.flyEv = true;
    ui.lastEv = state.evidence.length;
    document.getElementById('evidence-btn').setAttribute('aria-label', 'Evidence log, ' + state.evidence.length + ' of ' + C.evidence.length + ' found');
  }

  /* The model equation is a learner reference on every task. It is drawn in one fixed place,
     at the top of the model view right above the diagram (see formulaHTML and render). */

  /* Mission start: the screen goes dark on "Incoming Transmission", then opens from the middle
     onto the first task. It sits above the page for about a second and takes no clicks: the
     task underneath is already there and usable. */
  function openChannel() {
    if (reduced()) return;
    var el = document.createElement('div');
    el.className = 'tx-open';
    el.setAttribute('aria-hidden', 'true');
    el.innerHTML = '<span class="txo-half txo-top"></span><span class="txo-half txo-bot"></span>' +
      '<p class="txo-label">' + I.radio + '<span>' + C.steps[0].label + '</span></p>';
    document.body.appendChild(el);
    window.setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 1700);
  }

  /* A returning learner lands straight on their task; a short note says where that is.
     It sits above the page, takes no clicks and leaves on its own. */
  function welcomeBack() {
    if (!resumed || currentScreen() || state.completedAt) return;
    var st = C.steps[state.pos.step];
    if (state.pos.step === 0 && !state.firstIdea) return; // nothing done yet
    var where = st.label + ' · task ' + (state.pos.sub + 1) + ' of ' + st.activities.length;
    var el = document.createElement('p');
    el.className = 'toast';
    el.setAttribute('role', 'status');
    el.innerHTML = I.radio + '<span>' + C.welcomeBack.replace('{where}', esc(where)) + '</span>';
    document.body.appendChild(el);
    window.setTimeout(function () { el.classList.add('leaving'); }, 5200);
    window.setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 5800);
  }

  /* ---------------- motion helpers ---------------- */
  // Restart a one-off CSS animation class on an element, then remove it.
  function replayClass(el, cls, ms) {
    if (!el) return;
    el.classList.remove(cls);
    void el.offsetWidth; // reflow so the animation starts again
    el.classList.add(cls);
    clearTimeout(el['__t_' + cls]);
    el['__t_' + cls] = setTimeout(function () { el.classList.remove(cls); }, ms);
  }

  // Points the learner at the control that has just become available (after a clip ends):
  // two soft rings spread from it. Nothing else on the panel moves.
  function cueNext(el) {
    if (el && !el.disabled) replayClass(el, 'cue', 1700);
  }

  // Elements with data-enter="key" play their entrance animation the first time that key
  // appears, and never on page load or when revisiting a step.
  function runEnters() {
    var list = document.querySelectorAll('[data-enter]');
    for (var i = 0; i < list.length; i++) {
      var el = list[i], k = el.getAttribute('data-enter');
      if (ui.enterSeen[k]) continue;
      ui.enterSeen[k] = true;
      if (!ui.enterPrimed) continue;
      el.classList.add('enter');
      if (el.hasAttribute('data-count-to')) countUp(el);
      if (el.hasAttribute('data-zoom')) chartZoomOut(el);
    }
    ui.enterPrimed = true;
  }

  // Result numbers count from the 4 m baseline to the model's value.
  function countAttrs(key, from, to) {
    return ' data-enter="' + key + '" data-count-from="' + from + '" data-count-to="' + to + '"';
  }
  function countUp(el) {
    var from = +el.getAttribute('data-count-from'), to = +el.getAttribute('data-count-to');
    if (reduced() || from === to) return;
    tween(800, function (k) { el.textContent = f(Math.round((from + (to - from) * k) * 10) / 10) + ' m'; },
      function () { el.textContent = f(to) + ' m'; });
  }

  /* ---------------- full-page screens: mission start and mission complete ---------------- */
  // Sessions saved before the start screen existed have already begun, so they skip it.
  function introPending() {
    return !state.introSeenAt && !state.firstIdea && state.furthest.step === 0 && state.furthest.sub === 0;
  }
  // A step's intro page shows once, before its first task, unless that task already has a submitted attempt.
  function stepIntroPending() {
    var st = C.steps[state.pos.step];
    if (!C.stepIntros[st.id] || state.pos.sub !== 0) return false;
    var rec = state.stepIntros[st.id];
    if (rec && rec.startedAt) return false;
    var a = state.activities[st.activities[0]];
    return !(a && a.attempts && a.attempts.some(function (t) { return t.submittedAt; }));
  }
  function landingCallPending() {
    var a = state.activities['crew-combined'];
    return curId() === 'crew-combined' && !!a && a.phase === 'call';
  }
  function currentScreen() {
    // Study pages come first: consent and the pretest before the mission, the posttest and the
    // survey after it. A developer jump to another page (ui.screen) wins over them.
    if (STUDY_MISSING) return 'loadError';
    if (ui.screen && STUDY_SCREENS[ui.screen]) return ui.screen;
    var gate = studyGateNow();
    if (gate) return gate;
    if (ui.screen === 'intro' || introPending()) return 'intro';
    if ((ui.screen === 'stepIntro' && C.stepIntros[C.steps[state.pos.step].id]) || stepIntroPending()) return 'stepIntro';
    if (landingCallPending()) return 'landingCall';
    if (ui.screen === 'complete' && (state.completedAt || DEV.on)) return 'complete';
    return null;
  }

  function summaryCardsHTML() {
    return '<div class="summary-cards">' + C.debrief.summary.map(function (s) {
      return '<div class="sum-card sum-' + s.key + '"><p class="sum-title"><span class="sw sw-' + s.key + '" aria-hidden="true"></span><span>' + s.title + '</span></p>' +
        '<p class="sum-result">' + (s.dir === 'up' ? I.up : I.down) + '<span>' + s.result + '</span></p><p class="sum-note">' + s.note + '</p></div>';
    }).join('') + '</div>';
  }

  function transmissionHTML(who, text) {
    return '<div class="transmission"><p class="tx-head">' + I.radio + '<span>Incoming · ' + who + '</span></p>' +
      '<p class="tx-msg">“' + text + '”</p></div>';
  }

  var SCREENS = {
    stepIntro: function () {
      // One page, laid out as in Figma: a card (signal icon, title, crew message, situation),
      // then the learner's job, the Start button and an optional note.
      var st = C.steps[state.pos.step];
      var T = C.stepIntros[st.id];
      var line = C.crewLines[st.id];
      return '<div class="screen-inner step-intro2">' +
        '<section class="intro-card"><p class="intro-card-ic">' + I.radio + '</p>' +
        '<h1 id="screen-heading" class="screen-title" tabindex="-1">' + T.title + '</h1>' +
        (line ? '<p class="tx-stream" data-enter="intro-tx|' + st.id + '">“' + streamHTML(line.text) + '”</p>' : '') +
        '<p>' + V(T, 'situation') + '</p></section>' +
        '<p class="intro-job"><b>Your job:</b> ' + V(T, 'job') + '</p>' +
        '<div class="screen-actions">' + btn(T.start || C.stepIntroStart, 'start-step', { fk: 'start-step' }) + '</div>' +
        (T.note ? '<p class="intro-note">' + T.note + '</p>' : '') + '</div>';
    },
    landingCall: function () {
      var L = C.landingCall;
      var a = act('crew-combined');
      var at = attempt(a);
      var h = M.modelHeight({ dg: at.variant.dg, gp: at.variant.gp }, BASE);
      var cur = a.landingCall ? a.landingCall.choice : null;
      var reply = cur ? '<div class="transmission tx-reply" data-enter="call|' + cur + '|' + h + '"><p class="tx-head">' + I.radio + '<span>' + L.who + '</span></p>' +
        '<p class="tx-msg">“' + L.reply(cur, h) + '”</p></div>' : '<p class="helper">' + L.helper + '</p>';
      return '<div class="screen-inner landing-call-screen">' +
        '<p class="screen-eyebrow">' + L.eyebrow + '</p>' +
        transmissionHTML(L.who, L.ask) +
        '<h1 id="screen-heading" class="screen-title" tabindex="-1">' + L.legend + '</h1>' +
        '<p class="screen-lede">' + (at.prediction != null ? 'You forecast ' + f(at.prediction) + ' m. ' : '') + L.context(h) + '</p>' +
        '<fieldset class="choices landing-call" aria-labelledby="screen-heading">' +
        L.options.map(function (o) {
          return '<label class="choice"><input type="radio" name="landing-call" value="' + o.value + '" data-change="landing-call" data-fk="call-' + o.value + '"' +
            (cur === o.value ? ' checked' : '') + '><span>' + o.label + '</span></label>';
        }).join('') + '</fieldset>' + reply +
        '<div class="screen-actions row">' + btn(L.back, 'call-back', { kind: 'ghost', fk: 'call-back' }) +
        btn(L.next, 'call-continue', { fk: 'call-continue', disabled: !cur }) + '</div></div>';
    },
    intro: function () {
      // Two short pages (ui.introPage): the story hook, then the goals and phases with Start.
      var T = C.intro;
      var factIcons = [I.clock, I.sound];
      var dots = function (n) {
        return '<span class="intro-dots" aria-hidden="true"><i' + (n === 1 ? ' class="on"' : '') + '></i><i' + (n === 2 ? ' class="on"' : '') + '></i></span>' +
          '<span class="sr-only">Page ' + n + ' of 2</span>';
      };
      if (ui.introPage !== 2) {
        return '<div class="screen-inner intro intro-p1">' +
          '<p class="screen-eyebrow">' + T.eyebrow + '</p>' +
          '<h1 id="screen-heading" class="intro-title" tabindex="-1">' + T.title + '</h1>' +
          '<div class="screen-lede">' + T.lede.map(function (t) { return '<p>' + t + '</p>'; }).join('') + '</div>' +
          '<ul class="intro-facts">' + T.facts.map(function (t, i) { return '<li>' + (factIcons[i] || I.info) + '<span>' + t + '</span></li>'; }).join('') + '</ul>' +
          '<div class="screen-actions row">' + btn(T.next, 'intro-continue') + dots(1) + '</div></div>';
      }
      return '<div class="screen-inner intro intro-p2">' +
        '<h1 id="screen-heading" class="intro-title" tabindex="-1">' + T.missionTitle + '</h1>' +
        '<div class="intro-goal"><p class="mini-label">' + T.goalLabel + '</p><ul class="intro-goals">' +
        T.goals.map(function (t) { return '<li>' + I.check + '<span>' + t + '</span></li>'; }).join('') + '</ul></div>' +
        '<div class="intro-loop"><p class="mini-label">' + T.loopLabel + '</p><ol class="loop">' +
        T.loop.map(function (t) { return '<li>' + t + '</li>'; }).join('') + '</ol></div>' +
        '<div class="screen-actions row">' + btn(T.back, 'intro-back', { kind: 'ghost' }) + btn(T.start, 'start-mission') + dots(2) + '</div>' +
        '<p class="note screen-note">' + T.note + '</p></div>';
    },
    complete: function () {
      var T = C.complete;
      var studyDone = !!(study && study.survey.submittedAt);
      // Same page layout as every phase's starting page (one card, actions below it), over a
      // starfield. On arrival the stars stretch into a jump to light speed and the card follows
      // it in (class "jump" holds the card back until the jump is over); see warpSync().
      return '<canvas class="warp" aria-hidden="true"></canvas>' +
        '<div class="screen-inner step-intro2 complete2' + (ui.warpJump && !reduced() ? ' jump' : '') + '">' +
        '<section class="intro-card"><p class="intro-card-ic">' + I.check + '</p>' +
        '<h1 id="screen-heading" class="screen-title" tabindex="-1">' + T.title + '</h1>' +
        '<p class="screen-lede">' + V(T, 'lede') + '</p>' +
        '<ul class="ach-chips">' + V(T, 'chips').map(function (c) { return '<li>' + I.check + '<span>' + c + '</span></li>'; }).join('') + '</ul>' +
        // After the study's survey this is the last page: say so, and don't push a restart.
        (studyDone ? '<p class="t-closing" id="save-line" role="status" data-save="' + saveState() + '">' + saveLine() + '</p>' : '') + '</section>' +
        '<div class="screen-actions row">' + btn(T.restart, 'reset-ask', { fk: 'c-reset', kind: studyDone ? 'secondary' : null }) +
        btn(T.review, 'hide-screen', { kind: 'secondary', fk: 'c-review' }) + '</div>' +
        (ui.confirmReset && !els.dialog.open ? confirmResetHTML() : '') +
        researchHTML('c-export') + '</div>';
    }
  };

  /* ===================================================================== *
   * Study pages: consent, pretest, posttest, learner survey (see study-content.js)
   * ===================================================================== */
  var STUDY_SCREENS = { consent: 1, pretest: 1, posttest: 1, survey: 1 };
  function testOf(scr) { return !study ? null : scr === 'pretest' ? study.pretest : scr === 'posttest' ? study.posttest : null; }
  function testCfg(scr) { return scr === 'pretest' ? ST.pretest : ST.posttest; }
  function testPage(scr) { var t = testOf(scr); return t && t.pos >= 0 ? testCfg(scr).items[t.pos] || null : null; }

  // The study page that has to come next, or null when the learner is free to be in the mission.
  function studyGate() {
    if (!study) return null;
    if (!study.consent || (study.consent.choice === 'no' && !study.consent.continuedAt)) return 'consent';
    if (!studyActive()) return null;
    if (!study.pretest.submittedAt || !study.pretest.proceededAt) return 'pretest';
    if (state.completedAt && !study.posttest.submittedAt) return 'posttest';
    if (state.completedAt && !study.survey.submittedAt) return 'survey';
    return null;
  }

  /* After the survey the last page tells the learner when it is safe to leave. The final record
     goes out a moment after Finish (and a large one is not sent while the page is closing), so
     the line reads "Saving…" until the sender's outbox is empty, then gives the closing line.
     'off' = nothing is being collected here (no Supabase project, or the learner declined). */
  var saveWatch = { since: 0, done: false, timer: 0 };
  function saveState() {
    if (saveWatch.done) return 'saved';
    if (!LOG || !LOG.configured || !logAllowed()) return 'off';
    var st = LOG.status();
    if (!st.pendingSnapshot && !st.pendingEvents) { saveWatch.done = true; return 'saved'; }
    if (!saveWatch.since) saveWatch.since = Date.now();
    return st.lastError || Date.now() - saveWatch.since > 12000 ? 'slow' : 'saving';
  }
  function saveLine(state) {
    state = state || saveState();
    return state === 'saving' ? ST.mission.saving : state === 'slow' ? ST.mission.savingSlow : ST.mission.closing;
  }
  // Keeps the line current without redrawing the page. Stops once everything is sent.
  function watchSave() {
    window.clearInterval(saveWatch.timer);
    saveWatch.timer = window.setInterval(function () {
      var el = document.getElementById('save-line');
      if (!el) { window.clearInterval(saveWatch.timer); return; }
      var now = saveState();
      if (el.getAttribute('data-save') !== now) {
        el.setAttribute('data-save', now);
        el.innerHTML = saveLine(now);
        els.screen.__html = '\u0000changed'; // the page no longer matches its last drawing
      }
      if (now === 'saved' || now === 'off') window.clearInterval(saveWatch.timer);
    }, 400);
  }

  // The developer menu entry for the study page on screen.
  function devStudyValue(scr) {
    var k = pageKey(scr);
    return /^pretest:done$/.test(k) ? 'study:pretest-thanks' : /^posttest:transition$/.test(k) ? 'study:posttest-transition' : 'study:' + scr;
  }

  // In developer mode the study pages never force themselves in: reach them from the jump menu.
  function studyGateNow() { return DEV.on ? null : studyGate(); }

  // Where Finish mission (and "View mission summary") leads: the posttest, then the survey,
  // then the mission-complete screen. Always, in developer mode too; only a learner who
  // declined to take part, or ?study=0, goes straight to the complete screen.
  // The line under Finish mission: with the posttest still to come, it says so.
  function finishNote(missionNote) { return afterMissionScreen() === 'posttest' ? ST.mission.finishNote : missionNote; }

  function afterMissionScreen() {
    if (!study || (study.consent && study.consent.choice === 'no')) return 'complete';
    if (!study.posttest.submittedAt) return 'posttest';
    if (!study.survey.submittedAt) return 'survey';
    return 'complete';
  }

  // The record that collects time for the study page on screen.
  function studyItemRec(scr) {
    if (scr === 'survey') return study.survey;
    var t = testOf(scr), page = testPage(scr);
    return t && page ? t.items[page.id] || null : null;
  }

  function prepareStudyPage(scr) {
    if (scr === 'survey' && !study.survey.shownAt) { study.survey.shownAt = nowISO(); saveStudy(); }
    var t = testOf(scr), page = testPage(scr);
    if (t && page && !t.items[page.id]) {
      t.items[page.id] = { item: page.item, shownAt: nowISO(), submittedAt: null, activeMs: 0, answers: {}, changes: [], nudgedAt: null, skipped: [] };
      saveStudy();
    }
  }

  var T_EQ = {
    model: '<span class="t-eq" role="img" aria-label="h equals k times, delta g over g p, times R"><i>h</i> = <i>k</i> <span class="t-paren">(</span>' +
      '<span class="t-frac"><span>Δ<i>g</i></span><span><i>g</i><sub>p</sub></span></span><span class="t-paren">)</span> <i>R</i></span>',
    force: '<span class="t-eq" role="img" aria-label="F equals G M m over d squared"><i>F</i> = <span class="t-frac"><span><i>GMm</i></span><span><i>d</i><sup>2</sup></span></span></span>'
  };
  // <option> can't hold markup: write gₚ and ² as characters, drop the rest of the tags.
  function plainText(h) {
    return String(h).replace(/<sub>p<\/sub>/g, 'ₚ').replace(/<sup>2<\/sup>/g, '²').replace(/<[^>]+>/g, '');
  }

  function testAttrs(scr, key, fk) {
    return ' data-test="' + scr + '" data-key="' + key + '" data-fk="' + fk + '"';
  }
  // A test can set its own directions and reminder, and whether it offers "I'm not sure"
  // (offerUnsure; neither test does at present). Otherwise the shared setting applies.
  function testText(scr, key) { var c = testCfg(scr); return c[key] != null ? c[key] : ST[key]; }
  function withUnsure(scr, list, label) { return testText(scr, 'offerUnsure') ? list.concat([['unsure', label]]) : list; }
  function testRadios(scr, key, options, cur, legend) {
    var list = withUnsure(scr, options.map(function (o, i) { return [String(i), o]; }), ST.unsure);
    return '<fieldset class="choices t-choices"><legend class="' + (legend ? 't-part-label' : 'sr-only') + '">' + (legend || 'Your answer') + '</legend>' +
      list.map(function (o) {
        var on = cur != null && String(cur) === o[0];
        return '<label class="choice' + (o[0] === 'unsure' ? ' t-unsure' : '') + '"><input type="radio" name="' + key + '" value="' + o[0] + '" data-change="test-answer"' +
          testAttrs(scr, key, 't-' + key + '-' + o[0]) + (on ? ' checked' : '') + '><span>' + o[1] + '</span></label>';
      }).join('') + '</fieldset>';
  }
  function testSelect(scr, key, options, cur, labelHTML, labelCls) {
    var id = 'sel-' + key;
    var list = withUnsure(scr, options.map(function (o, i) { return [String(i), plainText(o)]; }), plainText(ST.unsure));
    return '<div class="t-select"><label class="' + (labelCls || 't-part-label') + '" for="' + id + '">' + labelHTML + '</label>' +
      '<select id="' + id + '" data-change="test-answer"' + testAttrs(scr, key, 't-' + key) + '>' +
      '<option value=""' + (cur == null ? ' selected' : '') + '>' + ST.selectPlaceholder + '</option>' +
      list.map(function (o) { return '<option value="' + o[0] + '"' + (cur != null && String(cur) === o[0] ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('') +
      '</select></div>';
  }
  function testPartHTML(scr, part, rec) {
    var cur = rec.answers[part.key];
    if (part.kind === 'mc') return testRadios(scr, part.key, part.options, cur, part.label);
    if (part.kind === 'select') return testSelect(scr, part.key, part.options, cur, part.label);
    if (part.kind === 'match') {
      return '<div class="t-match" role="group" aria-label="Match each symbol to its meaning">' + part.rows.map(function (r) {
        return testSelect(scr, r.key, part.options, rec.answers[r.key], '<span class="t-sym">' + r.symbol + '</span>', 't-sym-label');
      }).join('') + '</div>';
    }
    if (part.kind === 'num') {
      var id = 'num-' + part.key;
      var bad = ui.testErr === part.key;
      return '<div class="t-num-wrap">' + (part.label ? '<label class="t-part-label" for="' + id + '">' + part.label + '</label>' : '') +
        '<div class="t-num">' + (part.prefix ? '<label for="' + id + '">' + part.prefix + '</label>' : '') +
        '<input id="' + id + '" type="text" inputmode="decimal" autocomplete="off" spellcheck="false" placeholder="' + ST.numPlaceholder + '"' +
        (part.label ? '' : ' aria-label="Bulge height in meters"') +
        ' value="' + esc(cur == null ? '' : cur) + '" data-input="test-num" data-change="test-answer"' + testAttrs(scr, part.key, 't-' + part.key) +
        (bad ? ' aria-invalid="true" aria-describedby="err-' + part.key + '"' : '') + '><span>' + part.unit + '</span></div>' +
        (bad ? '<p class="note warn" id="err-' + part.key + '">Type a number, for example 4 or 2.5.</p>' : '') + '</div>';
    }
    return '';
  }

  // Parts the learner left empty, by key (a matching item counts each row).
  function testMissing(page, rec) {
    var out = [];
    page.parts.forEach(function (p) {
      (p.kind === 'match' ? p.rows : [p]).forEach(function (r) {
        var v = rec.answers[r.key];
        if (v == null || String(v).trim() === '') out.push(r.key);
      });
    });
    return out;
  }
  function numOk(v) { return /^\s*[-−]?\d[\d,]*(\.\d+)?\s*$|^\s*[-−]?\.\d+\s*$/.test(String(v)); }

  function consentHTML() {
    var K = ST.consent;
    var draft = K.draft && MODE.author ? '<p class="note warn author-note">Author note: the consent text is a draft in study-content.js. Replace it with the approved text before running learners.</p>' : '';
    var nosend = MODE.author && !(LOG && LOG.configured) ? '<p class="note author-note">Author note: no Supabase project is set in study-content.js, so nothing is sent. Answers stay in this browser.</p>' : '';
    if (study.consent && study.consent.choice === 'no') {
      return '<div class="screen-inner step-intro2 t-consent">' +
        '<section class="intro-card"><p class="intro-card-ic">' + I.info + '</p>' +
        '<h1 id="screen-heading" class="screen-title" tabindex="-1">' + K.declinedTitle + '</h1>' +
        '<p class="screen-lede">' + K.declinedBody + '</p></section>' +
        '<div class="screen-actions row">' + btn(K.declinedTry, 'consent-try', { kind: 'secondary', fk: 'consent-try' }) + '</div></div>';
    }
    var choice = ui.consentChoice || null;
    return '<div class="screen-inner t-consent">' + draft + nosend +
      '<p class="screen-eyebrow">' + K.eyebrow + '</p>' +
      '<h1 id="screen-heading" class="screen-title" tabindex="-1">' + K.title + '</h1>' +
      '<div class="t-consent-body">' + K.body.map(function (p) { return '<p>' + p + '</p>'; }).join('') + '</div>' +
      '<fieldset class="choices"><legend class="t-part-label">' + K.question + '</legend>' +
      [['yes', K.yes], ['no', K.no]].map(function (o) {
        return '<label class="choice"><input type="radio" name="consent" value="' + o[0] + '" data-change="consent-choice" data-fk="consent-' + o[0] + '"' +
          (choice === o[0] ? ' checked' : '') + '><span>' + o[1] + '</span></label>';
      }).join('') + '</fieldset>' +
      '<div class="screen-actions">' + btn(K.next, 'consent-continue', { fk: 'consent-continue', disabled: !choice }) + '</div></div>';
  }

  /* The two pages between the tests and the mission ("bridges"): a card over a film still with a
     check badge, the message, a few facts as chips and the learner's place in the study (quick
     check → mission → last check → your thoughts), then one button on. `next` is the index of
     the stop that comes next. */
  // The learner's place in the study. `next` is the stop that comes next (or the one on screen).
  // `arrive`: the stop before `next` has just been finished, so its dot fills, the line runs on
  // to the next stop and that stop lights up (see .t-journey.arrive in styles.css).
  function journeyHTML(next, compact, arrive) {
    return '<ol class="t-journey' + (compact ? ' compact' : '') + (arrive ? ' arrive' : '') + '" aria-label="Your progress through the study">' + ST.journey.map(function (label, i) {
      var st = i < next ? 'done' : i === next ? 'next' : 'later';
      return '<li class="' + st + (arrive && i === next - 1 ? ' just' : '') + '"><span class="t-dot" aria-hidden="true">' + (st === 'done' ? I.check : i + 1) + '</span>' +
        '<span class="t-stop">' + label + '</span><span class="sr-only">' + (st === 'done' ? ' (done)' : st === 'next' ? ' (now)' : '') + '</span></li>';
    }).join('') + '</ol>';
  }
  // Built from the mission's own parts so the hand-over is seamless: the step intro pages' card
  // and green icon, the start screen's fact line and film still, and the same primary button.
  function bridgeHTML(K, kind, next, action, scr) {
    var facts = K.facts && K.facts.length ? '<ul class="intro-facts">' + K.facts.map(function (x) {
      return '<li>' + (I[x.icon] || I.info) + '<span>' + x.text + '</span></li>';
    }).join('') + '</ul>' : '';
    return '<div class="screen-inner step-intro2 t-bridge t-bridge-' + kind + '">' +
      '<section class="intro-card"><p class="intro-card-ic">' + I.check + '</p>' +
      '<p class="screen-eyebrow">' + K.eyebrow + '</p>' +
      '<h1 id="screen-heading" class="screen-title" tabindex="-1">' + K.title + '</h1>' +
      '<p class="screen-lede">' + K.lede + '</p>' + facts + journeyHTML(next, false, true) + '</section>' +
      '<div class="screen-actions">' + btn(K.go, action, { fk: action }).replace('data-action', 'data-test="' + scr + '" data-action') + '</div></div>';
  }

  function testHTML(scr) {
    var cfg = testCfg(scr), t = testOf(scr);
    // Between the mission and the posttest: well done, what comes next, and one button on.
    if (cfg.transition && !t.transitionAt && !t.startedAt) return bridgeHTML(cfg.transition, 'post', 2, 'test-transition', scr);
    // Between the pretest and the mission: thanks, what comes next, and one button on.
    if (t.submittedAt && scr === 'pretest') return bridgeHTML(ST.pretest.thanks, 'pre', 1, 'test-proceed', scr);
    if (t.pos < 0) {
      return '<div class="screen-inner t-intro">' + journeyHTML(scr === 'pretest' ? 0 : 2, true) +
        '<p class="screen-eyebrow">' + cfg.eyebrow + '</p>' +
        '<h1 id="screen-heading" class="screen-title" tabindex="-1">' + cfg.title + '</h1>' +
        '<p class="screen-lede">' + cfg.lede + '</p>' +
        '<div class="t-directions"><p class="mini-label">How it works</p><p>' + testText(scr, 'directions') + '</p>' +
        '<p class="helper">' + cfg.items.length + ' questions · about ' + testText(scr, 'testMinutes') + ' minutes</p></div>' +
        '<div class="screen-actions">' + btn(cfg.start, 'test-start', { fk: 'test-start' }).replace('data-action', 'data-test="' + scr + '" data-action') + '</div></div>';
    }
    var page = testPage(scr);
    var rec = t.items[page.id];
    var n = t.pos + 1, N = cfg.items.length;
    var last = n === N;
    var fig = page.fig ? '<figure class="t-fig"><img src="' + page.fig.src + '" width="' + page.fig.w + '" height="' + page.fig.h + '" alt="' + esc(page.fig.alt) + '">' +
      (page.fig.caption ? '<figcaption>' + page.fig.caption + '</figcaption>' : '') + '</figure>' : '';
    var nudge = ui.testNudge === page.id ? '<p class="t-nudge" role="alert">' + I.info + '<span>' + testText(scr, 'unanswered') + '</span></p>' : '';
    return '<div class="screen-inner t-page" data-page="' + page.id + '">' +
      '<div class="t-top"><p class="screen-eyebrow">' + cfg.eyebrow + '</p>' +
      '<h1 id="screen-heading" class="t-count" tabindex="-1">Question ' + n + ' of ' + N + '</h1></div>' +
      '<div class="t-progress" aria-hidden="true"><span data-from="' + (Math.max(0, n - 2) / N * 100).toFixed(1) + '%" style="width:' + ((n - 1) / N * 100).toFixed(1) + '%"></span></div>' +
      fig + (page.table || '') +
      '<p class="t-stem">' + page.stem + '</p>' +
      (page.eq ? '<div class="t-eq-wrap">' + T_EQ[page.eq] + '</div>' : '') +
      // Given values, one per chip, so a number such as 0.00002 is not buried in a sentence.
      (page.values ? '<dl class="t-values">' + page.values.map(function (v) { return '<div><dt>' + v[0] + ' =</dt><dd>' + v[1] + '</dd></div>'; }).join('') + '</dl>' : '') +
      (page.after ? '<p class="t-stem">' + page.after + '</p>' : '') +
      page.parts.map(function (p) { return testPartHTML(scr, p, rec); }).join('') +
      nudge +
      '<div class="screen-actions">' + btn(last ? ST.finishTest : ST.next, 'test-next', { fk: 'test-next' }).replace('data-action', 'data-test="' + scr + '" data-action') + '</div></div>';
  }

  function surveyHTML() {
    var V2 = ST.survey;
    return '<div class="screen-inner t-survey">' + journeyHTML(3, true, true) +
      '<p class="screen-eyebrow">' + V2.eyebrow + '</p>' +
      '<h1 id="screen-heading" class="screen-title" tabindex="-1">' + V2.title + '</h1>' +
      '<p class="screen-lede">' + V2.lede + '</p>' +
      V2.questions.map(function (q, i) {
        var cur = study.survey.answers[q.key];
        return '<fieldset class="choices t-scale"><legend class="t-part-label"><span class="t-qn">' + (i + 1) + '.</span> ' + q.q + '</legend><div class="t-scale-row">' +
          q.options.map(function (o, j) {
            var v = j + 1;
            return '<label class="choice"><input type="radio" name="' + q.key + '" value="' + v + '" data-change="survey-answer" data-key="' + q.key + '" data-fk="s-' + q.key + '-' + v + '"' +
              (cur === v ? ' checked' : '') + '><span>' + o + '</span></label>';
          }).join('') + '</div></fieldset>';
      }).join('') +
      '<div class="screen-actions">' + btn(V2.submit, 'survey-submit', { fk: 'survey-submit' }) + '</div></div>';
  }

  SCREENS.consent = consentHTML;
  SCREENS.loadError = function () {
    return '<div class="screen-inner step-intro2"><section class="intro-card"><p class="intro-card-ic">' + I.info + '</p>' +
      '<h1 id="screen-heading" class="screen-title" tabindex="-1">The page didn’t load completely</h1>' +
      '<p class="screen-lede">Part of the mission is missing. Check your connection, then reload the page.</p></section>' +
      '<div class="screen-actions"><button type="button" class="btn btn-primary" data-fk="reload" onclick="location.reload()">Reload the page</button></div></div>';
  };
  SCREENS.pretest = function () { return testHTML('pretest'); };
  SCREENS.posttest = function () { return testHTML('posttest'); };
  SCREENS.survey = surveyHTML;

  // Every page the learner sees goes into the event log, so time on each page can be rebuilt.
  function pageKey(scr) {
    if (scr === 'pretest' || scr === 'posttest') {
      var p = testPage(scr), tt = testOf(scr);
      return scr + ':' + (p ? p.id : tt.submittedAt ? 'done' : testCfg(scr).transition && !tt.transitionAt && !tt.startedAt ? 'transition' : 'intro');
    }
    if (scr === 'stepIntro') return 'stepIntro:' + C.steps[state.pos.step].id;
    if (scr) return scr + (scr === 'intro' ? ':' + (ui.introPage === 2 ? 2 : 1) : '');
    return 'task:' + curId();
  }

  /* ---------------- the sky behind every task ---------------- */
  // Two layers of stars, each drawn once onto a canvas twice the height of the window (the same
  // field stacked twice, so a slow upward drift in CSS loops without a seam). Nothing is redrawn
  // per frame: the drift is a transform. The near layer has fewer, brighter stars and moves faster.
  function drawSky() {
    var box = document.getElementById('sky');
    if (!box) return;
    var W = window.innerWidth, H = window.innerHeight, dpr = Math.min(window.devicePixelRatio || 1, 2);
    var layers = [{ cls: 'sky-far', n: Math.round(W * H / 5200), max: 1.0, seed: 3 }, { cls: 'sky-near', n: Math.round(W * H / 21000), max: 1.6, seed: 19 }];
    box.innerHTML = '';
    layers.forEach(function (L) {
      var cv = document.createElement('canvas');
      cv.className = L.cls;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * 2 * dpr);
      var g = cv.getContext('2d');
      var seed = L.seed; function rnd() { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }
      for (var i = 0; i < L.n; i++) {
        var x = rnd() * W * dpr, y = rnd() * H * dpr, r = (0.35 + rnd() * L.max) * dpr * 0.6, t = rnd(), al = 0.25 + rnd() * 0.6;
        g.fillStyle = 'rgba(' + (t > 0.85 ? '255,232,200' : t < 0.2 ? '180,210,255' : '240,244,255') + ',' + al.toFixed(2) + ')';
        g.beginPath(); g.arc(x, y, r, 0, 6.3); g.fill();
        g.beginPath(); g.arc(x, y + H * dpr, r, 0, 6.3); g.fill();
      }
      box.appendChild(cv);
    });
  }
  drawSky();
  var skyTimer = 0;
  window.addEventListener('resize', function () { window.clearTimeout(skyTimer); skyTimer = window.setTimeout(drawSky, 250); });

  /* ---------------- mission complete: the jump to light speed ---------------- */
  // A starfield drawn on a canvas behind the card. Stars sit in a box in front of the viewer
  // (x, y across, z deep) and move toward it; each is drawn as a line from where it was a
  // moment ago to where it is now, so speed alone turns points into streaks. The jump runs
  // hold → accelerate → flash, then settles into a slow drift that keeps going.
  var WARP = { hold: 350, jump: 1650, flash: 450, drift: 0.018, top: 2.6 };
  var warp = { stars: null, canvas: null, raf: 0, t0: 0, last: 0, jumping: false };
  function warpStars(n) {
    var seed = 7; function rnd() { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }
    var list = [];
    for (var i = 0; i < n; i++) list.push({ x: rnd() * 2 - 1, y: rnd() * 2 - 1, z: 0.08 + rnd() * 0.92, w: 0.5 + rnd(), tint: rnd() });
    return list;
  }
  function warpSync() {
    var cv = els.screen.querySelector('canvas.warp');
    if (!cv) return;
    if (!warp.stars) warp.stars = warpStars(900);
    var fresh = cv !== warp.canvas;
    warp.canvas = cv;
    // A jump starts only on arrival (ui.warpJump), never because the page was redrawn.
    if (ui.warpJump && !warp.jumping && !reduced()) { warp.jumping = true; warp.t0 = performance.now(); }
    if (reduced()) { ui.warpJump = false; warp.jumping = false; warpFrame(performance.now(), true); return; }
    if (fresh || !warp.raf) {
      window.cancelAnimationFrame(warp.raf);
      warp.last = performance.now();
      warp.raf = window.requestAnimationFrame(warpLoop);
    }
  }
  function warpLoop(t) {
    if (!warp.canvas || !document.contains(warp.canvas)) { warp.raf = 0; warp.canvas = null; return; }
    warpFrame(t, false);
    warp.raf = window.requestAnimationFrame(warpLoop);
  }
  function warpFrame(t, still) {
    var cv = warp.canvas, box = cv.getBoundingClientRect();
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var W = Math.max(1, Math.round(box.width * dpr)), H = Math.max(1, Math.round(box.height * dpr));
    if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
    var g = cv.getContext('2d');
    g.clearRect(0, 0, W, H);
    var dt = still ? 0 : Math.min(0.05, (t - warp.last) / 1000);
    warp.last = t;
    // Speed (depths per second) and how far back each streak reaches, by stage of the jump.
    var v = WARP.drift, trail = 0, flash = 0;
    if (warp.jumping) {
      var e = t - warp.t0;
      if (e < WARP.hold) { v = WARP.drift; }
      else if (e < WARP.jump) {
        var k = (e - WARP.hold) / (WARP.jump - WARP.hold);
        v = WARP.drift + (WARP.top - WARP.drift) * k * k * k;
        trail = 0.02 + 0.12 * k;
      } else if (e < WARP.jump + WARP.flash) {
        var q = (e - WARP.jump) / WARP.flash;
        flash = 1 - q;
        v = WARP.drift + (WARP.top - WARP.drift) * Math.pow(1 - q, 3);
        trail = 0.14 * (1 - q);
      } else { warp.jumping = false; ui.warpJump = false; }
    }
    var cx = W / 2, cy = H / 2, R = Math.max(W, H) * 0.5;
    g.lineCap = 'round';
    for (var i = 0; i < warp.stars.length; i++) {
      var s = warp.stars[i];
      s.z -= v * dt;
      if (s.z <= 0.02) { s.z += 1; }
      var x = cx + s.x / s.z * R, y = cy + s.y / s.z * R;
      if (x < -50 || x > W + 50 || y < -50 || y > H + 50) { if (!still && v > WARP.drift * 2) continue; }
      var near = 1 - s.z, zb = s.z + Math.max(trail * v, 0.0008);
      var xb = cx + s.x / zb * R, yb = cy + s.y / zb * R;
      g.strokeStyle = 'rgba(' + (s.tint > 0.8 ? '255,236,200' : s.tint < 0.25 ? '170,205,255' : '235,242,255') + ',' + (0.45 + 0.55 * near).toFixed(2) + ')';
      g.lineWidth = (0.8 + 1.5 * near * s.w) * dpr;
      g.beginPath(); g.moveTo(xb, yb); g.lineTo(x, y); g.stroke();
    }
    if (flash > 0) { g.fillStyle = 'rgba(225,238,255,' + (0.8 * flash * flash).toFixed(3) + ')'; g.fillRect(0, 0, W, H); }
  }

  // What sits behind a full-page screen. Two screens with the same backdrop follow each other
  // without a fade (the thank-you page and the start screen share one film still).
  function screenBackdrop(scr) {
    if (scr === 'intro') return 'start';
    if (scr === 'pretest' || scr === 'posttest') {
      var k = pageKey(scr);
      return /:done$/.test(k) ? 'start' : /:transition$/.test(k) ? 'return' : 'sky';
    }
    if (scr === 'stepIntro') {
      var id = C.steps[state.pos.step].id;
      return id === 'return' ? 'return' : id === 'lab' || id === 'landing' ? 'lab' : 'preflight';
    }
    return scr === 'complete' || scr === 'landingCall' ? scr : 'sky';
  }

  function renderScreen(scr, opts, prevKey) {
    if (scr === 'stepIntro') {
      var sid = C.steps[state.pos.step].id;
      if (!state.stepIntros[sid]) { state.stepIntros[sid] = { shownAt: nowISO(), startedAt: null }; save(); }
    }
    if (STUDY_SCREENS[scr]) prepareStudyPage(scr);
    renderTopbar();
    // The page as the learner sees it: the same page drawn again (a choice made, a reminder
    // shown) must not replay its entrance, and a new page plays it once.
    var motionKey = pageKey(scr) + (scr === 'consent' && study && study.consent && study.consent.choice === 'no' ? ':declined' : '');
    var samePage = motionKey === ui.motionKey;
    ui.motionKey = motionKey;
    patch(els.screen, SCREENS[scr]());
    var inner = els.screen.querySelector('.screen-inner');
    if (inner) inner.classList.toggle('still', samePage);
    var backdrop = screenBackdrop(scr);
    if (ui.backdrop && ui.backdrop !== backdrop) replayClass(els.screen, 'screen-fade', 700);
    ui.backdrop = backdrop;
    // A new question: the progress bar grows from the last question's mark.
    var bar = els.screen.querySelector('.t-progress span[data-from]');
    if (bar && !samePage && !reduced()) {
      var to = bar.style.width;
      bar.style.transition = 'none'; bar.style.width = bar.getAttribute('data-from');
      void bar.offsetWidth;
      bar.style.transition = ''; bar.style.width = to;
    }
    if (scr === 'complete') { warpSync(); if (document.getElementById('save-line')) watchSave(); }
    if (opts.scrollTop) window.scrollTo(0, 0);
    var target = null;
    if (opts.focusHead) target = document.getElementById('screen-heading');
    else if (opts.focus) target = els.screen.querySelector(opts.focus) || document.querySelector(opts.focus);
    else if (prevKey && !els.screen.contains(document.activeElement)) target = els.screen.querySelector('[data-fk="' + prevKey + '"]');
    if (target && !target.disabled) target.focus({ preventScroll: !opts.focusHead });
  }

  function render(opts) {
    opts = opts || {};
    if (symTip && symTip.target) hideSymTip(); // the page is about to be redrawn
    var active = document.activeElement;
    var prevKey = active && active.getAttribute ? active.getAttribute('data-fk') : null;
    var scr = currentScreen();
    document.body.setAttribute('data-screen', scr || 'none');
    document.body.setAttribute('data-step', C.steps[state.pos.step].id);
    // The browser tab says where the learner is.
    document.title = (scr === 'intro' ? '' : scr === 'complete' ? C.complete.title.replace(/!$/, '') + ' · ' :
      scr === 'loadError' ? '' : STUDY_SCREENS[scr] ? (scr === 'consent' ? ST.consent.eyebrow : scr === 'survey' ? ST.survey.title :
        /:done$/.test(pageKey(scr)) ? ST.pretest.thanks.title : /:transition$/.test(pageKey(scr)) ? testCfg(scr).transition.eyebrow : testCfg(scr).title) + ' · ' :
      C.steps[state.pos.step].label + ' · ') + C.intro.title;
    els.app.hidden = !!scr;
    els.screen.hidden = !scr;
    if (scr) {
      ui.nav = null; renderScreen(scr, opts, prevKey); runEnters(); scheduleNudge();
      if (LOG && logAllowed()) LOG.page(pageKey(scr));
      return;
    }
    if (LOG && logAllowed()) LOG.page(pageKey(null));
    if (els.screen.__html) { els.screen.innerHTML = ''; els.screen.__html = null; }
    ui.motionKey = null; ui.backdrop = 'task';
    var id = curId();
    var a = act(id);
    ui.eq = null;
    var view = VIEWS[typeOf(id)](id, a);
    var animating = ui.animate;
    ui.animate = null;

    document.body.setAttribute('data-step', C.steps[state.pos.step].id);
    renderTopbar();
    patch(els.stage, view.stage + (/planet-svg/.test(view.stage) ? STAGE_FOOT : ''));
    patch(els.head, view.head);
    patch(els.body, view.body);
    // A view can hold the formula back (the briefing does, until its question section).
    els.formula.hidden = view.formula === false;
    patch(els.formula, view.formula === false ? '' : formulaHTML(ui.eq && ui.eq.hl, ui.eq && ui.eq.note, ui.eq && ui.eq.defs));
    els.stageScroll.style.setProperty('--formula-h', els.formula.offsetHeight + 'px');
    if (view.after) view.after(animating);
    // A view that names its stage (phaseKey) gets a small transition when that stage changes
    // without leaving the task: the panel's new content rises in, top to bottom.
    var pk = view.phaseKey != null ? id + '|' + view.phaseKey : null;
    if (ui.nav) {
      // Forward slides in from the right, back from the left; the diagram cross-fades.
      // The classes stay long enough for staggered children to finish.
      var slide = ui.nav === 'fade' ? 'nav-fade' : ui.nav === 'back' ? 'nav-back' : 'nav-fwd';
      replayClass(els.head, slide, 700);
      replayClass(els.body, slide, 700);
      replayClass(els.stage, 'nav-fade', 1100);
      ui.nav = null;
    } else if (pk && ui.phaseKey && ui.phaseKey !== pk && ui.phaseKey.indexOf(id + '|') === 0) {
      replayClass(els.head, 'phase-in', 700);
      replayClass(els.body, 'phase-in', 700);
      if (view.phaseStage) replayClass(els.stage, 'nav-fade', 1100);
    }
    ui.phaseKey = pk;
    runEnters();
    scheduleNudge();
    if (ui.flyEv) { ui.flyEv = false; flyToLog(); }

    if (opts.scrollTop) {
      window.scrollTo(0, 0);
      els.body.scrollTop = 0;
      els.stageScroll.scrollTop = 0;
    }
    var target = null;
    if (opts.focusHead) target = document.getElementById('task-heading');
    else if (opts.focus) target = document.querySelector(opts.focus);
    else if (prevKey && (!document.activeElement || document.activeElement === document.body || !document.contains(active))) {
      target = document.querySelector('[data-fk="' + prevKey + '"]');
    }
    if (target && !target.disabled) target.focus({ preventScroll: !opts.focusHead });
    save();
  }

  /* A finding that has just been earned travels from its card in the task panel up to the
     evidence log button, which bumps as it lands: the log is where findings go. With reduced
     motion, or if there is no card on screen, the button simply bumps. */
  function flyToLog() {
    var btnEl = document.getElementById('evidence-btn');
    var card = els.body.querySelector('.ev-added:not(.ev-pending) .ev-entry');
    if (!card || !btnEl || reduced() || !card.animate || btnEl.offsetParent === null) { replayClass(btnEl, 'bump', 700); return; }
    var a = card.getBoundingClientRect(), b = btnEl.getBoundingClientRect();
    var dot = document.createElement('span');
    dot.className = 'ev-fly';
    dot.setAttribute('aria-hidden', 'true');
    dot.innerHTML = I.check;
    dot.style.left = (a.left + 12) + 'px';
    dot.style.top = (a.top + a.height / 2 - 14) + 'px';
    document.body.appendChild(dot);
    var dx = b.left + b.width / 2 - (a.left + 26), dy = b.top + b.height / 2 - (a.top + a.height / 2);
    var anim = dot.animate([
      { transform: 'translate(0, 0) scale(.6)', opacity: 0 },
      { transform: 'translate(0, 0) scale(1)', opacity: 1, offset: 0.15 },
      { transform: 'translate(' + dx.toFixed(0) + 'px,' + dy.toFixed(0) + 'px) scale(.55)', opacity: 0.9 }
    ], { duration: 850, delay: 650, easing: 'cubic-bezier(.5, 0, .2, 1)', fill: 'both' });
    anim.onfinish = function () {
      if (dot.parentNode) dot.parentNode.removeChild(dot);
      replayClass(document.getElementById('evidence-btn'), 'bump', 700);
    };
  }

  /* ---------------- evidence dialog ---------------- */
  function renderDialog() {
    els.dialogBody.innerHTML =
      '<div class="dialog-head"><div><p class="mini-label file-kicker">' + I.radio + '<span>Mission file</span></p><h2 id="evidence-title">Evidence log</h2>' +
      '<p class="file-count">' + state.evidence.length + ' of ' + C.evidence.length + ' findings</p></div>' +
      '<button type="button" class="icon-btn" data-action="close-evidence" aria-label="Close evidence log">' + I.close + '</button></div>' +
      '<p class="note">Relationships you’ve found fill in as you complete investigations.</p>' +
      evidenceListHTML() +
      researchHTML('d-export') +
      '<div class="row">' + btn('Reset progress', 'reset-ask', { kind: 'ghost', fk: 'd-reset' }) + '</div>' +
      (ui.confirmReset ? confirmResetHTML() : '');
  }

  /* ===================================================================== *
   * Session record export
   * ===================================================================== */
  function buildRecord() {
    tick();
    var acts = {};
    C.steps.forEach(function (s) {
      s.activities.forEach(function (id) {
        var a = state.activities[id];
        if (!a) return;
        acts[id] = {
          id: id,
          label: a.label,
          startedAt: a.startedAt,
          completedAt: a.completedAt,
          activeMs: a.activeMs || 0,
          currentPhase: a.phase,
          completion: a.completion,
          firstCompletion: a.firstCompletion,
          workedSolutionViewedAt: a.workedSolutionViewedAt,
          landingCall: a.landingCall,
          hintsViewed: a.hints.slice(),
          firstAttempt: a.attempts[0] ? cleanAttempt(a.attempts[0]) : null,
          retries: a.attempts.slice(1).map(cleanAttempt)
        };
      });
    });
    return {
      schema: C.recordSchema,
      exportedAt: nowISO(),
      moduleId: C.moduleId,
      moduleVersion: C.moduleVersion,
      sessionId: state.sessionId,
      participantId: study ? study.participantId : null,
      condition: state.condition,
      conditionLabel: AB.conditions[state.condition].label,
      assignment: state.assignment || null,
      createdAt: state.createdAt,
      updatedAt: state.updatedAt,
      completedAt: state.completedAt,
      elapsed: {
        wallClockMs: Date.now() - Date.parse(state.createdAt),
        activeVisibleMs: state.activeMs
      },
      firstIdea: state.firstIdea,
      reflection: state.reflection || null,
      goDeeperOpenedAt: state.goDeeperOpenedAt || null,
      video: state.video,
      evidence: state.evidence.slice(),
      summary: summary(),
      devMode: state.devMode || null,
      stepIntros: state.stepIntros,
      activities: acts,
      study: study ? JSON.parse(JSON.stringify(study)) : null,
      note: (LOG && LOG.configured && logAllowed() ? 'Also sent to the study database (Supabase) at milestones. ' :
        'Stored only in this browser (localStorage). Not sent anywhere. ') +
        'Free-text reasons are recorded but not auto-scored. Completion after hints, retries or a worked solution is not independent mastery.'
    };
  }

  function cleanAttempt(at) {
    var o = {};
    Object.keys(at).forEach(function (k) { if (k !== 'playedUpdate') o[k] = at[k]; });
    return o;
  }

  function exportRecord() {
    var rec = buildRecord();
    var blob = new Blob([JSON.stringify(rec, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var link = document.createElement('a');
    link.href = url;
    link.download = 'tidal-forecast-session-' + state.condition.toUpperCase() + '-' + state.sessionId.slice(0, 8) + '.json';
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
    announce('Session record exported as a JSON file.');
  }

  function resetAll() {
    logSnapshot('reset');
    destroyPlayers();
    try { window.localStorage.removeItem(STORE_KEY); } catch (_) { /* ignore */ }
    state = freshState();
    if (DEV.on) noteDevUse();
    logContext();
    logEvent('reset', {});
    ui.hint = null; ui.video = 'idle'; ui.endVideo = 'idle'; ui.confirmReset = false; ui.animate = null; ui.screen = null;
    ui.enterSeen = {}; ui.lastEv = null; ui.nav = null;
    if (els.dialog.open) els.dialog.close();
    [els.stage, els.head, els.body, els.checkpoints, els.screen, els.formula].forEach(function (el) { el.__html = null; });
    render({ focusHead: true, scrollTop: true });
    announce('Progress cleared. The mission has restarted.');
  }

  /* ===================================================================== *
   * Actions (event delegation)
   * ===================================================================== */
  var actions = {
    'rail-toggle': function () { ui.railOpen = !ui.railOpen; renderTopbar(); },
    'goto-step': function (el) {
      var i = +el.getAttribute('data-step');
      ui.railOpen = false;
      if (i > state.furthest.step) {
        if (!DEV.on) return;
        devJump(i + ':0');
        return;
      }
      var sub = i === state.furthest.step ? state.furthest.sub : 0;
      goTo(i, sub);
    },
    'goto-sub': function (el) {
      var j = +el.getAttribute('data-sub');
      if (DEV.on && cmpPos({ step: state.pos.step, sub: j }, state.furthest) > 0) { devJump(state.pos.step + ':' + j); return; }
      goTo(state.pos.step, j);
    },
    'dev-toggle': function () {
      DEV.on = !DEV.on;
      try { window.sessionStorage.setItem(DEV_KEY, DEV.on ? '1' : '0'); } catch (_) { /* ignore */ }
      if (DEV.on) noteDevUse();
      logContext();
      if (DEV.on) logOn(); else if (LOG && !logAllowed()) LOG.enable(false, true);
      if (!DEV.on && ui.screen === 'intro' && !introPending()) ui.screen = null;
      if (!DEV.on && STUDY_SCREENS[ui.screen]) ui.screen = null;
      save();
      render({ focus: DEV.on ? '#dev-jump' : '#dev-btn' });
      announce(DEV.on ? 'Developer mode on. All sections are unlocked.' : 'Developer mode off.');
    },
    'dev-jump': function () {
      var sel = document.getElementById('dev-jump');
      if (sel) devJump(sel.value);
    },
    // Moving on without a correct answer still files the model's finding, so the log is complete
    // for the crew briefing; it just isn't shown as earned beside a "Not yet".
    'continue': function () { var id = curId(); addEvidence(evidenceFor(id), id); completeActivity(id); advance(); },

    /* hints */
    'hint-toggle': function () {
      var id = curId();
      if (ui.hint && ui.hint.act === id) { ui.hint = null; render({ focus: '[data-fk="hint-btn"]' }); return; }
      coachSeen(coachKey(id)); // they have found the hints
      var at = attempt(act(id));
      ui.hintOpens++;
      revealHint(id, Math.max(1, at.hintLevel));
      render({ focus: '#hint-title' });
      announce('Hint ' + ui.hint.level + ' shown.');
    },
    'hint-next': function () {
      var id = curId();
      revealHint(id, ui.hint.level + 1);
      render({ focus: '#hint-title' });
      announce('Hint ' + ui.hint.level + ' shown.');
    },
    'hint-prev': function () {
      ui.hint.level = Math.max(1, ui.hint.level - 1);
      render({ focus: '#hint-title' });
    },
    'hint-close': function () { ui.hint = null; render({ focus: '[data-fk="hint-btn"]' }); },
    'coach-dismiss': function (el) { coachSeen(el.getAttribute('data-coach')); render({ focus: '[data-fk="hint-btn"]' }); },

    /* briefing */
    'video-play': function () { startOpeningVideo(); },
    'video-retry': function () { startOpeningVideo(); },
    'video-skip': function () {
      destroyPlayers();
      state.video.opening.skippedAt = nowISO();
      ui.video = 'idle';
      ui.briefIdea = true;
      render({ focusHead: true });
      announce('Video skipped. Log your first idea.');
    },
    'video-summary': function () { state.video.opening.skippedAt = state.video.opening.skippedAt || nowISO(); showVideoFallback('chosen'); },
    'video-continue': function () { ui.briefIdea = true; render({ focusHead: true }); },
    'brief-next': function () { if (!openingSeen()) return; ui.briefIdea = true; render({ focusHead: true }); },
    'log-idea': function () {
      var a = act('briefing');
      if (!canSubmit('briefing', a)) return;
      var text = a.draft.notSure ? '' : (a.draft.text || '').trim();
      state.firstIdea = { text: text, notSure: !!a.draft.notSure, loggedAt: nowISO() };
      completeActivity('briefing');
      advance();
    },

    /* console */
    'select-target': function (el) {
      var id = curId();
      var a = act(id);
      if (a.phase === 'wrong') startAttempt(a);
      if (a.phase !== 'awaiting') return;
      a.draft.selected = el.getAttribute('data-target');
      render({ focus: '[data-fk="tgt-' + a.draft.selected + '"]' });
      announce('Selected: ' + C.targets[a.draft.selected].name + '. Press Check selection when ready.');
    },
    'console-check': function () {
      var id = curId();
      var a = act(id);
      var at = attempt(a);
      if (!a.draft.selected) return;
      var ok = a.draft.selected === C.consoleTasks[id].target;
      at.selection = a.draft.selected;
      at.submittedAt = nowISO();
      at.outcome = { selected: a.draft.selected, overall: ok ? 'correct' : 'not-yet' };
      a.phase = ok ? 'correct' : 'wrong';
      ui.hint = null;
      render({ focusHead: true });
      announce(ok ? 'Correct.' : 'Not this one. ' + C.targets[a.draft.selected].info);
    },
    'console-retry': function () {
      var a = act(curId());
      startAttempt(a);
      render({ focusHead: true });
    },

    /* experiments + crew prediction */
    'pred-up': function () { var a = act(curId()); var v = a.draft.prediction; setPrediction(v == null ? BASE + 0.5 : Math.min(GMAX, snap(v) + 0.5)); save(); },
    'pred-down': function () { var a = act(curId()); var v = a.draft.prediction; setPrediction(v == null ? BASE - 0.5 : Math.max(0, snap(v) - 0.5)); save(); },
    'run-exp': function () {
      var id = curId();
      var a = act(id);
      if (a.phase !== 'awaiting' || !canSubmit(id, a)) return;
      var at = attempt(a);
      var res = experimentResult(id, at);
      at.prediction = a.draft.prediction;
      at.predictedAt = nowISO();
      at.predictionOutcome = M.classifyPrediction(at.prediction, res.h, BASE);
      at.ranAt = nowISO();
      at.result = res.h;
      a.phase = 'result';
      ui.animate = id;
      ui.hint = null;
      render({ focusHead: true });
      announce('Test result: ' + f(res.h) + ' meters. You predicted ' + f(at.prediction) + ' meters.');
    },
    // Tide Lab: play the "what changed" cue again. Only the changed input moves.
    'cue-replay': function () {
      var id = curId(), a = act(id), cfg = C.experiments[id];
      if (!cfg || !PLANET_LAST.px) return;
      var from = {}, to = {};
      from[cfg.key] = 1; to[cfg.key] = PLANET_LAST.px[cfg.key];
      var over = { h: PT.px && PT.px.h != null ? PT.px.h : PLANET_LAST.px.h };
      if (a.phase === 'awaiting') over.hTag = a.draft.prediction != null ? 'you' : null;
      planetTween('px', from, to, 1200, { over: over, emph: cfg.key });
      announce(C.inputs[cfg.key].label + ' changes ' + times(to[cfg.key]) + '. The bulge is not shown changing.');
    },
    'to-explain': function () { act(curId()).phase = 'explain'; ui.hint = null; render({ focusHead: true }); },
    'submit-explain': function () {
      var id = curId();
      var a = act(id);
      var at = attempt(a);
      if (!a.draft.choice) return;
      at.explanation = a.draft.choice;
      at.explainedAt = nowISO();
      at.submittedAt = at.explainedAt;
      at.outcome = experimentOutcome(C.experiments[id], at);
      a.phase = 'feedback';
      if (at.outcome.overall === 'correct') addEvidence(evidenceFor(id), id);
      ui.hint = null;
      render({ focusHead: true });
      announce(experimentFeedback(id, at).title);
    },
    'fresh-attempt': function () {
      var a = act(curId());
      startAttempt(a);
      ui.hint = null;
      render({ focusHead: true });
      announce('Fresh attempt with new values. Your earlier answers are kept.');
    },
    'worked': function () {
      var id = curId();
      var a = act(id);
      a.workedSolutionViewedAt = nowISO();
      a.phase = 'worked';
      addEvidence(evidenceFor(id), id);
      ui.hint = null;
      render({ focusHead: true });
    },

    /* sensor */
    'sensor-replay': function () { ui.animate = 'sensor'; els.stage.__html = null; render(); },
    'sensor-submit': function () {
      var a = act('sensor');
      if (!canSubmit('sensor', a)) return;
      var at = attempt(a);
      at.choice = a.draft.choice;
      at.quantity = a.draft.quantity;
      at.submittedAt = nowISO();
      at.outcome = sensorOutcome(at);
      a.phase = 'feedback';
      if (at.outcome.overall === 'correct') addEvidence(evidenceFor('sensor'), 'sensor');
      ui.hint = null;
      render({ focusHead: true });
      announce(at.outcome.overall === 'correct' ? 'Correct — the bulge stays at 4 meters.' : 'The bulge stays at 4 meters. See the feedback.');
    },

    /* quick checks */
    'mixed-submit': function () {
      var id = curId();
      var a = act(id);
      if (!canSubmit(id, a)) return;
      var at = attempt(a);
      at.mapping = { dg: a.draft.map.dg, gp: a.draft.map.gp, R: a.draft.map.R };
      at.prediction = parseFloat(a.draft.pred);
      at.submittedAt = nowISO();
      at.outcome = mixedOutcome(at);
      at.result = at.outcome.prediction.model;
      a.phase = 'feedback';
      ui.animate = id;
      ui.hint = null;
      render({ focusHead: true });
      announce('Model result: ' + f(at.result) + ' meters. You predicted ' + f(at.prediction) + ' meters.');
    },

    /* planets */
    'planets-submit': function () {
      var a = act('planets');
      if (!canSubmit('planets', a)) return;
      var at = attempt(a);
      var set = planetHeights(at.variant);
      var minH = Math.min.apply(null, set.map(function (p) { return p.h; }));
      var smallestId = set.filter(function (p) { return p.h === minH; })[0].id;
      var est = {};
      var wrong = 0;
      set.forEach(function (p) {
        var g = a.draft.estimates[p.id];
        var ok = Math.abs(g - p.ratio) < 1e-6;
        if (!ok) wrong++;
        est[p.id] = { given: g, model: p.ratio, correct: ok };
      });
      var reason = C.planets.reasons.filter(function (r) { return r.id === a.draft.reason; })[0];
      at.estimates = {};
      set.forEach(function (p) { at.estimates[p.id] = a.draft.estimates[p.id]; });
      at.smallest = a.draft.smallest;
      at.reason = a.draft.reason;
      at.submittedAt = nowISO();
      var smallestOk = a.draft.smallest === smallestId;
      var reasonOk = !!(reason && reason.correct);
      at.outcome = {
        estimates: est,
        wrongEstimates: wrong,
        smallest: { given: a.draft.smallest, model: smallestId, correct: smallestOk },
        reason: { given: a.draft.reason, correct: reasonOk },
        overall: (smallestOk && reasonOk && wrong === 0) ? 'correct' : (smallestOk || reasonOk || wrong <= 1) ? 'partly' : 'not-yet'
      };
      a.phase = 'feedback';
      if (at.outcome.overall === 'correct') addEvidence(evidenceFor('planets'), 'planets');
      ui.animate = 'planets';
      ui.hint = null;
      render({ focusHead: true });
      announce('Results revealed. Planet ' + smallestId + ' has the smallest modeled bulge.');
    },

    /* film ending */
    'ending-play': function () { startEndingVideo(); },
    'ending-skip': function () {
      destroyPlayers();
      state.video.ending.skippedAt = state.video.ending.skippedAt || nowISO();
      ui.endVideo = 'idle';
      render({ focus: '[data-fk="primary"]' });
      announce('Video skipped. Continue to the debrief.');
    },
    'ending-summary': function () { showEndingFallback('chosen'); },

    /* crew */
    'crew1-submit': function () {
      var a = act('crew-combined');
      if (!canSubmit('crew-combined', a)) return;
      var at = attempt(a);
      var h = M.modelHeight({ dg: at.variant.dg, gp: at.variant.gp }, BASE);
      at.prediction = a.draft.prediction;
      at.reason = a.draft.reason.trim();
      at.result = h;
      at.submittedAt = nowISO();
      var po = M.classifyPrediction(at.prediction, h, BASE);
      at.outcome = { prediction: po, reasonScored: false, overall: po === 'correct' ? 'correct' : po };
      a.phase = 'feedback';
      ui.animate = 'crew-combined';
      ui.hint = null;
      render({ focusHead: true });
      announce('Model result: ' + f(h) + ' meters. You predicted ' + f(at.prediction) + ' meters.');
    },


    /* new design: rank, decode, calc, landing, reflection, summary */
    'rank-move': function (el) {
      var order = rankOrder(act(curId())).slice();
      var pid = el.getAttribute('data-id'), dir = +el.getAttribute('data-dir');
      var i = order.indexOf(pid), j = i + dir;
      if (j < 0 || j >= order.length) return;
      order[i] = order[j]; order[j] = pid;
      // Focus stays on the same arrow; at either end of the list that arrow is disabled, so it
      // moves to the card's other arrow.
      var same = '[data-fk="rk-' + (dir < 0 ? 'up' : 'dn') + '-' + pid + '"]';
      var other = '[data-fk="rk-' + (dir < 0 ? 'dn' : 'up') + '-' + pid + '"]';
      setRankOrder(order, (j === 0 && dir < 0) || (j === order.length - 1 && dir > 0) ? other : same, pid);
    },
    'rank-check': function () {
      var id = curId(); var a = act(id);
      if (!canSubmit(id, a)) return;
      var at = attempt(a);
      var ok = rankOrder(a).join() === C.tideRank.correctOrder.join();
      at.order = rankOrder(a).slice(); at.submittedAt = nowISO();
      at.outcome = { overall: ok ? 'correct' : 'not-yet' };
      a.phase = 'feedback'; ui.hint = null;
      render({ focusHead: true });
    },
    'decode-check': function () {
      var id = curId(); var a = act(id);
      if (!canSubmit(id, a)) return;
      var at = attempt(a);
      var rows = {}, all = true;
      C.decode.summary.rows.forEach(function (r) {
        var b = a.draft.blanks[r.key] || {}; rows[r.key] = {};
        ['change', 'size', 'prop'].forEach(function (slot) { var ok = b[slot] === r.answers[slot]; rows[r.key][slot] = ok; if (!ok) all = false; });
      });
      at.blanks = JSON.parse(JSON.stringify(a.draft.blanks)); at.submittedAt = nowISO();
      at.outcome = { rows: rows, overall: all ? 'correct' : 'not-yet' };
      a.phase = 'feedback'; ui.hint = null;
      render({ focusHead: true });
    },
    'decode-retry': function () {
      var a = act(curId()); var keep = a.draft.blanks;
      startAttempt(a); a.draft.blanks = keep;
      render({ focusHead: true });
    },
    'calc-check': function () {
      var id = curId(); var a = act(id);
      if (!canSubmit(id, a)) return;
      var cs = calcState(id, a);
      var at = attempt(a);
      var solveOk = approxEq(numParse(cs.v[cs.cfg.solve.key]), cs.cfg.solve.value);
      at.values = JSON.parse(JSON.stringify(cs.v)); at.submittedAt = nowISO();
      // Constants are shown rather than typed; they are still part of the record.
      cs.cfg.known.forEach(function (k) { if (k.fixed) at.values[k.key] = String(k.value); });
      at.outcome = { known: cs.known.map(function (x) { return { key: x.k.key, correct: x.ok }; }), solve: solveOk,
        overall: solveOk && cs.allKnown ? 'correct' : solveOk || cs.allKnown ? 'partly' : 'not-yet' };
      a.phase = 'feedback'; ui.hint = null;
      if (at.outcome.overall === 'correct') addEvidence(evidenceFor(id), id);
      render({ focusHead: true });
    },
    'calc-retry': function () {
      var a = act(curId()); var keep = a.draft.vals;
      startAttempt(a); a.draft.vals = keep;
      render({ focusHead: true });
    },
    'landing-send': function () {
      var id = curId(); var a = act(id);
      if (!canSubmit(id, a)) return;
      var at = attempt(a);
      var opt = C.landing.options.filter(function (o) { return o.id === a.draft.choice; })[0];
      at.choice = a.draft.choice; at.report = a.draft.report.trim(); at.submittedAt = nowISO();
      at.outcome = { overall: opt && opt.correct ? 'correct' : 'not-yet' };
      a.phase = 'feedback'; ui.hint = null;
      render({ focusHead: true });
    },
    'landing-retry': function () {
      var a = act(curId()); var rep = a.draft.report;
      startAttempt(a); a.draft.report = rep;
      render({ focusHead: true });
    },
    'reflect-continue': function () {
      var id = curId(); var a = act(id);
      if (!canSubmit(id, a)) return;
      state.reflection = { text: a.draft.text.trim(), at: nowISO() };
      completeActivity(id);
      advance();
    },
    'deeper-open': function () { ui.deeper = true; state.goDeeperOpenedAt = state.goDeeperOpenedAt || nowISO(); render({ focusHead: true, scrollTop: true }); },
    'deeper-close': function () { ui.deeper = false; render({ focusHead: true, scrollTop: true }); },

    /* debrief & session */
    'finish': function () {
      completeActivity(curId());
      state.completedAt = nowISO();
      logEvent('finish', {});
      logSnapshot('finish');
      // With the study on, the posttest and the survey come before the mission-complete screen
      // (in developer mode too, so a walk-through sees the real ending).
      ui.screen = afterMissionScreen();
      ui.warpJump = true;
      save();
      render({ focusHead: true, scrollTop: true });
      announce(ui.screen === 'complete' ? 'Mission complete.' : 'Mission finished. A few final questions.');
    },
    'intro-next': function () {
      ui.introRevealed = C.steps[state.pos.step].id;
      render({ focusHead: true });
    },
    'start-step': function () {
      var sid = C.steps[state.pos.step].id;
      ui.introRevealed = null;
      var rec = state.stepIntros[sid] || { shownAt: nowISO() };
      if (!rec.startedAt) rec.startedAt = nowISO();
      state.stepIntros[sid] = rec;
      ui.screen = null;
      ui.nav = 'fade';
      save();
      render({ focusHead: true, scrollTop: true });
    },
    'to-call': function () {
      var a = act('crew-combined');
      a.callFrom = a.phase;
      a.phase = 'call';
      ui.hint = null;
      save();
      render({ focusHead: true, scrollTop: true });
    },
    'call-back': function () {
      var a = act('crew-combined');
      a.phase = a.callFrom || 'feedback';
      ui.nav = 'back';
      save();
      render({ focusHead: true, scrollTop: true });
    },
    'call-continue': function () {
      var a = act('crew-combined');
      if (!a.landingCall) return;
      a.phase = a.callFrom || 'feedback';
      completeActivity('crew-combined');
      advance();
    },
    'intro-continue': function () {
      ui.introPage = 2;
      render({ focusHead: true, scrollTop: true });
    },
    'intro-back': function () {
      ui.introPage = 1;
      ui.nav = 'back';
      render({ focusHead: true, scrollTop: true });
    },
    'start-mission': function () {
      ui.introPage = 1;
      ui.screen = null;
      ui.nav = 'fade';
      state.introSeenAt = nowISO();
      save();
      render({ focusHead: true, scrollTop: true });
      openChannel();
    },
    'show-complete': function () {
      ui.screen = afterMissionScreen();
      ui.confirmReset = false;
      render({ focusHead: true, scrollTop: true });
    },
    'hide-screen': function () {
      ui.screen = null;
      ui.nav = 'fade';
      ui.confirmReset = false;
      render({ focusHead: true, scrollTop: true });
    },
    'export': function () { exportRecord(); },
    'reset-ask': function () {
      ui.confirmReset = true;
      if (els.dialog.open) { renderDialog(); var b = els.dialogBody.querySelector('[data-fk="reset-confirm"]'); if (b) b.focus(); }
      else render({ focus: '[data-fk="reset-confirm"]' });
    },
    'reset-cancel': function () {
      ui.confirmReset = false;
      if (els.dialog.open) { renderDialog(); var b = els.dialogBody.querySelector('[data-fk="d-reset"]'); if (b) b.focus(); }
      else render({ focus: '[data-action="reset-ask"]' });
    },
    'reset-confirm': function () { resetAll(); },
    'open-evidence': function () {
      ui.confirmReset = false;
      renderDialog();
      if (typeof els.dialog.showModal === 'function') els.dialog.showModal(); else els.dialog.setAttribute('open', '');
    },
    'close-evidence': function () { els.dialog.close(); },

    /* study pages */
    'consent-continue': function () {
      var choice = ui.consentChoice;
      if (!choice) return;
      study.consent = { choice: choice, at: nowISO() };
      saveStudy();
      if (choice === 'yes') {
        logOn();
        logEvent('consent', { choice: choice });
        logSnapshot('consent');
      } else if (LOG) LOG.enable(false);
      ui.screen = null;
      render({ focusHead: true, scrollTop: true });
    },
    'consent-try': function () {
      study.consent.continuedAt = nowISO();
      saveStudy();
      ui.screen = null;
      render({ focusHead: true, scrollTop: true });
    },
    'test-start': function (el) {
      var scr = el.getAttribute('data-test');
      var t = testOf(scr);
      tick();
      if (!t.startedAt) t.startedAt = nowISO();
      t.pos = 0;
      saveStudy();
      logEvent('test-start', { test: scr });
      render({ focusHead: true, scrollTop: true });
    },
    'test-next': function (el) {
      var scr = el.getAttribute('data-test');
      var t = testOf(scr), cfg = testCfg(scr), page = testPage(scr);
      if (!page) return;
      tick();
      var rec = t.items[page.id];
      // Copy what is typed into number boxes now, in case the last keystroke hasn't been stored.
      els.screen.querySelectorAll('[data-input="test-num"]').forEach(function (inp) { rec.answers[inp.getAttribute('data-key')] = inp.value; });
      // A number box must hold a number (or be left empty).
      var bad = null;
      page.parts.forEach(function (p) {
        var v = rec.answers[p.key];
        if (!bad && p.kind === 'num' && v != null && String(v).trim() !== '' && !numOk(v)) bad = p.key;
      });
      if (bad) {
        ui.testErr = bad;
        logEvent('test-invalid', { test: scr, page: page.id, key: bad, value: rec.answers[bad] });
        render({ focus: '#num-' + bad });
        return;
      }
      ui.testErr = null;
      // Like Qualtrics' "request response": an unanswered part gets one reminder, then may be skipped.
      var missing = testMissing(page, rec);
      if (missing.length && ui.testNudge !== page.id) {
        ui.testNudge = page.id;
        rec.nudgedAt = rec.nudgedAt || nowISO();
        saveStudy();
        logEvent('test-nudge', { test: scr, page: page.id, missing: missing });
        render({ focus: '[data-fk="test-next"]' });
        announce(testText(scr, 'unanswered'));
        return;
      }
      ui.testNudge = null;
      rec.submittedAt = nowISO();
      rec.skipped = missing;
      logEvent('test-answer', { test: scr, page: page.id, item: page.item, answers: rec.answers, skipped: missing, activeMs: rec.activeMs,
        ms: Date.parse(rec.submittedAt) - Date.parse(rec.shownAt) });
      t.pos += 1;
      if (t.pos >= cfg.items.length) {
        t.submittedAt = nowISO();
        saveStudy();
        logEvent('test-submit', { test: scr });
        logSnapshot(scr + '-submitted');
        // Next: the survey after the posttest; the thank-you page after the pretest (it is part of
        // the pretest screen, so it shows in developer mode too).
        ui.screen = scr === 'posttest' ? 'survey' : 'pretest';
        render({ focusHead: true, scrollTop: true });
        if (scr === 'pretest') announce(ST.pretest.done + ' ' + ST.pretest.thanks.title);
        return;
      }
      saveStudy();
      render({ focusHead: true, scrollTop: true });
    },
    'test-transition': function (el) {
      var scr = el.getAttribute('data-test');
      tick();
      testOf(scr).transitionAt = nowISO();
      saveStudy();
      logEvent('test-transition', { test: scr });
      ui.nav = 'fade';
      render({ focusHead: true, scrollTop: true });
    },
    'test-proceed': function () {
      tick();
      study.pretest.proceededAt = nowISO();
      saveStudy();
      logEvent('test-proceed', { test: 'pretest' });
      ui.screen = null;
      ui.introPage = 1;
      ui.nav = 'fade';
      render({ focusHead: true, scrollTop: true });
    },
    'survey-submit': function () {
      tick();
      study.survey.submittedAt = nowISO();
      saveStudy();
      logEvent('survey-submit', { answers: study.survey.answers, activeMs: study.survey.activeMs });
      logSnapshot('survey-submitted');
      ui.screen = 'complete';
      ui.warpJump = true;
      render({ focusHead: true, scrollTop: true });
      announce('Mission complete.');
    }
  };

  function setMap(k, val) {
    var id = curId();
    var a = act(id);
    a.draft.map = a.draft.map || {};
    a.draft.map[k] = val;
    ui.sketch = { act: id, key: k };
    render();
  }

  var changes = {
    'consent-choice': function (el) { ui.consentChoice = el.value; render(); },
    'test-answer': function (el) {
      var scr = el.getAttribute('data-test'), key = el.getAttribute('data-key');
      var t = testOf(scr), page = testPage(scr);
      if (!t || !page || !t.items[page.id]) return;
      var rec = t.items[page.id];
      var v = el.value;
      if (el.tagName === 'SELECT' || el.type === 'radio') v = v === '' ? null : v === 'unsure' ? 'unsure' : +v;
      rec.answers[key] = v;
      rec.changes.push({ key: key, value: v, at: nowISO() });
      saveStudy();
      logEvent('test-change', { test: scr, page: page.id, key: key, value: v });
    },
    'survey-answer': function (el) {
      var key = el.getAttribute('data-key'), v = +el.value;
      study.survey.answers[key] = v;
      study.survey.changes.push({ key: key, value: v, at: nowISO() });
      saveStudy();
      logEvent('survey-change', { key: key, value: v });
    },
    'blank': function (el) {
      var a = act(curId());
      a.draft.blanks = a.draft.blanks || {};
      var k = el.getAttribute('data-key');
      a.draft.blanks[k] = a.draft.blanks[k] || {};
      a.draft.blanks[k][el.getAttribute('data-slot')] = el.value;
      if (a.phase === 'feedback' && attempt(a).outcome.overall !== 'correct') a.phase = 'awaiting';
      render({ focus: '[data-fk="bl-' + k + '-' + el.getAttribute('data-slot') + '"]' });
    },
    'land-choice': function (el) { act(curId()).draft.choice = el.value; syncSubmitState(); save(); },
    'landing-call': function (el) {
      var a = act('crew-combined');
      var at = attempt(a);
      a.landingCall = {
        choice: el.value, at: nowISO(), attempt: at.attempt,
        forecast: at.prediction, model: M.modelHeight({ dg: at.variant.dg, gp: at.variant.gp }, BASE)
      };
      save();
      render({ focus: '[data-fk="call-' + el.value + '"]' });
      announce(C.landingCall.who + ': ' + C.landingCall.reply(el.value, a.landingCall.model));
    },
    // "Not sure yet" and a typed idea are alternatives: ticking it greys out the text box
    // (anything typed is kept and comes back if it's unticked) and only "Not sure yet" is logged.
    'first-notsure': function (el) {
      act('briefing').draft.notSure = el.checked;
      var ta = document.getElementById('first-idea');
      if (ta) ta.disabled = el.checked;
      syncSubmitState(); save();
    },
    'exp-choice': function (el) { act(curId()).draft.choice = el.value; render(); },
    'sensor-choice': function (el) { act('sensor').draft.choice = el.value; render(); },
    'sensor-quantity': function (el) { act('sensor').draft.quantity = el.value; render(); },
    'map-dg': function (el) { setMap('dg', el.value); },
    'map-gp': function (el) { setMap('gp', el.value); },
    'map-R': function (el) { setMap('R', el.value); },
    'mixed-pred': function (el) {
      var id = curId();
      var a = act(id);
      var prev = a.draft.pred != null ? +a.draft.pred : BASE;
      a.draft.pred = el.value;
      ui.sketch = { act: id, key: 'h', fromH: prev };
      render();
    },
    'est': function (el) {
      var a = act('planets');
      a.draft.estimates = a.draft.estimates || {};
      a.draft.estimates[el.getAttribute('data-planet')] = el.value === '' ? null : parseFloat(el.value);
      render();
    },
    'planet-smallest': function (el) { act('planets').draft.smallest = el.value; render(); },
    'planet-reason': function (el) { act('planets').draft.reason = el.value; render(); }
  };

  var inputs = {
    'test-num': function (el) {
      var t = testOf(el.getAttribute('data-test')), page = testPage(el.getAttribute('data-test'));
      if (!t || !page || !t.items[page.id]) return;
      t.items[page.id].answers[el.getAttribute('data-key')] = el.value;
      saveStudy();
    },
    'calc-val': function (el) {
      var id = curId(); var a = act(id);
      a.draft.vals = a.draft.vals || {};
      var before = calcState(id, a).allKnown;
      var key = el.getAttribute('data-key'), was = String(a.draft.vals[key] == null ? '' : a.draft.vals[key]).trim();
      a.draft.vals[key] = el.value;
      // The diagram follows the typing (the label pulses once when a value first appears).
      var svgEl = els.stage.querySelector('svg.planet-svg[data-idp="pq"]');
      if (svgEl && C.calc[id].known.length) svgEl.outerHTML = planetSVG(calcDiagram(C.calc[id], a.draft.vals, !was && el.value.trim() ? key : null));
      var lineEl = document.getElementById('vals-line');
      if (lineEl) lineEl.outerHTML = calcValsLineHTML(C.calc[id], a.draft.vals);
      var after = calcState(id, a).allKnown;
      if (C.calc[id].substitute && before !== after) {
        var pos = el.selectionStart;
        render({ focus: '[data-fk="' + el.getAttribute('data-fk') + '"]' });
        var ne = document.querySelector('[data-fk="' + el.getAttribute('data-fk') + '"]');
        if (ne && pos != null) try { ne.setSelectionRange(pos, pos); } catch (_) { /* ignore */ }
      } else { syncSubmitState(); save(); }
    },
    'land-report': function (el) { act(curId()).draft.report = el.value; syncSubmitState(); save(); },
    'reflect-text': function (el) { act(curId()).draft.text = el.value; syncSubmitState(); save(); },
    'first-idea': function (el) { act('briefing').draft.text = el.value; syncSubmitState(); save(); },
    'crew-reason': function (el) { act('crew-combined').draft.reason = el.value; syncSubmitState(); save(); },
    'pred': function (el) {
      var raw = el.value.trim();
      var helper = document.getElementById('pred-helper');
      if (raw === '') { setPrediction(null); save(); return; }
      var v = parseFloat(raw);
      if (!isFinite(v) || v < 0 || v > GMAX) {
        act(curId()).draft.prediction = null;
        syncPredictionUI(act(curId()), curId());
        if (helper) helper.textContent = 'Enter a height from 0 to ' + GMAX + ' m.';
        return;
      }
      setPrediction(v);
      save();
    }
  };

  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-action]');
    if (!el || el.disabled || el.getAttribute('aria-disabled') === 'true') return;
    var fn = actions[el.getAttribute('data-action')];
    if (fn) { e.preventDefault(); fn(el, e); }
  });

  document.addEventListener('change', function (e) {
    var el = e.target.closest('[data-change]');
    if (el && changes[el.getAttribute('data-change')]) changes[el.getAttribute('data-change')](el, e);
  });

  document.addEventListener('input', function (e) {
    var el = e.target.closest('[data-input]');
    if (el && inputs[el.getAttribute('data-input')]) inputs[el.getAttribute('data-input')](el, e);
  });

  document.addEventListener('keydown', function (e) {
    // Enter / Space on SVG targets (role="button" elements that aren't <button>)
    var t = e.target;
    if (t && t.getAttribute && t.getAttribute('role') === 'button' && t.tagName.toLowerCase() !== 'button' && t.hasAttribute('data-action')) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); actions[t.getAttribute('data-action')](t, e); }
      return;
    }
    // Gauge slider keyboard support
    if (t && t.classList && t.classList.contains('gauge-track') && t.getAttribute('role') === 'slider') {
      var a = act(curId());
      var v = a.draft.prediction;
      var start = v == null ? BASE : v;
      var next = null;
      switch (e.key) {
        case 'ArrowUp': case 'ArrowRight': next = v == null ? BASE : snap(start) + 0.5; break;
        case 'ArrowDown': case 'ArrowLeft': next = v == null ? BASE : snap(start) - 0.5; break;
        case 'PageUp': next = snap(start) + 1; break;
        case 'PageDown': next = snap(start) - 1; break;
        case 'Home': next = 0; break;
        case 'End': next = GMAX; break;
      }
      if (next != null) { e.preventDefault(); setPrediction(clamp(next, 0, GMAX)); save(); }
    }
  });

  /* Gauge dragging (pointer events; keyboard and stepper are equivalent alternatives) */
  var drag = null;
  function predFromPointer(track, e) {
    var r = track.getBoundingClientRect();
    var v = (1 - (e.clientY - r.top) / r.height) * GMAX;
    setPrediction(clamp(snap(v), 0, GMAX));
  }
  document.addEventListener('pointerdown', function (e) {
    var track = e.target.closest('.gauge-track[role="slider"]');
    if (!track) return;
    e.preventDefault();
    try { track.setPointerCapture(e.pointerId); } catch (_) { /* ignore */ }
    drag = { track: track, id: e.pointerId };
    var g = track.closest('.gauge');
    if (g) g.classList.add('dragging');
    track.focus({ preventScroll: true });
    predFromPointer(track, e);
  });
  document.addEventListener('pointermove', function (e) { if (drag && e.pointerId === drag.id) predFromPointer(drag.track, e); });
  function endDrag(e) {
    if (!drag || e.pointerId !== drag.id) return;
    var g = drag.track.closest('.gauge');
    if (g) g.classList.remove('dragging');
    drag = null; save();
  }
  document.addEventListener('pointerup', endDrag);
  document.addEventListener('pointercancel', endDrag);

  /* Rank list dragging: pick a card up and drop it in a new place. The other cards make room
     as it passes, and the diagram previews the order under the pointer. The ↑ / ↓ buttons on
     each card do the same job from the keyboard. */
  var rdrag = null;
  function rankDragOrder(d) {
    var order = d.order.slice();
    order.splice(d.to, 0, order.splice(d.from, 1)[0]);
    return order;
  }
  document.addEventListener('pointerdown', function (e) {
    var card = e.target.closest && e.target.closest('.rank-card');
    if (!card || e.target.closest('button') || e.button > 0 || typeOf(curId()) !== 'rank') return;
    var cards = Array.prototype.slice.call(els.body.querySelectorAll('.rank-card'));
    var slot = cards.length > 1 ? cards[1].getBoundingClientRect().top - cards[0].getBoundingClientRect().top : card.offsetHeight + 8;
    var i = cards.indexOf(card);
    rdrag = { card: card, cards: cards, id: e.pointerId, y0: e.clientY, from: i, to: i, slot: slot, active: false,
      order: rankOrder(act(curId())).slice() };
    try { card.setPointerCapture(e.pointerId); } catch (_) { /* ignore */ }
  });
  document.addEventListener('pointermove', function (e) {
    var d = rdrag;
    if (!d || e.pointerId !== d.id) return;
    var dy = e.clientY - d.y0;
    if (!d.active) {
      if (Math.abs(dy) < 4) return;
      d.active = true;
      d.card.classList.add('dragging');
      d.card.closest('.rank-list').classList.add('sorting');
    }
    e.preventDefault();
    var n = d.cards.length;
    dy = clamp(dy, -d.from * d.slot - 12, (n - 1 - d.from) * d.slot + 12);
    d.card.style.transform = 'translateY(' + dy.toFixed(1) + 'px) scale(1.02)';
    var to = clamp(Math.round(d.from + dy / d.slot), 0, n - 1);
    if (to === d.to) return;
    d.to = to;
    d.cards.forEach(function (c, j) {
      if (c === d.card) return;
      var off = j > d.from && j <= to ? -d.slot : j < d.from && j >= to ? d.slot : 0;
      c.style.transform = off ? 'translateY(' + off + 'px)' : '';
    });
    rankVizTo(rankDragOrder(d), 320);
  });
  function endRankDrag(e) {
    var d = rdrag;
    if (!d || e.pointerId !== d.id) return;
    rdrag = null;
    if (!d.active) return;
    d.card.classList.remove('dragging');
    var list = d.card.closest('.rank-list');
    if (list) list.classList.remove('sorting');
    if (e.type === 'pointercancel' || d.to === d.from) {
      // Put everything back where it was.
      d.cards.forEach(function (c) { c.style.transform = ''; });
      rankVizTo(d.order, 320);
      return;
    }
    var pid = d.card.getAttribute('data-rank-id');
    setRankOrder(rankDragOrder(d), null, pid);
  }
  document.addEventListener('pointerup', endRankDrag);
  document.addEventListener('pointercancel', endRankDrag);

  /* Symbol key: any coloured symbol (Δg, gₚ, R, k, h) says what it stands for. Pointing at it,
     tapping it, or moving keyboard focus to a Tide Lab chip opens a small note with its
     definition; Escape, a tap elsewhere, or moving away closes it. The definitions are the ones
     in the formula bar (content.js, `definitions`), so the wording is the same everywhere. */
  var symTip = { el: null, target: null, timer: 0 };
  var SYM_SEL = '[data-sym], .sym, .eq-vis .t';
  function symKeyOf(el) {
    if (!el || (el.closest && el.closest('.defs, .def-banner'))) return null; // already beside its definition
    var k = el.getAttribute('data-sym');
    if (k) return k;
    var m = /(?:^|\s)(?:c|t)-(dg|gp|R|k|h)(?:\s|$)/.exec(el.getAttribute('class') || '');
    return m ? m[1] : null;
  }
  function hideSymTip() {
    window.clearTimeout(symTip.timer);
    if (symTip.el) symTip.el.hidden = true;
    if (symTip.target) symTip.target.removeAttribute('aria-describedby');
    symTip.target = null;
  }
  function showSymTip(target) {
    var key = symKeyOf(target);
    var d = key && C.definitions.filter(function (x) { return x.key === key; })[0];
    if (!d) return;
    if (!symTip.el) {
      symTip.el = document.createElement('div');
      symTip.el.id = 'symtip'; symTip.el.className = 'symtip'; symTip.el.setAttribute('role', 'tooltip');
      document.body.appendChild(symTip.el);
    }
    if (symTip.target && symTip.target !== target) symTip.target.removeAttribute('aria-describedby');
    symTip.target = target;
    symTip.el.innerHTML = '<b class="c-' + key + '">' + d.sym + '</b><span>' + d.text + '</span>';
    symTip.el.hidden = false;
    target.setAttribute('aria-describedby', 'symtip');
    var r = target.getBoundingClientRect(), w = symTip.el.offsetWidth, h = symTip.el.offsetHeight;
    var left = clamp(r.left + r.width / 2 - w / 2, 8, window.innerWidth - w - 8);
    var top = r.top - h - 8 < 8 ? r.bottom + 8 : r.top - h - 8;
    symTip.el.style.left = Math.round(left) + 'px';
    symTip.el.style.top = Math.round(top) + 'px';
  }
  document.addEventListener('pointerover', function (e) {
    if (e.pointerType !== 'mouse') return;
    var t = e.target.closest && e.target.closest(SYM_SEL);
    if (!t || !symKeyOf(t)) return;
    window.clearTimeout(symTip.timer);
    symTip.timer = window.setTimeout(function () { showSymTip(t); }, 180);
  });
  document.addEventListener('pointerout', function (e) {
    if (e.pointerType !== 'mouse') return;
    var t = e.target.closest && e.target.closest(SYM_SEL);
    if (t && (!e.relatedTarget || !t.contains(e.relatedTarget))) hideSymTip();
  });
  document.addEventListener('click', function (e) {
    var t = e.target.closest && e.target.closest(SYM_SEL);
    if (!t || !symKeyOf(t)) { hideSymTip(); return; }
    // A second tap on the same symbol closes its note (a chip keeps it while it has focus).
    if (symTip.target === t && symTip.el && !symTip.el.hidden && t.tagName !== 'BUTTON') hideSymTip(); else showSymTip(t);
  });
  document.addEventListener('focusin', function (e) {
    var t = e.target.closest && e.target.closest('button[data-sym]');
    if (t) showSymTip(t); else if (symTip.target && symTip.target.tagName === 'BUTTON') hideSymTip();
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') hideSymTip(); });
  window.addEventListener('scroll', hideSymTip, true);

  /* <details> toggle doesn't bubble — listen in the capture phase. */
  document.addEventListener('toggle', function (e) {
    if (e.target && e.target.classList && e.target.classList.contains('defs-wrap')) ui.defsOpen = e.target.open;
  }, true);

  els.dialog.addEventListener('close', function () {
    ui.confirmReset = false;
    var b = document.getElementById('evidence-btn');
    if (b) b.focus();
  });

  narrowQuery.addEventListener('change', function () {
    els.stage.__html = null; els.body.__html = null; els.head.__html = null; els.formula.__html = null;
    render();
  });

  /* ===================================================================== *
   * Start
   * ===================================================================== */
  // Guard against stored positions that no longer exist after a content edit.
  if (!C.steps[state.pos.step] || !C.steps[state.pos.step].activities[state.pos.sub]) {
    state.pos = { step: 0, sub: 0 };
  }
  act(curId());
  render();
  welcomeBack();

  // Minimal hooks for automated testing; read-only views of state.
  window.TFM = {
    getState: function () { return JSON.parse(JSON.stringify(state)); },
    buildRecord: buildRecord,
    model: M
  };
}());
