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

  function statusPill(status) {
    var cls = STATUS_CLASS[status] || 'unknown';
    return '<span class="status-pill ' + cls + '">' + escapeHtml(statusLabel(status)) + '</span>';
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

  function findAlternative(id) {
    var es = ES();
    if (!es || !es.findAlternativeStation) return null;
    return safe('findAlternativeStation', function () { return es.findAlternativeStation(id); }) || null;
  }

  function isDown(elev) { return elev && elev.status !== 'AVAILABLE'; }

  var ELEV_STATUS_TEXT = { AVAILABLE: '정상', UNAVAILABLE: '고장', MAINTENANCE: '점검 중' };
  var ELEV_TYPE_TEXT = { exit: '출구', platform: '승강장', transfer: '환승' };

  function altSummary(alt) {
    if (!alt || !alt.station) return '';
    var parts = [];
    if (typeof alt.stops === 'number') parts.push(alt.stops + '개역');
    if (typeof alt.walkMinutes === 'number') parts.push('도보 약 ' + alt.walkMinutes + '분');
    return escapeHtml(yeok(alt.station)) + (parts.length ? ' (' + parts.join(' · ') + ')' : '');
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
  var TABS = ['map', 'elevator', 'time', 'chat'];
  var currentTab = 'map';

  function switchTab(name) {
    if (TABS.indexOf(name) < 0) return;
    currentTab = name;
    $all('.tab-bar .tab[data-tab]').forEach(function (t) {
      t.classList.toggle('active', t.getAttribute('data-tab') === name);
    });
    $all('.view[data-view]').forEach(function (v) {
      v.classList.toggle('active', v.getAttribute('data-view') === name);
    });
    if (name !== 'map' && sheet.open) closeSheet();
    hideSearch();
    if (name === 'chat') scrollChat();
  }

  function initTabs() {
    $all('.tab-bar .tab[data-tab]').forEach(function (t) {
      t.addEventListener('click', function () { switchTab(t.getAttribute('data-tab')); });
    });
  }

  // ---------------------------------------------------------------------------
  // 지도
  // ---------------------------------------------------------------------------
  var activeLine = null;

  function initMap() {
    var container = byId('mapContainer');
    if (MAP() && MAP().init && container) {
      MAP().init(container, { onStationClick: function (id) { openStation(id); } });
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
  var sheet = { open: false, mode: null, stationId: null, alt: null };
  // 시연 제어판에서 조작할 역. 마지막으로 연 역을 기억한다.
  var demoStationId = null;

  function openSheetShell() {
    var bs = byId('bottomSheet'), bd = byId('sheetBackdrop');
    if (bs) { bs.style.transform = ''; bs.style.transition = ''; bs.classList.add('open'); }
    if (bd) bd.classList.add('show');
    sheet.open = true;
  }

  function closeSheet() {
    var bs = byId('bottomSheet'), bd = byId('sheetBackdrop');
    if (bs) { bs.classList.remove('open'); bs.style.transform = ''; bs.style.transition = ''; }
    if (bd) bd.classList.remove('show');
    sheet.open = false;
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
    openSheetShell();
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

    // 헤더
    html += '<div class="sheet-header">' +
      '<div class="sheet-title">' + escapeHtml(yeok(st)) + ' ' + lineBadges(st) + '</div>' +
      '<div class="card-row">' + statusPill(status) +
      (data ? ' <span class="muted">엘리베이터 ' + elevs.length + '대' +
        (downCount ? ' 중 ' + downCount + '대 이용 불가' : ' 모두 정상') + '</span>' : '') +
      '</div></div>';

    // 엘리베이터 목록 (대체역 박스를 위에 두기 위해 나중에 다시 붙인다)
    var elevStart = html.length;
    html += '<div class="sheet-section"><div class="section-label">엘리베이터</div>';
    if (data) {
      html += '<div class="elev-list">' + elevs.map(function (e) {
        var down = isDown(e);
        var metaParts = [];
        if (ELEV_TYPE_TEXT[e.type]) metaParts.push(ELEV_TYPE_TEXT[e.type]);
        if (e.floors) metaParts.push(e.floors);
        return '<div class="elev-item' + (down ? ' down' : '') + '">' +
          '<div class="elev-icon">' + (down ? '⛔' : '🛗') + '</div>' +
          '<div class="elev-body" style="flex:1;min-width:0">' +
            '<div class="elev-loc">' + escapeHtml(e.location) +
              ' <span class="muted">· ' + escapeHtml(ELEV_STATUS_TEXT[e.status] || e.status) + '</span></div>' +
            '<div class="elev-meta">' + escapeHtml(metaParts.join(' · ')) + '</div>' +
            (down && e.reason ? '<div class="elev-reason">' + escapeHtml(showTimesIn(e.reason)) + '</div>' : '') +
          '</div>' +
          '</div>';
      }).join('') + '</div>';
    } else {
      html += '<div class="empty">이 역은 엘리베이터 데이터가 아직 없어요</div>';
    }
    html += '</div>';
    var elevSection = html.slice(elevStart);
    html = html.slice(0, elevStart);

    // 대체역 (이용 불가일 때 헤더 바로 아래에 보여준다)
    sheet.alt = null;
    if (status === 'PARTIAL' || status === 'UNAVAILABLE' || status === 'UNKNOWN') {
      var alt = findAlternative(id);
      sheet.alt = alt;
      if (alt && alt.station) {
        var title = status === 'UNKNOWN'
          ? '정보가 확인된 가까운 역: ' + altSummary(alt)
          : '추천 대체역: ' + altSummary(alt);
        html += '<div class="sheet-section"><div class="alt-box">' +
          '<div class="alt-title">' + (status === 'UNKNOWN' ? 'ℹ️ ' : '⚠️ ') + title + '</div>' +
          (alt.tip ? '<div class="alt-tip">' + escapeHtml(alt.tip) + '</div>' : '') +
          '<div class="msg-actions">' +
            '<button type="button" class="btn btn-sm btn-primary btn-main" data-act="detour">지도에서 우회 경로 보기</button>' +
            '<button type="button" class="btn btn-sm btn-ghost" data-act="open-station" data-id="' + escapeHtml(alt.station.id) + '">대체역 보기</button>' +
          '</div></div></div>';
      } else if (status !== 'UNKNOWN') {
        html += '<div class="sheet-section"><div class="alt-box"><div class="alt-title">⚠️ 주변에 이용 가능한 대체역을 찾지 못했어요</div>' +
          '<div class="alt-tip">역무원 호출 또는 다산콜센터(120)에 문의해 주세요.</div></div></div>';
      }
    }

    html += elevSection;

    // 액션
    html += '<div class="sheet-section btn-stack">' +
      '<button type="button" class="btn btn-primary btn-block btn-main" data-act="calc-time">⏱️ 이 역까지 출발 시각 계산</button>' +
      '<button type="button" class="btn btn-ghost btn-block" data-act="ask-ai">🤖 AI에게 물어보기</button>' +
      '</div>';

    setSheetHtml(html, keepScroll);
  }

  // 시연 제어판의 "선택한 역" 항목. 데스크톱 패널(#demoStation)과 모바일 시연 시트가 함께 쓴다.
  function demoStationHtml() {
    var id = demoStationId;
    var st = id ? getStation(id) : null;
    var html = '<div class="section-label">선택한 역</div>';
    if (!st) return html + '<div class="muted">지도에서 역을 선택하세요</div>';
    var elevs = getElevators(id);
    html += '<div class="demo-station-name">' + escapeHtml(yeok(st)) + ' ' + lineBadges(st) + '</div>' +
      '<div class="demo-station-actions">' +
        '<button type="button" class="btn btn-sm btn-danger" data-act="demo-station-broken" data-broken="1">이 역 전체 고장</button>' +
        '<button type="button" class="btn btn-sm btn-ghost" data-act="demo-station-broken" data-broken="0">이 역 전체 복구</button>' +
      '</div>';
    if (!elevs.length) return html + '<div class="muted">엘리베이터 데이터가 없는 역이에요</div>';
    html += '<div class="demo-elev-list">' + elevs.map(function (e) {
      var down = isDown(e);
      return '<div class="demo-elev-row">' +
        '<div class="demo-elev-loc">' + escapeHtml(e.location) +
          ' <span class="muted">· ' + escapeHtml(ELEV_STATUS_TEXT[e.status] || e.status) + '</span></div>' +
        '<button type="button" class="btn btn-sm ' + (down ? 'btn-ghost' : 'btn-danger') +
          '" data-act="demo-toggle-elev" data-elev="' + escapeHtml(e.id) + '">' + (down ? '복구' : '고장') + '</button>' +
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
    var act = btn.getAttribute('data-act');
    var sid = demoStationId;
    var es = ES();
    if (!sid || !es) return false;
    if (act === 'demo-toggle-elev') {
      if (!es.toggleElevator) return true;
      var eid = btn.getAttribute('data-elev');
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
      if (broken) {
        var alt = findAlternative(sid);
        if (alt && alt.station) {
          setTimeout(function () { mapCall('highlightAlternative', sid, alt.station.id, alt.path); }, 300);
        }
      } else {
        mapCall('clearHighlights');
      }
      return true;
    }
    return false;
  }

  function renderDemoSheet() {
    var scenarios = MOCKDATA().demoScenarios || [];
    var fs = document.body.classList.contains('fullscreen');
    var html = '<div class="sheet-header"><div class="sheet-title">⚙️ 시연 제어판</div>' +
      '<div class="muted">엘리베이터 고장 상황을 만들어 대체역 안내를 확인해 보세요.</div></div>' +
      '<div class="sheet-section"><div class="section-label">시연 시나리오</div><div class="btn-stack">' +
      scenarios.map(function (s) {
        return '<button type="button" class="btn btn-ghost btn-block" data-act="demo-scenario" data-id="' +
          escapeHtml(s.stationId || s.id) + '">' + escapeHtml(s.label) + '</button>';
      }).join('') +
      '</div></div>' +
      '<div class="sheet-section">' + demoStationHtml() + '</div>' +
      '<div class="sheet-section btn-stack">' +
      '<button type="button" class="btn btn-ghost btn-block" data-act="demo-reset">↺ 전체 상태 초기화</button>' +
      '<button type="button" class="btn btn-ghost btn-block" data-act="demo-fullscreen">' + fullscreenLabel(fs) + '</button>' +
      '</div>';
    setSheetHtml(html, sheet.mode === 'demo');
  }

  function openDemoSheet() {
    sheet.mode = 'demo';
    sheet.stationId = null;
    renderDemoSheet();
    openSheetShell();
  }

  function refreshSheet() {
    if (!sheet.open) return;
    if (sheet.mode === 'station') renderStationSheet(true);
    else if (sheet.mode === 'demo') renderDemoSheet();
  }

  function onSheetAction(e) {
    var btn = e.target.closest('[data-act]');
    if (!btn) return;
    var act = btn.getAttribute('data-act');
    var sid = sheet.stationId;
    if (onDemoStationAction(btn)) return;
    switch (act) {
      case 'detour': {
        var a = sheet.alt;
        if (a && a.station) mapCall('highlightAlternative', sid, a.station.id, a.path);
        break;
      }
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
    if (bd) bd.addEventListener('click', closeSheet);
    if (content) content.addEventListener('click', onSheetAction);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && sheet.open) closeSheet();
    });
    if (!bs) return;

    // 핸들/헤더 드래그로 닫기
    var drag = null;
    bs.addEventListener('pointerdown', function (e) {
      if (!sheet.open) return;
      var handle = e.target.closest('.sheet-handle, .sheet-header');
      if (!handle || e.target.closest('button, a, input, select')) return;
      drag = { startY: e.clientY, dy: 0, id: e.pointerId, el: handle };
      try { handle.setPointerCapture(e.pointerId); } catch (err) { /* noop */ }
      bs.style.transition = 'none';
    });
    bs.addEventListener('pointermove', function (e) {
      if (!drag || e.pointerId !== drag.id) return;
      drag.dy = Math.max(0, e.clientY - drag.startY);
      bs.style.transform = 'translateY(' + drag.dy + 'px)';
    });
    function endDrag(e) {
      if (!drag || (e && e.pointerId !== drag.id)) return;
      var dy = drag.dy;
      try { drag.el.releasePointerCapture(drag.id); } catch (err) { /* noop */ }
      drag = null;
      bs.style.transition = '';
      bs.style.transform = '';
      if (dy > 80) closeSheet();
    }
    bs.addEventListener('pointerup', endDrag);
    bs.addEventListener('pointercancel', endDrag);
  }

  // ---------------------------------------------------------------------------
  // 엘리베이터 탭
  // ---------------------------------------------------------------------------
  var elevFilter = 'all';
  var ELEV_FILTERS = [
    { id: 'all', label: '전체' },
    { id: 'problem', label: '이용 불가·점검' },
    { id: 'line2', label: '2호선' },
    { id: 'transfer', label: '환승역' }
  ];
  var STATUS_RANK = { UNAVAILABLE: 0, PARTIAL: 1, AVAILABLE: 2, UNKNOWN: 3 };

  function initElevatorTab() {
    var f = byId('elevatorFilter');
    if (f) {
      f.innerHTML = ELEV_FILTERS.map(function (x) {
        return '<button type="button" class="chip' + (x.id === elevFilter ? ' active' : '') + '" data-filter="' + x.id + '">' +
          escapeHtml(x.label) + '</button>';
      }).join('');
      f.addEventListener('click', function (e) {
        var chip = e.target.closest('.chip[data-filter]');
        if (!chip) return;
        elevFilter = chip.getAttribute('data-filter');
        $all('.chip[data-filter]', f).forEach(function (c) {
          c.classList.toggle('active', c.getAttribute('data-filter') === elevFilter);
        });
        renderElevatorList();
      });
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
    renderElevatorTab();
  }

  function dataStations() {
    return allStations().filter(function (s) { return hasData(s.id); }).map(function (s) {
      var elevs = getElevators(s.id);
      return { station: s, status: stationStatus(s.id), total: elevs.length, down: elevs.filter(isDown).length };
    });
  }

  function renderElevatorTab() {
    renderElevatorSummary();
    renderElevatorList();
  }

  function renderElevatorSummary() {
    var el = byId('elevatorSummary');
    if (!el) return;
    var items = dataStations();
    var counts = { AVAILABLE: 0, PARTIAL: 0, UNAVAILABLE: 0 };
    items.forEach(function (x) { if (counts[x.status] !== undefined) counts[x.status]++; });
    var cards = [
      { key: 'AVAILABLE', cls: 'ok', label: '정상' },
      { key: 'PARTIAL', cls: 'warn', label: '일부 운행' },
      { key: 'UNAVAILABLE', cls: 'bad', label: '이용 불가' }
    ];
    // 보여 주기만 하는 카드. 숫자는 필터와 상관없이 전체 기준이다.
    el.innerHTML = cards.map(function (c) {
      return '<div class="summary-card ' + c.cls + '">' +
        '<div class="summary-num">' + counts[c.key] + '<span class="summary-unit">역</span></div>' +
        '<div class="summary-label">' + c.label + '</div></div>';
    }).join('');
  }

  function renderElevatorList() {
    var el = byId('elevatorList');
    if (!el) return;
    var items = dataStations().filter(function (x) {
      switch (elevFilter) {
        case 'problem': return x.status === 'PARTIAL' || x.status === 'UNAVAILABLE';
        case 'line2': return (x.station.lines || []).indexOf('2') >= 0;
        case 'transfer': return (x.station.lines || []).length > 1;
        default: return true;
      }
    });
    items.sort(function (a, b) {
      var r = (STATUS_RANK[a.status] || 0) - (STATUS_RANK[b.status] || 0);
      return r !== 0 ? r : koCompare(a.station.name, b.station.name);
    });
    if (!items.length) {
      el.innerHTML = '<div class="empty">' + (elevFilter === 'problem'
        ? '지금은 이용 불가한 엘리베이터가 없어요 🎉' : '표시할 역이 없어요') + '</div>';
      return;
    }
    el.innerHTML = items.map(function (x) {
      var s = x.station;
      var meta = x.down ? '이용 불가 ' + x.down + ' / 전체 ' + x.total + '대' : '엘리베이터 ' + x.total + '대 정상';
      return '<div class="station-row" data-id="' + escapeHtml(s.id) + '" role="button" tabindex="0">' +
        '<div class="station-row-main" style="flex:1;min-width:0">' +
          '<div class="station-row-name"><strong>' + escapeHtml(yeok(s)) + '</strong> ' + lineBadges(s) + '</div>' +
          '<div class="muted station-row-meta">' + escapeHtml(meta) + '</div>' +
        '</div>' +
        statusPill(x.status) +
        '<span class="chevron" aria-hidden="true">›</span>' +
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

  function syncTimeMode() {
    var modeNow = byId('modeNow');
    var off = !!(modeNow && modeNow.checked);
    ARRIVE_PICKER.forEach(function (id) {
      var el = byId(id);
      if (el) el.disabled = off;
    });
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

    initArrivePicker();
    setArriveBy(defaultArriveBy());

    var swap = byId('swapBtn');
    if (swap && o && d) swap.addEventListener('click', function () {
      var t = o.value; o.value = d.value; d.value = t;
    });
    var modeNow = byId('modeNow');
    if (modeNow) modeNow.addEventListener('change', syncTimeMode);
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

    // 엘리베이터 경고
    (r.elevatorWarnings || []).forEach(function (w) {
      var alt = w.alternative;
      html += '<div class="alt-box">' +
        '<div class="alt-title">⚠️ ' + escapeHtml(yeok(w.stationId)) + ' 엘리베이터 ' + escapeHtml(statusLabel(w.status)) + '</div>' +
        (alt && alt.station ? '<div class="alt-tip">추천 대체역: ' + altSummary(alt) + (alt.tip ? '<br>' + escapeHtml(alt.tip) : '') + '</div>' : '') +
        '<div class="msg-actions">' +
          '<button type="button" class="btn btn-sm btn-ghost" data-open-station="' + escapeHtml(w.stationId) + '">역 정보 보기</button>' +
          (alt && alt.station ? '<button type="button" class="btn btn-sm btn-ghost" data-open-station="' + escapeHtml(alt.station.id) + '">대체역 보기</button>' : '') +
        '</div></div>';
    });

    // 경로
    var legs = route.legs || [];
    if (legs.length) {
      html += '<div class="card"><div class="card-title">경로</div><div class="route-legs">' +
        legs.map(function (l) {
          return '<div class="route-leg">' + lineBadge(l.lineId) + ' <span>' + escapeHtml(stationName(l.from)) + ' → ' +
            escapeHtml(stationName(l.to)) + ' · ' + escapeHtml(l.stops) + '개역</span></div>';
        }).join('') + '</div></div>';
    }

    // 타임라인
    var tl = r.timeline || [];
    if (tl.length) {
      html += '<div class="card"><div class="card-title">타임라인</div><div class="timeline">' +
        tl.map(function (t) {
          return '<div class="timeline-item">' +
            '<span class="timeline-time">' + escapeHtml(showTime(t.time)) + '</span>' +
            '<span class="timeline-icon">' + escapeHtml(t.icon || '•') + '</span>' +
            '<span class="timeline-label">' + escapeHtml(t.label) + '</span></div>';
        }).join('') + '</div></div>';
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
    return '🔧 ' + (tc.name || 'tool') + '(' + argStr + ')';
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
        if (!p || !p.from) return;
        openStation(p.from);
        setTimeout(function () {
          var path = p.path;
          if (!path || !path.length) {
            var alt = findAlternative(p.from);
            if (alt && alt.station && alt.station.id === p.to) path = alt.path;
          }
          mapCall('highlightAlternative', p.from, p.to, path);
        }, 400);
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
      html += '<div class="tool-chip">' + escapeHtml(formatToolCall(tc)) + '</div>';
    });
    if (resp.text) html += '<div class="bubble">' + formatText(resp.text) + '</div>';
    if (resp.html) html += resp.html; // AIAgent가 만든 신뢰된 카드 HTML
    var actions = resp.actions || [];
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
  function fullscreenLabel(isFs) { return isFs ? '⛶ 폰 프레임 모드' : '⛶ 전체화면 모드'; }

  function toggleFullscreen() {
    var fs = document.body.classList.toggle('fullscreen');
    var b = byId('fullscreenToggle');
    if (b) b.textContent = fullscreenLabel(fs);
    if (sheet.open && sheet.mode === 'demo') renderDemoSheet();
  }

  function runScenario(stationId) {
    var es = ES();
    if (!stationId || !es || !es.setStationBroken) return;
    es.setStationBroken(stationId, true);
    openStation(stationId);
    toast(yeok(stationId) + ' 엘리베이터가 모두 고장 상태로 전환되었어요');
    setTimeout(function () {
      var alt = findAlternative(stationId);
      if (alt && alt.station) mapCall('highlightAlternative', stationId, alt.station.id, alt.path);
    }, 500);
  }

  function resetDemo() {
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
  function initSubscriptions() {
    var es = ES();
    if (!es || !es.subscribe) return;
    es.subscribe(function () {
      safe('refreshSheet', refreshSheet);
      safe('renderElevatorTab', renderElevatorTab);
      safe('renderDemoPanelStation', renderDemoPanelStation);
    });
  }

  // ---------------------------------------------------------------------------
  // 초기화
  // ---------------------------------------------------------------------------
  function init() {
    safe('clock', initClock);
    safe('tabs', initTabs);
    safe('map', initMap);
    safe('lineFilter', initLineFilter);
    safe('search', initSearch);
    safe('sheet', initSheet);
    safe('elevatorTab', initElevatorTab);
    safe('timeTab', initTimeTab);
    safe('chat', initChat);
    safe('demo', initDemo);
    safe('subscriptions', initSubscriptions);
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
