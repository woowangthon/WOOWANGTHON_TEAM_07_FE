const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const checks = [
 ['train_direction','해당 방향 열차 운행'], ['return_direction','반대 방향 열차 이용'],
 ['platform_step_free','승강장 간 계단 없는 이동'], ['transfer_step_free','환승 구간 엘리베이터'],
 ['elevators_operating','필요 엘리베이터 운행'], ['destination_access','목적지 출구·동선'], ['path_connected','전체 경로 연결']
].map(([key,label]) => ({key,label}));
function setup(evaluateRoutes) {
 const window = {AccessibleRoutes: {CHECKS:checks,evaluateRoutes}};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../Prototype-v2/js/accessible-route-view.js'),'utf8'), {window});
 return window.AccessibleRouteView;
}
const empty = () => ({recommended:[], candidates:[], otherRoutes:[], rejected:[], hasVerifiedSubway:false, missingData:true});
function assessment(status='VERIFIED',mode='SUBWAY') {
 return {status,reasons:[],route:{route_id:'one',mode,source:'API',nodes:[
 {node_id:'a',station_id:1,station_name:'출발'}, {node_id:'b',station_id:2,station_name:'환승역'}, {node_id:'c',station_id:3,station_name:'도착',exit_id:'E2'}],steps:[
 {from_node_id:'a',to_node_id:'b',kind:'REVERSE',line_id:'2호선',direction:'반대 방면',elevator_ids:['EV-1']},
 {from_node_id:'b',to_node_id:'c',kind:'TRANSFER',elevator_ids:[]}],elevators:[{elevator_id:'EV-1',location:'B2 승강장',status:'AVAILABLE'}],destination_exit:{exit_id:'E2',description:'2번 출구'}},
 checks:checks.map(c=>({...c,status:'VERIFIED'})),metrics:{durationMinutes:31,additionalMinutes:12,additionalStops:5,transferCount:1,additionalDistanceM:240}};
}
test('missing data shows seven unknown checks without a fabricated itinerary or actions',()=>{
 const html=setup(empty).render(null,{stationName:'서울'});
 assert.equal((html.match(/accessible-route-check--unknown/g)||[]).length,7);
 assert.match(html,/확인 필요/); assert.match(html,/경로 정보/);
 assert.doesNotMatch(html,/<ol|<button|<a |도보|버스로|→/);
});
test('each render reevaluates current data and context instead of keeping an expired recommendation',()=>{
 const payload={}, context={now:123}; let calls=0;
 const view=setup((p,c)=>{assert.equal(p,payload);assert.equal(c,context);return calls++ ? empty() : {...empty(),recommended:[assessment()],missingData:false};});
 assert.match(view.render(payload,context),/추천 대체 경로/);
 assert.doesNotMatch(view.render(payload,context),/추천 대체 경로/);
});
test('verified subway shows actual supplied stations, direction, transfers, elevator, exit and metrics',()=>{
 const html=setup(()=>({...empty(),recommended:[assessment()],missingData:false})).render({});
 for(const text of ['추천 대체 경로','지하철로 우회하기','출발','환승역','도착','2호선','반대 방면','반대 방향','환승','EV-1','B2 승강장','E2','2번 출구','31분','12분','5개 역','240m']) assert.ok(html.includes(text),text);
 assert.match(html,/<details/); assert.match(html,/<ol/);
});
test('unconfirmed malformed candidate has a proposed station list but no actionable connected itinerary',()=>{
 const a=assessment('UNCONFIRMED'); a.route.steps[0].to_node_id='missing'; a.metrics.additionalMinutes=null;
 const html=setup(()=>({...empty(),candidates:[a],missingData:false})).render({});
 assert.match(html,/지하철 우회 후보 · 확인 필요/); assert.match(html,/제안된 역/); assert.match(html,/accessible-route--unconfirmed/);
 assert.doesNotMatch(html,/<ol|반대 방향 이동|→|추천 대체 경로/); assert.match(html,/추가 시간<\/dt><dd>확인 필요/);
});
test('rejected and other modes cannot acquire recommendation headings or travel instructions',()=>{
 const rejected=assessment('REJECTED'); rejected.checks[0].status='FAILED';
 const html=setup(()=>({...empty(),rejected:[rejected],otherRoutes:[assessment('VERIFIED','WALK'),assessment('UNCONFIRMED','BUS')],missingData:false})).render({});
 assert.match(html,/추천할 수 없는 경로/); assert.match(html,/조건 불충족/);assert.match(html,/보조 교통수단 정보/);
 assert.doesNotMatch(html,/추천 대체 경로|<ol|반대 방면|B2 승강장/);
});
test('all supplied text is escaped and untrusted status and mode cannot become CSS classes',()=>{
 const a=assessment(); const attack='<img src=x onerror="alert(1)">';
 a.route.nodes[0].station_name=attack;a.route.steps[0].direction=attack;a.route.steps[0].line_id=attack;
 a.route.elevators[0].location=attack;a.route.destination_exit.description=attack;a.checks[0].label=attack;
 const bad=assessment('x" onclick="evil()','x" onclick="evil()');bad.reasons=[attack];
 const html=setup(()=>({...empty(),recommended:[a],candidates:[bad],missingData:false})).render({});
 assert.doesNotMatch(html,/<img|onclick=|class="[^"]*evil/); assert.match(html,/&lt;img/); assert.match(html,/&quot;alert\(1\)&quot;/);
});
test('malformed JSON display fields remain unknown without invoking object coercion',()=>{
 const malformed={toString:1};
 const a=assessment('UNCONFIRMED');a.route.nodes[0].station_name=malformed;
 a.reasons=[malformed];
 const v=assessment();v.route.nodes[0].station_name=malformed;v.route.steps[0].direction=malformed;
 v.route.elevators[0].location=malformed;v.route.destination_exit.description=malformed;
 const html=setup(()=>({...empty(),candidates:[a],recommended:[v],missingData:false})).render({});
 assert.match(html,/확인 필요/);assert.doesNotMatch(html,/\[object Object\]/);
});
test('route accessibility status is explicit for verified and pending cards',()=>{
 const html=setup(()=>({...empty(),recommended:[assessment()],candidates:[assessment('UNCONFIRMED')],missingData:false})).render({});
 assert.match(html,/엘리베이터 접근성: 검증 완료/);assert.match(html,/엘리베이터 접근성: 확인 필요/);
});

test('expiry includes only policy-required evidence and referenced elevators',()=>{
 const policy=require('../Prototype-v2/js/accessible-routes.js');
 const {route,NOW,future}=require('./accessible-route-fixtures.cjs');
 const r=route();
 r.checks.provider_metadata={note:'extra ignored by policy'};
 r.elevators.push({elevator_id:'unused',status:'UNKNOWN'});
 assert.equal(policy.evaluateRoutes({schema_version:1,routes:[r]},{now:NOW}).recommended.length,1);
 const html=setup(policy.evaluateRoutes).render({schema_version:1,routes:[r]},{now:NOW});
 assert.match(html,new RegExp('data-valid-until="'+Date.parse(future)+'"'));
 r.checks.return_direction.valid_until=new Date(NOW+1000).toISOString();
 const short=setup(policy.evaluateRoutes).render({schema_version:1,routes:[r]},{now:NOW});
 assert.match(short,new RegExp('data-valid-until="'+(NOW+1000)+'"'));
});
