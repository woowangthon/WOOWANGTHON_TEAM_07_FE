const NOW = Date.parse('2026-11-15T12:00:00+09:00');
const past = '2026-11-15T11:00:00+09:00';
const future = '2026-11-15T13:00:00+09:00';
const keys = ['train_direction', 'return_direction', 'platform_step_free', 'transfer_step_free', 'elevators_operating', 'destination_access', 'path_connected'];
function route(overrides = {}) {
  return {
    route_id: 'route-1', mode: 'SUBWAY', source: 'API',
    origin_station_id: 1, destination_station_id: '2', affected_station_id: 1,
    verified_at: past, valid_until: future,
    nodes: [
      {node_id: 'a', station_id: 1, station_name: '출발', platform_id: 'p1'},
      {node_id: 'b', station_id: 3, station_name: '우회', is_additional: true, platform_id: 'p2'},
      {node_id: 'c', station_id: '2', station_name: '목적', exit_id: 'exit-2'}
    ],
    steps: [
      {from_node_id: 'a', to_node_id: 'b', kind: 'RIDE', line_id: '1', direction: '북행', elevator_ids: ['el-1']},
      {from_node_id: 'b', to_node_id: 'c', kind: 'REVERSE', line_id: '1', direction: '남행', elevator_ids: []}
    ],
    elevators: [{elevator_id: 'el-1', status: 'AVAILABLE', source: 'API', fetched_at: past, valid_until: future, location: '승강장'}],
    checks: Object.fromEntries(keys.map(key => [key, {status: 'VERIFIED', evidence: '공급자가 해당 동선 및 필요 여부를 확인함', verified_at: past, valid_until: future}])),
    destination_exit: {exit_id: 'exit-2', description: '2번 출구 엘리베이터'},
    duration_minutes: 12, additional_minutes: 4, additional_stops: 3, transfer_count: 0, additional_distance_m: 100,
    ...overrides
  };
}
module.exports = {NOW, past, future, keys, route};
