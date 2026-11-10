// Run with: node --test tests/
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const M = require('../model.js');

const H0 = 4;

test('baseline is 4 m', () => {
  assert.equal(M.modelHeight({}, H0), 4);
});

test('double Δg, others fixed → double h (8 m)', () => {
  assert.equal(M.modelHeight({ dg: 2 }, H0), 8);
});

test('double gₚ, others fixed → halve h (2 m)', () => {
  assert.equal(M.modelHeight({ gp: 2 }, H0), 2);
});

test('double R with Δg and gₚ fixed → double h (8 m)', () => {
  assert.equal(M.modelHeight({ R: 2 }, H0), 8);
});

test('double both Δg and gₚ, R fixed → unchanged h (4 m)', () => {
  assert.equal(M.modelHeight({ dg: 2, gp: 2 }, H0), 4);
});

test('same amount added to all external accelerations → Δg and h unchanged', () => {
  const before = { near: 12, centre: 10, far: 8 };
  for (const amt of [3, 5, -2, 0.7]) {
    const after = M.addUniform(before, amt);
    assert.equal(M.deltaG(after), M.deltaG(before));
    assert.equal(M.heightAfterReadings(before, after, H0), 4);
  }
});

test('changing R does not recalculate Δg or gₚ (isolated inputs)', () => {
  // Only R appears in the ratio change; Δg and gₚ stay at 1 unless set explicitly.
  assert.equal(M.heightRatio({ R: 2 }), 2);
  assert.equal(M.heightRatio({ R: 2, dg: 1, gp: 1 }), 2);
});

test('planet comparison (spec): A 2×, B 0.5×, C 1×', () => {
  assert.equal(M.heightRatio({ dg: 2, gp: 1 }), 2);
  assert.equal(M.heightRatio({ dg: 2, gp: 4 }), 0.5);
  assert.equal(M.heightRatio({ dg: 0.5, gp: 0.5 }), 1);
});

test('crew challenge 1 (Miller’s planet): Δg ×2.6, gₚ ×1.3 → 8 m', () => {
  assert.equal(M.modelHeight({ dg: 2.6, gp: 1.3 }, H0), 8);
});

test('crew challenge 2: same orbit, Earth-gravity twin 10.4 m vs Miller’s planet 8 m', () => {
  assert.equal(M.modelHeight({ dg: 2.6, gp: 1 }, H0), 10.4);
  assert.equal(M.modelHeight({ dg: 2.6, gp: 1.3 }, H0), 8);
});

test('design-file check values: 9 m with gₚ ×3 → 3 m', () => {
  assert.equal(M.modelHeight({ gp: 3 }, 9), 3);
});

test('content variants all stay inside the 0–10 m gauge', () => {
  global.window = { TFMModel: M };
  require('../content.js');
  const C = global.window.TFM_CONTENT;
  for (const [id, e] of Object.entries(C.experiments)) {
    for (const x of e.variants) {
      const r = { dg: 1, gp: 1, R: 1 }; r[e.key] = x;
      const h = M.modelHeight(r, H0);
      assert.ok(h >= 0 && h <= C.gauge.max, `${id} ×${x} → ${h}`);
      // all variants move h in the same direction so explanation choices stay valid
      const dir = M.direction(h, H0);
      assert.equal(dir, e.key === 'gp' ? 'down' : 'up', `${id} ×${x}`);
    }
  }
  for (const v of C.crewCombined.variants) {
    const h = M.modelHeight(v, H0);
    assert.ok(h > 0 && h <= C.gauge.max && Math.abs(h * 2 - Math.round(h * 2)) < 1e-9, `crew ${JSON.stringify(v)} → ${h}`);
  }
  for (const set of C.planets.sets) {
    const hs = set.map(p => M.modelHeight(p, H0));
    assert.equal(new Set(hs).size, hs.length, 'unique heights so one planet is smallest');
    for (const p of set) assert.ok(C.planets.estimateOptions.includes(M.heightRatio(p)), `estimate option exists for ${p.id}`);
  }
  // Crew 1 must differ from the planet comparison and the formal test items' values.
  assert.notEqual(M.modelHeight(C.crewCombined.variants[0], H0), 4);
  // Miller's planet keeps the film's 130% gravity in every variant.
  for (const v of C.crewCombined.variants) assert.equal(v.gp, 1.3);
  // Film ending stays inside the video (259 s long).
  assert.ok(C.video.ending.start < C.video.ending.end && C.video.ending.end <= 259);
});

function loadContent() {
  if (!global.window || !global.window.TFM_CONTENT) {
    global.window = { TFMModel: M };
    require('../content.js');
  }
  return global.window.TFM_CONTENT;
}

test('quick checks: two different cases, both decreases, answers are offered', () => {
  const C = loadContent();
  const items = Object.entries(C.mixed.items);
  assert.equal(items.length, 2);
  const firstKeys = [];
  let decreases = 0, uniform = 0;
  for (const [id, item] of items) {
    assert.ok(C.steps.some(s => s.activities.includes(id)), `${id} is in a step`);
    assert.ok(C.scoredActivities.includes(id), `${id} is scored`);
    assert.ok(item.variants.length >= 2, `${id} has a fresh-attempt variant`);
    const keysPerVariant = item.variants.map(v => Object.keys(v.change).sort().join(','));
    // Fresh attempts practise the same input (or the same uniform case) with new values.
    assert.equal(new Set(keysPerVariant).size, 1, `${id} variants change the same input`);
    firstKeys.push(keysPerVariant[0]);
    for (const v of item.variants) {
      const keys = Object.keys(v.change);
      assert.ok(keys.length <= 1, `${id}: one input at a time`);
      const h = M.modelHeight(v.change, H0);
      assert.ok(C.mixed.heightOptions.includes(h), `${id}: ${h} m is one of the height options`);
      if (keys.length === 0) uniform++;
      if (keys.some(k => v.change[k] < 1)) decreases++;
      // The scenario must not name the symbol it changes — mapping it is the task.
      assert.ok(!/Δg|g<sub>p<\/sub>|gₚ/.test(v.scenario), `${id}: scenario doesn't name a symbol`);
    }
  }
  // Each check practises a different case.
  assert.equal(new Set(firstKeys).size, firstKeys.length);
  assert.ok(decreases >= 1, 'a gₚ decrease');
  assert.ok(uniform >= 1, 'a uniform change');
  assert.ok(/weaken/.test(C.mixed.items['mixed-2'].variants[0].scenario), 'first uniform check is a decrease');
});

test('Go deeper uses the full near-to-far Δg (4GMR/d³), matching the posttest', () => {
  const C = loadContent();
  const text = C.debrief.goDeeper.sections.map(s => s.html).join(' ');
  assert.ok(text.includes('4GMR / d³'));
  assert.ok(!text.includes('2GMR'));
});

test('classifyPrediction', () => {
  assert.equal(M.classifyPrediction(2, 2, 4), 'correct');
  assert.equal(M.classifyPrediction(3, 2, 4), 'partly');     // right direction
  assert.equal(M.classifyPrediction(6, 2, 4), 'not-yet');    // wrong direction
  assert.equal(M.classifyPrediction(4, 2, 4), 'not-yet');    // predicted no change
  assert.equal(M.classifyPrediction(5, 4, 4), 'not-yet');    // actual unchanged
  assert.equal(M.classifyPrediction(null, 4, 4), 'not-yet');
});

test('invalid inputs are rejected', () => {
  assert.throws(() => M.heightRatio({ gp: 0 }), RangeError);
  assert.throws(() => M.heightRatio({ dg: -1 }), RangeError);
  assert.throws(() => M.heightRatio({ R: NaN }), RangeError);
});
