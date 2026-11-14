const {test} = require('node:test');
const assert = require('node:assert/strict');
const {NOW, past, future, keys, route} = require('./accessible-route-fixtures.cjs');
const {CHECKS, evaluateRoutes} = require('../Prototype-v2/js/accessible-routes.js');
const context = {now: NOW, originStationId: 1, destinationStationId: '2', affectedStationId: 1};
const evaluate = (...routes) => evaluateRoutes({schema_version: 1, routes}, context);
const assessment = r => {const out = evaluate(r); return [...out.recommended, ...out.candidates, ...out.otherRoutes, ...out.rejected][0];};

test('all seven explicit attestations and a connected API chain verify even with three extra stops', () => {
  assert.deepEqual(CHECKS.map(c => c.key), keys);
  const out = evaluate(route());
  assert.equal(out.recommended.length, 1);
  assert.equal(out.hasVerifiedSubway, true);
  assert.equal(out.recommended[0].metrics.additionalStops, 3);
});
for (const key of keys) test(`missing ${key} cannot verify`, () => {
  const r = route(); delete r.checks[key];
  assert.equal(assessment(r).status, 'UNCONFIRMED');
});
test('failed evidence rejects; unknown, empty, stale, future or malformed evidence cannot verify', () => {
  for (const patch of [{status:'UNKNOWN'}, {evidence:''}, {valid_until:past}, {verified_at:future}, {verified_at:'2026-11-15T11:00:00'}, {status:'NOT_APPLICABLE'}]) {
    const r = route(); Object.assign(r.checks.train_direction, patch);
    assert.equal(assessment(r).status, 'UNCONFIRMED');
  }
  const r = route(); r.checks.return_direction.status = 'FAILED';
  assert.equal(assessment(r).status, 'REJECTED');
});
test('route source and route freshness must verify independently of seven checks', () => {
  for (const patch of [{source:'DEMO'}, {source:'MOCK'}, {source:'unknown'}, {valid_until:past}, {verified_at:future}, {verified_at:null}]) {
    assert.equal(assessment(route(patch)).status, 'UNCONFIRMED');
  }
});
test('every needed elevator needs unique current available API evidence', () => {
  for (const patch of [{status:'UNKNOWN'}, {source:'DEMO'}, {fetched_at:future}, {valid_until:past}]) {
    const r = route(); Object.assign(r.elevators[0], patch);
    assert.equal(assessment(r).status, 'UNCONFIRMED');
  }
  for (const elevators of [[], [{...route().elevators[0], elevator_id:1}], [route().elevators[0], route().elevators[0]]]) {
    assert.notEqual(assessment(route({elevators})).status, 'VERIFIED');
  }
  const r = route(); r.elevators[0].status = 'UNAVAILABLE';
  assert.equal(assessment(r).status, 'REJECTED');
  const missing = route({elevators:[], station_status:'AVAILABLE'});
  assert.equal(assessment(missing).status, 'UNCONFIRMED');
});
test('broken chain, wrong target, exit or direction never verify', () => {
  const mutations = [r=>r.steps[0].to_node_id='c', r=>r.nodes[0].station_id='1', r=>r.nodes[2].station_id=2,
    r=>r.destination_exit.exit_id='other', r=>r.nodes[1].node_id='a', r=>r.steps.pop(), r=>r.destination_station_id='wrong'];
  for (const mutate of mutations) {const r=route(); mutate(r); assert.equal(assessment(r).status, 'REJECTED');}
  for (const mutate of [r=>delete r.steps[0].direction, r=>delete r.nodes[1].station_name, r=>delete r.destination_exit]) {
    const r=route(); mutate(r); assert.notEqual(assessment(r).status, 'VERIFIED');
  }
});
test('transfer requires known station context; other valid exits and long detours are allowed', () => {
  const r = route({additional_stops:9});
  r.nodes.splice(2,0,{node_id:'transfer',station_id:3,station_name:'우회',platform_id:'p3'});
  r.steps.splice(1,0,{from_node_id:'b',to_node_id:'transfer',kind:'TRANSFER',elevator_ids:[]});
  r.steps[2].from_node_id='transfer';
  r.nodes[3].exit_id='other-exit'; r.destination_exit.exit_id='other-exit';
  assert.equal(assessment(r).status,'VERIFIED');
  delete r.nodes[2].station_id;
  assert.notEqual(assessment(r).status,'VERIFIED');
});
test('sort verified subway by supplied duration, transfers, distance with unknown last and stable ties', () => {
  const specs = [['unknown',undefined,0,0],['slow',20,0,0],['many-transfers',10,2,0],['far',10,1,100],['near',10,1,10],['tie',10,1,10]];
  const routes = specs.map(([route_id,duration_minutes,transfer_count,additional_distance_m])=>route({route_id,duration_minutes,transfer_count,additional_distance_m}));
  const out=evaluate(route({route_id:'walk',mode:'WALK',duration_minutes:1}),...routes);
  assert.deepEqual(out.recommended.map(a=>a.route.route_id),['near','tie','far','many-transfers','slow','unknown']);
  assert.equal(out.otherRoutes.length,1);
  assert.equal(out.recommended.at(-1).metrics.durationMinutes,null);
});
test('invalid optional metrics stay unknown with no inferred time', () => {
  const a=assessment(route({duration_minutes:-1,additional_minutes:NaN,additional_stops:3.5,transfer_count:Infinity,additional_distance_m:'10'}));
  assert.deepEqual(a.metrics,{durationMinutes:null,additionalMinutes:null,additionalStops:null,transferCount:null,additionalDistanceM:null});
});
test('duplicate route identifiers fail closed',()=>assert.equal(evaluate(route(),route()).recommended.length,0));
test('preserves numeric identifiers and never coerces context, elevator or exit identifiers',()=>{
  const r=route();
  r.nodes[0].node_id=0; r.steps[0].from_node_id=0;
  r.elevators[0].elevator_id=0; r.steps[0].elevator_ids=[0];
  r.destination_exit.exit_id=0; r.nodes[2].exit_id=0;
  assert.equal(assessment(r).status,'VERIFIED');
  const out=evaluateRoutes({schema_version:1,routes:[r]},{...context,destinationStationId:2});
  assert.equal(out.rejected.length,1);
  r.steps[0].elevator_ids=['0'];
  assert.equal(assessment(r).status,'UNCONFIRMED');
});
test('expiry at now, invalid calendar dates and nonnumeric clocks fail closed',()=>{
  for(const patch of [{valid_until:'2026-11-15T12:00:00+09:00'}, {verified_at:'2026-02-30T12:00:00+09:00'}]) {
    assert.equal(assessment(route(patch)).status,'UNCONFIRMED');
  }
  const out=evaluateRoutes({schema_version:1,routes:[route()]},{...context,now:'2026-11-15'});
  assert.equal(out.recommended.length,0);
});
test('exposes browser global and evaluates without mutating provider payload',()=>{
  const fs=require('node:fs'); const vm=require('node:vm');
  const sandbox={window:{}};
  vm.runInNewContext(fs.readFileSync(require.resolve('../Prototype-v2/js/accessible-routes.js'),'utf8'),sandbox);
  assert.equal(typeof sandbox.window.AccessibleRoutes.evaluateRoutes,'function');
  const payload={schema_version:1,routes:[route()]};
  const before=JSON.stringify(payload);
  sandbox.window.AccessibleRoutes.evaluateRoutes(payload,context);
  assert.equal(JSON.stringify(payload),before);
});
test('malformed payloads and entries never throw or recommend',()=>{
  for(const payload of [null,undefined,[],{}, {schema_version:2,routes:[route()]}, {schema_version:1,routes:null}, {schema_version:1,routes:[null,1,{},[]]}]) {
    const out=evaluateRoutes(payload,context); assert.equal(out.recommended.length,0); assert.equal(out.missingData,true);
  }
});

test('station access and transfer cannot connect different stations by attestation alone',()=>{
 for (const kind of ['ACCESS','TRANSFER']) {
   const r=route(); r.steps[0].kind=kind;
   assert.equal(assessment(r).status,'UNCONFIRMED');
 }
 const r=route();r.nodes[1].station_id=r.nodes[0].station_id;r.steps[0].kind='ACCESS';
 assert.equal(assessment(r).status,'VERIFIED');
});
