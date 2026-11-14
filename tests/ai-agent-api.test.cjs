const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm'), path = require('node:path');
const fx = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/chat-responses.json'), 'utf8'));
const js = (n) => fs.readFileSync(path.join(__dirname, '../Prototype-v2/js/' + n + '.js'), 'utf8');

// BE 역: 31=강남, 32=교대 (FE 슬러그 gangnam, gyodae). 33은 FE에 없는 역.
const BE_STATIONS = [
  { station_id: '31', station_name: '강남', lines: [{ line_id: '2' }] },
  { station_id: '32', station_name: '교대', lines: [{ line_id: '2' }, { line_id: '3' }] },
  { station_id: '33', station_name: '없는역', lines: [{ line_id: '2' }] }
];
const MOCK_STATIONS = { gangnam: { name: '강남', lines: ['2'] }, gyodae: { name: '교대', lines: ['2', '3'] } };

function setup(opts) {
  opts = opts || {};
  const calls = [];
  const window = { APP_CONFIG: { dataSource: opts.mode || 'api', beBase: 'http://be', chatBase: 'http://ai' } };
  const fetchImpl = async (url, init) => {
    calls.push({ url, init, body: init.body ? JSON.parse(init.body) : undefined });
    if (url.endsWith('/api/stations')) return { ok: true, status: 200, text: async () => JSON.stringify({ stations: BE_STATIONS }) };
    if (opts.fail) return opts.fail(url, init);
    const r = opts.reply ? opts.reply(url, init) : { ok: true, status: 200, body: {} };
    return { ok: r.ok !== false, status: r.status || 200, text: async () => (typeof r.body === 'string' ? r.body : JSON.stringify(r.body)) };
  };
  window.fetch = fetchImpl;
  const context = { window, console: { error() {}, log() {}, warn() {} }, setTimeout, clearTimeout, AbortController, fetch: fetchImpl, crypto: undefined };
  context.globalThis = window;
  for (const n of ['mock-data', 'elevator-service', 'time-calculator', 'departure-graphic', 'accessible-routes', 'accessible-route-view', 'api-client', 'station-id-map', 'ai-agent'])
    vm.runInNewContext(js(n), context);
  if (opts.map !== false) window.StationIdMap.build(BE_STATIONS, MOCK_STATIONS);
  const chatCalls = () => calls.filter(c => c.url.endsWith('/api/chat'));
  return { w: window, calls, chatCalls };
}
const fixtureReply = (k) => () => ({ body: fx[k].response });

test('API mode POSTs session_id, message and HH:MM current_time to chatBase /api/chat', async () => {
  const t = setup({ reply: fixtureReply('gangnam_elevator') });
  await t.w.AIAgent.processMessage('강남역 엘리베이터 돼?');
  const c = t.chatCalls();
  assert.equal(c.length, 1);
  assert.equal(c[0].url, 'http://ai/api/chat');
  assert.equal(c[0].init.method, 'POST');
  assert.equal(c[0].body.message, '강남역 엘리베이터 돼?');
  assert.match(c[0].body.current_time, /^([01]\d|2[0-3]):[0-5]\d$/);
  assert.ok(c[0].body.session_id.length > 8);
  assert.deepEqual(Object.keys(c[0].body).sort(), ['current_time', 'message', 'session_id']);
});

test('response maps to resp shape: plain text, empty html, toolCalls, <=3 suggestions', async () => {
  const t = setup({ reply: fixtureReply('gangnam_elevator') });
  const r = await t.w.AIAgent.processMessage('강남역 엘리베이터 돼?');
  assert.ok(r.text.startsWith(fx.gangnam_elevator.response.text));
  assert.match(r.text, /\n데이터 기준 시각 \d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
  assert.equal(r.html, '');
  assert.deepEqual(Array.from(r.toolCalls, x => x.name), fx.gangnam_elevator.response.tool_calls.map(x => x.name));
  assert.ok(r.suggestions.length <= 3);
  // 도구 인자의 BE 역 ID는 FE 슬러그로 바뀐다(칩에 역 이름이 보이도록)
  assert.equal(r.toolCalls[1].args.station_id, 'gangnam');
});

test('openStation: BE station_id becomes FE slug in payload.stationId', async () => {
  const t = setup({ reply: fixtureReply('gangnam_elevator') });
  const r = await t.w.AIAgent.processMessage('x');
  assert.equal(r.actions.length, 1);
  assert.equal(r.actions[0].type, 'openStation');
  assert.equal(r.actions[0].payload.stationId, 'gangnam');
  assert.equal(r.actions[0].label, fx.gangnam_elevator.response.actions[0].label);
});

test('openTime: originId/destId converted to slugs, arriveBy kept', async () => {
  const t = setup({ reply: fixtureReply('departure') });
  const r = await t.w.AIAgent.processMessage('x');
  assert.deepEqual(JSON.parse(JSON.stringify(r.actions[0])), { label: '출발 계산 탭에서 열기', type: 'openTime', payload: { originId: 'gyodae', destId: 'gangnam', arriveBy: '09:00' } });
});

test('showAlternative: from/to/path converted; unmapped ones are dropped', async () => {
  const body = { session_id: 's', text: '우회', actions: [
    { type: 'showAlternative', label: 'A', payload: { from: '31', to: '32', path: ['31', '32'] } },
    { type: 'showAlternative', label: 'B', payload: { from: '31', to: '33', path: ['31', '33'] } }
  ] };
  const t = setup({ reply: () => ({ body }) });
  const r = await t.w.AIAgent.processMessage('x');
  assert.equal(r.actions.length, 1);
  assert.deepEqual(JSON.parse(JSON.stringify(r.actions[0].payload)), { from: 'gangnam', to: 'gyodae', path: ['gangnam', 'gyodae'] });
});

test('unmapped station actions are dropped (no dead buttons), text and mapped actions stay', async () => {
  const body = { session_id: 's', text: '본문', actions: [
    { type: 'openStation', label: '없는역 상세 보기', payload: { station_id: '33' } },
    { type: 'openStation', label: '강남 상세 보기', payload: { station_id: '31' } },
    { type: 'openTime', label: '시간', payload: { originId: '31', destId: '33', arriveBy: null } },
    { type: 'bogus', label: 'x', payload: {} }
  ] };
  const t = setup({ reply: () => ({ body }) });
  const r = await t.w.AIAgent.processMessage('x');
  assert.equal(r.text, '본문');
  assert.deepEqual(Array.from(r.actions, a => a.label), ['강남 상세 보기']);
});

test('station map is loaded lazily when empty', async () => {
  const t = setup({ map: false, reply: fixtureReply('gangnam_elevator') });
  const r = await t.w.AIAgent.processMessage('x');
  assert.ok(t.calls.some(c => c.url === 'http://be/api/stations'));
  assert.equal(r.actions[0].payload.stationId, 'gangnam');
});

test('map load failure does not break the answer; station actions are just omitted', async () => {
  const t = setup({ map: false, reply: fixtureReply('gangnam_elevator') });
  t.w.StationIdMap.load = async () => { throw new Error('down'); };
  const r = await t.w.AIAgent.processMessage('x');
  assert.ok(r.text.startsWith(fx.gangnam_elevator.response.text));
  assert.match(r.text, /\n데이터 기준 시각 \d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
  assert.equal(r.actions.length, 0);
});

test('server html-looking content is never put in html and stays text', async () => {
  const evil = '<img src=x onerror=alert(1)><b>hi</b>';
  const body = { session_id: 's', text: evil, html: '<script>1</script>', card_type: 'elevator_status', suggestions: ['<i>a</i>', 'b', 'c', 'd'],
    tool_calls: [{ name: '<b>t</b>', args: { q: '<u>' } }], actions: [{ type: 'openStation', label: '<b>L</b>', payload: { station_id: '31' } }] };
  const t = setup({ reply: () => ({ body }) });
  const r = await t.w.AIAgent.processMessage('x');
  assert.equal(r.html, '');
  assert.equal(r.text, evil); // 문자열 그대로. app.js가 escapeHtml 후 렌더링한다
  assert.equal(r.suggestions.length, 3);
});

test('data_updated_at becomes a safe text note', async () => {
  const body = { session_id: 's', text: '상태', metadata: { engine: 'fallback', data_updated_at: '2026-11-15T08:01:02+09:00' } };
  const t = setup({ reply: () => ({ body }) });
  const r = await t.w.AIAgent.processMessage('x');
  assert.equal(r.text, '상태\n데이터 기준 시각 2026-11-15 08:01');
  const r2 = await setup({ reply: () => ({ body: { session_id: 's', text: '상태', metadata: { data_updated_at: null } } }) }).w.AIAgent.processMessage('x');
  assert.equal(r2.text, '상태');
});

test('recorded fixtures without actions map cleanly (outages_empty, need_station)', async () => {
  for (const k of ['outages', 'unknown_station']) {
    const t = setup({ reply: fixtureReply(k) });
    const r = await t.w.AIAgent.processMessage('x');
    assert.ok(r.text.startsWith(fx[k].response.text));
    assert.equal(r.html, '');
    assert.equal(r.actions.length, 0);
  }
});

const NOTICE = '지금은 답변할 수 없습니다. 잠시 후 다시 시도해 주세요.';
test('failures resolve to the error notice only (network, 5xx, malformed, empty text, timeout)', async () => {
  const cases = {
    network: { fail: async () => { throw new TypeError('fetch failed'); } },
    http500: { reply: () => ({ ok: false, status: 500, body: { error: { code: 'X', message: 'boom' } } }) },
    notJson: { reply: () => ({ body: 'not json' }) },
    noText: { reply: () => ({ body: { session_id: 's' } }) },
    arrayBody: { reply: () => ({ body: [] }) }
  };
  for (const k of Object.keys(cases)) {
    const t = setup(cases[k]);
    const r = await t.w.AIAgent.processMessage('강남역 엘리베이터 돼?');
    assert.equal(r.text, NOTICE, k);
    assert.equal(r.html, '', k);
    assert.equal(r.actions.length, 0, k);
    assert.equal(r.suggestions.length, 0, k);
    assert.equal(t.chatCalls().length, 1, k); // 재시도·로컬 엔진 없음
  }
});

test('timeout aborts and shows the error notice, no local engine', async () => {
  const realSet = global.setTimeout;
  global.setTimeout = (fn, ms, ...a) => realSet(fn, ms >= 5000 ? 10 : ms, ...a); // 5s timer shortened
  try {
    const t = setup({ fail: (url, init) => new Promise((_, rej) => init.signal.addEventListener('abort', () => rej(new Error('aborted')))) });
    const r = await t.w.AIAgent.processMessage('강남역 엘리베이터 돼?');
    assert.equal(r.text, NOTICE);
    assert.equal(t.chatCalls().length, 1);
  } finally { global.setTimeout = realSet; }
});

test('session_id is stable within a tab and changes after reset()', async () => {
  const t = setup({ reply: fixtureReply('gangnam_elevator') });
  await t.w.AIAgent.processMessage('a');
  await t.w.AIAgent.processMessage('b');
  t.w.AIAgent.reset();
  await t.w.AIAgent.processMessage('c');
  const ids = t.chatCalls().map(c => c.body.session_id);
  assert.equal(ids[0], ids[1]);
  assert.notEqual(ids[1], ids[2]);
});

test('API welcome makes no data claims and does not touch the chat endpoint', () => {
  const t = setup({});
  const w = t.w.AIAgent.getWelcome();
  assert.equal(w.html, '');
  assert.doesNotMatch(w.text, /\d+\s*(개|곳|대)/);
  assert.ok(w.suggestions.length <= 3 && w.suggestions.length > 0);
  assert.equal(t.calls.length, 0);
});

test('mock mode is unchanged: no fetch, local engine answers', async () => {
  const t = setup({ mode: 'mock' });
  const r = await t.w.AIAgent.processMessage('지금 고장난 역 알려줘');
  assert.equal(t.calls.length, 0);
  assert.ok(r.text.length > 0);
  assert.notEqual(r.text, NOTICE);
  assert.match(t.w.AIAgent.getWelcome().text, /우회 경로의 접근성/);
});
