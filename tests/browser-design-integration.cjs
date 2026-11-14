/* Runtime regression checks for the design shell and integrated station controls. */
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const puppeteer = require(process.env.PUPPETEER_MODULE || 'puppeteer');
const configuredFile = process.env.APP_FILE;
const appURL = configuredFile && /^(file|https?):/.test(configuredFile) ? configuredFile : pathToFileURL(path.resolve(configuredFile || 'Prototype-v2/index.html')).href;
const failures = [];
let passed=0;
const near = (actual, expected, label, tolerance = 0.6) => assert.ok(Math.abs(actual - expected) <= tolerance, `${label}: ${actual}, expected ${expected}`);
(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  const runtimeErrors = [];
  page.on('pageerror', error => runtimeErrors.push(error.message));
  await page.setViewport({ width: 375, height: 812, deviceScaleFactor: 1 });
  // Local assets run normally; external fonts are deliberately unavailable to exercise icon fallback.
  await page.setRequestInterception(true);
  const appOrigin = /^https?:/.test(appURL) ? new URL(appURL).origin : null; // 앱이 http로 서비스되면 앱 자체 요청은 허용하고 외부(폰트 CDN 등)만 막는다
  page.on('request', request => /^https?:/.test(request.url()) && !(appOrigin && request.url().startsWith(appOrigin + '/')) ? request.abort() : request.continue());
  const check = async (name, run) => {
    try { await run(); passed++; console.log(`PASS ${name}`); }
    catch (error) { failures.push(`${name}: ${error.message}`); console.error(`FAIL ${name}: ${error.message}`); }
  };
  const tab = async name => {
    await page.click(`.tab[data-tab="${name}"]`);
    await page.waitForFunction(value => document.querySelector(`#view-${value}`).classList.contains('active'), {}, name);
    await page.evaluate(() => Promise.all(document.getAnimations().map(animation => animation.finished.catch(() => {}))));
  };
  const fresh = async (font = 'normal') => {
    await page.goto(appURL, { waitUntil: 'load' });
    await page.evaluate(value => {
      localStorage.clear(); sessionStorage.clear();
      localStorage.setItem('elevSubway.fontSize.v1', value);
    }, font);
    await page.reload({ waitUntil: 'load' });
    await page.waitForFunction(() => document.querySelectorAll('#originSelect option').length > 5);
  };
  try {
    await fresh();
    await check('yellow/charcoal/orange design tokens and Material fallback', async () => {
      const actual = await page.evaluate(() => {
        const css = getComputedStyle(document.documentElement);
        const icon = document.querySelector('.tab.active .ms');
        const button = document.querySelector('#timeForm .btn-primary');
        return {
          primary: css.getPropertyValue('--primary').trim().toUpperCase(),
          ink: css.getPropertyValue('--on-primary').trim().toUpperCase(),
          warn: css.getPropertyValue('--warn').trim().toUpperCase(),
          font: getComputedStyle(icon).fontFamily,
          fallback: document.documentElement.classList.contains('ms-ready') || getComputedStyle(icon).color === 'rgba(0, 0, 0, 0)' || getComputedStyle(icon).visibility === 'hidden',
          background: getComputedStyle(button).backgroundColor,
          color: getComputedStyle(button).color,
          fill: getComputedStyle(icon).getPropertyValue('--ms-fill').trim()
        };
      });
      assert.equal(actual.primary, '#FFD400'); assert.equal(actual.ink, '#111827'); assert.equal(actual.warn, '#EA580C');
      assert.match(actual.font, /Material Symbols Rounded/); assert.ok(actual.fallback, 'unloaded font must hide icon names');
      assert.equal(actual.background, 'rgb(255, 212, 0)'); assert.equal(actual.color, 'rgb(17, 24, 39)');
      assert.equal(actual.fill, '1');
    });
    await check('map status shapes and 44px station hit areas', async () => {
      const result = await page.evaluate(() => ({
        hits: Array.from(document.querySelectorAll('.station-node .hit')).map(el => el.getBoundingClientRect().width),
        statuses: document.querySelectorAll('.station-node .st-icon').length,
        warningShapes: Array.from(document.querySelectorAll('.station-node.st-warn .st-icon')).map(el => el.textContent),
        brokenShapes: Array.from(document.querySelectorAll('.station-node.st-bad .st-icon')).map(el => el.textContent),
        labels: document.querySelector('.map-legend').textContent
      }));
      assert.ok(result.hits.length > 20); assert.ok(result.hits.every(width => width >= 43), `minimum map hit: ${Math.min(...result.hits)}`);
      assert.ok(result.statuses > 0); assert.ok(result.warningShapes.length > 0);
      assert.ok(result.warningShapes.every(value => value === 'error')); assert.ok(result.brokenShapes.every(value => value === 'cancel'));
      assert.match(result.labels, /정상/); assert.match(result.labels, /일부 운행/); assert.match(result.labels, /정보 없음/);
    });
    await tab('time');
    await check('AMPM selects and segmented now/arrival modes', async () => {
      assert.equal(await page.$eval('#arriveBy', el => el.type), 'hidden');
      assert.equal(await page.$$eval('input[type="time"]', els => els.length), 0);
      assert.equal(await page.$$eval('#arriveHour option', els => els.length), 12);
      await page.select('#arriveAmpm', '오후'); await page.select('#arriveHour', '3'); await page.select('#arriveMin', '05');
      assert.equal(await page.$eval('#arriveBy', el => el.value), '15:05');
      await page.click('#timeMode [data-mode="now"]');
      assert.equal(await page.$eval('#modeNow', el => el.checked), true);
      assert.equal(await page.$eval('.time-row', el => el.hidden), true);
      assert.equal(await page.$eval('#timeMode [data-mode="now"]', el => el.getAttribute('aria-checked')), 'true');
      await page.click('#timeMode [data-mode="arrive"]');
      assert.equal(await page.$eval('.time-row', el => el.hidden), false);
    });
    await check('both station lists, keyboard commit, search and latest five recents', async () => {
      for (const role of ['origin', 'dest']) {
        await page.focus(`#${role}Search`);
        const count = await page.$$eval(`#${role}Results [role="option"]`, els => els.length);
        const expected = await page.$$eval(`#${role}Select option`, els => els.length);
        assert.equal(count, expected, `${role} opens entire station list`);
        const first = await page.$eval(`#${role}Results [role="option"]`, el => el.dataset.id);
        await page.keyboard.press('ArrowDown'); await page.keyboard.press('Enter');
        assert.equal(await page.$eval(`#${role}Select`, el => el.value), first);
        assert.equal(await page.$eval(`#${role}Search`, el => el.getAttribute('aria-expanded')), 'false');
      }
      const chosen = [];
      for (let i = 0; i < 6; i++) {
        await page.focus('#originSearch');
        // Focus can already be on the field after commit; click explicitly reopens it.
        await page.click('#originSearch');
        const id = await page.$$eval('#originResults [role="option"]', (els, used) => els.find(el => !used.includes(el.dataset.id)).dataset.id, chosen);
        await page.click(`#originResults [data-id="${id}"]`); chosen.push(id);
      }
      const recent = await page.evaluate(() => JSON.parse(localStorage.getItem('ev.recentStations')));
      assert.deepEqual(recent, chosen.slice(-5).reverse());
      await page.click('#originSearch');
      assert.equal(await page.$$eval('#originResults small', els => els.filter(el => /최근/.test(el.textContent)).length), 5);
      await page.keyboard.press('Escape');
      await page.focus('#destSearch'); await page.keyboard.type('강남');
      assert.ok(await page.$$eval('#destResults [role="option"]', els => els.length > 0 && els.every(el => el.textContent.includes('강남'))));
      await page.keyboard.press('ArrowDown'); await page.keyboard.press('Enter');
      const before = await page.evaluate(() => [originSelect.value, destSelect.value]);
      await page.click('#swapBtn');
      assert.deepEqual(await page.evaluate(() => [originSelect.value, destSelect.value]), before.reverse());
    });
    await fresh(); await tab('time');
    await check('big AMPM clock and exactly departure/boarding graphic', async () => {
      await page.click('#timeMode [data-mode="now"]'); await page.click('#timeForm button[type="submit"]');
      await page.waitForSelector('#timeResult .big-time');
      const result = await page.$eval('#timeResult', el => ({
        ampm: el.querySelector('.big-time-ampm')?.textContent,
        graphics: el.querySelectorAll('.departure-graphic').length,
        steps: Array.from(el.querySelectorAll('.departure-step')).map(step => step.dataset.step),
        timeline: el.querySelectorAll('.timeline').length,
        duplicate: el.querySelectorAll('.route-card').length
      }));
      assert.match(result.ampm || '', /오전|오후/); assert.equal(result.graphics, 1);
      assert.deepEqual(result.steps, ['departure', 'boarding']); assert.equal(result.timeline, 0); assert.ok(result.duplicate <= 1);
    });
    await tab('elevator');
    await check('broken-first elevator list and status count summary', async () => {
      const result = await page.evaluate(() => ({
        ranks: Array.from(document.querySelectorAll('#elevatorList .elev-row-op')).map(el => el.classList.contains('bad') ? 0 : el.classList.contains('warn') ? 1 : el.classList.contains('ok') ? 2 : 3),
        summary: Array.from(document.querySelectorAll('#elevatorSummary .summary-card')).map(el => ({ count: el.querySelector('.summary-body')?.textContent, icon: !!el.querySelector('.ms'), label: el.querySelector('.summary-label')?.textContent, layout: ['.summary-icon', '.summary-label', '.summary-body'].map(selector => { const rect = el.querySelector(selector)?.getBoundingClientRect(); return rect ? { top: rect.top, bottom: rect.bottom, center: rect.left + rect.width / 2 } : null; }) })),
        updated: document.querySelector('#elevUpdated').textContent
      }));
      assert.ok(result.ranks.length > 5); assert.deepEqual(result.ranks, [...result.ranks].sort());
      assert.equal(result.summary.length, 3); assert.ok(result.summary.every(card => /\d+역/.test(card.count) && card.icon));
      assert.match(result.updated, /(?:오전|오후).*기준/);
      for (const card of result.summary) {
        assert.ok(card.layout.every(Boolean), 'summary requires icon, label, count blocks');
        const [icon, label, count] = card.layout;
        assert.ok(icon.bottom <= label.top + 1 && label.bottom <= count.top + 1, 'summary order: icon above name above count');
        near(icon.center, label.center, 'summary icon/name centered', 1);
        near(label.center, count.center, 'summary name/count centered', 1);
      }
    });
    await check('station peek/full sheet, count bar and phone scroll containment', async () => {
      await page.click('#elevatorList .station-row');
      await page.waitForSelector('#bottomSheet.open.is-peek');
      await page.evaluate(() => Promise.all(document.getAnimations().map(animation => animation.finished.catch(() => {}))));
      assert.ok(await page.$('#sheetContent .op-count')); assert.ok(await page.$('#sheetContent .op-bar'));
      const bar = await page.$eval('#sheetContent .op-status', el => ({ count: el.querySelector('.op-count').textContent.match(/(\d+)\s*\/\s*(\d+)/).slice(1).map(Number), cells: el.querySelectorAll('.op-cell').length, down: el.querySelectorAll('.op-cell.down').length }));
      if (bar.count[1] <= 12) { assert.equal(bar.cells, bar.count[1]); assert.equal(bar.down, bar.count[1] - bar.count[0]); }
      assert.equal(await page.$eval('#sheetHandle', el => el.tagName), 'BUTTON');
      assert.equal(await page.$eval('#sheetHandle', el => el.getAttribute('aria-expanded')), 'false');
      await page.click('#sheetHandle'); await page.waitForSelector('#bottomSheet.is-full');
      await page.evaluate(() => Promise.all(document.getAnimations().map(animation => animation.finished.catch(() => {}))));
      assert.equal(await page.$eval('#sheetHandle', el => el.getAttribute('aria-expanded')), 'true');
      const containment = await page.evaluate(() => ({ phone: getComputedStyle(document.querySelector('#phone')).overflowY, body: getComputedStyle(document.body).overflowY, sheet: getComputedStyle(document.querySelector('#sheetContent')).overflowY }));
      assert.equal(containment.phone, 'hidden', JSON.stringify(containment));
      assert.equal(containment.body, 'hidden'); assert.equal(containment.sheet, 'auto');
      await page.click('#sheetHandle'); await page.waitForSelector('#bottomSheet.is-peek');
      await page.keyboard.press('Escape'); await page.waitForFunction(() => !document.querySelector('#bottomSheet').classList.contains('open'));
    });
    await check('problem-station summary preserves one safe accessibility action', async()=>{
      await page.evaluate(()=>{ElevatorService.setStationBroken('gangnam',true);App.switchTab('map');App.openStation('gangnam');});
      await page.evaluate(()=>Promise.all(document.getAnimations().map(a=>a.finished.catch(()=>{}))));
      assert.equal(await page.$$eval('#sheetContent .btn-primary',els=>els.length),1);
      assert.ok(await page.$eval('#sheetContent [data-act="calc-time"]',el=>el.classList.contains('btn-ghost')));
      await page.click('[data-act="check-accessibility"]');await page.waitForSelector('#bottomSheet.is-full');
      assert.ok(await page.$('#sheetContent .accessible-route--missing'));
      await page.keyboard.press('Escape');
      await page.waitForFunction(()=>document.querySelector('#bottomSheet').getBoundingClientRect().top>=document.querySelector('#phone').getBoundingClientRect().bottom-1);
      await page.evaluate(()=>ElevatorService.reset());
      await tab('time');await page.click('#originSearch');
      assert.ok(await page.$eval('#originResults .combo-status',el=>el.getAttribute('aria-label').startsWith('엘리베이터')));
      await page.keyboard.press('Escape');
    });
    for (const [font, scale] of Object.entries({ normal: 1, lg: 1.125, xl: 1.25, max: 1.5 })) {
      await fresh(font);
      await check(`375px ${font}: one font scale, equal station slots, no page overflow, header visibility`, async () => {
        for (const view of ['map', 'elevator', 'time', 'chat', 'login']) {
          await tab(view);
          const data = await page.evaluate(() => {
            const active = document.querySelector('.view.active');
            const header = document.querySelector('.app-header');
            return { bodyWidth: document.documentElement.scrollWidth, viewport: innerWidth, root: parseFloat(getComputedStyle(document.documentElement).fontSize), body: parseFloat(getComputedStyle(document.body).fontSize), active: document.body.dataset.activeTab, header: getComputedStyle(header).display, overflow: active.scrollWidth - active.clientWidth, legend: (() => { const rect = document.querySelector('.map-legend').getBoundingClientRect(); return { left: rect.left, right: rect.right, width: rect.width }; })(), offenders: Array.from(active.querySelectorAll('*')).filter(el => el.getBoundingClientRect().right > innerWidth + 1).slice(0, 6).map(el => el.id || el.className.baseVal || el.className) };
          });
          near(data.root, 16 * scale, `${view} root`); near(data.body, 17 * scale, `${view} body`);
          assert.ok(data.bodyWidth <= data.viewport + 1, `${view} document overflow ${data.bodyWidth}`);
          assert.ok(data.overflow <= 1, `${view} active view overflow ${data.overflow}: ${JSON.stringify(data.offenders)} legend:${JSON.stringify(data.legend)}`);
          assert.equal(data.active, view);
          assert.equal(data.header === 'none', ['time', 'chat', 'login'].includes(view), `${view} header`);
        }
        assert.ok(await page.$('.tab[data-tab="login"] .ms'));
        await tab('time');
        const widths = await page.evaluate(() => [originCombo.getBoundingClientRect().width, destCombo.getBoundingClientRect().width, swapBtn.getBoundingClientRect().width]);
        near(widths[0], widths[1], 'equal station slots', 1); assert.ok(widths[2] >= 44);
      });
    }
    await check('desktop selected-station demo controls preserve state and update real counts', async () => {
      await page.setViewport({width:1440,height:1000});
      await page.evaluate(()=>{App.switchTab('map');App.openStation('sindorim');});
      const initial=await page.evaluate(()=>ElevatorService.getStationStatus('sindorim'));
      await page.click('#demoStation [data-demo-act="demo-station-broken"][data-broken="1"]');
      assert.equal(await page.evaluate(()=>ElevatorService.getStationStatus('sindorim')),'UNAVAILABLE');
      assert.ok(await page.$eval('#demoStation',el=>el.textContent.includes('신도림역')));
      const total=await page.evaluate(()=>ElevatorService.getAllStations().filter(s=>ElevatorService.hasElevatorData(s.id)&&ElevatorService.getStationStatus(s.id)==='UNAVAILABLE').length);
      assert.equal(await page.$eval('#elevatorSummary .bad .summary-num',el=>Number(el.textContent)),total);
      await page.click('#demoStation [data-demo-act="demo-station-broken"][data-broken="0"]');
      assert.equal(await page.evaluate(()=>ElevatorService.getStationStatus('sindorim')),initial);
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
      if(process.env.DESKTOP_SCREENSHOT)await page.screenshot({path:process.env.DESKTOP_SCREENSHOT});
    });
    await check('no uncaught browser errors', async () => assert.deepEqual(runtimeErrors, []));
    console.log('RESULT design groups: '+passed+' passed, '+failures.length+' failed');
  } finally { await browser.close(); }
  if (failures.length) { console.error(`\n${failures.length} design integration checks failed:\n${failures.join('\n')}`); process.exitCode = 1; }
})().catch(error => { console.error(error); process.exitCode = 1; });
