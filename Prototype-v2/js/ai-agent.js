/* ai-agent.js — 규칙 기반 "AI 에이전트" (tool calling 시뮬레이션)
 * 의존: window.ElevatorService, window.TimeCalculator, window.MOCK(선택)
 * DOM/App 의존 없음. Response 객체만 반환하고 렌더링은 app.js 담당.
 */
(function () {
  'use strict';

  var DEFAULT_ORIGIN = 'sindorim';

  // ---------------------------------------------------------------------------
  // 대화 문맥
  // ---------------------------------------------------------------------------
  var ctx = {
    lastIntent: null,     // 직전 인텐트
    focusId: null,        // "거기/그 역"이 가리킬 역
    lastStations: [],     // 직전 메시지에서 언급된 역 id들
    lastOrigin: null,
    lastDest: null,
    lastArriveBy: null
  };

  // ---------------------------------------------------------------------------
  // 안전한 서비스 접근
  // ---------------------------------------------------------------------------
  function ES() { return window.ElevatorService || null; }
  function TC() { return window.TimeCalculator || null; }

  function safe(fn, fallback) {
    try {
      var r = fn();
      return (r === undefined || r === null) ? fallback : r;
    } catch (e) {
      return fallback;
    }
  }

  function getStation(id) {
    if (!id) return null;
    return safe(function () { return ES().getStation(id); }, null) ||
      safe(function () { return window.MOCK.stations[id]; }, null);
  }

  function getLine(lineId) {
    return safe(function () { return ES().getLine(lineId); }, null) ||
      safe(function () { return window.MOCK.lines[lineId]; }, null);
  }

  function getElevators(id) {
    var list = safe(function () { return ES().getElevators(id); }, []);
    return Array.isArray(list) ? list : [];
  }

  function getStatus(id) {
    return safe(function () { return ES().getStationStatus(id); }, 'UNKNOWN');
  }

  function hasData(id) {
    return safe(function () { return ES().hasElevatorData(id); }, getElevators(id).length > 0);
  }

  var STATUS_LABELS = {
    AVAILABLE: '정상 운행',
    PARTIAL: '일부 이용 불가',
    UNAVAILABLE: '이용 불가',
    UNKNOWN: '정보 없음'
  };

  function statusLabel(status) {
    return safe(function () { return ES().getStatusLabel(status); }, null) ||
      STATUS_LABELS[status] || STATUS_LABELS.UNKNOWN;
  }

  function findStationsInText(text) {
    var list = safe(function () { return ES().findStationsInText(text); }, []);
    if (!Array.isArray(list)) return [];
    // 중복 제거 (등장 순서 유지)
    var seen = {};
    return list.filter(function (s) {
      if (!s || !s.id || seen[s.id]) return false;
      seen[s.id] = true;
      return true;
    });
  }

  // ---------------------------------------------------------------------------
  // HTML 헬퍼 (section 8 공용 클래스만 사용)
  // ---------------------------------------------------------------------------
  function esc(s) {
    return String(s === undefined || s === null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function stName(stOrId) {
    var st = typeof stOrId === 'string' ? getStation(stOrId) : stOrId;
    var n = st ? (st.name || st.id) : String(stOrId || '알 수 없는');
    return /역$/.test(n) ? n : n + '역';
  }

  function pillClass(status) {
    return { AVAILABLE: 'ok', PARTIAL: 'warn', UNAVAILABLE: 'bad' }[status] || 'unknown';
  }

  function pill(status) {
    return '<span class="status-pill ' + pillClass(status) + '">' + esc(statusLabel(status)) + '</span>';
  }

  function lineBadge(lineId) {
    var line = getLine(lineId);
    var color = (line && line.color) || '#9CA3AF';
    var short = (line && line.short) || lineId;
    return '<span class="line-badge" style="--line-color:' + esc(color) + '">' + esc(short) + '</span>';
  }

  function lineBadges(st) {
    if (!st || !Array.isArray(st.lines)) return '';
    return st.lines.map(lineBadge).join(' ');
  }

  function lineName(lineId) {
    var line = getLine(lineId);
    return (line && line.name) || (lineId ? lineId + '호선' : '');
  }

  function isDown(e) { return !e || e.status !== 'AVAILABLE'; }

  function elevStatusWord(e) {
    if (!e) return '';
    if (e.status === 'MAINTENANCE') return '점검 중';
    if (e.status === 'UNAVAILABLE') return '고장';
    return '정상';
  }

  function elevListHtml(elevs) {
    if (!elevs.length) return '';
    return '<div class="elev-list">' + elevs.map(function (e) {
      var down = isDown(e);
      return '<div class="elev-item' + (down ? ' down' : '') + '">' +
        '<span class="elev-icon">' + (down ? '⛔' : '🛗') + '</span>' +
        '<div>' +
        '<div class="elev-loc">' + esc(e.location || '엘리베이터') + '</div>' +
        '<div class="elev-meta">' + esc(e.floors || '') + (e.floors ? ' · ' : '') + esc(elevStatusWord(e)) + '</div>' +
        (down && e.reason ? '<div class="elev-reason">' + esc(e.reason) + '</div>' : '') +
        '</div>' +
        '</div>';
    }).join('') + '</div>';
  }

  function stationHeaderHtml(st, status) {
    return '<div class="card-row">' +
      '<div class="card-title">' + esc(stName(st)) + '</div>' +
      '<div>' + lineBadges(st) + '</div>' +
      pill(status) +
      '</div>';
  }

  function accessibleRouteHtml(stationId, originId, destinationId) {
    var context = { affectedStationId: stationId, stationName: stName(stationId) };
    if (originId !== undefined) context.originStationId = originId;
    if (destinationId !== undefined) context.destinationStationId = destinationId;
    var es = ES();
    var snapshot = es && es.getAccessibleRouteSnapshot ? es.getAccessibleRouteSnapshot(context) : null;
    return window.AccessibleRouteView.render(snapshot, context);
  }

  function routeLegsHtml(route) {
    if (!route || !Array.isArray(route.legs) || !route.legs.length) return '';
    return '<div class="route-legs">' + route.legs.map(function (leg) {
      return '<div class="route-leg">' + lineBadge(leg.lineId) + ' ' +
        esc(stName(leg.from)) + ' → ' + esc(stName(leg.to)) + ' · ' + esc(leg.stops) + '개역</div>';
    }).join('') + '</div>';
  }

  // ---------------------------------------------------------------------------
  // Response 생성
  // ---------------------------------------------------------------------------
  function resp(text, html, toolCalls, suggestions, actions) {
    return {
      text: text || '',
      html: html || '',
      toolCalls: toolCalls || [],
      suggestions: (suggestions || []).filter(Boolean).slice(0, 3),
      actions: actions || []
    };
  }

  function uniq(arr) {
    var seen = {};
    return arr.filter(function (x) {
      if (!x || seen[x]) return false;
      seen[x] = true;
      return true;
    });
  }

  function toolCheckElevator(st) {
    var id = st.id, status = getStatus(id), elevs = getElevators(id);
    ctx.focusId = id;
    var ok = elevs.filter(function (e) { return !isDown(e); }).length;
    var text = stName(st) + (elevs.length ? ' 엘리베이터 ' + elevs.length + '대 중 ' + ok + '대가 운행 상태로 표시돼요.' : '은 엘리베이터 운행 정보가 없어요.');
    text += ' 역별 상태만으로 승강장·환승·출구까지 계단 없는 경로를 확인할 수는 없어요.';
    var html = '<div class="card">' + stationHeaderHtml(st, status) +
      '<div class="card-sub">역별 설비 상태 · 전체 경로 접근성은 별도 확인이 필요해요.</div>' + elevListHtml(elevs);
    if (status !== 'AVAILABLE') html += accessibleRouteHtml(id);
    html += '</div>';
    return resp(text, html, [{ name: 'check_elevator', args: { stationId: id } }],
      [stName(st) + ' 대체 경로는?', '지금 고장난 역 알려줘'],
      [{ label: stName(st) + ' 상세 보기', type: 'openStation', payload: id }]);
  }

  function toolFindAlternative(st) {
    var id = st.id, status = getStatus(id);
    ctx.focusId = id;
    var html = '<div class="card">' + stationHeaderHtml(st, status) +
      '<div class="card-sub">계단 없이 이동할 수 있는 지하철 경로를 우선 확인해요.</div>' +
      accessibleRouteHtml(id) + '</div>';
    return resp(stName(st) + '의 대체 경로는 지하철 우회를 우선으로 확인해요. 아래 접근성 검증 상태를 확인해 주세요. 역별 상태만으로 전체 경로의 접근성이 확인되는 것은 아니에요.',
      html, [{ name: 'check_elevator', args: { stationId: id } }, { name: 'check_accessible_routes', args: { stationId: id } }],
      [stName(st) + ' 엘리베이터 돼?', '지금 고장난 역 알려줘'],
      [{ label: '역 정보 보기', type: 'openStation', payload: id }]);
  }

  function warningStation(w) {
    if (!w) return null;
    return w.stationId || (w.station && w.station.id) || null;
  }

  function toolCalculateDeparture(originId, destId, arriveBy, notes) {
    var toolCalls = [{ name: 'calculate_departure', args: { originId: originId, destId: destId, arriveBy: arriveBy } }];
    var origin = getStation(originId);
    var dest = getStation(destId);
    ctx.lastOrigin = originId;
    ctx.lastDest = destId;
    ctx.lastArriveBy = arriveBy;
    ctx.focusId = destId;
    var noteText = notes && notes.length ? notes.join(' ') + ' ' : '';

    if (!origin || !dest) {
      return resp('죄송해요, 역 정보를 찾지 못했어요. 역 이름을 다시 말씀해 주시겠어요?', '', toolCalls,
        ['신도림에서 잠실까지 3시까지 가려면?', '강남역 엘리베이터 돼?'], []);
    }
    if (originId === destId) {
      return resp(noteText + '출발역과 도착역이 같은 ' + stName(origin) + '이에요. 다른 도착역을 말씀해 주세요.', '', toolCalls,
        ['신도림에서 잠실까지 3시까지 가려면?', '시청에서 강남까지 몇 시에 출발해?'], []);
    }

    var r = safe(function () {
      return TC().calculateDeparture({ originId: originId, destId: destId, arriveBy: arriveBy || null, now: new Date() });
    }, null);
    if (!r) {
      return resp(noteText + stName(origin) + '에서 ' + stName(dest) + '까지 경로를 계산하지 못했어요. 다른 역으로 다시 시도해 주세요.', '',
        toolCalls, ['신도림에서 잠실까지 3시까지 가려면?', '지금 고장난 역 알려줘'],
        [{ label: '출발계산 탭에서 열기', type: 'openTime', payload: { originId: originId, destId: destId, arriveBy: arriveBy || null } }]);
    }

    var mins = typeof r.minutesFromNow === 'number' ? Math.round(r.minutesFromNow) : null;
    var sub;
    if (r.late) {
      sub = '<div class="big-time-sub warn-text">이미 늦었어요 · 지금 출발해도 ' + esc(r.arriveAt) + ' 도착 예정</div>';
    } else if (mins !== null && mins < 0) {
      sub = '<div class="big-time-sub warn-text">이미 늦었어요 · 지금 바로 출발하세요</div>';
    } else if (mins === 0) {
      sub = '<div class="big-time-sub">지금 바로 출발하세요</div>';
    } else if (mins !== null) {
      sub = '<div class="big-time-sub">지금부터 ' + mins + '분 후 출발</div>';
    } else {
      sub = '';
    }

    var route = r.route || null;
    var html = '<div class="card">' +
      '<div class="card-row"><div class="card-title">' + esc(stName(origin)) + ' → ' + esc(stName(dest)) + '</div>' +
      '<span class="muted">' + (arriveBy ? esc(arriveBy) + ' 도착 목표' : '지금 바로 출발') + '</span></div>' +
      '<div class="card-sub muted">집에서 출발할 시각</div>' +
      '<div class="big-time">' + esc(r.leaveAt) + '</div>' + sub;

    if (route) {
      html += '<div class="card-sub">' + esc(route.stops) + '개역 · 환승 ' + esc(route.transfers) + '회 · 탑승 약 ' + esc(route.rideMinutes) + '분 · ' + esc(r.arriveAt) + ' 도착</div>';
      html += routeLegsHtml(route);
    }
    html += window.DepartureGraphic.render({ departureTime: r.leaveAt, boardingTime: r.boardAt, stationName: stName(origin) });

    // 엘리베이터 경고: 계산기 제공분 + 환승역
    var warnIds = [];
    var warnHtml = '';
    var actions = [];
    var warnings = Array.isArray(r.elevatorWarnings) ? r.elevatorWarnings : [];
    warnings.forEach(function (w) {
      var sid = warningStation(w);
      if (!sid || warnIds.indexOf(sid) >= 0) return;
      warnIds.push(sid);
      var status = w.status || getStatus(sid);
      warnHtml += '<div class="card-row warn-text">⚠️ ' + esc(stName(sid)) + ' 엘리베이터 ' + esc(statusLabel(status)) + ' ' + pill(status) + '</div>';
      warnHtml += accessibleRouteHtml(sid, originId, destId);
    });
    if (route && Array.isArray(route.legs)) {
      route.legs.slice(0, -1).forEach(function (leg) {
        var tid = leg.to;
        if (!tid || warnIds.indexOf(tid) >= 0) return;
        var s = getStatus(tid);
        if (s === 'PARTIAL' || s === 'UNAVAILABLE') {
          warnIds.push(tid);
          warnHtml += '<div class="card-row warn-text">⚠️ 환승역 ' + esc(stName(tid)) + ' 엘리베이터 ' + esc(statusLabel(s)) + ' ' + pill(s) + '</div>' + accessibleRouteHtml(tid, originId, destId);
        }
      });
    }
    html += warnHtml + '</div>';

    actions.unshift({ label: '출발계산 탭에서 열기', type: 'openTime', payload: { originId: originId, destId: destId, arriveBy: arriveBy || null } });

    var text;
    if (r.late) {
      text = (arriveBy ? arriveBy + '까지 ' : '') + stName(dest) + '에 도착하기는 어려워요. 지금 바로 출발하면 ' + r.arriveAt + '쯤 도착할 것 같아요.';
    } else if (!arriveBy) {
      text = '지금 바로 출발하면 ' + r.leaveAt + '에 나서서 ' + stName(dest) + ' 출구에 ' + r.arriveAt + '쯤 도착해요.';
    } else if (mins !== null && mins <= 0) {
      text = arriveBy + '까지 ' + stName(dest) + '에 도착하려면 지금 바로 출발하셔야 해요. 도착 예정은 ' + r.arriveAt + '이에요.';
    } else {
      text = arriveBy + '까지 ' + stName(dest) + '에 도착하려면 ' + r.leaveAt + '에 출발하세요' +
        (mins !== null ? ' (지금부터 ' + mins + '분 후).' : '.') + ' ' + r.boardAt + ' 열차를 타면 ' + r.arriveAt + '에 도착해요.';
    }
    if (warnIds.length) text += '\n⚠️ ' + warnIds.map(stName).join(', ') + ' 엘리베이터에 이용 불가 구간이 있어요.';
    text = noteText + text;

    var sugg = [
      warnIds.length ? stName(warnIds[0]) + ' 대체역은?' : stName(dest) + ' 엘리베이터 돼?',
      arriveBy ? '지금 바로 출발하면?' : stName(origin) + '에서 ' + (dest.name || '') + ' 가는 길',
      '지금 고장난 역 알려줘'
    ];
    return resp(text, html, toolCalls, sugg, actions);
  }

  function toolListOutages() {
    var toolCalls = [{ name: 'list_outages', args: {} }];
    if (!ES()) {
      return resp('지금은 엘리베이터 현황 데이터를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.', '', toolCalls,
        ['강남역 엘리베이터 돼?', '사용법 알려줘'], []);
    }
    var outages = safe(function () { return ES().getOutages(); }, []);
    if (!Array.isArray(outages)) outages = [];
    outages = outages.filter(function (o) { return o && o.station; });
    var rank = { UNAVAILABLE: 0, PARTIAL: 1 };
    outages.sort(function (a, b) {
      var d = (rank[a.status] !== undefined ? rank[a.status] : 2) - (rank[b.status] !== undefined ? rank[b.status] : 2);
      if (d) return d;
      return ((b.broken || []).length) - ((a.broken || []).length);
    });

    if (!outages.length) {
      ctx.focusId = null;
      return resp('지금은 고장이나 점검 중인 엘리베이터가 없어요. 모든 역이 정상 운행 중이에요 🙂',
        '<div class="card"><div class="card-title">엘리베이터 고장 현황</div><div class="card-sub muted">이용 불가 엘리베이터가 없어요.</div></div>',
        toolCalls, ['강남역 엘리베이터 돼?', '신도림에서 잠실까지 3시까지 가려면?'], []);
    }

    ctx.focusId = outages[0].station.id;
    ctx.lastStations = outages.map(function (o) { return o.station.id; });

    var totalBroken = outages.reduce(function (n, o) { return n + (o.broken || []).length; }, 0);
    var fullCount = outages.filter(function (o) { return o.status === 'UNAVAILABLE'; }).length;
    var html = '<div class="card">' +
      '<div class="card-title">엘리베이터 이용 불가 역 ' + outages.length + '곳</div>' +
      '<div class="card-sub muted">이용 불가 엘리베이터 총 ' + totalBroken + '대 · 전체 불가 ' + fullCount + '곳</div>';
    outages.forEach(function (o) {
      var st = o.station;
      var broken = o.broken || [];
      var reasons = uniq(broken.map(function (e) { return e && e.reason; })).slice(0, 1);
      html += '<div class="card-row">' +
        '<span class="card-title">' + esc(stName(st)) + '</span> ' + lineBadges(st) + ' ' + pill(o.status) +
        ' <span class="muted">' + broken.length + '대 이용 불가' + (reasons.length ? ' · ' + esc(reasons[0]) : '') + '</span>' +
        '</div>';
    });
    html += '</div>';

    var names = outages.slice(0, 3).map(function (o) { return stName(o.station); });
    var text = '현재 엘리베이터 이용이 어려운 역은 ' + outages.length + '곳이에요. ' +
      names.join(', ') + (outages.length > 3 ? ' 등' : '') + '을 확인해 주세요.';
    var top = outages[0].station;
    return resp(text, html, toolCalls,
      [stName(top) + ' 대체역은?', stName(top) + ' 엘리베이터 돼?', '신도림에서 잠실까지 3시까지 가려면?'],
      outages.slice(0, 3).map(function (o) {
        return { label: stName(o.station) + ' 보기', type: 'openStation', payload: o.station.id };
      }));
  }

  function toolFindRoute(originId, destId, notes) {
    var toolCalls = [{ name: 'find_route', args: { originId: originId, destId: destId } }];
    var origin = getStation(originId);
    var dest = getStation(destId);
    ctx.lastOrigin = originId;
    ctx.lastDest = destId;
    ctx.lastArriveBy = null;
    ctx.focusId = destId;
    var noteText = notes && notes.length ? notes.join(' ') + ' ' : '';
    if (!origin || !dest) {
      return resp('역 정보를 찾지 못했어요. 출발역과 도착역을 다시 말씀해 주세요.', '', toolCalls,
        ['신도림에서 홍대 가는 길 알려줘', '강남역 엘리베이터 돼?'], []);
    }
    if (originId === destId) {
      return resp(noteText + '출발역과 도착역이 같은 ' + stName(origin) + '이에요. 다른 도착역을 말씀해 주세요.', '', toolCalls,
        ['신도림에서 홍대 가는 길 알려줘', '시청에서 강남 가는 길'], []);
    }
    var route = safe(function () { return TC().findRoute(originId, destId); }, null);
    if (!route) {
      return resp(noteText + stName(origin) + '에서 ' + stName(dest) + '까지 경로를 찾지 못했어요.', '', toolCalls,
        ['지금 고장난 역 알려줘', '강남역 엘리베이터 돼?'], []);
    }

    var legs = Array.isArray(route.legs) ? route.legs : [];
    var transferIds = uniq(legs.slice(0, -1).map(function (l) { return l.to; }));
    var checkIds = uniq([originId].concat(transferIds, [destId]));
    toolCalls.push({ name: 'check_elevator', args: { stationIds: checkIds } });

    var html = '<div class="card">' +
      '<div class="card-title">' + esc(stName(origin)) + ' → ' + esc(stName(dest)) + '</div>' +
      '<div class="card-sub">' + esc(route.stops) + '개역 · 환승 ' + esc(route.transfers) + '회 · 탑승 약 ' + esc(route.rideMinutes) + '분</div>' +
      routeLegsHtml(route);

    var problems = [];
    checkIds.forEach(function (sid) {
      var st = getStation(sid);
      var s = getStatus(sid);
      var role = sid === originId ? '출발' : (sid === destId ? '도착' : '환승');
      html += '<div class="card-row"><span class="muted">' + role + '</span> <span class="card-title">' + esc(stName(st || sid)) + '</span> ' +
        lineBadges(st) + ' ' + pill(s) + '</div>';
      if (s === 'PARTIAL' || s === 'UNAVAILABLE') problems.push(sid);
    });

    var actions = [{ label: '출발 시각 계산하기', type: 'openTime', payload: { originId: originId, destId: destId, arriveBy: null } }];
    if (problems.length) {
      var p = problems[0];
      html += '<div class="card-sub warn-text">⚠️ ' + esc(problems.map(stName).join(', ')) + ' 엘리베이터 이용에 제한이 있어요.</div>';
      html += accessibleRouteHtml(p, originId, destId);
    }
    html += '</div>';

    var legText = legs.map(function (l) { return lineName(l.lineId); }).join(' → ');
    var text = noteText + stName(origin) + '에서 ' + stName(dest) + '까지 ' + (legText ? legText + '으로 ' : '') +
      route.stops + '개역, 약 ' + route.rideMinutes + '분 걸려요' +
      (transferIds.length ? ' (' + transferIds.map(stName).join(', ') + ' 환승).' : '.');
    text += problems.length
      ? '\n⚠️ ' + problems.map(stName).join(', ') + ' 엘리베이터에 이용 불가 구간이 있어요.'
      : ' 확인된 역별 설비에는 고장이 표시되지 않아요. 전체 경로의 계단 없는 이동은 별도 확인이 필요해요.';

    return resp(text, html, toolCalls,
      [(dest.name || '') + '까지 3시까지 가려면?', problems.length ? stName(problems[0]) + ' 대체역은?' : stName(dest) + ' 엘리베이터 돼?', '지금 고장난 역 알려줘'],
      actions);
  }

  // ---------------------------------------------------------------------------
  // 인사 / 도움말 / 폴백
  // ---------------------------------------------------------------------------
  var WELCOME_SUGGESTIONS = [
    '강남역 엘리베이터 돼?',
    '시청역 엘리베이터 고장났는데 어디로 가야 해?',
    '신도림에서 잠실까지 3시까지 가려면?',
    '지금 고장난 역 알려줘'
  ];

  function getWelcome() {
    var w = resp(
      '안녕하세요! 지하철 엘리베이터 도우미예요 🛗\n' +
      '역 엘리베이터 운행 상태 확인, 고장 시 지하철 우회 경로의 접근성 확인, 엘리베이터를 고려한 출발 시각 계산을 도와드릴게요. 무엇이든 편하게 물어보세요.',
      '', [], [], []);
    w.suggestions = WELCOME_SUGGESTIONS.slice();
    return w;
  }

  function helpResponse(isGreeting) {
    var html = '<div class="card">' +
      '<div class="card-title">이런 걸 할 수 있어요</div>' +
      '<div class="card-row">🛗 <span>역 엘리베이터 운행 상태 확인 <span class="muted">"강남역 엘리베이터 돼?"</span></span></div>' +
      '<div class="card-row">🔁 <span>지하철 우회 경로의 검증 상태 확인 <span class="muted">"시청역 고장났는데 어디로 가?"</span></span></div>' +
      '<div class="card-row">⏱️ <span>도착 시각에 맞춘 출발 시각 계산 <span class="muted">"신도림에서 잠실까지 3시까지"</span></span></div>' +
      '<div class="card-row">🗺️ <span>경로와 환승역 엘리베이터 확인 <span class="muted">"홍대 가는 길 알려줘"</span></span></div>' +
      '<div class="card-row">📋 <span>전체 고장 현황 <span class="muted">"지금 고장난 역 알려줘"</span></span></div>' +
      '</div>';
    return resp((isGreeting ? '안녕하세요! 😊 ' : '') + '엘리베이터 상태 확인, 대체역 안내, 출발 시각 계산을 도와드릴 수 있어요. 아래 예시처럼 물어보세요.',
      html, [], WELCOME_SUGGESTIONS.slice(0, 3), []);
  }

  function fallbackResponse() {
    return resp('죄송해요, 잘 이해하지 못했어요 😅 역 이름과 함께 물어봐 주시면 더 정확히 도와드릴 수 있어요.\n예) "강남역 엘리베이터 돼?", "신도림에서 잠실까지 3시까지 가려면?"',
      '', [], ['강남역 엘리베이터 돼?', '지금 고장난 역 알려줘', '사용법 알려줘'], []);
  }

  // ---------------------------------------------------------------------------
  // 파싱
  // ---------------------------------------------------------------------------
  var TIME_HINT = /(\d{1,2}|한|두|세|네|다섯|여섯|일곱|여덟|아홉|열|열한|열두)\s*시(?!청|간)|\d{1,2}\s*:\s*\d{2}|정오|자정/;

  function parseTime(text) {
    if (!TIME_HINT.test(text)) return null;
    var t = safe(function () { return TC().parseKoreanTime(text, new Date()); }, null);
    return (typeof t === 'string' && /^\d{1,2}:\d{2}$/.test(t)) ? t : null;
  }

  // 2개 이상 역 → 출발/도착 판정
  function resolveOriginDest(text, stations) {
    var ids = stations.map(function (s) { return s.id; });
    var origin = ids[0];
    var dest = ids[1];
    // "A에서 / A부터" → A가 출발
    var m = text.match(/^(.*?)(에서|부터|출발해서)/);
    if (m) {
      var before = findStationsInText(m[1]);
      if (before.length) {
        origin = before[before.length - 1].id;
        dest = ids.filter(function (id) { return id !== origin; })[0] || dest;
        return { origin: origin, dest: dest };
      }
    }
    // "B까지 / B로 가" → B가 도착
    var m2 = text.match(/^(.*?)(까지|으로\s*가|로\s*가)/);
    if (m2) {
      var bef = findStationsInText(m2[1]);
      if (bef.length) {
        dest = bef[bef.length - 1].id;
        origin = ids.filter(function (id) { return id !== dest; })[0] || origin;
      }
    }
    return { origin: origin, dest: dest };
  }

  var RX = {
    greeting: /안녕|도움|뭐\s*할\s*수|사용법|도와줘|하이|hello|\bhi\b|help/i,
    outages: /고장\s*난\s*(역|곳|데)|점검\s*중인\s*(역|곳)|어디\s*(가|가요)?\s*고장|현황|전체|목록|리스트/,
    alternative: /고장|안\s*돼|안\s*되|못\s*타|못\s*써|대체|우회|다른\s*역|어디로|멈췄|멈춰/,
    elevator: /엘리베이터|엘베|승강기|돼\s*\?|되나|돼요|되요|운행|상태|휠체어|유모차|이용\s*가능|탈\s*수/,
    departureStrong: /출발|몇\s*시에|몇\s*시쯤|언제\s*나가|늦지\s*않게|나가야|나서야|집에서\s*언제/,
    departureWeak: /까지\s*가려면|도착하려면|까지\s*도착|에\s*도착|까지\s*가야/,
    route: /가는\s*길|경로|어떻게\s*가|환승|길\s*(좀\s*)?알려|가는\s*방법|가려면/,
    reference: /거기|그\s*역|그곳|그\s*쪽|그럼|그러면|그\s*데|여기/
  };

  function classify(text, stations, time) {
    var s = { departure: 0, alternative: 0, outages: 0, route: 0, elevator: 0, greeting: 0 };
    if (RX.departureStrong.test(text)) s.departure += 4;
    if (RX.departureWeak.test(text)) {
      if (time) s.departure += 4; else s.route += 3;
    }
    if (time && /까지|도착|가려면|에\s*가/.test(text)) s.departure += 3;
    if (RX.alternative.test(text)) s.alternative += 3;
    if (/대체역|우회/.test(text)) s.alternative += 3;
    if (RX.outages.test(text)) s.outages += stations.length ? 0 : 6;
    if (RX.route.test(text)) s.route += 3;
    if (stations.length >= 2) s.route += 1;
    if (time) s.route -= 2;
    if (RX.elevator.test(text)) s.elevator += 2;
    if (RX.greeting.test(text)) s.greeting += stations.length ? 0 : 2;
    // "고장난 역 알려줘" 같은 목록 질의는 대체역보다 우선
    if (s.outages > 0) s.alternative -= 2;

    var order = ['departure', 'alternative', 'outages', 'route', 'elevator', 'greeting'];
    var best = null;
    var bestScore = 0;
    order.forEach(function (k) {
      if (s[k] > bestScore) { best = k; bestScore = s[k]; }
    });
    return best;
  }

  // ---------------------------------------------------------------------------
  // 메인 처리
  // ---------------------------------------------------------------------------
  function handle(rawText) {
    var text = String(rawText || '').trim();
    if (!text) return fallbackResponse();

    var stations = findStationsInText(text);
    var ids = stations.map(function (s) { return s.id; });
    var time = parseTime(text);
    var intent = classify(text, stations, time);
    var refers = RX.reference.test(text);

    // 명시적 인텐트 없이 역만 있거나 "그럼 X는?" → 직전 인텐트 재사용
    if (!intent || (intent === 'elevator' && !RX.elevator.test(text))) {
      if (stations.length && ctx.lastIntent && /^(check_elevator|find_alternative)$/.test(ctx.lastIntent) &&
          (refers || /[은는]\s*\??$|요\s*\??$/.test(text))) {
        intent = ctx.lastIntent === 'find_alternative' ? 'alternative' : 'elevator';
      } else if (stations.length) {
        intent = 'elevator';
      }
    }

    var focus = ctx.focusId ? getStation(ctx.focusId) : null;
    var result;

    switch (intent) {
      case 'departure': {
        var notes = [];
        var originId, destId;
        var arriveBy = time;
        if (ids.length >= 2) {
          var od = resolveOriginDest(text, stations);
          originId = od.origin; destId = od.dest;
        } else if (ids.length === 1) {
          destId = ids[0];
          if (refers && ctx.lastOrigin && ctx.lastOrigin !== destId) {
            originId = ctx.lastOrigin;
          } else {
            originId = DEFAULT_ORIGIN;
            notes.push('출발역을 말씀하지 않으셔서 신도림역 기준으로 계산했어요.');
          }
        } else if (ctx.lastOrigin && ctx.lastDest) {
          originId = ctx.lastOrigin; destId = ctx.lastDest;
          if (!arriveBy && !/지금|바로|당장/.test(text)) arriveBy = ctx.lastArriveBy;
        } else if (focus) {
          destId = focus.id;
          originId = DEFAULT_ORIGIN;
          notes.push('출발역을 말씀하지 않으셔서 신도림역 기준으로 계산했어요.');
        } else {
          result = resp('어느 역까지 가시는지 알려주시면 출발 시각을 계산해 드릴게요. 예) "신도림에서 잠실까지 3시까지 가려면?"', '',
            [], ['신도림에서 잠실까지 3시까지 가려면?', '강남역까지 2시 반까지 가려면?'], []);
          break;
        }
        result = toolCalculateDeparture(originId, destId, arriveBy || null, notes);
        ctx.lastIntent = 'calculate_departure';
        break;
      }
      case 'alternative': {
        var target = stations[0] || focus;
        if (!target) {
          // 역 없이 "고장"만 → 고장 현황으로 안내
          result = toolListOutages();
          result.text = '어느 역인지 말씀해 주시면 대체역을 찾아드릴게요. 우선 현재 고장 현황을 보여드릴게요.\n' + result.text;
          ctx.lastIntent = 'list_outages';
          break;
        }
        result = toolFindAlternative(target);
        ctx.lastIntent = 'find_alternative';
        break;
      }
      case 'outages':
        result = toolListOutages();
        ctx.lastIntent = 'list_outages';
        break;
      case 'route': {
        var notesR = [];
        var o, d;
        if (ids.length >= 2) {
          var od2 = resolveOriginDest(text, stations);
          o = od2.origin; d = od2.dest;
        } else if (ids.length === 1) {
          d = ids[0];
          if (refers && focus && focus.id !== d) {
            o = focus.id;
          } else {
            o = DEFAULT_ORIGIN;
            notesR.push('출발역을 말씀하지 않으셔서 신도림역 기준으로 안내할게요.');
          }
        } else if (ctx.lastOrigin && ctx.lastDest) {
          o = ctx.lastOrigin; d = ctx.lastDest;
        } else {
          result = resp('출발역과 도착역을 알려주시면 엘리베이터 상태까지 확인해서 경로를 안내해 드릴게요.', '', [],
            ['신도림에서 홍대 가는 길 알려줘', '시청에서 강남 가는 길'], []);
          break;
        }
        result = toolFindRoute(o, d, notesR);
        ctx.lastIntent = 'find_route';
        break;
      }
      case 'elevator': {
        var st = stations[0] || focus;
        if (!st) {
          result = resp('어느 역의 엘리베이터가 궁금하신가요? 역 이름을 알려주세요.', '', [],
            ['강남역 엘리베이터 돼?', '시청역 엘리베이터 돼?', '지금 고장난 역 알려줘'], []);
          break;
        }
        if (stations.length >= 2) {
          // 여러 역 동시 질의 → 첫 역 상세 + 나머지는 텍스트 요약
          result = toolCheckElevator(stations[0]);
          var extra = stations.slice(1, 3).map(function (x) { return stName(x) + ' ' + statusLabel(getStatus(x.id)); });
          result.text += '\n참고로 ' + extra.join(', ') + ' 상태예요.';
          result.toolCalls = result.toolCalls.concat(stations.slice(1, 3).map(function (x) {
            return { name: 'check_elevator', args: { stationId: x.id } };
          }));
          ctx.focusId = stations[0].id;
        } else {
          result = toolCheckElevator(st);
        }
        ctx.lastIntent = 'check_elevator';
        break;
      }
      case 'greeting':
        result = helpResponse(/안녕|하이|hello|\bhi\b/i.test(text));
        ctx.lastIntent = 'greeting';
        break;
      default:
        result = fallbackResponse();
    }

    if (ids.length) ctx.lastStations = ids;
    return result || fallbackResponse();
  }

  function processMessage(text) {
    var delay = 400 + Math.floor(Math.random() * 500);
    return new Promise(function (resolve) {
      setTimeout(function () {
        var r;
        try {
          r = handle(text);
        } catch (e) {
          if (typeof console !== 'undefined' && console.error) console.error('[AIAgent]', e);
          r = resp('앗, 처리 중에 문제가 생겼어요. 잠시 후 다시 물어봐 주세요 🙏', '', [],
            ['강남역 엘리베이터 돼?', '지금 고장난 역 알려줘'], []);
        }
        resolve(r);
      }, delay);
    });
  }

  function reset() {
    ctx.lastIntent = null;
    ctx.focusId = null;
    ctx.lastStations = [];
    ctx.lastOrigin = null;
    ctx.lastDest = null;
    ctx.lastArriveBy = null;
  }

  window.AIAgent = {
    processMessage: processMessage,
    getWelcome: getWelcome,
    reset: reset
  };
})();
