/* ElevatorService — 역/노선/엘리베이터 상태 관리 (DOM 접근 없음)
 * 계약: docs/cards/003-interface-contract.md §2
 */
(function () {
  'use strict';

  // 엘리베이터 상태 이름은 여기서만 정한다. 다른 파일은 getStatusLabel로 가져다 쓴다. (REQ-DS-008)
  var STATUS_LABELS = {
    AVAILABLE: '정상',
    PARTIAL: '일부 운행',
    UNAVAILABLE: '이용 불가',
    UNKNOWN: '정보 없음'
  };

  // 별칭(정규화된 키) → 역 id
  var ALIASES = {
    '홍대': 'hongik',
    '홍대입구': 'hongik',
    '건대': 'konkuk',
    '건대입구': 'konkuk',
    '서울대': 'seoul_univ',
    '서울대입구': 'seoul_univ',
    '동대문운동장': 'ddp',
    '동대문역사문화공원': 'ddp',
    '동역사': 'ddp',
    'ddp': 'ddp',
    '이대': 'ewha',
    '이대입구': 'ewha',
    '고터': 'express_bus',
    '고속터미널': 'express_bus',
    '김포공항': 'gimpo_airport',
    '구디': 'guro_digital',
    '구로디지털단지': 'guro_digital',
    '영구청': 'yeongdeungpo_gu',
    '영등포구청': 'yeongdeungpo_gu',
    '총신대': 'isu',
    '총신대입구': 'isu',
    '이수': 'isu',
    '종합운동장': 'sports_complex',
    '서울역': 'seoul',
    '시청': 'cityhall',
    '을지로입구': 'euljiro1ga',
    '을지로1가': 'euljiro1ga',
    '한양대': 'hanyang_univ',
    '교대': 'gyodae'
  };

  var state = null;       // { elevators: deep copy }
  var original = null;    // 최초 MOCK.elevators deep copy
  var graph = null;       // { stationId: [{ id, lineId }] }
  var nameIndex = null;   // [{ key, id }]
  var listeners = [];

  function M() {
    return (typeof window !== 'undefined' && window.MOCK) ? window.MOCK : {};
  }

  function deepCopy(o) {
    return o == null ? o : JSON.parse(JSON.stringify(o));
  }

  function normalize(text) {
    if (text == null) return '';
    var s = String(text).replace(/\s+/g, '').toLowerCase();
    if (s.length > 1 && s.charAt(s.length - 1) === '역') s = s.slice(0, -1);
    return s;
  }

  function stationLabel(st) {
    if (!st) return '';
    var n = st.name || st.id;
    return n.charAt(n.length - 1) === '역' ? n : n + '역';
  }

  function ensureInit() {
    if (state && graph) return;
    var mock = M();
    original = deepCopy(mock.elevators || {});
    state = { elevators: deepCopy(original) };
    buildGraph(mock);
    buildNameIndex(mock);
  }

  function buildGraph(mock) {
    graph = {};
    var seen = {};
    function add(a, b, lineId) {
      if (!a || !b || a === b) return;
      var k = a + '|' + b + '|' + lineId;
      if (seen[k]) return;
      seen[k] = true;
      (graph[a] = graph[a] || []).push({ id: b, lineId: lineId });
    }
    var lines = mock.lines || {};
    Object.keys(lines).forEach(function (lid) {
      var line = lines[lid];
      var segs = line.segments || [];
      segs.forEach(function (seg) {
        for (var i = 0; i + 1 < seg.length; i++) {
          add(seg[i], seg[i + 1], line.id || lid);
          add(seg[i + 1], seg[i], line.id || lid);
        }
      });
      if (line.loop && segs[0] && segs[0].length > 2) {
        var s0 = segs[0];
        add(s0[s0.length - 1], s0[0], line.id || lid);
        add(s0[0], s0[s0.length - 1], line.id || lid);
      }
    });
  }

  function buildNameIndex(mock) {
    nameIndex = [];
    var stations = mock.stations || {};
    var seen = {};
    function push(key, id) {
      if (!key || key.length < 2 || !stations[id]) return;
      var k = key + '|' + id;
      if (seen[k]) return;
      seen[k] = true;
      nameIndex.push({ key: key, id: id });
    }
    Object.keys(stations).forEach(function (id) {
      var st = stations[id];
      push(normalize(st.name), id);
      if (st.name) push(String(st.name).replace(/\s+/g, '').toLowerCase(), id);
    });
    Object.keys(ALIASES).forEach(function (k) { push(normalize(k), ALIASES[k]); push(k.toLowerCase(), ALIASES[k]); });
    nameIndex.sort(function (a, b) { return b.key.length - a.key.length; });
  }

  function notify(stationId) {
    listeners.slice().forEach(function (fn) {
      try { fn(stationId == null ? null : stationId); } catch (e) {
        if (typeof console !== 'undefined') console.error('[ElevatorService] listener error', e);
      }
    });
  }

  // ---------- 조회 ----------
  function getStation(id) {
    var s = (M().stations || {})[id];
    return s || null;
  }

  function getAllStations() {
    var st = M().stations || {};
    return Object.keys(st).map(function (k) { return st[k]; });
  }

  function getLine(lineId) {
    return (M().lines || {})[lineId] || null;
  }

  function findStationByName(text) {
    ensureInit();
    var n = normalize(text);
    if (!n) return null;
    var stations = M().stations || {};
    if (stations[n]) return stations[n];

    // 1) 역명 정확히 일치
    var ids = Object.keys(stations);
    for (var i = 0; i < ids.length; i++) {
      if (normalize(stations[ids[i]].name) === n) return stations[ids[i]];
    }
    // 2) 별칭 정확히 일치
    if (ALIASES[n] && stations[ALIASES[n]]) return stations[ALIASES[n]];

    // 3) 역명/별칭이 입력으로 시작 (입력이 접두어) → 가장 짧은 후보
    var best = null;
    nameIndex.forEach(function (e) {
      if (e.key.indexOf(n) === 0 && (!best || e.key.length < best.key.length)) best = e;
    });
    if (best) return stations[best.id];

    // 4) 입력 안에 역명/별칭이 포함 (예: "강남역엘리베이터") → 가장 긴 후보 (nameIndex는 길이 내림차순)
    for (var j = 0; j < nameIndex.length; j++) {
      if (n.indexOf(nameIndex[j].key) !== -1) return stations[nameIndex[j].id];
    }

    // 5) 역명/별칭 안에 입력이 포함 → 가장 짧은 후보
    best = null;
    nameIndex.forEach(function (e) {
      if (e.key.indexOf(n) !== -1 && (!best || e.key.length < best.key.length)) best = e;
    });
    return best ? stations[best.id] : null;
  }

  function findStationsInText(text) {
    ensureInit();
    if (!text) return [];
    var s = String(text).replace(/\s+/g, '').toLowerCase();
    var stations = M().stations || {};
    var covered = new Array(s.length);
    var matches = [];
    nameIndex.forEach(function (e) {
      var from = 0, pos;
      while ((pos = s.indexOf(e.key, from)) !== -1) {
        var end = pos + e.key.length, free = true;
        for (var i = pos; i < end; i++) { if (covered[i]) { free = false; break; } }
        if (free) {
          for (var k = pos; k < end; k++) covered[k] = true;
          matches.push({ pos: pos, id: e.id });
        }
        from = pos + 1;
      }
    });
    matches.sort(function (a, b) { return a.pos - b.pos; });
    var out = [], seen = {};
    matches.forEach(function (m) {
      if (seen[m.id] || !stations[m.id]) return;
      seen[m.id] = true;
      out.push(stations[m.id]);
    });
    return out;
  }

  function getElevators(stationId) {
    ensureInit();
    if (liveOn()) { var le = live.elevators[stationId]; return le && le.state === 'ready' ? le.list : []; }
    return state.elevators[stationId] || [];
  }

  // 화면에 보여 줄 순서: 멈춘 엘리베이터(고장·점검) → 정상. 같은 상태 안에서는 데이터 순서 유지 (REQ-COM-005)
  function sortForDisplay(list) {
    function rank(e) { return !e ? 0 : (e.status === 'AVAILABLE' ? 2 : (e.status === 'UNKNOWN' ? 1 : 0)); }
    return (list || []).map(function (e, i) { return { e: e, i: i, r: rank(e) }; })
      .sort(function (a, b) { return (a.r - b.r) || (a.i - b.i); })
      .map(function (x) { return x.e; });
  }

  function hasElevatorData(stationId) {
    ensureInit();
    if (liveOn()) {
      var le = live.elevators[stationId];
      if (le && le.state === 'ready' && le.list.length) return true;
      return liveStatus(stationId) !== 'UNKNOWN';
    }
    var e = state.elevators[stationId];
    return !!(e && e.length);
  }

  // 정보 없음(UNKNOWN)은 멈춘 것도 정상도 아니다. 멈춤으로도 정상으로도 세지 않는다.
  function isDown(e) { return e.status !== 'AVAILABLE' && e.status !== 'UNKNOWN'; }

  function getStationStatus(stationId) {
    ensureInit();
    if (liveOn()) return liveStatus(stationId);
    var list = state.elevators[stationId];
    if (!list || !list.length) return 'UNKNOWN';
    var down = list.filter(isDown).length;
    if (down === 0) return 'AVAILABLE';
    if (down === list.length) return 'UNAVAILABLE';
    return 'PARTIAL';
  }

  function getStatusLabel(status) {
    return STATUS_LABELS[status] || STATUS_LABELS.UNKNOWN;
  }

  // 상태 모양(Material Symbols 이름). 색만으로 구분하지 않도록 상태마다 모양을 달리한다. (REQ-DS-003)
  var STATUS_ICONS = {
    AVAILABLE: 'check_circle',
    PARTIAL: 'error',
    UNAVAILABLE: 'cancel',
    UNKNOWN: 'help'
  };
  function getStatusIcon(status) {
    return STATUS_ICONS[status] || STATUS_ICONS.UNKNOWN;
  }

  // ---------- 변경 ----------
  function toggleElevator(stationId, elevatorId) {
    ensureInit();
    if (liveOn()) return null; // 실데이터 모드에는 가상 고장 전환이 없다
    var list = state.elevators[stationId];
    if (!list) return null;
    var el = null;
    for (var i = 0; i < list.length; i++) if (list[i].id === elevatorId) el = list[i];
    if (!el) return null;
    if (el.status === 'AVAILABLE') {
      el.status = 'UNAVAILABLE';
      el.reason = '시연용 고장 전환';
    } else {
      el.status = 'AVAILABLE';
      el.reason = '';
    }
    notify(stationId);
    return el;
  }

  function setStationBroken(stationId, broken) {
    ensureInit();
    if (liveOn()) return;
    if (broken) {
      var list = state.elevators[stationId];
      if (!list || !list.length) {
        // 데이터 없는 역도 시연 가능하도록 가상 엘리베이터 1대 생성
        list = state.elevators[stationId] = [{
          id: stationId + '-e1', location: '역사 엘리베이터', type: 'exit',
          floors: '지상 ↔ 대합실', status: 'AVAILABLE', reason: ''
        }];
      }
      list.forEach(function (e) { e.status = 'UNAVAILABLE'; e.reason = '시연용 고장 전환'; });
    } else {
      if (original[stationId]) state.elevators[stationId] = deepCopy(original[stationId]);
      else delete state.elevators[stationId];
    }
    notify(stationId);
  }

  function reset() {
    ensureInit();
    if (liveOn()) return;
    state.elevators = deepCopy(original);
    notify(null);
  }

  // ---------- 실데이터(BE) 어댑터: API 모드에서만 쓴다 ----------
  // 지도 좌표·노선 모양은 FE 상수(MOCK)이고 상태는 전부 BE 값이다. 모르면 UNKNOWN이며 정상으로 채우지 않는다.
  var REFRESH_MS = 5 * 60 * 1000;
  var live = freshLive();
  var liveTimer = null;
  var liveSeq = 0;
  var liveFetch = null;

  function freshLive() {
    // phase: idle | loading | ready | error. status: slug → {status, dataFresh, total, unknown}
    return { phase: 'idle', status: {}, limitations: [], elevators: {}, error: null };
  }
  function liveOn() {
    var c = typeof window !== 'undefined' ? window.ApiClient : null;
    return !!(c && c.isApiMode && c.isApiMode());
  }
  function fopts() { return liveFetch ? { fetch: liveFetch } : undefined; }
  function liveStatus(slug) {
    if (live.phase !== 'ready') return 'UNKNOWN';
    var s = live.status[slug];
    return s && s.status ? s.status : 'UNKNOWN';
  }
  function normStatus(st) {
    var v = st && st.status;
    return (v === 'AVAILABLE' || v === 'PARTIAL' || v === 'UNAVAILABLE') ? v : null;
  }
  function stInfo(st) {
    return { status: normStatus(st), dataFresh: !!(st && st.data_fresh),
      total: (st && st.total_elevator_count) || 0, unknown: (st && st.unknown_elevator_count) || 0 };
  }
  var UNKNOWN_REASON_TEXT = { STALE: '상태 확인이 오래돼 지금 상태를 알 수 없어요', NO_DATA: '상태 정보가 없어요' };
  function mapElevator(e) {
    var st = e.status === '가동중' ? 'AVAILABLE' : (e.status === '가동 안됨' ? 'UNAVAILABLE' : 'UNKNOWN');
    // 설비 종류(출구/승강장)는 BE가 주지 않으므로 type을 만들지 않는다.
    return {
      id: 'be-' + e.elevator_id,
      location: e.location_description || e.elevator_name || '위치 정보 없음',
      name: e.elevator_name || '',
      floors: e.operation_section || '',
      status: st,
      unknownReason: st === 'UNKNOWN' ? (e.unknown_reason || 'NO_DATA') : null,
      reason: st === 'UNKNOWN' ? (UNKNOWN_REASON_TEXT[e.unknown_reason] || UNKNOWN_REASON_TEXT.NO_DATA) : '',
      fetchedAt: e.fetched_at || null
    };
  }

  // 역 상태 목록을 불러온다. 실패하면 이전 값을 지우고 전부 UNKNOWN으로 둔다(낡은 값을 새 값처럼 보이지 않게).
  async function loadStatuses() {
    var seq = ++liveSeq;
    if (live.phase !== 'ready') { live.phase = 'loading'; notify(null); }
    try {
      await window.StationIdMap.load(fopts());
      var data = await window.ApiClient.getJSON('be', '/api/stations/status', fopts());
      if (seq !== liveSeq) return;
      var map = {};
      (data.stations || []).forEach(function (b) {
        var slug = window.StationIdMap.toSlug(b.station_id);
        if (slug) map[slug] = stInfo(b.station_status);
      });
      live.status = map;
      live.limitations = data.limitations || [];
      live.error = null;
      live.phase = 'ready';
    } catch (err) {
      if (seq !== liveSeq) return;
      live.status = {}; live.elevators = {}; live.limitations = [];
      live.error = err; live.phase = 'error';
    }
    notify(null);
  }

  function startLive(o) {
    o = o || {};
    if (!liveOn()) return Promise.resolve();
    ensureInit();
    liveFetch = o.fetch || null;
    if (liveTimer && typeof clearInterval === 'function') clearInterval(liveTimer);
    var ms = o.refreshMs === undefined ? REFRESH_MS : o.refreshMs;
    liveTimer = (ms > 0 && typeof setInterval === 'function') ? setInterval(function () { refreshLive(); }, ms) : null;
    return loadStatuses();
  }
  function refreshLive() {
    if (!liveOn()) return Promise.resolve();
    var open = Object.keys(live.elevators);
    return loadStatuses().then(function () {
      if (live.phase !== 'ready') return;
      return Promise.all(open.map(function (slug) { return fetchStationElevators(slug); }));
    });
  }

  // 역을 열 때 호출. 설비 목록과 역 단위 한계(limitations)를 받는다.
  async function fetchStationElevators(slug) {
    if (!liveOn()) return;
    var beId = window.StationIdMap && window.StationIdMap.toBeId(slug);
    if (beId === undefined || beId === null) {
      live.elevators[slug] = { state: 'unmapped', list: [], limitations: [], fetchedAt: null };
      notify(slug);
      return;
    }
    var prev = live.elevators[slug];
    live.elevators[slug] = { state: 'loading', list: [], limitations: [], fetchedAt: null };
    if (!prev || prev.state !== 'ready') notify(slug);
    try {
      var d = await window.ApiClient.getJSON('be', '/api/stations/' + beId + '/elevators', fopts());
      if (live.phase === 'error') return; // 그 사이 상태 목록 갱신이 실패했으면 이 값도 버린다
      var list = (d.elevators || []).map(mapElevator);
      var times = list.map(function (e) { return e.fetchedAt; }).filter(Boolean).sort();
      live.elevators[slug] = { state: 'ready', list: list, limitations: d.limitations || [], fetchedAt: times.length ? times[times.length - 1] : null };
      if (live.phase === 'ready' && d.station_status) live.status[slug] = stInfo(d.station_status);
    } catch (err) {
      live.elevators[slug] = { state: 'error', list: [], limitations: [], fetchedAt: null, error: err };
    }
    notify(slug);
  }

  // phase: ready(목업 모드 포함) | loading | error
  function getLiveState() {
    return { live: liveOn(), phase: liveOn() ? (live.phase === 'idle' ? 'loading' : live.phase) : 'ready',
      error: live.error ? (live.error.code || 'ERROR') : null };
  }
  // idle | loading | ready | error | unmapped (목업 모드는 항상 ready)
  function getElevatorsState(slug) {
    if (!liveOn()) return 'ready';
    var le = live.elevators[slug];
    return le ? le.state : 'idle';
  }
  function getStationInfo(slug) {
    if (!liveOn()) return null;
    var s = live.phase === 'ready' ? live.status[slug] : null;
    return s ? { status: s.status || 'UNKNOWN', dataFresh: s.dataFresh, total: s.total, unknown: s.unknown } : null;
  }
  function getLimitations(slug) {
    var le = liveOn() ? live.elevators[slug] : null;
    return le && le.state === 'ready' ? le.limitations.slice() : [];
  }
  function getGlobalLimitations() { return liveOn() ? live.limitations.slice() : []; }
  // BE가 가져온 시각(ISO 문자열). slug가 없으면 불러온 역들 중 가장 최근 값. 없으면 null
  function getDataTime(slug) {
    if (!liveOn()) return null;
    if (slug) { var le = live.elevators[slug]; return le && le.state === 'ready' ? le.fetchedAt : null; }
    var all = Object.keys(live.elevators).map(function (k) { return live.elevators[k].fetchedAt; }).filter(Boolean).sort();
    return all.length ? all[all.length - 1] : null;
  }

  // 대체역(API). 반환 모양은 findAlternativeStation과 같다. 후보가 없으면 null.
  // BE id를 FE 역으로 바꾸지 못하면 station은 {id:null, name, unmapped:true}이며 path엔 출발역만 있다(지도에 못 그림).
  async function findAlternativeStationAsync(slug) {
    if (!liveOn()) return findAlternativeStation(slug);
    var beId = window.StationIdMap.toBeId(slug);
    if (beId === undefined || beId === null) return null;
    var d = await window.ApiClient.getJSON('be', '/api/stations/' + beId + '/alternatives', fopts());
    var origin = getStation(slug);
    var originLines = (origin && origin.lines) || [];
    var cands = (d.alternatives || []).map(function (a) {
      var altSlug = window.StationIdMap.toSlug(a.station_id);
      var lines = (a.lines || []).map(function (l) { return String(l.line_id); });
      var shared = lines.filter(function (l) { return originLines.indexOf(l) !== -1; });
      var station = altSlug ? getStation(altSlug) : null;
      return {
        station: station || { id: null, name: a.station_name, lines: lines, unmapped: true },
        stops: a.distance, path: station ? [slug, altSlug] : [slug],
        lineId: shared[0] || lines[0] || null, walkMinutes: null, tip: '',
        accessibilityStatus: 'UNCONFIRMED', source: 'BE',
        sameLine: !!a.same_line, stationStatus: normStatus(a.station_status) || 'UNKNOWN',
        dataFresh: !!(a.station_status && a.station_status.data_fresh)
      };
    });
    if (!cands.length) return null;
    var best = cands[0];
    best.candidates = cands;
    best.limitations = d.limitations || [];
    return best;
  }

  // ---------- 그래프 ----------
  function getNeighbors(stationId) {
    ensureInit();
    return (graph[stationId] || []).map(function (n) { return { id: n.id, lineId: n.lineId }; });
  }

  function findAlternativeStation(stationId) {
    ensureInit();
    var origin = getStation(stationId);
    if (!origin || !graph[stationId]) return null;
    var mock = M();
    var originLines = origin.lines || [];
    var tips = mock.alternativeTips || {};

    // BFS (출발역의 노선을 먼저 탐색하도록 이웃 정렬)
    var dist = {}, parent = {}, parentLine = {};
    dist[stationId] = 0;
    var queue = [stationId], order = [];
    while (queue.length) {
      var cur = queue.shift();
      var nbrs = (graph[cur] || []).slice().sort(function (a, b) {
        return (originLines.indexOf(a.lineId) === -1 ? 1 : 0) - (originLines.indexOf(b.lineId) === -1 ? 1 : 0);
      });
      nbrs.forEach(function (n) {
        if (dist[n.id] !== undefined) return;
        dist[n.id] = dist[cur] + 1;
        parent[n.id] = cur;
        parentLine[n.id] = n.lineId;
        queue.push(n.id);
        order.push(n.id);
      });
    }

    function sameLine(id) {
      var st = getStation(id);
      var ls = (st && st.lines) || [];
      for (var i = 0; i < ls.length; i++) if (originLines.indexOf(ls[i]) !== -1) return true;
      return false;
    }

    function pick(status) {
      var cands = order.filter(function (id) { return getStationStatus(id) === status; });
      if (!cands.length) return null;
      var minD = Math.min.apply(null, cands.map(function (id) { return dist[id]; }));
      cands = cands.filter(function (id) { return dist[id] === minD; });
      cands.sort(function (a, b) {
        var sa = sameLine(a) ? 0 : 1, sb = sameLine(b) ? 0 : 1;
        if (sa !== sb) return sa - sb;
        var ta = tips[stationId + '>' + a] ? 0 : 1, tb = tips[stationId + '>' + b] ? 0 : 1;
        if (ta !== tb) return ta - tb;
        return order.indexOf(a) - order.indexOf(b);
      });
      return cands[0];
    }

    var altId = pick('AVAILABLE') || pick('PARTIAL');
    if (!altId) return null;

    var path = [altId];
    var lineId = null;
    var p = altId;
    while (parent[p] !== undefined) {
      lineId = parentLine[p]; // 마지막 반복에서 출발역에서 나가는 첫 구간의 노선
      p = parent[p];
      path.unshift(p);
    }
    var stops = dist[altId];
    // 역별 상태와 위상 거리만 있는 후보는 실제 접근성 경로가 아니다.
    return { station: getStation(altId), stops: stops, path: path, lineId: lineId,
      walkMinutes: null, tip: '', accessibilityStatus: 'UNCONFIRMED', source: 'DEMO' };
  }

  // 경로별 근거 API 미연동. 협의용 계약: docs/accessible-route-api-proposal.md
  function getAccessibleRouteSnapshot() { return null; }

  function getOutages() {
    ensureInit();
    var out = [];
    if (liveOn()) {
      Object.keys(live.status).forEach(function (id) {
        var st = getStation(id), status = live.phase === 'ready' ? live.status[id].status : null;
        if (!st || (status !== 'PARTIAL' && status !== 'UNAVAILABLE')) return;
        var le = live.elevators[id];
        out.push({ station: st, status: status, broken: le && le.state === 'ready' ? le.list.filter(isDown) : [] });
      });
      out.sort(outageOrder);
      return out;
    }
    Object.keys(state.elevators).forEach(function (id) {
      var st = getStation(id);
      if (!st) return;
      var status = getStationStatus(id);
      if (status !== 'PARTIAL' && status !== 'UNAVAILABLE') return;
      out.push({ station: st, status: status, broken: state.elevators[id].filter(isDown) });
    });
    out.sort(outageOrder);
    return out;
  }
  function outageOrder(a, b) {
    var ra = a.status === 'UNAVAILABLE' ? 0 : 1, rb = b.status === 'UNAVAILABLE' ? 0 : 1;
    if (ra !== rb) return ra - rb;
    return String(a.station.name).localeCompare(String(b.station.name), 'ko');
  }

  function subscribe(fn) {
    if (typeof fn !== 'function') return function () {};
    listeners.push(fn);
    return function () {
      var i = listeners.indexOf(fn);
      if (i !== -1) listeners.splice(i, 1);
    };
  }

  window.ElevatorService = {
    getStation: getStation,
    getAllStations: getAllStations,
    findStationByName: findStationByName,
    findStationsInText: findStationsInText,
    getLine: getLine,
    getElevators: getElevators,
    sortForDisplay: sortForDisplay,
    hasElevatorData: hasElevatorData,
    getStationStatus: getStationStatus,
    getStatusLabel: getStatusLabel,
    getStatusIcon: getStatusIcon,
    toggleElevator: toggleElevator,
    setStationBroken: setStationBroken,
    reset: reset,
    getNeighbors: getNeighbors,
    findAlternativeStation: findAlternativeStation,
    findAlternativeStationAsync: findAlternativeStationAsync,
    startLive: startLive,
    refreshLive: refreshLive,
    fetchStationElevators: fetchStationElevators,
    isLive: liveOn,
    getLiveState: getLiveState,
    getElevatorsState: getElevatorsState,
    getStationInfo: getStationInfo,
    getLimitations: getLimitations,
    getGlobalLimitations: getGlobalLimitations,
    getDataTime: getDataTime,
    getAccessibleRouteSnapshot: getAccessibleRouteSnapshot,
    getOutages: getOutages,
    subscribe: subscribe
  };
})();
