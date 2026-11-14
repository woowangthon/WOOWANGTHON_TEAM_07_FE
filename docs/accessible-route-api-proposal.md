# 지하철 우회 경로 접근성 API 필드 제안 (#63)

**FE에서 준비한 계약 초안이다. 실제 제공·합의·연동된 API가 아니다.** 백엔드 저장소/Issue/PR은 변경하지 않았다. 담당자에게 이 FE 문서를 전달해 협의해야 한다.

## 현재 동작과 범위

현재 Prototype-v2의 ElevatorService는 역별 데모 설비 상태와 정적 노선 연결만 보유한다. 경로 증거 어댑터 `getAccessibleRouteSnapshot(context)`는 `null`을 반환한다. 실제 URL·요청·ID 매핑을 임의로 만들지 않았다. 따라서 제품 기본 데이터에는 검증된 우회 추천이 **없으며 확인 필요**가 표시된다. 검증 경로 예시는 `tests/`에만 있다.

정상 역을 찾는 BFS는 방향별 운행, 반대 승강장 이동, 환승통로, 접근 가능한 출구를 증명하지 못한다. 기존 위상 후보 함수는 호환 목적으로 남았지만 `UNCONFIRMED/DEMO`, 빈 안내·시간 null을 반환하고 화면/챗봇에서는 추천에 사용하지 않는다. 정적 `alternativeTips`도 소비하지 않는다.

## 백엔드에서 확인해 응답할 내용

| 조건 | 필요한 실제 근거 | FE 검사 |
|---|---|---|
| 해당 방향 열차 | 방향별 운행/시간표·탑승 가능한 승강장 | 노선·방향, 검증 근거·유효기간 존재 |
| 반대 방향 복귀 | 회차/반대 열차 이용 가능 여부 | return_direction 근거 (불필요하면 이유 명시) |
| 승강장 무계단 이동 | 승강장·층·접근성 연결 그래프 | 명시적 근거와 노드/구간 연결 |
| 환승 엘리베이터 | 환승 위치/구간별 설비 ID | 환승역 동일성·필요 설비 목록·근거 |
| 설비 운행 | 필요한 개별 설비 상태·출처·조회 시각/유효기간 | 모든 필요한 ID의 신선한 API AVAILABLE |
| 목적지 접근 | 도착 승강장부터 출구·최종 목적지 동선 | 목적지/출구 ID 일치·설명·근거 |
| 전체 연결 | 출발→우회→복귀/환승→목적지 연결 | 순서·참조·끝점·중복·요청 역 일치 |

공급자는 한두 정거장과 3정거장 이상의 복귀, 다른 노선 환승, 같은 역의 다른 승강장/출구를 탐색해야 한다. FE는 정거장 상한을 두지 않는다. 실제 탐색·현장 접근성·시간 계산은 아직 제공되지 않았다. `platform_id`는 표시용 선택 필드이며, ID가 없더라도 공급자가 검증한 승강장 동선 근거는 필수다. 증거 문구의 실제 진실성·공급자 인증을 FE가 독립적으로 증명하지는 못한다.

## 판정과 표시

일곱 항목 모두 VERIFIED+비어 있지 않은 근거+신선한 시각이어야 한다. 환승/복귀가 불필요해도 근거에서 이유를 명시해야 하며 NOT_APPLICABLE 자동 통과는 없다. 알려진 실패/고장/대상 불일치/끊긴 연결은 제외하고, 누락·만료·데모는 확인 필요로 처리한다. 역별 AVAILABLE이나 단일 verified 플래그는 근거로 쓰지 않는다.

VERIFIED 지하철끼리 제공된 전체 소요시간→환승 횟수→추가 거리로 정렬하고 미상 값은 뒤에 둔다. 추가 정거장 수는 제외 조건이 아니다. 시간/거리/정거장 수가 없으면 확인 필요이며 임의 곱셈으로 채우지 않는다. 도보/버스는 확정 추천하지 않는다. 화면에 표시된 근거가 만료되면 해당 추천과 이동 지시를 회수하며, 백그라운드 복귀 시에도 재확인한다. 재추천하려면 새 스냅샷으로 평가해야 한다.

## 정확한 입력·출력 계약

# FE accessible route interface (Issue #63, proposed; not an existing BE API)
Global `window.AccessibleRoutes` (also CommonJS export for node tests) exposes CHECKS and evaluateRoutes(payload, context). CHECKS array of {key,label}. Global `window.AccessibleRouteView.render(payload, context)` evaluates every call and returns escaped HTML; no DOM mutation/network. 역 상세·출발 계산·챗봇에서 같은 렌더러를 사용한다. All files standalone IIFE, ES2019 browser compatible.
Context: {originStationId?, destinationStationId?, affectedStationId?, stationName?, now?} now defaults Date.now() and may be numeric milliseconds. IDs must retain types (no guessed slug/integer conversion). Context matching required when provided.
Payload: {schema_version:1, routes:[route]}. Absent/invalid payload => no recommended, missingData true.
Route fields:
- route_id nonempty string; mode SUBWAY/WALK/BUS; source API/DEMO/MOCK. Only API source can verify (provenance is upstream obligation, not cryptographic proof).
- origin_station_id, destination_station_id, affected_station_id; verified_at, valid_until offset-bearing ISO timestamps.
- nodes ordered array {node_id,station_id,station_name,platform_id?,exit_id?,is_additional?}; IDs unique; explicit first/last endpoint matching.
- steps ordered array {from_node_id,to_node_id,kind:RIDE/TRANSFER/REVERSE/ACCESS,line_id?,line_name?,direction?,elevator_ids:[]}. RIDE/REVERSE need nonempty line_id and direction. Each step must exactly join adjacent nodes and full chain connect origin to destination. All node station names needed for usable display. TRANSFER and ACCESS require the same known station context through their endpoint nodes. No stop-count maximum.
- elevators array {elevator_id,status:AVAILABLE/UNAVAILABLE/UNKNOWN,source:API/DEMO/MOCK,fetched_at,valid_until,location?}. Every ID required by any step must exist exactly once, have API source, current AVAILABLE status and current times. Duplicates/unknown IDs cannot verify. No inference from station aggregate status.
- checks object contains exactly these seven keys (extras ignored): train_direction (해당 방향 열차 운행), return_direction (반대 방향 열차 이용), platform_step_free (승강장 간 계단 없는 이동), transfer_step_free (환승 구간 엘리베이터), elevators_operating (필요 엘리베이터 운행), destination_access (목적지 출구·동선), path_connected (전체 경로 연결). Each value {status:VERIFIED/UNKNOWN/FAILED,evidence:string,verified_at,valid_until}. Every VERIFIED requires nonempty evidence and fresh times. No NOT_APPLICABLE automatic bypass; provider attests why no return/transfer/elevator is needed in evidence. FAILED makes route REJECTED. Missing/malformed/stale/future/evidence absent => UNCONFIRMED. API times cannot be in future; valid_until > now; verified/fetched time <= now and <= expiry. No arbitrary TTL added by frontend.
- destination_exit {exit_id,description}; must match last node exit_id and have nonempty description for verified.
- duration_minutes, additional_minutes, additional_stops, transfer_count, additional_distance_m: optional nonnegative finite numbers; counts integers. Missing/invalid becomes null, never inferred by multiplying stop count. timing_estimated optional boolean. Sort verified subway by durationMinutes, transferCount, additionalDistanceM, unknown last, stable input order; never exclude for additional stop count.
Output: {recommended:assessment[], candidates:assessment[], otherRoutes:assessment[], rejected:assessment[], hasVerifiedSubway:boolean, missingData:boolean}. recommended only VERIFIED SUBWAY. candidates UNCONFIRMED SUBWAY. otherRoutes WALK/BUS (never primary recommendation); rejected known FAILED/broken. assessment {route,status:VERIFIED/UNCONFIRMED/REJECTED,reasons:string[],checks:[{key,label,status:VERIFIED/UNKNOWN/FAILED}],metrics:{durationMinutes,additionalMinutes,additionalStops,transferCount,additionalDistanceM}}. CHECKS have keys/labels matching above. Deduplicate route IDs fail closed.
View: verified heading 추천 대체 경로 / 지하철로 우회하기, pending 지하철 우회 후보 · 확인 필요. No payload: seven conditions with 확인 필요, missing data message, no synthetic path or walking/bus recommendations. All user text escaped, status modifier allowlisted. Show route nodes/lines, extra stations (nodes), reverse direction (REVERSE), transfers (TRANSFER node station), needed elevators+location, additionalStops/time/other metrics, destination exit, verification checks. Missing fields explicitly 확인 필요. Known disconnected/malformed route not drawn as connected itinerary; can show candidate info only with confirmation needed. Other modes clearly secondary, not recommendation and no actionable unsafe directions. No unverified map actions.
Tests meaningful built-in node:test; fixtures tests-only; no valid routes in mock-data/product defaults. 실제 화면 연결·데이터 부족 상태는 브라우저 테스트에서 검증한다. Existing scripts in scratch Puppeteer available.

`nodes[].is_additional: true`는 공급자가 원래 경로 대비 추가로 지나는 역임을 확인한 표시다. UI는 이 값이 있는 역만 별도로 표시하며 없으면 확인 필요로 둔다. `steps[].line_name`이 있으면 노선 ID 대신 사용자용 노선 이름을 표시한다. 임의로 추가 역을 계산하지 않는다.
