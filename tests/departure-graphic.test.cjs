const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const modulePath = path.join(__dirname, '../Prototype-v2/js/departure-graphic.js');
const cssPath = path.join(__dirname, '../Prototype-v2/css/departure-graphic.css');
const render = (options) => require(modulePath).render(options);

test('renders exactly two ordered steps, departure before boarding, without an arrival step', () => {
  const html = render({ departureTime: '오후 8:53', boardingTime: '오후 9:05', stationName: '서울역' });
  assert.match(html, /<ol\b[^>]*aria-label="이동 순서"/);
  assert.equal((html.match(/class="departure-step"/g) || []).length, 2);
  assert.ok(html.indexOf('data-step="departure"') < html.indexOf('data-step="boarding"'));
  assert.match(html, /출발/);
  assert.match(html, /탑승/);
  assert.match(html, /오후 8:53/);
  assert.match(html, /오후 9:05/);
  assert.match(html, /서울역/);
  assert.doesNotMatch(html, /data-step="arrival"|도착|big-time/);
});

test('escapes all dynamic display values so station and time cannot create HTML', () => {
  const html = render({
    departureTime: '<img src=x onerror=alert(1)>',
    boardingTime: '"\'&<script>alert(1)</script>',
    stationName: '<svg onload=alert(1)>서울 & "역"\''
  });
  assert.match(html, /&lt;img src=x onerror=alert\(1\)&gt;/);
  assert.match(html, /&quot;&#39;&amp;&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.match(html, /&lt;svg onload=alert\(1\)&gt;서울 &amp; &quot;역&quot;&#39;/);
  assert.doesNotMatch(html, /<img|<script|<svg onload/);
});

test('missing data shows a clear placeholder instead of undefined or null', () => {
  const html = render({ departureTime: null, stationName: null });
  assert.doesNotMatch(html, /undefined|null/);
  assert.match(html, /시각 확인 필요/);
  assert.match(html, /출발역/);
  assert.doesNotThrow(() => render());
});

test('browser script registers the same render interface without module or DOM dependencies', () => {
  const context = { window: {} };
  vm.runInNewContext(fs.readFileSync(modulePath, 'utf8'), context);
  assert.equal(typeof context.window.DepartureGraphic.render, 'function');
  assert.equal(context.window.DepartureGraphic.render({ stationName: '서울역' }), render({ stationName: '서울역' }));
});

test('motion is decorative, finite, and explicitly disabled for reduced motion', () => {
  const html = render({});
  assert.match(html, /실제 열차 위치가 아닌 이동 순서 안내입니다\./);
  assert.match(html, /<div class="departure-graphic-track" aria-hidden="true">/);
  assert.match(html, /<svg\b[^>]*aria-hidden="true"[^>]*focusable="false"/);
  const css = fs.readFileSync(cssPath, 'utf8');
  assert.match(css, /--departure-motion-duration:\s*650ms/);
  assert.match(css, /--departure-motion-distance:\s*8px/);
  assert.match(css, /animation:\s*departure-train-nudge\s+var\(--departure-motion-duration\)\s+var\(--ease\)\s+1\s+both/);
  assert.doesNotMatch(css, /infinite/);
  assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*animation:\s*none/);
});
