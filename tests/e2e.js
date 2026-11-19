// End-to-end test in headless Chrome. Requires: npm i --no-save playwright-core, a local server on :8765.
const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');

// BASE is the bare address. Without ?v= the module assigns a version at random, so every
// run below names one: URL is version B (evidence first); the A/B section at the end covers
// version A and the random assignment.
const BASE = process.env.TFM_URL || 'http://127.0.0.1:8765/index.html';
const URL = BASE + (BASE.includes('?') ? '&' : '?') + 'v=b';
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
// Pre-flight task 1: move "Near" to the top (Near, Center, Far), check, continue.
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
async function startMission(p) {
  // The start screen has two pages: Continue, then Start mission.
  if (await p.$('[data-action="intro-continue"]')) await p.click('[data-action="intro-continue"]');
  await p.click('[data-action="start-mission"]');
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
  check((await page.$$('#sky canvas')).length === 2 && await page.evaluate(() => {
    const c = document.querySelector('#sky canvas'); const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 30) n++; return n > 200;
  }), 'The sky behind the tasks is drawn: two layers of stars');
  check(!(await page.isVisible('.checkpoints')), 'Start screen hides the checkpoint nav');
  check((await page.textContent('#screen-heading')).trim() === 'Tidal Forecast Mission' && !(await page.$('.loop')) &&
    !!(await page.$('[data-action="intro-continue"]')), 'Start screen page 1: the title and story, no phase list yet');
  await shot(page, '00-start');
  await page.click('[data-action="intro-continue"]');
  check((await page.textContent('#screen-heading')).trim() === 'Your mission' &&
    (await page.evaluate(() => document.activeElement.id)) === 'screen-heading' && (await page.$$('.intro-goals li')).length === 3,
    'Start screen page 2: the goals, with focus on its heading');
  await page.click('[data-action="intro-back"]');
  check((await page.textContent('#screen-heading')).trim() === 'Tidal Forecast Mission', 'Start screen: Back returns to page 1');
  await page.click('[data-action="intro-continue"]');
  check((await page.$$eval('.loop li', ls => ls.map(l => l.textContent.trim()))).join('|') ===
    'Incoming Transmission|Pre-flight Check|Tide Lab|Decode the Model|Quick Checks|Landing Call|Return to Endurance', 'Start screen lists the seven mission phases');
  check(await page.evaluate(() => {
    const col = document.querySelector('#screen .screen-inner').getBoundingClientRect();
    return [...document.querySelectorAll('#screen .screen-inner > *, #screen .loop')].every(e => e.getBoundingClientRect().right <= col.right + 1);
  }), 'Start screen: every block, phase chips included, stays inside one column');
  await shot(page, '00-start-2');
  await startMission(page);
  check(!!(await page.$('.tx-open .txo-label')) && (await page.textContent('.tx-open')).trim() === 'Incoming Transmission' &&
    (await page.evaluate(() => getComputedStyle(document.querySelector('.tx-open')).pointerEvents)) === 'none' && !!(await page.$('#task-heading')),
    'Mission start: the channel opens over the first task, which is already there and takes clicks');
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
  check((await page.title()) === 'Incoming Transmission · Tidal Forecast Mission', 'The page title follows the phase');
  check(await page.evaluate(() => getComputedStyle(document.querySelector('.video-start')).backgroundImage.includes('start-bg.jpg')),
    'Before Play, the video frame shows a film still');
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
  check(!(await page.isVisible('#formula')), 'The question section has no formula: the model has not been introduced yet');
  check(await page.isDisabled('[data-action="log-idea"]'), 'Log idea disabled before any input');
  await page.fill('#first-idea', 'A closer or heavier black hole?');
  check(!(await page.isDisabled('[data-action="log-idea"]')), 'Log idea enabled after typing');
  await page.click('[data-action="log-idea"]');
  check((await page.textContent('#screen-heading')).trim() === 'Pre-flight Check' && !!(await page.$('#screen .intro-card')), 'Pre-flight Check opens on its intro page');
  check(!(await page.$('.tx-open')), 'Mission start: the opening is gone within two seconds');
  check((await page.$$('#screen .tx-stream .w')).length > 10 && (await page.textContent('#screen .tx-stream')).includes('You look like you’ve seen a ghost'),
    'Crew messages arrive word by word, with all their text in the page from the start');
  await shot(page, '02b-preflight-intro');
  await startStep(page);

  // 2. Pre-flight Check — task 1: rank the Moon's pull (unscored)
  check((await heading(page)) === 'Rank the pull of the Moon', 'Pre-flight task 1 ranks the Moon’s pull');
  check((await page.textContent('.coach')).includes('Mission control') && (await page.textContent('.coach')).includes('Open Hint. Hints are free.'),
    'The first task with hints points to the Hint button, in mission control’s voice');
  await page.click('[data-action="coach-dismiss"]');
  check(!(await page.$('.coach')), 'The pointer goes when dismissed');
  check((await bodyText(page)).includes('What’s your guess?'), 'Version B: the ranking task asks for a guess');
  check((await page.$$eval('.rank-name', ns => ns.map(n => n.textContent))).join() === 'Center,Far,Near', 'Ranking starts as Center, Far, Near');
  check(await page.isDisabled('[data-action="rank-check"]'), 'Check selection is locked until a point is moved');
  check(!(await page.isVisible('#formula')), 'Rank task hides the model formula');
  check(((await page.textContent('#console-head .prompt')) + ' ' + (await page.textContent('.rank-task'))).split(/\s+/).length < 60, 'Rank task: the text before the list is short');
  {
    // Drag the Near card up one place.
    const cards = page.locator('.rank-card');
    const slot = (await cards.nth(1).boundingBox()).y - (await cards.nth(0).boundingBox()).y;
    const b = await page.locator('.rank-card[data-rank-id="near"]').boundingBox();
    const tipBefore = await page.getAttribute('.rk-arrow[data-rk="near"]', 'x2');
    await page.mouse.move(b.x + 80, b.y + b.height / 2);
    await page.mouse.down();
    await page.mouse.move(b.x + 80, b.y + b.height / 2 - slot, { steps: 8 });
    check(!!(await page.$('.rank-card.dragging')), 'Rank: a card can be picked up');
    await page.mouse.up();
    await page.waitForTimeout(600);
    check((await page.getAttribute('.rk-arrow[data-rk="near"]', 'x2')) !== tipBefore, 'Rank: the diagram’s arrows follow the new order');
  }
  check((await page.$$eval('.rank-name', ns => ns.map(n => n.textContent))).join() === 'Center,Near,Far', 'Dragging a point up reorders the list');
  check(!(await page.isDisabled('[data-action="rank-check"]')), 'Check selection unlocks after a move');
  await page.click('[data-action="rank-check"]');
  check((await bodyText(page)).includes('Distance matters'), 'A wrong ranking gets the distance hint, not a fail');
  check((await page.$$eval('.rank-name', ns => ns.map(n => n.textContent))).join() === 'Center,Near,Far', 'Checking keeps the learner’s order on screen');
  // Move Near to the top, however the list was left.
  for (let i = 0; i < 2 && (await page.textContent('.rank-name')) !== 'Near'; i++) await page.click('[data-action="rank-move"][data-id="near"][data-dir="-1"]');
  check(!!(await page.$('[data-action="rank-check"]')), 'Moving again after feedback reopens the check');
  await page.click('[data-action="rank-check"]');
  check((await bodyText(page)).includes('near side is pulled hardest'), 'Near, Center, Far is confirmed');
  check(await page.isVisible('.rk-day .rk-dot') && (await stageText(page)).includes('2 high tides'), 'A correct ranking plays the one-day loop: two high tides');
  await shot(page, '03-rank');
  await page.click('[data-action="continue"]');

  // Pre-flight tasks 2–4 — find Δg, gₚ, R; keyboard path with one wrong answer
  check((await heading(page)).includes('Δg'), 'Pre-flight task 2 asks for Δg');
  check(await page.evaluate(() => {
    const b = document.querySelector('.def-banner.db-dg'), body = document.querySelector('#console-body'), card = getComputedStyle(b), panel = getComputedStyle(body);
    return !!b && card.backgroundColor === panel.backgroundColor && card.borderLeftColor === 'rgb(245, 181, 68)' && getComputedStyle(document.querySelector('.planet-svg .stars')).display === 'none';
  }), 'One panel style: the definition banner matches the console, marked with its variable’s colour; diagrams use the sky’s stars');
  check(!(await page.$('.coach')), 'The pointer does not come back on later tasks');
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
  check((await page.textContent('.hint-level')).includes('Mission control · Hint 2 of 3'), 'Hint level advances, and hints come from mission control');
  await page.click('[data-action="hint-close"]');
  await page.click('[data-fk="tgt-gp"] .hit >> nth=0', { force: true });
  await page.click('[data-action="console-check"]');
  check((await bodyText(page)).includes('Correct'), 'gₚ arrows accepted by mouse');
  await page.click('[data-action="continue"]'); await startStep(page);
  await page.click('[data-fk="tgt-R"] .hit', { force: true });
  await page.click('[data-action="console-check"]');
  await page.click('[data-action="continue"]');
  check((await page.textContent('#screen-heading')).trim() === 'Tide Lab', 'Pre-flight Check leads to the Tide Lab intro');
  check((await page.textContent('#screen .intro-note')).includes('open Hint'), 'The Tide Lab intro says hints are there for predictions');
  await startStep(page);

  // 3. Tide Lab — test 1: Δg ×2, keyboard on the gauge
  check((await heading(page)) === 'What if the Moon were twice as heavy?' && (await page.textContent('#console-head .eyebrow')).includes('test 1 of 3'), 'Tide Lab test 1 starts on its scenario');
  check(!(await page.$('#stage .subnav')), 'Tide Lab: no 1·2·3 tab row under the equation');
  {
    // The test opens by showing what changed: the gap between the near and far pulls widens.
    // Only the cause moves. The ocean stays where it is, so nothing gives the prediction away.
    const nearLen = () => page.evaluate(() => { const l = document.querySelector('.planet-svg .grp line[marker-end]'); return Math.round(Math.abs(l.getAttribute('x2') - l.getAttribute('x1'))); });
    const len0 = await nearLen(), ocean0 = await page.getAttribute('.planet-svg ellipse.ocean', 'rx');
    await page.waitForTimeout(1900);
    check((await nearLen()) > len0 + 15 && (await page.getAttribute('.planet-svg ellipse.ocean', 'rx')) === ocean0,
      'Test 1 opens by showing the pull difference growing, while the ocean stays still (' + len0 + ' → ' + (await nearLen()) + ')');
    check((await page.$$('.planet-svg .pull-flow')).length === 3 && (await page.$$('.planet-svg .was-mark')).length === 2 && !!(await page.$('[data-action="cue-replay"]')),
      'Test 1: the pull arrows carry drifting dashes and marks where they stood at baseline, with a Replay change control');
    check((await bodyText(page)).includes('It’s your best guess, and it isn’t marked'), 'Tide Lab: the learner is told the prediction is a guess and is not marked');
    check((await page.textContent('.coach')).includes('Not sure how to predict? Open Hint for a pointer.'), 'The first Tide Lab test points to the Hint button again, for predictions');
    await page.focus('button.lab-chip[data-sym="gp"]');
    check(await page.isVisible('#symtip') && (await page.textContent('#symtip')).includes('the planet’s own surface gravity') &&
      (await page.getAttribute('button.lab-chip[data-sym="gp"]', 'aria-describedby')) === 'symtip', 'Symbol key: a Tide Lab chip says what its symbol means, from the keyboard too');
    await page.keyboard.press('Escape');
    check(!(await page.isVisible('#symtip')), 'Symbol key: Escape closes the note');
    await page.hover('#console-head .prompt');
  }
  check(!(await page.isVisible('#formula')), 'Version B: the Tide Lab runs with no formula on screen');
  check((await page.textContent('.h-bracket')).includes('h = 4 m') && !!(await page.$('.g-now')), 'Tide Lab: current bulge height outlined on the diagram (h = 4 m) and the gauge');
  check(await page.isDisabled('[data-action="run-exp"]'), 'Run experiment disabled before prediction');
  check(!(await page.$('.g-fill')) && !(await page.$('.g-model')), 'No result shown before prediction');
  const svgBefore = await page.getAttribute('.planet-svg ellipse.ocean', 'rx');
  await page.focus('.gauge-track[role="slider"]');
  for (let i = 0; i < 9; i++) await page.keyboard.press('ArrowUp'); // first press sets 4, then +0.5 ×8 = 8
  check((await page.inputValue('#pred-input')) === '8', 'Gauge keyboard sets prediction to 8 m');
  check(await page.getAttribute('.gauge-track', 'aria-valuetext') === '8 meters', 'Gauge exposes aria-valuetext');
  await page.waitForTimeout(400);
  check((await page.getAttribute('.planet-svg ellipse.ocean', 'rx')) !== svgBefore && (await page.textContent('.h-bracket')).includes('You 8 m'),
    'Diagram follows the gauge: the ocean stretches to the predicted 8 m, labelled as the learner’s');
  check(!(await page.$('.g-fill')) && !(await page.$('.g-model')), 'Still no result shown before the run');
  await page.click('[data-action="run-exp"]');
  await page.waitForTimeout(1100);
  check((await heading(page)) === 'Test result: 8 m.' && (await page.textContent('.g-model')).trim() === 'Result 8 m' && !/model/i.test(await stageText(page)),
    'Δg ×2 → 8 m, called a test result: the Tide Lab does not mention a model in version B');
  {
    const card = (await page.textContent('.calc-card')).replace(/\s+/g, ' ');
    check(card.includes('What this test showed') && card.includes('Only Δg changed (×2)') && card.includes('4 m to 8 m') && !card.includes('÷') && !/ratio/i.test(card),
      'Version B: the result is stated as what the test showed, without the formula’s arithmetic');
  }
  check((await page.textContent('.h-bracket')).includes('h = 8 m') && (await page.textContent('.planet-svg .ghost')).includes('You 8 m'),
    'After the run the diagram shows the model’s height and keeps the prediction as a dashed outline');
  await shot(page, '05-exp1-result');
  await page.click('[data-action="to-explain"]');
  await page.check('input[name="exp-choice"][value="stretch"]');
  await page.click('[data-action="submit-explain"]');
  check((await bodyText(page)).includes('Correct'), 'Test 1 correct feedback');
  check((await bodyText(page)).includes('Added to the crew’s evidence log'), 'Evidence entry added');
  check(!!(await page.$('.ev-fly')), 'A new finding is carried up to the evidence log');
  await page.waitForTimeout(1900);
  check(!(await page.$('.ev-fly')), 'The finding lands and is gone');
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
  check(fb2.includes('Not yet') && fb2.includes('You predicted 6 m; the result was 2 m') && fb2.includes('divided by 2'), 'Wrong answer gets relationship-specific feedback and reports the prediction back');
  check(fb2.includes('holds the ocean down'), 'Misconception-specific explanation feedback shown');
  check((await page.getAttribute('.hint-btn', 'class')).includes('nudge') && (await page.textContent('.hint-btn')).trim() === 'Need a hint?',
    'After a miss the Hint button asks straight away, without waiting');
  check((await page.getAttribute('[data-action="fresh-attempt"]', 'class')).includes('btn-primary') &&
    (await page.getAttribute('[data-action="continue"]', 'class')).includes('btn-secondary'), 'After a miss, trying again is the primary button');
  check(!!(await page.$('.ev-pending')) && !fb2.includes('Added to the crew’s evidence log') &&
    (await page.textContent('#evidence-count')).trim() === '1/4', 'A miss shows what the test found without logging it as earned');
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
  check(await page.evaluate(() => {
    const inner = document.querySelector('.stage-inner.stage-center'), stage = document.querySelector('#stage');
    if (!inner) return false;
    const i = inner.getBoundingClientRect(), s = stage.getBoundingClientRect();
    return Math.abs((i.top - s.top) - (s.bottom - i.bottom)) < 80 && (i.top - s.top) > 80;
  }), 'Pages made of cards sit in the middle of the stage, not pinned to its top');
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
  check((await stageText(page)).includes('each term comes from one row of your results table') && (await stageText(page)).includes('4 → 8 m') && (await page.textContent('#console-head .eyebrow')).includes('task 2 of 2'),
    'Version B: the model page ties each term to a row of the learner’s results');
  await shot(page, '10-decode-model');
  await page.click('[data-action="continue"]'); await startStep(page);

  // 5. Quick Checks — check 1: calculate h from real numbers, wrong first
  check((await page.textContent('#console-head .eyebrow')).includes('1 of 4') && (await heading(page)) === 'Scenario 1', 'Quick check 1 is a calculation');
  check(await page.isDisabled('[data-action="calc-check"]'), 'Quick check 1: Check locked until every field is filled');
  check((await page.textContent('#formula .k-chip')).trim() === 'k = 2' && (await page.textContent('#formula')).includes('k is a constant'), 'Quick checks: the formula bar states k = 2, a constant');
  check(!(await page.$('[data-fk="cv-k"]')) && /k =\s*2\s*constant/.test((await page.textContent('.calc-field.fixed')).replace(/\s+/g, ' ')), 'Quick check 1: k is given as a constant, not typed');
  check(await page.evaluate(() => { const p = document.querySelector('#console-body').getBoundingClientRect(); return [...document.querySelectorAll('.calc-field')].every(f => f.getBoundingClientRect().right <= p.right - 16); }), 'Quick check 1: no field runs past the panel edge');
  check((await page.$$('.planet-svg .t-val')).length === 0, 'Quick check 1: the diagram carries no values before any are typed');
  for (const [k, v] of [['dg', '0.00001'], ['gp', '10'], ['R', '2000000'], ['h', '8']]) await page.fill(`[data-fk="cv-${k}"]`, v);
  {
    const onDiagram = (await page.$$eval('.planet-svg .t-val', ts => ts.map(t => t.textContent.trim()))).join(' | ');
    check(onDiagram.includes('= 10 m/s²') && onDiagram.includes('2000000 m') && onDiagram.includes('= 0.00001 m/s²') && !onDiagram.includes('8 m') &&
      !(await page.textContent('.planet-svg')).includes('h = 8'),
      'Quick check 1: each typed value appears on the part of the diagram it belongs to; the answer being solved for does not (' + onDiagram + ')');
  }
  await page.click('[data-action="calc-check"]');
  check((await page.$$('.calc-field.bad')).length === 1 && (await page.$$('.calc-field.ok')).length === 3, 'Quick check 1: the wrong h is marked; the known values are marked right');
  check((await page.$$('[data-action="calc-retry"]')).length === 1, 'Quick check 1: a miss offers Try again');
  await page.click('[data-action="calc-retry"]');
  // The worked example is a different planet, and says so.
  await page.click('[data-action="hint-toggle"]');
  await page.click('[data-action="hint-next"]'); await page.click('[data-action="hint-next"]');
  const ex = await page.textContent('#hint-panel');
  check(ex.includes('Example only · different numbers from your task') && ex.includes('a different planet') && ex.includes('12 m') && !ex.includes('= 4 m'),
    'Quick check 1: the worked-example hint is tagged as different numbers and does not give this task’s answer');
  await page.click('[data-action="hint-close"]');
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
  for (const [k, v] of [['h', '6'], ['dg', '0.00003'], ['gp', '10']]) await page.fill(`[data-fk="cv-${k}"]`, v);
  check((await page.textContent('.planet-svg .h-bracket')).includes('h = 6 m') && (await page.$$('.planet-svg .t-val')).length === 2,
    'Quick check 4: the known bulge height is drawn, with Δg and gₚ written on the diagram and R (the answer) left off');
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
  await page.waitForTimeout(250);
  check(!!(await page.$('.cc-plot.zooming')) && (await page.textContent('.cc-panel figcaption')).trim() === 'To scale · 0 to 10 m' &&
    await page.isVisible('.cc-zlimit') && !(await page.isDisabled('[data-action="continue"]')),
    'The reveal opens at the lander’s scale (0 to 10 m, with its 5 m limit); Continue does not wait for it');
  check((await page.$$('.cc-panel')).length === 2 && (await stageText(page)).includes('Lander limit · 5 m'), 'The chart has a to-scale panel and an enlarged one that marks the lander’s 5 m limit');
  await page.waitForTimeout(5600); // the chart zooms out, then builds in stages, the first time it is shown
  check(!(await page.$('.cc-plot.zooming')) && (await page.textContent('.cc-panel figcaption')).trim() === 'To scale · 0 to 1,400 m' &&
    (await page.getAttribute('.cc-panel .cc-main', 'style')).includes('85.71%'), 'The reveal ends on the whole 1,200 m, to scale');
  check(await page.evaluate(() => {
    const lim = document.querySelector('.cc-limit').getBoundingClientRect(), plot = document.querySelector('.cc-zoom .cc-plot').getBoundingClientRect();
    const earth = document.querySelector('.cc-zoom .cc-col .cc-bar').getBoundingClientRect();
    return earth.height > 15 && lim.top < earth.top - 40 && lim.top > plot.top + 40;
  }), 'Enlarged panel: Earth’s 1 m bar and the 5 m limit are clearly apart');
  await shot(page, '15-miller-forecast');
  await page.click('[data-action="continue"]');
  check((await heading(page)) === 'Is it safe to land?', 'Then the landing decision');
  check(!!(await page.$('.planet-svg [fill$="-hdisc)"]')) && !!(await page.$('.planet-svg [stroke$="-hring)"]')) && (await stageText(page)).includes('Gargantua'),
    'Gargantua is drawn as a black hole: a ring of bent light and a disc, not the Moon’s ring');
  landingCounts.push((await page.textContent('#console-head .eyebrow-count')).trim());
  check(landingCounts.join(' / ') === '· task 1 of 3 / · task 2 of 3 / · task 3 of 3' && (await page.textContent('#rail-head')).includes('task 3 of 3'),
    'Landing Call task counters match the progress rail (' + landingCounts.join(' / ') + ')');
  check(await page.isDisabled('[data-action="landing-send"]'), 'Landing: Send report needs a choice and a report');
  await page.check('input[name="land-choice"][value="yes"]');
  check(await page.isDisabled('[data-action="landing-send"]'), 'Landing: a choice alone is not enough');
  await page.fill('#land-report', 'Land, it looks fine.');
  await page.click('[data-action="landing-send"]');
  check((await bodyText(page)).includes('That’s the same call you made last time'), 'Landing “yes” gets the crew’s warning');
  check((await page.textContent('.sent-line .s2')).trim() === 'Report delivered' && !!(await page.$('.tx-card.tx-no.tx-late')), 'Landing: the report goes out, then the crew’s reply comes back');
  await page.click('[data-action="landing-retry"]');
  check((await page.inputValue('#land-report')) === 'Land, it looks fine.', 'Landing retry keeps the report text');
  await page.check('input[name="land-choice"][value="no"]');
  await page.fill('#land-report', 'Do not land: Gargantua makes Δg huge, so the bulge is about 1,200 m, far above the 5 m limit.');
  await page.click('[data-action="landing-send"]');
  const sent = await bodyText(page);
  check((await heading(page)) === 'Report sent' && sent.includes('Sample report') && sent.includes('Check your report'), 'Landing “no”: report sent, with a sample and a checklist');
  check(sent.includes('Report delivered') && !!(await page.$('.tx-card.tx-ok.tx-late .tx-stream .w')), 'Landing “no”: delivered, then the pilot’s reply arrives');
  {
    const board = (await page.textContent('.status-board')).replace(/\s+/g, ' ');
    check(board.includes('Mission status') && board.includes('Called off') && board.includes('1,200 m') && board.includes('5 m') && board.includes('Safe on the Endurance') &&
      (await page.$$('.status-board .sb-row')).length === 4, 'After the right call, the stage shows where the mission stands');
  }
  check(sent.includes('far above the 5 m limit'), 'The learner’s own report is quoted back');
  await shot(page, '16-landing');
  await page.click('[data-action="continue"]'); await startStep(page);

  // 7. Return to Endurance — film ending and reflection
  check((await heading(page)) === 'This time, you know why.', 'Return opens on the film ending and reflection');
  check((await stageText(page)).includes('3:35–4:19'), 'Ending excerpt shows 3:35–4:19');
  check((await bodyText(page)).includes('closer or heavier black hole'), 'Reflection quotes the learner’s first guess');
  check(await page.isDisabled('[data-action="reflect-continue"]'), 'Reflection needs a few sentences before moving on');
  await page.click('[data-action="ending-summary"]');
  check(await page.isVisible('.fallback-card') && (await stageText(page)).includes('What happens next'), 'Ending: “Video won’t load?” opens the scene description');
  await page.fill('#reflect-text', 'Gargantua made Δg huge, so the bulge was about 1,200 m.');
  check(!(await page.isDisabled('[data-action="reflect-continue"]')), 'Writing the reflection unlocks Continue');
  await shot(page, '17-reflect');
  await page.click('[data-action="reflect-continue"]');
  check((await heading(page)) === 'Mission summary' && (await page.$$('.sum-card2')).length === 4, 'Mission summary shows four cards');
  {
    const recap = (await page.textContent('.pred-recap')).replace(/\s+/g, ' ');
    check((await page.$$('.pred-recap .pr-row')).length === 3 && recap.includes('You predicted') && recap.includes('The test showed') && recap.includes('6 m') && recap.includes('2 m') &&
      !/correct|wrong|not yet|partly/i.test(recap) && !(await page.$('.pred-recap .fb')),
      'Mission summary: the learner’s three first predictions sit beside what each test showed, with nothing marked right or wrong');
  }
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
  if (!(await page.evaluate(() => document.getElementById('evidence-dialog').open))) await page.click('#evidence-btn');
  await page.waitForTimeout(450); // the panel slides in
  check((await page.textContent('#evidence-dialog-body')).includes('Mission file') && (await page.textContent('.file-count')).trim() === '4 of 4 findings' &&
    (await page.$$('#evidence-dialog-body .ev-entry.found')).length === 4 && await page.evaluate(() => {
      const d = document.querySelector('#evidence-dialog').getBoundingClientRect(); return Math.abs(d.right - innerWidth) < 2 && d.height > innerHeight - 4;
    }), 'The evidence log opens as the mission file: a full-height panel on the right, with numbered findings');
  await page.click('[data-action="close-evidence"]');
  check(rec.condition === 'b' && /evidence first/i.test(rec.conditionLabel) && rec.assignment === 'link', 'Export: version B, set by the link');
  check(rec.firstIdea.text === 'A closer or heavier black hole?', 'First guess recorded');
  check(rec.video.opening.fallbackShownAt && rec.video.opening.error, 'Video fallback recorded');
  check(rec.video.ending && rec.video.ending.fallbackShownAt && !rec.video.ending.skippedAt, 'Ending: reading the scene description is recorded');
  check(rec.reflection && rec.reflection.text.startsWith('Gargantua made Δg huge') && !!rec.reflection.at, 'The written reflection is in the export');
  check(!!rec.goDeeperOpenedAt, 'Opening Go deeper is recorded');
  check(typeof rec.elapsed.activeVisibleMs === 'number', 'Elapsed time recorded');
  console.log('    summary:', JSON.stringify(rec.summary));

  await page.click('[data-action="finish"]');
  await page.waitForSelector('#screen-heading');
  check((await page.textContent('#screen-heading')).trim() === 'Mission complete!', 'Finish mission shows the complete screen');
  check(!!(await page.$('#screen .intro-card #screen-heading')) && (await page.$$('.ach-chips li')).length === 4, 'Complete screen uses the starting-page card, with four achievements');
  check((await page.$$('#screen .ach-chips li')).length === 4, 'Complete screen shows four achievement chips');
  // The screen opens with a jump to light speed on a canvas; the card follows it in.
  check(!!(await page.$('#screen canvas.warp')) && !(await page.$('.confetti')) && (await page.getAttribute('.complete2', 'class')).includes('jump'), 'Complete screen: a starfield canvas plays the jump (no confetti)');
  const lit = () => page.evaluate(() => { const c = document.querySelector('canvas.warp'); const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 40) n++; return n; });
  await page.waitForTimeout(1300);
  const midJump = await lit();
  check((await page.evaluate(() => getComputedStyle(document.querySelector('.complete2 .intro-card')).opacity)) === '0', 'Complete screen: the card waits while the stars streak');
  await page.waitForTimeout(1800);
  const settled = await lit();
  check(midJump > settled * 3 && settled > 50, 'Complete screen: streaks during the jump (' + midJump + ' lit pixels) settle into a starfield (' + settled + ')');
  check((await page.evaluate(() => getComputedStyle(document.querySelector('.complete2 .intro-card')).opacity)) === '1', 'Complete screen: the card has arrived once the jump is over');
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
  await startMission(page);
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
  await startMission(np);
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
  await startMission(tp);
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
    (await tp.$$eval('.rank-name', ns => ns.map(n => n.textContent))).join() === 'Near,Center,Far', 'A correct ranking on the first try is confirmed, and the list keeps that order');
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
    await startMission(mp);
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
    // The finding is carried up to the log first; the count bumps as it lands.
    r.evBump = await mp.evaluate(() => !!document.querySelector('.ev-fly') || document.getElementById('evidence-btn').classList.contains('bump'));
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
  check(mo.evEnter && mo.evBump, 'New evidence: entry rises in and is carried up to the top-bar count');
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
    await startMission(gp);
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
  console.log('\n# A/B test: version A (formula first) meets the model before the Tide Lab; assignment');
  const q = (extra) => BASE + (BASE.includes('?') ? '&' : '?') + extra;
  const actx = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
  await actx.route(/youtube\.com|ytimg|googlevideo/, r => r.abort());
  const ap = await actx.newPage();
  const aerr = [];
  ap.on('pageerror', e => aerr.push('pageerror: ' + e.message));
  ap.on('console', m => { if (m.type() === 'error' && !/youtube|ERR_FAILED|net::/i.test(m.text())) aerr.push('console: ' + m.text()); });

  // Random assignment: a bare link gives a new browser one of the two versions and keeps it.
  await ap.goto(q('research=1'));
  await ap.evaluate(() => localStorage.clear());
  await ap.reload();
  await ap.waitForSelector('#screen-heading');
  const first = await ap.evaluate(() => ({ st: window.TFM.getState(), kept: localStorage.getItem('tfm.condition') }));
  check(['a', 'b'].includes(first.st.condition) && first.st.assignment === 'random' && first.kept === first.st.condition + '|random',
    'A/B: a bare link assigns a version at random and remembers it (' + first.st.condition + ')');
  await ap.reload();
  await ap.waitForSelector('#screen-heading');
  check((await ap.evaluate(() => window.TFM.getState().condition)) === first.st.condition, 'A/B: the browser keeps its version on a later visit');
  const seen = new Set();
  for (let i = 0; i < 24 && seen.size < 2; i++) {
    await ap.evaluate(() => localStorage.clear());
    await ap.reload();
    await ap.waitForSelector('#screen-heading');
    seen.add(await ap.evaluate(() => window.TFM.getState().condition));
  }
  check(seen.size === 2, 'A/B: both versions come up across fresh browsers');

  // A link that names the version wins, and each version has its own saved session.
  // (Storage is cleared from a page without the module: the module saves its session again
  // as it unloads, which would leave a randomly assigned session behind.)
  await ap.goto(BASE.replace(/index\.html.*$/, '').replace(/\?.*$/, '') + 'tests/');
  await ap.evaluate(() => localStorage.clear());
  await ap.goto(q('v=b&research=1'));
  await startMission(ap);
  await ap.waitForSelector('#task-heading');
  await ap.goto(q('v=a&research=1'));
  await ap.waitForSelector('#screen-heading');
  const forced = await ap.evaluate(() => window.TFM.getState());
  check((await ap.textContent('#screen-heading')).trim() === 'Tidal Forecast Mission' && forced.condition === 'a' && forced.assignment === 'link',
    'A/B: ?v=a starts its own session instead of resuming version B, and records that the link set it');
  await ap.click('[data-action="intro-continue"]');
  check((await ap.$$eval('.loop li', ls => ls.length)) === 7, 'Version A: the start screen lists the same seven phases');
  await startMission(ap);

  // Briefing and ranking are the same as in version B: a first guess is asked for, no formula yet.
  await toIdea(ap);
  check(!!(await ap.$('#first-idea')) && !(await ap.isVisible('#formula')), 'Version A: the briefing asks for a first guess and shows no formula');
  await ap.fill('#first-idea', 'A closer black hole?');
  await ap.click('[data-action="log-idea"]'); await startStep(ap);
  check(await ap.evaluate(() => !!localStorage.getItem('tfm.session.v4.a') && !!localStorage.getItem('tfm.session.v4.b')), 'A/B: each version saves under its own key');
  check((await heading(ap)) === 'Rank the pull of the Moon' && (await bodyText(ap)).includes('What’s your guess?') && (await ap.textContent('#console-head .eyebrow')).includes('task 1 of 5'),
    'Version A: the ranking is the same task; the Pre-flight Check has five tasks');
  await doRank(ap);
  for (const t of ['dg', 'gp', 'R']) {
    await ap.click(`[data-fk="tgt-${t}"] .hit >> nth=0`, { force: true });
    await ap.click('[data-action="console-check"]');
    if (t === 'R') check((await bodyText(ap)).includes('Next: see the model that links the three variables') && !(await bodyText(ap)).includes('Click Continue'), 'Version A: after the three variables, Continue leads to the model');
    await ap.click('[data-action="continue"]');
    if (t !== 'R') await startStep(ap);
  }

  // The model page closes the Pre-flight Check.
  const modelStage = await stageText(ap);
  check((await heading(ap)) === 'The model for bulge height' && (await ap.textContent('#console-head .eyebrow')).includes('Pre-flight Check') &&
    (await ap.textContent('#console-head .eyebrow')).includes('task 5 of 5') && !!(await ap.$('.model-card .big-eq')) && (await ap.$$('.rule-card')).length === 4,
    'Version A: the model page comes before the Tide Lab, with the formula, the three rules and k');
  check(modelStage.includes('Where each variable sits') && modelStage.includes('on top') && modelStage.includes('you will test each term in the Tide Lab') &&
    !modelStage.includes('4 → 8 m') && !/your results/i.test(modelStage), 'Version A: the model page shows where each variable sits, with no results yet');
  await shot(ap, 'a0-model-first');
  await ap.click('[data-action="continue"]');
  check((await ap.textContent('#screen-heading')).trim() === 'Tide Lab' && (await ap.textContent('#screen .intro-card')).includes('and the model that links them') &&
    (await ap.textContent('#screen .intro-job')).includes('test how changing each one changes the bulge height'), 'Version A: the Tide Lab intro mentions the model; the job is the same');
  await ap.click('[data-action="start-step"]');

  // Tide Lab: the same test and the same prediction, with the formula on screen.
  check(await ap.isVisible('#formula .eq-bar') && !!(await ap.$('#formula .t-dg.hl')), 'Version A: the formula bar is on screen in the Tide Lab, with the changed term highlighted');
  check(!!(await ap.$('#pred-input')) && !!(await ap.$('.gauge-track[role="slider"]')) && await ap.isDisabled('[data-action="run-exp"]') && !!(await ap.$('[data-action="hint-toggle"]')),
    'Version A: a prediction is required before the run, exactly as in version B');
  await shot(ap, 'a1-exp1-before');
  for (let i = 0; i < 8; i++) await ap.click('[data-action="pred-up"]'); // 4.5 … 8
  await ap.click('[data-action="run-exp"]');
  await ap.waitForTimeout(1100);
  const acard = (await ap.textContent('.calc-card')).replace(/\s+/g, ' ');
  check((await heading(ap)) === 'Test result: 8 m.' && (await ap.textContent('.g-model')).trim() === 'Result 8 m' && acard.includes('Ratio to baseline') && acard.includes('÷') && acard.includes('4 m × 2 = 8 m'),
    'Version A: the result shows the model’s arithmetic');
  check((await ap.textContent('.planet-svg .ghost')).includes('You 8 m'), 'Version A: the prediction is kept on the diagram, as in version B');
  await shot(ap, 'a2-exp1-result');
  await ap.click('[data-action="to-explain"]');
  await ap.check('input[name="exp-choice"][value="stretch"]');
  await ap.click('[data-action="submit-explain"]');
  const afb1 = await bodyText(ap);
  check(afb1.includes('Correct') && afb1.includes('Added to the crew’s evidence log') && afb1.includes('Your prediction of 8 m matched'), 'Version A: the same explanation question and feedback');
  await ap.click('[data-action="continue"]'); await startStep(ap);

  // Test 2: a miss, then the worked solution, which may now point at the formula.
  for (let i = 0; i < 4; i++) await ap.click('[data-action="pred-up"]'); // 6 m
  await ap.click('[data-action="run-exp"]');
  await ap.click('[data-action="to-explain"]');
  await ap.check('input[name="exp-choice"][value="lift"]');
  await ap.click('[data-action="submit-explain"]');
  check((await bodyText(ap)).includes('holds the ocean down') && (await ap.textContent('[data-action="fresh-attempt"]')).trim() === 'Try a fresh prediction', 'Version A: the same misconception feedback and retry');
  await ap.click('[data-action="fresh-attempt"]');
  await ap.fill('#pred-input', '1');
  await ap.click('[data-action="run-exp"]');
  await ap.click('[data-action="to-explain"]');
  await ap.check('input[name="exp-choice"][value="restore"]');
  await ap.click('[data-action="submit-explain"]');
  await ap.click('[data-action="continue"]'); await startStep(ap);

  // Test 3, with a reload after the run.
  await ap.fill('#pred-input', '8');
  await ap.click('[data-action="run-exp"]');
  await ap.reload();
  await ap.waitForSelector('#task-heading');
  check((await ap.textContent('.toast')).includes('Welcome back, analyst. Picking up at Tide Lab · task 3 of 4.'), 'A returning learner is told where they are picking up');
  check((await heading(ap)).includes('8 m') && (await ap.evaluate(() => window.TFM.getState().condition)) === 'a' && await ap.isVisible('#formula .eq-bar'),
    'Version A: a reload on the ?v=a link restores the session');
  await ap.click('[data-action="to-explain"]');
  check(!(await bodyText(ap)).includes('÷'), 'Test 3: the explanation choices put the ratio in words');
  await ap.check('input[name="exp-choice"][value="fraction"]');
  await ap.click('[data-action="submit-explain"]');
  await ap.click('[data-action="continue"]');
  check((await heading(ap)) === 'Lab results' && (await bodyText(ap)).includes('agrees with the model') && (await bodyText(ap)).includes('check your findings against the model'),
    'Version A: the results table follows; the crew asks whether it agrees with the model');
  await ap.click('[data-action="continue"]');
  check((await ap.textContent('#screen .intro-job')).includes('check each finding against the model') && !/turn it into a model/.test(await ap.textContent('#screen')),
    'Version A: Decode asks the learner to check the findings against the model');
  await ap.click('[data-action="start-step"]');
  check((await ap.$$('.sentence-card .s-line')).length === 9 && (await bodyText(ap)).includes('the bulge height h') && !(await bodyText(ap)).includes('h is: h is'),
    'Decode: each of the three sentences sits on its own line');
  check((await heading(ap)) === 'What did each test tell you?' && (await ap.textContent('#console-head .eyebrow')).includes('task 1 of 1') && await ap.isDisabled('[data-action="decode-check"]'),
    'Version A: the same summary task; it is the only task left in Decode');
  for (const [k, vals] of [['dg', ['doubles', 'bigger', 'directly']], ['gp', ['halves', 'smaller', 'inversely']], ['R', ['doubles', 'bigger', 'directly']]]) {
    for (const [slot, v] of [['change', vals[0]], ['size', vals[1]], ['prop', vals[2]]]) await ap.selectOption(`[data-fk="bl-${k}-${slot}"]`, v);
  }
  await ap.click('[data-action="decode-check"]');
  check((await bodyText(ap)).includes('Your three findings agree with the model'), 'Version A: a right summary is confirmed against the model');
  await ap.click('[data-action="continue"]');
  check((await ap.textContent('#screen-heading')).trim() === 'Quick Checks' && (await ap.textContent('#screen')).includes('the model you just tested'),
    'Version A: Decode leads straight to the Quick Checks, with the model “tested”, not “built”');
  await ap.click('[data-action="start-step"]');
  check((await heading(ap)) === 'Scenario 1' && (await ap.textContent('#formula .k-chip')).trim() === 'k = 2', 'Version A: the Quick Checks are the same');

  // The record.
  await ap.click('#evidence-btn');
  const [adl] = await Promise.all([ap.waitForEvent('download'), ap.click('[data-fk="d-export"]')]);
  const arecPath = path.join(OUT, 'record-a.json');
  await adl.saveAs(arecPath);
  const arec = JSON.parse(fs.readFileSync(arecPath, 'utf8'));
  check(arec.condition === 'a' && /formula first/i.test(arec.conditionLabel) && arec.assignment === 'link' && adl.suggestedFilename().includes('-A-'),
    'Version A: the export carries the version and how it was assigned, and so does the file name');
  const a1 = arec.activities['exp-dg'], a2 = arec.activities['exp-gp'];
  check(a1.firstAttempt.prediction === 8 && a1.firstAttempt.result === 8 && a1.firstAttempt.outcome.overall === 'correct' && a1.completion === 'independent',
    'Version A: test attempts record the prediction and the result, as in version B');
  check(a2.firstAttempt.outcome.overall === 'not-yet' && a2.retries.length === 1 && a2.retries[0].variant === 4 && a2.completion === 'assisted', 'Version A: first attempt and fresh attempt recorded separately');
  check(arec.firstIdea.text === 'A closer black hole?' && arec.evidence.length === 3, 'Version A: the first guess and the three findings are recorded');
  check(arec.activities['decode-model'].label === 'Pre-flight check — the model (unscored)' && arec.activities['decode-model'].completion === 'unscored' &&
    arec.activities['decode-model'].startedAt < arec.activities['exp-dg'].startedAt, 'Version A: the model page is recorded before the first test');

  // Back on the version-B link, that session is where it was left.
  await ap.goto(q('v=b&research=1'));
  await ap.waitForSelector('#task-heading');
  const bst = await ap.evaluate(() => window.TFM.getState());
  check(bst.condition === 'b' && bst.pos.step === 0 && !bst.activities['exp-dg'], 'A/B: the version-B link resumes its own session, untouched by version A');
  check(aerr.length === 0, 'Version A: no page errors ' + aerr.join(' | '));

  // Developer bar: shows the version and switches between them.
  await ap.goto(q('v=a&dev=1'));
  await ap.waitForSelector('#devbar .devbar-version');
  check((await ap.textContent('.devbar-version')).trim() === 'Version A' && (await ap.textContent('[data-fk="dev-version"]')).trim() === 'Switch to B', 'Dev bar names the version and offers the other');
  check((await ap.$$eval('#dev-jump option', os => os.map(o => o.textContent))).includes('Pre-flight check — the model (unscored)') &&
    (await ap.$$('.blk')).length === 20, 'Version A: the jump list has the model in the Pre-flight Check, and the rail still has 20 tasks');
  await shot(ap, 'a4-devbar');
  await ap.selectOption('#dev-jump', '6:1');
  await ap.click('[data-action="dev-jump"]');
  check((await ap.textContent('#console-head')).includes('a model you tested yourself') && (await stageText(ap)).includes('The model') && !(await stageText(ap)).includes('Your model'),
    'Version A: the mission summary says the model was tested, not built');
  await ap.selectOption('#dev-jump', 'screen:complete');
  await ap.click('[data-action="dev-jump"]');
  const alede = await ap.textContent('#screen .screen-lede');
  check(alede.includes('a model you tested against your own evidence') && (await ap.textContent('.ach-chips')).includes('1 model tested'), 'Version A: the complete screen says the model was tested');
  await ap.click('[data-fk="dev-version"]');
  await ap.waitForSelector('#devbar .devbar-version');
  check((await ap.textContent('.devbar-version')).trim() === 'Version B' && /[?&]v=b/.test(ap.url()) && /dev=1/.test(ap.url()), 'Dev bar switch opens version B and keeps the other link options');
  check((await ap.$$('.blk')).length === 20, 'Version B: the rail has 20 tasks too');
  // Version B's Tide Lab worked solution never points at the formula.
  await ap.selectOption('#dev-jump', '2:0');
  await ap.click('[data-action="dev-jump"]');
  for (const wrong of ['push', 'push']) {
    await ap.fill('#pred-input', '1');
    await ap.click('[data-action="run-exp"]');
    await ap.click('[data-action="to-explain"]');
    await ap.check(`input[name="exp-choice"][value="${wrong}"]`);
    await ap.click('[data-action="submit-explain"]');
    if (await ap.$('[data-action="worked"]')) break;
    await ap.click('[data-action="fresh-attempt"]');
  }
  if (await ap.$('[data-action="worked"]')) {
    await ap.click('[data-action="worked"]');
    const w = (await ap.textContent('.worked')).replace(/\s+/g, ' ');
    check(w.includes('stretches the ocean by the same factor') && !/on top|fraction|\bk\b/.test(w), 'Version B: the worked solution reasons from the evidence, not the formula');
  } else check(false, 'Version B: the worked solution was offered after two misses');
  // Predictions are not marked: a wrong prediction with the right explanation is a correct test.
  await ap.selectOption('#dev-jump', '2:2');
  await ap.click('[data-action="dev-jump"]');
  check((await ap.textContent('#console-head .prompt')).includes('Think of the stretch as a fraction of the planet’s size') && !!(await ap.$('.planet-svg .was-ring')),
    'Test 3: the prompt gives the physical cue, and the diagram keeps the planet’s size before');
  await ap.fill('#pred-input', '1');
  await ap.click('[data-action="run-exp"]');
  await ap.click('[data-action="to-explain"]');
  await ap.check('input[name="exp-choice"][value="fraction"]');
  await ap.click('[data-action="submit-explain"]');
  const ung = await bodyText(ap);
  const uout = await ap.evaluate(() => { const a = window.TFM.getState().activities['exp-R']; return a.attempts[a.attempts.length - 1].outcome; });
  check(ung.includes('Correct') && ung.includes('You predicted 1 m; the result was 8 m') && !/partly/i.test(ung) && !(await ap.$('.fb-partly')) &&
    uout.overall === 'correct' && uout.prediction === 'not-yet' && uout.explanation === 'correct',
    'A wrong prediction with the right explanation is a correct test; how close the prediction came is still recorded');
  await actx.close();

  const anctx = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  const anp = await anctx.newPage();
  await anp.goto(q('v=a&dev=1'));
  await anp.evaluate(() => localStorage.clear());
  await anp.reload();
  await anp.selectOption('#dev-jump', '1:4');
  await anp.click('[data-action="dev-jump"]');
  const amOverflow = await anp.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  check(amOverflow <= 0, 'Version A narrow: the model page has no horizontal overflow (' + amOverflow + 'px)');
  await anp.selectOption('#dev-jump', '2:0');
  await anp.click('[data-action="dev-jump"]');
  const adOverflow = await anp.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  check(adOverflow <= 0, 'Version A narrow: dev bar with the version switch has no horizontal overflow (' + adOverflow + 'px)');
  check(await anp.isVisible('#formula .eq-bar'), 'Version A narrow: the formula bar shows in the Tide Lab');
  check(!(await anp.$('[data-action="cue-replay"]')) && (await anp.$$('.planet-svg .was-mark')).length === 2,
    'Reduced motion: no change animation to replay; the baseline marks on the diagram show what changed');
  await anp.fill('#pred-input', '8');
  await anp.click('[data-action="run-exp"]');
  check((await anp.isVisible('.hbars.narrow-only')) && (await anp.$$('.hbars.narrow-only .hb-row')).length === 2 &&
    (await anp.$$eval('.hbars.narrow-only .hb-label', ls => ls.map(l => l.textContent).join())) === 'You,Result', 'Version A narrow: result bars show the prediction and the result');
  await anp.screenshot({ path: path.join(OUT, 'a5-narrow-result.png'), fullPage: true });
  const anOverflow = await anp.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  check(anOverflow <= 0, 'Version A narrow: no horizontal page overflow (' + anOverflow + 'px)');
  await anctx.close();

  await browser.close();
  console.log(failures ? `\n${failures} check(s) FAILED` : '\nAll checks passed');
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
