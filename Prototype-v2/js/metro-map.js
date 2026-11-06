/* ==========================================================================
   metro-map.js — window.MetroMap
   SVG 노선도 렌더링 + 팬/줌/핀치 + 엘리베이터 상태 뱃지 + 우회 경로 하이라이트
   의존: window.MOCK (데이터), window.ElevatorService (상태)  — 로드 시 DOM 접근 없음
   좌표: SVG 사용자 단위 = 컨테이너 CSS px. <g class="viewport"> 에
         translate(tx,ty) scale(k) 를 적용 (k = fitScale × zoom, 지도 단위 → px).
         역/마커는 translate(x,y) scale(f/k) 로그룹 단위를 "화면 px × f" 로 고정해
         줌을 해도 크기가 완만하게만 변하도록 한다.
   ========================================================================== */
(function () {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';
  var MIN_ZOOM = 0.5;
  var MAX_ZOOM = 6;
  var TAP_SLOP = 6;          // px — 이 이하로 움직이면 탭
  var LABEL_K = 0.45;        // 배율(px/지도 단위)이 이보다 작으면 일반역 라벨 숨김 (홈 뷰에서는 환승역 라벨만)
  var LABEL_RELAYOUT = 0.04; // 배율이 이 비율(로그) 이상 바뀌면 라벨 겹침 재계산
  var FOCUS_ZOOM = 2.4;
  var FOCUS_Y = 0.27;        // 바텀시트(최대 높이 52%)를 피해 상단 27% 지점에 역을 둔다
  var SHEET_TOP = 0.44;      // 하이라이트 fit 시 사용할 컨테이너 상단 영역 비율
  var FILTER_H = 52;         // 상단 노선 필터 칩 높이(px)
  var ANIM_MS = 350;
  var LABEL_PX = 11;
  var CORNER = 22;           // 노선 모서리 라운딩(지도 단위)

  var S = null;              // 런타임 상태 (init 후 생성)

  /* ---------------- utils ---------------- */
  function el(tag, attrs, parent) {
    var n = document.createElementNS(NS, tag);
    if (attrs) {
      for (var k in attrs) {
        if (Object.prototype.hasOwnProperty.call(attrs, k) && attrs[k] != null) n.setAttribute(k, String(attrs[k]));
      }
    }
    if (parent) parent.appendChild(n);
    return n;
  }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function r2(v) { return Math.round(v * 100) / 100; }
  function r5(v) { return Math.round(v * 100000) / 100000; }
  function mock() { return window.MOCK || {}; }
  function svc() { return window.ElevatorService || null; }

  function getStation(id) {
    var s = svc();
    if (s && typeof s.getStation === 'function') {
      try { var st = s.getStation(id); if (st) return st; } catch (e) { /* ignore */ }
    }
    var m = mock();
    return (m.stations && m.stations[id]) || null;
  }
  function getLine(id) {
    var s = svc();
    if (s && typeof s.getLine === 'function') {
      try { var ln = s.getLine(id); if (ln) return ln; } catch (e) { /* ignore */ }
    }
    var m = mock();
    return (m.lines && m.lines[id]) || null;
  }
  function stationStatus(id) {
    var s = svc();
    if (!s) return 'UNKNOWN';
    try {
      if (typeof s.hasElevatorData === 'function' && !s.hasElevatorData(id)) return 'UNKNOWN';
      return typeof s.getStationStatus === 'function' ? (s.getStationStatus(id) || 'UNKNOWN') : 'UNKNOWN';
    } catch (e) { return 'UNKNOWN'; }
  }
  var STATUS_CLASS = { AVAILABLE: 'ok', PARTIAL: 'warn', UNAVAILABLE: 'bad' };

  // 줌에 따른 심볼 크기 배율 (화면 px 기준). 줌 1 → .75, 2.4 → ~1.03, 상한 1.25
  function sizeFactor(zoom) { return clamp(0.55 + 0.2 * zoom, 0.7, 1.25); }

  /* ---------------- geometry ---------------- */
  function dedupe(pts) {
    var out = [];
    for (var i = 0; i < pts.length; i++) {
      var p = pts[i], q = out[out.length - 1];
      if (!q || q.x !== p.x || q.y !== p.y) out.push(p);
    }
    return out;
  }

  // 꼭짓점을 2차 베지어로 둥글린 폴리라인
  function roundedPath(points, closed, radius) {
    var pts = dedupe(points);
    if (closed && pts.length > 2) {
      var a0 = pts[0], z0 = pts[pts.length - 1];
      if (a0.x === z0.x && a0.y === z0.y) pts.pop();
    }
    var n = pts.length;
    if (n < 2) return '';
    if (n === 2) return 'M' + r2(pts[0].x) + ' ' + r2(pts[0].y) + 'L' + r2(pts[1].x) + ' ' + r2(pts[1].y) + (closed ? 'Z' : '');

    function corner(a, b, c) {
      var d1 = Math.hypot(a.x - b.x, a.y - b.y) || 1;
      var d2 = Math.hypot(c.x - b.x, c.y - b.y) || 1;
      var r = Math.min(radius, d1 / 2, d2 / 2);
      var p1x = b.x + (a.x - b.x) * (r / d1), p1y = b.y + (a.y - b.y) * (r / d1);
      var p2x = b.x + (c.x - b.x) * (r / d2), p2y = b.y + (c.y - b.y) * (r / d2);
      return 'L' + r2(p1x) + ' ' + r2(p1y) + 'Q' + r2(b.x) + ' ' + r2(b.y) + ' ' + r2(p2x) + ' ' + r2(p2y);
    }

    var d, i;
    if (closed) {
      var sx = (pts[n - 1].x + pts[0].x) / 2, sy = (pts[n - 1].y + pts[0].y) / 2;
      d = 'M' + r2(sx) + ' ' + r2(sy);
      for (i = 0; i < n; i++) d += corner(pts[(i - 1 + n) % n], pts[i], pts[(i + 1) % n]);
      d += 'Z';
    } else {
      d = 'M' + r2(pts[0].x) + ' ' + r2(pts[0].y);
      for (i = 1; i < n - 1; i++) d += corner(pts[i - 1], pts[i], pts[i + 1]);
      d += 'L' + r2(pts[n - 1].x) + ' ' + r2(pts[n - 1].y);
    }
    return d;
  }

  function bbox(ids) {
    var x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity, c = 0;
    for (var i = 0; i < ids.length; i++) {
      var st = getStation(ids[i]);
      if (!st || typeof st.x !== 'number') continue;
      c++;
      if (st.x < x0) x0 = st.x; if (st.x > x1) x1 = st.x;
      if (st.y < y0) y0 = st.y; if (st.y > y1) y1 = st.y;
    }
    return c ? { x0: x0, y0: y0, x1: x1, y1: y1, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, w: x1 - x0, h: y1 - y0 } : null;
  }

  /* ---------------- view math ---------------- */
  function curK() { return S.fit * S.zoom; }
  function curT() {
    var k = curK();
    return { k: k, tx: S.cw / 2 - k * S.cx, ty: S.ch / 2 - k * S.cy };
  }
  function clampCenter() {
    S.cx = clamp(S.cx, -0.05 * S.W, 1.05 * S.W);
    S.cy = clamp(S.cy, -0.05 * S.H, 1.05 * S.H);
  }
  function measure() {
    var r = S.container.getBoundingClientRect();
    S.hasSize = r.width > 0 && r.height > 0;
    if (S.hasSize) { S.cw = r.width; S.ch = r.height; }
    else if (!S.cw) { S.cw = 390; S.ch = 600; }
    S.fit = Math.min((S.cw - 24) / S.W, (S.ch - 24) / S.H);
    if (!(S.fit > 0)) S.fit = 0.2;
  }
  // 화면점 (sx,sy)에 지도점 (mx,my)가 오도록 하는 center 계산
  function centerFor(mx, my, sx, sy, zoom) {
    var k = S.fit * zoom;
    return { zoom: zoom, cx: mx - (sx - S.cw / 2) / k, cy: my - (sy - S.ch / 2) / k };
  }

  function homeView() {
    var ln = getLine('2');
    var ids = ln && ln.segments && ln.segments[0] ? ln.segments[0] : Object.keys(mock().stations || {});
    var b = bbox(ids);
    if (!b) return { zoom: 1, cx: S.W / 2, cy: S.H / 2 };
    var availW = S.cw - 28, availH = S.ch - FILTER_H - 40;
    var k = Math.min(availW / Math.max(b.w, 1), availH / Math.max(b.h, 1));
    var zoom = clamp(k / S.fit, 1, 3.5);
    return centerFor(b.cx, b.cy, S.cw / 2, FILTER_H + (S.ch - FILTER_H) / 2, zoom);
  }
  function allView() { return { zoom: 1, cx: S.W / 2, cy: S.H / 2 }; }

  /* ---------------- render ---------------- */
  function scheduleRender() {
    if (!S || S.raf) return;
    S.raf = requestAnimationFrame(render);
  }

  function render() {
    if (!S) return;
    if (S.raf) { cancelAnimationFrame(S.raf); S.raf = 0; }
    clampCenter();
    var t = curT();
    S.viewport.setAttribute('transform', 'translate(' + r2(t.tx) + ',' + r2(t.ty) + ') scale(' + r5(t.k) + ')');

    var f = sizeFactor(S.zoom);
    if (t.k !== S.lastK || f !== S.lastF) {
      S.lastK = t.k;
      var u = r5(f / t.k), i, it;
      for (i = 0; i < S.scaled.length; i++) {
        it = S.scaled[i];
        it.g.setAttribute('transform', 'translate(' + it.x + ',' + it.y + ') scale(' + u + ')');
      }
      for (i = 0; i < S.markers.length; i++) {
        it = S.markers[i];
        it.g.setAttribute('transform', 'translate(' + it.x + ',' + it.y + ') scale(' + u + ')');
      }
      var lw = 6.5 * f;
      var lineW = r5(lw / t.k), haloW = r5((lw + 4) / t.k);
      for (i = 0; i < S.linePaths.length; i++) S.linePaths[i].setAttribute('stroke-width', lineW);
      for (i = 0; i < S.haloPaths.length; i++) S.haloPaths[i].setAttribute('stroke-width', haloW);
      updateRouteStroke(t.k, f);
    }
    if (!S.labelK || Math.abs(Math.log(t.k / S.labelK)) > LABEL_RELAYOUT) layoutLabels();
    if (f !== S.lastF) {
      S.lastF = f;
      var fs = r5(LABEL_PX / f);
      S.layers.stations.setAttribute('font-size', fs);
      S.layers.markers.setAttribute('font-size', fs);
    }
  }

  function updateRouteStroke(k, f) {
    if (!S.route) return;
    var w = 5 * f, dash = 10, gap = 8;
    S.route.halo.setAttribute('stroke-width', r5((w + 5) / k));
    S.route.path.setAttribute('stroke-width', r5(w / k));
    S.route.path.setAttribute('stroke-dasharray', r5(dash / k) + ' ' + r5(gap / k));
    S.route.path.style.setProperty('--dash-period', String(r5((dash + gap) / k)));
  }

  /* ---------------- animation ---------------- */
  function cancelAnim() {
    if (S && S.anim) { cancelAnimationFrame(S.anim); S.anim = 0; }
  }
  function setView(v) {
    S.zoom = clamp(v.zoom, MIN_ZOOM, MAX_ZOOM);
    S.cx = v.cx; S.cy = v.cy;
    clampCenter();
  }
  function animateTo(target, ms) {
    cancelAnim();
    var tz = clamp(target.zoom, MIN_ZOOM, MAX_ZOOM);
    var z0 = S.zoom, x0 = S.cx, y0 = S.cy;
    var dur = ms == null ? ANIM_MS : ms;
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (dur <= 0 || reduce) { setView({ zoom: tz, cx: target.cx, cy: target.cy }); render(); return; }
    var lz0 = Math.log(z0), lz1 = Math.log(tz);
    var start = performance.now();
    function step(now) {
      var p = clamp((now - start) / dur, 0, 1);
      var e = 1 - Math.pow(1 - p, 3);
      S.zoom = Math.exp(lz0 + (lz1 - lz0) * e);
      S.cx = x0 + (target.cx - x0) * e;
      S.cy = y0 + (target.cy - y0) * e;
      render();
      S.anim = p < 1 ? requestAnimationFrame(step) : 0;
    }
    S.anim = requestAnimationFrame(step);
  }

  function zoomAt(px, py, factor) {
    var t = curT();
    var mx = (px - t.tx) / t.k, my = (py - t.ty) / t.k;
    var z2 = clamp(S.zoom * factor, MIN_ZOOM, MAX_ZOOM);
    var v = centerFor(mx, my, px, py, z2);
    S.zoom = z2; S.cx = v.cx; S.cy = v.cy;
    scheduleRender();
  }
  function panBy(dx, dy) {
    var k = curK();
    S.cx -= dx / k; S.cy -= dy / k;
    scheduleRender();
  }

  /* ---------------- build ---------------- */
  // 한강: 원본 노선도의 한강 윤곽(MOCK.river.d)을 그대로 그린다. (REQ-MAP-001)
  function buildRiver(parent) {
    var river = mock().river;
    if (!river || !river.d) return;
    var g = el('g', { 'class': 'river', 'aria-hidden': 'true' }, parent);
    el('path', { 'class': 'river-shape', d: river.d }, g);
    if (river.label) {
      el('text', { 'class': 'river-label', x: river.label.x, y: river.label.y, 'text-anchor': 'middle' }, g).textContent = '한강';
    }
  }

  // 노선 모양: ln.paths(원본 노선도에서 추출한 path)가 있으면 그것을 쓰고,
  // 없으면 역 좌표를 이어 그린다.
  function linePathData(ln) {
    if (Array.isArray(ln.paths) && ln.paths.length) return ln.paths.slice();
    var out = [];
    for (var s = 0; s < ln.segments.length; s++) {
      var seg = ln.segments[s] || [];
      var pts = [];
      for (var j = 0; j < seg.length; j++) {
        var st = getStation(seg[j]);
        if (st && typeof st.x === 'number') pts.push({ x: st.x, y: st.y });
      }
      var closed = !!ln.loop && s === 0 && pts.length > 2;
      out.push(roundedPath(pts, closed, CORNER));
    }
    return out;
  }

  function buildLines(parent) {
    var lines = mock().lines || {};
    var ids = Object.keys(lines);
    // 2호선은 맨 마지막(최상단)
    ids.sort(function (a, b) { return (a === '2') - (b === '2'); });
    S.lineOrder = ids.slice();
    for (var i = 0; i < ids.length; i++) {
      var ln = lines[ids[i]];
      if (!ln || !ln.segments) continue;
      var g = el('g', { 'class': 'metro-line', 'data-line': ln.id || ids[i] }, parent);
      var halos = el('g', { 'class': 'line-halos' }, g);
      var paths = el('g', { 'class': 'line-paths' }, g);
      var ds = linePathData(ln);
      for (var s = 0; s < ds.length; s++) {
        var d = ds[s];
        if (!d) continue;
        S.haloPaths.push(el('path', { 'class': 'line-halo', d: d }, halos));
        S.linePaths.push(el('path', { 'class': 'line-path', d: d, stroke: ln.color || '#94A3B8' }, paths));
      }
      S.lineGroups[ln.id || ids[i]] = g;
    }
  }

  // 인접 역 방향 벡터 (라벨 배치용)
  function neighborVectors() {
    var lines = mock().lines || {};
    var map = {};
    function add(a, b) {
      var A = getStation(a), B = getStation(b);
      if (!A || !B) return;
      var dx = B.x - A.x, dy = B.y - A.y, d = Math.hypot(dx, dy);
      if (!d) return;
      (map[a] = map[a] || []).push({ x: dx / d, y: dy / d });
      (map[b] = map[b] || []).push({ x: -dx / d, y: -dy / d });
    }
    Object.keys(lines).forEach(function (lid) {
      var ln = lines[lid];
      (ln.segments || []).forEach(function (seg, si) {
        for (var i = 0; i < seg.length - 1; i++) add(seg[i], seg[i + 1]);
        if (ln.loop && si === 0 && seg.length > 2) add(seg[seg.length - 1], seg[0]);
      });
    });
    return map;
  }

  // 라벨 후보 위치 8곳을 노선과 덜 겹치는 순서로 정렬해 돌려준다.
  function labelCandidates(vecs, r) {
    var g = r + 5;
    var c = [
      { v: [1, 0], x: g, y: 4, a: 'start', b: 0 },
      { v: [0, 1], x: 0, y: r + 13, a: 'middle', b: 0.06 },
      { v: [-1, 0], x: -g, y: 4, a: 'end', b: 0.1 },
      { v: [0.7071, 0.7071], x: r + 2, y: r + 11, a: 'start', b: 0.14 },
      { v: [-0.7071, 0.7071], x: -(r + 2), y: r + 11, a: 'end', b: 0.18 },
      { v: [0, -1], x: 0, y: -(r + 7), a: 'middle', b: 0.2 },
      { v: [-0.7071, -0.7071], x: -(r + 2), y: -(r + 4), a: 'end', b: 0.26 },
      { v: [0.7071, -0.7071], x: r + 6, y: -(r + 4), a: 'start', b: 0.3 }
    ];
    for (var i = 0; i < c.length; i++) {
      var m = -Infinity;
      for (var j = 0; vecs && j < vecs.length; j++) {
        var dot = c[i].v[0] * vecs[j].x + c[i].v[1] * vecs[j].y;
        if (dot > m) m = dot;
      }
      c[i].score = (m === -Infinity ? 0 : m) + c[i].b;
    }
    return c.sort(function (p, q) { return p.score - q.score; });
  }

  // 라벨 글자 폭 추정 (화면 px). 한글은 1em, 영문·숫자·괄호는 약 0.6em
  function textWidth(s, px) {
    var w = 0;
    for (var i = 0; i < s.length; i++) w += s.charCodeAt(i) > 0x2E80 ? 1 : 0.6;
    return w * px;
  }

  /* 라벨 겹침 처리: 우선순위(선택 > 경로 강조 > 환승역 > 일반역) 순으로
     후보 위치를 차례로 시도해, 다른 라벨·역 표시와 겹치지 않는 첫 위치에 둔다.
     둘 곳이 없으면 숨긴다. 좌표는 화면 px (평행이동은 무시해도 겹침 판정이 같다). */
  function layoutLabels() {
    if (!S) return;
    var k = curK(), f = sizeFactor(S.zoom);
    S.labelK = k;
    var CELL = 64, grid = {};
    function cells(b, fn) {
      for (var gx = Math.floor(b.x0 / CELL); gx <= Math.floor(b.x1 / CELL); gx++) {
        for (var gy = Math.floor(b.y0 / CELL); gy <= Math.floor(b.y1 / CELL); gy++) {
          if (fn(gx + ',' + gy) === false) return false;
        }
      }
      return true;
    }
    function add(b) { cells(b, function (key) { (grid[key] = grid[key] || []).push(b); }); }
    function hits(b) {
      return !cells(b, function (key) {
        var list = grid[key];
        for (var i = 0; list && i < list.length; i++) {
          var o = list[i];
          if (o.owner !== b.owner && b.x0 < o.x1 && b.x1 > o.x0 && b.y0 < o.y1 && b.y1 > o.y0) return false;
        }
      });
    }
    var ids = Object.keys(S.nodes), i, n;
    // 역 표시(원)는 모두 장애물
    for (i = 0; i < ids.length; i++) {
      n = S.nodes[ids[i]];
      var rr = n.r * f + 1, cx = n.st.x * k, cy = n.st.y * k;
      add({ x0: cx - rr, y0: cy - rr, x1: cx + rr, y1: cy + rr, owner: n.st.id });
    }
    function prio(nd) {
      var id = nd.st.id;
      if (id === S.selected) return 1000;
      if (S.emph.indexOf(id) >= 0) return 900;
      var p = nd.transfer ? 100 + (nd.st.lines || []).length : 0;
      if (S.filter && (nd.st.lines || []).indexOf(S.filter) === -1) p -= 500;
      return p;
    }
    ids.sort(function (a, b) { return prio(S.nodes[b]) - prio(S.nodes[a]); });
    var fs = LABEL_PX, small = k < LABEL_K;
    for (i = 0; i < ids.length; i++) {
      n = S.nodes[ids[i]];
      var pr = prio(n), must = pr >= 900;
      var chosen = null;
      if (must || !(small && !n.transfer)) {
        var sx = n.st.x * k, sy = n.st.y * k;
        for (var c = 0; c < n.cands.length; c++) {
          var cd = n.cands[c], ox = cd.x * f, oy = cd.y * f;
          var x0 = cd.a === 'start' ? ox : (cd.a === 'end' ? ox - n.w : ox - n.w / 2);
          var b = { x0: sx + x0 - 1, x1: sx + x0 + n.w + 1, y0: sy + oy - fs * 0.85, y1: sy + oy + fs * 0.3, owner: n.st.id };
          if (!hits(b)) { chosen = { cd: cd, b: b }; break; }
          if (must && c === 0) chosen = { cd: cd, b: b };
        }
      }
      var hide = !chosen;
      if (!hide) {
        add(chosen.b);
        if (n.cd !== chosen.cd) {
          n.cd = chosen.cd;
          n.label.setAttribute('x', chosen.cd.x);
          n.label.setAttribute('y', chosen.cd.y);
          n.label.setAttribute('text-anchor', chosen.cd.a);
        }
      }
      if (n.hidden !== hide) { n.hidden = hide; n.label.classList.toggle('label-hidden', hide); }
    }
  }

  function buildStations(parent) {
    var stations = mock().stations || {};
    var ids = Object.keys(stations);
    var vecs = neighborVectors();
    // 환승역을 위에 그리도록 정렬
    ids.sort(function (a, b) {
      var A = stations[a], B = stations[b];
      return ((A.lines || []).length > 1) - ((B.lines || []).length > 1);
    });
    for (var i = 0; i < ids.length; i++) {
      var st = getStation(ids[i]) || stations[ids[i]];
      if (!st || typeof st.x !== 'number') continue;
      var lines = st.lines || [];
      var transfer = lines.length > 1;
      var r = transfer ? 7.5 : 5;
      var g = el('g', { 'class': 'station-node' + (transfer ? ' transfer' : ''), 'data-id': st.id }, parent);
      el('title', null, g).textContent = st.name + '역';
      el('circle', { 'class': 'select-ring', r: r + 6 }, g);
      el('circle', { 'class': 'hit', r: 15 }, g);
      var ln = null;
      for (var j = 0; j < lines.length && !ln; j++) ln = getLine(lines[j]);
      el('circle', { 'class': 'st-circle', r: r, stroke: transfer ? null : (ln && ln.color) || '#64748B' }, g);
      var cands = labelCandidates(vecs[st.id], r);
      var lp = cands[0];
      var label = el('text', { 'class': 'station-label', x: lp.x, y: lp.y, 'text-anchor': lp.a }, g);
      label.textContent = st.name;
      var dx = r * 0.78 + 1.6, dy = -(r * 0.78 + 1.6);
      var pulse = el('circle', { 'class': 'status-pulse', cx: r2(dx), cy: r2(dy), r: 3.6 }, g);
      var dot = el('circle', { 'class': 'status-dot', cx: r2(dx), cy: r2(dy), r: transfer ? 3.8 : 3.4 }, g);
      S.nodes[st.id] = {
        g: g, st: st, dot: dot, pulse: pulse, label: label, cands: cands, cd: lp,
        r: r, transfer: transfer, hidden: false, w: textWidth(st.name, LABEL_PX)
      };
      S.scaled.push({ g: g, x: st.x, y: st.y });
    }
  }

  function build() {
    var svg = el('svg', {
      'class': 'metro-svg',
      width: '100%', height: '100%',
      role: 'img',
      'aria-label': '서울 지하철 노선도',
      'data-viewbox': S.W + ' ' + S.H
    });
    S.svg = svg;
    var vp = el('g', { 'class': 'viewport' }, svg);
    S.viewport = vp;
    el('rect', { 'class': 'map-bg', x: -S.W, y: -S.H, width: S.W * 3, height: S.H * 3 }, vp);
    S.layers.bg = el('g', { 'class': 'layer-bg' }, vp);
    S.layers.lines = el('g', { 'class': 'layer-lines' }, vp);
    S.layers.route = el('g', { 'class': 'layer-route' }, vp);
    S.layers.stations = el('g', { 'class': 'layer-stations' }, vp);
    S.layers.markers = el('g', { 'class': 'layer-markers' }, vp);
    try { buildRiver(S.layers.bg); } catch (e) { /* 장식 — 실패 무시 */ }
    buildLines(S.layers.lines);
    buildStations(S.layers.stations);
    S.container.appendChild(svg);
  }

  /* ---------------- interaction ---------------- */
  function localPt(e) {
    var r = S.svg.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }
  function pointerList() {
    var out = [];
    for (var k in S.pointers) if (Object.prototype.hasOwnProperty.call(S.pointers, k)) out.push(S.pointers[k]);
    return out;
  }
  function pinchInfo() {
    var p = pointerList();
    if (p.length < 2) return null;
    return { d: Math.hypot(p[1].x - p[0].x, p[1].y - p[0].y) || 1, mx: (p[0].x + p[1].x) / 2, my: (p[0].y + p[1].y) / 2 };
  }

  function onDown(e) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    cancelAnim();
    var p = localPt(e);
    S.pointers[e.pointerId] = p;
    S.pointerCount++;
    try { S.svg.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    if (S.pointerCount === 1) {
      var t = e.target && e.target.closest ? e.target.closest('.station-node') : null;
      S.gesture = { sx: p.x, sy: p.y, moved: 0, multi: false, target: t };
      S.pinch = null;
    } else {
      if (S.gesture) S.gesture.multi = true;
      S.pinch = pinchInfo();
    }
    S.svg.classList.add('dragging');
    if (e.pointerType !== 'mouse') e.preventDefault();
  }

  function onMove(e) {
    var prev = S.pointers[e.pointerId];
    if (!prev) return;
    var p = localPt(e);
    S.pointers[e.pointerId] = p;
    if (S.pointerCount === 1) {
      if (S.gesture) S.gesture.moved = Math.max(S.gesture.moved, Math.hypot(p.x - S.gesture.sx, p.y - S.gesture.sy));
      panBy(p.x - prev.x, p.y - prev.y);
    } else if (S.pointerCount >= 2) {
      var now = pinchInfo();
      if (now && S.pinch) {
        panBy(now.mx - S.pinch.mx, now.my - S.pinch.my);
        zoomAt(now.mx, now.my, now.d / S.pinch.d);
      }
      S.pinch = now;
    }
    e.preventDefault();
  }

  function endPointer(e, cancelled) {
    if (!S.pointers[e.pointerId]) return;
    delete S.pointers[e.pointerId];
    S.pointerCount = Math.max(0, S.pointerCount - 1);
    try { S.svg.releasePointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    if (S.pointerCount === 0) {
      var g = S.gesture;
      S.gesture = null; S.pinch = null;
      S.svg.classList.remove('dragging');
      if (!cancelled && g && !g.multi && g.moved < TAP_SLOP) handleTap(g.target);
    } else if (S.pointerCount >= 2) {
      S.pinch = pinchInfo();
    } else {
      S.pinch = null;
    }
  }

  function handleTap(node) {
    if (node) {
      var id = node.getAttribute('data-id');
      if (!id) return;
      selectStation(id);
      if (S.options && typeof S.options.onStationClick === 'function') {
        try { S.options.onStationClick(id); } catch (err) { console.error('[MetroMap] onStationClick', err); }
      }
    } else if (S.options && typeof S.options.onMapClick === 'function') {
      try { S.options.onMapClick(); } catch (err) { console.error('[MetroMap] onMapClick', err); }
    }
  }

  function onWheel(e) {
    e.preventDefault();
    cancelAnim();
    var dy = e.deltaY * (e.deltaMode === 1 ? 16 : (e.deltaMode === 2 ? 400 : 1));
    if (e.ctrlKey) dy *= 2.5; // 트랙패드 핀치
    var p = localPt(e);
    zoomAt(p.x, p.y, Math.exp(-dy * 0.0018));
  }

  function onDblClick(e) {
    if (e.target && e.target.closest && e.target.closest('.station-node')) return;
    var p = localPt(e);
    var t = curT();
    var mx = (p.x - t.tx) / t.k, my = (p.y - t.ty) / t.k;
    animateTo(centerFor(mx, my, p.x, p.y, clamp(S.zoom * 1.6, MIN_ZOOM, MAX_ZOOM)));
  }

  function bindEvents() {
    var svg = S.svg;
    svg.addEventListener('pointerdown', onDown);
    svg.addEventListener('pointermove', onMove);
    svg.addEventListener('pointerup', function (e) { endPointer(e, false); });
    svg.addEventListener('pointercancel', function (e) { endPointer(e, true); });
    svg.addEventListener('lostpointercapture', function (e) { endPointer(e, true); });
    svg.addEventListener('wheel', onWheel, { passive: false });
    svg.addEventListener('dblclick', onDblClick);
    svg.addEventListener('contextmenu', function (e) { if (S.pointerCount > 0) e.preventDefault(); });

    var onResize = function () {
      var oldW = S.cw, oldH = S.ch, had = S.hasSize;
      measure();
      if (!S.hasSize) return;
      if (!had && !S.userMoved) setView(homeView());
      if (oldW !== S.cw || oldH !== S.ch || !had) { S.lastK = -1; render(); }
    };
    if (typeof ResizeObserver === 'function') {
      S.ro = new ResizeObserver(onResize);
      S.ro.observe(S.container);
    } else {
      window.addEventListener('resize', onResize);
    }
  }

  /* ---------------- public API ---------------- */
  function refreshStatuses() {
    if (!S) return;
    for (var id in S.nodes) {
      if (!Object.prototype.hasOwnProperty.call(S.nodes, id)) continue;
      var n = S.nodes[id];
      var status = stationStatus(id);
      var cls = STATUS_CLASS[status] || '';
      n.dot.setAttribute('class', 'status-dot' + (cls ? ' ' + cls : ''));
      n.pulse.setAttribute('class', 'status-pulse' + (status === 'UNAVAILABLE' ? ' on' : ''));
      n.g.classList.toggle('st-ok', status === 'AVAILABLE');
      n.g.classList.toggle('st-warn', status === 'PARTIAL');
      n.g.classList.toggle('st-bad', status === 'UNAVAILABLE');
    }
  }

  function selectStation(id) {
    if (!S) return;
    if (S.selected && S.nodes[S.selected]) S.nodes[S.selected].g.classList.remove('selected');
    S.selected = null;
    if (id && S.nodes[id]) {
      S.selected = id;
      var g = S.nodes[id].g;
      g.classList.add('selected');
      g.parentNode.appendChild(g); // 맨 위로
    }
    layoutLabels();
  }

  function focusStation(id, opts) {
    if (!S) return;
    var st = getStation(id);
    if (!st || typeof st.x !== 'number') return;
    selectStation(id);
    var zoom = opts && typeof opts.zoom === 'number' ? opts.zoom : FOCUS_ZOOM;
    measure();
    S.userMoved = true;
    animateTo(centerFor(st.x, st.y, S.cw / 2, S.ch * FOCUS_Y, clamp(zoom, MIN_ZOOM, MAX_ZOOM)));
  }

  function makeTag(parent, text, kind, y) {
    var g = el('g', { 'class': 'map-tag ' + kind, transform: 'translate(0,' + y + ')' }, parent);
    var w = Math.max(30, text.length * 11 + 14);
    el('rect', { x: -w / 2, y: -10, width: w, height: 20, rx: 10 }, g);
    el('text', { x: 0, y: 4, 'text-anchor': 'middle' }, g).textContent = text;
    return g;
  }

  function addMarker(st, kind) {
    var g = el('g', { 'class': kind, 'data-id': st.id }, S.layers.markers);
    var transfer = (st.lines || []).length > 1;
    var r = transfer ? 7.5 : 5;
    if (kind === 'alt-target') {
      el('circle', { 'class': 'at-pulse', r: r + 7 }, g);
      el('circle', { 'class': 'at-ring', r: r + 6 }, g);
      makeTag(g, '대체역', 'ok', -(r + 22));
    } else {
      el('circle', { 'class': 'bt-ring', r: r + 6 }, g);
      var x = r + 2;
      var bx = el('g', { 'class': 'bt-x', transform: 'translate(' + (-x - 3) + ',' + (x + 3) + ')' }, g);
      el('circle', { r: 6.5 }, bx);
      el('path', { d: 'M-2.6 -2.6L2.6 2.6M2.6 -2.6L-2.6 2.6' }, bx);
      makeTag(g, '고장', 'bad', -(r + 22));
    }
    S.markers.push({ g: g, x: st.x, y: st.y });
    return g;
  }

  function clearHighlights() {
    if (!S) return;
    while (S.layers.route.firstChild) S.layers.route.removeChild(S.layers.route.firstChild);
    while (S.layers.markers.firstChild) S.layers.markers.removeChild(S.layers.markers.firstChild);
    S.route = null;
    S.markers = [];
    for (var i = 0; i < S.emph.length; i++) if (S.nodes[S.emph[i]]) S.nodes[S.emph[i]].g.classList.remove('emph');
    S.emph = [];
    S.svg.classList.remove('has-route');
    layoutLabels();
  }

  function highlightAlternative(fromId, toId, path) {
    if (!S) return;
    clearHighlights();
    var ids = Array.isArray(path) && path.length ? path.slice() : [fromId, toId];
    if (fromId && ids[0] !== fromId) ids.unshift(fromId);
    if (toId && ids[ids.length - 1] !== toId) ids.push(toId);
    var pts = [], valid = [];
    for (var i = 0; i < ids.length; i++) {
      var st = getStation(ids[i]);
      if (st && typeof st.x === 'number') { pts.push({ x: st.x, y: st.y }); valid.push(ids[i]); }
    }
    if (pts.length >= 2) {
      var d = roundedPath(pts, false, CORNER);
      var halo = el('path', { 'class': 'alt-route-halo', d: d }, S.layers.route);
      var p = el('path', { 'class': 'alt-route', d: d }, S.layers.route);
      S.route = { halo: halo, path: p };
    }
    var from = getStation(fromId), to = getStation(toId);
    if (from) addMarker(from, 'broken-target');
    if (to) addMarker(to, 'alt-target');
    [fromId, toId].forEach(function (id) {
      if (S.nodes[id]) { S.nodes[id].g.classList.add('emph'); S.emph.push(id); }
    });
    S.svg.classList.add('has-route');
    layoutLabels();

    // 뷰 맞추기: 상단(필터 아래 ~ 시트 위) 영역에 경로 bbox
    measure();
    var b = bbox(valid.length ? valid : [fromId, toId]);
    S.lastK = -1;
    if (b) {
      var pad = 56;
      var top = FILTER_H, bottom = S.ch * SHEET_TOP;
      if (bottom - top < 160) { top = 0; bottom = S.ch; }
      var availW = Math.max(60, S.cw - pad * 2), availH = Math.max(60, bottom - top - pad * 2);
      var k = Math.min(availW / Math.max(b.w, 1), availH / Math.max(b.h, 1));
      var zoom = clamp(k / S.fit, 1, 3.6);
      S.userMoved = true;
      animateTo(centerFor(b.cx, b.cy, S.cw / 2, (top + bottom) / 2, zoom));
    } else {
      render();
    }
  }

  function setLineFilter(lineId) {
    if (!S) return;
    var id = lineId == null || lineId === '' ? null : String(lineId);
    if (id && !S.lineGroups[id]) id = null;
    S.filter = id;
    var lid;
    for (lid in S.lineGroups) {
      if (Object.prototype.hasOwnProperty.call(S.lineGroups, lid)) S.lineGroups[lid].classList.toggle('dimmed', !!id && lid !== id);
    }
    // 선택 노선을 맨 위로, 해제 시 원래 순서 복원
    if (id) S.layers.lines.appendChild(S.lineGroups[id]);
    else S.lineOrder.forEach(function (l) { if (S.lineGroups[l]) S.layers.lines.appendChild(S.lineGroups[l]); });
    for (var sid in S.nodes) {
      if (!Object.prototype.hasOwnProperty.call(S.nodes, sid)) continue;
      var n = S.nodes[sid];
      n.g.classList.toggle('dimmed', !!id && (n.st.lines || []).indexOf(id) === -1);
    }
    S.svg.classList.toggle('filtering', !!id);
    layoutLabels();
  }

  function zoomIn() { if (!S) return; zoomCenter(1.4); }
  function zoomOut() { if (!S) return; zoomCenter(1 / 1.4); }
  function zoomCenter(f) {
    var t = curT();
    var px = S.cw / 2, py = S.ch / 2;
    var mx = (px - t.tx) / t.k, my = (py - t.ty) / t.k;
    S.userMoved = true;
    animateTo(centerFor(mx, my, px, py, clamp(S.zoom * f, MIN_ZOOM, MAX_ZOOM)), 260);
  }
  function resetView() {
    if (!S) return;
    measure();
    var h = homeView();
    var nearHome = Math.abs(Math.log(S.zoom / h.zoom)) < 0.05 &&
      Math.hypot(S.cx - h.cx, S.cy - h.cy) * curK() < 12;
    animateTo(nearHome ? allView() : h, 420);
  }

  function init(containerEl, options) {
    if (!containerEl) { console.error('[MetroMap] container 없음'); return; }
    if (S) destroy();
    var vb = mock().viewBox || { width: 1600, height: 1400 };
    S = {
      container: containerEl, options: options || {},
      W: vb.width || 1600, H: vb.height || 1400,
      svg: null, viewport: null, layers: {},
      nodes: {}, scaled: [], markers: [], linePaths: [], haloPaths: [], lineGroups: {}, lineOrder: [],
      route: null, emph: [], selected: null, filter: null,
      zoom: 1, cx: 0, cy: 0, cw: 0, ch: 0, fit: 0.2, hasSize: false,
      lastK: -1, lastF: -1, labelK: 0, raf: 0, anim: 0,
      pointers: {}, pointerCount: 0, gesture: null, pinch: null,
      userMoved: false, unsub: null, ro: null
    };
    build();
    measure();
    setView(homeView());
    bindEvents();
    refreshStatuses();
    render();
    var s = svc();
    if (s && typeof s.subscribe === 'function') {
      try { S.unsub = s.subscribe(function () { refreshStatuses(); }); } catch (e) { /* ignore */ }
    }
  }

  function destroy() {
    if (!S) return;
    cancelAnim();
    if (S.raf) cancelAnimationFrame(S.raf);
    if (typeof S.unsub === 'function') { try { S.unsub(); } catch (e) { /* ignore */ } }
    if (S.ro) S.ro.disconnect();
    if (S.svg && S.svg.parentNode) S.svg.parentNode.removeChild(S.svg);
    S = null;
  }

  window.MetroMap = {
    init: init,
    refreshStatuses: refreshStatuses,
    focusStation: focusStation,
    selectStation: selectStation,
    highlightAlternative: highlightAlternative,
    clearHighlights: clearHighlights,
    setLineFilter: setLineFilter,
    zoomIn: zoomIn,
    zoomOut: zoomOut,
    resetView: resetView,
    destroy: destroy
  };
})();
