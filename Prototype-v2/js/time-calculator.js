/* TimeCalculator — 경로 탐색 + 출발 시각 역산 (DOM 접근 없음)
 * 계약: docs/cards/003-interface-contract.md §3
 */
(function () {
  'use strict';

  var DAY = 1440;
  var graph = null;   // { stationId: [{ id, lineId, track }] }  track = lineId#segIndex
  var trackIndex = null; // { track: { stationId: index } }

  function M() {
    return (typeof window !== 'undefined' && window.MOCK) ? window.MOCK : {};
  }
  function ES() {
    return (typeof window !== 'undefined' && window.ElevatorService) ? window.ElevatorService : null;
  }
  function timing() {
    var t = M().timing || {};
    return {
      minutesPerStop: num(t.minutesPerStop, 2),
      transferMinutes: num(t.transferMinutes, 5),
      walkToStation: num(t.walkToStation, 7),
      stationEntry: num(t.stationEntry, 3),
      exitWalk: num(t.exitWalk, 3),
      walkPerStopMinutes: num(t.walkPerStopMinutes, 12)
    };
  }
  function num(v, d) { return typeof v === 'number' && isFinite(v) ? v : d; }

  function headway(lineId) {
    var h = (M().headways || {})[lineId];
    return typeof h === 'number' && h > 0 ? h : 6;
  }

  function station(id) { return (M().stations || {})[id] || null; }
  function stationName(id) { var s = station(id); return s ? s.name : id; }
  function stationLabel(id) {
    var n = stationName(id) || '';
    return n.charAt(n.length - 1) === '역' ? n : n + '역';
  }
  function lineName(lineId) {
    var l = (M().lines || {})[lineId];
    return l ? l.name : lineId + '호선';
  }

  // ---------- 시간 유틸 ----------
  function toMin(hhmm) {
    if (typeof hhmm === 'number') return hhmm;
    var m = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm || '').trim());
    if (!m) return null;
    return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
  }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function fmt(min) {
    var m = ((Math.round(min) % DAY) + DAY) % DAY;
    return pad(Math.floor(m / 60)) + ':' + pad(m % 60);
  }
  function formatTime(date) {
    if (typeof date === 'number') return fmt(date);
    var d = date instanceof Date ? date : new Date();
    return pad(d.getHours()) + ':' + pad(d.getMinutes());
  }
  function addMinutes(hhmm, n) {
    var b = toMin(hhmm);
    if (b == null) return null;
    return fmt(b + (Number(n) || 0));
  }

  // ---------- 화면 표기 (REQ-DS-009) ----------
  // 계산과 데이터 안의 시각은 HH:MM. 화면에 보여 줄 때만 "오후 8:53"으로 바꾼다.
  // 시각을 화면 표기로 바꾸는 함수는 여기에만 둔다.
  function displayParts(hhmm) {
    var m = toMin(hhmm);
    if (m == null) return null;
    m = ((Math.round(m) % DAY) + DAY) % DAY;
    var h = Math.floor(m / 60);
    return { ampm: h < 12 ? '오전' : '오후', time: ((h % 12) || 12) + ':' + pad(m % 60) };
  }
  function displayTime(hhmm) {
    var p = displayParts(hhmm);
    return p ? p.ampm + ' ' + p.time : (hhmm == null ? '' : String(hhmm));
  }
  // 글 속의 HH:MM을 모두 바꾼다. 예: "정기 점검 (10:00~15:00)" → "정기 점검 (오전 10:00~오후 3:00)"
  function displayTimesInText(text) {
    return String(text == null ? '' : text).replace(/(^|[^\d:])(\d{1,2}:\d{2})(?![\d:])/g, function (all, pre, t) {
      return pre + displayTime(t);
    });
  }

  // ---------- 그래프 ----------
  function ensureGraph() {
    if (graph) return;
    graph = {};
    trackIndex = {};
    var seen = {};
    function add(a, b, lineId, track) {
      if (!a || !b || a === b) return;
      var k = a + '|' + b + '|' + track;
      if (seen[k]) return;
      seen[k] = true;
      (graph[a] = graph[a] || []).push({ id: b, lineId: lineId, track: track });
    }
    var lines = M().lines || {};
    Object.keys(lines).forEach(function (lid) {
      var line = lines[lid];
      var id = line.id || lid;
      (line.segments || []).forEach(function (seg, si) {
        var track = id + '#' + si;
        var idx = trackIndex[track] = {};
        seg.forEach(function (s, i) { if (idx[s] === undefined) idx[s] = i; });
        for (var i = 0; i + 1 < seg.length; i++) {
          add(seg[i], seg[i + 1], id, track);
          add(seg[i + 1], seg[i], id, track);
        }
        if (si === 0 && line.loop && seg.length > 2) {
          add(seg[seg.length - 1], seg[0], id, track);
          add(seg[0], seg[seg.length - 1], id, track);
        }
      });
    });
  }

  // 간단한 이진 힙
  function Heap() { this.a = []; }
  Heap.prototype.push = function (x) {
    var a = this.a; a.push(x);
    var i = a.length - 1;
    while (i > 0) {
      var p = (i - 1) >> 1;
      if (a[p].cost <= a[i].cost) break;
      var t = a[p]; a[p] = a[i]; a[i] = t; i = p;
    }
  };
  Heap.prototype.pop = function () {
    var a = this.a;
    if (!a.length) return null;
    var top = a[0], last = a.pop();
    if (a.length) {
      a[0] = last;
      var i = 0;
      for (;;) {
        var l = 2 * i + 1, r = l + 1, m = i;
        if (l < a.length && a[l].cost < a[m].cost) m = l;
        if (r < a.length && a[r].cost < a[m].cost) m = r;
        if (m === i) break;
        var t = a[m]; a[m] = a[i]; a[i] = t; i = m;
      }
    }
    return top;
  };

  function findRoute(originId, destId) {
    ensureGraph();
    if (!originId || !destId || originId === destId) return null;
    if (!graph[originId] || !graph[destId]) return null;
    var T = timing();
    var startKey = originId + '@';
    var best = {}, prev = {};
    best[startKey] = 0;
    var heap = new Heap();
    heap.push({ cost: 0, sid: originId, track: null, lineId: null, key: startKey });
    var endKey = null;
    while (true) {
      var cur = heap.pop();
      if (!cur) break;
      if (cur.cost > best[cur.key]) continue;
      if (cur.sid === destId) { endKey = cur.key; break; }
      var nbrs = graph[cur.sid] || [];
      for (var i = 0; i < nbrs.length; i++) {
        var e = nbrs[i];
        var c = cur.cost + T.minutesPerStop + (cur.track && cur.track !== e.track ? T.transferMinutes : 0);
        var k = e.id + '@' + e.track;
        if (best[k] === undefined || c < best[k]) {
          best[k] = c;
          prev[k] = { key: cur.key, sid: cur.sid, lineId: e.lineId, track: e.track };
          heap.push({ cost: c, sid: e.id, track: e.track, lineId: e.lineId, key: k });
        }
      }
    }
    if (!endKey) return null;

    // 역추적 → edges
    var edges = [];
    var k2 = endKey;
    while (prev[k2]) {
      var p = prev[k2];
      edges.unshift({ from: p.sid, to: k2.split('@')[0], lineId: p.lineId, track: p.track });
      k2 = p.key;
    }
    var path = [originId];
    edges.forEach(function (e) { path.push(e.to); });

    var legs = [];
    edges.forEach(function (e) {
      var last = legs[legs.length - 1];
      if (last && last.track === e.track) {
        last.to = e.to; last.stops += 1; last.stations.push(e.to);
      } else {
        legs.push({ lineId: e.lineId, from: e.from, to: e.to, stops: 1, track: e.track, stations: [e.from, e.to] });
      }
    });
    var stops = edges.length;
    return {
      path: path,
      legs: legs,
      stops: stops,
      transfers: Math.max(0, legs.length - 1),
      rideMinutes: stops * T.minutesPerStop
    };
  }

  // ---------- 열차 시간표 (격자 모델) ----------
  function serviceParams(stationId, track, lineId) {
    ensureGraph();
    var T = timing();
    var idx = (trackIndex[track] && trackIndex[track][stationId]) || 0;
    var first = toMin(M().firstTrain || '05:30');
    var last = toMin(M().lastTrain || '24:00');
    if (first == null) first = 330;
    if (last == null) last = DAY;
    if (last <= first) last += DAY;
    return { offset: first + idx * T.minutesPerStop, lastOffset: last + idx * T.minutesPerStop, h: headway(lineId) };
  }

  // t 이후(포함) 가장 빠른 열차 출발 시각 (분, 자정 넘으면 DAY 이상)
  function nextDeparture(sp, t) {
    var day0 = Math.floor(t / DAY) * DAY;
    for (var d = day0 - DAY; d <= day0 + DAY; d += DAY) {
      var base = d + sp.offset, last = d + sp.lastOffset;
      if (t > last) continue;
      if (t <= base) return base;
      var dep = base + Math.ceil((t - base) / sp.h) * sp.h;
      if (dep <= last) return dep;
    }
    return day0 + DAY + sp.offset;
  }

  // t 이전(포함) 가장 늦은 열차 출발 시각
  function prevDeparture(sp, t) {
    var day0 = Math.floor(t / DAY) * DAY;
    for (var d = day0 + DAY; d >= day0 - DAY; d -= DAY) {
      var base = d + sp.offset, last = d + sp.lastOffset;
      if (t < base) continue;
      var lim = Math.min(t, last);
      return base + Math.floor((lim - base) / sp.h) * sp.h;
    }
    return null;
  }

  // 탑승 시각부터 출구 도착까지 (고정 소요)
  function afterBoarding(route, boardAt) {
    var T = timing();
    var events = [];
    var t = boardAt, transfer = 0, ride = 0;
    route.legs.forEach(function (leg, i) {
      if (i > 0) {
        var tw = T.transferMinutes + Math.round(headway(leg.lineId) / 2);
        events.push({ time: t, label: '환승 (' + stationName(leg.from) + ', ' + lineName(leg.lineId) + ')', icon: 'sync_alt', elevStation: leg.from });
        t += tw; transfer += tw;
        events.push({ time: t, label: lineName(leg.lineId) + ' 탑승 (' + stationName(leg.from) + ')', icon: 'subway' });
      }
      var r = leg.stops * T.minutesPerStop;
      t += r; ride += r;
    });
    var arriveTrain = t;
    events.push({ time: arriveTrain, label: stationLabel(route.legs[route.legs.length - 1].to) + ' 하차', icon: 'flag' });
    t += T.exitWalk;
    events.push({ time: t, label: stationLabel(route.legs[route.legs.length - 1].to) + ' 출구 도착', icon: 'door_front', elevStation: route.legs[route.legs.length - 1].to });
    return { events: events, ride: ride, transfer: transfer, arriveAt: t };
  }

  function nowMinutes(now) {
    var d = now instanceof Date && !isNaN(now.getTime()) ? now : new Date();
    return d.getHours() * 60 + d.getMinutes();
  }

  function calculateDeparture(opts) {
    opts = opts || {};
    var originId = opts.originId, destId = opts.destId;
    var route = findRoute(originId, destId);
    if (!route) return null;
    var T = timing();
    var nowMin = nowMinutes(opts.now);
    var first = route.legs[0];
    var sp = serviceParams(originId, first.track, first.lineId);
    var pre = T.walkToStation + T.stationEntry;

    function forward(leaveMin) {
      var platform = leaveMin + pre;
      var board = nextDeparture(sp, platform);
      var wait = board - platform;
      // 첫차 전 등 대기가 길면 그냥 늦게 출발하도록 조정
      if (wait > 30) { leaveMin = board - pre; wait = 0; }
      return { leave: leaveMin, board: board, wait: wait, after: afterBoarding(route, board) };
    }

    var plan = null, late = false, arriveByMin = null;
    if (opts.arriveBy) {
      arriveByMin = toMin(opts.arriveBy);
      if (arriveByMin == null) {
        var parsed = parseKoreanTime(opts.arriveBy, opts.now);
        arriveByMin = parsed ? toMin(parsed) : null;
      }
    }

    if (arriveByMin != null) {
      // 이미 12시간 이상 지난 시각이면 내일로 해석 (예: 23시에 "08:00")
      if (arriveByMin < nowMin && nowMin - arriveByMin > 12 * 60) arriveByMin += DAY;
      var probe = afterBoarding(route, 0);
      var fixed = probe.arriveAt; // 탑승 → 출구 소요
      var board = prevDeparture(sp, arriveByMin - fixed);
      if (board != null && board - pre >= nowMin) {
        plan = { leave: board - pre, board: board, wait: 0, after: afterBoarding(route, board) };
      } else {
        late = true;
        plan = forward(nowMin);
      }
      if (plan.after.arriveAt > arriveByMin) late = true;
    } else {
      plan = forward(nowMin);
    }

    var timeline = [
      { time: fmt(plan.leave), label: '집에서 출발', icon: 'accessible' },
      { time: fmt(plan.leave + T.walkToStation), label: stationLabel(originId) + ' 도착 · 엘리베이터 이용', icon: 'elevator', elevStation: originId },
      { time: fmt(plan.board), label: lineName(first.lineId) + ' 탑승 (' + stationName(originId) + ')', icon: 'subway' }
    ];
    plan.after.events.forEach(function (ev) {
      timeline.push({ time: fmt(ev.time), label: ev.label, icon: ev.icon, elevStation: ev.elevStation }); // 엘리베이터를 쓰는 역 (REQ-TIME-004)
    });

    // 엘리베이터 경고
    var warnings = [];
    var es = ES();
    if (es) {
      var checks = [{ id: originId, role: 'origin' }];
      route.legs.slice(1).forEach(function (leg) { checks.push({ id: leg.from, role: 'transfer' }); });
      checks.push({ id: destId, role: 'dest' });
      var seenW = {};
      checks.forEach(function (c) {
        if (seenW[c.id]) return;
        seenW[c.id] = true;
        var st = es.getStationStatus(c.id);
        if (st === 'PARTIAL' || st === 'UNAVAILABLE') {
          warnings.push({ stationId: c.id, status: st, role: c.role, alternative: es.findAlternativeStation(c.id) });
        }
      });
    }

    return {
      leaveAt: fmt(plan.leave),
      boardAt: fmt(plan.board),
      arriveAt: fmt(plan.after.arriveAt),
      minutesFromNow: plan.leave - nowMin,
      late: late,
      lateByMinutes: (late && arriveByMin != null) ? Math.max(0, plan.after.arriveAt - arriveByMin) : 0,
      arriveBy: arriveByMin != null ? fmt(arriveByMin) : null,
      route: route,
      breakdown: {
        walk: T.walkToStation,
        entry: T.stationEntry,
        wait: plan.wait,
        ride: plan.after.ride,
        transfer: plan.after.transfer,
        exitWalk: T.exitWalk
      },
      timeline: timeline,
      elevatorWarnings: warnings
    };
  }

  // ---------- 한국어 시각 파싱 ----------
  var KNUM = { '열한': 11, '열두': 12, '한': 1, '두': 2, '세': 3, '네': 4, '다섯': 5, '여섯': 6, '일곱': 7, '여덟': 8, '아홉': 9, '열': 10 };

  function parseKoreanTime(text, now) {
    if (text == null) return null;
    var s = String(text);
    var mm;

    // 상대 시각: "30분 후", "1시간 30분 뒤", "한 시간 뒤"
    s = s.replace(/(한|두|세)\s*시간/g, function (_, k) { return KNUM[k] + '시간'; });
    var rel = /(\d+)\s*시간\s*(?:(\d+)\s*분)?\s*(?:후|뒤)/.exec(s) || null;
    if (rel) return fmt(nowMinutes(now) + parseInt(rel[1], 10) * 60 + (rel[2] ? parseInt(rel[2], 10) : 0));
    rel = /(\d+)\s*분\s*(?:후|뒤)/.exec(s);
    if (rel) return fmt(nowMinutes(now) + parseInt(rel[1], 10));

    if (/정오/.test(s)) return '12:00';
    if (/자정/.test(s)) return '00:00';

    // 한글 숫자 시 → 숫자
    s = s.replace(/(열한|열두|다섯|여섯|일곱|여덟|아홉|한|두|세|네|열)\s*시(?![간점작])/g, function (_, k) { return KNUM[k] + '시'; });

    var am = /(오전|아침|새벽|am|a\.m\.)/i.test(s);
    var pm = /(오후|저녁|밤|낮|pm|p\.m\.)/i.test(s);

    var h = null, m = 0, explicit24 = false;
    if ((mm = /(\d{1,2})\s*:\s*(\d{2})/.exec(s))) {
      h = parseInt(mm[1], 10); m = parseInt(mm[2], 10);
      explicit24 = mm[1].charAt(0) === '0' || h > 12; // "03:00"/"15:00"은 24시간제로 그대로
    } else if ((mm = /(\d{1,2})\s*시(?!간)\s*(?:(\d{1,2})\s*분|(반))?/.exec(s))) {
      h = parseInt(mm[1], 10);
      if (mm[2]) m = parseInt(mm[2], 10);
      else if (mm[3]) m = 30;
    } else {
      return null;
    }
    if (isNaN(h) || isNaN(m) || h > 24 || m > 59) return null;
    if (h === 24) h = 0;

    if (pm && !am) {
      if (h < 12) h += 12;
      else if (h === 12 && /밤/.test(s)) h = 0; // "밤 12시" = 자정
    } else if (am && !pm) {
      if (h === 12) h = 0;
    } else if (!explicit24 && h >= 1 && h <= 6) {
      h += 12; // 오전/오후 없고 1~6시 → 오후
    }
    return pad(h) + ':' + pad(m);
  }

  window.TimeCalculator = {
    findRoute: findRoute,
    calculateDeparture: calculateDeparture,
    parseKoreanTime: parseKoreanTime,
    formatTime: formatTime,
    addMinutes: addMinutes,
    displayParts: displayParts,
    displayTime: displayTime,
    displayTimesInText: displayTimesInText
  };
})();
