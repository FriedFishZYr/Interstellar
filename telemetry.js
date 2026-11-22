/*
 * Tidal Forecast Mission — event log and data sender (Supabase).
 *
 * Two kinds of data go to the Supabase project set in study-content.js:
 *   events             one row per interaction: clicks, changes, drags, page views, test answers,
 *                      visibility changes. Sent in small batches every few seconds.
 *   session_snapshots  the whole session record (the same JSON as "Export session"), sent at
 *                      milestones. The latest snapshot per session is the one to analyze.
 *
 * Nothing is sent until the app enables the log (after the learner agrees to take part), and
 * nothing is ever sent if no Supabase URL is configured. Unsent events wait in localStorage and
 * go out on the next visit. Free text typed by the learner is not copied into events (only its
 * length): the text itself is in the session record.
 */
(function () {
  'use strict';

  var CFG = (window.TFM_STUDY && window.TFM_STUDY.supabase) || {};
  var OUTBOX_KEY = (window.TFM_STUDY && window.TFM_STUDY.outboxKey) || 'tfm.outbox.v1';
  var CONFIGURED = !!(CFG.url && CFG.key);
  var BATCH = 200;            // events per request
  var KEEPALIVE_MAX = 60000;  // bytes: browsers cap keepalive requests at 64 KB in flight
  var FLUSH_MS = 4000;
  var MAX_QUEUE = 20000;

  var ctx = { participantId: null, sessionId: null, condition: null, moduleVersion: null, dev: false };
  var enabled = false;
  var seq = 0;
  var page = null;
  var queue = [];             // events waiting to be sent (oldest first)
  var pendingSnap = null;     // the latest snapshot that has not been sent yet
  var inFlight = false;
  var backoff = 0;
  var stats = { eventsSent: 0, snapshotsSent: 0, lastError: null, lastSentAt: null };

  function nowISO() { return new Date().toISOString(); }

  /* ---------------- outbox (survives a reload or a closed tab) ---------------- */
  function loadOutbox() {
    try {
      var raw = window.localStorage.getItem(OUTBOX_KEY);
      if (!raw) return;
      var o = JSON.parse(raw);
      if (o && Array.isArray(o.events)) queue = o.events.concat(queue);
      if (o && o.snapshot && !pendingSnap) pendingSnap = o.snapshot;
      if (o && o.seq) seq = Math.max(seq, o.seq);
    } catch (_) { /* storage blocked or damaged: start empty */ }
  }
  var saveTimer = null;
  function saveOutbox(now) {
    // With no Supabase project set, events stay in memory only (for checking the log locally).
    if (!CONFIGURED) { if (queue.length > 2000) queue.splice(0, queue.length - 2000); return; }
    function write() {
      saveTimer = null;
      try {
        // Kept even when empty: seq must keep counting across page loads (seq is what tells
        // a duplicate from a new event).
        window.localStorage.setItem(OUTBOX_KEY, JSON.stringify({ events: queue, snapshot: pendingSnap, seq: seq }));
      } catch (_) { /* storage full or blocked: the data stays in memory for this page */ }
    }
    if (now) { if (saveTimer) window.clearTimeout(saveTimer); write(); return; }
    if (!saveTimer) saveTimer = window.setTimeout(write, 1000);
  }

  /* ---------------- recording ---------------- */
  function row(type, data) {
    seq += 1;
    return {
      participant_id: ctx.participantId,
      session_id: ctx.sessionId,
      condition: ctx.condition,
      module_version: ctx.moduleVersion,
      dev: !!ctx.dev,
      seq: seq,
      client_time: nowISO(),
      type: type,
      page: page,
      data: data || {}
    };
  }

  function event(type, data) {
    if (!enabled) return;
    queue.push(row(type, data));
    if (queue.length > MAX_QUEUE) queue.splice(0, queue.length - MAX_QUEUE);
    saveOutbox(false);
  }

  function setPage(key, data) {
    if (key === page) return;
    var from = page;
    page = key;
    event('page', Object.assign({ from: from }, data || {}));
    flush(false);
  }

  function snapshot(reason, record) {
    if (!enabled) return;
    pendingSnap = {
      participant_id: ctx.participantId,
      session_id: ctx.sessionId,
      condition: ctx.condition,
      module_version: ctx.moduleVersion,
      dev: !!ctx.dev,
      reason: reason,
      client_time: nowISO(),
      record: record
    };
    saveOutbox(true);
    // The page is being hidden or closed: send it now, with keepalive.
    if (document.visibilityState === 'hidden') sendSnapshotFinal();
    else flush(false);
  }

  /* ---------------- sending ---------------- */
  function headers() {
    var h = { 'Content-Type': 'application/json', apikey: CFG.key, Prefer: 'return=minimal' };
    // Older anon keys are JWTs and also go in Authorization; new publishable keys don't.
    if (/^eyJ/.test(CFG.key)) h.Authorization = 'Bearer ' + CFG.key;
    return h;
  }
  function post(table, body, keepalive) {
    return window.fetch(CFG.url.replace(/\/+$/, '') + '/rest/v1/' + table, {
      method: 'POST', headers: headers(), body: body, keepalive: !!keepalive, mode: 'cors', credentials: 'omit'
    }).then(function (res) {
      if (!res.ok) return res.text().then(function (t) { throw new Error(res.status + ' ' + t.slice(0, 200)); });
    });
  }

  function flush(final) {
    if (!enabled || !CONFIGURED || !window.fetch) return;
    if (final) { flushFinal(); return; }
    if (inFlight) return;
    var snap = pendingSnap;
    var batch = queue.slice(0, BATCH);
    if (!snap && !batch.length) return;
    inFlight = true;
    var jobs = [];
    if (snap) {
      jobs.push(post(CFG.snapshotsTable, JSON.stringify(snap)).then(function () {
        if (pendingSnap === snap) pendingSnap = null;
        stats.snapshotsSent += 1;
      }));
    }
    if (batch.length) {
      jobs.push(post(CFG.eventsTable, JSON.stringify(batch)).then(function () {
        var i = queue.indexOf(batch[batch.length - 1]);
        queue.splice(0, i + 1);
        stats.eventsSent += batch.length;
      }));
    }
    Promise.all(jobs).then(function () {
      backoff = 0;
      stats.lastError = null;
      stats.lastSentAt = nowISO();
    }, function (err) {
      backoff = Math.min(60000, backoff ? backoff * 2 : 5000);
      stats.lastError = String(err && err.message || err);
    }).then(function () {
      inFlight = false;
      saveOutbox(true);
      if (queue.length > BATCH && !backoff) flush(false);
    });
  }

  var finalSnap = null; // the snapshot already handed to a keepalive request
  function sendSnapshotFinal() {
    if (!enabled || !CONFIGURED || !window.fetch || !pendingSnap) return;
    var snap = pendingSnap;
    var s = JSON.stringify(snap);
    if (s.length > KEEPALIVE_MAX * 0.7) return; // too big for keepalive: it goes out on the next visit
    finalSnap = snap;
    post(CFG.snapshotsTable, s, true).then(function () {
      if (pendingSnap === snap) { pendingSnap = null; saveOutbox(true); }
      stats.snapshotsSent += 1;
    }, function () {});
  }

  // The page is closing: hand what fits to the browser with keepalive, which lets the request
  // finish after the page is gone. What doesn't fit stays in the outbox for the next visit.
  function flushFinal() {
    saveOutbox(true);
    var budget = KEEPALIVE_MAX;
    if (pendingSnap === finalSnap) budget -= JSON.stringify(finalSnap).length;
    else if (pendingSnap) {
      var s = JSON.stringify(pendingSnap);
      if (s.length < budget * 0.7) {
        post(CFG.snapshotsTable, s, true).catch(function () {});
        budget -= s.length;
      }
    }
    if (queue.length) {
      var take = [];
      var size = 2;
      for (var i = 0; i < queue.length && i < BATCH; i++) {
        var len = JSON.stringify(queue[i]).length + 1;
        if (size + len > budget) break;
        take.push(queue[i]);
        size += len;
      }
      if (take.length) post(CFG.eventsTable, JSON.stringify(take), true).catch(function () {});
    }
    // Whatever was just sent may arrive twice if the outbox is resent on a later visit; rows
    // carry participant_id, session_id and seq, so duplicates are easy to drop in analysis.
  }

  var timer = null;
  function tickLoop() {
    timer = window.setTimeout(function () {
      if (!backoff) flush(false);
      else backoff = Math.max(0, backoff - FLUSH_MS);
      tickLoop();
    }, FLUSH_MS);
  }

  /* ---------------- automatic capture ---------------- */
  function clip(s, n) {
    s = String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
    return s.length > n ? s.slice(0, n - 1) + '…' : s;
  }
  function describe(el) {
    if (!el || !el.getAttribute) return null;
    var d = { tag: el.tagName.toLowerCase() };
    ['data-action', 'data-fk', 'data-change', 'data-input', 'data-id', 'data-step', 'data-sub', 'data-part', 'data-key', 'name', 'role', 'id'].forEach(function (a) {
      var v = el.getAttribute(a);
      if (v != null && v !== '') d[a.replace(/^data-/, '')] = clip(v, 60);
    });
    var label = el.getAttribute('aria-label') || el.textContent;
    if (label && !/^(input|select|textarea)$/.test(d.tag)) d.label = clip(label, 80);
    return d;
  }
  function valueOf(el) {
    var tag = el.tagName.toLowerCase();
    var type = (el.getAttribute('type') || '').toLowerCase();
    if (type === 'radio' || type === 'checkbox') return { value: el.value, checked: el.checked };
    if (tag === 'select') return { value: el.value };
    var v = String(el.value || '');
    // Numbers and short codes are kept; free text is reduced to its length.
    if (/^[\s\d.,+\-−eE×x*/]{0,24}$/.test(v)) return { value: v };
    return { length: v.length };
  }

  document.addEventListener('click', function (e) {
    if (!enabled) return;
    var el = e.target.closest && e.target.closest('[data-action], button, a, summary, label, input, select, [role="button"], [role="slider"], [role="tab"]');
    if (!el) return;
    // A click on a label also fires one on its input: keep only the input's.
    if (el.tagName === 'LABEL' && el.control) return;
    event('click', describe(el));
  }, true);

  document.addEventListener('change', function (e) {
    if (!enabled) return;
    var el = e.target;
    if (!el || !el.tagName || !/^(INPUT|SELECT|TEXTAREA)$/.test(el.tagName)) return;
    event('change', Object.assign(describe(el) || {}, valueOf(el)));
  }, true);

  var drag = null;
  document.addEventListener('pointerdown', function (e) {
    if (!enabled) return;
    var el = e.target.closest && e.target.closest('[role="slider"], .gauge-track, .rank-card, [data-drag]');
    if (el) drag = { el: describe(el), at: Date.now() };
  }, true);
  function endDrag() {
    if (!drag) return;
    event('drag', Object.assign({ ms: Date.now() - drag.at }, drag.el));
    drag = null;
  }
  document.addEventListener('pointerup', endDrag, true);
  document.addEventListener('pointercancel', endDrag, true);

  document.addEventListener('keydown', function (e) {
    if (!enabled) return;
    var t = e.target;
    if (!t || !t.closest) return;
    if (t.closest('[role="slider"], .gauge-track, .rank-card') && /^(Arrow|Page|Home|End)/.test(e.key)) {
      event('key', Object.assign({ key: e.key }, describe(t)));
    }
  }, true);

  // On window (the event bubbles up from document), so this runs after the app's own handler
  // has had a chance to add a final snapshot.
  window.addEventListener('visibilitychange', function () {
    event('visibility', { state: document.visibilityState });
    if (document.visibilityState === 'hidden') flush(true);
  });
  window.addEventListener('pagehide', function () { event('pagehide', {}); flush(true); });
  window.addEventListener('error', function (e) {
    event('error', { message: clip(e.message, 200), source: clip(e.filename, 120), line: e.lineno });
  });

  loadOutbox();
  tickLoop();

  window.TFMLog = {
    configured: CONFIGURED,
    configure: function (o) { Object.keys(o || {}).forEach(function (k) { ctx[k] = o[k]; }); },
    // enable(false) also drops anything not yet sent (a learner who declined); enable(false, true)
    // only stops recording and keeps the outbox (a tester turning developer mode off).
    enable: function (on, keepQueue) {
      enabled = !!on;
      if (!enabled && !keepQueue) { queue = []; pendingSnap = null; saveOutbox(true); }
      else if (enabled) flush(false);
    },
    isEnabled: function () { return enabled; },
    event: event,
    page: setPage,
    snapshot: snapshot,
    flush: function () { flush(false); },
    peek: function (n) { return JSON.parse(JSON.stringify(queue.slice(-(n || 50)))); },
    status: function () {
      return { configured: CONFIGURED, enabled: enabled, pendingEvents: queue.length, pendingSnapshot: !!pendingSnap,
        eventsSent: stats.eventsSent, snapshotsSent: stats.snapshotsSent, lastSentAt: stats.lastSentAt, lastError: stats.lastError };
    }
  };
}());
