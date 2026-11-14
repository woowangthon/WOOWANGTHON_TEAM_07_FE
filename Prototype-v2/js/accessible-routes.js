(function (root) {
  'use strict';

  // VERIFIED means the supplied API evidence satisfies this contract. It is not
  // an independent guarantee of physical accessibility or provider authenticity.
  var CHECKS = Object.freeze([
    {key: 'train_direction', label: '해당 방향 열차 운행'},
    {key: 'return_direction', label: '반대 방향 열차 이용'},
    {key: 'platform_step_free', label: '승강장 간 계단 없는 이동'},
    {key: 'transfer_step_free', label: '환승 구간 엘리베이터'},
    {key: 'elevators_operating', label: '필요 엘리베이터 운행'},
    {key: 'destination_access', label: '목적지 출구·동선'},
    {key: 'path_connected', label: '전체 경로 연결'}
  ].map(function (check) { return Object.freeze(check); }));
  function object(value) { return value !== null && typeof value === 'object' && !Array.isArray(value); }
  function text(value) { return typeof value === 'string' && value.trim().length > 0; }
  function id(value) { return text(value) || (typeof value === 'number' && Number.isFinite(value)); }
  function timestamp(value) {
    if (typeof value !== 'string') return NaN;
    var parts = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(Z|[+-]\d{2}:\d{2})$/.exec(value);
    if (!parts) return NaN;
    var year = +parts[1], month = +parts[2], day = +parts[3];
    var leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
    var days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    if (month < 1 || month > 12 || day < 1 || day > days[month - 1] || +parts[4] > 23 || +parts[5] > 59 || +parts[6] > 59) return NaN;
    if (parts[7] !== 'Z' && (+parts[7].slice(1, 3) > 23 || +parts[7].slice(4) > 59)) return NaN;
    return Date.parse(value);
  }
  function current(start, end, now) {
    var first = timestamp(start), last = timestamp(end);
    return Number.isFinite(now) && Number.isFinite(first) && Number.isFinite(last) && first <= now && first <= last && last > now;
  }
  function metric(value, integer) {
    return typeof value === 'number' && Number.isFinite(value) && value >= 0 && (!integer || Number.isInteger(value)) ? value : null;
  }
  function assess(input, context, now, duplicate) {
    var route = object(input) ? input : {};
    var reasons = [], rejected = false;
    function unknown(reason) { reasons.push(reason); }
    function reject(reason) { rejected = true; reasons.push(reason); }
    if (!object(input)) unknown('경로 데이터 확인 필요');
    if (!text(route.route_id)) unknown('경로 식별자 확인 필요');
    if (duplicate) reject('중복 경로 식별자');
    if (['SUBWAY', 'WALK', 'BUS'].indexOf(route.mode) === -1) unknown('이동 수단 확인 필요');
    if (route.source !== 'API') unknown('API 출처 확인 필요');
    if (!current(route.verified_at, route.valid_until, now)) unknown('경로 증거 유효 시간 확인 필요');
    [['origin_station_id', 'originStationId'], ['destination_station_id', 'destinationStationId'], ['affected_station_id', 'affectedStationId']].forEach(function (pair) {
      if (!id(route[pair[0]])) unknown('역 식별자 확인 필요: ' + pair[0]);
      if (context[pair[1]] !== undefined && route[pair[0]] !== context[pair[1]]) reject('요청 역과 경로 불일치: ' + pair[0]);
    });
    var checks = CHECKS.map(function (definition) {
      var value = object(route.checks) && object(route.checks[definition.key]) ? route.checks[definition.key] : {};
      var status = 'UNKNOWN';
      if (value.status === 'FAILED') { status = 'FAILED'; reject(definition.label + ' 검증 실패'); }
      else if (value.status === 'VERIFIED' && text(value.evidence) && current(value.verified_at, value.valid_until, now)) status = 'VERIFIED';
      else unknown(definition.label + ' 확인 필요');
      return {key: definition.key, label: definition.label, status: status};
    });
    var nodes = Array.isArray(route.nodes) ? route.nodes : [];
    var steps = Array.isArray(route.steps) ? route.steps : [];
    var nodeIds = new Set();
    if (nodes.length < 2) unknown('출발부터 목적지까지의 경로 노드 확인 필요');
    nodes.forEach(function (node) {
      if (!object(node)) { unknown('경로 노드 확인 필요'); return; }
      if (!id(node.node_id) || !id(node.station_id) || !text(node.station_name)) unknown('노드 및 역 정보 확인 필요');
      if (id(node.node_id) && nodeIds.has(node.node_id)) reject('중복 경로 노드');
      nodeIds.add(node.node_id);
    });
    if (nodes.length >= 2) {
      if (object(nodes[0]) && id(nodes[0].station_id) && id(route.origin_station_id) && nodes[0].station_id !== route.origin_station_id) reject('출발 노드 불일치');
      if (object(nodes[nodes.length - 1]) && id(nodes[nodes.length - 1].station_id) && id(route.destination_station_id) && nodes[nodes.length - 1].station_id !== route.destination_station_id) reject('목적지 노드 불일치');
      if (steps.length !== nodes.length - 1) reject('전체 경로 연결 불일치');
    }
    var needed = new Set();
    steps.forEach(function (step, index) {
      if (!object(step)) { unknown('이동 구간 확인 필요'); return; }
      var from = nodes[index], to = nodes[index + 1];
      if (!id(step.from_node_id) || !id(step.to_node_id)) unknown('구간 노드 식별자 확인 필요');
      else if (!object(from) || !object(to) || step.from_node_id !== from.node_id || step.to_node_id !== to.node_id) reject('이동 구간 연결 불일치');
      if (['RIDE', 'TRANSFER', 'REVERSE', 'ACCESS'].indexOf(step.kind) === -1) unknown('이동 구간 종류 확인 필요');
      if ((step.kind === 'RIDE' || step.kind === 'REVERSE') && (!id(step.line_id) || !text(step.direction))) unknown('노선 및 열차 방향 확인 필요');
      if ((step.kind === 'TRANSFER' || step.kind === 'ACCESS') && (!object(from) || !object(to) || !id(from.station_id) || !id(to.station_id) || from.station_id !== to.station_id)) unknown('역내 이동 동선 확인 필요');
      if (!Array.isArray(step.elevator_ids)) unknown('구간별 필요 엘리베이터 확인 필요');
      else step.elevator_ids.forEach(function (elevatorId) { if (!id(elevatorId)) unknown('필요 엘리베이터 식별자 확인 필요'); else needed.add(elevatorId); });
    });
    var elevators = Array.isArray(route.elevators) ? route.elevators : [];
    if (!Array.isArray(route.elevators)) unknown('엘리베이터 증거 목록 확인 필요');
    var elevatorMap = new Map();
    elevators.forEach(function (elevator) {
      if (!object(elevator) || !id(elevator.elevator_id)) { unknown('엘리베이터 정보 확인 필요'); return; }
      if (elevatorMap.has(elevator.elevator_id)) unknown('중복 엘리베이터 식별자');
      var matches = elevatorMap.get(elevator.elevator_id) || [];
      matches.push(elevator); elevatorMap.set(elevator.elevator_id, matches);
      if (elevator.status === 'UNAVAILABLE' && needed.has(elevator.elevator_id)) reject('필요 엘리베이터 이용 불가');
    });
    needed.forEach(function (elevatorId) {
      var matches = elevatorMap.get(elevatorId) || [];
      if (matches.length !== 1) { unknown('필요 엘리베이터별 증거 확인 필요'); return; }
      var elevator = matches[0];
      if (elevator.status !== 'AVAILABLE' || elevator.source !== 'API' || !current(elevator.fetched_at, elevator.valid_until, now)) unknown('필요 엘리베이터 운행 증거 확인 필요');
    });
    var exit = object(route.destination_exit) ? route.destination_exit : {};
    var last = nodes[nodes.length - 1];
    if (!id(exit.exit_id) || !text(exit.description) || !object(last) || !id(last.exit_id)) unknown('목적지 출구·동선 확인 필요');
    else if (exit.exit_id !== last.exit_id) reject('목적지 출구 불일치');
    return {
      route: route, status: rejected ? 'REJECTED' : (reasons.length ? 'UNCONFIRMED' : 'VERIFIED'),
      reasons: reasons, checks: checks,
      metrics: {durationMinutes: metric(route.duration_minutes), additionalMinutes: metric(route.additional_minutes), additionalStops: metric(route.additional_stops, true), transferCount: metric(route.transfer_count, true), additionalDistanceM: metric(route.additional_distance_m)}
    };
  }
  function evaluateRoutes(payload, context) {
    context = object(context) ? context : {};
    var now = context.now === undefined ? Date.now() : context.now;
    var result = {recommended: [], candidates: [], otherRoutes: [], rejected: [], hasVerifiedSubway: false, missingData: false};
    if (!object(payload) || payload.schema_version !== 1 || !Array.isArray(payload.routes) || !payload.routes.length) { result.missingData = true; return result; }
    var counts = new Map();
    payload.routes.forEach(function (route) { if (object(route) && text(route.route_id)) counts.set(route.route_id, (counts.get(route.route_id) || 0) + 1); });
    payload.routes.forEach(function (route) {
      if (!object(route) || !text(route.route_id) || ['SUBWAY', 'WALK', 'BUS'].indexOf(route.mode) === -1) result.missingData = true;
      var assessment = assess(route, context, now, object(route) && counts.get(route.route_id) > 1);
      if (assessment.status === 'UNCONFIRMED') result.missingData = true;
      if (assessment.status === 'REJECTED') result.rejected.push(assessment);
      else if (assessment.route.mode === 'SUBWAY') result[assessment.status === 'VERIFIED' ? 'recommended' : 'candidates'].push(assessment);
      else if (assessment.route.mode === 'WALK' || assessment.route.mode === 'BUS') result.otherRoutes.push(assessment);
      else { result.rejected.push(assessment); result.missingData = true; }
    });
    result.recommended.sort(function (a, b) {
      var fields = ['durationMinutes', 'transferCount', 'additionalDistanceM'];
      for (var index = 0; index < fields.length; index++) {
        var first = a.metrics[fields[index]], second = b.metrics[fields[index]];
        if (first === second) continue;
        if (first === null) return 1;
        if (second === null) return -1;
        return first - second;
      }
      return 0;
    });
    result.hasVerifiedSubway = result.recommended.length > 0;
    return result;
  }
  var api = Object.freeze({CHECKS: CHECKS, evaluateRoutes: evaluateRoutes});
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.AccessibleRoutes = api;
}(typeof window !== 'undefined' ? window : null));
