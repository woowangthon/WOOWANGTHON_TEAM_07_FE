const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm'), path = require('node:path');
const fx = (n) => JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', n + '.json'), 'utf8'));

// 모듈을 vm에 올린다. dataSource: 'api' | 'mock'. routes: {경로: 응답 객체 | Error}
function load(dataSource, routes) {
  const window = { APP_CONFIG: { dataSource, beBase: 'http://be.test' } };
  const ctx = { window, console, setTimeout, clearTimeout, setInterval, clearInterval, AbortController };
  for (const n of ['mock-data', 'api-client', 'station-id-map', 'elevator-service'])
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../Prototype-v2/js/' + n + '.js'), 'utf8'), ctx);
  const calls = [];
  const fetch = async (url) => {
    const p = url.replace('http://be.test', '');
    calls.push(p);
    const r = routes[p];
    if (r instanceof Error) throw r;
    if (!r) return { ok: false, status: 404, text: async () => JSON.stringify({ error: { code: 'NOT_FOUND', message: 'x' } }) };
    return { ok: true, status: 200, text: async () => JSON.stringify(r) };
  };
  return { w: window, es: window.ElevatorService, fetch, calls };
}
const base = (v) => ({
  '/api/stations': fx('be-stations'),
  '/api/stations/status': fx(v ? 'be-stations-status.variant' : 'be-stations-status'),
  '/api/stations/31/elevators': fx(v ? 'be-station-31-elevators.variant' : 'be-station-31-elevators'),
  '/api/stations/31/alternatives': fx(v ? 'be-station-31-alternatives.variant' : 'be-station-31-alternatives'),
});

test('real recording: every station null -> UNKNOWN, nothing is shown as normal', async () => {
  const { es, fetch, w } = load('api', base(false));
  assert.equal(es.getLiveState().phase, 'loading'); // 시작 전
  await es.startLive({ fetch, refreshMs: 0 });
  assert.equal(es.getLiveState().phase, 'ready');
  const stations = es.getAllStations();
  assert(stations.length > 200);
  assert(stations.every((s) => es.getStationStatus(s.id) === 'UNKNOWN'));
  assert(stations.every((s) => !es.hasElevatorData(s.id)));
  assert.equal(es.getOutages().length, 0);
});

test('variant: AVAILABLE/PARTIAL/UNAVAILABLE map to FE slugs, unmapped/missing -> UNKNOWN', async () => {
  const { es, fetch, w } = load('api', base(true));
  await es.startLive({ fetch, refreshMs: 0 });
  assert.equal(es.getStationStatus('gangnam'), 'UNAVAILABLE');
  assert.equal(es.getStationStatus('yeoksam'), 'AVAILABLE');
  assert.equal(es.getStationStatus('gyodae'), 'PARTIAL');
  assert.equal(es.getStationStatus('seocho'), 'AVAILABLE');
  assert.equal(es.getStationInfo('seocho').dataFresh, false);
  assert.equal(es.getStationInfo('yeoksam').dataFresh, true);
  assert.equal(es.getStationStatus('no_such_station'), 'UNKNOWN');
  const unmapped = w.StationIdMap.getResult().unmatchedFe[0];
  assert(unmapped);
  assert.equal(es.getStationStatus(unmapped), 'UNKNOWN');
  assert.equal(es.hasElevatorData('gangnam'), true);
  assert.equal(es.hasElevatorData(unmapped), false);
  assert.equal(es.getGlobalLimitations().length, 2);
  const out = es.getOutages();
  assert.deepEqual(Array.from(out, (o) => o.station.id + ':' + o.status), ['gangnam:UNAVAILABLE', 'gyodae:PARTIAL']);
});

test('notify fires after load so app and map re-render', async () => {
  const { es, fetch } = load('api', base(true));
  let n = 0;
  es.subscribe(() => { n++; });
  await es.startLive({ fetch, refreshMs: 0 });
  assert(n >= 2); // loading, ready
});

test('elevator list is mapped to the FE shape without inventing type', async () => {
  const { es, fetch } = load('api', base(true));
  await es.startLive({ fetch, refreshMs: 0 });
  assert.equal(es.getElevatorsState('gangnam'), 'idle');
  assert.equal(es.getElevators('gangnam').length, 0);
  await es.fetchStationElevators('gangnam');
  assert.equal(es.getElevatorsState('gangnam'), 'ready');
  const list = es.getElevators('gangnam');
  assert.equal(list.length, 4);
  const e = list[0];
  assert.equal(e.id, 'be-101');
  assert.equal(e.location, '10번 출입구');
  assert.equal(e.floors, 'B1-1F');
  assert.equal(e.status, 'UNAVAILABLE');
  assert.equal(e.type, undefined);
  assert.equal(e.fetchedAt, '2026-11-15T00:24:38+09:00');
  const unk = list[3];
  assert.equal(unk.status, 'UNKNOWN');
  assert.equal(unk.unknownReason, 'STALE');
  assert.equal(list[2].status, 'AVAILABLE');
  // 정보 없음은 멈춤 목록에 들어가지 않고, 표시 순서는 멈춤 -> 정보 없음 -> 정상
  assert.deepEqual(Array.from(es.sortForDisplay(list), (x) => x.status), ['UNAVAILABLE', 'UNAVAILABLE', 'UNKNOWN', 'AVAILABLE']);
  assert.equal(es.getOutages()[0].broken.length, 2);
  assert.equal(es.getLimitations('gangnam')[0], '일부 설비 상태가 확인되지 않아 역 전체 상태를 단정할 수 없음');
  assert.equal(es.getDataTime('gangnam'), '2026-11-15T00:24:38+09:00');
});

test('real recording elevators: all STALE -> UNKNOWN, no data time shown as fresh status', async () => {
  const { es, fetch } = load('api', base(false));
  await es.startLive({ fetch, refreshMs: 0 });
  await es.fetchStationElevators('gangnam');
  const list = es.getElevators('gangnam');
  assert(list.length === 4 && list.every((e) => e.status === 'UNKNOWN' && e.unknownReason === 'STALE'));
  assert.equal(es.getStationStatus('gangnam'), 'UNKNOWN');
  assert.equal(es.getLimitations('gangnam').length, 1);
});

test('station elevator fetch failure -> error state, empty list', async () => {
  const r = base(true); delete r['/api/stations/31/elevators'];
  const { es, fetch } = load('api', r);
  await es.startLive({ fetch, refreshMs: 0 });
  await es.fetchStationElevators('gangnam');
  assert.equal(es.getElevatorsState('gangnam'), 'error');
  assert.equal(es.getElevators('gangnam').length, 0);
});

test('unmapped FE station elevator fetch -> unmapped state without request', async () => {
  const { es, fetch, w, calls } = load('api', base(true));
  await es.startLive({ fetch, refreshMs: 0 });
  const slug = w.StationIdMap.getResult().unmatchedFe[0];
  const before = calls.length;
  await es.fetchStationElevators(slug);
  assert.equal(es.getElevatorsState(slug), 'unmapped');
  assert.equal(calls.length, before);
});

test('status list failure -> all UNKNOWN, previous values are dropped (not stale-as-fresh)', async () => {
  const r = base(true);
  const { es, fetch } = load('api', r);
  await es.startLive({ fetch, refreshMs: 0 });
  await es.fetchStationElevators('gangnam');
  assert.equal(es.getStationStatus('gangnam'), 'PARTIAL'); // 역별 응답의 station_status가 목록 값을 갱신한다
  const failing = async () => { throw Object.assign(new Error('down'), {}); };
  await es.startLive({ fetch: failing, refreshMs: 0 });
  assert.equal(es.getLiveState().phase, 'error');
  assert.equal(es.getLiveState().error, 'NETWORK');
  assert.equal(es.getStationStatus('gangnam'), 'UNKNOWN');
  assert.equal(es.getElevators('gangnam').length, 0);
  assert.equal(es.getOutages().length, 0);
  assert.equal(es.getDataTime(), null);
});

test('alternatives: mapped to existing shape, UNCONFIRMED, unmapped candidate kept by name', async () => {
  const { es, fetch } = load('api', base(true));
  await es.startLive({ fetch, refreshMs: 0 });
  const alt = await es.findAlternativeStationAsync('gangnam');
  assert.equal(alt.station.id, 'yeoksam');
  assert.equal(alt.stops, 1);
  assert.deepEqual(Array.from(alt.path), ['gangnam', 'yeoksam']);
  assert.equal(alt.lineId, '2');
  assert.equal(alt.walkMinutes, null);
  assert.equal(alt.accessibilityStatus, 'UNCONFIRMED');
  assert.equal(alt.stationStatus, 'AVAILABLE');
  assert.equal(alt.candidates.length, 2);
  const u = alt.candidates[1];
  assert.equal(u.station.id, null);
  assert.equal(u.station.unmapped, true);
  assert.equal(u.station.name, '가상역');
  assert.deepEqual(Array.from(u.path), ['gangnam']);
  assert.equal(u.stationStatus, 'PARTIAL');
});

test('alternatives: real recording has none -> null; BE error rejects', async () => {
  const a = load('api', base(false));
  await a.es.startLive({ fetch: a.fetch, refreshMs: 0 });
  assert.equal(await a.es.findAlternativeStationAsync('gangnam'), null);
  const r = base(true); delete r['/api/stations/31/alternatives'];
  const c = load('api', r);
  await c.es.startLive({ fetch: c.fetch, refreshMs: 0 });
  await assert.rejects(c.es.findAlternativeStationAsync('gangnam'), (e) => e.code === 'NOT_FOUND');
});

test('API mode ignores fake breakage controls', async () => {
  const { es, fetch } = load('api', base(true));
  await es.startLive({ fetch, refreshMs: 0 });
  es.setStationBroken('yeoksam', true);
  assert.equal(es.getStationStatus('yeoksam'), 'AVAILABLE');
  assert.equal(es.toggleElevator('gangnam', 'be-101'), null);
});

test('mock mode is unchanged: no network, mock data, sync alternative, startLive is a no-op', async () => {
  const { es, fetch, calls } = load('mock', {});
  await es.startLive({ fetch, refreshMs: 0 });
  assert.equal(calls.length, 0);
  assert.equal(es.isLive(), false);
  assert.equal(es.getLiveState().phase, 'ready');
  assert(es.getAllStations().some((s) => es.getStationStatus(s.id) === 'AVAILABLE'));
  assert.equal(es.getElevatorsState('gangnam'), 'ready');
  es.setStationBroken('gangnam', true);
  assert.equal(es.getStationStatus('gangnam'), 'UNAVAILABLE');
  const alt = await es.findAlternativeStationAsync('gangnam');
  assert.equal(alt.source, 'DEMO');
  assert.equal(alt.accessibilityStatus, 'UNCONFIRMED');
});
