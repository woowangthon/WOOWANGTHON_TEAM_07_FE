const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const fx=n=>JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures',n),'utf8'));
const F={
 stations:fx('be-stations.json'),
 r32:fx('be-route-gangnam-gyodae.json'),r207:fx('be-route-gangnam-gangnamgu.json'),
 r404:fx('be-route-404.json'),r422:fx('be-route-same-422.json'),
 d32:fx('be-departure-gangnam-gyodae.json'),d207:fx('be-departure-gangnam-gangnamgu.json')
};
function load(){
 const window={APP_CONFIG:{dataSource:'api',beBase:'http://be.test'}};
 const context={window,console,AbortController,setTimeout,clearTimeout};
 for(const n of ['mock-data','api-client','station-id-map','time-calculator'])vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../Prototype-v2/js/'+n+'.js'),'utf8'),context);
 return window;
}
const resp=(status,body)=>({ok:status>=200&&status<300,status,text:async()=>JSON.stringify(body)});
// recordings: key = "METHOD path" (POST bodies are compared separately). overrides: key -> {status,body} or Error
function fakeFetch(over){
 const calls=[];
 const table={
  'GET /api/stations':[200,F.stations],
  ['GET '+F.r32.request.path]:[200,F.r32.response],
  ['GET '+F.r207.request.path]:[200,F.r207.response],
  ['GET '+F.r404.request.path]:[F.r404.status,F.r404.response],
  ['GET '+F.r422.request.path]:[F.r422.status,F.r422.response]
 };
 const f=async(url,init)=>{
  const u=url.replace('http://be.test','');
  const key=init.method+' '+u;calls.push({key,body:init.body?JSON.parse(init.body):undefined});
  if(over&&over[key]instanceof Error)throw over[key];
  if(over&&over[key])return resp(over[key][0],over[key][1]);
  if(init.method==='POST'){
   const b=JSON.parse(init.body);
   const d=b.to_station_id===32?F.d32:b.to_station_id===207?F.d207:null;
   return d?resp(d.status,d.response):resp(404,{error:{code:'NOT_FOUND',message:'x'}});
  }
  const t=table[key];return t?resp(t[0],t[1]):resp(404,{error:{code:'NOT_FOUND',message:'x'}});
 };
 f.calls=calls;return f;
}
const NOW=new Date('2026-12-01T00:30:00+09:00'); // arrival 09:00 -> 2026-12-01T09:00:00+09:00 (same as the recordings)
async function setup(over){
 const w=load(),f=fakeFetch(over);await w.StationIdMap.load({fetch:f});
 f.calls.length=0;return{w,f,tc:w.TimeCalculator,slug:id=>w.StationIdMap.toSlug(id)};
}

test('request bodies and paths match the recordings (31->32 and 31->207)',async()=>{
 const{f,tc,slug}=await setup();
 await tc.calculateDepartureLive({originId:slug(31),destId:slug(32),arriveBy:'09:00',now:NOW,fetch:f});
 assert.deepEqual(f.calls.map(c=>c.key),['GET '+F.r32.request.path,'POST /api/departure-time']);
 assert.deepEqual(f.calls[1].body,F.d32.request.body);
 f.calls.length=0;
 await tc.calculateDepartureLive({originId:slug(31),destId:slug(207),arriveBy:'09:00',now:NOW,fetch:f});
 assert.equal(f.calls[0].key,'GET '+F.r207.request.path);
 assert.deepEqual(f.calls[1].body,F.d207.request.body);
});

test('timetable result: shape adapted, selected train and warning fields kept',async()=>{
 const{f,tc,slug}=await setup();
 const r=await tc.calculateDepartureLive({originId:slug(31),destId:slug(32),arriveBy:'09:00',now:NOW,fetch:f});
 const d=F.d32.response;
 assert.equal(r.leaveAt,d.recommended_departure_at.slice(11,16));
 assert.equal(r.boardAt,d.estimated_boarding_at.slice(11,16));
 assert.equal(r.arriveAt,d.timeline[d.timeline.length-1].end_at.slice(11,16));
 assert.equal(r.arriveBy,'09:00');
 assert.equal(r.timetableUsed,true);assert.equal(r.estimated,true);assert.equal(r.alreadyPast,false);
 assert.equal(r.selectedTrain.trainNo,d.selected_train.train_no);
 assert.equal(r.selectedTrain.boardingAt,d.selected_train.boarding_at.slice(11,16));
 assert.equal(r.boardAt,r.selectedTrain.boardingAt);
 assert.deepEqual(Array.from(r.limitations),d.limitations);
 assert.equal(r.warningStatus,d.elevator_warning.status);assert.equal(r.warningMessage,d.elevator_warning.message);
 assert.equal(r.route.transfers,0);assert.deepEqual(Array.from(r.route.path),[slug(31),slug(32)]);
 assert.equal(r.breakdown.walk,7);assert.equal(r.breakdown.exitWalk,3);
 assert.equal(r.timeline.length,d.timeline.length);assert.equal(r.late,false);
 assert.equal(r.minutesFromNow,Math.round((Date.parse(d.recommended_departure_at)-NOW.getTime())/60000));
});

test('transfer route: estimate (no train), transfers and legs from BE',async()=>{
 const{f,tc,slug}=await setup();
 const r=await tc.calculateDepartureLive({originId:slug(31),destId:slug(207),arriveBy:'09:00',now:NOW,fetch:f});
 const route=F.r207.response;
 assert.equal(r.timetableUsed,false);assert.equal(r.selectedTrain,null);
 assert.equal(r.route.transfers,route.transfer_count);assert(r.route.transfers>=1);
 assert.equal(r.route.legs.length,route.timeline.filter(t=>t.kind==='RIDE').length);
 assert.equal(r.route.path.length,route.stations.length);
 route.stations.forEach((s,i)=>assert.equal(r.route.path[i],slug(s.station_id)||s.station_name)); // unmapped -> BE name
 const transfer=route.timeline.filter(t=>t.kind==='TRANSFER').reduce((a,t)=>a+t.minutes,0);
 assert.equal(r.breakdown.transfer,transfer);
 assert.equal(r.breakdown.ride+r.breakdown.transfer,F.d207.response.inputs.travel_minutes);
 assert.deepEqual(Array.from(r.limitations),F.d207.response.limitations);
});

test('errors: route 404, same-station 422, network, no mock fallback',async()=>{
 const{f,tc,slug}=await setup({'GET /api/routes?from=31&to=32':[404,F.r404.response]});
 await assert.rejects(tc.calculateDepartureLive({originId:slug(31),destId:slug(32),arriveBy:'09:00',now:NOW,fetch:f}),e=>e.status===404&&e.code==='NOT_FOUND');
 assert(!f.calls.some(c=>c.key.startsWith('POST')),'departure-time must not be called after route failure');
 // FE-side same station never calls BE
 f.calls.length=0;
 await assert.rejects(tc.calculateDepartureLive({originId:slug(31),destId:slug(31),now:NOW,fetch:f}),e=>e.code==='SAME_STATION');
 assert.equal(f.calls.length,0);
 // BE 422 passes through
 const s2=await setup({'GET /api/routes?from=31&to=32':[422,F.r422.response]});
 await assert.rejects(s2.tc.calculateDepartureLive({originId:s2.slug(31),destId:s2.slug(32),now:NOW,fetch:s2.f}),e=>e.status===422&&e.code==='VALIDATION_ERROR');
 // network
 const s3=await setup({'GET /api/routes?from=31&to=32':new Error('boom')});
 await assert.rejects(s3.tc.calculateDepartureLive({originId:s3.slug(31),destId:s3.slug(32),now:NOW,fetch:s3.f}),e=>e.code==='NETWORK');
 // departure-time 422 also surfaces
 const s4=await setup({'POST /api/departure-time':[422,{error:{code:'VALIDATION_ERROR',message:'bad'}}]});
 await assert.rejects(s4.tc.calculateDepartureLive({originId:s4.slug(31),destId:s4.slug(32),arriveBy:'09:00',now:NOW,fetch:s4.f}),e=>e.status===422);
});

test('unmapped station: clear error, no BE calls, no mock fallback',async()=>{
 const{w,f,tc,slug}=await setup();
 const un=w.StationIdMap.getResult().unmatchedFe;assert(un.length>0);
 await assert.rejects(tc.calculateDepartureLive({originId:un[0],destId:slug(32),arriveBy:'09:00',now:NOW,fetch:f}),e=>e.code==='UNMAPPED_STATION'&&e.slug===un[0]);
 await assert.rejects(tc.calculateDepartureLive({originId:slug(32),destId:un[0],arriveBy:'09:00',now:NOW,fetch:f}),e=>e.code==='UNMAPPED_STATION'&&e.slug===un[0]);
 assert.equal(f.calls.length,0);
});

test('arrival time: KST ISO, past-midnight handling, now mode',()=>{
 const tc=load().TimeCalculator;
 assert.equal(tc.buildArrivalIso('09:00',22,NOW),'2026-12-01T09:00:00+09:00');
 // 23:00 + "00:30" (>12h in the past) -> tomorrow
 assert.equal(tc.buildArrivalIso('00:30',22,new Date('2026-12-01T23:00:00+09:00')),'2026-12-02T00:30:00+09:00');
 assert.equal(tc.buildArrivalIso('09:00',22,new Date('2026-12-01T23:00:00+09:00')),'2026-12-02T09:00:00+09:00');
 // a time only a few hours in the past stays today (BE reports already_past)
 assert.equal(tc.buildArrivalIso('08:00',22,new Date('2026-12-01T10:00:00+09:00')),'2026-12-01T08:00:00+09:00');
 // KST date even when the machine clock is UTC: 2026-12-01 20:00Z = 12-02 05:00 KST
 assert.equal(tc.buildArrivalIso('09:00',22,new Date('2026-12-01T20:00:00Z')),'2026-12-02T09:00:00+09:00');
 // now mode: now + 7+3+5+travel+3 + 1
 assert.equal(tc.buildArrivalIso(null,22,new Date('2026-12-01T09:00:00+09:00')),'2026-12-01T09:41:00+09:00');
 assert.equal(tc.buildArrivalIso(null,22,new Date('2026-12-01T23:30:00+09:00')),'2026-12-02T00:11:00+09:00');
 assert.throws(()=>tc.buildArrivalIso('아무때나',22,NOW),e=>e.code==='BAD_TIME');
});

test('mock path stays synchronous and unchanged',()=>{
 const w=load();
 w.APP_CONFIG.dataSource='mock';
 const r=w.TimeCalculator.calculateDeparture({originId:'sindorim',destId:'gangnam',arriveBy:null,now:new Date('2026-12-01T10:00:00')});
 assert(r&&typeof r.then!=='function');
 assert.match(r.leaveAt,/^\d{2}:\d{2}$/);assert.equal(r.live,undefined);assert.equal(r.selectedTrain,undefined);
 assert(Array.isArray(r.route.path)&&r.route.path[0]==='sindorim');
});
