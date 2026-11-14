/* Issue #63: escaped, presentation-only accessible route cards. Policy owns verification. */
(function (root) {
  'use strict';
  var FALLBACK_CHECKS = [
    ['train_direction', '해당 방향 열차 운행'], ['return_direction', '반대 방향 열차 이용'],
    ['platform_step_free', '승강장 간 계단 없는 이동'], ['transfer_step_free', '환승 구간 엘리베이터'],
    ['elevators_operating', '필요 엘리베이터 운행'], ['destination_access', '목적지 출구·동선'],
    ['path_connected', '전체 경로 연결']
  ].map(function (entry) { return { key: entry[0], label: entry[1] }; });
  function displayable(value) {
    return typeof value === 'string' || (typeof value === 'number' && Number.isFinite(value));
  }
  function escape(value) {
    return String(displayable(value) ? value : '확인 필요').replace(/[&<>"']/g, function (character) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character];
    });
  }
  function text(value) { return !displayable(value) || value === '' ? '확인 필요' : escape(value); }
  function list(value) { return Array.isArray(value) ? value : []; }
  function checksHTML(assessment, expanded) {
    var values = list(assessment && assessment.checks);
    var rows = FALLBACK_CHECKS.map(function (check) {
      var found = values.find(function (item) { return item && item.key === check.key; });
      var state = found && found.status === 'VERIFIED' ? 'verified' : found && found.status === 'FAILED' ? 'failed' : 'unknown';
      var label = state === 'verified' ? '확인됨' : state === 'failed' ? '조건 불충족' : '확인 필요';
      return '<li class="accessible-route-check accessible-route-check--' + state + '"><span>' + escape(check.label) + '</span><strong>' + label + '</strong></li>';
    }).join('');
    return '<details class="accessible-route-checks"' + (expanded ? ' open' : '') + '><summary>이용 조건 7가지 확인</summary><ul>' + rows + '</ul></details>';
  }
  function metricsHTML(assessment) {
    var metrics = assessment.metrics || {};
    var rows = [ ['전체 시간', 'durationMinutes', '분'], ['추가 시간', 'additionalMinutes', '분'],
      ['추가 정거장', 'additionalStops', '개 역'], ['환승 횟수', 'transferCount', '회'], ['추가 거리', 'additionalDistanceM', 'm'] ];
    return '<dl class="accessible-route-metrics">' + rows.map(function (row) {
      var value = metrics[row[1]];
      var valid = typeof value === 'number' && Number.isFinite(value) && value >= 0 &&
        (row[1] !== 'additionalStops' && row[1] !== 'transferCount' || Number.isInteger(value));
      return '<div><dt>' + row[0] + '</dt><dd>' + (valid ? escape(value) + row[2] : '확인 필요') + '</dd></div>';
    }).join('') + '</dl>' + (assessment.route && assessment.route.timing_estimated === true ? '<p class="accessible-route-note">시간은 예상값이에요.</p>' : '');
  }
  function itineraryHTML(route) {
    var nodes = list(route.nodes);
    var steps = list(route.steps);
    // Never draw an invalid chain, even if an upstream assessment is accidentally mislabeled.
    var connected = nodes.length >= 2 && steps.length === nodes.length - 1 && nodes.every(function (node) { return node && node.station_name; }) &&
      steps.every(function (step, index) { return step && step.from_node_id === nodes[index].node_id && step.to_node_id === nodes[index + 1].node_id; });
    if (!connected) return '<p class="accessible-route-note">경로 연결 정보 확인 필요</p>';
    var additional = nodes.filter(function (node) { return node && node.is_additional === true; });
    var result = '<p><strong>추가로 지날 역</strong> · ' + (additional.length ? additional.map(function (node) { return text(node.station_name); }).join(' · ') : '확인 필요') + '</p>';
    result += '<ol class="accessible-route-itinerary"><li><strong>출발 · ' + text(nodes[0].station_name) + '</strong></li>';
    steps.forEach(function (step, index) {
      var detail;
      if (step.kind === 'TRANSFER') detail = '환승 · ' + text(nodes[index].station_name) + (step.line_id ? ' · ' + text(step.line_name || step.line_id) : '');
      else if (step.kind === 'REVERSE') detail = '반대 방향 이동 · ' + text(step.line_name || step.line_id) + ' · ' + text(step.direction);
      else if (step.kind === 'RIDE') detail = '지하철 이동 · ' + text(step.line_name || step.line_id) + ' · ' + text(step.direction);
      else detail = '역내 이동';
      result += '<li><span>' + detail + '</span><strong>' + text(nodes[index + 1].station_name) + '</strong></li>';
    });
    result += '</ol>';
    var needed = [];
    steps.forEach(function (step) { list(step.elevator_ids).forEach(function (id) { if (needed.indexOf(id) < 0) needed.push(id); }); });
    result += '<div class="accessible-route-facilities"><strong>필요 엘리베이터</strong>';
    if (!needed.length) result += '<p>경로의 엘리베이터 이용 조건을 확인해 주세요.</p>';
    else result += '<ul>' + needed.map(function (id) {
      var elevator = list(route.elevators).find(function (item) { return item && item.elevator_id === id; });
      var operating = elevator && elevator.status === 'AVAILABLE' ? '정상' : elevator && elevator.status === 'UNAVAILABLE' ? '이용 불가' : '정보 없음';
      return '<li>' + text(id) + ' · ' + text(elevator && elevator.location) + ' · ' + operating + '</li>';
    }).join('') + '</ul>';
    var exit = route.destination_exit || {};
    return result + '<p>목적지 출구 · ' + text(exit.exit_id) + ' · ' + text(exit.description) + '</p></div>';
  }
  function expiresAt(route) {
    var times = [route.valid_until];
    FALLBACK_CHECKS.forEach(function (check) { times.push(route.checks && route.checks[check.key] && route.checks[check.key].valid_until); });
    var needed = new Set();
    list(route.steps).forEach(function (step) { list(step && step.elevator_ids).forEach(function (id) { needed.add(id); }); });
    list(route.elevators).forEach(function (elevator) { if (elevator && needed.has(elevator.elevator_id)) times.push(elevator.valid_until); });
    return times.reduce(function (earliest, value) { var time = typeof value === 'string' ? Date.parse(value) : NaN; return Number.isFinite(time) ? Math.min(earliest, time) : 0; }, Infinity);
  }
  function cardHTML(assessment, type) {
    assessment = assessment || {};
    var route = assessment.route || {};
    var verified = type === 'recommended' && assessment.status === 'VERIFIED' && route.mode === 'SUBWAY';
    var rejected = type === 'rejected' || assessment.status === 'REJECTED';
    var secondary = type === 'other';
    var modifier = rejected ? 'rejected' : verified ? 'verified' : 'unconfirmed';
    var title = rejected ? '추천할 수 없는 경로' : secondary ? '보조 교통수단 정보' : verified ? '지하철로 우회하기' : '지하철 우회 후보 · 확인 필요';
    var html = '<article class="accessible-route accessible-route--' + modifier + '"' + (verified ? ' data-valid-until="' + expiresAt(route) + '"' : '') + '><h4>' + title + '</h4>';
    html += '<p class="accessible-route-state">' + (rejected ? '조건 불충족 · 이용 경로로 안내하지 않아요.' : verified ? '엘리베이터 접근성: 검증 완료' : '엘리베이터 접근성: 확인 필요 · 이용 가능 여부가 확인되지 않았어요.') + '</p>';
    if (route.source === 'DEMO' || route.source === 'MOCK') html += '<p class="accessible-route-note">시연 데이터 · 실제 이용 경로가 아니에요.</p>';
    if (secondary) {
      html += '<p>' + (route.mode === 'WALK' ? '도보' : route.mode === 'BUS' ? '버스' : '교통수단 확인 필요') + ' · 접근성은 별도로 확인해야 해요.</p>';
    } else if (verified) html += itineraryHTML(route);
    else if (!rejected && list(route.nodes).length) {
      html += '<p class="accessible-route-note">제안된 역 · 연결과 이동 방향 확인 필요</p><ul class="accessible-route-proposed">' + list(route.nodes).map(function (node) { return '<li>' + text(node && node.station_name) + '</li>'; }).join('') + '</ul>';
    }
    if (!rejected) html += metricsHTML(assessment);
    if (list(assessment.reasons).length) html += '<ul class="accessible-route-reasons">' + assessment.reasons.map(function (reason) { return '<li>' + text(reason) + '</li>'; }).join('') + '</ul>';
    return html + checksHTML(assessment, false) + '</article>';
  }
  function render(payload, context) {
    var policy = root.AccessibleRoutes;
    var result;
    try { result = policy && typeof policy.evaluateRoutes === 'function' ? policy.evaluateRoutes(payload, context) : null; }
    catch (error) { result = null; }
    result = result || {};
    var recommended = list(result.recommended).filter(function (item) { return item && item.status === 'VERIFIED' && item.route && item.route.mode === 'SUBWAY'; });
    var candidates = list(result.candidates);
    var others = list(result.otherRoutes);
    var rejected = list(result.rejected);
    var html = '<section class="accessible-routes" aria-label="접근성 우회 경로">';
    if (recommended.length) html += '<h3 class="accessible-routes-heading">추천 대체 경로</h3>' + recommended.map(function (item) { return cardHTML(item, 'recommended'); }).join('');
    else html += '<article class="accessible-route accessible-route--missing"><h3>접근성 경로 확인 필요</h3><p>검증된 지하철 우회 경로 정보가 없어요. 역별 엘리베이터 상태만으로는 이용 가능한 전체 경로를 확인할 수 없어요.</p>' + checksHTML(null, !candidates.length) + '</article>';
    html += candidates.map(function (item) { return cardHTML(item, 'candidate'); }).join('');
    html += others.map(function (item) { return cardHTML(item, 'other'); }).join('');
    html += rejected.map(function (item) { return cardHTML(item, 'rejected'); }).join('');
    return html + '</section>';
  }
  root.AccessibleRouteView = { render: render };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.AccessibleRouteView;
})(typeof window !== 'undefined' ? window : globalThis);
