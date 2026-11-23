// End-to-end test of the study pages (consent, pretest, posttest, learner survey) and the data
// sent to Supabase, in headless Chrome. Supabase is faked: study-content.js is served with a test
// project URL, and every request to it is recorded instead of leaving the machine.
// Requires: npm i --no-save playwright-core, and a local server on :8765 (see README, Testing).
const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');

const BASE = process.env.TFM_URL || 'http://127.0.0.1:8765/index.html';
const q = (extra) => BASE + (BASE.includes('?') ? '&' : '?') + extra;
const MOCK = 'https://mock-project.supabase.test';
const OUT = path.join(__dirname, 'e2e-output');
fs.mkdirSync(OUT, { recursive: true });
const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

let failures = 0;
function check(cond, msg) {
  if (cond) console.log('  ✔ ' + msg);
  else { failures++; console.log('  ✖ ' + msg); }
}
async function shot(page, name) { await page.waitForTimeout(600); await page.screenshot({ path: path.join(OUT, name + '.png'), fullPage: true }); }

// A browser context whose Supabase requests land in `sent` (and can be made to fail).
async function studyContext(browser, opts) {
  const ctx = await browser.newContext({ viewport: opts && opts.viewport || { width: 1280, height: 900 } });
  // Keep the run offline: no film player and no web fonts (a slow font request holds up page loads).
  await ctx.route(/youtube\.com|ytimg|googlevideo|fonts\.googleapis|fonts\.gstatic/, r => r.abort());
  // study-content.js is served from disk with the fake project filled in. (Fetching it through
  // the test server and editing it in flight sometimes stalled a page load.)
  const studyJs = fs.readFileSync(path.join(__dirname, '..', 'study-content.js'), 'utf8')
    // Always the fake project, whatever study-content.js holds: tests must never write to the real one.
    .replace(/(supabase: \{\s*url: )'[^']*'/, "$1'" + MOCK + "'").replace(/(\n\s*key: )'[^']*'/, "$1'sb_publishable_test_key'");
  if (!studyJs.includes(MOCK) || !studyJs.includes('sb_publishable_test_key')) throw new Error('could not swap in the fake Supabase project');
  await ctx.route(/study-content\.js/, route => route.fulfill({ status: 200, contentType: 'application/javascript', body: studyJs }));
  const sent = { events: [], snapshots: [], requests: [], fail: false };
  await ctx.route(MOCK + '/**', async (route) => {
    const req = route.request();
    const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
    if (sent.fail) return route.fulfill({ status: 503, headers: cors, body: 'unavailable' });
    const url = new URL(req.url());
    const body = JSON.parse(req.postData() || 'null');
    sent.requests.push({ path: url.pathname, headers: req.headers(), body });
    if (url.pathname.endsWith('/events')) sent.events.push(...body);
    if (url.pathname.endsWith('/session_snapshots')) sent.snapshots.push(body);
    return route.fulfill({ status: 201, headers: cors, body: '' });
  });
  return { ctx, sent };
}

// Answers every part on the current test page: radios get a real option (or "I'm not sure"
// when unsure is true), dropdowns their second option, number boxes `num`.
async function answerPage(p, o) {
  o = o || {};
  const names = await p.$$eval('#screen .t-choices input[type=radio]', ins => [...new Set(ins.map(i => i.name))]);
  for (const n of names) await p.check(`#screen input[name="${n}"][value="${o.unsure ? 'unsure' : '1'}"]`);
  for (const s of await p.$$('#screen .t-select select')) await s.selectOption(o.unsure ? 'unsure' : '1');
  for (const i of await p.$$('#screen .t-num input')) await i.fill(o.num || '3');
}
async function nextPage(p) {
  const before = await p.getAttribute('#screen .t-page', 'data-page').catch(() => null);
  await p.click('[data-action="test-next"]');
  await p.waitForFunction((b) => {
    const el = document.querySelector('#screen .t-page');
    return !el || el.getAttribute('data-page') !== b;
  }, before);
}


// Opens a fresh session. The simple Python test server sometimes drops a request; if the study
// file didn't arrive (the page then shows its load-error screen), load the page again.
async function fresh(p, url) {
  await p.goto(url);
  await p.evaluate(() => localStorage.clear());
  for (let i = 0; i < 4; i++) {
    await p.reload();
    await p.waitForSelector('#screen-heading');
    if (await p.evaluate(() => !!(window.TFM_STUDY && /mock-project/.test(window.TFM_STUDY.supabase.url)))) return;
  }
  throw new Error('study-content.js did not load');
}

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });

  /* ------------------------------------------------------------------ */
  console.log('\n# Study run: consent → pretest → mission → posttest → survey (version B)');
  const { ctx, sent } = await studyContext(browser);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  // The 503s are the test's own: the fake Supabase is switched off for a moment after the survey.
  page.on('console', m => { if (m.type() === 'error' && !/youtube|ERR_FAILED|net::/i.test(m.text()) && !(sent.fail && /status of 503/.test(m.text()))) errors.push('console: ' + m.text()); });

  await fresh(page, q('v=b'));
  check((await page.textContent('#screen-heading')).trim() === 'Taking part in this study', 'A fresh visit opens on the consent page');
  check(!(await page.isVisible('.checkpoints')) && !(await page.isVisible('#evidence-btn')), 'Consent page hides the progress rail and the evidence log');
  check(await page.isDisabled('[data-action="consent-continue"]'), 'Continue is locked until a choice is made');
  await shot(page, 's01-consent');
  await page.waitForTimeout(500);
  check(sent.requests.length === 0, 'Nothing is sent before the learner agrees');

  await page.check('input[name="consent"][value="yes"]');
  check(await page.evaluate(() => { const i = document.querySelector('#screen .screen-inner'); return i.classList.contains('still') && getComputedStyle(i.children[1]).animationName === 'none'; }),
    'Choosing an answer on the consent page does not replay the page’s entrance');
  await page.click('[data-action="consent-continue"]');
  await page.waitForSelector('[data-action="test-start"]');
  check((await page.textContent('#screen-heading')).trim() === 'A few questions before you start', 'Agreeing leads to the pretest intro');
  check((await page.$$eval('#screen .t-journey .t-stop', els => els.map(e => e.textContent)).then(a => a.join(' / '))) === 'Starting questions / Mission / Final questions / Your thoughts',
    'The study stops are named apart from the mission’s Quick Checks');
  check(!/not sure/i.test(await page.textContent('#screen .t-directions')) || /even if you’re not sure/.test(await page.textContent('#screen .t-directions')),
    'The pretest directions ask for a best guess, not for "I’m not sure"');
  check(/11 questions · about 8 minutes/.test(await page.textContent('#screen .t-directions')) && /encourage you to use a calculator/.test(await page.textContent('#screen .t-directions')),
    'The pretest intro gives the time (about 8 minutes) and encourages a calculator');
  await shot(page, 's02-pretest-intro');
  await page.click('[data-action="test-start"]');
  check((await page.textContent('#screen-heading')).trim() === 'Question 1 of 11', 'The pretest has 11 questions (items 0–9 with 6a and 6b)');
  check(await page.isVisible('#screen .t-fig img'), 'Item 0 shows the spacecraft diagram');
  check((await page.$$('#screen [value="unsure"]')).length === 0, 'The pretest offers no "I’m not sure" option');
  check(!(await page.$('[data-action="test-back"], [data-action="back"]')), 'There is no Back button');
  await shot(page, 's03-pretest-item0');

  // Request response: leaving it empty shows a reminder once, then lets the learner skip.
  await page.click('[data-action="test-next"]');
  check(await page.isVisible('#screen .t-nudge'), 'An unanswered question gets a reminder');
  check(await page.evaluate(() => document.querySelector('#screen .screen-inner').classList.contains('still') &&
    getComputedStyle(document.querySelector('#screen .t-stem')).animationName === 'none' && getComputedStyle(document.querySelector('#screen .t-nudge')).animationName === 'riseIn'),
    'The reminder comes in on its own: the question does not replay its entrance');
  check((await page.textContent('#screen-heading')).trim() === 'Question 1 of 11', 'The reminder keeps the learner on the question');
  await nextPage(page);
  check((await page.textContent('#screen-heading')).trim() === 'Question 2 of 11', 'Pressing Next again skips the question');

  // Items 1–9: real answers, with a bad number tried on item 8.
  const headTop = () => page.evaluate(() => Math.round(document.querySelector('#screen .t-top').getBoundingClientRect().top + window.scrollY));
  const top1 = await headTop();
  const tops = [], numbered = [];
  for (let n = 2; n <= 11; n++) {
    const id = await page.getAttribute('#screen .t-page', 'data-page');
    tops.push(await headTop());
    numbered.push(...await page.$$eval('#screen .t-part-label', els => els.map(e => e.textContent.trim()).filter(t => /^\d+[a-z]?\./.test(t))));
    if (await page.$('#screen [value="unsure"]')) check(false, 'No "I’m not sure" on pretest page ' + id);
    if (id === 'pre_8') {
      await answerPage(page, { num: 'twelve' });
      await page.click('[data-action="test-next"]');
      check(await page.getAttribute('#num-pre_8', 'aria-invalid') === 'true', 'A number box refuses text that isn’t a number');
      await page.fill('#num-pre_8', '12');
    } else await answerPage(page);
    if (id === 'pre_5') { check((await page.$$('#screen .t-match select')).length === 4, 'Item 5 has four matching dropdowns'); await shot(page, 's04-pretest-item5'); }
    if (id === 'pre_8') check((await page.$$('#screen .t-values div')).length === 4, 'Item 8 lists its four given values');
    if (id === 'pre_9') { check((await page.$$('#screen .t-choices')).length === 2 && !(await page.$('#screen select')), 'Item 9 is two questions with every option in view (no dropdowns)'); await shot(page, 's05-pretest-item9'); }
    await nextPage(page);
  }
  check(tops.every(t => t === top1), 'The question count keeps one place on every question, short or long (' + top1 + 'px)');
  check(numbered.length === 0, 'No part label carries a hard-coded item number' + (numbered.length ? ' (' + numbered.join(', ') + ')' : ''));
  await page.waitForSelector('[data-action="test-proceed"]');
  check((await page.textContent('#screen-heading')).trim() === 'Thanks for your answers!', 'After the pretest a thank-you page says what comes next');
  check(await page.evaluate(() => { const li = [...document.querySelectorAll('#screen .t-journey.arrive li')].map(l => l.className); return li[0] === 'done just' && li[1] === 'next'; }),
    'The thank-you page marks the stop just finished and the one that comes next');
  check(!(await page.isVisible('.checkpoints')), 'The thank-you page hides the progress rail');
  await shot(page, 's05b-pretest-thanks');
  await page.reload();
  await page.waitForSelector('#screen-heading');
  check((await page.textContent('#screen-heading')).trim() === 'Thanks for your answers!', 'A reload keeps the learner on the thank-you page');
  await page.click('[data-action="test-proceed"]');
  await page.waitForSelector('[data-action="intro-continue"]');
  check((await page.textContent('#screen-heading')).trim() === 'Tidal Forecast Mission', '"Go to the mission" opens the mission’s start screen');

  const rec1 = await page.evaluate(() => window.TFM.buildRecord().study);
  check(rec1 && rec1.pretest.submittedAt && rec1.pretest.proceededAt && Object.keys(rec1.pretest.items).length === 11, 'The record holds all 11 pretest pages and when the learner moved on');
  check(rec1.pretest.items.pre_0.skipped.includes('pre_0') && rec1.pretest.items.pre_0.nudgedAt, 'Item 0 is recorded as skipped after a reminder');
  check(rec1.pretest.items.pre_1.answers.pre_1 === 1 && rec1.pretest.items.pre_9.answers.pre_9_d1 === 1, 'Choices are recorded by position (0 = first option)');
  check(rec1.pretest.items.pre_8.answers.pre_8 === '12' && rec1.pretest.items.pre_8.changes.length >= 2, 'The number answer and its earlier changes are recorded');
  check(Object.values(rec1.pretest.items).every(it => it.shownAt && it.submittedAt), 'Each pretest page has a shown and a submitted time');

  // Jump to the last task in developer mode, turn it off, then finish: the posttest comes first.
  await page.evaluate(() => { sessionStorage.setItem('tfm.devmode', '1'); });
  await page.reload();
  await page.selectOption('#dev-jump', '6:1');
  await page.click('[data-action="dev-jump"]');
  await page.click('[data-action="dev-toggle"]');
  await page.waitForSelector('[data-action="finish"]');
  await page.click('[data-action="finish"]');
  await page.waitForSelector('[data-action="test-transition"]');
  check((await page.textContent('#screen-heading')).trim() === 'Great work, analyst!', 'Finish mission leads to a transition page, not the complete screen');
  check(!(await page.isVisible('.checkpoints')), 'The transition page hides the progress rail');
  await shot(page, 's05c-posttest-transition');
  await page.reload();
  await page.waitForSelector('#screen-heading');
  check((await page.textContent('#screen-heading')).trim() === 'Great work, analyst!', 'A reload keeps the learner on the transition page');
  await page.click('[data-action="test-transition"]');
  await page.waitForSelector('[data-action="test-start"]');
  check((await page.textContent('#screen-heading')).trim() === 'A few final questions', 'Continue opens the posttest intro');
  await page.click('[data-action="test-start"]');
  check((await page.textContent('#screen-heading')).trim() === 'Question 1 of 10', 'The posttest has 10 questions (no item 0)');
  check(await page.isVisible('#screen .t-fig img[src*="item1-post"]'), 'Posttest item 1 shows its own diagram (Moon on the left)');
  let postUnsure = 0;
  for (let n = 1; n <= 10; n++) {
    postUnsure += (await page.$$('#screen [value="unsure"]')).length;
    await answerPage(page, { num: '16' });
    await nextPage(page);
  }
  check(postUnsure === 0, 'The posttest offers no "I’m not sure" option either (questions and dropdowns)');
  await page.waitForSelector('[data-action="survey-submit"]');
  check((await page.textContent('#screen-heading')).trim() === 'What did you think?', 'After the posttest comes the learner survey');
  check((await page.$$('#screen .t-scale')).length === 10, 'The survey has 10 questions');
  await shot(page, 's06-survey');
  for (let i = 1; i <= 10; i++) await page.check(`input[name="srv_${i}"][value="${(i % 5) + 1}"]`);
  // The server is unreachable for a moment: the last page must not tell the learner to leave yet.
  sent.fail = true;
  await page.click('[data-action="survey-submit"]');
  await page.waitForSelector('.complete2');
  check(!!(await page.$('.complete2')), 'Submitting the survey opens the mission-complete screen');
  await page.waitForFunction(() => !!window.TFMLog.status().lastError, null, { timeout: 10000 });
  await page.waitForFunction(() => document.querySelector('#save-line').getAttribute('data-save') === 'slow', null, { timeout: 5000 });
  check(!/close this page/.test(await page.textContent('#save-line')) && /keep this page open/.test(await page.textContent('#save-line')),
    'While the last answers are unsent, the complete screen asks the learner to keep the page open');
  sent.fail = false;

  const rec2 = await page.evaluate(() => window.TFM.buildRecord().study);
  check(rec2.posttest.submittedAt && Object.keys(rec2.posttest.items).length === 10, 'The record holds all 10 posttest pages');  check(rec2.survey.submittedAt && rec2.survey.answers.srv_1 === 2 && rec2.survey.answers.srv_5 === 1, 'Survey answers are coded 1–5');

  // Let the sender catch up, then look at what Supabase received.
  await page.evaluate(() => window.TFMLog.flush());
  await page.waitForFunction(() => { const s = window.TFMLog.status(); return !s.pendingEvents && !s.pendingSnapshot; }, null, { timeout: 15000 });
  await page.waitForFunction(() => document.querySelector('#save-line').getAttribute('data-save') === 'saved', null, { timeout: 5000 });
  check(/You can close this page now/.test(await page.textContent('#save-line')), 'Once everything has been sent, it says the page can be closed');
  const reasons = sent.snapshots.map(s => s.reason);
  check(['consent', 'pretest-submitted', 'finish', 'posttest-submitted', 'survey-submitted'].every(r => reasons.includes(r)),
    'Snapshots arrive at consent, pretest, finish, posttest and survey (' + reasons.join(', ') + ')');
  const pid = rec2.participantId;
  check(sent.snapshots.every(s => s.participant_id === pid && s.record && s.record.study), 'Every snapshot carries the participant id and the full record');
  const last = sent.snapshots.filter(s => s.reason === 'survey-submitted').pop();
  check(last && last.record.study.survey.answers.srv_10 === 1 && Object.keys(last.record.study.pretest.items).length === 11,
    'The final snapshot holds the pretest, posttest and survey');
  const types = new Set(sent.events.map(e => e.type));
  check(['consent', 'page', 'click', 'change', 'test-answer', 'test-nudge', 'test-submit', 'complete', 'finish', 'survey-submit'].every(t => types.has(t)),
    'The event log has pages, clicks, changes, answers and milestones (' + [...types].join(', ') + ')');
  check(sent.events.filter(e => e.type === 'test-answer').length === 21, 'One test-answer event per test page (11 + 10)');
  check(sent.events.every(e => e.participant_id === pid && e.client_time && e.seq > 0), 'Every event has the participant id, a time and a sequence number');
  const seqs = sent.events.map(e => e.seq);
  check(new Set(seqs).size === seqs.length, 'No event is sent twice');
  check(sent.events.some(e => e.type === 'page' && e.page === 'pretest:pre_5') && sent.events.some(e => e.type === 'page' && /^task:/.test(e.page)),
    'Page views cover test pages and mission tasks');
  check(sent.requests.every(r => r.headers.apikey === 'sb_publishable_test_key' && !r.headers.authorization), 'Requests carry the publishable key as apikey');
  const answerEv = sent.events.find(e => e.type === 'test-answer' && e.data.page === 'pre_8');
  check(answerEv && answerEv.data.answers.pre_8 === '12' && answerEv.data.ms > 0, 'The answer event holds the answer and the time on the page');
  check(!sent.events.some(e => e.type === 'change' && typeof e.data.value === 'string' && e.data.value.length > 24), 'Free text never appears in the event log');

  // Start over: a new mission session, but the pretest is not offered again.
  await page.click('[data-action="reset-ask"]');
  await page.click('[data-action="reset-confirm"]');
  await page.waitForSelector('#screen-heading');
  check((await page.textContent('#screen-heading')).trim() === 'Tidal Forecast Mission', 'Start over goes to the mission start, not back to the pretest');
  const rec3 = await page.evaluate(() => window.TFM.buildRecord());
  check(rec3.participantId === pid && rec3.sessionId !== last.session_id, 'After Start over the participant id stays and the session id is new');
  check(errors.length === 0, 'No page errors' + (errors.length ? ': ' + errors.join(' | ') : ''));
  await ctx.close();

  /* ------------------------------------------------------------------ */
  console.log('\n# Declining');
  const d = await studyContext(browser);
  const dp = await d.ctx.newPage();
  await fresh(dp, q('v=a'));
  await dp.check('input[name="consent"][value="no"]');
  await dp.click('[data-action="consent-continue"]');
  check((await dp.textContent('#screen-heading')).trim() === 'Thanks for letting us know', 'Declining shows a thank-you page');
  await dp.click('[data-action="consent-try"]');
  check((await dp.textContent('#screen-heading')).trim() === 'Tidal Forecast Mission', 'A learner who declines can still try the mission');
  await dp.click('[data-action="intro-continue"]');
  await dp.click('[data-action="start-mission"]');
  await dp.waitForTimeout(5000);
  check(d.sent.requests.length === 0, 'Nothing is sent for a learner who declined');
  await d.ctx.close();

  /* ------------------------------------------------------------------ */
  console.log('\n# Network failure and ?study=0');
  const f = await studyContext(browser);
  f.sent.fail = true;
  const fp = await f.ctx.newPage();
  await fresh(fp, q('v=b'));
  await fp.check('input[name="consent"][value="yes"]');
  await fp.click('[data-action="consent-continue"]');
  await fp.click('[data-action="test-start"]');
  await fp.evaluate(() => window.TFMLog.flush());
  await fp.waitForFunction(() => !!window.TFMLog.status().lastError, null, { timeout: 10000 });
  const st = await fp.evaluate(() => window.TFMLog.status());
  check(st.pendingEvents > 0 && /503/.test(st.lastError), 'When Supabase is down, events wait instead of being lost');
  check(await fp.evaluate(() => !!localStorage.getItem('tfm.outbox.v1')), 'Waiting events are kept in the browser');
  f.sent.fail = false;
  await fp.reload();
  await fp.waitForFunction(() => !window.TFMLog.status().pendingEvents, null, { timeout: 15000 });
  check(f.sent.events.some(e => e.type === 'consent'), 'They are sent once Supabase is back (here, after a reload)');
  check((await fp.textContent('#screen-heading')).trim() === 'Question 1 of 11', 'A reload mid-test returns to the same question');
  await f.ctx.close();

  const o = await studyContext(browser);
  const op = await o.ctx.newPage();
  await fresh(op, q('v=b&study=0'));
  check((await op.textContent('#screen-heading')).trim() === 'Tidal Forecast Mission', '?study=0 skips consent and the pretest');
  await op.waitForTimeout(4500);
  check(o.sent.requests.length === 0, '?study=0 sends nothing');
  await o.ctx.close();

  // Developer mode: the study pages don't force themselves in, but Finish mission still leads
  // to the posttest, so a walk-through sees the real ending.
  const dv = await studyContext(browser);
  const dvp = await dv.ctx.newPage();
  await fresh(dvp, q('v=b&dev=1'));
  await dvp.selectOption('#dev-jump', '6:1');
  await dvp.click('[data-action="dev-jump"]');
  await dvp.click('[data-action="finish"]');
  await dvp.waitForSelector('[data-action="test-transition"]');
  check((await dvp.textContent('#screen-heading')).trim() === 'Great work, analyst!', 'In developer mode, Finish mission still leads to the posttest (via its transition page)');
  // The Jump menu reaches both in-between pages directly, and shows where you are.
  await dvp.selectOption('#dev-jump', 'study:pretest-thanks');
  await dvp.click('[data-action="dev-jump"]');
  check((await dvp.textContent('#screen-heading')).trim() === 'Thanks for your answers!' && (await dvp.inputValue('#dev-jump')) === 'study:pretest-thanks',
    'Jump menu: the pretest thank-you page');
  await dvp.selectOption('#dev-jump', 'study:posttest-transition');
  await dvp.click('[data-action="dev-jump"]');
  check((await dvp.textContent('#screen-heading')).trim() === 'Great work, analyst!' && (await dvp.inputValue('#dev-jump')) === 'study:posttest-transition',
    'Jump menu: the transition page before the posttest');
  await dvp.selectOption('#dev-jump', 'study:posttest');
  await dvp.click('[data-action="dev-jump"]');
  check((await dvp.textContent('#screen-heading')).trim() === 'A few final questions', 'Jump menu: "Posttest" opens the posttest intro, past the transition page');
  await dv.ctx.close();

  const b = await browser.newContext();
  await b.route(/study-content\.js/, r => r.abort());
  const bp = await b.newPage();
  await bp.goto(q('v=b'));
  await bp.waitForSelector('#screen-heading');
  check((await bp.textContent('#screen-heading')).trim() === 'The page didn’t load completely',
    'If the study file fails to load, the page asks for a reload instead of skipping consent');
  await b.close();

  /* ------------------------------------------------------------------ */
  console.log('\n# Phone, 390×844');
  const m = await studyContext(browser, { viewport: { width: 390, height: 844 } });
  const mp = await m.ctx.newPage();
  await fresh(mp, q('v=b'));
  await mp.check('input[name="consent"][value="yes"]');
  await mp.click('[data-action="consent-continue"]');
  await mp.click('[data-action="test-start"]');
  for (let n = 1; n <= 6; n++) { await answerPage(mp); await nextPage(mp); }
  await shot(mp, 's07-phone-item6b');
  const ov = await mp.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  check(ov <= 0, 'Phone: no horizontal overflow on a test page (' + ov + 'px)');
  await m.ctx.close();

  /* ------------------------------------------------------------------ */
  console.log('\n# The three links: /a/, /b/ and /tester/, on a learner-style address');
  // On localhost the page is in author mode (the "<>" button always shows). A second browser maps
  // the made-up host study.test to the test server, so the page sees an address like the live site.
  const port = new URL(BASE).port || '80';
  const live = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--host-resolver-rules=MAP study.test 127.0.0.1:' + port] });
  const L = await studyContext(live);
  const site = 'http://study.test/';
  const lp = await L.ctx.newPage();
  await lp.goto(site + 'index.html');
  await lp.evaluate(() => { localStorage.clear(); localStorage.setItem('tfm.devmode', '1'); }); // an old browser-wide setting
  await lp.goto(site + 'a/');
  await lp.waitForSelector('#screen-heading');
  check(/[?&]v=a\b/.test(lp.url()) && (await lp.textContent('#screen-heading')).trim() === 'Taking part in this study', '/a/ opens the study in version A');
  check(!(await lp.isVisible('#dev-btn')) && !(await lp.isVisible('#devbar')), 'A learner link shows no "<>" button and no developer bar');
  check(await lp.evaluate(() => !localStorage.getItem('tfm.devmode')), 'An old browser-wide developer setting is cleared, not used');
  check(await lp.evaluate(() => window.TFM.buildRecord().condition) === 'a', 'The record says version A');
  await lp.goto(site + 'b/');
  await lp.waitForSelector('#screen-heading');
  check(/[?&]v=b\b/.test(lp.url()) && !(await lp.isVisible('#dev-btn')), '/b/ opens version B, also without the button');

  const tp = await L.ctx.newPage();
  await tp.goto(site + 'tester/');
  await tp.waitForSelector('#devbar');
  check(/tester=1/.test(tp.url()) && await tp.isVisible('#devbar') && await tp.isVisible('#dev-btn'), '/tester/ opens with developer mode on and the button shown');
  check((await tp.textContent('#screen-heading')).trim() === 'Tidal Forecast Mission', 'The tester link skips consent and the pretest (reach them from the Jump menu)');
  await tp.click('[data-action="intro-continue"]');
  await tp.click('[data-action="start-mission"]');
  await tp.evaluate(() => window.TFMLog.flush());
  await tp.waitForFunction(() => window.TFMLog.status().eventsSent > 0, null, { timeout: 15000 });
  check(L.sent.events.length > 0 && L.sent.events.every(e => e.dev === true), 'Data from the tester link is sent, all marked dev = true');
  await tp.click('[data-action="dev-toggle"][data-fk="dev-off"]');
  await tp.reload();
  await tp.waitForSelector('#screen-heading');
  check(!(await tp.isVisible('#devbar')) && await tp.isVisible('#dev-btn'), 'In the tester tab, Turn off survives a reload and the button stays');
  const np = await L.ctx.newPage();
  await np.goto(site + '?v=b');
  await np.waitForSelector('#screen-heading');
  check(!(await np.isVisible('#dev-btn')) && !(await np.isVisible('#devbar')), 'A new tab on a learner link doesn’t inherit developer mode');
  await L.ctx.close();
  await live.close();

  await browser.close();
  console.log(failures ? `\n${failures} check(s) FAILED` : '\nAll checks passed');
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
