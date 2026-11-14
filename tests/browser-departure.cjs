// Run with an installed Puppeteer, or set PUPPETEER_MODULE to its absolute module path.
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const puppeteer = require(process.env.PUPPETEER_MODULE || 'puppeteer');
(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  let assertions = 0;
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setViewport({ width: 375, height: 812 });
    await page.goto(process.env.APP_FILE || pathToFileURL(path.resolve('Prototype-v2/index.html')).href, { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => App.openTime({ originId: 'sindorim', destId: 'gangnam', arriveBy: null }));
    for (const font of ['normal', 'lg', 'xl', 'max']) {
      await page.evaluate(font => document.documentElement.setAttribute('data-fontsize', font), font);
      const result = await page.evaluate(() => {
        const result = document.querySelector('#timeResult');
        const graphic = result.querySelector('.departure-graphic');
        const style = getComputedStyle(graphic.querySelector('svg'));
        return {
          clock: result.querySelector('.big-time').textContent,
          steps: [...graphic.querySelectorAll('.departure-step')].map(el => el.dataset.step),
          text: graphic.textContent,
          overflow: graphic.scrollWidth > graphic.clientWidth + 1 || document.documentElement.scrollWidth > 375,
          fontSize: parseFloat(getComputedStyle(graphic.querySelector('.departure-step-label')).fontSize),
          duration: style.animationDuration, iterations: style.animationIterationCount,
        };
      });
      assert.match(result.clock, /\d{1,2}:\d{2}/);
      assert.deepEqual(result.steps, ['departure', 'boarding']);
      assert(!result.text.includes('도착') && result.text.includes('실제 열차 위치가 아닌') && /오전|오후/.test(result.text));
      assert(!result.overflow, font + ' overflow');
      assert.equal(result.duration, '0.65s'); assert.equal(result.iterations, '1');
      assert.equal(result.fontSize, {normal:15, lg:16.875, xl:18.75, max:22.5}[font]);
      assertions += 7;
    }
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
    assert.equal(await page.$eval('.departure-graphic-train', el => getComputedStyle(el).animationName), 'none'); assertions++;
    const chat = await page.evaluate(async () => {
      AIAgent.reset(); const result = await AIAgent.processMessage('신도림에서 잠실까지 3시까지 가려면?');
      const box = document.createElement('div'); box.innerHTML = result.html;
      return { clock: box.querySelector('.big-time')?.textContent, steps: [...box.querySelectorAll('.departure-step')].map(el=>el.dataset.step), text:box.querySelector('.departure-graphic')?.textContent };
    });
    assert.match(chat.clock, /\d{1,2}:\d{2}/); assert.deepEqual(chat.steps, ['departure','boarding']); assert(!chat.text.includes('도착')); assertions += 3;
    assert.deepEqual(errors, []); assertions++;
    if (process.env.SCREENSHOT) {
      await page.$eval('#timeResult .departure-graphic', el => el.scrollIntoView({block:'center'}));
      const card = await page.$('#timeResult .departure-graphic');
      await card.screenshot({path:process.env.SCREENSHOT});
    }
    console.log('PASS departure browser assertions: ' + assertions);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
