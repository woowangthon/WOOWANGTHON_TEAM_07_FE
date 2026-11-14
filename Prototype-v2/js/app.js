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
  var STATUS_LABEL_FALLBACK = { AVAILABLE: '정상 운행', PARTIAL: '일부 이용 불가', UNAVAILABLE: '이용 불가', UNKNOWN: '정보 없음' };

  function statusLabel(status) {
    var es = ES();
    var l = es && es.getStatusLabel ? safe('getStatusLabel', function () { return es.getStatusLabel(status); }) : null;
    return l || STATUS_LABEL_FALLBACK[status] || '정보 없음';
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
    $all('.tab-bar .tab[data-tab]').forEach(function (t) {
      t.classList.toggle('active', t.getAttribute('data-tab') === name);
    });
    $all('.view[data-view]').forEach(function (v) {
      v.classList.toggle('active', v.getAttribute('data-view') === name);
    });
    var hdr = document.querySelector('.app-header');
    if (hdr) hdr.hidden = (name === 'time' || name === 'chat' || name === 'login');
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
        escapeHtml(l.color) + '"><span class="chip-dot" style="display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:5px;vertical-align:middle;background:' +
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
    var demoAnim = byId('subwayDemoAnim');
    if (demoAnim) demoAnim.classList.remove('running');
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
    lastStationId = id;
    renderStationSheet(false);
    renderDemoStation();
    openSheetShell();
  }

  var lastStationId = null;

  function renderDemoStation() {
    var nameEl = byId('demoStationName');
    var controls = byId('demoStationControls');
    var list = byId('demoElevList');
    if (!nameEl || !controls || !list) return;
    if (!lastStationId || !getStation(lastStationId)) {
      nameEl.textContent = '지도에서 역을 선택하세요';
      controls.hidden = true;
      list.innerHTML = '';
      return;
    }
    nameEl.textContent = yeok(lastStationId);
    controls.hidden = false;
    var elevs = getElevators(lastStationId);
    list.innerHTML = elevs.length ? elevs.map(function (e) {
      var down = isDown(e);
      return '<div class="demo-elev-item">' +
        '<span class="demo-elev-loc">' + escapeHtml(e.location) + '</span>' +
        '<span class="demo-elev-status ' + (down ? 'bad' : 'ok') + '">' + escapeHtml(ELEV_STATUS_TEXT[e.status] || e.status) + '</span>' +
        '<button type="button" class="btn btn-sm ' + (down ? 'btn-primary' : 'btn-ghost') +
          '" data-demo-elev="' + escapeHtml(e.id) + '">' + (down ? '복구' : '고장') + '</button>' +
        '</div>';
    }).join('') : '<div class="muted">엘리베이터 데이터가 없어요</div>';
  }

  function demoSetStationBroken(broken) {
    var es = ES();
    if (!lastStationId || !es || !es.setStationBroken) return;
    var sid = lastStationId;
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
  }

  function demoToggleElevator(eid) {
    var es = ES();
    if (!lastStationId || !es || !es.toggleElevator) return;
    es.toggleElevator(lastStationId, eid);
    var el = getElevators(lastStationId).filter(function (x) { return x.id === eid; })[0];
    var loc = el ? ' ' + el.location : '';
    toast(yeok(lastStationId) + loc + ' 엘리베이터가 ' +
      (el && isDown(el) ? '고장 상태로 전환되었어요' : '복구되었어요'));
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
            (down && e.reason ? '<div class="elev-reason">' + escapeHtml(e.reason) + '</div>' : '') +
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
          '<div class="msg-actions" style="display:flex;flex-wrap:wrap;gap:6px;margin-top:8px">' +
            '<button type="button" class="btn btn-sm btn-primary" data-act="detour">지도에서 우회 경로 보기</button>' +
            '<button type="button" class="btn btn-sm btn-ghost" data-act="open-station" data-id="' + escapeHtml(alt.station.id) + '">대체역 보기</button>' +
          '</div></div></div>';
      } else if (status !== 'UNKNOWN') {
        html += '<div class="sheet-section"><div class="alt-box"><div class="alt-title">⚠️ 주변에 이용 가능한 대체역을 찾지 못했어요</div>' +
          '<div class="alt-tip">역무원 호출 또는 다산콜센터(120)에 문의해 주세요.</div></div></div>';
      }
    }

    html += elevSection;

    // 액션
    html += '<div class="sheet-section" style="display:grid;gap:8px">' +
      '<button type="button" class="btn btn-primary btn-block" data-act="calc-time">⏱️ 이 역까지 출발 시각 계산</button>' +
      '<button type="button" class="btn btn-ghost btn-block" data-act="ask-ai">🤖 AI에게 물어보기</button>' +
      '</div>';

    setSheetHtml(html, keepScroll);
  }

  function renderDemoSheet() {
    var scenarios = MOCKDATA().demoScenarios || [];
    var fs = document.body.classList.contains('fullscreen');
    var html = '<div class="sheet-header"><div class="sheet-title">⚙️ 시연 제어판</div>' +
      '<div class="muted">엘리베이터 고장 상황을 만들어 대체역 안내를 확인해 보세요.</div></div>' +
      '<div class="sheet-section"><div class="section-label">시연 시나리오</div><div style="display:grid;gap:8px">' +
      scenarios.map(function (s) {
        return '<button type="button" class="btn btn-ghost btn-block" data-act="demo-scenario" data-id="' +
          escapeHtml(s.stationId || s.id) + '">' + escapeHtml(s.label) + '</button>';
      }).join('') +
      '</div></div>' +
      '<div class="sheet-section" style="display:grid;gap:8px">' +
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
        var origin = originComboCtrl ? originComboCtrl.getId() : '';
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
      case 'close-sheet':
        closeSheet();
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
    { id: 'all', label: '전체', title: '모든 역 표시' },
    { id: 'problem', label: '일부 불가', title: '일부 불가·이용 불가 역만 표시' }
  ];
  var CUSTOM_FILTER_KEY = 'elevSubway.elevFilters.v1';
  var elevCustomFilters = [];
  var STATUS_RANK = { UNAVAILABLE: 0, PARTIAL: 1, AVAILABLE: 2, UNKNOWN: 3 };

  function loadElevCustomFilters() {
    try { return JSON.parse(sessionStorage.getItem(CUSTOM_FILTER_KEY) || '[]'); } catch (e) { return []; }
  }

  function saveElevCustomFilters(filters) {
    try { sessionStorage.setItem(CUSTOM_FILTER_KEY, JSON.stringify(filters)); } catch (e) {}
  }

  function renderCustomFilterChips() {
    var slot = byId('customFilterSlot');
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
        return '<span class="custom-filter-chip" tabindex="0" data-custom-filter="' + escapeHtml(lineId) + '" ' +
          'style="--line-color:' + escapeHtml(l.color) + '">' +
          '<span class="custom-filter-dot" aria-hidden="true"></span>' +
          escapeHtml(l.name) +
          '<button type="button" class="chip-x" data-remove-filter="' + escapeHtml(lineId) + '" aria-label="' + escapeHtml(l.name) + ' 필터 제거">×</button>' +
          '</span>';
      }).join('');
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
    openSheetShell();
    var content = byId('filterPicker');
    if (content) {
      content.addEventListener('click', function (e) {
        var chip = e.target.closest('[data-pick-line]');
        if (chip) {
          chip.classList.toggle('selected');
          return;
        }
        if (e.target.closest('#filterPickerDone')) {
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

  function initElevatorTab() {
    var f = byId('elevatorFilter');
    if (f) {
      f.innerHTML = '<div id="elevatorFilterScroll" class="elevator-filter-scroll" tabindex="0" role="region" aria-label="엘리베이터 필터 좌우 스크롤">' + ELEV_FILTERS.map(function (x) {
        return '<button type="button" class="chip' + (x.id === elevFilter ? ' active' : '') + '" data-filter="' + x.id + '"' +
          (x.title ? ' title="' + escapeHtml(x.title) + '"' : '') + '>' +
          escapeHtml(x.label) + '</button>';
      }).join('') + '<span id="customFilterSlot" class="custom-filter-slot" hidden></span></div>' +
        '<span id="elevatorFilterFade" class="filter-fade" aria-hidden="true" hidden></span>' +
        '<button type="button" class="chip-add-btn" id="addFilterBtn" hidden>＋ 노선</button>';
      byId('elevatorFilterScroll').addEventListener('scroll', updateFilterOverflow, { passive: true });
      if (typeof ResizeObserver !== 'undefined') {
        new ResizeObserver(updateFilterOverflow).observe(byId('elevatorFilterScroll'));
      }
      f.addEventListener('click', function (e) {
        var rmBtn = e.target.closest('[data-remove-filter]');
        if (rmBtn) {
          var lineId = rmBtn.getAttribute('data-remove-filter');
          elevCustomFilters = elevCustomFilters.filter(function (x) { return x !== lineId; });
          saveElevCustomFilters(elevCustomFilters);
          renderCustomFilterChips();
          renderElevatorList();
          return;
        }
        if (e.target.closest('#addFilterBtn')) { openFilterPicker(); return; }
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
    renderCustomFilterChips();
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
    var SUMMARY_ICONS = {
      ok: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M8 12.5l2.5 2.5L16 9.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      warn: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4l9 16H3z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><path d="M12 10v4.5M12 17.2v.1" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>',
      bad: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M9 9l6 6M15 9l-6 6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>'
    };
    var cards = [
      { key: 'AVAILABLE', cls: 'ok', label: '정상' },
      { key: 'PARTIAL', cls: 'warn', label: '일부 운행' },
      { key: 'UNAVAILABLE', cls: 'bad', label: '이용 불가' }
    ];
    el.innerHTML = cards.map(function (c) {
      return '<div class="summary-card ' + c.cls + '">' +
        '<div class="summary-head"><span class="summary-icon">' + SUMMARY_ICONS[c.cls] + '</span>' +
          '<span class="summary-label">' + escapeHtml(c.label) + '</span></div>' +
        '<div class="summary-body"><div class="summary-num">' + counts[c.key] + '<span class="summary-unit">역</span></div></div>' +
        '</div>';
    }).join('');
  }

  function renderElevatorList() {
    var el = byId('elevatorList');
    if (!el) return;
    var items = dataStations().filter(function (x) {
      var baseOk = elevFilter === 'problem'
        ? (x.status === 'PARTIAL' || x.status === 'UNAVAILABLE')
        : true;
      if (!baseOk) return false;
      if (elevCustomFilters.length === 0) return true;
      return elevCustomFilters.some(function (lineId) {
        return (x.station.lines || []).indexOf(lineId) >= 0;
      });
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

  function syncTimeMode() {
    var modeNow = byId('modeNow'), arrive = byId('arriveBy');
    if (modeNow && arrive) arrive.disabled = !!modeNow.checked;
  }

  function setComboValue(role, id) {
    var hid = byId(role + 'Select');
    var btn = byId(role + 'ComboBtn');
    if (hid) hid.value = id || '';
    if (btn) {
      var s = id ? getStation(id) : null;
      btn.textContent = s ? yeok(s) : '역 선택';
    }
  }

  function renderPickerList(stations, currentId) {
    if (!stations.length) return '<div class="empty">해당 역이 없습니다</div>';
    return stations.map(function (s) {
      return '<div class="station-picker-row' + (s.id === currentId ? ' active' : '') + '" ' +
        'data-station-id="' + escapeHtml(s.id) + '" role="option" tabindex="0">' +
        '<span class="station-picker-name">' + escapeHtml(yeok(s)) + '</span>' +
        lineBadges(s) + '</div>';
    }).join('');
  }

  function openStationPicker(role, labelText) {
    var stations = allStations().sort(function (a, b) { return koCompare(a.name, b.name); });
    var currentId = (byId(role + 'Select') || {}).value || '';

    var html = '<div class="sheet-header">' +
      '<div class="sheet-title">' + escapeHtml(labelText) + '</div>' +
      '</div>' +
      '<div class="sheet-section">' +
      '<input type="search" id="stationPickerInput" class="station-picker-input" placeholder="역 이름 검색" autocomplete="off" />' +
      '</div>' +
      '<div id="stationPickerList" class="station-picker-list">' +
      renderPickerList(stations, currentId) +
      '</div>';
    setSheetHtml(html, false);
    openSheetShell();

    var input = byId('stationPickerInput');
    var listEl = byId('stationPickerList');

    if (input) {
      input.addEventListener('input', function () {
        var q = normalizeName(input.value);
        var filtered = !q ? stations : stations.filter(function (s) {
          return normalizeName(s.name).indexOf(q) >= 0;
        });
        if (listEl) listEl.innerHTML = renderPickerList(filtered, currentId);
      });
      setTimeout(function () { try { input.focus(); } catch (e) {} }, 150);
    }

    if (listEl) {
      listEl.addEventListener('click', function (e) {
        var row = e.target.closest('[data-station-id]');
        if (!row) return;
        setComboValue(role, row.getAttribute('data-station-id'));
        closeSheet();
      });
      listEl.addEventListener('keydown', function (e) {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        var row = e.target.closest('[data-station-id]');
        if (row) { e.preventDefault(); setComboValue(role, row.getAttribute('data-station-id')); closeSheet(); }
      });
    }
  }

  function initTimeTab() {
    originComboCtrl = initStationCombo('originSearch', 'originResults', 'originValue');
    destComboCtrl   = initStationCombo('destSearch',   'destResults',   'destValue');

    originComboCtrl.set('sindorim');
    destComboCtrl.set('gangnam');

    var arrive = byId('arriveBy');
    if (arrive) arrive.value = defaultArriveBy();

    var swap = byId('swapBtn');
    if (swap) swap.addEventListener('click', function () {
      var oId   = originComboCtrl.getId();
      var oName = (byId('originSearch') || {}).value || '';
      var dId   = destComboCtrl.getId();
      var dName = (byId('destSearch') || {}).value || '';
      originComboCtrl.setRaw(dId, dName);
      destComboCtrl.setRaw(oId, oName);
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
    var arrive = byId('arriveBy'), modeNow = byId('modeNow');
    var res = byId('timeResult');
    if (!res) return;
    var originId = originComboCtrl ? originComboCtrl.getIdSafe() : '';
    var destId   = destComboCtrl   ? destComboCtrl.getIdSafe()   : '';
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
      sub = '<div class="big-time-sub warn-text">희망 시각까지 도착이 어려워요 — 가장 빠른 도착 ' + escapeHtml(r.arriveAt) + '</div>';
    } else if (typeof r.minutesFromNow === 'number' && r.minutesFromNow < 0) {
      sub = '<div class="big-time-sub warn-text">출발 시각이 ' + Math.abs(r.minutesFromNow) + '분 지났어요 — 지금 바로 출발하세요</div>';
    } else if (!r.minutesFromNow) {
      sub = '<div class="big-time-sub">지금 바로 출발하세요</div>';
    } else {
      sub = '<div class="big-time-sub">지금부터 ' + r.minutesFromNow + '분 후 출발하세요</div>';
    }
    var route = r.route || {};
    var info = [];
    if (r.boardAt) info.push('탑승 ' + escapeHtml(r.boardAt));
    if (r.arriveAt) info.push('도착 ' + escapeHtml(r.arriveAt));
    if (typeof route.transfers === 'number') info.push('환승 ' + route.transfers + '회');
    if (arriveBy) info.push('희망 ' + escapeHtml(arriveBy));

    html += '<div class="card">' +
      '<div class="card-sub">' + escapeHtml(yeok(originId)) + ' → ' + escapeHtml(yeok(destId)) + ' · 집에서 출발 시각</div>' +
      '<div class="big-time">' + escapeHtml(r.leaveAt) + '</div>' + sub +
      (info.length ? '<div class="card-row muted">' + info.join(' · ') + '</div>' : '') +
      '</div>';

    // 엘리베이터 경고
    (r.elevatorWarnings || []).forEach(function (w) {
      var alt = w.alternative;
      html += '<div class="alt-box">' +
        '<div class="alt-title">⚠️ ' + escapeHtml(yeok(w.stationId)) + ' 엘리베이터 ' + escapeHtml(statusLabel(w.status)) + '</div>' +
        (alt && alt.station ? '<div class="alt-tip">추천 대체역: ' + altSummary(alt) + (alt.tip ? '<br>' + escapeHtml(alt.tip) : '') + '</div>' : '') +
        '<div class="msg-actions" style="display:flex;flex-wrap:wrap;gap:6px;margin-top:8px">' +
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
            '<span class="timeline-time">' + escapeHtml(t.time) + '</span>' +
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
    var arrive = byId('arriveBy'), modeNow = byId('modeNow');
    if (opts.originId && originComboCtrl) originComboCtrl.set(opts.originId);
    if (opts.destId   && destComboCtrl)   destComboCtrl.set(opts.destId);
    if (Object.prototype.hasOwnProperty.call(opts, 'arriveBy')) {
      if (opts.arriveBy) {
        if (modeNow) modeNow.checked = false;
        if (arrive) arrive.value = opts.arriveBy;
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
        return '<button type="button" class="btn btn-sm btn-ghost" data-action-index="' + i + '">' + escapeHtml(a.label) + '</button>';
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
    // suggestion chips disabled (REQ-CHAT-xxx)
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
    var stationBreak = byId('demoStationBreak');
    if (stationBreak) stationBreak.addEventListener('click', function () { demoSetStationBroken(true); });
    var stationRestore = byId('demoStationRestore');
    if (stationRestore) stationRestore.addEventListener('click', function () { demoSetStationBroken(false); });
    var elevList = byId('demoElevList');
    if (elevList) elevList.addEventListener('click', function (e) {
      var b = e.target.closest('[data-demo-elev]');
      if (b) demoToggleElevator(b.getAttribute('data-demo-elev'));
    });
    renderDemoStation();
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
  // 출발 시각 계산 탭 — 역 선택 콤보박스
  // ---------------------------------------------------------------------------
  var originComboCtrl = null, destComboCtrl = null;

  function initStationCombo(searchId, resultsId, valueId) {
    var input   = byId(searchId);
    var results = byId(resultsId);
    var hidden  = byId(valueId);
    var committed = false;
    var current   = [];

    function setAria(open) {
      if (input) input.setAttribute('aria-expanded', open ? 'true' : 'false');
    }

    function render(q) {
      if (q === undefined) q = input ? input.value.trim() : '';
      if (!q) {
        current = allStations().sort(function (a, b) { return koCompare(a.name, b.name); });
      } else {
        current = searchStations(q);
      }
      if (!current.length) {
        results.innerHTML = '<div class="combo-empty">역을 찾지 못했어요</div>';
      } else {
        results.innerHTML = current.map(function (s) {
          return '<div class="combo-item" data-id="' + escapeHtml(s.id) + '" role="option" tabindex="-1">' +
            '<span class="combo-name">' + escapeHtml(yeok(s)) + '</span>' +
            '<span class="combo-badges">' + lineBadges(s) + '</span>' +
            '</div>';
        }).join('');
      }
      results.hidden = false;
      setAria(true);
    }

    function pick(id, displayName) {
      if (hidden) hidden.value = id;
      if (input)  input.value  = displayName;
      committed = true;
      results.hidden = true;
      setAria(false);
      current = [];
    }

    function clear() {
      if (hidden) hidden.value = '';
      committed = false;
    }

    if (input) {
      input.addEventListener('focus', function () { input.select(); render(''); });
      input.addEventListener('click', function () { if (results.hidden) render(committed ? '' : undefined); });
      input.addEventListener('input', function () { clear(); render(); });
      input.addEventListener('blur', function () { setTimeout(function () { results.hidden = true; setAria(false); }, 180); });
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') { results.hidden = true; setAria(false); }
        else if (e.key === 'ArrowDown') {
          e.preventDefault();
          var first = results.querySelector('.combo-item');
          if (first) first.focus();
        } else if (e.key === 'Enter') {
          e.preventDefault();
          if (!committed && current.length) pick(current[0].id, yeok(current[0]));
        }
      });
    }

    if (results) {
      results.addEventListener('mousedown', function (e) { e.preventDefault(); });
      results.addEventListener('click', function (e) {
        var item = e.target.closest('.combo-item[data-id]');
        if (item) {
          var id = item.getAttribute('data-id');
          var st = getStation(id);
          pick(id, st ? yeok(st) : id);
          if (input) input.focus();
        }
      });
      results.addEventListener('keydown', function (e) {
        var item = e.target.closest('.combo-item');
        if (!item) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          var id = item.getAttribute('data-id');
          var st = getStation(id);
          pick(id, st ? yeok(st) : id);
          if (input) input.focus();
        } else if (e.key === 'ArrowDown') {
          var next = item.nextElementSibling;
          if (next) next.focus();
          e.preventDefault();
        } else if (e.key === 'ArrowUp') {
          var prev = item.previousElementSibling;
          if (prev) prev.focus(); else if (input) input.focus();
          e.preventDefault();
        } else if (e.key === 'Escape') {
          results.hidden = true;
          setAria(false);
          if (input) input.focus();
        }
      });
    }

    function getId()     { return hidden ? hidden.value : ''; }
    function getIdSafe() { return committed ? getId() : ''; }

    function set(stationId) {
      var st = getStation(stationId);
      if (st) pick(stationId, yeok(st));
    }
    function setRaw(id, displayName) {
      if (hidden) hidden.value = id;
      if (input)  input.value  = displayName;
      committed = !!id;
      results.hidden = true;
      setAria(false);
    }

    return { getId: getId, getIdSafe: getIdSafe, set: set, setRaw: setRaw };
  }

  // ---------------------------------------------------------------------------
  // 글자 크기 설정 (로그인과 무관한 접근성 설정, localStorage 사용)
  // ---------------------------------------------------------------------------
  var FONTSIZE_KEY = 'elevSubway.fontSize.v1';
  var FONTSIZE_LEVELS = ['normal', 'lg', 'xl', 'max'];

  function applyFontSize(level) {
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
      chip.classList.toggle('active', chip.getAttribute('data-fontsize') === level);
    });
  }

  function initFontSize() {
    var stored = 'normal';
    try { stored = localStorage.getItem(FONTSIZE_KEY) || 'normal'; } catch (e) {}
    if (FONTSIZE_LEVELS.indexOf(stored) < 0) stored = 'normal';
    updateFontSizeChips(stored);

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
    try { var r = sessionStorage.getItem(FAV_KEY); return r ? JSON.parse(r) : []; } catch (e) { return []; }
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
        '<div class="sheet-title">⭐ ' + name + '</div>' +
        '<div class="card-sub">즐겨찾기 장소 상세</div>' +
      '</div>' +
      '<div class="sheet-section">' +
        '<div class="section-label">주변 지하철역 정보</div>' +
        '<div class="alt-box fav-detail-notice">' +
          '<div class="alt-title">ℹ️ 위치 정보 미연결</div>' +
          '<div class="alt-tip">실제 위치 정보가 연결되지 않아 정확한 주변 역 거리를 표시할 수 없습니다.<br>React 마이그레이션 및 위치 API 연동 후 실제 정보가 표시됩니다.</div>' +
        '</div>' +
      '</div>' +
      '<div class="sheet-section">' +
        '<div class="section-label">지하철 이동 (데모)</div>' +
        '<div class="subway-demo-anim" id="subwayDemoAnim" aria-label="지하철 이동 데모">' +
          '<div class="subway-track"><span class="subway-train" aria-hidden="true">🚇</span></div>' +
          '<p class="subway-demo-label">시연용 애니메이션 · 실제 열차 위치가 아닙니다</p>' +
          '<button type="button" class="btn btn-sm btn-ghost" id="subwayDemoPlay">▶ 데모 보기</button>' +
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
  function renderFavStations(fav) { // eslint-disable-line no-unused-vars
    // TODO: 실제 위치 좌표로 주변 역 목록을 렌더링
  }

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
      if (favAddRow) favAddRow.hidden = false;
      if (favAddInput) { favAddInput.value = ''; favAddInput.focus(); }
    }
    function closeFavAdd() {
      if (favAddRow) favAddRow.hidden = true;
      if (favAddInput) favAddInput.value = '';
    }
    function commitFavAdd() {
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

  // ---------------------------------------------------------------------------
  // 상태 변경 구독
  // ---------------------------------------------------------------------------
  function initSubscriptions() {
    var es = ES();
    if (!es || !es.subscribe) return;
    es.subscribe(function () {
      safe('refreshSheet', refreshSheet);
      safe('renderElevatorTab', renderElevatorTab);
      safe('renderDemoStation', renderDemoStation);
    });
  }

  // ---------------------------------------------------------------------------
  // 초기화
  // ---------------------------------------------------------------------------
  function AUTH() { return window.AuthService; }

  function init() {
    safe('clock', initClock);
    safe('fontSize', initFontSize);
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
