/* ElevatorService — 역/노선/엘리베이터 상태 관리 (DOM 접근 없음)
 * 계약: docs/cards/003-interface-contract.md §2
 */
(function () {
  'use strict';

  var STATUS_LABELS = {
    AVAILABLE: '정상 운행',
    PARTIAL: '일부 이용 불가',
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
    return state.elevators[stationId] || [];
  }

  function hasElevatorData(stationId) {
    ensureInit();
    var e = state.elevators[stationId];
    return !!(e && e.length);
  }

  function isDown(e) { return e.status !== 'AVAILABLE'; }

  function getStationStatus(stationId) {
    ensureInit();
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

  // ---------- 변경 ----------
  function toggleElevator(stationId, elevatorId) {
    ensureInit();
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
    state.elevators = deepCopy(original);
    notify(null);
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
    // 레거시 위상 후보일 뿐, 방향·승강장·환승·출구 접근성을 증명하지 않는다.
    // 고정 도보 시간이나 정적 버스 안내를 안전한 추천으로 생성하지 않는다.
    return { station: getStation(altId), stops: stops, path: path, lineId: lineId,
      walkMinutes: null, tip: '', accessibilityStatus: 'UNCONFIRMED', source: 'DEMO' };
  }

  // 현재 프로토타입에는 경로별 근거 API가 연결되어 있지 않다.
  // docs/accessible-route-api-proposal.md의 계약을 제공하는 어댑터로 교체할 지점이다.
  function getAccessibleRouteSnapshot() { return null; }

  function getOutages() {
    ensureInit();
    var out = [];
    Object.keys(state.elevators).forEach(function (id) {
      var st = getStation(id);
      if (!st) return;
      var status = getStationStatus(id);
      if (status !== 'PARTIAL' && status !== 'UNAVAILABLE') return;
      out.push({ station: st, status: status, broken: state.elevators[id].filter(isDown) });
    });
    out.sort(function (a, b) {
      var ra = a.status === 'UNAVAILABLE' ? 0 : 1, rb = b.status === 'UNAVAILABLE' ? 0 : 1;
      if (ra !== rb) return ra - rb;
      return String(a.station.name).localeCompare(String(b.station.name), 'ko');
    });
    return out;
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
    hasElevatorData: hasElevatorData,
    getStationStatus: getStationStatus,
    getStatusLabel: getStatusLabel,
    toggleElevator: toggleElevator,
    setStationBroken: setStationBroken,
    reset: reset,
    getNeighbors: getNeighbors,
    findAlternativeStation: findAlternativeStation,
    getAccessibleRouteSnapshot: getAccessibleRouteSnapshot,
    getOutages: getOutages,
    subscribe: subscribe
  };
})();
