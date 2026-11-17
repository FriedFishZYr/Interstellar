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

const introsSeen = [];
const introPages = { ok: 0, bad: 0 };
// The briefing opens on the scene; one click moves on to the opening question.
async function toIdea(p) {
  const b = await p.$('[data-action="brief-next"]');
  if (!b || !(await b.isVisible())) return;
  // Locked until the scene is watched, skipped or read as a summary; skipping opens the question.
  if (await b.isDisabled()) await p.click('[data-action="video-skip"]'); else await b.click();
}
// The progress rail is folded by default on wide screens; open it before choosing a step.
async function gotoStep(p, n) {
  if ((await p.getAttribute('#rail-head', 'aria-expanded')) !== 'true') await p.click('#rail-head');
  await p.click('[data-action="goto-step"][data-step="' + n + '"]');
}
// Each step opens on one intro page: a card with the crew message, then the learner's job and Start.
async function startStep(p) {
  const b = await p.$('[data-action="start-step"]');
  if (b && await b.isVisible()) {
    const whole = !!(await p.$('#screen .intro-card #screen-heading')) && !!(await p.$('#screen .intro-job'));
    if (whole) introPages.ok++; else introPages.bad++;
    introsSeen.push((await p.textContent('#screen-heading')).trim());
    await b.click();
  }
}
// Pre-flight task 1: move "Near" to the top (Near, Centre, Far), check, continue.
async function doRank(p) {
  await p.click('[data-action="rank-move"][data-id="near"][data-dir="-1"]');
  await p.click('[data-action="rank-move"][data-id="near"][data-dir="-1"]');
  await p.click('[data-action="rank-check"]');
  await p.click('[data-action="continue"]');
}
// Pre-flight tasks 2–4: find Δg, gₚ and R on the diagram.
async function doConsole(p, after) {
  for (const t of ['dg', 'gp', 'R']) {
    await p.click(`[data-fk="tgt-${t}"] .hit >> nth=0`, { force: true });
    await p.click('[data-action="console-check"]');
    if (after) await after(t);
    await p.click('[data-action="continue"]');
    await startStep(p);
  }
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
  check((await page.$$eval('.loop li', ls => ls.map(l => l.textContent.trim()))).join('|') ===
    'Incoming Transmission|Pre-flight Check|Tide Lab|Decode the Model|Quick Checks|Landing Call|Return to Endurance', 'Start screen lists the seven mission phases');
  await shot(page, '00-start');
  await page.click('[data-action="start-mission"]');
  await page.waitForSelector('#task-heading');
  check(await page.isHidden('#screen'), 'Start mission opens the briefing');
  check((await page.getAttribute('[data-action="goto-step"][data-step="2"]', 'aria-label')) === 'Step 3: Tide Lab, 0 of 4 tasks done, locked', 'Step buttons have full accessible names');
  check((await page.$$('#checkpoints .blk')).length === 20, 'Rail shows one block per task (20)');
  check((await page.textContent('#rail-head')).includes('Incoming Transmission') && (await page.textContent('#rail-head')).includes('Step 1 of 7'), 'Rail header names the current step');
  check(!(await page.isVisible('#checkpoints')) && (await page.isVisible('#rail-head')), 'Progress rail is folded by default, showing only the current step');
  await shot(page, '01-briefing');
  await page.click('#rail-head');
  check(await page.isVisible('[data-action="goto-step"][data-step="0"]'), 'Clicking the current-step pill opens the full rail');
  await page.click('#rail-head');
  check(!(await page.isVisible('#checkpoints')), 'Clicking it again folds the rail');

  // 1. Incoming Transmission
  check(!(await page.$('#first-idea')) && !!(await page.$('[data-action="brief-next"]')) && (await heading(page)) === 'Analyst, you’ve seen how this ends.',
    'Incoming Transmission opens on the scene, without the question');
  check(!(await page.isVisible('#formula')), 'Scene section hides the model formula');
  check(await page.isDisabled('[data-action="brief-next"]'), 'Log your first guess is locked until the scene is watched, skipped or read');
  // Video fallback when YouTube is unreachable
  await page.click('[data-action="video-play"]');
  await page.waitForSelector('.fallback-card', { timeout: 15000 });
  check((await stageText(page)).includes('couldn’t load'), 'Video failure shows the scene-summary fallback');
  await shot(page, '02-briefing-fallback');
  check(!(await page.isDisabled('[data-action="brief-next"]')), 'Reading the scene summary unlocks the next section');
  await toIdea(page);
  check((await heading(page)).includes('What might make a tidal bulge larger'), 'Second section asks the opening question');
  check(await page.isVisible('#formula .eq-bar'), 'The model formula appears with the question section');
  check(await page.isDisabled('[data-action="log-idea"]'), 'Log idea disabled before any input');
  await page.fill('#first-idea', 'A closer or heavier black hole?');
  check(!(await page.isDisabled('[data-action="log-idea"]')), 'Log idea enabled after typing');
  await page.click('[data-action="log-idea"]');
  check((await page.textContent('#screen-heading')).trim() === 'Pre-flight Check' && !!(await page.$('#screen .intro-card')), 'Pre-flight Check opens on its intro page');
  await shot(page, '02b-preflight-intro');
  await startStep(page);

  // 2. Pre-flight Check — task 1: rank the Moon's pull (unscored)
  check((await heading(page)) === 'Rank the pull of the Moon', 'Pre-flight task 1 ranks the Moon’s pull');
  check((await bodyText(page)).includes('What’s your guess?'), 'Version B: the ranking task asks for a guess');
  check((await page.$$eval('.rank-name', ns => ns.map(n => n.textContent))).join() === 'Centre,Far,Near', 'Ranking starts as Centre, Far, Near');
  check(await page.isDisabled('[data-action="rank-check"]'), 'Check selection is locked until a point is moved');
  check(!(await page.isVisible('#formula')), 'Rank task hides the model formula');
  await page.click('[data-action="rank-move"][data-id="near"][data-dir="-1"]');
  check((await page.$$eval('.rank-name', ns => ns.map(n => n.textContent))).join() === 'Centre,Near,Far', 'Moving a point up reorders the list');
  check(!(await page.isDisabled('[data-action="rank-check"]')), 'Check selection unlocks after a move');
  await page.click('[data-action="rank-check"]');
  check((await bodyText(page)).includes('Distance matters'), 'A wrong ranking gets the distance hint, not a fail');
  check((await page.$$eval('.rank-name', ns => ns.map(n => n.textContent))).join() === 'Centre,Near,Far', 'Checking keeps the learner’s order on screen');
  // Move Near to the top, however the list was left.
  for (let i = 0; i < 2 && (await page.textContent('.rank-name')) !== 'Near'; i++) await page.click('[data-action="rank-move"][data-id="near"][data-dir="-1"]');
  check(!!(await page.$('[data-action="rank-check"]')), 'Moving again after feedback reopens the check');
  await page.click('[data-action="rank-check"]');
  check((await bodyText(page)).includes('near side is pulled hardest'), 'Near, Centre, Far is confirmed');
  await shot(page, '03-rank');
  await page.click('[data-action="continue"]');

  // Pre-flight tasks 2–4 — find Δg, gₚ, R; keyboard path with one wrong answer
  check((await heading(page)).includes('Δg'), 'Pre-flight task 2 asks for Δg');
  check(!(await stageText(page)).includes('Δg = near − far') && !(await stageText(page)).includes('planet’s pull'), 'Variables: symbol labels hidden until found');
  await page.focus('[data-fk="tgt-R"]');
  await page.keyboard.press('Enter');
  check((await bodyText(page)).includes('Selected: R line'), 'Keyboard Enter selects an SVG target');
  await page.click('[data-action="console-check"]');
  check((await bodyText(page)).includes('Not this one'), 'Wrong selection gives “Not this one” feedback');
  check((await bodyText(page)).includes('radius'), 'Wrong-selection feedback explains what R is');
  await shot(page, '04-console-wrong');
  await page.click('[data-action="console-retry"]');
  await page.focus('[data-fk="tgt-dg"]');
  await page.keyboard.press(' ');
  await page.click('[data-action="console-check"]');
  check((await bodyText(page)).includes('Correct'), 'Δg panel accepted');
  check((await stageText(page)).includes('Δg = near − far'), 'Variables: finding Δg reveals its label');
  await page.click('[data-action="continue"]'); await startStep(page);
  check(!(await stageText(page)).includes('planet’s pull'), 'Variables: gₚ label still hidden on task 3');
  // hint use on task 3
  await page.click('[data-action="hint-toggle"]');
  check(await page.isVisible('#hint-panel'), 'Hint panel opens on the variables task');
  await page.click('[data-action="hint-next"]');
  check((await page.textContent('.hint-level')).includes('Hint 2 of 3'), 'Hint level advances');
  await page.click('[data-action="hint-close"]');
  await page.click('[data-fk="tgt-gp"] .hit >> nth=0', { force: true });
  await page.click('[data-action="console-check"]');
  check((await bodyText(page)).includes('Correct'), 'gₚ arrows accepted by mouse');
  await page.click('[data-action="continue"]'); await startStep(page);
  await page.click('[data-fk="tgt-R"] .hit', { force: true });
  await page.click('[data-action="console-check"]');
  await page.click('[data-action="continue"]');
  check((await page.textContent('#screen-heading')).trim() === 'Tide Lab', 'Pre-flight Check leads to the Tide Lab intro');
  await startStep(page);

  // 3. Tide Lab — test 1: Δg ×2, keyboard on the gauge
  check((await heading(page)) === 'What if the Moon were twice as heavy?' && (await page.textContent('#console-head .eyebrow')).includes('test 1 of 3'), 'Tide Lab test 1 starts on its scenario');
  check(!(await page.$('#stage .subnav')), 'Tide Lab: no 1·2·3 tab row under the equation');
  check((await page.textContent('.h-bracket')).includes('h = 4 m') && !!(await page.$('.g-now')), 'Tide Lab: current bulge height outlined on the diagram (h = 4 m) and the gauge');
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
  await shot(page, '05-exp1-result');
  await page.click('[data-action="to-explain"]');
  await page.check('input[name="exp-choice"][value="stretch"]');
  await page.click('[data-action="submit-explain"]');
  check((await bodyText(page)).includes('Correct'), 'Test 1 correct feedback');
  check((await bodyText(page)).includes('Added to the crew’s evidence log'), 'Evidence entry added');
  check((await page.textContent('#evidence-count')).trim() === '1/4', 'Evidence count reads 1/4');
  await page.click('[data-action="continue"]'); await startStep(page);

  // Test 2 — gₚ ×2, wrong answer, retry with hints
  check((await page.textContent('.lab-chip.on')).includes('×2') && (await page.$$('.lab-chip')).length === 3, 'Test 2 chips show gₚ ×2, with Δg and R fixed');
  check((await page.textContent('#console-head .prompt')).includes('Back to a 4 m bulge'), 'Test 2 prompt resets to the 4 m baseline');
  for (let i = 0; i < 4; i++) await page.click('[data-action="pred-up"]'); // 4.5,5,5.5,6
  check((await page.inputValue('#pred-input')) === '6', 'Stepper sets 6 m');
  await page.click('[data-action="run-exp"]');
  await page.waitForTimeout(300);
  check((await heading(page)).includes('2 m'), 'gₚ ×2 → 2 m');
  await page.click('[data-action="to-explain"]');
  await page.check('input[name="exp-choice"][value="lift"]');
  await page.click('[data-action="submit-explain"]');
  const fb2 = await bodyText(page);
  check(fb2.includes('Not yet') && fb2.includes('You predicted a taller bulge (6 m)') && fb2.includes('divided by 2'), 'Wrong answer gets relationship-specific feedback and recaps the prediction');
  check(fb2.includes('holds the ocean down'), 'Misconception-specific explanation feedback shown');
  check((await page.getAttribute('[data-action="fresh-attempt"]', 'class')).includes('btn-primary') &&
    (await page.getAttribute('[data-action="continue"]', 'class')).includes('btn-secondary'), 'After a miss, trying again is the primary button');
  check(!!(await page.$('.ev-pending')) && !fb2.includes('Added to the crew’s evidence log') &&
    (await page.textContent('#evidence-count')).trim() === '1/4', 'A miss shows the model’s finding without logging it as earned');
  check((await page.textContent('.fb-body p:first-child')).includes('holds the ocean down'), 'Feedback leads with the reason');
  await shot(page, '06-exp2-feedback');
  await page.click('[data-action="fresh-attempt"]');
  check((await page.textContent('.lab-chip.on')).includes('×4'), 'Fresh attempt uses a new variant (gₚ ×4)');
  check((await page.textContent('.attempt-badge')).includes('Fresh attempt 2'), 'Attempt badge shows retry');
  await page.click('[data-action="hint-toggle"]');
  check((await page.textContent('#hint-panel')).includes('It quadruples'), 'Hint 1 describes the new variant (gₚ ×4)');
  for (let i = 0; i < 2; i++) await page.click('[data-action="hint-next"]');
  check((await page.textContent('.hint-level')).includes('Hint 3 of 3') && (await page.textContent('#hint-panel')).includes('Think it through'), 'Hint 3 is the last, a think-it-through prompt');
  await shot(page, '07-exp2-hint3');
  await page.click('[data-action="hint-close"]');
  await page.fill('#pred-input', '1');
  await page.click('[data-action="run-exp"]');
  await page.click('[data-action="to-explain"]');
  await page.check('input[name="exp-choice"][value="restore"]');
  await page.click('[data-action="submit-explain"]');
  check((await bodyText(page)).includes('Correct'), 'Retry correct');
  await page.click('[data-action="continue"]'); await startStep(page);

  // Test 3 — R ×2; reload mid-task to test persistence
  await page.fill('#pred-input', '6');
  await page.reload();
  await page.waitForSelector('#task-heading');
  check((await page.textContent('#console-head .eyebrow')).includes('test 3 of 3'), 'Reload restores position');
  check((await page.inputValue('#pred-input')) === '6', 'Reload restores the draft prediction');
  await page.fill('#pred-input', '8');
  await page.click('[data-action="run-exp"]');
  check((await heading(page)).includes('8 m'), 'R ×2 → 8 m');
  check((await page.$$('.lab-chip.on')).length === 1 && (await page.textContent('.lab-chip.on')).includes('R ×2'), 'Only R is shown as changing during the R test');
  await page.click('[data-action="to-explain"]');
  await page.check('input[name="exp-choice"][value="fraction"]');
  await page.click('[data-action="submit-explain"]');
  await page.click('[data-action="continue"]');

  // Tide Lab — results table (unscored)
  check((await heading(page)) === 'Lab results', 'Tide Lab ends on the results table');
  const table = await stageText(page);
  check(table.includes('8 m') && table.includes('2 m'), 'Results table lists the three findings (8 m, 2 m, 8 m)');
  check((await page.textContent('#evidence-count')).trim() === '3/4', 'Three findings in the evidence log');
  await shot(page, '08-lab-results');
  await page.click('[data-action="continue"]'); await startStep(page);

  // 4. Decode the Model — fill the blanks, one wrong first
  check((await heading(page)) === 'What did each test tell you?', 'Decode task 1 asks what each test showed');
  check(await page.isDisabled('[data-action="decode-check"]'), 'Decode: Check locked until every blank is filled');
  const blanks = { dg: ['doubles', 'bigger', 'directly'], gp: ['doubles', 'smaller', 'inversely'], R: ['doubles', 'bigger', 'directly'] };
  for (const k of Object.keys(blanks)) for (const [i, s] of ['change', 'size', 'prop'].entries()) await page.selectOption(`[data-fk="bl-${k}-${s}"]`, blanks[k][i]);
  check(!(await page.isDisabled('[data-action="decode-check"]')), 'Decode: Check unlocks once every blank is filled');
  await page.click('[data-action="decode-check"]');
  check((await bodyText(page)).includes('Did the bulge go up to 8 m or down to 2 m') && (await page.$$('select.blank.bad')).length === 1, 'Decode: a wrong blank is marked and gets a pointer back to the table');
  await shot(page, '09-decode-notyet');
  await page.click('[data-action="decode-retry"]');
  await page.selectOption('[data-fk="bl-gp-change"]', 'halves');
  await page.click('[data-action="decode-check"]');
  check((await bodyText(page)).includes('These are your three rules'), 'Decode: all blanks right');
  await page.click('[data-action="continue"]');
  check((await heading(page)) === 'Your three rules, in one model' && (await page.$$('.rule-card')).length === 4, 'Decode task 2 shows the three rules plus k as one model');
  await shot(page, '10-decode-model');
  await page.click('[data-action="continue"]'); await startStep(page);

  // 5. Quick Checks — check 1: calculate h from real numbers, wrong first
  check((await page.textContent('#console-head .eyebrow')).includes('1 of 4') && (await heading(page)) === 'Scenario 1', 'Quick check 1 is a calculation');
  check(await page.isDisabled('[data-action="calc-check"]'), 'Quick check 1: Check locked until every field is filled');
  for (const [k, v] of [['dg', '0.00001'], ['gp', '10'], ['R', '2000000'], ['k', '2'], ['h', '8']]) await page.fill(`[data-fk="cv-${k}"]`, v);
  await page.click('[data-action="calc-check"]');
  check((await page.$$('.calc-field.bad')).length === 1 && (await page.$$('.calc-field.ok')).length === 4, 'Quick check 1: the wrong h is marked; the known values are marked right');
  check((await page.$$('[data-action="calc-retry"]')).length === 1, 'Quick check 1: a miss offers Try again');
  await page.click('[data-action="calc-retry"]');
  await page.fill('[data-fk="cv-h"]', '4');
  await page.click('[data-action="calc-check"]');
  check((await bodyText(page)).includes('This planet is the baseline'), 'Quick check 1 retry correct (4 m)');
  check((await page.textContent('#evidence-count')).trim() === '4/4', 'Quick check 1 completes the evidence log (4/4)');
  await shot(page, '11-qc1');
  await page.click('[data-action="continue"]');

  // Quick check 2 — map a plain-language scenario to the inputs, then predict (gₚ halves → 8 m)
  async function answerQuick(map, h) {
    for (const k of ['dg', 'gp', 'R']) await page.check(`input[name="map-${k}"][value="${map[k]}"]`);
    await page.check(`input[name="mixed-pred"][value="${h}"]`);
    await page.click('[data-action="mixed-submit"]');
  }
  check((await page.textContent('#console-head')).includes('2 of 4'), 'Quick check 2 follows');
  check(!(await stageText(page)).includes('What the scenario changes'), 'Quick check hides which inputs change before submit');
  check(await page.isDisabled('[data-action="mixed-submit"]'), 'Quick check needs all three inputs and a height');
  // The diagram is the learner's sketch before Check: it redraws from their answers, with arrows, not factors.
  const symLabels = () => page.$eval('.planet-svg', s => [...s.querySelectorAll('text.t-sym')].map(t => t.textContent).join(' '));
  const oceanRx = () => page.$eval('.planet-svg ellipse.ocean', e => +e.getAttribute('rx'));
  const rx0 = await oceanRx();
  await page.check('input[name="map-gp"][value="down"]');
  check((await symLabels()).includes('↓') && !(await symLabels()).includes('×') && (await page.$$('.planet-svg .g-gp.pulse')).length === 1,
    'Quick check sketch: choosing gₚ down redraws gₚ with an arrow (no factor) and flashes it');
  await page.check('input[name="mixed-pred"][value="8"]');
  await page.waitForTimeout(1000);
  check((await oceanRx()) > rx0, 'Quick check sketch: choosing a height reshapes the ocean');
  await shot(page, '12-qc2-sketch');
  await answerQuick({ dg: 'up', gp: 'fixed', R: 'fixed' }, '8');
  const q2 = await bodyText(page);
  check(q2.includes('Right height, check which inputs changed') && q2.includes('it goes down') && q2.includes('it stays fixed'), 'Quick check 2: feedback names each wrongly mapped input');
  const partly = await page.evaluate(() => {
    const fb = document.querySelector('#console-body .fb');
    const cs = getComputedStyle(fb);
    return { cls: fb.className, status: fb.querySelector('.fb-status').textContent.trim(), border: cs.borderTopColor, style: cs.borderTopStyle };
  });
  check(partly.cls.includes('fb-partly') && partly.status === 'Partly right', 'Partly-right feedback carries a "Partly right" status label');
  check(partly.style === 'dashed', 'Partly-right card uses a dashed border (' + partly.border + ', ' + partly.style + ')');
  // The formula stays in one place while the model view scrolls.
  const pin = await page.evaluate(() => {
    const st = document.getElementById('stage');
    const top0 = Math.round(document.querySelector('#formula .eq-bar').getBoundingClientRect().top);
    st.scrollTop = st.scrollHeight;
    const top1 = Math.round(document.querySelector('#formula .eq-bar').getBoundingClientRect().top);
    st.scrollTop = 0;
    return { top0, top1 };
  });
  check(pin.top0 === pin.top1, 'Formula stays pinned above the diagram when the model view scrolls (' + pin.top0 + ' / ' + pin.top1 + ')');
  check((await stageText(page)).includes('What the scenario changes'), 'Quick check reveals the mapping after submit');
  await shot(page, '13-qc2-feedback');
  await page.click('[data-action="fresh-attempt"]');
  check((await bodyText(page)).includes('four times as hard') && (await page.textContent('.attempt-badge')).includes('Fresh attempt 2'), 'Quick check 2 fresh attempt uses new values (gₚ ×4)');
  await answerQuick({ dg: 'fixed', gp: 'up', R: 'fixed' }, '1');
  check((await page.textContent('.fb-correct')).includes('The model gives 1 m'), 'Quick check 2 retry correct (1 m)');
  await page.click('[data-action="continue"]');
  // Quick check 3: the moon's pull weakens equally everywhere → nothing changes, 4 m.
  check((await page.textContent('#console-head')).includes('3 of 4'), 'Quick check 3 follows');
  await answerQuick({ dg: 'fixed', gp: 'fixed', R: 'fixed' }, '4');
  check((await page.textContent('.fb-correct')).includes('The model gives 4 m'), 'Quick check 3 correct (uniform decrease, 4 m)');
  await page.click('[data-action="continue"]');
  // Quick check 4: work back to R. The model with numbers unlocks once step 1 is right.
  check((await page.textContent('#console-head .eyebrow')).includes('4 of 4'), 'Quick check 4 follows');
  check(!!(await page.$('.sub-card.locked')), 'Quick check 4: step 2 is locked before step 1 is filled');
  check(!!(await page.$('[data-fk="cv-R"][readonly]')), 'Quick check 4: the R field is locked before step 1 is right');
  for (const [k, v] of [['h', '6'], ['dg', '0.00003'], ['gp', '10'], ['k', '2']]) await page.fill(`[data-fk="cv-${k}"]`, v);
  check(!(await page.$('.sub-card.locked')) && (await page.textContent('.sub-card')).includes('6 = 0.000006 × R'), 'Quick check 4: step 1 right unlocks the model with numbers');
  await page.fill('[data-fk="cv-R"]', '1000000');
  await page.click('[data-action="calc-check"]');
  check((await bodyText(page)).includes('R = 6 ÷ 0.000006 = 1,000,000 m'), 'Quick check 4 correct (R = 1,000,000 m)');
  await shot(page, '14-qc4');
  await page.click('[data-action="continue"]'); await startStep(page);

  // 6. Landing Call
  check((await heading(page)) === 'Approaching Miller’s planet', 'Landing Call opens with the background on Miller’s planet');
  const landingCounts = [(await page.textContent('#console-head .eyebrow-count')).trim()];
  await page.click('[data-action="continue"]');
  check((await heading(page)) === 'Forecast Miller’s planet', 'Then the forecast');
  landingCounts.push((await page.textContent('#console-head .eyebrow-count')).trim());
  await page.fill('[data-fk="cv-h"]', '1200');
  await page.click('[data-action="calc-check"]');
  check((await bodyText(page)).includes('1,200 m') && !!(await page.$('.compare-chart')), 'Forecast correct: 1,200 m, shown against Earth on one scale');
  check((await stageText(page)).includes('Lander safety limit · 5 m'), 'The chart marks the lander’s 5 m limit');
  await shot(page, '15-miller-forecast');
  await page.click('[data-action="continue"]');
  check((await heading(page)) === 'Is it safe to land?', 'Then the landing decision');
  landingCounts.push((await page.textContent('#console-head .eyebrow-count')).trim());
  check(landingCounts.join(' / ') === '· task 1 of 3 / · task 2 of 3 / · task 3 of 3' && (await page.textContent('#rail-head')).includes('task 3 of 3'),
    'Landing Call task counters match the progress rail (' + landingCounts.join(' / ') + ')');
  check(await page.isDisabled('[data-action="landing-send"]'), 'Landing: Send report needs a choice and a report');
  await page.check('input[name="land-choice"][value="yes"]');
  check(await page.isDisabled('[data-action="landing-send"]'), 'Landing: a choice alone is not enough');
  await page.fill('#land-report', 'Land, it looks fine.');
  await page.click('[data-action="landing-send"]');
  check((await bodyText(page)).includes('That’s the same call you made last time'), 'Landing “yes” gets the crew’s warning');
  await page.click('[data-action="landing-retry"]');
  check((await page.inputValue('#land-report')) === 'Land, it looks fine.', 'Landing retry keeps the report text');
  await page.check('input[name="land-choice"][value="no"]');
  await page.fill('#land-report', 'Do not land: Gargantua makes Δg huge, so the bulge is about 1,200 m, far above the 5 m limit.');
  await page.click('[data-action="landing-send"]');
  const sent = await bodyText(page);
  check((await heading(page)) === 'Report sent' && sent.includes('Sample report') && sent.includes('Check your report'), 'Landing “no”: report sent, with a sample and a checklist');
  check(sent.includes('far above the 5 m limit'), 'The learner’s own report is quoted back');
  await shot(page, '16-landing');
  await page.click('[data-action="continue"]'); await startStep(page);

  // 7. Return to Endurance — film ending and reflection
  check((await heading(page)) === 'This time, you know why.', 'Return opens on the film ending and reflection');
  check((await stageText(page)).includes('3:35–4:19'), 'Ending excerpt shows 3:35–4:19');
  check((await bodyText(page)).includes('closer or heavier black hole'), 'Reflection quotes the learner’s first guess');
  check(await page.isDisabled('[data-action="reflect-continue"]'), 'Reflection needs a few sentences before moving on');
  await page.click('[data-action="ending-skip"]');
  await page.fill('#reflect-text', 'Gargantua made Δg huge, so the bulge was about 1,200 m.');
  check(!(await page.isDisabled('[data-action="reflect-continue"]')), 'Writing the reflection unlocks Continue');
  await shot(page, '17-reflect');
  await page.click('[data-action="reflect-continue"]');
  check((await heading(page)) === 'Mission summary' && (await page.$$('.sum-card2')).length === 4, 'Mission summary shows four cards');
  await page.click('[data-action="deeper-open"]');
  check((await heading(page)) === 'The real physics behind Miller’s planet' && (await stageText(page)).includes('Kip Thorne'), 'Go deeper opens with Thorne’s explanation');
  await page.click('[data-action="deeper-close"]');
  check((await heading(page)) === 'Mission summary', 'Back to summary returns to the summary');
  await shot(page, '18-summary');

  // Navigate back
  await gotoStep(page, 2);
  check((await page.textContent('#console-head .eyebrow')).includes('test 1 of 3'), 'Checkpoint nav goes back to the Tide Lab');
  check((await bodyText(page)).includes('Correct'), 'Earlier test shows saved feedback state');
  await gotoStep(page, 6);
  // The step may reopen on its first task (the reflection); move on to the summary.
  if ((await heading(page)) !== 'Mission summary') await page.click('[data-action="reflect-continue"]');
  check((await heading(page)) === 'Mission summary', 'Checkpoint nav returns to the mission summary');

  // Export
  await page.click('#evidence-btn');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('[data-fk="d-export"]')]);
  await page.keyboard.press('Escape');
  const recPath = path.join(OUT, 'record.json');
  await dl.saveAs(recPath);
  const rec = JSON.parse(fs.readFileSync(recPath, 'utf8'));
  check(rec.schema === 'tidal-forecast-mission/session-record@1' && rec.sessionId, 'Export has schema and session ID');
  check(rec.condition === 'b' && dl.suggestedFilename().includes('-B-'), 'A/B: the plain link is version B, recorded in the export and its file name');
  const e2 = rec.activities['exp-gp'];
  check(e2.firstAttempt.prediction === 6 && e2.firstAttempt.outcome.overall === 'not-yet', 'Test 2 first attempt preserved (6 m, not yet)');
  check(e2.retries.length === 1 && e2.retries[0].prediction === 1 && e2.retries[0].variant === 4, 'Test 2 retry recorded separately (gₚ ×4, 1 m)');
  check(JSON.stringify(e2.retries[0].hintsUsedBeforeSubmit) === '[1,2,3]', 'Hints and their order recorded on the retry');
  check(e2.completion === 'assisted', 'Test 2 completion = assisted (not independent)');
  check(rec.activities['exp-dg'].completion === 'independent', 'Test 1 completion = independent');
  check(rec.activities['console-dg'].completion === 'assisted', 'Find Δg (wrong first) = assisted');
  check(rec.activities['console-gp'].completion === 'assisted', 'Find gₚ (hint before submit) = assisted');
  const rk = rec.activities['tide-rank'];
  check(rk.completion === 'unscored' && rk.firstAttempt.order.join() === 'centre,near,far' && rk.firstAttempt.outcome.overall === 'not-yet' &&
    rk.retries.length === 1 && rk.retries[0].order.join() === 'near,centre,far' && rk.retries[0].outcome.overall === 'correct',
    'Rank task recorded, unscored: each order the learner checked is kept, first try and retry');
  check(rec.activities['decode-summary'].completion === 'assisted' && rec.activities['decode-summary'].firstAttempt.outcome.rows.gp.change === false, 'Decode: the wrong blank is recorded, completion assisted');
  const q1r = rec.activities['qc-1'];
  check(q1r.firstAttempt.outcome.overall === 'partly' && q1r.firstAttempt.outcome.solve === false && q1r.completion === 'assisted', 'Quick check 1: right values, wrong h recorded as partly, assisted');
  const q2r = rec.activities['qc-2'];
  check(q2r.firstAttempt.mapping.dg === 'up' && q2r.firstAttempt.outcome.overall === 'partly' && q2r.firstAttempt.outcome.mapping.gp.model === 'down',
    'Quick check 2 first attempt records the mapping and its outcome');
  check(q2r.retries.length === 1 && q2r.retries[0].variant.change.gp === 4 && q2r.completion === 'assisted', 'Quick check 2 retry recorded separately (gₚ ×4), assisted');
  check(rec.activities['qc-3'].completion === 'independent' && rec.activities['qc-4'].completion === 'independent', 'Quick checks 3 and 4 independent');
  check(rec.activities['miller-forecast'].completion === 'independent' && rec.activities['miller-forecast'].firstAttempt.values.h === '1200', 'Miller forecast recorded (1,200 m)');
  const lc = rec.activities['landing-call'];
  check(lc.firstAttempt.choice === 'yes' && lc.retries.length === 1 && lc.retries[0].choice === 'no' && lc.retries[0].report.includes('1,200 m') && lc.completion === 'assisted',
    'Landing call: both decisions and the report recorded, assisted');
  check(rec.summary.scoredActivities === 13, 'Thirteen scored activities (' + rec.summary.scoredActivities + ')');
  check(rec.evidence.length === 4, 'All four findings in the evidence log');
  check(rec.firstIdea.text === 'A closer or heavier black hole?', 'First guess recorded');
  check(rec.video.opening.fallbackShownAt && rec.video.opening.error, 'Video fallback recorded');
  check(rec.video.ending && rec.video.ending.skippedAt, 'Ending skip recorded');
  check(rec.reflection && rec.reflection.text.startsWith('Gargantua made Δg huge') && !!rec.reflection.at, 'The written reflection is in the export');
  check(!!rec.goDeeperOpenedAt, 'Opening Go deeper is recorded');
  check(typeof rec.elapsed.activeVisibleMs === 'number', 'Elapsed time recorded');
  console.log('    summary:', JSON.stringify(rec.summary));

  await page.click('[data-action="finish"]');
  await page.waitForSelector('#screen-heading');
  check((await page.textContent('#screen-heading')).trim() === 'Mission complete!', 'Finish mission shows the complete screen');
  check((await page.$$('#screen .ach-chips li')).length === 4, 'Complete screen shows four achievement chips');
  check((await page.textContent('#screen .screen-lede')).startsWith('You started with a guess'), 'Version B: the complete screen recalls the starting guess');
  check(await page.isVisible('#screen [data-action="export"]'), 'Research link: export is open on the complete screen');
  await shot(page, '19-complete');
  await page.click('[data-action="hide-screen"]');
  check((await heading(page)) === 'Mission summary', 'Review the summary returns to the mission summary');

  // Evidence dialog + reset
  await page.click('#evidence-btn');
  check(await page.isVisible('#evidence-dialog'), 'Evidence dialog opens');
  check((await page.$$('#evidence-dialog .ev-entry.found')).length === 4, 'All 4 evidence entries found');
  await page.keyboard.press('Escape');
  check(!(await page.isVisible('#evidence-dialog')), 'Escape closes dialog');
  await page.click('#evidence-btn');
  await page.click('[data-fk="d-reset"]');
  await page.click('[data-action="reset-confirm"]');
  await page.waitForSelector('#screen-heading');
  check((await page.textContent('#screen-heading')).trim() === 'Tidal Forecast Mission', 'Reset returns to the start screen');
  await page.click('[data-action="start-mission"]');
  check((await heading(page)) === 'Analyst, you’ve seen how this ends.', 'Start after reset opens the briefing');
  check((await page.evaluate(() => window.TFM.getState().firstIdea)) === null, 'Reset clears state');

  const fullIntros = introsSeen.splice(0);
  check(introPages.ok === 6 && introPages.bad === 0, 'Each step intro is one page: crew card, then the job and Start (' + introPages.ok + ')');
  check(JSON.stringify(fullIntros) === JSON.stringify(['Pre-flight Check', 'Tide Lab', 'Decode the Model', 'Quick Checks', 'Landing Call: Miller’s Planet', 'Return to Endurance']),
    'Each step opened with its intro page once (' + fullIntros.join(' · ') + ')');
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
  await toIdea(np);
  await np.fill('#first-idea', 'maybe the moon');
  await np.check('[data-fk="first-notsure"]');
  check(await np.isDisabled('#first-idea'), 'Ticking "Not sure yet" greys out the idea box');
  await np.uncheck('[data-fk="first-notsure"]');
  check(!(await np.isDisabled('#first-idea')) && (await np.inputValue('#first-idea')) === 'maybe the moon', 'Unticking restores the typed idea');
  await np.check('[data-fk="first-notsure"]');
  await np.click('[data-action="log-idea"]'); await startStep(np);
  const fi = await np.evaluate(() => window.TFM.getState().firstIdea);
  check(fi.notSure === true && fi.text === '', 'Only "Not sure yet" is logged when it is ticked');
  await np.screenshot({ path: path.join(OUT, 'n1b-rank.png'), fullPage: true });
  const rankOverflow = await np.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  check(rankOverflow <= 0, 'Narrow: rank task has no horizontal overflow (' + rankOverflow + 'px)');
  await doRank(np);
  await doConsole(np);
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
  await toIdea(tp);
  await tp.fill('#first-idea', 'size of the planet');
  await tp.click('[data-action="log-idea"]'); await startStep(tp);
  await tp.screenshot({ path: path.join(OUT, 't1-rank.png') });
  await tp.click('#evidence-btn');
  check(await tp.isVisible('#evidence-dialog .research-details'), 'Learner link: session record sits in a collapsed teachers/researchers section');
  check(!(await tp.isVisible('#evidence-dialog [data-action="export"]')), 'Learner link: export is hidden until that section is opened');
  await tp.keyboard.press('Escape');
  // A learner who ranks correctly on the first try must be told so.
  await tp.click('[data-action="rank-move"][data-id="near"][data-dir="-1"]');
  await tp.click('[data-action="rank-move"][data-id="near"][data-dir="-1"]');
  await tp.click('[data-action="rank-check"]');
  check((await tp.textContent('#console-body')).includes('near side is pulled hardest') &&
    (await tp.$$eval('.rank-name', ns => ns.map(n => n.textContent))).join() === 'Near,Centre,Far', 'A correct ranking on the first try is confirmed, and the list keeps that order');
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
    await toIdea(mp);
    await mp.fill('#first-idea', 'closer black hole');
    await mp.click('[data-action="log-idea"]'); await startStep(mp);
    const r = {};
    r.sweep = await mp.evaluate(() => !!document.querySelector('.blk.done.enter'));
    r.nowPop = await mp.evaluate(() => !!document.querySelector('.blk.now.enter'));
    await mp.click('[data-action="hint-toggle"]');
    r.hintUnfold = await mp.evaluate(() => !!document.querySelector('.hint-panel.enter'));
    await mp.click('[data-action="hint-close"]');
    await doRank(mp);
    await doConsole(mp, async t => {
      if (t === 'dg') r.fbEnter = await mp.evaluate(() => !!document.querySelector('.fb.enter'));
    });
    await mp.fill('#pred-input', '8');
    await mp.click('[data-action="run-exp"]');
    await mp.waitForTimeout(150);
    await mp.click('[data-action="to-explain"]');
    await mp.check('input[name="exp-choice"][value="stretch"]');
    await mp.click('[data-action="submit-explain"]');
    r.evEnter = await mp.evaluate(() => !!document.querySelector('.ev-added.enter'));
    r.evBump = await mp.evaluate(() => document.getElementById('evidence-btn').classList.contains('bump'));
    await mp.click('[data-action="continue"]');
    r.slideFwd = await mp.evaluate(() => document.getElementById('console-body').classList.contains('nav-fwd'));
    await gotoStep(mp, 1);
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
  check(mo.evEnter && mo.evBump, 'New evidence: entry rises in and the top-bar count bumps');
  check(mo.slideBack, 'Going back slides the panel in from the left');
  check(mo.revisitQuiet, 'Revisiting a step does not replay old feedback entrances');
  check(mo.loadQuiet, 'Nothing animates on page load');
  check(mo.errors.length === 0, 'Motion run: no page errors ' + mo.errors.join(' | '));
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
  console.log('\n# Hint nudge (?nudge=1: the hint button glows after 1 s without a hint or submission)');
  {
    const gctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await gctx.route(/youtube\.com|ytimg|googlevideo/, r => r.abort());
    const gp = await gctx.newPage();
    await gp.goto(URL + (URL.includes('?') ? '&' : '?') + 'nudge=1');
    await gp.evaluate(() => localStorage.clear());
    await gp.reload();
    await gp.click('[data-action="start-mission"]');
    await gp.waitForTimeout(1300);
    check(!(await gp.$('.hint-btn')), 'Nudge: no hint button (and no nudge) on the briefing');
    await toIdea(gp);
    await gp.fill('#first-idea', 'x');
    await gp.click('[data-action="log-idea"]'); await startStep(gp);
    await doRank(gp);
    check(!(await gp.$('.hint-btn.nudge')), 'Nudge: not straight away');
    await gp.waitForTimeout(1300);
    check(!!(await gp.$('.hint-btn.nudge')) && (await gp.textContent('.hint-btn')).includes('Need a hint?'), 'Nudge: hint button glows and reads “Need a hint?” after the delay');
    check(!!(await gp.evaluate(() => window.TFM.getState().activities['console-dg'].attempts[0].hintNudgedAt)), 'Nudge: time recorded on the attempt');
    await gp.click('[data-action="hint-toggle"]');
    await gp.click('[data-action="hint-close"]');
    await gp.waitForTimeout(1300);
    check(!(await gp.$('.hint-btn.nudge')), 'Nudge: stops once a hint has been opened on this attempt');
    await gctx.close();
  }

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
  check(targets.length === 28, 'Jump menu lists start, 6 intro pages, all 20 tasks and the complete screen (' + targets.length + ')');
  for (const v of targets) {
    await dp.selectOption('#dev-jump', v);
    await dp.click('[data-action="dev-jump"]');
    const h = await dp.evaluate(() => {
      const el = document.querySelector('#screen:not([hidden]) #screen-heading') || document.querySelector('#app:not([hidden]) #task-heading');
      return el ? el.textContent.trim() : '';
    });
    if (!h) check(false, 'Jump to ' + v + ' shows a heading');
    if (v.startsWith('intro:') && !(await dp.$('#screen .intro-card'))) check(false, 'Intro ' + v + ' shows the crew card');
    if (!v.startsWith('screen:') && !v.startsWith('intro:')) {
      // Several tasks (ranking, tables, story pages) show no formula; the rest must agree on where it sits.
      const ft = await dp.evaluate(() => {
        const e = document.querySelector('#formula .eq-bar');
        return e && e.offsetParent ? Math.round(e.getBoundingClientRect().top) : null;
      });
      if (ft !== null) formulaTops.add(ft);
    }
  }
  check(formulaTops.size === 1, 'Formula sits at the same position on every task that shows it (' + [...formulaTops].join(', ') + 'px)');
  check(derr.length === 0, 'Every jump renders without page errors' + (derr.length ? ': ' + derr.join(' | ') : ''));
  await dp.selectOption('#dev-jump', '6:1');
  await dp.click('[data-action="dev-jump"]');
  check((await dp.textContent('#task-heading')).trim() === 'Mission summary', 'Jump straight to the mission summary');
  check((await dp.$$('#checkpoints button:disabled')).length === 0, 'Dev mode unlocks every checkpoint');
  await dp.reload();
  check(await dp.isVisible('#devbar'), 'Dev mode stays on after a reload');
  const ds = await dp.evaluate(() => window.TFM.getState().devMode);
  check(ds && ds.enabledAt && ds.jumps.length === targets.length + 1, 'Session record notes dev mode and each jump');
  const rec2 = await dp.evaluate(() => window.TFM.buildRecord());
  check(rec2.devMode && rec2.devMode.jumps.length === ds.jumps.length, 'Export includes devMode');
  await dp.click('[data-action="dev-toggle"][data-fk="dev-off"]');
  check(!(await dp.isVisible('#devbar')), 'Turn off hides the jump bar');
  await gotoStep(dp, 6);
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

  /* ------------------------------------------------------------------ */
  console.log('\n# Short laptop screen 1000×680 (the task panel scrolls; nothing in it is squashed)');
  const sctx = await browser.newContext({ viewport: { width: 1000, height: 680 }, reducedMotion: 'reduce' });
  const sp = await sctx.newPage();
  await sp.goto(URL + (URL.includes('?') ? '&' : '?') + 'dev=1');
  await sp.evaluate(() => localStorage.clear());
  await sp.reload();
  await sp.selectOption('#dev-jump', '2:1');
  await sp.click('[data-action="dev-jump"]');
  for (let i = 0; i < 4; i++) await sp.click('[data-action="pred-up"]');
  await sp.click('[data-action="run-exp"]');
  await sp.click('[data-action="to-explain"]');
  await sp.check('input[name="exp-choice"][value="restore"]');
  await sp.click('[data-action="submit-explain"]');
  await sp.waitForTimeout(300);
  const squashed = await sp.evaluate(() => [...document.querySelectorAll('#console-body > *')].filter(el => el.scrollHeight > el.clientHeight + 1).map(el => el.className));
  check(squashed.length === 0, 'Short screen: no part of the feedback panel is squashed ' + squashed.join(' | '));
  const answer = await sp.evaluate(() => { const el = document.querySelector('#console-body .choice-locked'); const t = el.querySelector('span:last-child').getBoundingClientRect(), b = el.getBoundingClientRect(); return t.top >= b.top && t.bottom <= b.bottom; });
  check(answer, 'Short screen: the selected answer’s text stays inside its box');
  check(await sp.evaluate(() => { const b = document.getElementById('console-body'); return b.scrollHeight > b.clientHeight; }), 'Short screen: the panel scrolls when the feedback is taller than the screen');
  check(await sp.evaluate(() => { const a = document.querySelector('#console-body .actions').getBoundingClientRect(), b = document.getElementById('console-body').getBoundingClientRect(); return a.bottom <= b.bottom + 1 && a.top >= b.top; }), 'Short screen: the main action stays visible while the panel scrolls');
  await sp.screenshot({ path: path.join(OUT, 's1-short-feedback.png') });
  await sctx.close();

  /* ------------------------------------------------------------------ */
  console.log('\n# A/B test: version A (?v=a) has no first guess and no prediction in the Tide Lab');
  const q = (extra) => URL + (URL.includes('?') ? '&' : '?') + extra;
  const actx = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
  await actx.route(/youtube\.com|ytimg|googlevideo/, r => r.abort());
  const ap = await actx.newPage();
  const aerr = [];
  ap.on('pageerror', e => aerr.push('pageerror: ' + e.message));
  ap.on('console', m => { if (m.type() === 'error' && !/youtube|ERR_FAILED|net::/i.test(m.text())) aerr.push('console: ' + m.text()); });
  // Leave a version-B session in this browser first: version A must not pick it up.
  await ap.goto(q('research=1'));
  await ap.evaluate(() => localStorage.clear());
  await ap.reload();
  await ap.click('[data-action="start-mission"]');
  await ap.waitForSelector('#task-heading');
  check((await ap.evaluate(() => window.TFM.getState().condition)) === 'b', 'A/B: a session on the plain link is version B');
  await ap.goto(q('v=a&research=1'));
  await ap.waitForSelector('#screen-heading');
  check((await ap.textContent('#screen-heading')).trim() === 'Tidal Forecast Mission' &&
    (await ap.evaluate(() => window.TFM.getState().condition)) === 'a', 'A/B: ?v=a starts its own session instead of resuming version B');
  check(!/predict/i.test(await ap.textContent('.loop')), 'Version A: start screen does not list a prediction step');
  await ap.click('[data-action="start-mission"]');
  // Briefing: the scene, then the mission question with no first guess to log.
  check((await ap.textContent('#console-head .prompt')).trim() === 'Then see the question for this mission.' &&
    (await ap.textContent('[data-action="brief-next"]')).trim() === 'See the mission question', 'Version A: briefing does not ask for a first guess');
  await toIdea(ap);
  check((await heading(ap)).includes('What might make a tidal bulge larger') && !(await ap.$('#first-idea')) && !(await ap.$('[data-action="log-idea"]')) &&
    !(await ap.$('[data-fk="first-notsure"]')), 'Version A: the mission question is shown with nothing to answer');
  check(!/first (idea|guess)/i.test(await heading(ap)) && !/first (idea|guess)/i.test(await bodyText(ap)), 'Version A: question section has no first-guess wording');
  check(await ap.isVisible('#formula .eq-bar'), 'Version A: question section shows the model');
  await shot(ap, 'a0-briefing-question');
  await ap.click('[data-action="continue"]'); await startStep(ap);
  check((await ap.evaluate(() => window.TFM.getState().firstIdea)) === null, 'Version A: no first guess is recorded');
  check(await ap.evaluate(() => !!localStorage.getItem('tfm.session.v3') && !!localStorage.getItem('tfm.session.v3.a')), 'A/B: each version saves under its own key');
  check((await heading(ap)) === 'Rank the pull of the Moon', 'A/B: the Pre-flight ranking is the same in version A');
  check(!/guess|predict/i.test(await bodyText(ap)) && (await bodyText(ap)).includes('Rank the Moon’s pull'), 'Version A: the ranking task does not call the answer a guess');
  await doRank(ap);
  check((await heading(ap)).includes('Δg'), 'A/B: the Pre-flight variables are the same in version A');
  for (const t of ['dg', 'gp', 'R']) {
    await ap.click(`[data-fk="tgt-${t}"] .hit >> nth=0`, { force: true });
    await ap.click('[data-action="console-check"]');
    await ap.click('[data-action="continue"]');
    if (t !== 'R') await startStep(ap);
  }
  // The Tide Lab intro page: the job line leaves out the prediction.
  check((await ap.textContent('#screen .intro-job')).trim() === 'Your job: Run the model, then explain the change.', 'Version A: Tide Lab intro says run, then explain');
  await ap.click('[data-action="start-step"]');

  // Test 1: run straight away, no prediction controls.
  check(!(await ap.$('#pred-input')) && !(await ap.$('.gauge-track[role="slider"]')) && !(await ap.$('[data-action="pred-up"]')), 'Version A: no stepper and no draggable gauge');
  check(!(await ap.$('[data-action="hint-toggle"]')), 'Version A: no hint before the run (nothing to answer yet)');
  check(!(await ap.isDisabled('[data-action="run-exp"]')), 'Version A: Run experiment is available at once');
  check((await ap.textContent('.h-bracket')).includes('h = 4 m') && !(await ap.$('.g-fill')), 'Version A: baseline shown and no result before the run');
  await shot(ap, 'a1-exp1-before');
  await ap.click('[data-action="run-exp"]');
  await ap.waitForTimeout(1100);
  check((await heading(ap)).includes('8 m'), 'Version A: Δg ×2 → 8 m');
  check(!(await ap.isVisible('.g-you')) && !(await ap.isVisible('.g-marker')) && (await ap.textContent('.g-model')).includes('8'), 'Version A: gauge shows the model result with no "You" marker');
  await shot(ap, 'a2-exp1-result');
  await ap.click('[data-action="to-explain"]');
  check(!!(await ap.$('input[name="exp-choice"]')) && !!(await ap.$('[data-action="hint-toggle"]')), 'Version A: same explanation question, with hints');
  await ap.check('input[name="exp-choice"][value="stretch"]');
  await ap.click('[data-action="submit-explain"]');
  const afb1 = await bodyText(ap);
  check(afb1.includes('Correct') && afb1.includes('Added to the crew’s evidence log') && !/you predicted/i.test(afb1), 'Version A: correct explanation gets the same feedback, without a prediction recap');
  await ap.click('[data-action="continue"]'); await startStep(ap);

  // Test 2: wrong explanation, then a fresh run with new values.
  await ap.click('[data-action="run-exp"]');
  check((await heading(ap)).includes('2 m'), 'Version A: gₚ ×2 → 2 m');
  await ap.click('[data-action="to-explain"]');
  await ap.check('input[name="exp-choice"][value="lift"]');
  await ap.click('[data-action="submit-explain"]');
  const afb2 = await bodyText(ap);
  check(afb2.includes('Not yet') && afb2.includes('holds the ocean down') && afb2.includes('divided by 2') && !/you predicted/i.test(afb2), 'Version A: wrong explanation gets the same misconception feedback');
  check((await ap.textContent('[data-action="fresh-attempt"]')).trim() === 'Try a fresh experiment', 'Version A: retry is a fresh experiment');
  await shot(ap, 'a3-exp2-feedback');
  await ap.click('[data-action="fresh-attempt"]');
  check((await ap.textContent('.lab-chip.on')).includes('×4') && !(await ap.$('#pred-input')),'Version A: fresh experiment uses new values (gₚ ×4), still with no prediction');
  await ap.click('[data-action="run-exp"]');
  await ap.click('[data-action="to-explain"]');
  await ap.check('input[name="exp-choice"][value="restore"]');
  await ap.click('[data-action="submit-explain"]');
  await ap.click('[data-action="continue"]'); await startStep(ap);

  // Test 3, with a reload after the run.
  await ap.click('[data-action="run-exp"]');
  await ap.reload();
  await ap.waitForSelector('#task-heading');
  check((await heading(ap)).includes('8 m') && (await ap.evaluate(() => window.TFM.getState().condition)) === 'a', 'Version A: reload on the ?v=a link restores the session');
  await ap.click('[data-action="to-explain"]');
  await ap.check('input[name="exp-choice"][value="fraction"]');
  await ap.click('[data-action="submit-explain"]');
  await ap.click('[data-action="continue"]');
  check((await heading(ap)) === 'Lab results', 'Version A: the results table follows, unchanged');
  await ap.click('[data-action="continue"]'); await startStep(ap);
  check((await heading(ap)) === 'What did each test tell you?' && await ap.isDisabled('[data-action="decode-check"]'), 'Version A: later steps still ask for an answer before the reveal');

  // The record.
  await ap.click('#evidence-btn');
  const [adl] = await Promise.all([ap.waitForEvent('download'), ap.click('[data-fk="d-export"]')]);
  const arecPath = path.join(OUT, 'record-a.json');
  await adl.saveAs(arecPath);
  const arec = JSON.parse(fs.readFileSync(arecPath, 'utf8'));
  check(arec.condition === 'a' && /no prediction/i.test(arec.conditionLabel) && adl.suggestedFilename().includes('-A-'), 'Version A: export carries the condition, and so does the file name');
  const a1 = arec.activities['exp-dg'], a2 = arec.activities['exp-gp'];
  check(!('prediction' in a1.firstAttempt) && a1.firstAttempt.result === 8 && !!a1.firstAttempt.ranAt, 'Version A: test attempts record the run and result, with no prediction');
  check(a1.firstAttempt.outcome.prediction === null && a1.firstAttempt.outcome.overall === 'correct' && a1.completion === 'independent', 'Version A: test outcome rests on the explanation');
  check(a2.firstAttempt.outcome.overall === 'not-yet' && a2.retries.length === 1 && a2.retries[0].variant === 4 && a2.completion === 'assisted', 'Version A: first attempt and fresh experiment recorded separately');
  check(arec.evidence.length === 3, 'Version A: the three findings are logged');
  check(arec.firstIdea === null && arec.activities.briefing.completion === 'unscored' && !/first (idea|guess)/i.test(arec.activities.briefing.label), 'Version A: the briefing is recorded without a first guess');

  // Back on the plain link, the version-B session is where it was left.
  await ap.goto(q('research=1'));
  await ap.waitForSelector('#task-heading');
  const bst = await ap.evaluate(() => window.TFM.getState());
  check(bst.condition === 'b' && bst.pos.step === 0 && !bst.activities['exp-dg'], 'A/B: the plain link resumes the version-B session, untouched by version A');
  check(aerr.length === 0, 'Version A: no page errors ' + aerr.join(' | '));

  // Developer bar: shows the version and switches between them.
  await ap.goto(q('v=a&dev=1'));
  await ap.waitForSelector('#devbar .devbar-version');
  check((await ap.textContent('.devbar-version')).trim() === 'Version A' && (await ap.textContent('[data-fk="dev-version"]')).trim() === 'Switch to B', 'Dev bar names the version and offers the other');
  await shot(ap, 'a4-devbar');
  // Return to Endurance in version A: the reflection, with no first guess to quote.
  await ap.selectOption('#dev-jump', '6:0');
  await ap.click('[data-action="dev-jump"]');
  const arefl = await bodyText(ap);
  check((await heading(ap)) === 'This time, you know why.' && !(await ap.$('.quote-accent')) && !/first (idea|guess)/i.test(arefl), 'Version A: the reflection has no first-guess quote');
  check(!!(await ap.$('#reflect-text')), 'Version A: the reflection question is the same');
  await shot(ap, 'a6-reflect');
  await ap.selectOption('#dev-jump', 'screen:complete');
  await ap.click('[data-action="dev-jump"]');
  const alede = await ap.textContent('#screen .screen-lede');
  check(alede.startsWith('You built a model from your own evidence') && !/guess/i.test(alede), 'Version A: the complete screen does not mention a starting guess');
  await ap.click('[data-fk="dev-version"]');
  await ap.waitForSelector('#devbar .devbar-version');
  check((await ap.textContent('.devbar-version')).trim() === 'Version B' && !/[?&]v=/.test(ap.url()) && /dev=1/.test(ap.url()), 'Dev bar switch opens version B and keeps the other link options');
  await actx.close();

  const anctx = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  const anp = await anctx.newPage();
  await anp.goto(q('v=a&dev=1'));
  await anp.evaluate(() => localStorage.clear());
  await anp.reload();
  await anp.selectOption('#dev-jump', '2:0');
  await anp.click('[data-action="dev-jump"]');
  const adOverflow = await anp.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  check(adOverflow <= 0, 'Version A narrow: dev bar with the version switch has no horizontal overflow (' + adOverflow + 'px)');
  await anp.click('[data-action="run-exp"]');
  check((await anp.isVisible('.hbars.narrow-only')) && (await anp.$$('.hbars.narrow-only .hb-row')).length === 1, 'Version A narrow: result bars show the model only');
  await anp.screenshot({ path: path.join(OUT, 'a5-narrow-result.png'), fullPage: true });
  const anOverflow = await anp.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  check(anOverflow <= 0, 'Version A narrow: no horizontal page overflow (' + anOverflow + 'px)');
  await anctx.close();

  await browser.close();
  console.log(failures ? `\n${failures} check(s) FAILED` : '\nAll checks passed');
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
