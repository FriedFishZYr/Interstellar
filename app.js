/*
 * Tidal Forecast Mission — interface logic.
 *
 * Depends on: model.js (window.TFMModel) for every calculation,
 *             content.js (window.TFM_CONTENT) for all wording and scenario values.
 *
 * Interaction states for every prediction task:
 *   awaiting prediction → prediction submitted → result shown →
 *   explanation submitted → feedback → continue
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
    clock: '<svg class="ic" viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="8.2" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M10 5.5V10l3 2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    sound: '<svg class="ic" viewBox="0 0 20 20" aria-hidden="true"><path d="M3 8v4h3l4 3.5v-11L6 8z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M13 7.2a4 4 0 0 1 0 5.6M15.3 5a7 7 0 0 1 0 10" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
    close: '<svg class="ic" viewBox="0 0 20 20" aria-hidden="true"><path d="M5 5l10 10M15 5L5 15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
  };

  /* ===================================================================== *
   * State & persistence (localStorage only — nothing is sent anywhere)
   * ===================================================================== */
  var ui = {
    hint: null,           // { act, level } while the hint panel is open
    animate: null,        // activity id whose result should animate on next render
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
      evidence: []
    };
  }

  function load() {
    try {
      var raw = window.localStorage.getItem(C.storageKey);
      if (!raw) return null;
      var s = JSON.parse(raw);
      if (!s || s.schema !== C.recordSchema || !s.pos || !s.activities) return null;
      return s;
    } catch (e) {
      ui.storageOk = false;
      return null;
    }
  }

  function save() {
    state.updatedAt = nowISO();
    try {
      window.localStorage.setItem(C.storageKey, JSON.stringify(state));
      ui.storageOk = true;
    } catch (e) {
      ui.storageOk = false;
    }
  }

  var state = load() || freshState();
  // Sessions saved before the film ending existed get its record added.
  if (!state.video.ending) state.video.ending = freshEndingVideo();

  /* Developer mode (for user testing): every section is unlocked and a bar under the
     top bar jumps anywhere. Anyone can switch it on with the "Dev" button or ?dev=1.
     The setting is kept in this browser, separate from the session record, so it
     survives Start over. Sessions where it was used carry a devMode entry in the export. */
  var DEV_KEY = 'tfm.devmode';
  var DEV = { on: params.has('dev') };
  try {
    if (DEV.on) window.localStorage.setItem(DEV_KEY, '1');
    else DEV.on = window.localStorage.getItem(DEV_KEY) === '1';
  } catch (_) { /* storage blocked: dev mode lasts for this page only */ }
  function noteDevUse() {
    if (!state.devMode) state.devMode = { enabledAt: nowISO(), jumps: [] };
  }
  if (DEV.on) noteDevUse();

  /* Active (visible) time tracking. Wall-clock time is reported separately. */
  var lastTick = Date.now();
  function tick() {
    var t = Date.now();
    var d = Math.min(t - lastTick, 60000);
    lastTick = t;
    if (document.visibilityState !== 'visible') return;
    state.activeMs += d;
    var a = state.activities[curId()];
    if (a) a.activeMs = (a.activeMs || 0) + d;
  }
  window.setInterval(function () { tick(); save(); }, 5000);
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') { tick(); save(); } else { lastTick = Date.now(); }
  });
  window.addEventListener('pagehide', function () { tick(); save(); });

  /* ---------------- activities & attempts ---------------- */
  function curId() { return C.steps[state.pos.step].activities[state.pos.sub]; }
  function typeOf(id) { return C.activityTypes[id]; }
  function cmpPos(a, b) { return (a.step - b.step) || (a.sub - b.sub); }

  function act(id) {
    var a = state.activities[id];
    if (!a) {
      a = state.activities[id] = {
        id: id,
        label: C.activityLabels[id],
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
    if (a.id === 'briefing' || a.id === 'film-ending' || a.id === 'debrief') return 'unscored';
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
    if (!a.completedAt) a.completedAt = nowISO();
    a.completion = computeCompletion(a);
    if (!a.firstCompletion) a.firstCompletion = a.completion;
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
      case 'experiment': return C.experiments[id].hints(at.variant);
      case 'sensor': return C.sensor.hints(at.variant);
      case 'mixed': return C.mixed.hints(C.mixed.items[id]);
      case 'planets': return C.planets.hints();
      case 'crewCombined': return C.crewCombined.hints(at.variant);
      case 'crewExplain': return C.crewExplain.hints();
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
    var retryable = ['experiment', 'sensor', 'mixed', 'planets', 'crewCombined', 'crewExplain'].indexOf(typeOf(id)) >= 0;
    var fresh = (h.cue && h.cue.worked && retryable && a.phase !== 'awaiting')
      ? '<button type="button" class="btn btn-secondary btn-sm" data-action="fresh-attempt" data-fk="hint-fresh">Make a fresh attempt</button>' : '';
    return '<section class="hint-panel" id="hint-panel" aria-labelledby="hint-title" data-enter="hint|' + id + '|' + lvl + '|' + ui.hintOpens + '">' +
      '<div class="hint-top"><p class="hint-level">' + I.bulb + '<span>Hint ' + lvl + ' of ' + hs.length + '</span></p>' +
      '<span class="hint-dots" aria-hidden="true">' + dots + '</span></div>' +
      '<h2 id="hint-title" class="hint-title">' + h.title + '</h2>' +
      '<p class="hint-text">' + h.html + '</p>' +
      '<div class="hint-actions">' +
      (lvl < hs.length ? '<button type="button" class="btn btn-ghost-strong btn-sm" data-action="hint-next" data-fk="hint-next">Show next hint</button>' : '') +
      (lvl > 1 ? '<button type="button" class="btn btn-ghost btn-sm" data-action="hint-prev" data-fk="hint-prev">Previous</button>' : '') +
      '<button type="button" class="btn btn-ghost btn-sm" data-action="hint-close" data-fk="hint-close">Back to task</button>' +
      fresh + '</div>' +
      '<p class="hint-foot">Hints are free and never remove progress.</p>' +
      '</section>';
  }

  /* ===================================================================== *
   * Shared components
   * ===================================================================== */
  function headHTML(o) {
    var id = curId();
    var hintOpen = !!(ui.hint && ui.hint.act === id);
    var hintBtn = o.hint === false ? '' :
      '<button type="button" class="hint-btn" data-action="hint-toggle" data-fk="hint-btn" aria-expanded="' + hintOpen + '">' + I.bulb + '<span>Hint</span></button>';
    return '<div class="head-row"><p class="eyebrow">' + o.eyebrow + '</p>' + hintBtn + '</div>' +
      (o.badge || '') +
      '<h1 id="task-heading" class="task-heading" tabindex="-1">' + o.heading + '</h1>' +
      (o.prompt ? '<p class="prompt">' + o.prompt + '</p>' : '');
  }

  function attemptBadge(at) {
    return '<p class="attempt-badge">' + (at.attempt === 1 ? 'First attempt' : 'Fresh attempt ' + at.attempt) + '</p>';
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

  function inputsBlock(label, list, cue) {
    return '<div class="inputs-block' + (cue ? ' cue' : '') + '"><p class="mini-label">' + label + '</p>' +
      '<div class="chips">' + chipsHTML(list) + '</div></div>';
  }

  // Views call eqCard(highlights, note) where they used to place the card; it records what to
  // highlight and render() draws the card in its fixed slot above the diagram (#formula).
  function eqCard(hl, note) {
    ui.eq = { hl: hl || [], note: note || null };
    return '';
  }

  function formulaHTML(hl, note) {
    hl = hl || [];
    function has(k) { return hl.indexOf(k) >= 0 ? ' hl' : ''; }
    function defHTML(d) {
      return '<div class="def def-' + d.key + has(d.key) + '"><dt class="c-' + d.key + '">' + d.sym + '</dt><dd>' + d.text + '</dd></div>';
    }
    var defs = C.definitions.map(defHTML).join('');
    // Highlighted terms keep their definition visible; the full list is one click away.
    var focus = C.definitions.filter(function (d) { return hl.indexOf(d.key) >= 0; }).map(defHTML).join('');
    var open = ui.defsOpen ? ' open' : '';
    return '<section class="eq-card eq-bar" aria-label="Tidal-height model">' +
      '<div class="eq-top"><span class="eq-name">Tidal-height model</span></div>' +
      '<p class="eq"><span class="sr-only">h equals k times, Δg divided by g p, times R.</span>' +
      '<span aria-hidden="true" class="eq-vis">' +
      '<span class="t t-h' + has('h') + '">h</span><span class="op">=</span><span class="t t-k">k</span><span class="op">×</span>' +
      '<span class="op">(</span><span class="t t-dg c-dg' + has('dg') + '">Δg</span><span class="op">/</span>' +
      '<span class="t t-gp c-gp' + has('gp') + '">g<sub>p</sub></span><span class="op">)</span><span class="op">×</span>' +
      '<span class="t t-R c-R' + has('R') + '">R</span></span></p>' +
      (focus ? '<dl class="defs defs-focus">' + focus + '</dl>' : '') +
      '<details class="defs-wrap"' + open + '><summary>What the symbols mean</summary><dl class="defs">' + defs + '</dl></details>' +
      (note ? '<p class="eq-note">' + note + '</p>' : '') +
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
    return '<div class="fb fb-' + kind + '" data-enter="' + esc(key) + '"><p class="fb-status">' + icon + '<span>' + FB_STATUS[kind] + '</span></p>' +
      '<p class="fb-title"><span>' + title + '</span></p>' +
      '<div class="fb-body">' + body + '</div></div>';
  }

  function evidenceAddedHTML(evId) {
    var ev = C.evidence.filter(function (e) { return e.id === evId; })[0];
    if (!ev) return '';
    return '<div class="ev-added" data-enter="ev|' + evId + '"><p class="mini-label green">Added to evidence log</p>' +
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
        (result != null ? ', model result ' + f(result) + ' m' : '') + '."'
      : 'role="slider" tabindex="0" data-fk="gauge" aria-label="Prediction marker, bulge height in metres" ' +
        'aria-valuemin="0" aria-valuemax="' + GMAX + '"' + (hasPred ? ' aria-valuenow="' + pred + '"' : '') +
        ' aria-valuetext="' + (hasPred ? f(pred) + ' metres' : 'No prediction yet') + '"';
    return '<div class="gauge' + (o.animate ? ' animate' : '') + '">' +
      '<p class="gauge-title">Bulge height (m)</p>' +
      '<div class="gauge-body">' +
      '<div class="gauge-left" aria-hidden="true">' +
      '<span class="g-base-label" style="bottom:' + pct(BASE) + '">Base 4 m</span>' +
      '<span class="g-you" style="bottom:' + pct(hasPred ? pred : 0) + '"' + (hasPred ? '' : ' hidden') + '>You ' + (hasPred ? f(pred) : '') + ' m</span>' +
      '</div>' +
      '<div class="gauge-track' + (locked ? ' locked' : '') + '" ' + trackAttrs + '>' +
      (result != null ? '<span class="g-fill" style="height:' + pct(result) + '"></span>' : '') +
      '<span class="g-baseline" style="bottom:' + pct(BASE) + '"></span>' +
      '<span class="g-marker" style="bottom:' + pct(hasPred ? pred : 0) + '"' + (hasPred ? '' : ' hidden') + '></span>' +
      '</div>' +
      '<div class="gauge-scale" aria-hidden="true">' + ticks + '</div>' +
      '<div class="gauge-right" aria-hidden="true">' +
      (result != null ? '<span class="g-model" style="bottom:' + pct(result) + '">Model ' + f(result) + ' m</span>' : '') +
      '</div></div>' +
      (locked ? '' : '<p class="gauge-help">Drag the marker or use − / + to predict</p>') +
      '</div>';
  }

  function stepperHTML(pred, locked) {
    return '<div class="field"><label class="field-label" for="pred-input">Your prediction (bulge height)</label>' +
      '<div class="stepper' + (locked ? ' locked' : '') + '">' +
      '<button type="button" class="step-btn" data-action="pred-down" data-fk="pred-down" aria-label="Decrease prediction by 0.5 metres"' + (locked ? ' disabled' : '') + '>−</button>' +
      '<span class="step-val"><input id="pred-input" type="number" inputmode="decimal" min="0" max="' + GMAX + '" step="0.5"' +
      ' data-input="pred" data-fk="pred-input" placeholder="—" aria-describedby="pred-helper" value="' + (pred == null ? '' : f(pred)) + '"' + (locked ? ' readonly' : '') + '>' +
      '<span class="unit" aria-hidden="true">m</span></span>' +
      '<button type="button" class="step-btn" data-action="pred-up" data-fk="pred-up" aria-label="Increase prediction by 0.5 metres"' + (locked ? ' disabled' : '') + '>+</button>' +
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

  function hbarsHTML(pred, result, extraClass) {
    function w(v) { return (clamp(v, 0, GMAX) / GMAX * 100).toFixed(1); }
    return '<div class="hbars ' + (extraClass || '') + '" role="img" aria-label="Your prediction ' + f(pred) + ' m; model result ' + f(result) + ' m; baseline 4 m.">' +
      '<div class="hb-row"><span class="hb-label">You</span><span class="hb-track"><span class="hb-base" style="left:' + w(BASE) + '%"></span>' +
      '<span class="hb-fill hb-you" style="width:' + w(pred) + '%"></span></span><span class="hb-val">' + f(pred) + ' m</span></div>' +
      '<div class="hb-row"><span class="hb-label">Model</span><span class="hb-track"><span class="hb-base" style="left:' + w(BASE) + '%"></span>' +
      '<span class="hb-fill hb-model" style="width:' + w(result) + '%"></span></span><span class="hb-val">' + f(result) + ' m</span></div>' +
      '<p class="hb-scale" aria-hidden="true"><span>0</span><span>dashed line = base 4 m</span><span>10 m</span></p></div>';
  }

  function subnavHTML(labelFn) {
    var stepIdx = state.pos.step;
    var st = C.steps[stepIdx];
    if (st.activities.length < 2) return '';
    return '<nav class="subnav" aria-label="' + st.label + ' tasks">' + st.activities.map(function (id, i) {
      var ok = DEV.on || cmpPos({ step: stepIdx, sub: i }, state.furthest) <= 0;
      var cur = i === state.pos.sub;
      var done = state.activities[id] && state.activities[id].completedAt;
      return '<button type="button" class="sub' + (cur ? ' current' : '') + (done ? ' done' : '') + '" data-action="goto-sub" data-sub="' + i + '" data-fk="sub-' + i + '"' +
        (ok ? '' : ' disabled') + (cur ? ' aria-current="true"' : '') + '>' + (done ? I.check : '') + '<span>' + labelFn(id, i) + '</span></button>';
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

  function planetSVG(o) {
    var p = {
      dg: 1, gp: 1, R: 1, h: BASE, hidden: false, from: null, showH: false, highlight: null,
      selectable: false, selected: null, selState: null, idp: 'pd', compact: false,
      arrowH: null // optional: anchor Δg arrows at this bulge height (keeps two diagrams' arrows aligned)
    };
    Object.keys(o || {}).forEach(function (k) { p[k] = o[k]; });

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
      '</defs>';

    var stars = '<g class="stars" aria-hidden="true">' + STARS.map(function (s) {
      return '<circle cx="' + s[0] + '" cy="' + s[1] + '" r="' + s[2] + '" fill="#fff" opacity="' + s[3] + '"/>';
    }).join('') + '</g>';

    var tagText = 'Deformation exaggerated for visibility' + (p.R !== 1 ? ' · sizes not to scale' : '');
    // Compact diagrams render at about half size, so their tag uses larger type.
    var tagW = tagText.length * (p.compact ? 11.6 : 8.1) + 28, tagH = p.compact ? 38 : 28;
    var tag = '<g class="tag" aria-hidden="true"><rect x="' + r1(cx - tagW / 2) + '" y="14" width="' + r1(tagW) + '" height="' + tagH + '" rx="4" fill="#000" stroke="#555"/>' +
      '<text x="' + cx + '" y="' + (p.compact ? 40 : 33) + '" text-anchor="middle" class="t-tag">' + tagText + '</text></g>';

    // External body
    var bodyInner = '<circle cx="' + bx + '" cy="' + by + '" r="96" fill="url(#' + idp + '-glow)"/>' +
      '<circle cx="' + bx + '" cy="' + by + '" r="72" fill="none" stroke="#3a2e14" stroke-width="1.5"/>' +
      '<circle cx="' + bx + '" cy="' + by + '" r="58" fill="#000" stroke="' + COL.dg + '" stroke-width="2.4"/>' +
      '<text x="' + bx + '" y="' + (by + 100) + '" text-anchor="middle" class="t-lbl b">External body</text>' +
      '<text x="' + bx + '" y="' + (by + (p.compact ? 128 : 120)) + '" text-anchor="middle" class="t-sub">attracts every part of the planet</text>';

    // Connector between body and near side
    var nearTip = cx - ea.rx - Ln;
    var connector = '<line x1="' + (bx + 74) + '" y1="' + cy + '" x2="' + r1(nearTip - 8) + '" y2="' + cy + '" stroke="#666" stroke-width="1.5" stroke-dasharray="2 6" aria-hidden="true"/>';

    // Ocean + rock
    var ocean;
    if (p.hidden) {
      ocean = '<circle cx="' + cx + '" cy="' + cy + '" r="' + r1(level) + '" fill="url(#' + idp + '-ocean)" stroke="#fff" stroke-width="1.6" stroke-dasharray="7 6" opacity=".55"/>';
    } else {
      ocean = '<ellipse class="ocean" cx="' + cx + '" cy="' + cy + '" rx="' + r1(e.rx) + '" ry="' + r1(e.ry) + '"' +
        (e0 ? ' data-from-rx="' + r1(e0.rx) + '" data-from-ry="' + r1(e0.ry) + '"' : '') +
        ' fill="url(#' + idp + '-ocean)" stroke="#e8f4ff" stroke-width="2.2"/>';
    }
    var halo = '<circle cx="' + cx + '" cy="' + cy + '" r="' + r1(level + 70) + '" fill="url(#' + idp + '-halo)" aria-hidden="true"/>';
    var oceanInner = ocean +
      '<circle cx="' + cx + '" cy="' + cy + '" r="' + r1(rock) + '" fill="url(#' + idp + '-rock)" stroke="#1c1712" stroke-width="1.5"/>' +
      (p.showH && !p.hidden ? '<circle cx="' + cx + '" cy="' + cy + '" r="' + r1(level) + '" fill="none" stroke="#fff" stroke-opacity=".45" stroke-width="1.3" stroke-dasharray="3 5"/>' : '');

    var hBracket = '';
    if (p.showH && !p.hidden && e.rx - level > 6) {
      var y = cy + 30, x1 = cx + level, x2 = cx + e.rx;
      hBracket = '<g class="h-bracket' + (e0 ? ' late' : '') + '" aria-hidden="true">' +
        '<line x1="' + r1(x1) + '" y1="' + y + '" x2="' + r1(x2) + '" y2="' + y + '" stroke="#fff" stroke-width="2"/>' +
        '<line x1="' + r1(x1) + '" y1="' + (y - 7) + '" x2="' + r1(x1) + '" y2="' + (y + 7) + '" stroke="#fff" stroke-width="2"/>' +
        '<line x1="' + r1(x2) + '" y1="' + (y - 7) + '" x2="' + r1(x2) + '" y2="' + (y + 7) + '" stroke="#fff" stroke-width="2"/>' +
        '<text x="' + r1(x1 - 10) + '" y="' + (y + 6) + '" text-anchor="end" class="t-lbl b">h</text></g>';
    }

    // Two short lines on a dark pill in the lower half of the planet, clear of the
    // horizontal arrows (at cy) and the R line (centre to top).
    var hy = cy + rock * 0.42;
    var hiddenText = p.hidden ?
      '<g class="hidden-tag"><rect x="' + r1(cx - 74) + '" y="' + r1(hy) + '" width="148" height="50" rx="8" fill="#000" fill-opacity=".62"/>' +
      '<text x="' + cx + '" y="' + r1(hy + 21) + '" text-anchor="middle" class="t-sub w">Bulge hidden</text>' +
      '<text x="' + cx + '" y="' + r1(hy + 40) + '" text-anchor="middle" class="t-sub w">until you submit</text></g>' : '';

    // External acceleration arrows (all point toward the external body)
    function arrow(x1, x2) {
      return '<line x1="' + r1(x1) + '" y1="' + cy + '" x2="' + r1(x2) + '" y2="' + cy + '" stroke="' + COL.dg + '" stroke-width="4" stroke-linecap="round" marker-end="url(#' + idp + '-adg)"/>';
    }
    var dgArrows = '<g class="grp' + cls('dg') + '" aria-hidden="true">' +
      arrow(cx - ea.rx, cx - ea.rx - Ln) + arrow(cx, cx - Lc) + arrow(cx + ea.rx, cx + ea.rx - Lf) + '</g>';

    // Planet surface gravity arrows (point inward)
    var angles = [25, 65, 115, 155, 205, 245, 295, 335];
    var gpLines = '', gpHits = '';
    angles.forEach(function (deg) {
      var t = deg * Math.PI / 180, c = Math.cos(t), s = Math.sin(t);
      var px = cx + e.rx * c, py = cy - e.ry * s;
      var gap = 9;
      var sx = px + c * (gap + gpL), sy = py - s * (gap + gpL);
      var ex = px + c * gap, ey = py - s * gap;
      gpLines += '<line x1="' + r1(sx) + '" y1="' + r1(sy) + '" x2="' + r1(ex) + '" y2="' + r1(ey) + '" stroke="' + COL.gp + '" stroke-width="' + r1(gpW) + '" stroke-linecap="round" marker-end="url(#' + idp + '-agp)"/>';
      gpHits += '<line x1="' + r1(sx) + '" y1="' + r1(sy) + '" x2="' + r1(ex) + '" y2="' + r1(ey) + '" stroke="transparent" stroke-width="26" class="hit"/>';
    });
    var gpLabelX = r1(cx - e.rx * 0.62 - 52), gpLabelY = r1(cy - e.ry - 44);
    var gpInner = gpLines +
      '<text x="' + gpLabelX + '" y="' + gpLabelY + '" text-anchor="end" class="t-sym" fill="' + COL.gp + '">g<tspan dy="6" font-size="15">p</tspan>' + (p.gp !== 1 ? '<tspan dy="-6" font-size="17"> ' + times(p.gp) + '</tspan>' : '') + '</text>' +
      (p.compact ? '' : '<text x="' + gpLabelX + '" y="' + (gpLabelY + 22) + '" text-anchor="end" class="t-sub" fill="' + COL.gp + '">planet’s pull, toward its centre</text>');

    // Radius
    var rTop = cy - level;
    var rInner = '<line x1="' + cx + '" y1="' + cy + '" x2="' + cx + '" y2="' + r1(rTop) + '" stroke="' + COL.R + '" stroke-width="2.6" stroke-dasharray="2 6" stroke-linecap="round"/>' +
      '<line x1="' + (cx - 10) + '" y1="' + r1(rTop) + '" x2="' + (cx + 10) + '" y2="' + r1(rTop) + '" stroke="' + COL.R + '" stroke-width="2.6"/>' +
      '<text x="' + (cx + 14) + '" y="' + r1(cy - level / 2 + 7) + '" class="t-sym" fill="' + COL.R + '">R' + (p.R !== 1 ? ' ' + times(p.R) : '') + '</text>';

    var centreDot = '<circle cx="' + cx + '" cy="' + cy + '" r="4.5" fill="#fff"/>';

    // Δg inset panel
    var ix = 16, iy = 396, iw = 304, ih = 152, ax = iw - 16, sc = 0.85;
    var tn = ax - Ln * sc, tc = ax - Lc * sc, tf = ax - Lf * sc;
    function insetArrow(x2, y) {
      return '<line x1="' + ax + '" y1="' + y + '" x2="' + r1(x2) + '" y2="' + y + '" stroke="' + COL.dg + '" stroke-width="4" stroke-linecap="round" marker-end="url(#' + idp + '-adg)"/>';
    }
    var insetInner = '<g transform="translate(' + ix + ',' + iy + ')">' +
      '<rect width="' + iw + '" height="' + ih + '" rx="10" fill="#1c1c1c" stroke="#3a3a3a"/>' +
      '<text x="14" y="26" class="t-in b">External acceleration</text>' +
      '<text x="' + (iw - 14) + '" y="26" text-anchor="end" class="t-in sm" fill="' + COL.dg + '">← toward body</text>' +
      '<text x="14" y="57" class="t-in">Near</text>' + insetArrow(tn, 52) +
      '<text x="14" y="83" class="t-in">Centre</text>' + insetArrow(tc, 78) +
      '<text x="14" y="109" class="t-in">Far</text>' + insetArrow(tf, 104) +
      '<polyline points="' + r1(tn) + ',60 ' + r1(tn) + ',120 ' + r1(tf) + ',120 ' + r1(tf) + ',112" fill="none" stroke="' + COL.dg + '" stroke-width="2" stroke-dasharray="3 4"/>' +
      '<text x="' + r1(Math.min(tn, iw - 130)) + '" y="141" class="t-in b" fill="' + COL.dg + '">Δg = near − far</text>' +
      '</g>';

    // Labels
    var ly = cy + level + 58;
    var labels = p.compact ? '' : '<g aria-hidden="true">' +
      '<text x="' + r1(cx - level) + '" y="' + r1(ly) + '" text-anchor="middle" class="t-lbl b">Near side</text>' +
      '<text x="' + r1(cx - level) + '" y="' + r1(ly + 19) + '" text-anchor="middle" class="t-sub">faces the body</text>' +
      '<text x="' + cx + '" y="' + r1(ly) + '" text-anchor="middle" class="t-lbl b">Centre</text>' +
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
        return '<g class="grp g-' + k + cls(k) + '">' + inner + '</g>';
      }
      var t = C.targets[k];
      return '<g class="grp g-' + k + cls(k) + ' tgt" data-action="select-target" data-target="' + k + '" data-fk="tgt-' + k + '"' +
        ' role="button" tabindex="0" aria-pressed="' + (p.selected === k) + '" aria-label="' + esc(t.aria) + '">' +
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

    var desc = 'Diagram: an external body on the left attracts every part of an ocean planet on the right: a rocky core covered by an ocean. ' +
      (p.hidden ? 'The bulge is hidden until you submit. ' :
        'The ocean bulges along the line toward and away from the body; modelled height ' + f(p.h) + ' m, shape exaggerated. ') +
      'Amber arrows show external acceleration pointing toward the body: largest on the near side, smallest on the far side. ' +
      'Cyan arrows show the planet’s own gravity pointing inward' + (p.gp !== 1 ? ' (' + times(p.gp) + ')' : '') + '. ' +
      'A dotted violet line shows the radius R' + (p.R !== 1 ? ' (' + times(p.R) + ')' : '') + '.' +
      (p.dg !== 1 ? ' The near-to-far difference Δg is ' + times(p.dg) + '.' : '');

    var svgOpen = '<svg class="planet-svg' + (p.compact ? ' compact' : '') + '" viewBox="0 0 ' + W + ' ' + H + '" ' +
      (p.selectable ? 'role="group" aria-label="Planet diagram — choose a part"' : 'role="img" aria-label="' + esc(desc) + '"') + '>';

    return svgOpen + defs + stars + halo + tag +
      group('body', bodyInner, hitBody) +
      connector +
      group('h', oceanInner + hBracket + hiddenText) +
      dgArrows +
      group('gp', gpInner, gpHits) +
      group('R', rInner, hitR) +
      centreDot +
      (p.compact ? '' : group('dg', insetInner, hitDg)) +
      labels + selection + '</svg>';
  }

  /* Sensor readout panel: horizontal arrows proportional to the readings. */
  function sensorSVG(r, amt, idp, display) {
    display = display || r;
    var anchor = 388, sc = 12;
    function tip(v) { return Math.round((anchor - v * sc) * 10) / 10; }
    var rows = [['Near', 'near', 46], ['Centre', 'centre', 90], ['Far', 'far', 134]];
    var out = '<svg class="sensor-svg" viewBox="0 0 400 196" role="img" aria-label="' +
      esc('Near ' + display.near + ', centre ' + display.centre + ', far ' + display.far + '. Δg = ' + M.deltaG(display) + '.') + '">' +
      '<defs><marker id="' + idp + '-ah" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="3.6" markerHeight="3.6" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="' + COL.dg + '"/></marker></defs>';
    rows.forEach(function (row) {
      var y = row[2];
      out += '<text x="10" y="' + (y + 5) + '" class="s-lbl">' + row[0] + '</text>' +
        '<text x="70" y="' + (y + 5) + '" class="s-val">' + display[row[1]].toFixed(1) + (amt ? ' (+' + amt + ')' : '') + '</text>' +
        '<line x1="' + anchor + '" y1="' + y + '" x2="' + tip(r[row[1]]) + '" y2="' + y + '" stroke="' + COL.dg + '" stroke-width="5" stroke-linecap="round" marker-end="url(#' + idp + '-ah)"/>';
    });
    var tn = tip(r.near), tf = tip(r.far);
    out += '<polyline class="s-bracket" points="' + tn + ',56 ' + tn + ',162 ' + tf + ',162 ' + tf + ',144" fill="none" stroke="' + COL.dg + '" stroke-width="2" stroke-dasharray="3 4"/>' +
      '<text x="' + tn + '" y="186" class="s-dg">Δg = near − far = ' + M.deltaG(display).toFixed(1) + '</text></svg>';
    return out;
  }

  /* ===================================================================== *
   * Views — each returns { stage, head, body, after? }
   * ===================================================================== */
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
        : '<button type="button" class="video-start" data-action="video-play" data-fk="video-play">' +
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

    var head = headHTML({
      eyebrow: B.eyebrow, heading: B.heading, hint: false,
      prompt: ui.video === 'fallback' ? B.promptFallback : B.prompt
    });

    var body;
    if (state.firstIdea) {
      body = '<h2 class="q">' + B.question + '</h2>' +
        quoteHTML('Your first idea (logged)', state.firstIdea.notSure && !state.firstIdea.text ? 'Not sure yet' : state.firstIdea.text) +
        '<p class="note">Saved for comparison at the end. Not scored.</p>' +
        actionsHTML(btn('Continue', 'continue', { fk: 'primary' }));
    } else {
      var d = a.draft;
      body = '<h2 class="q" id="idea-q">' + B.question + '</h2>' +
        '<div class="field"><label class="field-label" for="first-idea">Your first idea</label>' +
        '<textarea id="first-idea" rows="3" maxlength="500" placeholder="Type a short idea…" data-input="first-idea" data-fk="first-idea"' + (d.notSure ? ' disabled' : '') + '>' + esc(d.text || '') + '</textarea></div>' +
        '<label class="choice"><input type="checkbox" data-change="first-notsure" data-fk="first-notsure"' + (d.notSure ? ' checked' : '') + '><span>Not sure yet</span></label>' +
        '<p class="note">' + B.note + '</p>' +
        actionsHTML(btn('Log idea &amp; continue', 'log-idea', { fk: 'primary', submit: true, disabled: !canSubmit(id, a) }) +
          '<p class="helper" id="submit-helper">Type an idea or choose “Not sure yet” to continue.</p>');
    }
    return { stage: stage, head: head, body: body };
  };

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

    var svg = planetSVG({
      idp: 'pc', selectable: phase === 'awaiting' || phase === 'wrong',
      selected: phase === 'worked' ? task.target : sel, selState: phase === 'worked' ? 'correct' : selState,
      highlight: highlight
    });
    var stage = '<div class="stage-inner">' +
      subnavHTML(function (tid) { return 'Find ' + C.targets[C.consoleTasks[tid].target].name.replace(' panel', '').replace(' arrows', '').replace(' line', ''); }) +
      '<div class="diagram diagram-solo">' + svg + '</div></div>';

    var head = headHTML({ eyebrow: 'Learn the console · ' + task.n + ' of 3', heading: task.heading, prompt: task.prompt });

    var eqHl = [];
    if (sel && ['dg', 'gp', 'R', 'h'].indexOf(sel) >= 0 && phase !== 'worked') eqHl = [sel];
    if (cue && cue.eq) eqHl = cue.eq;
    if (phase === 'correct' || phase === 'worked') eqHl = [task.target];

    var fb = '', actions;
    if (phase === 'wrong') {
      var given = at.outcome ? at.outcome.selected : sel;
      fb = feedbackHTML('notyet', 'Not this one.', '<p>' + C.targets[given].info + '</p><p>' + task.prompt + '</p>');
      actions = actionsHTML(btn('Try again', 'console-retry', { fk: 'primary' }),
        canOfferWorked(a) ? btn('Show me', 'worked', { kind: 'secondary', fk: 'worked' }) : '');
    } else if (phase === 'correct') {
      fb = feedbackHTML('correct', 'Correct', '<p>' + task.success + '</p>');
      actions = actionsHTML(btn(task.next, 'continue', { fk: 'primary' }));
    } else if (phase === 'worked') {
      fb = feedbackHTML('answer', 'Here it is', '<p>' + task.success.replace(/^Correct — /, '') + '</p>') +
        '<div class="supported-note">' + I.info + '<p>' + SUPPORTED_NOTE() + '</p></div>';
      actions = actionsHTML(btn(task.next, 'continue', { fk: 'primary' }));
    } else {
      actions = actionsHTML(btn('Check selection', 'console-check', { fk: 'primary', submit: true, disabled: !canSubmit(id, a) }));
    }

    var body = hintPanelHTML(id) + eqCard(eqHl) +
      (phase === 'awaiting' ? '<p class="helper">Click a part of the diagram, or press Tab to move between parts and Enter to choose.</p>' +
        (sel ? '<p class="selection-status">Selected: <b>' + C.targets[sel].name + '</b></p>' : '') : '') +
      fb + actions;
    return { stage: stage, head: head, body: body };
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
    var po = at.predictionOutcome;
    var overall = (po === 'correct' && eo === 'correct') ? 'correct'
      : (po === 'not-yet' && eo !== 'correct') ? 'not-yet' : 'partly';
    return { prediction: po, explanation: eo, overall: overall };
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
      : o.overall === 'partly'
        ? (o.prediction === 'correct' ? 'Partly there — right height, check the reason.'
          : o.explanation === 'correct' ? 'Partly there — right reason, check the size of the change.'
            : 'Partly there — right direction, check the size and the reason.')
        : 'Not yet — the bulge ' + dirPhrase + '.';
    var lines = [];
    if (o.prediction === 'correct') lines.push('Your prediction of ' + f(p) + ' m matched the model.');
    else if (o.prediction === 'partly') lines.push('You predicted ' + f(p) + ' m — the right direction, but the model gives ' + f(h) + ' m.');
    else lines.push('You predicted ' + describePrediction(p) + '.');
    lines.push(cfg.relation(at.variant, h));
    var choice = cfg.choices.filter(function (c) { return c.id === at.explanation; })[0];
    if (o.explanation === 'incorrect' && choice) lines.push(choice.feedback);
    if (o.explanation === 'not-sure') lines.push(cfg.notSureFeedback);
    var kind = o.overall === 'correct' ? 'correct' : o.overall === 'partly' ? 'partly' : 'notyet';
    return { kind: kind, title: title, body: lines.map(function (l) { return '<p>' + l + '</p>'; }).join('') };
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

    var svg = planetSVG({
      idp: 'px', dg: res.inputs.dg, gp: res.inputs.gp, R: res.inputs.R,
      h: shown ? h : BASE, from: animate ? BASE : null, showH: shown,
      highlight: cue && cue.diagram ? cue.diagram : null
    });
    var order = [cfg.key].concat(['dg', 'gp', 'R', 'k'].filter(function (k) { return k !== cfg.key; }));
    var chipList = order.map(function (k) { return { key: k, factor: k === cfg.key ? x : 1 }; });
    var status = shown ? 'Model result · ' + f(h) + ' m'
      : (cfg.n > 1 || at.attempt > 1 ? 'Reset to baseline · showing 4 m' : 'Showing baseline · 4 m');

    var stage = '<div class="stage-inner">' +
      subnavHTML(function (eid) { var c = C.experiments[eid]; return c.n + ' · ' + C.inputs[c.key].sym + ' ' + c.topic; }) +
      inputsBlock('Model inputs for this experiment', chipList, cue && cue.inputs) +
      '<p class="diagram-status"><span class="status-dot' + (shown ? ' live' : '') + '" aria-hidden="true"></span>' + status + '</p>' +
      '<div class="diagram-row"><div class="diagram">' + svg + '</div>' +
      gaugeHTML({ pred: pred, result: shown ? h : null, locked: shown, animate: animate }) + '</div>' +
      (shown ? hbarsHTML(pred, h, 'narrow-only') : '') +
      '</div>';

    var eyebrow = 'Experiment ' + cfg.n + ' of 3 · ' + cfg.topic;
    var head, body;
    var eqHl = cue && cue.eq ? cue.eq : [];

    if (phase === 'awaiting') {
      head = headHTML({ eyebrow: eyebrow, badge: attemptBadge(at), heading: 'Predict the new bulge height.', prompt: cfg.prompt(x) });
      body = hintPanelHTML(id) + stepperHTML(pred, false) +
        '<p class="helper" id="pred-helper">' + predHelperText(pred, 'run') + '</p>' +
        eqCard(eqHl) +
        actionsHTML(btn('Run experiment', 'run-exp', { fk: 'primary', submit: true, disabled: !canSubmit(id, a) }) +
          '<p class="helper" id="submit-helper">' + (pred == null ? 'Make a prediction to unlock the experiment.' : 'Results stay hidden until you run it.') + '</p>');
    } else if (phase === 'result') {
      var ratio = M.heightRatio(res.inputs);
      var note = 'Ratio to baseline: ' + S.dg + ' ' + times(res.inputs.dg) + ' ÷ ' + S.gp + ' ' + times(res.inputs.gp) +
        ' × R ' + times(res.inputs.R) + ' = ' + f(ratio) + ' → <span class="nowrap">4 m × ' + f(ratio) + ' = ' + f(h) + ' m</span>';
      head = headHTML({ eyebrow: eyebrow, badge: attemptBadge(at), heading: 'The model’s result: ' + f(h) + ' m.' });
      body = hintPanelHTML(id) +
        '<div class="compare-card"><div><p class="mini">Your prediction</p><p class="big">' + f(pred) + ' m</p></div>' +
        '<div><p class="mini">Model result</p><p class="big"' + countAttrs('res|' + id + '|' + at.attempt, BASE, h) + '>' + f(h) + ' m</p></div>' +
        '<p class="calc-note">' + note + '</p></div>' +
        (MODE.research ? '<p class="note">' + (at.attempt === 1 ? 'Saved as your first attempt. Retries are recorded separately.'
          : 'Saved as attempt ' + at.attempt + '. Your first attempt is kept separately.') + '</p>' : '') +
        eqCard(eqHl.length ? eqHl : [cfg.key]) +
        actionsHTML(btn('Explain the result', 'to-explain', { fk: 'primary' }));
    } else if (phase === 'explain') {
      head = headHTML({ eyebrow: eyebrow, badge: attemptBadge(at), heading: 'Why did the bulge change this way?', prompt: 'Choose the best physical explanation.' });
      body = hintPanelHTML(id) +
        radiosHTML('exp-choice', cfg.choices, a.draft.choice, { srLegend: 'Physical explanation' }) +
        (eqHl.length ? eqCard(eqHl) : '') +
        actionsHTML(btn('Submit explanation', 'submit-explain', { fk: 'primary', submit: true, disabled: !canSubmit(id, a) }));
    } else if (phase === 'feedback') {
      var fbk = experimentFeedback(id, at);
      head = headHTML({ eyebrow: eyebrow, badge: attemptBadge(at), heading: 'Why did the bulge change this way?' });
      var secondary = (at.outcome.overall !== 'correct' ? btn('Try a fresh prediction', 'fresh-attempt', { kind: 'secondary', fk: 'fresh' }) : '');
      var extra = canOfferWorked(a) ? '<div class="worked-offer"><p class="helper">Still tricky? You can review a worked solution and continue.</p>' +
        btn('Review worked solution', 'worked', { kind: 'ghost', fk: 'worked' }) + '</div>' : '';
      body = hintPanelHTML(id) + radiosHTML('exp-choice', cfg.choices, at.explanation, { locked: true }) +
        feedbackHTML(fbk.kind, fbk.title, fbk.body) + evidenceAddedHTML(cfg.evidence) +
        actionsHTML(btn('Continue', 'continue', { fk: 'primary' }), secondary, extra);
    } else { // worked
      head = headHTML({ eyebrow: eyebrow, badge: attemptBadge(at), heading: 'Let’s walk through it together.' });
      var nextLabel = cfg.n < 3 ? 'Continue to experiment ' + (cfg.n + 1) : 'Continue to the sensor update';
      body = hintPanelHTML(id) + workedHTML(cfg.worked(x, h)) + evidenceAddedHTML(cfg.evidence) +
        actionsHTML(btn(nextLabel, 'continue', { fk: 'primary' }));
    }
    return {
      stage: stage, head: head, body: body,
      after: function (animating) { if (animating === id) runTweens(els.stage); }
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
      '<figure class="sensor-panel"><figcaption>Before update</figcaption>' + sensorSVG(before, 0, 'sb') + '</figure>' +
      '<span class="sensor-arrow" aria-hidden="true">→</span>' +
      '<figure class="sensor-panel after"><figcaption>After update · +' + amt + ' everywhere</figcaption><div id="sensor-after">' +
      sensorSVG(animating && !reduced() ? before : after, amt, 'sa', after) + '</div></figure></div>' +
      '<div class="sensor-summary">' +
      '<div><p class="mini">' + S.dg + ' before</p><p class="val c-dg">' + dgB.toFixed(1) + '</p></div>' +
      '<div><p class="mini">' + S.dg + ' after</p><p class="val c-dg">' + dgA.toFixed(1) + '</p></div>' +
      '<div class="grow"><p class="mini">Modelled bulge</p><p class="val' + (answered ? '' : ' muted') + '">' +
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
        radiosHTML('sensor-choice', cfg.choices, a.draft.choice, { srLegend: 'Does the modelled bulge height change?' }) +
        '<div class="field"><label class="q" for="sensor-quantity">Which model quantity supports your answer?</label>' +
        '<select id="sensor-quantity" data-change="sensor-quantity" data-fk="sensor-quantity">' + qOpts + '</select></div>' +
        (eqHl.length ? eqCard(eqHl) : '') +
        actionsHTML(btn('Submit', 'sensor-submit', { fk: 'primary', submit: true, disabled: !canSubmit(id, a) }));
    } else if (phase === 'feedback') {
      var o = at.outcome;
      var kind, title, lines = [];
      if (o.overall === 'correct') {
        kind = 'correct'; title = 'Correct — the bulge stays at 4 m.';
        lines.push('Every reading rose by ' + amt + ', so the near-to-far difference is still ' + dgA + '. The model depends on ' + S.dg + ', not on the overall pull. A bigger overall pull isn’t a bigger difference.');
      } else if (o.choiceCorrect) {
        kind = 'partly'; title = 'Partly there — right answer, check the reason.';
        lines.push('The bulge does stay at 4 m.');
        lines.push(cfg.quantityFeedback[at.quantity] || '');
      } else if (o.quantityCorrect) {
        kind = 'partly'; title = 'Partly there — right quantity, check the prediction.';
        lines.push(S.dg + ' is the right quantity to check — and it didn’t change: it is ' + dgB + ' before and ' + dgA + ' after. So the modelled bulge stays at 4 m.');
      } else {
        kind = 'notyet'; title = 'Not yet — the bulge stays at 4 m.';
        if (at.choice === 'higher') lines.push('The overall pull did increase, but every reading rose by the same amount (' + amt + '). ' + S.dg + ' is still ' + dgA + ', so the model’s bulge stays at 4 m.');
        else lines.push('Nothing that resists deformation changed (' + S.gp + ' is locked), and ' + S.dg + ' is still ' + dgA + '. So the model’s bulge stays at 4 m.');
        if (cfg.quantityFeedback[at.quantity]) lines.push(cfg.quantityFeedback[at.quantity]);
      }
      var pick = cfg.choices.filter(function (c) { return c.id === at.choice; })[0];
      var qPick = cfg.quantities.filter(function (q) { return q.id === at.quantity; })[0];
      body = hintPanelHTML(id) +
        '<div class="choice choice-locked"><span class="radio-dot on" aria-hidden="true"></span><span>' + pick.text + ' · ' + esc(qPick.text) + '</span></div>' +
        feedbackHTML(kind, title, lines.map(function (l) { return '<p>' + l + '</p>'; }).join('')) +
        evidenceAddedHTML('ev-uniform') +
        actionsHTML(btn('Continue to quick checks', 'continue', { fk: 'primary' }),
          o.overall !== 'correct' ? btn('Try a fresh update', 'fresh-attempt', { kind: 'secondary', fk: 'fresh' }) : '',
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
          host.innerHTML = sensorSVG(r, amt, 'sa', after);
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
    var total = Object.keys(cfg.items).length;
    var at = attempt(a);
    var v = at.variant;
    var inp = mixedInputs(v);
    var h = M.modelHeight(inp, BASE);
    var phase = a.phase; // awaiting | feedback | worked
    var shown = phase !== 'awaiting';
    var cue = activeCue(id);
    var animate = ui.animate === id;
    var d = a.draft;

    var svg = planetSVG({
      idp: 'pm', dg: shown ? inp.dg : 1, gp: shown ? inp.gp : 1, R: shown ? inp.R : 1,
      h: shown ? h : BASE, from: animate ? BASE : null, showH: shown,
      highlight: cue && cue.diagram ? cue.diagram : null
    });
    var reveal = shown
      ? inputsBlock('What the scenario changes', [{ key: 'dg', factor: inp.dg }, { key: 'gp', factor: inp.gp }, { key: 'R', factor: inp.R }, { key: 'k', factor: 1 }])
      : '<p class="map-note">' + I.info + '<span>The console won’t say which inputs change this time. You decide, then the model shows you.</span></p>';
    var stage = '<div class="stage-inner">' +
      subnavHTML(function (mid, i) { return 'Check ' + (i + 1); }) +
      reveal +
      '<p class="diagram-status"><span class="status-dot' + (shown ? ' live' : '') + '" aria-hidden="true"></span>' +
      (shown ? 'Model result · ' + f(h) + ' m' : 'Showing baseline · 4 m') + '</p>' +
      '<div class="diagram diagram-solo">' + svg + '</div>' +
      (shown ? hbarsHTML(at.prediction, h) : '') + '</div>';

    var head = headHTML({
      eyebrow: cfg.eyebrow + ' · ' + item.n + ' of ' + total, badge: attemptBadge(at),
      heading: shown ? 'The model’s result: ' + f(h) + ' m.' : cfg.heading,
      prompt: '<span class="scenario-label">Scenario</span> ' + v.scenario
    });

    var eqHl = cue && cue.eq ? cue.eq : [];
    var nextLabel = item.n < total ? 'Next check' : 'Continue to planet comparison';
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
      body = hintPanelHTML(id) +
        '<p class="helper">' + cfg.prompt + '</p>' +
        '<div class="map-block"><p class="q">1 · What happens to each model input?</p>' + mapRows + '</div>' +
        radiosHTML('mixed-pred', predItems, d.pred, { row: true, legend: '2 · Predict the new bulge height (baseline 4 m)' }) +
        (eqHl.length ? eqCard(eqHl) : '') +
        actionsHTML(btn('Check', 'mixed-submit', { fk: 'primary', submit: true, disabled: !canSubmit(id, a) }) +
          '<p class="helper" id="submit-helper">Choose an answer for all three inputs and a height.</p>');
    } else if (phase === 'feedback') {
      var o = at.outcome;
      var kind = o.overall === 'correct' ? 'correct' : o.overall === 'partly' ? 'partly' : 'notyet';
      var title = o.overall === 'correct' ? 'Correct — ' + f(h) + ' m.'
        : o.mappingCorrect ? 'Partly there — right inputs, check the height.'
          : o.prediction.correct ? 'Partly there — right height, check which inputs changed.'
            : 'Not yet — the model gives ' + f(h) + ' m.';
      var lines = [];
      MAP_KEYS.forEach(function (k) {
        var r = o.mapping[k];
        if (!r.correct) lines.push(C.inputs[k].sym + ': you chose “' + dirText(r.given) + '” — it ' + dirPhrase(r.model) + '.');
      });
      lines.push(v.why);
      lines.push((o.prediction.correct ? 'Your prediction of ' + f(at.prediction) + ' m matched the model. ' : 'You predicted ' + f(at.prediction) + ' m. ') + mixedRatioLine(inp, h));
      lines.push(v.physical);
      var yours = '<div class="choice choice-locked" aria-label="Your answer"><span class="radio-dot on" aria-hidden="true"></span><span>' +
        MAP_KEYS.map(function (k) { return C.inputs[k].sym + ' ' + dirText(at.mapping[k]).toLowerCase(); }).join(' · ') +
        ' · ' + f(at.prediction) + ' m</span></div>';
      body = hintPanelHTML(id) + yours +
        feedbackHTML(kind, title, lines.map(function (l) { return '<p>' + l + '</p>'; }).join('')) +
        actionsHTML(btn(nextLabel, 'continue', { fk: 'primary' }),
          o.overall !== 'correct' ? btn('Try a fresh check', 'fresh-attempt', { kind: 'secondary', fk: 'fresh' }) : '',
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
      after: function (anim) { if (anim === id) runTweens(els.stage); }
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
      chart = '<div class="chart"><p class="mini-label">Modelled bulge height · common scale 0–10 m</p><p class="chart-empty">Results appear here, side by side on one scale, after you submit.</p></div>';
    } else {
      chart = '<div class="chart' + (animate ? ' animate' : '') + '"><p class="mini-label">Modelled bulge height · common scale 0–10 m</p>' +
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

    var heading = revealed ? 'Planet ' + smallestId + ' has the smallest modelled bulge.' : cfg.heading;
    var head = headHTML({ eyebrow: cfg.eyebrow, badge: attemptBadge(at), heading: heading, prompt: revealed ? '' : cfg.prompt });
    var ids = set.map(function (p) { return { id: p.id, text: 'Planet ' + p.id }; });
    var eqHl = cue && cue.eq ? cue.eq : [];
    var body;
    if (phase === 'awaiting') {
      body = hintPanelHTML(id) +
        radiosHTML('planet-smallest', ids, d.smallest, { legend: 'Smallest modelled bulge', row: true }) +
        radiosHTML('planet-reason', cfg.reasons, d.reason, { legend: 'Why?' }) +
        (eqHl.length ? eqCard(eqHl) : '') +
        actionsHTML(btn('Reveal results', 'planets-submit', { fk: 'primary', submit: true, disabled: !canSubmit(id, a) }) +
          '<p class="helper" id="submit-helper">Choose an estimate for each planet, the smallest, and a reason.</p>');
    } else if (phase === 'feedback') {
      var o = at.outcome;
      var lines = [];
      lines.push(o.smallest.correct ? 'You picked Planet ' + o.smallest.given + ' — correct.'
        : 'You picked Planet ' + o.smallest.given + ', but Planet ' + smallestId + ' has the smallest modelled bulge.');
      set.forEach(function (pl) {
        var e = o.estimates[pl.id];
        if (!e.correct) {
          lines.push('Planet ' + pl.id + ': you estimated ' + f(e.given) + '×; the model gives ' + S.dg + ' ' + f(pl.dg) + ' ÷ ' + S.gp + ' ' + f(pl.gp) + ' = ' + f(pl.ratio) + '× → ' + f(pl.h) + ' m.');
        }
      });
      var reason = cfg.reasons.filter(function (r) { return r.id === o.reason.given; })[0];
      if (!o.reason.correct && reason) lines.push(reason.feedback);
      if (o.overall === 'correct') lines.push('Both quantities matter: ' + S.dg + ' raises the bulge and ' + S.gp + ' lowers it.');
      var kind = o.overall === 'correct' ? 'correct' : o.overall === 'partly' ? 'partly' : 'notyet';
      var title = o.overall === 'correct' ? 'Correct — every estimate matches.'
        : o.overall === 'partly' ? (o.smallest.correct ? 'Partly there — right planet, ' + (o.wrongEstimates === 1 ? 'one estimate off.' : 'check your estimates.') : 'Partly there — compare both quantities.')
          : 'Not yet — compare ' + S.dg + ' ÷ ' + S.gp + '.';
      body = hintPanelHTML(id) +
        feedbackHTML(kind, title, lines.map(function (l) { return '<p>' + l + '</p>'; }).join('')) +
        evidenceAddedHTML(cfg.evidence) +
        actionsHTML(btn('Continue to crew briefing', 'continue', { fk: 'primary' }),
          o.overall !== 'correct' ? btn('Try fresh planets', 'fresh-attempt', { kind: 'secondary', fk: 'fresh' }) : '',
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

  /* ---------------- F1. Crew briefing — combined prediction ---------------- */
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
    var stage = '<div class="stage-inner">' + subnavHTML(function (cid, i) { return 'Challenge ' + (i + 1); }) +
      inputsBlock('Model inputs for ' + cfg.planetName, [{ key: 'dg', factor: v.dg }, { key: 'gp', factor: v.gp }, { key: 'R', factor: 1 }, { key: 'k', factor: 1 }], cue && cue.inputs) +
      '<p class="diagram-status"><span class="status-dot' + (shown ? ' live' : '') + '" aria-hidden="true"></span>' +
      (shown ? 'Model result · ' + f(h) + ' m' : cfg.planetName + ' · bulge hidden until you submit') + '</p>' +
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
      var title = po === 'correct' ? 'Correct — ' + f(h) + ' m.'
        : po === 'partly' ? 'Partly there — right direction, but the model gives ' + f(h) + ' m.'
          : 'Not yet — the model gives ' + f(h) + ' m.';
      var lines = ['You predicted ' + f(at.prediction) + ' m.', cfg.relation(v, h)];
      body = hintPanelHTML(id) +
        feedbackHTML(kind, title, lines.map(function (l) { return '<p>' + l + '</p>'; }).join('')) +
        quoteHTML('Your reason', at.reason) +
        '<div class="crew-note"><p class="mini-label">Crew note — compare with your reason</p><p>' + cfg.crewNote(v, h) + '</p></div>' +
        actionsHTML(btn('Continue to challenge 2', 'continue', { fk: 'primary' }),
          po !== 'correct' ? btn('Try a fresh forecast', 'fresh-attempt', { kind: 'secondary', fk: 'fresh' }) : '',
          canOfferWorked(a) ? '<div class="worked-offer">' + btn('Review worked solution', 'worked', { kind: 'ghost', fk: 'worked' }) + '</div>' : '');
    } else {
      body = hintPanelHTML(id) + workedHTML(cfg.worked(v, h)) +
        actionsHTML(btn('Continue to challenge 2', 'continue', { fk: 'primary' }));
    }
    return {
      stage: stage, head: head, body: body,
      after: function (anim) { if (anim === id) runTweens(els.stage); }
    };
  };

  /* ---------------- F2. Crew briefing — explanation ---------------- */
  VIEWS.crewExplain = function (id, a) {
    var cfg = C.crewExplain;
    var at = attempt(a);
    var phase = a.phase; // awaiting | feedback
    var answered = phase !== 'awaiting';
    var cue = activeCue(id);
    var heights = cfg.planets.map(function (pl) { return M.modelHeight({ dg: cfg.dg, gp: pl.gp }, BASE); });
    // Both diagrams anchor their Δg arrows at the taller bulge, so the arrows sit in the same
    // place in each and only the ocean visibly differs.
    var arrowH = Math.max.apply(null, heights);
    var figs = cfg.planets.map(function (pl, i) {
      var h = heights[i];
      return '<figure class="mini-planet"><figcaption>' + pl.name + ' <span class="c-gp">' + S.gp + ' ' + times(pl.gp) + '</span></figcaption>' +
        planetSVG({ idp: 'pe' + pl.id, dg: cfg.dg, gp: pl.gp, hidden: !answered, h: h, showH: answered, arrowH: answered ? arrowH : null, compact: true, highlight: cue && cue.diagram ? cue.diagram : null }) +
        (answered ? '<p class="mini-result">Modelled bulge: <b' + countAttrs('crew2|' + pl.id + '|' + at.attempt, BASE, h) + '>' + f(h) + ' m</b></p>' : '') + '</figure>';
    }).join('');
    // Feature focusing: gₚ is the one difference, styled as the changed input; Δg, R and k are
    // shown as the same for both (no ×2.6 badge, which read as a difference between the planets).
    var gpChip = '<span class="chip chip-changing">' +
      '<span class="sw sw-gp" aria-hidden="true"></span><b class="sym c-gp">' + S.gp + '</b>' +
      '<span class="chip-label">' + C.inputs.gp.label + '</span>' +
      cfg.planets.map(function (pl) {
        return '<span class="factor factor-named">' + pl.short + ' ' + times(pl.gp) + '</span>';
      }).join('<span class="chip-vs">vs</span>') + '</span>';
    var sameChips = chipsHTML(['dg', 'R', 'k'].map(function (k) { return { key: k, factor: 1, fixedText: 'Same' }; }));
    var compare = '<div class="inputs-block compare-inputs' + (cue && cue.inputs ? ' cue' : '') + '">' +
      '<div><p class="mini-label">' + cfg.diffLabel + '</p><div class="chips">' + gpChip + '</div></div>' +
      '<div><p class="mini-label">' + cfg.sameLabel + '</p><div class="chips">' + sameChips + '</div></div>' +
      '</div>' +
      '<p class="values-note">' + I.info + '<span>' + cfg.sameNote + '</span></p>';
    var stage = '<div class="stage-inner">' + subnavHTML(function (cid, i) { return 'Challenge ' + (i + 1); }) +
      compare +
      '<div class="mini-planets">' + figs + '</div>' +
      '<p class="values-note">' + I.info + '<span>' + C.crewCombined.valuesNote + '</span></p></div>';

    var head = headHTML({
      eyebrow: cfg.eyebrow, badge: attemptBadge(at),
      heading: 'A crewmate says: “' + cfg.claim + '”', prompt: cfg.prompt
    });
    var eqHl = cue && cue.eq ? cue.eq : [];
    var body;
    if (!answered) {
      body = hintPanelHTML(id) +
        radiosHTML('crew-stance', cfg.stances, a.draft.stance, { srLegend: 'Do you agree with the crewmate?' }) +
        '<div class="field"><label class="field-label" for="crew-expl">Your explanation</label>' +
        '<textarea id="crew-expl" rows="4" maxlength="800" placeholder="What does Δg do? What does gₚ do?" data-input="crew-expl" data-fk="crew-expl">' + esc(a.draft.text || '') + '</textarea></div>' +
        (eqHl.length ? eqCard(eqHl) : '') +
        actionsHTML(btn('Submit to crew', 'crew2-submit', { fk: 'primary', submit: true, disabled: !canSubmit(id, a) }) +
          '<p class="helper" id="submit-helper">Choose agree or disagree and write a short explanation.</p>');
    } else {
      var ok = at.outcome.stanceCorrect;
      var fb = ok
        ? feedbackHTML('correct', cfg.correctTitle, '<p>' + cfg.correctBody + '</p>')
        : feedbackHTML('notyet', cfg.notYetTitle, '<p>' + cfg.agreeFeedback + '</p>');
      var sc = at.selfCheck || {};
      var checks = '<fieldset class="choices self-check"><legend class="q">Check your explanation against the crew note</legend>' +
        cfg.selfCheck.map(function (c) {
          return '<label class="choice"><input type="checkbox" data-change="self-check" data-key="' + c.id + '" data-fk="sc-' + c.id + '"' + (sc[c.id] ? ' checked' : '') + '><span>' + c.html + '</span></label>';
        }).join('') + '<p class="note">Optional and private to this browser — it helps you compare, it isn’t a score.</p></fieldset>';
      body = hintPanelHTML(id) +
        radiosHTML('crew-stance', cfg.stances, at.stance, { locked: true }) + fb +
        quoteHTML('Your explanation', at.explanation) +
        '<div class="crew-note"><p class="mini-label">Crew note</p><p>' + cfg.expert + '</p></div>' + checks +
        actionsHTML(btn('Continue: back to the film', 'continue', { fk: 'primary' }),
          btn('Revise my answer', 'fresh-attempt', { kind: 'secondary', fk: 'fresh' }));
    }
    return { stage: stage, head: head, body: body };
  };

  /* ---------------- G1. Film ending (plays by default before the debrief) ---------------- */
  function endingDone() {
    var e = state.video.ending;
    return !!(e.reachedEndAt || e.skippedAt || e.fallbackShownAt);
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
        : '<button type="button" class="video-start" data-action="ending-play" data-fk="ending-play">' +
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
      eyebrow: F.eyebrow, heading: F.heading, hint: false,
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
    return '<ul class="ev-list">' + C.evidence.map(function (ev) {
      return hasEvidence(ev.id)
        ? '<li class="ev-entry found">' + I.check + '<span>' + ev.html + '</span></li>'
        : '<li class="ev-entry locked">' + I.lock + '<span>Not found yet</span></li>';
    }).join('') + '</ul>';
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
      '<div><dt>Completed independently</dt><dd>' + sm.independent + '</dd></div>' +
      '<div><dt>Completed with support</dt><dd>' + sm.withSupport + '</dd></div>' +
      '<div><dt>Continued after feedback</dt><dd>' + sm.continuedAfterFeedback + '</dd></div>' +
      (sm.notCompleted ? '<div><dt>Not yet completed</dt><dd>' + sm.notCompleted + '</dd></div>' : '') +
      '<div><dt>Hints viewed</dt><dd>' + sm.hintsViewed + '</dd></div>' +
      '<div><dt>Active time</dt><dd>' + fmtDuration(state.activeMs) + '</dd></div>' +
      '</dl><p class="tiny">“Independently” means right on the first attempt without hints. Hints and retries are always fine — they’re just recorded separately.</p>' +
      '<p class="tiny">The session record stays in this browser. Nothing is sent automatically.</p>' +
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
      case 'crewExplain': return !!d.stance && !!(d.text && d.text.trim());
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
      track.setAttribute('aria-valuetext', has ? f(v) + ' metres' : 'No prediction yet');
    }
    if (input && document.activeElement !== input) input.value = has ? f(v) : '';
    var verb = typeOf(id) === 'experiment' ? 'run' : 'submit';
    if (helper) helper.textContent = predHelperText(v, verb);
    if (sHelper && verb === 'run') sHelper.textContent = has ? 'Results stay hidden until you run it.' : 'Make a prediction to unlock the experiment.';
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

  function runTweens(root) {
    root.querySelectorAll('ellipse[data-from-rx]').forEach(function (el) {
      var fx = +el.getAttribute('data-from-rx'), fy = +el.getAttribute('data-from-ry');
      var tx = +el.getAttribute('rx'), ty = +el.getAttribute('ry');
      el.setAttribute('rx', fx); el.setAttribute('ry', fy);
      tween(900, function (k) {
        el.setAttribute('rx', (fx + (tx - fx) * k).toFixed(1));
        el.setAttribute('ry', (fy + (ty - fy) * k).toFixed(1));
      });
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
          var where = narrowQuery.matches ? 'below' : 'on the right';
          setVideoStatus('Excerpt finished. Log your first idea ' + where + '.');
          announce('Excerpt finished. Log your first idea.');
          els.body.classList.add('pulse');
          window.setTimeout(function () { els.body.classList.remove('pulse'); }, 1600);
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
          setEndingStatus('Scene finished. Continue to the debrief ' + where + '.');
          announce('Scene finished. Continue to the debrief.');
          els.body.classList.add('pulse');
          window.setTimeout(function () { els.body.classList.remove('pulse'); }, 1600);
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
    if (curId() === 'film-ending') {
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
    var cur = scr ? 'screen:' + scr : state.pos.step + ':' + state.pos.sub;
    function opt(value, label) {
      return '<option value="' + value + '"' + (value === cur ? ' selected' : '') + '>' + esc(label) + '</option>';
    }
    var options = opt('screen:intro', 'Start screen') +
      C.steps.map(function (st, i) {
        return '<optgroup label="' + (i + 1) + '. ' + esc(st.label) + '">' +
          st.activities.map(function (id, j) { return opt(i + ':' + j, C.activityLabels[id] || id); }).join('') + '</optgroup>';
      }).join('') +
      opt('screen:complete', 'Mission complete screen');
    return '<p class="devbar-tag"><svg class="ic" viewBox="0 0 20 20" aria-hidden="true"><path d="M7 6l-4 4 4 4M13 6l4 4-4 4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg><span>Developer mode</span></p>' +
      '<label class="devbar-label" for="dev-jump">Jump to</label>' +
      '<select id="dev-jump" class="devbar-select" data-fk="dev-jump">' + options + '</select>' +
      '<button type="button" class="btn btn-sm btn-secondary" data-action="dev-jump" data-fk="dev-go">Go</button>' +
      '<p class="devbar-note">All sections unlocked. Jumps are noted in the session export.</p>' +
      '<button type="button" class="btn btn-sm btn-ghost devbar-off" data-action="dev-toggle" data-fk="dev-off">Turn off</button>';
  }

  function renderDevbar() {
    document.body.classList.toggle('dev-on', DEV.on);
    els.devBtn.setAttribute('aria-pressed', String(DEV.on));
    els.devbar.hidden = !DEV.on;
    patch(els.devbar, DEV.on ? devbarHTML() : '');
  }

  function devJump(value) {
    noteDevUse();
    state.devMode.jumps.push({ to: value, at: nowISO() });
    ui.confirmReset = false;
    if (value === 'screen:intro' || value === 'screen:complete') {
      destroyPlayers();
      ui.screen = value.slice(7);
      save();
      render({ focusHead: true, scrollTop: true });
      return;
    }
    var parts = value.split(':');
    ui.screen = null;
    if (!state.introSeenAt) state.introSeenAt = nowISO();
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
    els.evCount.textContent = state.evidence.length + '/' + C.evidence.length;
    if (ui.lastEv != null && state.evidence.length > ui.lastEv) replayClass(document.getElementById('evidence-btn'), 'bump', 700);
    ui.lastEv = state.evidence.length;
    document.getElementById('evidence-btn').setAttribute('aria-label', 'Evidence log, ' + state.evidence.length + ' of ' + C.evidence.length + ' found');
  }

  /* The model equation is a learner reference on every task. It is drawn in one fixed place,
     at the top of the model view right above the diagram (see formulaHTML and render). */

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
  function currentScreen() {
    if (ui.screen === 'intro' || introPending()) return 'intro';
    if (ui.screen === 'complete' && (state.completedAt || DEV.on)) return 'complete';
    return null;
  }

  var SCREEN_ART =
    '<svg class="screen-art" viewBox="0 0 400 150" aria-hidden="true" focusable="false">' +
    '<circle cx="64" cy="75" r="50" fill="none" stroke="' + COL.dg + '" stroke-opacity=".18" stroke-width="10"/>' +
    '<circle cx="64" cy="75" r="36" fill="#000" stroke="' + COL.dg + '" stroke-width="3"/>' +
    '<path d="M112 75H176" stroke="#8a8a8a" stroke-width="2" stroke-dasharray="3 6" stroke-linecap="round"/>' +
    '<ellipse cx="286" cy="75" rx="98" ry="58" fill="' + COL.ocean + '" stroke="#fff" stroke-width="2"/>' +
    '<circle cx="286" cy="75" r="52" fill="#4a3a2c"/>' +
    '<circle cx="286" cy="75" r="52" fill="none" stroke="#000" stroke-opacity=".35" stroke-width="2"/>' +
    '</svg>';

  function summaryCardsHTML() {
    return '<div class="summary-cards">' + C.debrief.summary.map(function (s) {
      return '<div class="sum-card sum-' + s.key + '"><p class="sum-title"><span class="sw sw-' + s.key + '" aria-hidden="true"></span><span>' + s.title + '</span></p>' +
        '<p class="sum-result">' + (s.dir === 'up' ? I.up : I.down) + '<span>' + s.result + '</span></p><p class="sum-note">' + s.note + '</p></div>';
    }).join('') + '</div>';
  }

  var SCREENS = {
    intro: function () {
      var T = C.intro;
      var factIcons = [I.clock, I.sound, I.check];
      return '<div class="screen-inner intro">' + SCREEN_ART +
        '<p class="screen-eyebrow">' + T.eyebrow + '</p>' +
        '<h1 id="screen-heading" class="screen-title" tabindex="-1">' + T.title + '</h1>' +
        '<p class="screen-lede">' + T.lede + '</p>' +
        '<ul class="intro-facts">' + T.facts.map(function (t, i) { return '<li>' + (factIcons[i] || I.info) + '<span>' + t + '</span></li>'; }).join('') + '</ul>' +
        '<div class="intro-goal"><p class="mini-label">' + T.goalLabel + '</p><p>' + T.goal + '</p></div>' +
        '<div class="intro-loop"><p class="mini-label">' + T.loopLabel + '</p><ol class="loop">' +
        T.loop.map(function (t) { return '<li>' + t + '</li>'; }).join('') + '</ol></div>' +
        '<div class="screen-actions">' + btn(T.start, 'start-mission', { fk: 'start-mission' }) + '</div>' +
        '<p class="note screen-note">' + T.note + '</p></div>';
    },
    complete: function () {
      var T = C.complete;
      return '<div class="screen-inner complete">' +
        '<p class="complete-badge">' + I.check + '</p>' +
        '<p class="screen-eyebrow">' + T.eyebrow + '</p>' +
        '<h1 id="screen-heading" class="screen-title" tabindex="-1">' + T.title + '</h1>' +
        '<p class="screen-lede">' + T.lede + '</p>' +
        '<h2 class="screen-section">' + T.foundLabel + '</h2>' + summaryCardsHTML() +
        '<dl class="complete-stats">' +
        '<div><dt>' + T.evidenceLabel + '</dt><dd>' + state.evidence.length + ' of ' + C.evidence.length + '</dd></div>' +
        '<div><dt>' + T.timeLabel + '</dt><dd>' + fmtDuration(state.activeMs) + '</dd></div></dl>' +
        '<div class="screen-actions row">' + btn(T.review, 'hide-screen', { kind: 'secondary', fk: 'c-review' }) +
        btn(T.restart, 'reset-ask', { kind: 'ghost', fk: 'c-reset' }) + '</div>' +
        (ui.confirmReset && !els.dialog.open ? confirmResetHTML() : '') +
        researchHTML('c-export') + '</div>';
    }
  };

  function renderScreen(scr, opts, prevKey) {
    renderTopbar();
    patch(els.screen, SCREENS[scr]());
    if (opts.scrollTop) window.scrollTo(0, 0);
    var target = null;
    if (opts.focusHead) target = document.getElementById('screen-heading');
    else if (opts.focus) target = els.screen.querySelector(opts.focus) || document.querySelector(opts.focus);
    else if (prevKey && !els.screen.contains(document.activeElement)) target = els.screen.querySelector('[data-fk="' + prevKey + '"]');
    if (target && !target.disabled) target.focus({ preventScroll: !opts.focusHead });
  }

  function render(opts) {
    opts = opts || {};
    var active = document.activeElement;
    var prevKey = active && active.getAttribute ? active.getAttribute('data-fk') : null;
    var scr = currentScreen();
    document.body.setAttribute('data-screen', scr || 'none');
    els.app.hidden = !!scr;
    els.screen.hidden = !scr;
    if (scr) { ui.nav = null; renderScreen(scr, opts, prevKey); runEnters(); return; }
    if (els.screen.__html) { els.screen.innerHTML = ''; els.screen.__html = null; }
    var id = curId();
    var a = act(id);
    ui.eq = null;
    var view = VIEWS[typeOf(id)](id, a);
    var animating = ui.animate;
    ui.animate = null;

    document.body.setAttribute('data-step', C.steps[state.pos.step].id);
    renderTopbar();
    patch(els.stage, view.stage);
    patch(els.head, view.head);
    patch(els.body, view.body);
    patch(els.formula, formulaHTML(ui.eq && ui.eq.hl, ui.eq && ui.eq.note));
    els.stageScroll.style.setProperty('--formula-h', els.formula.offsetHeight + 'px');
    if (view.after) view.after(animating);
    if (ui.nav) {
      // Forward slides in from the right, back from the left; the diagram cross-fades.
      var slide = ui.nav === 'fade' ? 'nav-fade' : ui.nav === 'back' ? 'nav-back' : 'nav-fwd';
      replayClass(els.head, slide, 450);
      replayClass(els.body, slide, 450);
      replayClass(els.stage, 'nav-fade', 450);
      ui.nav = null;
    }
    runEnters();

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

  /* ---------------- evidence dialog ---------------- */
  function renderDialog() {
    els.dialogBody.innerHTML =
      '<div class="dialog-head"><h2 id="evidence-title">Evidence log</h2>' +
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
      createdAt: state.createdAt,
      updatedAt: state.updatedAt,
      completedAt: state.completedAt,
      elapsed: {
        wallClockMs: Date.now() - Date.parse(state.createdAt),
        activeVisibleMs: state.activeMs
      },
      firstIdea: state.firstIdea,
      video: state.video,
      evidence: state.evidence.slice(),
      summary: summary(),
      devMode: state.devMode || null,
      activities: acts,
      note: 'Stored only in this browser (localStorage). This file is not sent anywhere automatically. ' +
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
    link.download = 'tidal-forecast-session-' + state.sessionId.slice(0, 8) + '.json';
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
    announce('Session record exported as a JSON file.');
  }

  function resetAll() {
    destroyPlayers();
    try { window.localStorage.removeItem(C.storageKey); } catch (_) { /* ignore */ }
    state = freshState();
    if (DEV.on) noteDevUse();
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
    'goto-step': function (el) {
      var i = +el.getAttribute('data-step');
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
      try {
        if (DEV.on) window.localStorage.setItem(DEV_KEY, '1'); else window.localStorage.removeItem(DEV_KEY);
      } catch (_) { /* ignore */ }
      if (DEV.on) noteDevUse();
      if (!DEV.on && ui.screen === 'intro' && !introPending()) ui.screen = null;
      save();
      render({ focus: DEV.on ? '#dev-jump' : '#dev-btn' });
      announce(DEV.on ? 'Developer mode on. All sections are unlocked.' : 'Developer mode off.');
    },
    'dev-jump': function () {
      var sel = document.getElementById('dev-jump');
      if (sel) devJump(sel.value);
    },
    'continue': function () { completeActivity(curId()); advance(); },

    /* hints */
    'hint-toggle': function () {
      var id = curId();
      if (ui.hint && ui.hint.act === id) { ui.hint = null; render({ focus: '[data-fk="hint-btn"]' }); return; }
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

    /* briefing */
    'video-play': function () { startOpeningVideo(); },
    'video-retry': function () { startOpeningVideo(); },
    'video-skip': function () {
      destroyPlayers();
      state.video.opening.skippedAt = nowISO();
      ui.video = 'idle';
      render({ focus: '#first-idea' });
      announce('Video skipped. Log your first idea.');
    },
    'video-summary': function () { state.video.opening.skippedAt = state.video.opening.skippedAt || nowISO(); showVideoFallback('chosen'); },
    'video-continue': function () {
      var t = document.getElementById('first-idea') || document.querySelector('[data-fk="primary"]');
      if (t) t.focus();
    },
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
      if (a.phase !== 'awaiting' || a.draft.prediction == null) return;
      var at = attempt(a);
      var res = experimentResult(id, at);
      at.prediction = a.draft.prediction;
      at.predictedAt = nowISO();
      at.result = res.h;
      at.predictionOutcome = M.classifyPrediction(at.prediction, res.h, BASE);
      a.phase = 'result';
      ui.animate = id;
      ui.hint = null;
      render({ focusHead: true });
      announce('Model result: ' + f(res.h) + ' metres. You predicted ' + f(at.prediction) + ' metres.');
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
      addEvidence(C.experiments[id].evidence, id);
      ui.hint = null;
      render({ focusHead: true });
      announce(experimentFeedback(id, at).title);
    },
    'fresh-attempt': function () {
      var a = act(curId());
      startAttempt(a);
      ui.hint = null;
      render({ focusHead: true });
      announce('Fresh attempt' + (typeOf(a.id) === 'crewExplain' ? '.' : ' with new values.') + ' Your earlier answers are kept.');
    },
    'worked': function () {
      var id = curId();
      var a = act(id);
      a.workedSolutionViewedAt = nowISO();
      a.phase = 'worked';
      var t = typeOf(id);
      if (t === 'experiment') addEvidence(C.experiments[id].evidence, id);
      if (t === 'sensor') addEvidence('ev-uniform', id);
      if (t === 'planets') addEvidence(C.planets.evidence, id);
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
      addEvidence('ev-uniform', 'sensor');
      ui.hint = null;
      render({ focusHead: true });
      announce(at.outcome.overall === 'correct' ? 'Correct — the bulge stays at 4 metres.' : 'The bulge stays at 4 metres. See the feedback.');
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
      announce('Model result: ' + f(at.result) + ' metres. You predicted ' + f(at.prediction) + ' metres.');
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
      addEvidence(C.planets.evidence, 'planets');
      ui.animate = 'planets';
      ui.hint = null;
      render({ focusHead: true });
      announce('Results revealed. Planet ' + smallestId + ' has the smallest modelled bulge.');
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
      announce('Model result: ' + f(h) + ' metres. You predicted ' + f(at.prediction) + ' metres.');
    },
    'crew2-submit': function () {
      var a = act('crew-explain');
      if (!canSubmit('crew-explain', a)) return;
      var at = attempt(a);
      at.stance = a.draft.stance;
      at.explanation = a.draft.text.trim();
      at.submittedAt = nowISO();
      var ok = at.stance === 'disagree';
      at.outcome = { stanceCorrect: ok, explanationScored: false, overall: ok ? 'correct' : 'not-yet' };
      a.phase = 'feedback';
      ui.hint = null;
      render({ focusHead: true });
      announce(ok ? C.crewExplain.correctTitle : C.crewExplain.notYetTitle);
    },

    /* debrief & session */
    'finish': function () {
      completeActivity('debrief');
      state.completedAt = nowISO();
      ui.screen = 'complete';
      save();
      render({ focusHead: true, scrollTop: true });
      announce('Mission complete.');
    },
    'start-mission': function () {
      ui.screen = null;
      ui.nav = 'fade';
      state.introSeenAt = nowISO();
      save();
      render({ focusHead: true, scrollTop: true });
    },
    'show-complete': function () {
      ui.screen = 'complete';
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
    'close-evidence': function () { els.dialog.close(); }
  };

  function setMap(k, val) {
    var a = act(curId());
    a.draft.map = a.draft.map || {};
    a.draft.map[k] = val;
    render();
  }

  var changes = {
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
    'mixed-pred': function (el) { act(curId()).draft.pred = el.value; render(); },
    'est': function (el) {
      var a = act('planets');
      a.draft.estimates = a.draft.estimates || {};
      a.draft.estimates[el.getAttribute('data-planet')] = el.value === '' ? null : parseFloat(el.value);
      render();
    },
    'planet-smallest': function (el) { act('planets').draft.smallest = el.value; render(); },
    'planet-reason': function (el) { act('planets').draft.reason = el.value; render(); },
    'crew-stance': function (el) { act('crew-explain').draft.stance = el.value; render(); },
    'self-check': function (el) {
      var at = attempt(act('crew-explain'));
      at.selfCheck = at.selfCheck || {};
      at.selfCheck[el.getAttribute('data-key')] = el.checked;
      save();
    }
  };

  var inputs = {
    'first-idea': function (el) { act('briefing').draft.text = el.value; syncSubmitState(); save(); },
    'crew-reason': function (el) { act('crew-combined').draft.reason = el.value; syncSubmitState(); save(); },
    'crew-expl': function (el) { act('crew-explain').draft.text = el.value; syncSubmitState(); save(); },
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
    track.focus({ preventScroll: true });
    predFromPointer(track, e);
  });
  document.addEventListener('pointermove', function (e) { if (drag && e.pointerId === drag.id) predFromPointer(drag.track, e); });
  function endDrag(e) { if (drag && e.pointerId === drag.id) { drag = null; save(); } }
  document.addEventListener('pointerup', endDrag);
  document.addEventListener('pointercancel', endDrag);

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

  // Minimal hooks for automated testing; read-only views of state.
  window.TFM = {
    getState: function () { return JSON.parse(JSON.stringify(state)); },
    buildRecord: buildRecord,
    model: M
  };
}());
