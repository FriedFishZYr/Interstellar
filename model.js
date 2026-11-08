/*
 * Tidal Forecast Mission — calculation logic (no DOM).
 *
 * Simplified tidal-height model:      h = k × (Δg / gₚ) × R
 * Implemented as normalised ratios:   h / h₀ = (Δg / Δg₀) × (gₚ₀ / gₚ) × (R / R₀)
 *
 * Every input is an isolated model input. Changing R never recalculates Δg or gₚ,
 * and k is constant, so it cancels out of every ratio.
 *
 * Works in the browser (window.TFMModel) and in Node (module.exports) for tests.
 */
(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.TFMModel = api;
}(typeof window !== 'undefined' ? window : null, function () {
  'use strict';

  var TOLERANCE = 0.01; // metres; predictions within this of the model count as matching

  function positive(name, value) {
    if (typeof value !== 'number' || !isFinite(value) || value <= 0) {
      throw new RangeError(name + ' must be a positive, finite number (got ' + value + ')');
    }
    return value;
  }

  function round(x, places) {
    var p = Math.pow(10, places === undefined ? 4 : places);
    return Math.round((x + (x >= 0 ? Number.EPSILON : -Number.EPSILON)) * p) / p;
  }

  /**
   * h / h₀ for inputs given as ratios to the baseline (1 = unchanged).
   * @param {{dg?:number, gp?:number, R?:number}} r
   */
  function heightRatio(r) {
    r = r || {};
    var dg = positive('dg', r.dg === undefined ? 1 : r.dg);
    var gp = positive('gp', r.gp === undefined ? 1 : r.gp);
    var R = positive('R', r.R === undefined ? 1 : r.R);
    return round((dg / gp) * R, 6);
  }

  /** Modelled height in metres from a baseline height h₀ (default 4 m). */
  function modelHeight(r, h0) {
    var base = positive('h0', h0 === undefined ? 4 : h0);
    return round(base * heightRatio(r), 4);
  }

  /** Full near-to-far difference in external acceleration: Δg = a_near − a_far. */
  function deltaG(readings) {
    return round(readings.near - readings.far, 6);
  }

  /** Add the same external acceleration at every location (a uniform change). */
  function addUniform(readings, amount) {
    return {
      near: round(readings.near + amount, 6),
      centre: round(readings.centre + amount, 6),
      far: round(readings.far + amount, 6)
    };
  }

  /**
   * Height after a change in the external readings, with gₚ and R held fixed
   * (or set explicitly through `fixed`).
   */
  function heightAfterReadings(before, after, h0, fixed) {
    fixed = fixed || {};
    var ratio = deltaG(after) / positive('Δg before', deltaG(before));
    return modelHeight({ dg: ratio, gp: fixed.gp || 1, R: fixed.R || 1 }, h0);
  }

  /** 'up' | 'down' | 'same' for a value compared with a reference. */
  function direction(value, reference) {
    var d = value - reference;
    if (Math.abs(d) < 1e-6) return 'same';
    return d > 0 ? 'up' : 'down';
  }

  /**
   * Classify a numeric prediction against the model.
   *  - 'correct'  : within TOLERANCE of the modelled value
   *  - 'partly'   : wrong value, but the right direction of change from baseline
   *  - 'not-yet'  : wrong direction (or predicted no change when there was one, etc.)
   */
  function classifyPrediction(predicted, actual, baseline) {
    if (typeof predicted !== 'number' || !isFinite(predicted)) return 'not-yet';
    if (Math.abs(predicted - actual) <= TOLERANCE) return 'correct';
    var da = direction(actual, baseline);
    var dp = direction(predicted, baseline);
    if (da !== 'same' && da === dp) return 'partly';
    return 'not-yet';
  }

  /** Compact number for display: 2 → "2", 0.5 → "0.5", 1.3333 → "1.33". */
  function fmt(x) {
    return String(round(x, 2));
  }

  function fmtFactor(x) {
    return '×' + fmt(x);
  }

  return {
    TOLERANCE: TOLERANCE,
    round: round,
    heightRatio: heightRatio,
    modelHeight: modelHeight,
    deltaG: deltaG,
    addUniform: addUniform,
    heightAfterReadings: heightAfterReadings,
    direction: direction,
    classifyPrediction: classifyPrediction,
    fmt: fmt,
    fmtFactor: fmtFactor
  };
}));
