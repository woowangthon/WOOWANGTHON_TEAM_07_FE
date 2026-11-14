/* app.js — UI 총괄 (window.App)
 * 탭 전환, 바텀 시트, 검색, 엘리베이터 목록, 출발 계산 폼, 챗 렌더링, 시연 제어판, 토스트, 상태바 시계.
 * 계약: docs/cards/003-interface-contract.md §6
 */
(function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // 기본 유틸
  // ---------------------------------------------------------------------------
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function byId(id) { return document.getElementById(id); }

  function ES() { return window.ElevatorService; }
  function MAP() { return window.MetroMap; }
  function TC() { return window.TimeCalculator; }
  function AI() { return window.AIAgent; }
  function MOCKDATA() { return window.MOCK || {}; }

  function safe(label, fn) {
    try { return fn(); } catch (e) { console.error('[App] ' + label + ' 실패:', e); return undefined; }
  }

  function mapCall(method) {
    var args = Array.prototype.slice.call(arguments, 1);
    var m = MAP();
    if (m && typeof m[method] === 'function') {
      try { return m[method].apply(m, args); } catch (e) { console.error('[App] MetroMap.' + method + ' 실패:', e); }
    }
    return undefined;
  }

  function escapeHtml(v) {
    if (v === null || v === undefined) return '';
    return String(v)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function pad2(n) { return (n < 10 ? '0' : '') + n; }

  function getStation(id) {
    if (!id) return null;
    var es = ES();
    if (es && es.getStation) {
      var s = safe('getStation', function () { return es.getStation(id); });
      if (s) return s;
    }
    var st = MOCKDATA().stations;
    return (st && st[id]) || null;
  }

  function stationName(idOrStation) {
    if (!idOrStation) return '';
    if (typeof idOrStation === 'object') return idOrStation.name || idOrStation.id || '';
    var s = getStation(idOrStation);
    return s ? s.name : String(idOrStation);
  }

  // "강남" → "강남역", "서울역" → "서울역" (중복 접미사 방지)
  function yeok(idOrStation) {
    var n = stationName(idOrStation);
    return /역$/.test(n) ? n : n + '역';
  }

  function getLine(lineId) {
    var es = ES();
    var l = null;
    if (es && es.getLine) l = safe('getLine', function () { return es.getLine(lineId); });
    if (!l) { var lines = MOCKDATA().lines; l = lines && lines[lineId]; }
    return l || { id: lineId, name: String(lineId), short: String(lineId), color: '#9CA3AF' };
  }

  function lineBadge(lineId) {
    var l = getLine(lineId);
    return '<span class="line-badge" style="--line-color:' + escapeHtml(l.color) + '" title="' +
      escapeHtml(l.name) + '">' + escapeHtml(l.short || l.id) + '</span>';
  }

  function lineBadges(station) {
    if (!station || !station.lines) return '';
    return station.lines.map(lineBadge).join('');
  }

  var STATUS_CLASS = { AVAILABLE: 'ok', PARTIAL: 'warn', UNAVAILABLE: 'bad', UNKNOWN: 'unknown' };
  // 상태 이름은 elevator-service.js에서 가져온다. (REQ-DS-008)
  function statusLabel(status) {
    var es = ES();
    var l = es && es.getStatusLabel ? safe('getStatusLabel', function () { return es.getStatusLabel(status); }) : null;
    return l || status;
  }

  // 상태 모양은 elevator-service.js에서 가져온다. (REQ-DS-003)
  function statusIcon(status) {
    var es = ES();
    return (es && es.getStatusIcon ? safe('getStatusIcon', function () { return es.getStatusIcon(status); }) : null) || 'help';
  }

  function statusPill(status) {
    var cls = STATUS_CLASS[status] || 'unknown';
    return '<span class="status-pill ' + cls + '">' + icon(statusIcon(status)) + escapeHtml(statusLabel(status)) + '</span>';
  }

  function stationStatus(id) {
    var es = ES();
    if (!es || !es.getStationStatus) return 'UNKNOWN';
    return safe('getStationStatus', function () { return es.getStationStatus(id); }) || 'UNKNOWN';
  }

  function hasData(id) {
    var es = ES();
    if (!es) return false;
    if (es.hasElevatorData) return !!safe('hasElevatorData', function () { return es.hasElevatorData(id); });
    return getElevators(id).length > 0;
  }

  function getElevators(id) {
    var es = ES();
    if (!es || !es.getElevators) return [];
    return safe('getElevators', function () { return es.getElevators(id); }) || [];
  }

  function allStations() {
    var es = ES();
    var list = es && es.getAllStations ? safe('getAllStations', function () { return es.getAllStations(); }) : null;
    if (!list) {
      var st = MOCKDATA().stations || {};
      list = Object.keys(st).map(function (k) { return st[k]; });
    }
    return list.slice();
  }

  function koCompare(a, b) { return String(a).localeCompare(String(b), 'ko'); }

  function accessibleRouteHtml(stationId, originId, destinationId) {
    var context = { affectedStationId: stationId, stationName: yeok(stationId) };
    if (originId !== undefined) context.originStationId = originId;
    if (destinationId !== undefined) context.destinationStationId = destinationId;
    // 현재 서비스는 역별 데모 상태만 보유한다. 경로 근거가 없으면 확인 필요로 표시한다.
    var es = ES();
    var snapshot = es && es.getAccessibleRouteSnapshot ? safe('getAccessibleRouteSnapshot', function () { return es.getAccessibleRouteSnapshot(context); }) : null;
    return window.AccessibleRouteView ? window.AccessibleRouteView.render(snapshot, context) : '<div class="alt-box">접근 가능한 이동 경로는 확인이 필요해요. 역무원에게 확인해 주세요.</div>';
  }

  // 정보 없음(UNKNOWN)은 멈춘 것도 정상도 아니다
  function isDown(elev) { return elev && elev.status !== 'AVAILABLE' && elev.status !== 'UNKNOWN'; }

  var ELEV_STATUS_TEXT = { AVAILABLE: '정상', UNAVAILABLE: '고장', MAINTENANCE: '점검 중', UNKNOWN: '정보 없음' };

  // 실데이터(BE) 모드 여부와 불러오기 상태. 목업 모드에서는 live=false, phase='ready'
  function apiMode() { var es = ES(); return !!(es && es.isLive && es.isLive()); }
  function liveState() {
    var es = ES();
    return es && es.getLiveState ? es.getLiveState() : { live: false, phase: 'ready', error: null };
  }
  // BE가 가져온 시각(ISO, KST 표기 그대로)을 "11/15 오후 2:00 기준"으로. 값이 없으면 null
  function showBeTime(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(iso || '');
    if (!m) return null;
    return m[2] + '/' + m[3] + ' ' + showTime(m[4] + ':' + m[5]) + ' 기준';
  }
  var ELEV_TYPE_TEXT = { exit: '출구', platform: '승강장', transfer: '환승' };


  // 아이콘 글꼴이 오면 아이콘을 보인다. 오기 전이나 못 받으면 이름 글자("search")를 숨겨 둔다 (REQ-DS-007)
  (function watchIconFont() {
    var root = document.documentElement;
    if (!document.fonts || !document.fonts.load) { root.classList.add('ms-ready'); return; }
    document.fonts.load('24px "Material Symbols Rounded"', 'search').then(function (list) {
      if (list && list.length) root.classList.add('ms-ready');
    }, function () {});
  })();

  // 아이콘 (Material Symbols Rounded, REQ-DS-007). 기본 20px, lg 24px. 장식이라 화면 읽기에서 뺀다
  function icon(name, size) {
    return '<span class="ms' + (size === 'lg' ? ' ms-lg' : '') + '" aria-hidden="true">' + name + '</span>';
  }

  // 화면의 시각은 TimeCalculator의 표기 함수로만 바꾼다. (REQ-DS-009)
  function showTime(hhmm) {
    var tc = TC();
    return tc && tc.displayTime ? tc.displayTime(hhmm) : (hhmm == null ? '' : String(hhmm));
  }
  function showTimesIn(text) {
    var tc = TC();
    return tc && tc.displayTimesInText ? tc.displayTimesInText(text) : (text == null ? '' : String(text));
  }
  // 큰 출발 시각: 작은 "오후" + 큰 "8:53"
  function bigTimeHtml(hhmm) {
    var tc = TC();
    var p = tc && tc.displayParts ? tc.displayParts(hhmm) : null;
    return p ? '<span class="big-time-ampm">' + p.ampm + ' </span>' + escapeHtml(p.time) : escapeHtml(hhmm);
  }

  function nowHHMM(d) {
    d = d || new Date();
    return pad2(d.getHours()) + ':' + pad2(d.getMinutes());
  }

  // ---------------------------------------------------------------------------
  // 토스트
  // ---------------------------------------------------------------------------
  var toastTimer = null;
  function toast(msg) {
    var el = byId('toast');
    if (!el) return;
    el.textContent = msg == null ? '' : String(msg);
    el.classList.add('show');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('show'); }, 2200);
  }

  // ---------------------------------------------------------------------------
  // 상태바 시계
  // ---------------------------------------------------------------------------
  function initClock() {
    var el = byId('statusTime');
    if (!el) return;
    function tick() {
      var d = new Date();
      el.textContent = d.getHours() + ':' + pad2(d.getMinutes());
    }
    tick();
    setInterval(tick, 20000);
  }

  // ---------------------------------------------------------------------------
  // 탭
  // ---------------------------------------------------------------------------
  var TABS = ['map', 'elevator', 'time', 'chat', 'login'];
  var currentTab = 'map';

  function switchTab(name) {
    if (TABS.indexOf(name) < 0) return;
    currentTab = name;
    document.body.setAttribute('data-active-tab', name);
    var hdr = $('.app-header');
    if (hdr) hdr.hidden = name === 'time' || name === 'chat' || name === 'login';
    $all('.tab-bar .tab[data-tab]').forEach(function (t) {
      t.classList.toggle('active', t.getAttribute('data-tab') === name);
    });
    $all('.view[data-view]').forEach(function (v) {
      v.classList.toggle('active', v.getAttribute('data-view') === name);
    });
    if (name !== 'map' && sheet.open) closeSheet();
    Object.keys(stationCombos || {}).forEach(function (role) { if (stationCombos[role]) stationCombos[role].close(); });
    hideSearch();
    if (name === 'chat') scrollChat();
  }

  // 누른 탭에 회색 둥근 사각형을 한 번 깔았다 지운다 (REQ-COM-008)
  function flashTab(t) {
    t.classList.remove('pressing');
    void t.offsetWidth; // 연달아 눌러도 처음부터 다시 재생
    t.classList.add('pressing');
  }

  function initTabs() {
    $all('.tab-bar .tab[data-tab]').forEach(function (t) {
      t.addEventListener('pointerdown', function () { flashTab(t); });
      t.addEventListener('click', function (e) {
        if (e.detail === 0) flashTab(t); // 키보드로 누른 경우
        switchTab(t.getAttribute('data-tab'));
      });
      // 회색 사각형(탭 자신의 ::before)이 끝날 때 뗀다. 아이콘·이름의 커짐 효과는 그보다 먼저 끝난다
      t.addEventListener('animationend', function (e) { if (e.target === t) t.classList.remove('pressing'); });
    });
  }

  // ---------------------------------------------------------------------------
  // 지도
  // ---------------------------------------------------------------------------
  var activeLine = null;

  function initMap() {
    var container = byId('mapContainer');
    if (MAP() && MAP().init && container) {
      MAP().init(container, {
        onStationClick: function (id) { openStation(id); },
        // 시트가 펼쳐져 있으면 요약으로 내린다. 닫지는 않는다 (REQ-COM-004)
        onMapClick: function () { if (sheet.open && sheet.state === 'full') setSheetState('peek'); }
      });
    } else {
      console.error('[App] MetroMap 사용 불가');
    }
    var zi = byId('zoomIn'), zo = byId('zoomOut'), zr = byId('zoomReset');
    if (zi) zi.addEventListener('click', function () { mapCall('zoomIn'); });
    if (zo) zo.addEventListener('click', function () { mapCall('zoomOut'); });
    if (zr) zr.addEventListener('click', function () { mapCall('resetView'); });
  }

  function initLineFilter() {
    var wrap = byId('lineFilter');
    if (!wrap) return;
    var lines = MOCKDATA().lines || {};
    var html = '<button type="button" class="chip active" data-line="">전체</button>';
    Object.keys(lines).forEach(function (id) {
      var l = lines[id];
      html += '<button type="button" class="chip" data-line="' + escapeHtml(id) + '" style="--line-color:' +
        escapeHtml(l.color) + '"><span class="chip-dot" style="background:' +
        escapeHtml(l.color) + '"></span>' + escapeHtml(l.name) + '</button>';
    });
    wrap.innerHTML = html;
    wrap.addEventListener('click', function (e) {
      var chip = e.target.closest('.chip[data-line]');
      if (!chip) return;
      var id = chip.getAttribute('data-line') || null;
      if (id && id === activeLine) id = null; // 같은 노선 다시 누르면 전체
      activeLine = id;
      mapCall('setLineFilter', id);
      $all('.chip[data-line]', wrap).forEach(function (c) {
        c.classList.toggle('active', (c.getAttribute('data-line') || null) === id);
      });
    });
  }

  // ---------------------------------------------------------------------------
  // 검색
  // ---------------------------------------------------------------------------
  function normalizeName(s) {
    return String(s || '').replace(/\s+/g, '').replace(/역$/, '').toLowerCase();
  }

  function searchStations(q) {
    var nq = normalizeName(q);
    if (!nq) return [];
    var list = allStations().filter(function (s) { return normalizeName(s.name).indexOf(nq) >= 0; });
    list.sort(function (a, b) {
      var as = normalizeName(a.name).indexOf(nq) === 0 ? 0 : 1;
      var bs = normalizeName(b.name).indexOf(nq) === 0 ? 0 : 1;
      if (as !== bs) return as - bs;
      return koCompare(a.name, b.name);
    });
    // 별칭(홍대, 건대 등) 매칭 보강
    var es = ES();
    if (es && es.findStationByName) {
      var alias = safe('findStationByName', function () { return es.findStationByName(q); });
      if (alias && !list.some(function (s) { return s.id === alias.id; })) list.unshift(alias);
    }
    return list.slice(0, 8);
  }

  function hideSearch() {
    var r = byId('searchResults');
    if (r) r.classList.remove('show');
  }

  function initSearch() {
    var input = byId('searchInput');
    var results = byId('searchResults');
    if (!input || !results) return;
    var current = [];

    function render() {
      var q = input.value.trim();
      if (!q) { results.innerHTML = ''; results.classList.remove('show'); current = []; return; }
      current = searchStations(q);
      if (!current.length) {
        results.innerHTML = '<div class="empty">"' + escapeHtml(q) + '"에 해당하는 역이 없어요</div>';
      } else {
        results.innerHTML = current.map(function (s) {
          return '<div class="search-item" data-id="' + escapeHtml(s.id) + '" role="button" tabindex="-1">' +
            '<span class="search-name">' + escapeHtml(yeok(s)) + '</span>' +
            '<span class="search-lines">' + lineBadges(s) + '</span>' +
            statusPill(stationStatus(s.id)) +
            '</div>';
        }).join('');
      }
      results.classList.add('show');
    }

    function choose(id) {
      input.value = '';
      results.innerHTML = '';
      results.classList.remove('show');
      input.blur();
      openStation(id);
    }

    input.addEventListener('input', render);
    input.addEventListener('focus', function () { if (input.value.trim()) render(); });
    input.addEventListener('blur', function () { setTimeout(hideSearch, 180); });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { hideSearch(); input.blur(); }
      else if (e.key === 'Enter') {
        e.preventDefault();
        if (current.length) choose(current[0].id);
      }
    });
    // mousedown에서 기본 동작을 막아 blur 전에 클릭이 처리되도록
    results.addEventListener('mousedown', function (e) { e.preventDefault(); });
    results.addEventListener('click', function (e) {
      var item = e.target.closest('.search-item[data-id]');
      if (item) choose(item.getAttribute('data-id'));
    });
  }

  // ---------------------------------------------------------------------------
  // 바텀 시트
  // ---------------------------------------------------------------------------
  // state: 역 시트는 'peek'(요약) / 'full'(펼침), 다른 시트는 'auto'(내용 높이, 막 있음) (REQ-COM-004)
  var sheet = { open: false, mode: null, stationId: null, alt: null, state: null };
  // 시연 제어판에서 조작할 역. 마지막으로 연 역을 기억한다.
  var demoStationId = null;

  // 시트 높이: 펼침 = 상단 검색창 아래까지, 요약 = 역 이름 + 운행 현황 (+ 우회 경로 버튼)
  function sheetMetrics() {
    var phone = byId('phone'), hdr = $('.app-header');
    var pr = phone ? phone.getBoundingClientRect() : { top: 0, bottom: innerHeight, height: innerHeight };
    var hb = hdr ? hdr.getBoundingClientRect().bottom : pr.top;
    var full = Math.round(pr.bottom - hb - 8);
    var peek = full;
    var sum = $('#sheetContent .sheet-summary');
    if (sum) peek = Math.min(full, Math.max(Math.round(pr.height * 0.25), sum.offsetTop + sum.offsetHeight + 16));
    return { full: full, peek: peek };
  }

  function sheetY(state, m) { return state === 'peek' ? m.full - m.peek : 0; }

  function applySheet() {
    var bs = byId('bottomSheet'), bd = byId('sheetBackdrop'), h = byId('sheetHandle');
    if (!bs) return;
    var m = sheetMetrics();
    if (sheet.state === 'auto') {
      bs.style.height = sheet.mode === 'pick' ? m.full + 'px' : ''; // 역 고르기는 결과 수가 바뀌어도 높이 고정
      bs.style.maxHeight = m.full + 'px';
    } else {
      bs.style.height = m.full + 'px';
      bs.style.maxHeight = 'none';
    }
    bs.style.setProperty('--sheet-y', sheetY(sheet.state, m) + 'px');
    bs.classList.toggle('is-peek', sheet.state === 'peek');
    bs.classList.toggle('is-full', sheet.state === 'full');
    if (sheet.state === 'peek') { var c = byId('sheetContent'); if (c) c.scrollTop = 0; }
    // 요약일 때는 막 없이 지도를 그대로 쓴다. 다른 시트(시연 제어판 등)만 막을 둔다
    if (bd) bd.classList.toggle('show', sheet.open && sheet.state === 'auto');
    if (h) {
      h.hidden = sheet.state === 'auto';
      h.setAttribute('aria-label', sheet.state === 'peek' ? '시트 펼치기' : '시트 접기');
      h.setAttribute('aria-expanded', String(sheet.state === 'full'));
    }
  }

  function setSheetState(state) {
    if (!sheet.open) return;
    sheet.state = state;
    applySheet();
  }

  function openSheetShell(state) {
    var bs = byId('bottomSheet');
    sheet.open = true;
    sheet.state = state || 'auto';
    applySheet();
    if (bs) { bs.style.transition = ''; bs.classList.add('open'); }
  }

  function closeSheet() {
    var bs = byId('bottomSheet'), bd = byId('sheetBackdrop');
    if (bs) { bs.classList.remove('open', 'is-peek', 'is-full'); bs.style.transition = ''; }
    if (bd) bd.classList.remove('show');
    sheet.open = false;
    sheet.state = null;
    sheet.mode = null;
    sheet.stationId = null;
    sheet.alt = null;
    mapCall('selectStation', null);
    mapCall('clearHighlights');
  }

  function setSheetHtml(html, keepScroll) {
    var c = byId('sheetContent');
    if (!c) return;
    var top = keepScroll ? c.scrollTop : 0;
    c.innerHTML = html;
    c.scrollTop = top;
  }

  function openStation(id) {
    var st = getStation(id);
    if (!st) { toast('역 정보를 찾을 수 없어요'); return; }
    hideSearch();
    switchTab('map');
    mapCall('focusStation', id, {});
    sheet.mode = 'station';
    sheet.stationId = id;
    selectDemoStation(id);
    renderStationSheet(false);
    openSheetShell('peek'); // 다른 역을 눌러도 그 역의 요약으로
    if (apiMode()) { var es = ES(); if (es && es.fetchStationElevators) es.fetchStationElevators(id); }
  }

  // 엘리베이터 운행 현황: 상태 아이콘 + 이름, 운행/전체 대수, 한 대당 한 칸 막대 (REQ-COM-007)
  //   멈춘 칸은 역 상태색 + 빗금. 칸이 너무 많으면(OP_MAX_CELLS 초과) 칸 없이 비율 막대
  var OP_MAX_CELLS = 12;
  function opStatusHtml(status, total, down) {
    var cls = STATUS_CLASS[status] || 'unknown';
    var head = '<span class="op-label">' + icon(statusIcon(status)) + escapeHtml(statusLabel(status)) + '</span>';
    if (status === 'UNKNOWN' || !total) {
      return '<div class="op-status ' + cls + '">' + '<div class="op-head">' + head + '</div></div>';
    }
    var up = total - down;
    var bar = '';
    if (total <= OP_MAX_CELLS) {
      for (var i = 0; i < total; i++) bar += '<span class="op-cell' + (i < up ? '' : ' down') + '"></span>';
    } else {
      bar = (up ? '<span class="op-cell" style="flex-grow:' + up + '"></span>' : '') +
        (down ? '<span class="op-cell down" style="flex-grow:' + down + '"></span>' : '');
    }
    var sentence = '엘리베이터 ' + total + '대 중 ' + up + '대 운행 중' + (down ? ', ' + down + '대 멈춤' : '');
    return '<div class="op-status ' + cls + '">' +
      '<p class="sr-only">' + escapeHtml(sentence) + '</p>' +
      '<div class="op-head" aria-hidden="true">' + head +
        '<span class="op-count"><b>' + up + '</b> / ' + total + '대</span></div>' +
      '<div class="op-bar" aria-hidden="true">' + bar + '</div>' +
      '</div>';
  }

  // 실데이터 모드: 불러오는 중/실패/기준 시각/BE가 준 한계 문구를 그대로 보여 준다
  function liveNoteHtml(id, status, info, elevState) {
    var es = ES(), parts = [];
    var ls = liveState();
    if (ls.phase === 'loading') parts.push('엘리베이터 상태를 확인 중이에요');
    else if (ls.phase === 'error') parts.push('연결 실패 · 상태는 정보 없음으로 표시해요');
    else if (elevState === 'unmapped') parts.push('서버 역 정보와 연결되지 않아 정보 없음이에요');
    else {
      if (status === 'AVAILABLE' && info && !info.dataFresh) parts.push('확인된 설비 기준이에요. 일부 설비 상태는 확인하지 못했어요');
      var t = es && es.getDataTime ? showBeTime(es.getDataTime(id)) : null;
      if (elevState === 'ready') parts.push(t ? '서버 확인 시각 ' + t : '서버 확인 시각 없음');
      var lim = es && es.getLimitations ? es.getLimitations(id) : [];
      lim.forEach(function (x) { parts.push(x); });
    }
    return parts.length ? '<div class="sheet-live-note muted">' + parts.map(function (x) { return '<div>' + escapeHtml(x) + '</div>'; }).join('') + '</div>' : '';
  }

  function renderStationSheet(keepScroll) {
    var id = sheet.stationId;
    var st = getStation(id);
    if (!st) return;
    var status = stationStatus(id);
    var elevs = getElevators(id);
    var data = hasData(id) && elevs.length > 0;
    var downCount = elevs.filter(isDown).length;
    var html = '';
    var live = apiMode();
    var es0 = ES();
    var elevState = live && es0 && es0.getElevatorsState ? es0.getElevatorsState(id) : 'ready';
    var info = live && es0 && es0.getStationInfo ? es0.getStationInfo(id) : null;

    var problem = status === 'PARTIAL' || status === 'UNAVAILABLE';
    sheet.alt = null;

    // 요약 (REQ-COM-004): 역 이름과 운행 현황(REQ-COM-007)
    html += '<div class="sheet-summary"><div class="sheet-header">' +
      '<div class="sheet-title">' + escapeHtml(yeok(st)) + ' ' + lineBadges(st) + '</div>' +
      opStatusHtml(live ? status : (data ? status : 'UNKNOWN'), live && info ? info.total - info.unknown : elevs.length, downCount) +
      (live ? liveNoteHtml(id, status, info, elevState) : '') +
      '</div>' +
      (problem ? '<button type="button" class="btn btn-primary btn-block btn-main sheet-accessibility" data-act="check-accessibility">' + icon('accessible') + '접근성 확인</button>' : '') +
      '</div>';

    // 엘리베이터 목록 (대체역 박스를 위에 두기 위해 나중에 다시 붙인다)
    var elevStart = html.length;
    html += '<div class="sheet-section"><div class="section-label">엘리베이터</div>';
    if (data) {
      var ordered = ES() && ES().sortForDisplay ? ES().sortForDisplay(elevs) : elevs; // 멈춘 것 먼저 (REQ-COM-005)
      html += '<div class="elev-list">' + ordered.map(function (e) {
        var down = isDown(e);
        var metaParts = [];
        if (ELEV_TYPE_TEXT[e.type]) metaParts.push(ELEV_TYPE_TEXT[e.type]);
        if (e.floors) metaParts.push(e.floors);
        var unk = e.status === 'UNKNOWN';
        return '<div class="elev-item' + (down ? ' down' : '') + '">' +
          '<div class="elev-icon">' + icon(unk ? 'help' : (down ? 'cancel' : 'check_circle'), 'lg') + '</div>' +
          '<div class="elev-body" style="flex:1;min-width:0">' +
            '<div class="elev-loc">' + escapeHtml(e.location) +
              ' <span class="muted">· ' + escapeHtml(ELEV_STATUS_TEXT[e.status] || e.status) + '</span></div>' +
            '<div class="elev-meta">' + escapeHtml(metaParts.join(' · ')) + '</div>' +
            ((down || unk) && e.reason ? '<div class="elev-reason">' + escapeHtml(showTimesIn(e.reason)) + '</div>' : '') +
          '</div>' +
          '</div>';
      }).join('') + '</div>';
    } else if (live && elevState === 'loading') {
      html += '<div class="empty">엘리베이터 정보를 확인 중이에요</div>';
    } else if (live && elevState === 'error') {
      html += '<div class="empty">연결 실패 · 엘리베이터 정보를 가져오지 못했어요. 상태는 정보 없음으로 봐 주세요</div>';
    } else if (live && elevState === 'unmapped') {
      html += '<div class="empty">이 역은 서버와 연결된 정보가 없어요 (정보 없음)</div>';
    } else {
      html += '<div class="empty">이 역은 엘리베이터 데이터가 아직 없어요</div>';
    }
    html += '</div>';
    var elevSection = html.slice(elevStart);
    html = html.slice(0, elevStart);

    if (problem || status === 'UNKNOWN') {
      html += '<div class="sheet-section">' + accessibleRouteHtml(id) + '</div>';
    }

    html += elevSection;

    // 문제 역에서는 접근성 확인, 나머지는 출발 계산만 강조한다 (REQ-COM-006)
    html += '<div class="sheet-section btn-stack">' +
      '<button type="button" class="btn ' + (problem ? 'btn-ghost' : 'btn-primary') + ' btn-block btn-main" data-act="calc-time">' + icon('schedule') + '이 역까지 출발 시각 계산</button>' +
      '<button type="button" class="btn btn-ghost btn-block" data-act="ask-ai">' + icon('smart_toy') + 'AI에게 물어보기</button>' +
      '</div>';

    setSheetHtml(html, keepScroll);
  }

  // 시연 제어판의 "선택한 역" 항목. 데스크톱 패널(#demoStation)과 모바일 시연 시트가 함께 쓴다.
  function demoStationHtml() {
    var id = demoStationId;
    if (apiMode()) return ''; // 실데이터 모드에는 가상 고장 전환을 두지 않는다
    var st = id ? getStation(id) : null;
    var html = '<div class="section-label">선택한 역</div>';
    if (!st) return html + '<div class="muted">지도에서 역을 선택하세요</div>';
    var elevs = getElevators(id);
    html += '<div class="demo-station-name">' + escapeHtml(yeok(st)) + ' ' + lineBadges(st) + '</div>' +
      '<div class="demo-station-actions">' +
        '<button type="button" class="btn btn-sm btn-danger" data-demo-act="demo-station-broken" data-act="demo-station-broken" data-broken="1">이 역 전체 고장</button>' +
        '<button type="button" class="btn btn-sm btn-ghost" data-demo-act="demo-station-broken" data-act="demo-station-broken" data-broken="0">이 역 전체 복구</button>' +
      '</div>';
    if (!elevs.length) return html + '<div class="muted">엘리베이터 데이터가 없는 역이에요</div>';
    html += '<div class="demo-elev-list">' + elevs.map(function (e) {
      var down = isDown(e);
      return '<div class="demo-elev-row">' +
        '<div class="demo-elev-loc">' + escapeHtml(e.location) +
          ' <span class="muted">· ' + escapeHtml(ELEV_STATUS_TEXT[e.status] || e.status) + '</span></div>' +
        '<button type="button" class="btn btn-sm ' + (down ? 'btn-ghost' : 'btn-danger') +
          '" data-demo-act="demo-toggle-elev" data-act="demo-toggle-elev" data-elev="' + escapeHtml(e.id) + '">' + (down ? '복구' : '고장') + '</button>' +
        '</div>';
    }).join('') + '</div>';
    return html;
  }

  function renderDemoPanelStation() {
    var box = byId('demoStation');
    if (box) box.innerHTML = demoStationHtml();
  }

  function selectDemoStation(id) {
    demoStationId = id;
    renderDemoPanelStation();
  }

  // 시연 제어판의 선택한 역 버튼 처리. 처리했으면 true.
  function onDemoStationAction(btn) {
    var act = btn.getAttribute('data-demo-act') || btn.getAttribute('data-act');
    var sid = demoStationId;
    var es = ES();
    if (!sid || !es) return false;
    if (act === 'demo-toggle-elev') {
      if (!es.toggleElevator) return true;
      var eid = btn.getAttribute('data-elev');
      mapCall('clearHighlights');
      var el = es.toggleElevator(sid, eid);
      toast(yeok(sid) + (el ? ' ' + el.location : '') + ' 엘리베이터가 ' +
        (el && isDown(el) ? '고장 상태로 전환되었어요' : '복구되었어요'));
      return true;
    }
    if (act === 'demo-station-broken') {
      if (!es.setStationBroken) return true;
      var broken = btn.getAttribute('data-broken') === '1';
      es.setStationBroken(sid, broken);
      toast(yeok(sid) + ' 엘리베이터가 ' + (broken ? '모두 고장 상태로 전환되었어요' : '모두 복구되었어요'));
      mapCall('clearHighlights');
      return true;
    }
    return false;
  }

  function renderDemoSheet() {
    var scenarios = MOCKDATA().demoScenarios || [];
    var fs = document.body.classList.contains('fullscreen');
    if (apiMode()) {
      setSheetHtml('<div class="sheet-header"><div class="sheet-title">' + icon('settings', 'lg') + ' 시연 제어판</div></div>' +
        '<div class="sheet-section btn-stack">' +
        '<button type="button" class="btn btn-ghost btn-block" data-demo-act="demo-fullscreen" data-act="demo-fullscreen">' + fullscreenLabel(fs) + '</button></div>', sheet.mode === 'demo');
      return;
    }
    var html = '<div class="sheet-header"><div class="sheet-title">' + icon('settings', 'lg') + ' 시연 제어판</div>' +
      '<div class="muted">엘리베이터 고장 상황을 만들어 접근성 확인 안내를 살펴보세요.</div></div>' +
      '<div class="sheet-section"><div class="section-label">시연 시나리오</div><div class="btn-stack">' +
      scenarios.map(function (s) {
        return '<button type="button" class="btn btn-ghost btn-block" data-demo-act="demo-scenario" data-act="demo-scenario" data-id="' +
          escapeHtml(s.stationId || s.id) + '">' + escapeHtml(s.label) + '</button>';
      }).join('') +
      '</div></div>' +
      '<div class="sheet-section">' + demoStationHtml() + '</div>' +
      '<div class="sheet-section btn-stack">' +
      '<button type="button" class="btn btn-ghost btn-block" data-demo-act="demo-reset" data-act="demo-reset">' + icon('restart_alt') + '전체 상태 초기화</button>' +
      '<button type="button" class="btn btn-ghost btn-block" data-demo-act="demo-fullscreen" data-act="demo-fullscreen">' + fullscreenLabel(fs) + '</button>' +
      '</div>';
    setSheetHtml(html, sheet.mode === 'demo');
  }

  function openDemoSheet() {
    sheet.mode = 'demo';
    sheet.stationId = null;
    renderDemoSheet();
    openSheetShell('auto');
  }

  function refreshSheet() {
    if (!sheet.open) return;
    if (sheet.mode === 'station') renderStationSheet(true);
    else if (sheet.mode === 'demo') renderDemoSheet();
    applySheet(); // 우회 경로 버튼이 생기거나 없어지면 요약 높이도 바뀐다
  }

  function onSheetAction(e) {
    var btn = e.target.closest('[data-act]');
    if (!btn) return;
    var act = btn.getAttribute('data-demo-act') || btn.getAttribute('data-act');
    var sid = sheet.stationId;
    if (onDemoStationAction(btn)) return;
    switch (act) {
      case 'check-accessibility':
        setSheetState('full');
        break;
      case 'close-sheet':
        closeSheet();
        break;
      case 'detour':
        mapCall('clearHighlights');
        toast('접근 가능한 이동 경로는 확인이 필요해요');
        break;
      case 'open-station':
        openStation(btn.getAttribute('data-id'));
        break;
      case 'calc-time': {
        var originSel = byId('originSelect');
        var origin = originSel ? originSel.value : '';
        var opts = { destId: sid };
        if (!origin || origin === sid) opts.originId = sid === 'sindorim' ? 'gangnam' : 'sindorim';
        openTime(opts);
        break;
      }
      case 'ask-ai': {
        var name = yeok(sid);
        closeSheet();
        switchTab('chat');
        sendChat(name + ' 엘리베이터 돼?');
        break;
      }
      case 'demo-scenario':
        runScenario(btn.getAttribute('data-id'));
        break;
      case 'demo-reset':
        resetDemo();
        break;
      case 'demo-fullscreen':
        toggleFullscreen();
        break;
      default:
        break;
    }
  }

  function initSheet() {
    var bd = byId('sheetBackdrop');
    var bs = byId('bottomSheet');
    var content = byId('sheetContent');
    // 막은 다른 시트(시연 제어판 등)에만 있다. 누르면 닫힌다
    if (bd) bd.addEventListener('click', function () { if (sheet.state === 'auto') closeSheet(); else setSheetState('peek'); });
    if (content) content.addEventListener('click', onSheetAction);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && sheet.open) closeSheet();
    });
    window.addEventListener('resize', function () { if (sheet.open) applySheet(); });
    if (!bs) return;

    // 손잡이를 누르면 요약 ↔ 펼침 (REQ-COM-004)
    var handle = byId('sheetHandle');
    var suppressClick = false;
    if (handle) handle.addEventListener('click', function () {
      if (suppressClick) { suppressClick = false; return; }
      if (sheet.state === 'peek') setSheetState('full');
      else if (sheet.state === 'full') setSheetState('peek');
    });

    // 끌기: 위로 끌면 펼침, 아래로 끌면 요약, 요약에서 더 끌면 닫힘. 닫기는 아래로 끌기로만
    //   역 시트 요약일 때는 시트 어디를 끌어도 되고, 펼침일 때는 손잡이·머리 부분만(내용은 스크롤)
    var drag = null;
    bs.addEventListener('pointerdown', function (e) {
      if (!sheet.open || (e.pointerType === 'mouse' && e.button !== 0)) return;
      var onHandle = !!e.target.closest('.sheet-handle');
      if (!onHandle && e.target.closest('button, a, input, select, label')) return;
      var head = onHandle || e.target.closest('.sheet-header');
      if (!head && sheet.state !== 'peek') return;
      var m = sheetMetrics();
      drag = { startY: e.clientY, dy: 0, id: e.pointerId, moved: false, m: m, base: sheetY(sheet.state, m) };
      // 끄는 동안 손가락이 시트 밖으로 나가도 따라가도록 화면 전체에서 받는다
      window.addEventListener('pointermove', onDragMove, true);
      window.addEventListener('pointerup', endDrag, true);
      window.addEventListener('pointercancel', endDrag, true);
    });
    function onDragMove(e) {
      if (!drag || e.pointerId !== drag.id) return;
      drag.dy = e.clientY - drag.startY;
      if (!drag.moved && Math.abs(drag.dy) < 6) return;
      drag.moved = true;
      bs.style.transition = 'none';
      var y = sheet.state === 'auto' ? Math.max(0, drag.dy) : Math.max(0, drag.base + drag.dy);
      bs.style.setProperty('--sheet-y', y + 'px');
      e.preventDefault();
      e.stopPropagation(); // 끄는 동안 지도가 같이 움직이지 않게
    }
    function endDrag(e) {
      if (!drag || (e && e.pointerId !== drag.id)) return;
      var d = drag;
      drag = null;
      window.removeEventListener('pointermove', onDragMove, true);
      window.removeEventListener('pointerup', endDrag, true);
      window.removeEventListener('pointercancel', endDrag, true);
      bs.style.transition = '';
      if (!d.moved) return; // 그냥 누른 것: 손잡이는 click에서 처리
      suppressClick = true;
      setTimeout(function () { suppressClick = false; }, 0);
      var dy = d.dy;
      if (sheet.state === 'auto') { if (dy > 80) closeSheet(); else applySheet(); return; }
      if (sheet.state === 'full') { setSheetState(dy > 60 ? 'peek' : 'full'); return; }
      // 요약
      if (dy < -40) setSheetState('full');
      else if (dy > 60) closeSheet();
      else applySheet();
    }

    // 요약에서 내용을 위로 밀면(휠) 펼침
    if (content) content.addEventListener('wheel', function (e) {
      if (sheet.state === 'peek' && e.deltaY > 0) { e.preventDefault(); setSheetState('full'); }
    }, { passive: false });
  }

  // ---------------------------------------------------------------------------
  // 엘리베이터 탭
  // ---------------------------------------------------------------------------
  // 필터 바: 네 버튼 중 하나만 선택. 'lines'는 호선 ▼에서 여러 호선을 고른 상태 (REQ-ELV-001)
  var elevFilter = 'all';
  var elevLines = [];
  var ELEV_FILTERS = [
    { id: 'all', label: '전체역' },
    { id: 'problem', label: '고장·점검' },
    { id: 'transfer', label: '환승역' }
  ];

  // 버튼 문구: 호선 / 2호선 / 2·4호선 / 2·4 외 1
  function elevLinesLabel() {
    var n = elevLines.length;
    if (!n) return '호선';
    if (n === 1) return elevLines[0] + '호선';
    if (n === 2) return elevLines[0] + '·' + elevLines[1] + '호선';
    return elevLines[0] + '·' + elevLines[1] + ' 외 ' + (n - 2);
  }

  function renderElevatorFilter() {
    var f = byId('elevatorFilter');
    if (!f) return;
    $all('.filter-tab', f).forEach(function (t) {
      var on = t.getAttribute('data-filter') === elevFilter;
      t.classList.toggle('active', on);
      t.setAttribute('aria-pressed', String(on));
    });
    var label = $('#elevLineBtn .tab-label', f);
    if (label) label.textContent = elevLinesLabel();
    $all('#elevLinePanel [data-line]', f).forEach(function (c) {
      var on = elevLines.indexOf(c.getAttribute('data-line')) >= 0;
      c.classList.toggle('active', on);
      c.setAttribute('aria-pressed', String(on));
    });
  }

  // 호선 칩 두 줄: 필터 탭 아래로 펼쳐 목록을 밀어낸다. 목록을 가리지 않는다 (REQ-ELV-005)
  function elevLinePanelHtml() {
    var lines = MOCKDATA().lines || {};
    return '<div id="elevLinePanel" class="line-panel" role="group" aria-label="호선 고르기" hidden>' +
      Object.keys(lines).sort(function (x, y) { return x - y; }).map(function (id) {
        return '<button type="button" class="line-chip" data-line="' + escapeHtml(id) + '" aria-pressed="false">' +
          '<span class="line-dot" style="background:' + escapeHtml(lines[id].color) + '"></span>' + escapeHtml(lines[id].name) + '</button>';
      }).join('') + '</div>';
  }

  function setElevLinePanel(open) {
    var p = byId('elevLinePanel'), btn = byId('elevLineBtn');
    if (!p || !btn) return;
    p.hidden = !open;
    btn.setAttribute('aria-expanded', String(open));
  }

  function setElevFilter(id) {
    elevFilter = id;
    if (id !== 'lines') elevLines = [];
    renderElevatorFilter();
    renderElevatorList();
  }

  // 호선을 누르는 즉시 반영. 드롭다운은 열린 채로 둔다. 모두 해제하면 전체역
  function toggleElevLine(id) {
    var i = elevLines.indexOf(id);
    if (i >= 0) elevLines.splice(i, 1); else elevLines.push(id);
    elevLines.sort(function (a, b) { return a - b; });
    setElevFilter(elevLines.length ? 'lines' : 'all');
  }
  var CUSTOM_FILTER_KEY = 'elevSubway.elevFilters.v1';
  var elevCustomFilters = [];

  function loadElevCustomFilters() {
    try {
      var saved = JSON.parse(sessionStorage.getItem(CUSTOM_FILTER_KEY) || '[]');
      return Array.isArray(saved) ? saved.filter(function (id, i) { return typeof id === 'string' && !!(MOCKDATA().lines || {})[id] && saved.indexOf(id) === i; }) : [];
    } catch (e) { return []; }
  }

  function saveElevCustomFilters(filters) {
    try { sessionStorage.setItem(CUSTOM_FILTER_KEY, JSON.stringify(filters)); } catch (e) {}
  }

  function renderCustomFilterChips() {
    var slot = byId('customFilterChips');
    if (!slot) return;
    var addButton = byId('addFilterBtn');
    var auth = AUTH();
    var session = auth ? auth.getSession() : null;
    if (!session) {
      var hadFilters = elevCustomFilters.length > 0;
      elevCustomFilters = [];
      if (hadFilters) { saveElevCustomFilters([]); renderElevatorList(); }
      slot.hidden = true;
      slot.innerHTML = '';
      if (addButton) addButton.hidden = true;
      requestAnimationFrame(updateFilterOverflow);
      return;
    }
    elevCustomFilters = loadElevCustomFilters();
    slot.hidden = false;
    if (addButton) addButton.hidden = false;
    slot.innerHTML = elevCustomFilters.map(function (lineId) {
        var l = getLine(lineId);
        return '<span class="custom-filter-chip" data-custom-filter="' + escapeHtml(lineId) + '" ' +
          'style="--line-color:' + escapeHtml(l.color) + '">' +
          '<span class="custom-filter-dot" aria-hidden="true"></span>' +
          escapeHtml(l.name) +
          '<button type="button" class="chip-x" data-remove-filter="' + escapeHtml(lineId) + '" aria-label="' + escapeHtml(l.name) + ' 필터 제거">×</button>' +
          '</span>';
      }).join('');
    renderElevatorList();
    requestAnimationFrame(updateFilterOverflow);
  }

  function updateFilterOverflow() {
    var scroller = byId('elevatorFilterScroll');
    var fade = byId('elevatorFilterFade');
    if (!scroller || !fade) return;
    var remaining = scroller.scrollWidth - scroller.clientWidth - scroller.scrollLeft;
    fade.hidden = remaining <= 1;
  }

  function openFilterPicker() {
    if (!AUTH() || !AUTH().getSession()) return;
    sheet.mode = 'filter';
    sheet.stationId = null;
    var lines = MOCKDATA().lines || {};
    var lineIds = Object.keys(lines);
    var html = '<div id="filterPicker"><div class="sheet-header">' +
      '<div class="sheet-title">노선 필터 추가</div>' +
      '<div class="card-sub">노선을 선택하면 해당 노선 역만 표시됩니다</div>' +
      '</div>' +
      '<div class="sheet-section">' +
      '<div class="filter-picker-grid">' +
      lineIds.map(function (id) {
        var l = getLine(id);
        var sel = elevCustomFilters.indexOf(id) >= 0;
        return '<button type="button" class="filter-picker-chip' + (sel ? ' selected' : '') + '" ' +
          'data-pick-line="' + escapeHtml(id) + '" style="--line-color:' + escapeHtml(l.color) + '">' +
          '<span class="filter-picker-dot"></span>' + escapeHtml(l.name) + '</button>';
      }).join('') +
      '</div></div>' +
      '<div class="sheet-section">' +
      '<button type="button" class="btn btn-primary btn-block" id="filterPickerDone">적용</button>' +
      '</div></div>';
    setSheetHtml(html, false);
    openSheetShell('auto');
    var content = byId('filterPicker');
    if (content) {
      content.addEventListener('click', function (e) {
        var chip = e.target.closest('[data-pick-line]');
        if (chip) {
          chip.classList.toggle('selected');
          return;
        }
        if (e.target.closest('#filterPickerDone')) {
          if (!AUTH() || !AUTH().getSession()) { closeSheet(); return; }
          var selected = $all('.filter-picker-chip.selected', content).map(function (el) {
            return el.getAttribute('data-pick-line');
          });
          elevCustomFilters = selected;
          saveElevCustomFilters(elevCustomFilters);
          closeSheet();
          renderCustomFilterChips();
          renderElevatorList();
        }
      });
    }
  }


  var STATUS_RANK = { UNAVAILABLE: 0, PARTIAL: 1, AVAILABLE: 2, UNKNOWN: 3 };

  function initElevatorTab() {
    var f = byId('elevatorFilter');
    if (f) {
      // 밑줄 탭 네 칸 (REQ-ELV-006) + 그 아래 호선 칩 (REQ-ELV-005)
      f.innerHTML = '<div id="elevatorFilterScroll" class="elevator-filter-scroll" tabindex="0" role="region" aria-label="엘리베이터 필터 좌우 스크롤"><div class="elevator-filter-inner"><div class="filter-tabs-row">' + ELEV_FILTERS.map(function (x) {
        return '<button type="button" class="filter-tab" data-filter="' + x.id + '" aria-pressed="false">' + escapeHtml(x.label) + '</button>';
      }).join('') +
        '<button type="button" id="elevLineBtn" class="filter-tab" data-filter="lines" aria-pressed="false" aria-expanded="false" aria-controls="elevLinePanel">' +
          '<span class="tab-label">호선</span>' + icon('expand_more') + '</button>' +
        '</div><span id="customFilterChips" class="custom-filter-slot" hidden></span></div></div>' +
        '<span id="elevatorFilterFade" class="filter-fade" aria-hidden="true" hidden></span>' +
        '<button type="button" class="chip-add-btn" id="addFilterBtn" hidden>' + icon('add') + '노선</button>' + elevLinePanelHtml();
      byId('elevatorFilterScroll').addEventListener('scroll', updateFilterOverflow, { passive: true });
      if (typeof ResizeObserver !== 'undefined') new ResizeObserver(updateFilterOverflow).observe(byId('elevatorFilterScroll'));
      f.addEventListener('click', function (e) {
        var remove = e.target.closest('[data-remove-filter]');
        if (remove) {
          elevCustomFilters = elevCustomFilters.filter(function (id) { return id !== remove.getAttribute('data-remove-filter'); });
          saveElevCustomFilters(elevCustomFilters);
          renderCustomFilterChips();
          renderElevatorList();
          return;
        }
        if (e.target.closest('#addFilterBtn')) { openFilterPicker(); return; }

        var chip = e.target.closest('#elevLinePanel [data-line]');
        if (chip) { toggleElevLine(chip.getAttribute('data-line')); return; }
        var tab = e.target.closest('.filter-tab');
        if (!tab) return;
        if (tab.id === 'elevLineBtn') { setElevLinePanel(byId('elevLinePanel').hidden); return; }
        setElevLinePanel(false);
        setElevFilter(tab.getAttribute('data-filter'));
      });
      renderElevatorFilter();
    }
    var list = byId('elevatorList');
    if (list) {
      list.addEventListener('click', function (e) {
        var row = e.target.closest('.station-row[data-id]');
        if (row) openStation(row.getAttribute('data-id'));
      });
      list.addEventListener('keydown', function (e) {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        var row = e.target.closest('.station-row[data-id]');
        if (row) { e.preventDefault(); openStation(row.getAttribute('data-id')); }
      });
    }
    renderCustomFilterChips();
    renderElevatorTab();
  }

  function dataStations() {
    // 실데이터 모드에서는 상태를 모르는 역도 "정보 없음"으로 목록에 둔다
    var live = apiMode();
    return allStations().filter(function (s) { return live || hasData(s.id); }).map(function (s) {
      var elevs = getElevators(s.id);
      return { station: s, status: stationStatus(s.id), total: elevs.length, down: elevs.filter(isDown).length };
    });
  }

  // 엘리베이터 정보 기준 시각. 목업에는 갱신 시각이 없어 앱을 연 시각, 상태가 바뀌면 그 시각 (REQ-ELV-003)
  var elevUpdatedAt = new Date();
  function renderElevUpdated() {
    var el = byId('elevUpdated');
    if (!el) return;
    if (!apiMode()) { el.textContent = showTime(nowHHMM(elevUpdatedAt)) + ' 기준'; return; }
    // 실데이터 모드: 앱을 연 시각이 아니라 서버가 설비 상태를 가져온 시각을 보여 준다
    var ls = liveState(), es = ES();
    if (ls.phase === 'loading') { el.textContent = '확인 중'; return; }
    if (ls.phase === 'error') { el.textContent = '연결 실패'; return; }
    el.textContent = (es && es.getDataTime ? showBeTime(es.getDataTime()) : null) || '갱신 시각 없음';
  }

  // 멈춘 엘리베이터 위치: "8-1번 출구", 여러 대면 "8-1번 출구 외 1곳" (데이터 순서의 첫 위치). 없으면 ''
  //   엘리베이터 탭 목록(REQ-ELV-004)과 출발계산 타임라인(REQ-TIME-004)이 같이 쓴다
  function stoppedWhere(stationId) {
    var stopped = getElevators(stationId).filter(isDown);
    return stopped.length ? stopped[0].location + (stopped.length > 1 ? ' 외 ' + (stopped.length - 1) + '곳' : '') : '';
  }

  function renderElevatorTab() {
    renderElevUpdated();
    renderElevatorSummary();
    renderElevatorList();
  }

  function renderElevatorSummary() {
    var el = byId('elevatorSummary');
    if (!el) return;
    var items = dataStations();
    var counts = { AVAILABLE: 0, PARTIAL: 0, UNAVAILABLE: 0, UNKNOWN: 0 };
    items.forEach(function (x) { if (counts[x.status] !== undefined) counts[x.status]++; });
    var cards = [
      { key: 'AVAILABLE', cls: 'ok' },
      { key: 'PARTIAL', cls: 'warn' },
      { key: 'UNAVAILABLE', cls: 'bad' }
    ];
    // 보여 주기만 하는 카드. 숫자는 필터와 상관없이 전체 기준이다.
    if (apiMode()) {
      var lsum = liveState();
      if (lsum.phase !== 'ready') {
        el.innerHTML = '<div class="empty">' + (lsum.phase === 'loading' ? '엘리베이터 상태를 확인 중이에요' : '연결 실패 · 모든 역을 정보 없음으로 표시해요') + '</div>';
        return;
      }
    }
    el.innerHTML = cards.map(function (c) {
      return '<div class="summary-card ' + c.cls + '">' +
        '<div class="summary-icon">' + icon(statusIcon(c.key)) + '</div>' +
        '<div class="summary-label">' + escapeHtml(statusLabel(c.key)) + '</div>' +
        '<div class="summary-body"><span class="summary-num">' + counts[c.key] + '</span><span class="summary-unit">역</span></div></div>';
    }).join('') + (apiMode() ? '<div class="summary-unknown-note muted">' + escapeHtml(statusLabel('UNKNOWN')) + ' ' + counts.UNKNOWN + '역</div>' : '');
  }

  function renderElevatorList() {
    var el = byId('elevatorList');
    if (!el) return;
    // 엘리베이터 정보가 있는 역만 (dataStations)
    var items = dataStations().filter(function (x) {
      var lines = x.station.lines || [];
      if (elevCustomFilters.length && !lines.some(function (id) { return elevCustomFilters.indexOf(id) >= 0; })) return false;
      switch (elevFilter) {
        case 'problem': return x.down > 0; // 이용 불가 또는 점검 중인 엘리베이터가 하나라도
        case 'transfer': return lines.length > 1;
        case 'lines': return lines.some(function (l) { return elevLines.indexOf(l) >= 0; });
        default: return true;
      }
    });
    items.sort(function (a, b) {
      var r = (STATUS_RANK[a.status] || 0) - (STATUS_RANK[b.status] || 0);
      return r !== 0 ? r : koCompare(a.station.name, b.station.name);
    });
    if (!items.length) {
      el.innerHTML = '<div class="empty">선택한 조건에 맞는 역이 없어요</div>';
      return;
    }
    // 한 줄: 역 이름 + 노선 | 상태 아이콘 + 운행/전체대 | ›, 멈춘 엘리베이터가 있으면 둘째 줄에 위치 (REQ-ELV-004)
    el.innerHTML = items.map(function (x) {
      var s = x.station;
      var up = x.total - x.down;
      var where = stoppedWhere(s.id);
      var unk = x.status === 'UNKNOWN';
      var sentence = yeok(s) + ', ' + (s.lines || []).join(', ') + '호선, ' + (unk ? '엘리베이터 정보 없음' : '엘리베이터 ' + x.total + '대 중 ' + up + '대 운행') +
        (where ? ', 멈춤 ' + where : '');
      return '<div class="station-row elev-row" data-id="' + escapeHtml(s.id) + '" role="button" tabindex="0" aria-label="' + escapeHtml(sentence) + '">' +
        '<div class="elev-row-name" aria-hidden="true"><strong>' + escapeHtml(yeok(s)) + '</strong> ' + lineBadges(s) + '</div>' +
        '<div class="elev-row-op ' + (STATUS_CLASS[x.status] || 'unknown') + '" aria-hidden="true">' + icon(statusIcon(x.status)) +
          (unk ? '<span>' + escapeHtml(statusLabel('UNKNOWN')) + '</span>' : '<span><b>' + up + '</b>/' + x.total + '대</span>') + '</div>' +
        '<span class="chevron ms" aria-hidden="true">chevron_right</span>' +
        (where ? '<div class="elev-row-stop" aria-hidden="true">멈춤: ' + escapeHtml(where) + '</div>' : '') +
        '</div>';
    }).join('');
  }

  // ---------------------------------------------------------------------------
  // 출발 시각 계산 탭
  // ---------------------------------------------------------------------------
  function defaultArriveBy() {
    var d = new Date(Date.now() + 60 * 60000);
    var mins = d.getHours() * 60 + d.getMinutes();
    mins = Math.ceil(mins / 10) * 10;
    mins = mins % (24 * 60);
    return pad2(Math.floor(mins / 60)) + ':' + pad2(mins % 60);
  }

  function hasOption(sel, value) {
    if (!sel || !value) return false;
    for (var i = 0; i < sel.options.length; i++) if (sel.options[i].value === value) return true;
    return false;
  }

  // 도착 희망 시각: 오전/오후 · 시 · 분을 따로 고른다. 고른 값은 숨은 #arriveBy에 HH:MM으로 둔다. (REQ-DS-009)
  var ARRIVE_PICKER = ['arriveAmpm', 'arriveHour', 'arriveMin'];
  function initArrivePicker() {
    var h = byId('arriveHour'), m = byId('arriveMin'), i, html;
    if (h) { html = ''; for (i = 1; i <= 12; i++) html += '<option value="' + i + '">' + i + '</option>'; h.innerHTML = html; }
    if (m) { html = ''; for (i = 0; i < 60; i += 5) html += '<option value="' + pad2(i) + '">' + pad2(i) + '</option>'; m.innerHTML = html; }
    ARRIVE_PICKER.forEach(function (id) {
      var el = byId(id);
      if (el) el.addEventListener('change', readArrivePicker);
    });
  }
  function readArrivePicker() {
    var a = byId('arriveAmpm'), h = byId('arriveHour'), m = byId('arriveMin'), out = byId('arriveBy');
    if (!a || !h || !m || !out) return;
    var hour = (parseInt(h.value, 10) % 12) + (a.value === '오후' ? 12 : 0);
    out.value = pad2(hour) + ':' + m.value;
  }
  function setArriveBy(hhmm) {
    var tc = TC();
    var p = tc && tc.displayParts ? tc.displayParts(hhmm) : null;
    if (!p) return;
    var hm = p.time.split(':');
    var a = byId('arriveAmpm'), h = byId('arriveHour'), m = byId('arriveMin');
    if (a) a.value = p.ampm;
    if (h) h.value = hm[0];
    if (m) {
      // 5분 단위가 아닌 시각(예: 챗봇이 넘긴 3:07)은 그 분을 목록에 끼워 넣는다
      if (!hasOption(m, hm[1])) {
        var opt = document.createElement('option'), before = null;
        opt.value = hm[1]; opt.textContent = hm[1];
        for (var k = 0; k < m.options.length; k++) if (m.options[k].value > hm[1]) { before = m.options[k]; break; }
        m.insertBefore(opt, before);
      }
      m.value = hm[1];
    }
    readArrivePicker();
  }

  // 계산 방식: 도착 시각 맞추기 | 지금 출발. 지금 출발이면 도착 시각 입력칸을 숨긴다 (REQ-TIME-002)
  function syncTimeMode() {
    var modeNow = byId('modeNow');
    var now = !!(modeNow && modeNow.checked);
    $all('#timeMode .seg-btn').forEach(function (b) {
      b.setAttribute('aria-checked', String((b.getAttribute('data-mode') === 'now') === now));
    });
    var row = $('#timeForm .time-row');
    if (row) row.hidden = now;
  }

  // ---------- 출발역·도착역 고르기: 역 검색 시트 (REQ-TIME-001) ----------
  var RECENT_KEY = 'ev.recentStations';
  function recentStations() {
    try {
      var ids = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
      return Array.isArray(ids) ? ids.filter(function (id) { return !!getStation(id); }) : [];
    } catch (e) { return []; }
  }
  function rememberStation(id) {
    var ids = recentStations().filter(function (x) { return x !== id; });
    ids.unshift(id);
    try { localStorage.setItem(RECENT_KEY, JSON.stringify(ids.slice(0, 5))); } catch (e) { /* 저장 못 하면 넘어간다 */ }
  }

  var stationCombos = {};

  function renderStationFields() {
    ['origin', 'dest'].forEach(function (role) {
      var sel = byId(role + 'Select');
      if (sel && stationCombos[role]) stationCombos[role].set(sel.value);
    });
  }

  function initStationCombo(role) {
    var input = byId(role + 'Search'), results = byId(role + 'Results'), select = byId(role + 'Select');
    if (!input || !results || !select) return null;
    var current = [], active = -1;
    input.setAttribute('aria-controls', results.id);
    input.setAttribute('aria-autocomplete', 'list');
    function close() {
      results.hidden = true;
      input.setAttribute('aria-expanded', 'false');
      input.removeAttribute('aria-activedescendant');
      active = -1;
    }
    function mark(index) {
      active = index;
      $all('[role="option"]', results).forEach(function (el, i) {
        el.classList.toggle('active', i === active);
        el.setAttribute('aria-selected', String(i === active));
        if (i === active) {
          input.setAttribute('aria-activedescendant', el.id);
          el.scrollIntoView({ block: 'nearest' });
        }
      });
    }
    function render(q) {
      var recent = !q ? recentStations().slice(0, 5) : [];
      current = q ? searchStations(q) : allStations().sort(function (a, b) {
        var ai = recent.indexOf(a.id), bi = recent.indexOf(b.id);
        if (ai >= 0 || bi >= 0) return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi);
        return koCompare(a.name, b.name);
      });
      active = -1;
      input.removeAttribute('aria-activedescendant');
      results.innerHTML = current.length ? current.map(function (st, i) {
        return '<div id="' + role + '-option-' + i + '" class="combo-item" data-id="' + escapeHtml(st.id) + '" role="option" aria-selected="false">' +
          '<span class="combo-name">' + escapeHtml(yeok(st)) + (recent.indexOf(st.id) >= 0 ? '<small class="muted"> · 최근</small>' : '') + '</span>' +
          '<span class="combo-badges">' + lineBadges(st) + '<span class="combo-status ' + (STATUS_CLASS[stationStatus(st.id)] || 'unknown') + '" role="img" aria-label="엘리베이터 ' + escapeHtml(statusLabel(stationStatus(st.id))) + '">' + icon(statusIcon(stationStatus(st.id))) + '</span></span></div>';
      }).join('') : '<div class="combo-empty">역을 찾지 못했어요</div>';
      results.hidden = false;
      input.setAttribute('aria-expanded', 'true');
    }
    function set(id) {
      var st = getStation(id);
      select.value = st && hasOption(select, id) ? id : '';
      input.value = st ? yeok(st) : '';
      close();
    }
    function pick(id) { set(id); if (select.value) rememberStation(id); }
    input.addEventListener('focus', function () { input.select(); render(''); });
    input.addEventListener('click', function () { if (results.hidden) render(''); });
    input.addEventListener('input', function () { select.value = ''; render(input.value.trim()); });
    input.addEventListener('blur', close);
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { e.preventDefault(); close(); return; }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (results.hidden) render(select.value ? '' : input.value.trim());
        if (current.length) mark(active < 0 ? (e.key === 'ArrowUp' ? current.length - 1 : 0) : (active + (e.key === 'ArrowDown' ? 1 : -1) + current.length) % current.length);
      } else if (e.key === 'Enter' && !results.hidden) {
        e.preventDefault();
        var st = current[active >= 0 ? active : 0];
        if (st) pick(st.id);
      }
    });
    results.addEventListener('pointerdown', function (e) { e.preventDefault(); });
    results.addEventListener('click', function (e) {
      var item = e.target.closest('[data-id]');
      if (item) pick(item.getAttribute('data-id'));
    });
    close();
    return { set: set, close: close };
  }

  function initTimeTab() {
    var o = byId('originSelect'), d = byId('destSelect');
    var stations = allStations().sort(function (a, b) { return koCompare(a.name, b.name); });
    var opts = stations.map(function (s) {
      var shorts = (s.lines || []).map(function (l) { return getLine(l).short; }).join('·');
      return '<option value="' + escapeHtml(s.id) + '">' + escapeHtml(yeok(s)) +
        (shorts ? ' (' + escapeHtml(shorts) + ')' : '') + '</option>';
    }).join('');
    if (o) { o.innerHTML = opts; if (hasOption(o, 'sindorim')) o.value = 'sindorim'; }
    if (d) { d.innerHTML = opts; if (hasOption(d, 'gangnam')) d.value = 'gangnam'; }

    stationCombos.origin = initStationCombo('origin');
    stationCombos.dest = initStationCombo('dest');
    initArrivePicker();
    setArriveBy(defaultArriveBy());

    var swap = byId('swapBtn');
    if (swap && o && d) swap.addEventListener('click', function () {
      var t = o.value; o.value = d.value; d.value = t;
      renderStationFields();
    });
    renderStationFields();
    var modeNow = byId('modeNow'), seg = byId('timeMode');
    if (seg && modeNow) seg.addEventListener('click', function (e) {
      var b = e.target.closest('.seg-btn');
      if (!b) return;
      modeNow.checked = b.getAttribute('data-mode') === 'now';
      syncTimeMode();
    });
    syncTimeMode();

    var form = byId('timeForm');
    if (form) form.addEventListener('submit', function (e) { e.preventDefault(); submitTime(); });

    var res = byId('timeResult');
    if (res) {
      res.innerHTML = '<div class="empty">출발역과 도착역, 도착 희망 시각을 정하고 계산해 보세요.</div>';
      res.addEventListener('click', function (e) {
        var btn = e.target.closest('[data-open-station]');
        if (btn) openStation(btn.getAttribute('data-open-station'));
      });
    }
  }

  function submitTime() {
    var o = byId('originSelect'), d = byId('destSelect'), arrive = byId('arriveBy'), modeNow = byId('modeNow');
    var res = byId('timeResult');
    if (!res || !o || !d) return;
    var originId = o.value, destId = d.value;
    if (!originId || !destId) { res.innerHTML = '<div class="empty">출발역과 도착역을 선택해 주세요.</div>'; return; }
    if (originId === destId) { res.innerHTML = '<div class="empty">출발역과 도착역이 같아요. 다른 역을 골라 주세요.</div>'; return; }
    var arriveBy = modeNow && modeNow.checked ? null : (arrive && arrive.value ? arrive.value : null);
    var tc = TC();
    if (!tc || !tc.calculateDeparture) { res.innerHTML = '<div class="empty">출발 시각 계산기를 불러오지 못했어요.</div>'; return; }
    var r = safe('calculateDeparture', function () {
      return tc.calculateDeparture({ originId: originId, destId: destId, arriveBy: arriveBy, now: new Date() });
    });
    if (!r) {
      res.innerHTML = '<div class="empty">경로를 찾지 못했어요. 다른 역 조합으로 다시 시도해 주세요.</div>';
      return;
    }
    res.innerHTML = renderTimeResult(r, originId, destId, arriveBy);
  }

  function renderTimeResult(r, originId, destId, arriveBy) {
    var html = '';
    var sub;
    if (r.late) {
      sub = '<div class="big-time-sub warn-text">희망 시각까지 도착이 어려워요 — 가장 빠른 도착 ' + escapeHtml(showTime(r.arriveAt)) + '</div>';
    } else if (typeof r.minutesFromNow === 'number' && r.minutesFromNow < 0) {
      sub = '<div class="big-time-sub warn-text">출발 시각이 ' + Math.abs(r.minutesFromNow) + '분 지났어요 — 지금 바로 출발하세요</div>';
    } else if (!r.minutesFromNow) {
      sub = '<div class="big-time-sub">지금 바로 출발하세요</div>';
    } else {
      sub = '<div class="big-time-sub">지금부터 ' + r.minutesFromNow + '분 후 출발하세요</div>';
    }
    var route = r.route || {};
    var info = [];
    if (r.boardAt) info.push('탑승 ' + escapeHtml(showTime(r.boardAt)));
    if (r.arriveAt) info.push('도착 ' + escapeHtml(showTime(r.arriveAt)));
    if (typeof route.transfers === 'number') info.push('환승 ' + route.transfers + '회');
    if (arriveBy) info.push('희망 ' + escapeHtml(showTime(arriveBy)));

    html += '<div class="card">' +
      '<div class="card-sub">' + escapeHtml(yeok(originId)) + ' → ' + escapeHtml(yeok(destId)) + ' · 집에서 출발 시각</div>' +
      '<div class="big-time">' + bigTimeHtml(r.leaveAt) + '</div>' + sub +
      (info.length ? '<div class="card-row muted">' + info.join(' · ') + '</div>' : '') +
      '</div>';

    (r.elevatorWarnings || []).forEach(function (w) {
      html += '<div class="card"><div class="card-title">' + icon('warning') + escapeHtml(yeok(w.stationId)) +
        ' 엘리베이터 ' + escapeHtml(statusLabel(w.status)) + '</div>' +
        accessibleRouteHtml(w.stationId, originId, destId) +
        '<button type="button" class="btn btn-sm btn-ghost" data-open-station="' + escapeHtml(w.stationId) + '">역 정보 보기</button></div>';
    });
    if (window.DepartureGraphic) {
      html += '<div class="card"><div class="card-title">출발부터 탑승까지</div>' +
        window.DepartureGraphic.render({ departureTime: showTime(r.leaveAt), boardingTime: showTime(r.boardAt), stationName: yeok(originId) }) + '</div>';
    }
    return html;
  }

  function openTime(opts) {
    opts = opts || {};
    closeSheet();
    switchTab('time');
    var o = byId('originSelect'), d = byId('destSelect'), arrive = byId('arriveBy'), modeNow = byId('modeNow');
    if (opts.originId && hasOption(o, opts.originId)) o.value = opts.originId;
    if (opts.destId && hasOption(d, opts.destId)) d.value = opts.destId;
    renderStationFields();
    if (Object.prototype.hasOwnProperty.call(opts, 'arriveBy')) {
      if (opts.arriveBy) {
        if (modeNow) modeNow.checked = false;
        setArriveBy(opts.arriveBy);
      } else if (modeNow) {
        modeNow.checked = true;
      }
      syncTimeMode();
    }
    submitTime();
    var scroller = $('#view-time .view-scroll');
    if (scroller) scroller.scrollTop = 0;
  }

  // ---------------------------------------------------------------------------
  // 챗봇 탭
  // ---------------------------------------------------------------------------
  var chatBusy = false;

  function scrollChat() {
    var m = byId('chatMessages');
    if (m) setTimeout(function () { m.scrollTop = m.scrollHeight; }, 0);
  }

  function formatText(t) {
    return escapeHtml(t || '').replace(/\n/g, '<br>');
  }

  function formatArgVal(v) {
    if (v === null || v === undefined || v === '') return null;
    if (Array.isArray(v)) return v.map(formatArgVal).filter(Boolean).join('·');
    if (typeof v === 'object') { try { return JSON.stringify(v); } catch (e) { return String(v); } }
    if (typeof v === 'string') { var s = getStation(v); return s ? s.name : v; }
    return String(v);
  }

  function formatToolCall(tc) {
    if (!tc) return '';
    var args = tc.args;
    var argStr = '';
    if (args && typeof args === 'object' && !Array.isArray(args)) {
      argStr = Object.keys(args).map(function (k) { return formatArgVal(args[k]); }).filter(Boolean).join(', ');
    } else {
      argStr = formatArgVal(args) || '';
    }
    return (tc.name || 'tool') + '(' + argStr + ')';
  }

  function appendUserMsg(text) {
    var m = byId('chatMessages');
    if (!m) return;
    var div = document.createElement('div');
    div.className = 'msg user';
    div.innerHTML = '<div class="bubble">' + formatText(text) + '</div>';
    m.appendChild(div);
    scrollChat();
  }

  function appendTyping() {
    var m = byId('chatMessages');
    if (!m) return null;
    var div = document.createElement('div');
    div.className = 'msg bot';
    div.innerHTML = '<div class="typing"><span></span><span></span><span></span></div>';
    m.appendChild(div);
    scrollChat();
    return div;
  }

  function runChatAction(a) {
    if (!a) return;
    var p = a.payload;
    switch (a.type) {
      case 'openStation':
        openStation(typeof p === 'object' && p ? (p.stationId || p.id) : p);
        break;
      case 'showAlternative':
        mapCall('clearHighlights');
        toast('접근 가능한 이동 경로는 확인이 필요해요');
        break;
      case 'openTime':
        openTime(p || {});
        break;
      default:
        console.warn('[App] 알 수 없는 action type:', a.type);
    }
  }

  function buildBotMsg(resp) {
    resp = resp || {};
    var div = document.createElement('div');
    div.className = 'msg bot';
    var html = '';
    (resp.toolCalls || []).forEach(function (tc) {
      html += '<div class="tool-chip">' + icon('build') + escapeHtml(formatToolCall(tc)) + '</div>';
    });
    if (resp.text) html += '<div class="bubble">' + formatText(resp.text) + '</div>';
    if (resp.html) html += resp.html; // AIAgent가 만든 신뢰된 카드 HTML
    var actions = (resp.actions || []).filter(function (a) { return a.type !== 'showAlternative'; });
    if (actions.length) {
      html += '<div class="msg-actions">' + actions.map(function (a, i) {
        // 우회 경로 보기는 핵심 동작이라 48px (REQ-DS-006)
        var main = a.type === 'showAlternative' ? ' btn-main' : '';
        return '<button type="button" class="btn btn-sm btn-ghost' + main + '" data-action-index="' + i + '">' + escapeHtml(a.label) + '</button>';
      }).join('') + '</div>';
    }
    div.innerHTML = html;
    $all('[data-action-index]', div).forEach(function (b) {
      b.addEventListener('click', function () { runChatAction(actions[+b.getAttribute('data-action-index')]); });
    });
    return div;
  }

  function renderSuggestions(list) {
    var s = byId('chatSuggestions');
    if (!s || !list || !list.length) return;
    s.innerHTML = list.map(function (t) {
      return '<button type="button" class="chip" data-suggest="' + escapeHtml(t) + '">' + escapeHtml(t) + '</button>';
    }).join('');
  }

  function appendBotResponse(resp, replaceNode) {
    var m = byId('chatMessages');
    if (!m) return;
    var node = buildBotMsg(resp);
    if (replaceNode && replaceNode.parentNode === m) m.replaceChild(node, replaceNode);
    else m.appendChild(node);
    renderSuggestions(resp && resp.suggestions);
    scrollChat();
  }

  function setChatDisabled(dis) {
    var input = byId('chatInput');
    var form = byId('chatForm');
    if (input) input.disabled = dis;
    if (form) $all('button', form).forEach(function (b) { b.disabled = dis; });
    $all('#chatSuggestions .chip').forEach(function (c) { c.disabled = dis; });
  }

  function sendChat(text, refocus) {
    text = String(text || '').trim();
    if (!text || chatBusy) return;
    var ai = AI();
    appendUserMsg(text);
    if (!ai || !ai.processMessage) {
      appendBotResponse({ text: 'AI 비서를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.' });
      return;
    }
    chatBusy = true;
    setChatDisabled(true);
    var typing = appendTyping();
    var done = function (resp) {
      chatBusy = false;
      setChatDisabled(false);
      appendBotResponse(resp, typing);
      if (refocus) { var i = byId('chatInput'); if (i) i.focus(); }
    };
    var p;
    try { p = Promise.resolve(ai.processMessage(text)); } catch (e) { p = Promise.reject(e); }
    p.then(done, function (err) {
      console.error('[App] AIAgent.processMessage 실패:', err);
      done({ text: '죄송해요, 답변을 만드는 중에 문제가 생겼어요. 다시 한 번 물어봐 주세요.', suggestions: [] });
    });
  }

  function initChat() {
    var form = byId('chatForm'), input = byId('chatInput'), sugg = byId('chatSuggestions');
    if (form && input) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var t = input.value;
        if (!t.trim() || chatBusy) return;
        input.value = '';
        sendChat(t, true);
      });
    }
    if (sugg) {
      sugg.addEventListener('click', function (e) {
        var c = e.target.closest('.chip[data-suggest]');
        if (c && !chatBusy) sendChat(c.getAttribute('data-suggest'));
      });
    }
    var ai = AI();
    if (ai && ai.getWelcome) {
      var w = safe('AIAgent.getWelcome', function () { return ai.getWelcome(); });
      if (w) appendBotResponse(w);
    } else {
      appendBotResponse({ text: '안녕하세요! 지하철 엘리베이터 도우미예요.' });
    }
  }

  // ---------------------------------------------------------------------------
  // 시연 제어판
  // ---------------------------------------------------------------------------
  function fullscreenLabel(isFs) { return isFs ? icon('fullscreen_exit') + '폰 프레임 모드' : icon('fullscreen') + '전체화면 모드'; }

  function toggleFullscreen() {
    var fs = document.body.classList.toggle('fullscreen');
    var b = byId('fullscreenToggle');
    if (b) b.innerHTML = fullscreenLabel(fs);
    if (sheet.open && sheet.mode === 'demo') renderDemoSheet();
  }

  function runScenario(stationId) {
    if (apiMode()) return;
    var es = ES();
    if (!stationId || !es || !es.setStationBroken) return;
    es.setStationBroken(stationId, true);
    openStation(stationId);
    toast(yeok(stationId) + ' 엘리베이터가 모두 고장 상태로 전환되었어요');
    mapCall('clearHighlights');
  }

  function resetDemo() {
    if (apiMode()) return;
    var es = ES();
    if (es && es.reset) safe('ElevatorService.reset', function () { es.reset(); });
    mapCall('clearHighlights');
    refreshSheet();
    toast('모든 엘리베이터 상태를 초기화했어요');
  }

  function initDemo() {
    var list = byId('demoScenarioList');
    var scenarios = MOCKDATA().demoScenarios || [];
    if (list) {
      list.innerHTML = scenarios.map(function (s) {
        return '<button type="button" class="btn btn-ghost btn-block" data-scenario="' + escapeHtml(s.stationId || s.id) + '">' +
          escapeHtml(s.label) + '</button>';
      }).join('');
      list.addEventListener('click', function (e) {
        var b = e.target.closest('[data-scenario]');
        if (b) runScenario(b.getAttribute('data-scenario'));
      });
    }
    var stationBox = byId('demoStation');
    if (stationBox) {
      renderDemoPanelStation();
      stationBox.addEventListener('click', function (e) {
        var b = e.target.closest('[data-act]');
        if (b) onDemoStationAction(b);
      });
    }
    var reset = byId('demoReset');
    if (reset) reset.addEventListener('click', resetDemo);
    // 실데이터 모드: 가상 고장 제어를 숨긴다. 대체 제어는 따로 설계한다
    if (apiMode()) {
      ['demoScenarioList', 'demoStation', 'demoReset'].forEach(function (i) {
        var n = byId(i), box = n && (i === 'demoReset' ? n : (n.closest ? n.closest('.demo-section') : n));
        if (box) box.style.display = 'none';
      });
    }
    var fs = byId('fullscreenToggle');
    if (fs) fs.addEventListener('click', toggleFullscreen);
    var demoBtn = byId('demoBtn');
    if (demoBtn) demoBtn.addEventListener('click', function () {
      if (sheet.open && sheet.mode === 'demo') closeSheet(); else openDemoSheet();
    });
  }

  // ---------------------------------------------------------------------------
  // 상태 변경 구독
  // ---------------------------------------------------------------------------
  var FONTSIZE_KEY = 'elevSubway.fontSize.v1';
  var FONTSIZE_LEVELS = ['normal', 'lg', 'xl', 'max'];

  function applyFontSize(level) {
    if (FONTSIZE_LEVELS.indexOf(level) < 0) level = 'normal';
    if (!level || level === 'normal') {
      document.documentElement.removeAttribute('data-fontsize');
    } else {
      document.documentElement.setAttribute('data-fontsize', level);
    }
    try { localStorage.setItem(FONTSIZE_KEY, level); } catch (e) {}
    updateFontSizeChips(level || 'normal');
  }

  function updateFontSizeChips(level) {
    $all('.fontsize-chip[data-fontsize]').forEach(function (chip) {
      var active = chip.getAttribute('data-fontsize') === level;
      chip.classList.toggle('active', active);
      chip.setAttribute('aria-pressed', String(active));
    });
  }

  function initFontSize() {
    var stored = 'normal';
    try { stored = localStorage.getItem(FONTSIZE_KEY) || 'normal'; } catch (e) {}
    if (FONTSIZE_LEVELS.indexOf(stored) < 0) stored = 'normal';
    applyFontSize(stored);

    document.addEventListener('click', function (e) {
      var chip = e.target.closest('.fontsize-chip[data-fontsize]');
      if (!chip) return;
      applyFontSize(chip.getAttribute('data-fontsize'));
    });
  }

  // ---------------------------------------------------------------------------
  // 즐겨찾기 (sessionStorage, 로그인 중에만 유효)
  // ---------------------------------------------------------------------------
  var FAV_KEY = 'elevSubway.demoFavorites.v1';
  var favEditMode = false;

  function loadFavs() {
    try {
      var saved = JSON.parse(sessionStorage.getItem(FAV_KEY) || '[]');
      return Array.isArray(saved) ? saved.filter(function (fav) { return fav && typeof fav.id === 'string' && typeof fav.placeName === 'string'; }) : [];
    } catch (e) { return []; }
  }

  function saveFavs(list) {
    try { sessionStorage.setItem(FAV_KEY, JSON.stringify(list)); } catch (e) {}
  }

  function genFavId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  function renderFavorites() {
    var list    = byId('favList');
    var empty   = byId('favEmptyMsg');
    var editBtn = byId('favEditBtn');
    if (!list) return;
    var favs = loadFavs();
    if (empty) empty.hidden = favs.length > 0;
    if (editBtn) editBtn.textContent = favEditMode ? '완료' : '수정';

    if (!favs.length) { list.innerHTML = ''; return; }

    list.innerHTML = favs.map(function (fav) {
      var primary   = escapeHtml(fav.alias || fav.placeName);

      var editButtons = favEditMode
        ? '<div class="fav-edit-actions">' +
            '<button class="btn btn-sm fav-rename-btn" type="button" data-fav-rename="' + escapeHtml(fav.id) + '">변경</button>' +
            '<button class="btn btn-sm fav-delete-btn" type="button" data-fav-delete="' + escapeHtml(fav.id) + '">삭제</button>' +
          '</div>'
        : '';

      var detailBtn = favEditMode
        ? ''
        : '<button class="fav-detail-btn" type="button" data-fav-open="' + escapeHtml(fav.id) + '" aria-label="장소 상세 보기">' +
            '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
          '</button>';

      return '<li class="fav-item' + (favEditMode ? ' editing' : '') + '" data-fav-id="' + escapeHtml(fav.id) + '">' +
        '<div class="fav-info fav-name">' +
          '<span class="fav-primary">' + primary + '</span>' +
        '</div>' +
        editButtons +
        detailBtn +
        '</li>';
    }).join('');
  }

  /* 즐겨찾기 장소 상세 바텀시트 */
  function openFavDetail(fav) {
    sheet.mode = 'favDetail';
    sheet.stationId = null;
    var name = escapeHtml(fav.alias || fav.placeName);
    var html =
      '<div class="sheet-header">' +
        '<div class="sheet-title">' + icon('star') + name + '</div>' +
        '<div class="card-sub">즐겨찾기 장소 상세</div>' +
      '</div>' +
      '<div class="sheet-section">' +
        '<div class="section-label">주변 지하철역 정보</div>' +
        '<div class="alt-box fav-detail-notice">' +
          '<div class="alt-title">' + icon('info') + '위치 정보 미연결</div>' +
          '<div class="alt-tip">주변 역과 거리는 확인이 필요해요. 역의 엘리베이터 정보를 직접 확인해 주세요.</div>' +
        '</div>' +
      '</div>' +
      '<div class="sheet-section">' +
        '<div class="section-label">지하철 이동 (데모)</div>' +
        '<div class="subway-demo-anim" id="subwayDemoAnim" aria-label="지하철 이동 데모">' +
          '<div class="subway-track"><span class="subway-train" aria-hidden="true">' + icon('subway') + '</span></div>' +
          '<p class="subway-demo-label">시연용 애니메이션 · 실제 열차 위치가 아닙니다</p>' +
          '<button type="button" class="btn btn-sm btn-ghost" id="subwayDemoPlay">' + icon('play_arrow') + '데모 보기</button>' +
        '</div>' +
      '</div>' +
      '<div class="sheet-section">' +
        '<button type="button" class="btn btn-ghost btn-block" data-act="close-sheet">닫기</button>' +
      '</div>';
    setSheetHtml(html, false);
    openSheetShell();
    var playBtn = byId('subwayDemoPlay');
    if (playBtn) playBtn.addEventListener('click', function () {
      var anim = byId('subwayDemoAnim');
      if (!anim) return;
      anim.classList.remove('running');
      void anim.offsetWidth;
      anim.classList.add('running');
      playBtn.disabled = true;
      setTimeout(function () {
        anim.classList.remove('running');
        playBtn.disabled = false;
      }, 3200);
    });
  }

  /* renderFavStations stub — 위치 API 연동 후 구현 */


  function startFavRename(favId) {
    var item = document.querySelector('.fav-item[data-fav-id="' + favId + '"]');
    if (!item) return;
    var favs = loadFavs();
    var fav = null;
    for (var i = 0; i < favs.length; i++) { if (favs[i].id === favId) { fav = favs[i]; break; } }
    if (!fav) return;
    var nameBtn  = item.querySelector('.fav-name');
    var editAct  = item.querySelector('.fav-edit-actions');
    var input = document.createElement('input');
    input.type = 'text';
    input.className = 'fav-rename-input';
    input.value = fav.alias || fav.placeName;
    input.maxLength = 20;
    var confirmBtn = document.createElement('button');
    confirmBtn.type = 'button';
    confirmBtn.className = 'btn btn-sm btn-primary';
    confirmBtn.textContent = '저장';
    var cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'btn btn-sm btn-ghost';
    cancelBtn.textContent = '취소';

    function commitRename() {
      var val = input.value.trim();
      if (!val) { toast('이름을 입력해 주세요'); input.focus(); return; }
      var updated = loadFavs();
      for (var j = 0; j < updated.length; j++) {
        if (updated[j].id === favId) { updated[j].alias = val; break; }
      }
      saveFavs(updated);
      renderFavorites();
    }
    function cancelRename() { renderFavorites(); }

    confirmBtn.addEventListener('click', commitRename);
    cancelBtn.addEventListener('click', cancelRename);
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); commitRename(); }
      if (e.key === 'Escape') cancelRename();
    });

    if (nameBtn) nameBtn.style.display = 'none';
    if (editAct) editAct.style.display = 'none';
    item.appendChild(input);
    item.appendChild(confirmBtn);
    item.appendChild(cancelBtn);
    input.focus();
    input.select();
  }

  function initLoginTab() {
    var auth = AUTH();
    if (!auth) return;

    var view = byId('view-login');
    if (!view) return;

    /* 즐겨찾기 추가 UI */
    var favAddBtn     = byId('favAddBtn');
    var favAddRow     = byId('favAddRow');
    var favAddInput   = byId('favAddInput');
    var favAddConfirm = byId('favAddConfirm');
    var favAddCancel  = byId('favAddCancel');

    function openFavAdd() {
      if (!auth.getSession()) return;
      if (favAddRow) favAddRow.hidden = false;
      if (favAddInput) { favAddInput.value = ''; favAddInput.focus(); }
    }
    function closeFavAdd() {
      if (favAddRow) favAddRow.hidden = true;
      if (favAddInput) favAddInput.value = '';
    }
    function commitFavAdd() {
      if (!auth.getSession()) return;
      var val = favAddInput ? favAddInput.value.trim() : '';
      if (!val) { toast('장소 이름을 입력해 주세요'); if (favAddInput) favAddInput.focus(); return; }
      var favs = loadFavs();
      favs.push({ id: genFavId(), placeName: val, alias: '' });
      saveFavs(favs);
      closeFavAdd();
      renderFavorites();
      toast('"' + val + '" 즐겨찾기에 추가했어요');
    }

    if (favAddBtn) favAddBtn.addEventListener('click', openFavAdd);
    if (favAddConfirm) favAddConfirm.addEventListener('click', commitFavAdd);
    if (favAddCancel) favAddCancel.addEventListener('click', closeFavAdd);
    if (favAddInput) {
      favAddInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); commitFavAdd(); }
        if (e.key === 'Escape') closeFavAdd();
      });
    }

    /* 즐겨찾기 편집 모드 토글 */
    var favEditBtn = byId('favEditBtn');
    if (favEditBtn) {
      favEditBtn.addEventListener('click', function () {
        favEditMode = !favEditMode;
        closeFavAdd();
        renderFavorites();
      });
    }

    /* 사용자 이름 편집 */
    var editNameBtn     = byId('editNameBtn');
    var nameEditRow     = byId('nameEditRow');
    var nameEditInput   = byId('nameEditInput');
    var nameEditConfirm = byId('nameEditConfirm');
    var nameEditCancel  = byId('nameEditCancel');

    function startNameEdit() {
      var nameEl = byId('authProfileName');
      if (nameEditInput) nameEditInput.value = nameEl ? nameEl.textContent : '';
      if (nameEl)        nameEl.hidden = true;
      if (nameEditRow)   nameEditRow.hidden = false;
      if (editNameBtn)   editNameBtn.hidden = true;
      if (nameEditInput) nameEditInput.focus();
    }
    function cancelNameEdit() {
      var nameEl = byId('authProfileName');
      if (nameEl)       nameEl.hidden = false;
      if (nameEditRow)  nameEditRow.hidden = true;
      if (editNameBtn)  editNameBtn.hidden = false;
    }
    function commitNameEdit() {
      var val = nameEditInput ? nameEditInput.value.trim() : '';
      if (!val) { toast('이름을 입력해 주세요'); if (nameEditInput) nameEditInput.focus(); return; }
      var authSvc = AUTH();
      var sess = authSvc ? authSvc.getSession() : null;
      if (sess && sess.isDemoUser) {
        // 데모 모드: sessionStorage 업데이트
        sess.name = val;
        try { sessionStorage.setItem('elevSubway.demoAuth.v1', JSON.stringify(sess)); } catch (e) {}
        var nameEl   = byId('authProfileName');
        var avatarEl = byId('authProfileAvatar');
        if (nameEl)   nameEl.textContent = val;
        if (avatarEl) avatarEl.textContent = val.charAt(0).toUpperCase();
        cancelNameEdit();
        toast('이름을 변경했어요');
      } else if (sess && !sess.isDemoUser) {
        // 실제 모드 stub: PATCH /api/auth/profile
        console.warn('[Auth:real] 사용자 이름 변경은 아직 백엔드 API가 연결되지 않았습니다. PATCH /api/auth/profile { displayName } 구현 필요.');
        toast('백엔드 연결 후 저장됩니다 (현재 데모)');
        cancelNameEdit();
      }
    }

    if (editNameBtn) editNameBtn.addEventListener('click', startNameEdit);
    if (nameEditConfirm) nameEditConfirm.addEventListener('click', commitNameEdit);
    if (nameEditCancel) nameEditCancel.addEventListener('click', cancelNameEdit);
    if (nameEditInput) {
      nameEditInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); commitNameEdit(); }
        if (e.key === 'Escape') cancelNameEdit();
      });
    }

    /* 즐겨찾기 목록 이벤트 위임 */
    var favList = byId('favList');
    if (favList) {
      favList.addEventListener('click', function (e) {
        /* 편집 모드: 변경/삭제 버튼 */
        var renameBtn = e.target.closest('[data-fav-rename]');
        if (renameBtn) { startFavRename(renameBtn.getAttribute('data-fav-rename')); return; }
        var deleteBtn = e.target.closest('[data-fav-delete]');
        if (deleteBtn) {
          var fid = deleteBtn.getAttribute('data-fav-delete');
          var favs = loadFavs();
          var removed = null;
          favs = favs.filter(function (f) { if (f.id === fid) { removed = f; return false; } return true; });
          saveFavs(favs);
          renderFavorites();
          if (removed) toast('"' + (removed.alias || removed.placeName) + '" 즐겨찾기에서 삭제했어요');
          return;
        }
        /* 일반 모드: 화살표 클릭 → 상세 */
        var openBtn = e.target.closest('[data-fav-open]');
        if (openBtn && !favEditMode) {
          var favId = openBtn.getAttribute('data-fav-open');
          var allFavs = loadFavs();
          var target = null;
          for (var i = 0; i < allFavs.length; i++) { if (allFavs[i].id === favId) { target = allFavs[i]; break; } }
          if (target) openFavDetail(target);
          return;
        }
      });
    }

    /* 이벤트 위임: 로그인/로그아웃 */
    view.addEventListener('click', function (e) {
      var provBtn = e.target.closest('[data-provider]');
      if (provBtn) { auth.login(provBtn.getAttribute('data-provider')); return; }
      if (e.target.closest('[data-auth="signout"]')) {
        auth.logout().then(function () { toast('로그아웃했습니다'); });
        return;
      }
    });

    /* 세션 변경 구독 → 뷰 갱신 */
    auth.subscribe(renderLoginTab);

    /* 초기 렌더 */
    renderLoginTab(auth.getSession());
  }

  /**
   * 로그인 뷰 렌더링.
   * session: null(확인 중) | false(비로그인) | object(로그인)
   */
  function renderLoginTab(session) {
    var loadingEl = byId('authLoading');
    var guestEl   = byId('authGuest');
    var userEl    = byId('authUser');
    if (!guestEl || !userEl) return;

    var checking = session === null;
    var signedIn = !!(session && typeof session === 'object');

    if (loadingEl) loadingEl.hidden = !checking;
    guestEl.hidden = checking || signedIn;
    userEl.hidden  = checking || !signedIn;

    /* 프로필 채우기 */
    if (!signedIn && !checking) {
      saveFavs([]);
      favEditMode = false;
      renderFavorites();
      var addRow = byId('favAddRow');
      if (addRow) addRow.hidden = true;
      if (sheet.open && (sheet.mode === 'favDetail' || sheet.mode === 'filter')) closeSheet();
      var nameRow = byId('nameEditRow'), editButton = byId('editNameBtn'), profileName = byId('authProfileName');
      if (nameRow) nameRow.hidden = true;
      if (editButton) editButton.hidden = false;
      if (profileName) profileName.hidden = false;
    }
    if (signedIn) {
      var nameEl   = byId('authProfileName');
      var badgeEl  = byId('authProviderBadge');
      var avatarEl = byId('authProfileAvatar');
      var provLabels = { google: 'Google', kakao: '카카오' };

      if (nameEl)   nameEl.textContent  = session.name  || '게스트 사용자';
      if (badgeEl) {
        badgeEl.textContent = provLabels[session.provider] || session.provider || '';
        badgeEl.setAttribute('data-provider', session.provider || '');
      }
      if (avatarEl) {
        var displayName = session.name || '게스트 사용자';
        avatarEl.textContent = displayName.charAt(0).toUpperCase() || '?';
        avatarEl.setAttribute('data-provider', session.provider || '');
      }
      favEditMode = false;
      renderFavorites();
    }

    /* 탭 이름 */
    var loginTabLabel = document.querySelector('.tab[data-tab="login"] span:last-child');
    if (loginTabLabel) loginTabLabel.textContent = signedIn ? '마이페이지' : '로그인';

    /* 로그인 상태에 따라 커스텀 필터 행 갱신 */
    renderCustomFilterChips();
  }


  function AUTH() { return window.AuthService; }

  function initSubscriptions() {
    var es = ES();
    if (!es || !es.subscribe) return;
    es.subscribe(function () {
      if (!apiMode()) elevUpdatedAt = new Date(); // 상태가 바뀐 시각을 기준 시각으로 (REQ-ELV-003). 실데이터 모드는 서버 시각
      safe('refreshSheet', refreshSheet);
      safe('renderElevatorTab', renderElevatorTab);
      safe('renderDemoPanelStation', renderDemoPanelStation);
    });
  }

  // ---------------------------------------------------------------------------
  // 초기화
  // ---------------------------------------------------------------------------
  // 폰 화면 자체는 스크롤되지 않는다. 화면 밖(요약 상태 시트의 아래쪽 버튼 등)에 포커스가 가도
  // 브라우저가 폰 화면을 밀어 올리지 않게 바로 되돌린다 (REQ-COM-004 뒤처리)
  function lockPhoneScroll() {
    var phone = byId('phone');
    if (phone) phone.addEventListener('scroll', function () { if (phone.scrollTop || phone.scrollLeft) { phone.scrollTop = 0; phone.scrollLeft = 0; } });
  }

  // 목업 모드 표시(가상 데이터를 실제로 오해하지 않게). 실데이터 모드는 서버 상태를 불러온다
  function initDataSource() {
    var badge = byId('dataSourceBadge');
    if (badge) badge.hidden = apiMode();
    if (!apiMode()) return;
    var es = ES();
    if (es && es.startLive) es.startLive();
    safe('renderElevatorTab', renderElevatorTab);
  }

  function init() {
    safe('phoneScroll', lockPhoneScroll);
    safe('clock', initClock);
    safe('fontSize', initFontSize);
    document.body.setAttribute('data-active-tab', currentTab);
    safe('tabs', initTabs);
    safe('map', initMap);
    safe('lineFilter', initLineFilter);
    safe('search', initSearch);
    safe('sheet', initSheet);
    safe('elevatorTab', initElevatorTab);
    safe('timeTab', initTimeTab);
    safe('chat', initChat);
    safe('loginTab', initLoginTab);
    safe('demo', initDemo);
    safe('subscriptions', initSubscriptions);
    safe('dataSource', initDataSource);
  }

  window.App = {
    openStation: openStation,
    switchTab: switchTab,
    toast: toast,
    openTime: openTime,
    closeSheet: closeSheet,
    escapeHtml: escapeHtml,
    lineBadges: lineBadges,
    statusPill: statusPill
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
