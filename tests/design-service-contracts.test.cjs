const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
function modules(){const window={};const context={window,console,setTimeout:fn=>{fn();return 1;}};for(const name of ['mock-data','elevator-service','time-calculator','departure-graphic','accessible-routes','accessible-route-view','ai-agent'])vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../Prototype-v2/js/'+name+'.js'),'utf8'),context);return window;}
test('empty known outage list does not certify unknown stations',async()=>{
 const w=modules(),es=w.ElevatorService;
 es.getAllStations().forEach(s=>es.getElevators(s.id).forEach(e=>{if(e.status!=='AVAILABLE')es.toggleElevator(s.id,e.id);}));
 assert.equal(es.getOutages().length,0);assert(es.getAllStations().some(s=>es.getStationStatus(s.id)==='UNKNOWN'));
 const r=await w.AIAgent.processMessage('지금 고장난 역 알려줘');
 assert.match(r.text,/확인된/);assert.match(r.text,/정보가 없는 역/);assert.doesNotMatch(r.text,/모든 역이 정상/);
});
test('design service keeps status icons, stable broken-first order and AMPM display',()=>{
 const w=modules(),es=w.ElevatorService,tc=w.TimeCalculator;
 assert.equal(es.getStatusLabel('PARTIAL'),'일부 운행');assert.equal(es.getStatusIcon('PARTIAL'),'error');
 const a={id:'a',status:'AVAILABLE'},b={id:'b',status:'UNAVAILABLE'},c={id:'c',status:'MAINTENANCE'};
 assert.deepEqual(Array.from(es.sortForDisplay([a,b,c]),x=>x.id),['b','c','a']);
 assert.equal(tc.displayTime('15:07'),'오후 3:07');assert.equal(tc.displayTime('00:00'),'오전 12:00');
});
