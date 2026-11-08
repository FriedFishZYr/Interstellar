// End-to-end test in headless Chrome. Requires: npm i --no-save playwright-core, a local server on :8765.
const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');

const URL = process.env.TFM_URL || 'http://127.0.0.1:8765/index.html';
// The full run uses the research link, which shows the session record and export inline.
const RURL = URL + (URL.includes('?') ? '&' : '?') + 'research=1';
const OUT = path.join(__dirname, 'e2e-output');
fs.mkdirSync(OUT, { recursive: true });
const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

let failures = 0;
function check(cond, msg) {
  if (cond) console.log('  ✔ ' + msg);
  else { failures++; console.log('  ✖ ' + msg); }
}

async function heading(page) { return (await page.textContent('#task-heading')).trim(); }
async function bodyText(page) { return (await page.textContent('#console-body')).replace(/\s+/g, ' '); }
async function stageText(page) { return (await page.textContent('#stage')).replace(/\s+/g, ' '); }
// Waits for entrance animations (up to ~0.6 s) to settle so screenshots show the finished state.
async function shot(page, name) { await page.waitForTimeout(700); await page.screenshot({ path: path.join(OUT, name + '.png') }); }

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });

  /* ------------------------------------------------------------------ */
  console.log('\n# Full run, laptop 1440×900 (YouTube blocked to keep the test offline)');
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
  await ctx.route(/youtube\.com|ytimg|googlevideo/, r => r.abort());
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/youtube|ERR_FAILED|net::/i.test(m.text())) errors.push('console: ' + m.text()); });

  await page.goto(RURL);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForSelector('#screen-heading');
  check((await page.textContent('#screen-heading')).trim() === 'Tidal Forecast Mission', 'Fresh session opens on the start screen');
  check(!(await page.isVisible('.checkpoints')), 'Start screen hides the checkpoint nav');
  await shot(page, '00-start');
  await page.click('[data-action="start-mission"]');
  await page.waitForSelector('#task-heading');
  check(await page.isHidden('#screen'), 'Start mission opens the briefing');
  check(!(await page.textContent('#console-body')).includes('k held fixed'), 'Model card has no "k held fixed" tag');
  check((await page.getAttribute('[data-action="goto-step"][data-step="2"]', 'aria-label')) === 'Step 3: Experiments, 0 of 3 tasks done, locked', 'Step buttons have full accessible names');
  check((await page.$$('#checkpoints .blk')).length === 15, 'Rail shows one block per task (15)');
  check((await page.textContent('#rail-head')).includes('Briefing') && (await page.textContent('#rail-head')).includes('Step 1 of 8'), 'Rail header names the current step');
  await shot(page, '01-briefing');

  // A. Briefing
  check(await page.isDisabled('[data-action="log-idea"]'), 'Log idea disabled before any input');
  // Video fallback when YouTube is unreachable
  await page.click('[data-action="video-play"]');
  await page.waitForSelector('.fallback-card', { timeout: 15000 });
  check((await stageText(page)).includes('couldn’t load'), 'Video failure shows the scene-summary fallback');
  await shot(page, '02-briefing-fallback');
  await page.fill('#first-idea', 'A closer or heavier black hole?');
  check(!(await page.isDisabled('[data-action="log-idea"]')), 'Log idea enabled after typing');
  await page.click('[data-action="log-idea"]');

  // B. Console — keyboard path with one wrong answer
  check((await heading(page)).includes('Δg'), 'Console task 1 asks for Δg');
  await page.focus('[data-fk="tgt-R"]');
  await page.keyboard.press('Enter');
  check((await bodyText(page)).includes('Selected: R line'), 'Keyboard Enter selects an SVG target');
  await page.click('[data-action="console-check"]');
  check((await bodyText(page)).includes('Not this one'), 'Wrong selection gives “Not this one” feedback');
  check((await bodyText(page)).includes('radius'), 'Wrong-selection feedback explains what R is');
  await shot(page, '03-console-wrong');
  await page.click('[data-action="console-retry"]');
  await page.focus('[data-fk="tgt-dg"]');
  await page.keyboard.press(' ');
  await page.click('[data-action="console-check"]');
  check((await bodyText(page)).includes('Correct'), 'Δg panel accepted');
  await page.click('[data-action="continue"]');
  // hint use on task 2
  await page.click('[data-action="hint-toggle"]');
  check(await page.isVisible('#hint-panel'), 'Hint panel opens in console');
  await page.click('[data-action="hint-next"]');
  check((await page.textContent('.hint-level')).includes('Hint 2 of 3'), 'Hint level advances');
  await page.click('[data-action="hint-close"]');
  await page.click('[data-fk="tgt-gp"] .hit >> nth=0', { force: true });
  await page.click('[data-action="console-check"]');
  check((await bodyText(page)).includes('Correct'), 'gₚ arrows accepted by mouse');
  await page.click('[data-action="continue"]');
  await page.click('[data-fk="tgt-R"] .hit', { force: true });
  await page.click('[data-action="console-check"]');
  await page.click('[data-action="continue"]');

  // C. Experiment 1 — Δg ×2, keyboard on the gauge
  check((await heading(page)) === 'Predict the new bulge height.', 'Experiment 1 starts awaiting a prediction');
  check(await page.isDisabled('[data-action="run-exp"]'), 'Run experiment disabled before prediction');
  check(!(await page.$('.g-fill')) && !(await stageText(page)).includes('Model result'), 'No result shown before prediction');
  const svgBefore = await page.getAttribute('.planet-svg ellipse.ocean', 'rx');
  await page.focus('.gauge-track[role="slider"]');
  for (let i = 0; i < 9; i++) await page.keyboard.press('ArrowUp'); // first press sets 4, then +0.5 ×8 = 8
  check((await page.inputValue('#pred-input')) === '8', 'Gauge keyboard sets prediction to 8 m');
  check(await page.getAttribute('.gauge-track', 'aria-valuetext') === '8 metres', 'Gauge exposes aria-valuetext');
  check((await page.getAttribute('.planet-svg ellipse.ocean', 'rx')) === svgBefore, 'Diagram still shows baseline after setting prediction');
  await page.click('[data-action="run-exp"]');
  await page.waitForTimeout(1100);
  check((await heading(page)).includes('8 m'), 'Δg ×2 → 8 m');
  await shot(page, '04-exp1-result');
  await page.click('[data-action="to-explain"]');
  await page.check('input[name="exp-choice"][value="stretch"]');
  await page.click('[data-action="submit-explain"]');
  check((await bodyText(page)).includes('Correct'), 'Exp 1 correct feedback');
  check((await bodyText(page)).includes('Added to evidence log'), 'Evidence entry added');
  await page.click('[data-action="continue"]');

  // Exp 2 — gₚ ×2, wrong answer, retry with hints
  check((await page.textContent('#console-head')).includes('doubles'), 'Exp 2 prompt says gₚ doubles');
  for (let i = 0; i < 4; i++) await page.click('[data-action="pred-up"]'); // 4.5,5,5.5,6
  check((await page.inputValue('#pred-input')) === '6', 'Stepper sets 6 m');
  await page.click('[data-action="run-exp"]');
  await page.waitForTimeout(300);
  check((await heading(page)).includes('2 m'), 'gₚ ×2 → 2 m');
  await page.click('[data-action="to-explain"]');
  await page.check('input[name="exp-choice"][value="lift"]');
  await page.click('[data-action="submit-explain"]');
  const fb2 = await bodyText(page);
  check(fb2.includes('Not yet') && fb2.includes('taller bulge') && fb2.includes('restoring'), 'Wrong answer gets relationship-specific feedback');
  check(fb2.includes('holds the ocean down'), 'Misconception-specific explanation feedback shown');
  await shot(page, '05-exp2-feedback');
  await page.click('[data-action="fresh-attempt"]');
  check((await page.textContent('#console-head')).includes('quadruples'), 'Fresh attempt uses a new variant (gₚ ×4)');
  check((await page.textContent('.attempt-badge')).includes('Fresh attempt 2'), 'Attempt badge shows retry');
  await page.click('[data-action="hint-toggle"]');
  for (let i = 0; i < 3; i++) await page.click('[data-action="hint-next"]');
  check((await page.textContent('#hint-panel')).includes('Worked example'), 'Hint 4 is a worked example');
  check((await page.textContent('#hint-panel')).includes('9 m'), 'Worked example uses a different case');
  await shot(page, '06-exp2-hint4');
  await page.click('[data-action="hint-close"]');
  await page.fill('#pred-input', '1');
  await page.click('[data-action="run-exp"]');
  await page.click('[data-action="to-explain"]');
  await page.check('input[name="exp-choice"][value="restore"]');
  await page.click('[data-action="submit-explain"]');
  check((await bodyText(page)).includes('Correct'), 'Retry correct');
  await page.click('[data-action="continue"]');

  // Exp 3 — R ×2; reload mid-task to test persistence
  check((await page.textContent('#console-head')).includes('not recalculated'), 'Exp 3 states Δg and gₚ are locked');
  await page.fill('#pred-input', '6');
  await page.reload();
  await page.waitForSelector('#task-heading');
  check((await page.textContent('.console-head .eyebrow')).includes('Experiment 3'), 'Reload restores position');
  check((await page.inputValue('#pred-input')) === '6', 'Reload restores the draft prediction');
  await page.fill('#pred-input', '8');
  await page.click('[data-action="run-exp"]');
  check((await heading(page)).includes('8 m'), 'R ×2 → 8 m');
  const chipsR = await stageText(page);
  check(chipsR.includes('external difference') && (await page.$$('.chip-fixed')).length === 3, 'Δg, gₚ, k shown as Fixed during R experiment');
  await page.click('[data-action="to-explain"]');
  await page.check('input[name="exp-choice"][value="fraction"]');
  await page.click('[data-action="submit-explain"]');
  await page.click('[data-action="continue"]');

  // D. Sensor
  check((await stageText(page)).includes('Hidden until you answer'), 'Sensor bulge hidden before answer');
  check(await page.isDisabled('[data-action="sensor-submit"]'), 'Sensor submit disabled until both answers');
  await page.waitForTimeout(1100);
  await shot(page, '07-sensor');
  await page.check('input[name="sensor-choice"][value="same"]');
  await page.selectOption('#sensor-quantity', 'dg');
  await page.click('[data-action="sensor-submit"]');
  check((await bodyText(page)).includes('Correct — the bulge stays at 4 m'), 'Uniform increase → unchanged');
  check((await stageText(page)).includes('4 m (unchanged)'), 'Sensor reveals unchanged bulge');
  await page.click('[data-action="continue"]');

  // D2. Quick checks — map a plain-language scenario to the inputs, then predict
  async function answerQuick(map, h) {
    for (const k of ['dg', 'gp', 'R']) await page.check(`input[name="map-${k}"][value="${map[k]}"]`);
    await page.check(`input[name="mixed-pred"][value="${h}"]`);
    await page.click('[data-action="mixed-submit"]');
  }
  check((await page.textContent('#console-head')).includes('Quick checks · 1 of 2'), 'Quick checks follow the sensor update');
  check(!(await stageText(page)).includes('What the scenario changes'), 'Quick check hides which inputs change before submit');
  check(await page.isDisabled('[data-action="mixed-submit"]'), 'Quick check needs all three inputs and a height');
  await shot(page, '07b-quick-check');
  // Check 1 (gₚ halves → 8 m): right height, wrong mapping.
  await answerQuick({ dg: 'up', gp: 'fixed', R: 'fixed' }, '8');
  const q1 = await bodyText(page);
  check(q1.includes('right height, check which inputs changed') && q1.includes('it goes down') && q1.includes('it stays fixed'), 'Quick check 1: feedback names each wrongly mapped input');
  const partly = await page.evaluate(() => {
    const fb = document.querySelector('#console-body .fb');
    const cs = getComputedStyle(fb);
    return { cls: fb.className, status: fb.querySelector('.fb-status').textContent.trim(), border: cs.borderTopColor, style: cs.borderTopStyle };
  });
  check(partly.cls.includes('fb-partly') && partly.status === 'Partly right', 'Partly-right feedback carries a "Partly right" status label');
  check(partly.border === 'rgb(242, 220, 93)' && partly.style === 'dashed', 'Partly-right card uses the yellow dashed border (' + partly.border + ', ' + partly.style + ')');
  // The formula stays in one place while the model view scrolls.
  const pin = await page.evaluate(() => {
    const st = document.getElementById('stage');
    const top0 = Math.round(document.querySelector('#formula .eq-bar').getBoundingClientRect().top);
    st.scrollTop = st.scrollHeight;
    const top1 = Math.round(document.querySelector('#formula .eq-bar').getBoundingClientRect().top);
    st.scrollTop = 0;
    return { top0, top1, scrolls: st.scrollHeight > st.clientHeight };
  });
  check(pin.top0 === pin.top1, 'Formula stays pinned above the diagram when the model view scrolls (' + pin.top0 + ' / ' + pin.top1 + ')');
  check((await stageText(page)).includes('What the scenario changes'), 'Quick check reveals the mapping after submit');
  await shot(page, '07c-quick-feedback');
  await page.click('[data-action="fresh-attempt"]');
  check((await page.textContent('#console-head')).includes('four times'), 'Quick check 1 fresh attempt uses new values (gₚ ×4)');
  await answerQuick({ dg: 'fixed', gp: 'up', R: 'fixed' }, '1');
  check((await bodyText(page)).includes('Correct — 1 m'), 'Quick check 1 retry correct (1 m)');
  await page.click('[data-action="continue"]');
  // Check 2: the moon's pull weakens equally everywhere → nothing changes, 4 m.
  check((await page.textContent('#console-head')).includes('Quick checks · 2 of 2'), 'Two quick checks in total');
  await answerQuick({ dg: 'fixed', gp: 'fixed', R: 'fixed' }, '4');
  check((await bodyText(page)).includes('Correct — 4 m'), 'Quick check 2 correct (uniform decrease, 4 m)');
  check((await page.textContent('[data-action="continue"]')).includes('planet comparison'), 'Last quick check continues to the planets');
  await page.click('[data-action="continue"]');

  // E. Planets
  check((await stageText(page)).includes('Results appear here'), 'Planet results hidden before submit');
  await page.selectOption('#est-A', '2');
  await page.selectOption('#est-B', '1');
  await page.selectOption('#est-C', '1');
  await page.check('input[name="planet-smallest"][value="B"]');
  await page.check('input[name="planet-reason"][value="ratio"]');
  await page.click('[data-action="planets-submit"]');
  await page.waitForTimeout(1000);
  const pt = await bodyText(page);
  check(pt.includes('Partly there') && pt.includes('0.5×'), 'Planets: partly-correct feedback names the off estimate');
  check((await page.textContent('#console-body .fb-status')).trim() === 'Partly right', 'Planets: partly-correct card is labelled "Partly right"');
  check((await heading(page)).includes('Planet B'), 'Planet B smallest');
  check((await stageText(page)).includes('A · 8 m') && (await stageText(page)).includes('B · 2 m') && (await stageText(page)).includes('C · 4 m'), 'Common-scale chart shows 8 / 2 / 4 m');
  await shot(page, '08-planets');
  await page.click('[data-action="continue"]');

  // F. Crew 1
  check((await page.textContent('#console-head')).includes('2.6×') && (await page.textContent('#console-head')).includes('1.3×'), 'Crew 1 shows Miller’s planet Δg 2.6×, gₚ 1.3×');
  const tagBelow = await page.evaluate(() => {
    const tag = document.querySelector('.hidden-tag rect');
    const svg = tag && tag.ownerSVGElement;
    return !!tag && tag.y.baseVal.value > 262 + 20; // planet centre is at y = 262 in the diagram
  });
  check(tagBelow, 'Crew 1: "Bulge hidden" tag sits below the arrows, clear of the R line');
  await shot(page, '09a-crew1');
  check((await stageText(page)).includes('Illustrative console values'), 'Crew 1 labels values as illustrative');
  check((await stageText(page)).includes('bulge hidden'), 'Crew 1 bulge hidden');
  await page.fill('#pred-input', '8');
  check(await page.isDisabled('[data-action="crew1-submit"]'), 'Crew 1 needs a reason too');
  await page.fill('#crew-reason', 'Δg up 2.6×, gp up 1.3×, ratio 2 → 8 m');
  await page.click('[data-action="crew1-submit"]');
  check((await bodyText(page)).includes('Correct — 8 m'), 'Crew 1 correct');
  await page.click('[data-action="continue"]');
  // Crew 2
  await page.check('input[name="crew-stance"][value="agree"]');
  await page.fill('#crew-expl', 'More gravity pulls water up');
  await page.click('[data-action="crew2-submit"]');
  check((await bodyText(page)).includes('Not yet'), 'Crew 2 agree → not yet');
  await page.click('[data-action="fresh-attempt"]');
  await page.check('input[name="crew-stance"][value="disagree"]');
  await page.fill('#crew-expl', 'Δg same; Miller gravity resists more, smaller bulge');
  await page.click('[data-action="crew2-submit"]');
  check((await bodyText(page)).includes('Correct'), 'Crew 2 revise → correct');
  check((await stageText(page)).includes('10.4 m') && (await stageText(page)).includes('8 m'), 'Crew 2 shows twin 10.4 m vs Miller 8 m');
  const c2 = await stageText(page);
  check(c2.includes('Only difference') && c2.includes('Twin ×1') && c2.includes('Miller’s ×1.3'), 'Crew 2 shows gₚ as the only difference');
  check(!c2.includes('×2.6') && (await page.$$('.compare-inputs .chip-changing')).length === 1, 'Crew 2 shows Δg as the same for both, without the ×2.6 badge');
  const nearArrows = await page.$$eval('.mini-planet svg', svgs => svgs.map(s => s.querySelector('line[marker-end*="-adg"]').getAttribute('x1')));
  check(nearArrows.length === 2 && nearArrows[0] === nearArrows[1], 'Crew 2 Δg arrows sit in the same place in both diagrams (' + nearArrows.join(', ') + ')');
  await page.check('[data-fk="sc-dg"]');
  await shot(page, '09-crew2');
  await page.click('[data-action="continue"]');

  // G1. Film ending plays by default
  check((await heading(page)).includes('Watch what the crew finds'), 'Film ending follows the crew challenges');
  check((await stageText(page)).includes('3:35–4:19'), 'Ending excerpt shows 3:35–4:19');
  check(await page.isDisabled('[data-action="continue"]'), 'Debrief waits until the ending is played or skipped');
  await shot(page, '09b-ending');
  await page.click('[data-action="ending-skip"]');
  check(!(await page.isDisabled('[data-action="continue"]')), 'Skipping the ending unlocks the debrief');
  await page.click('[data-action="continue"]');

  // G. Debrief
  const st = await stageText(page);
  check(st.includes('What your model explains') && st.includes('The moving wall of water'), 'Debrief: what the model explains and doesn’t');
  check(!(await page.isVisible('.go-deeper-body')), 'Go deeper starts collapsed');
  await page.click('.go-deeper > summary');
  check((await page.textContent('.go-deeper-body')).includes('Kip Thorne'), 'Go deeper opens with Thorne’s explanation');
  check(st.includes('closer or heavier black hole'), 'Debrief shows first idea');
  check(st.includes('Your first idea pointed at the external body'), 'Reflection generated from first idea');
  await shot(page, '10-debrief');

  // Navigate back
  await page.click('[data-action="goto-step"][data-step="2"]');
  check((await page.textContent('#console-head')).includes('Experiment 1'), 'Checkpoint nav goes back to experiments');
  check((await bodyText(page)).includes('Correct'), 'Earlier experiment shows saved feedback state');
  await page.click('[data-action="goto-step"][data-step="7"]');

  // Export
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('[data-action="export"]')]);
  const recPath = path.join(OUT, 'record.json');
  await dl.saveAs(recPath);
  const rec = JSON.parse(fs.readFileSync(recPath, 'utf8'));
  check(rec.schema === 'tidal-forecast-mission/session-record@1' && rec.sessionId, 'Export has schema and session ID');
  const e2 = rec.activities['exp-gp'];
  check(e2.firstAttempt.prediction === 6 && e2.firstAttempt.outcome.overall === 'not-yet', 'Exp 2 first attempt preserved (6 m, not yet)');
  check(e2.retries.length === 1 && e2.retries[0].prediction === 1 && e2.retries[0].variant === 4, 'Exp 2 retry recorded separately (gₚ ×4, 1 m)');
  check(JSON.stringify(e2.retries[0].hintsUsedBeforeSubmit) === '[1,2,3,4]', 'Hints and their order recorded on the retry');
  check(e2.completion === 'assisted', 'Exp 2 completion = assisted (not independent)');
  check(rec.activities['exp-dg'].completion === 'independent', 'Exp 1 completion = independent');
  check(rec.activities['console-dg'].completion === 'assisted', 'Console Δg (wrong first) = assisted');
  check(rec.activities['console-gp'].completion === 'assisted', 'Console gₚ (hint before submit) = assisted');
  const q1r = rec.activities['mixed-1'];
  check(q1r.firstAttempt.mapping.dg === 'up' && q1r.firstAttempt.outcome.overall === 'partly' && q1r.firstAttempt.outcome.mapping.gp.model === 'down',
    'Quick check 1 first attempt records the mapping and its outcome');
  check(q1r.retries.length === 1 && q1r.retries[0].variant.change.gp === 4 && q1r.completion === 'assisted', 'Quick check 1 retry recorded separately (gₚ ×4), assisted');
  check(rec.activities['mixed-2'].completion === 'independent' && rec.summary.scoredActivities === 12, 'Quick checks count as scored activities');
  check(rec.activities['crew-combined'].firstAttempt.reason.includes('ratio 2'), 'Crew reason text recorded');
  check(rec.firstIdea.text === 'A closer or heavier black hole?', 'First idea recorded');
  check(rec.video.opening.fallbackShownAt && rec.video.opening.error, 'Video fallback recorded');
  check(rec.video.ending && rec.video.ending.skippedAt && rec.activities['film-ending'].completion === 'unscored', 'Ending skip recorded (unscored)');
  check(typeof rec.elapsed.activeVisibleMs === 'number', 'Elapsed time recorded');
  console.log('    summary:', JSON.stringify(rec.summary));

  await page.click('[data-action="finish"]');
  await page.waitForSelector('#screen-heading');
  check((await page.textContent('#screen-heading')).trim() === 'Mission complete', 'Finish mission shows the complete screen');
  check((await page.textContent('#screen')).includes('5 of 5'), 'Complete screen shows the full evidence log');
  check(await page.isVisible('#screen [data-action="export"]'), 'Research link: export is open on the complete screen');
  await shot(page, '11-complete');
  await page.click('[data-action="hide-screen"]');
  check((await heading(page)) === 'Mission complete.', 'Review the debrief returns to the debrief');
  check(await page.isVisible('[data-action="show-complete"]'), 'Debrief offers the mission summary again');

  // Evidence dialog + reset
  await page.click('#evidence-btn');
  check(await page.isVisible('#evidence-dialog'), 'Evidence dialog opens');
  check((await page.$$('#evidence-dialog .ev-entry.found')).length === 5, 'All 5 evidence entries found');
  await page.keyboard.press('Escape');
  check(!(await page.isVisible('#evidence-dialog')), 'Escape closes dialog');
  await page.click('[data-action="reset-ask"]');
  await page.click('[data-action="reset-confirm"]');
  await page.waitForSelector('#screen-heading');
  check((await page.textContent('#screen-heading')).trim() === 'Tidal Forecast Mission', 'Reset returns to the start screen');
  await page.click('[data-action="start-mission"]');
  check((await heading(page)).includes('science analyst'), 'Start after reset opens the briefing');
  check((await page.evaluate(() => window.TFM.getState().firstIdea)) === null, 'Reset clears state');

  check(errors.length === 0, 'No page/console errors' + (errors.length ? ': ' + errors.join(' | ') : ''));
  await ctx.close();

  /* ------------------------------------------------------------------ */
  console.log('\n# Narrow 390×844 + reduced motion');
  const nctx = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce', deviceScaleFactor: 2 });
  await nctx.route(/youtube\.com|ytimg|googlevideo/, r => r.abort());
  const np = await nctx.newPage();
  const nerr = [];
  np.on('pageerror', e => nerr.push(e.message));
  await np.goto(URL);
  await np.evaluate(() => localStorage.clear());
  await np.reload();
  await np.screenshot({ path: path.join(OUT, 'n0-start.png'), fullPage: true });
  const startOverflow = await np.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  check(startOverflow <= 0, 'Narrow: start screen has no horizontal overflow (' + startOverflow + 'px)');
  await np.click('[data-action="start-mission"]');
  await np.screenshot({ path: path.join(OUT, 'n1-briefing.png'), fullPage: true });
  check(await np.isVisible('.rail'), 'Narrow: progress rail shown as a strip');
  const stripH = await np.evaluate(() => Math.round(document.querySelector('.blocks').getBoundingClientRect().height));
  check(stripH === 4, 'Narrow: rail blocks are a 4px strip (' + stripH + 'px)');
  await np.fill('#first-idea', 'maybe the moon');
  await np.check('[data-fk="first-notsure"]');
  check(await np.isDisabled('#first-idea'), 'Ticking "Not sure yet" greys out the idea box');
  await np.uncheck('[data-fk="first-notsure"]');
  check(!(await np.isDisabled('#first-idea')) && (await np.inputValue('#first-idea')) === 'maybe the moon', 'Unticking restores the typed idea');
  await np.check('[data-fk="first-notsure"]');
  await np.click('[data-action="log-idea"]');
  const fi = await np.evaluate(() => window.TFM.getState().firstIdea);
  check(fi.notSure === true && fi.text === '', 'Only "Not sure yet" is logged when it is ticked');
  for (const t of ['dg', 'gp', 'R']) {
    await np.click(`[data-fk="tgt-${t}"] .hit >> nth=0`, { force: true });
    await np.click('[data-action="console-check"]');
    await np.click('[data-action="continue"]');
  }
  check(!(await np.isVisible('.gauge')), 'Narrow: gauge collapses into stepper');
  await np.click('[data-action="pred-up"]');
  await np.screenshot({ path: path.join(OUT, 'n2-experiment.png'), fullPage: true });
  await np.fill('#pred-input', '8');
  await np.click('[data-action="run-exp"]');
  check(await np.isVisible('.hbars.narrow-only'), 'Narrow: horizontal compare bars after result');
  await np.screenshot({ path: path.join(OUT, 'n3-result.png'), fullPage: true });
  const overflow = await np.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  check(overflow <= 0, 'Narrow: no horizontal page overflow (' + overflow + 'px)');
  check(nerr.length === 0, 'Narrow: no page errors ' + nerr.join(' | '));
  await nctx.close();

  /* ------------------------------------------------------------------ */
  console.log('\n# Tablet 1024×768');
  const tctx = await browser.newContext({ viewport: { width: 1024, height: 768 } });
  const tp = await tctx.newPage();
  await tp.goto(URL);
  await tp.evaluate(() => localStorage.clear());
  await tp.reload();
  await tp.click('[data-action="start-mission"]');
  await tp.fill('#first-idea', 'size of the planet');
  await tp.click('[data-action="log-idea"]');
  await tp.screenshot({ path: path.join(OUT, 't1-console.png') });
  await tp.click('#evidence-btn');
  check(await tp.isVisible('#evidence-dialog .research-details'), 'Learner link: session record sits in a collapsed teachers/researchers section');
  check(!(await tp.isVisible('#evidence-dialog [data-action="export"]')), 'Learner link: export is hidden until that section is opened');
  await tp.keyboard.press('Escape');
  const tOverflow = await tp.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  check(tOverflow <= 0, 'Tablet: no horizontal overflow');
  await tctx.close();

  /* ------------------------------------------------------------------ */
  console.log('\n# Motion (entrances play once, never on load, off with reduced motion)');
  async function motionRun(reducedMotion) {
    const mctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion });
    await mctx.route(/youtube\.com|ytimg|googlevideo/, r => r.abort());
    const mp = await mctx.newPage();
    const merr = [];
    mp.on('pageerror', e => merr.push(e.message));
    await mp.goto(URL);
    await mp.evaluate(() => localStorage.clear());
    await mp.reload();
    await mp.click('[data-action="start-mission"]');
    await mp.fill('#first-idea', 'closer black hole');
    await mp.click('[data-action="log-idea"]');
    const r = {};
    r.slideFwd = await mp.evaluate(() => document.getElementById('console-body').classList.contains('nav-fwd'));
    r.sweep = await mp.evaluate(() => !!document.querySelector('.blk.done.enter'));
    r.nowPop = await mp.evaluate(() => !!document.querySelector('.blk.now.enter'));
    await mp.click('[data-action="hint-toggle"]');
    r.hintUnfold = await mp.evaluate(() => !!document.querySelector('.hint-panel.enter'));
    await mp.click('[data-action="hint-close"]');
    for (const t of ['dg', 'gp', 'R']) {
      await mp.click(`[data-fk="tgt-${t}"] .hit >> nth=0`, { force: true });
      await mp.click('[data-action="console-check"]');
      if (t === 'dg') r.fbEnter = await mp.evaluate(() => !!document.querySelector('.fb.enter'));
      await mp.click('[data-action="continue"]');
    }
    await mp.fill('#pred-input', '8');
    await mp.click('[data-action="run-exp"]');
    await mp.waitForTimeout(150);
    r.countMid = (await mp.textContent('.compare-card div:nth-child(2) .big')).trim();
    await mp.waitForTimeout(900);
    r.countEnd = (await mp.textContent('.compare-card div:nth-child(2) .big')).trim();
    await mp.click('[data-action="to-explain"]');
    await mp.check('input[name="exp-choice"][value="stretch"]');
    await mp.click('[data-action="submit-explain"]');
    r.evEnter = await mp.evaluate(() => !!document.querySelector('.ev-added.enter'));
    r.evBump = await mp.evaluate(() => document.getElementById('evidence-btn').classList.contains('bump'));
    await mp.click('[data-action="goto-step"][data-step="1"]');
    r.slideBack = await mp.evaluate(() => document.getElementById('console-body').classList.contains('nav-back'));
    r.revisitQuiet = await mp.evaluate(() => !document.querySelector('.fb.enter'));
    await mp.reload();
    r.loadQuiet = await mp.evaluate(() => document.querySelectorAll('.enter').length === 0);
    r.errors = merr;
    await mctx.close();
    return r;
  }
  const mo = await motionRun('no-preference');
  check(mo.slideFwd, 'Moving on slides the task panel in from the right');
  check(mo.sweep && mo.nowPop, 'Rail: finished block sweeps green and the outline pops onto the next task');
  check(mo.hintUnfold, 'Hint panel unfolds when opened');
  check(mo.fbEnter, 'Feedback card plays its entrance');
  check(mo.countMid !== '8 m' && mo.countEnd === '8 m', 'Model result counts up to 8 m (' + mo.countMid + ' → ' + mo.countEnd + ')');
  check(mo.evEnter && mo.evBump, 'New evidence: entry rises in and the top-bar count bumps');
  check(mo.slideBack, 'Going back slides the panel in from the left');
  check(mo.revisitQuiet, 'Revisiting a step does not replay old feedback entrances');
  check(mo.loadQuiet, 'Nothing animates on page load');
  check(mo.errors.length === 0, 'Motion run: no page errors ' + mo.errors.join(' | '));
  const mr = await motionRun('reduce');
  check(mr.countMid === '8 m', 'Reduced motion: result shows 8 m at once (' + mr.countMid + ')');
  const reducedDur = await (async () => {
    const c = await browser.newContext({ reducedMotion: 'reduce' });
    const pg = await c.newPage();
    await pg.goto(URL);
    const d = await pg.evaluate(() => getComputedStyle(document.querySelector('.screen-inner > *')).animationDuration);
    await c.close();
    return d;
  })();
  check(parseFloat(reducedDur) < 0.01, 'Reduced motion: entrance animations are switched off (' + reducedDur + ')');

  /* ------------------------------------------------------------------ */
  console.log('\n# Developer mode (jump anywhere)');
  const dctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await dctx.route(/youtube\.com|ytimg|googlevideo/, r => r.abort());
  const dp = await dctx.newPage();
  const derr = [];
  dp.on('pageerror', e => derr.push(e.message));
  await dp.goto(URL);
  await dp.evaluate(() => localStorage.clear());
  await dp.reload();
  check(!(await dp.isVisible('#devbar')), 'Dev mode is off by default');
  check(await dp.isVisible('#dev-btn'), 'Dev toggle is available on the start screen');
  await dp.click('#dev-btn');
  check(await dp.isVisible('#devbar') && (await dp.getAttribute('#dev-btn', 'aria-pressed')) === 'true', 'Dev toggle opens the jump bar');
  const targets = await dp.$$eval('#dev-jump option', os => os.map(o => o.value));
  const formulaTops = new Set();
  check(targets.length === 17, 'Jump menu lists start, all 15 activities and the complete screen (' + targets.length + ')');
  for (const v of targets) {
    await dp.selectOption('#dev-jump', v);
    await dp.click('[data-action="dev-jump"]');
    const h = await dp.evaluate(() => {
      const el = document.querySelector('#screen:not([hidden]) #screen-heading') || document.querySelector('#app:not([hidden]) #task-heading');
      return el ? el.textContent.trim() : '';
    });
    if (!h) check(false, 'Jump to ' + v + ' shows a heading');
    if (!v.startsWith('screen:')) {
      const ft = await dp.evaluate(() => {
        const e = document.querySelector('#formula .eq-bar');
        return e ? Math.round(e.getBoundingClientRect().top) : null;
      });
      formulaTops.add(ft);
    }
  }
  check(formulaTops.size === 1 && !formulaTops.has(null), 'Formula sits at the same position on all 15 tasks (' + [...formulaTops].join(', ') + 'px)');
  check(derr.length === 0, 'Every jump renders without page errors' + (derr.length ? ': ' + derr.join(' | ') : ''));
  await dp.selectOption('#dev-jump', '7:1');
  await dp.click('[data-action="dev-jump"]');
  check((await dp.textContent('#task-heading')).includes('debrief'), 'Jump straight to the debrief');
  check((await dp.$$('#checkpoints button:disabled')).length === 0, 'Dev mode unlocks every checkpoint');
  await dp.reload();
  check(await dp.isVisible('#devbar'), 'Dev mode stays on after a reload');
  const ds = await dp.evaluate(() => window.TFM.getState().devMode);
  check(ds && ds.enabledAt && ds.jumps.length === targets.length + 1, 'Session record notes dev mode and each jump');
  const rec2 = await dp.evaluate(() => window.TFM.buildRecord());
  check(rec2.devMode && rec2.devMode.jumps.length === ds.jumps.length, 'Export includes devMode');
  await dp.click('[data-action="dev-toggle"][data-fk="dev-off"]');
  check(!(await dp.isVisible('#devbar')), 'Turn off hides the jump bar');
  await dp.click('[data-action="goto-step"][data-step="7"]');
  check((await dp.$$('#checkpoints button:disabled')).length === 0, 'Steps reached in dev mode stay open afterwards');
  await dctx.close();

  const dnctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const dnp = await dnctx.newPage();
  await dnp.goto(URL + (URL.includes('?') ? '&' : '?') + 'dev=1');
  await dnp.evaluate(() => localStorage.clear());
  await dnp.reload();
  check(await dnp.isVisible('#devbar'), '?dev=1 turns dev mode on');
  await dnp.selectOption('#dev-jump', '2:1');
  await dnp.click('[data-action="dev-jump"]');
  await dnp.screenshot({ path: path.join(OUT, 'd1-dev-narrow.png') });
  const dOverflow = await dnp.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  check(dOverflow <= 0, 'Narrow: dev bar has no horizontal overflow (' + dOverflow + 'px)');
  await dnctx.close();

  await browser.close();
  console.log(failures ? `\n${failures} check(s) FAILED` : '\nAll checks passed');
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
